# 18 — Triển khai production & vận hành (runbook từng bước)

> Đây là tài liệu **thao tác**: làm theo đúng thứ tự, mỗi bước có *lệnh chạy*, *kết quả mong đợi*
> và *nếu sai thì làm gì*. Bản tóm tắt copy-paste nhanh ở [`../README.md`](../README.md).
> Kiến trúc & lý do thiết kế: [`11-KIEN-TRUC-HE-THONG.md`](11-KIEN-TRUC-HE-THONG.md).

**Mục lục**

| Phần | Nội dung |
|---|---|
| [§0](#0-chọn-mode-triển-khai) | Chọn mode triển khai (A hay B) |
| [§1](#1-điều-kiện-cần-trước-khi-bắt-đầu) | Điều kiện cần trước khi bắt đầu |
| [§2](#2-biến-môi-trường--secrets) | Biến môi trường & secrets |
| [§3](#3-mode-b--deploy-production-thực-tế-từng-bước) | **Mode B — deploy production thực tế, từng bước B1→B9** |
| [§4](#4-mode-a--compose-4-service-máyvm-riêng) | Mode A — compose 4 service (máy/VM riêng) |
| [§5](#5-deploy-các-lần-sau) | Deploy các lần sau (thủ công) |
| [§6](#6-cicd-github-actions--self-hosted-runner) | CI/CD (GitHub Actions + self-hosted runner) |
| [§7](#7-rollback) | Rollback |
| [§8](#8-vận-hành-hằng-ngày) | Vận hành hằng ngày |
| [§9](#9-backup--restore) | Backup & restore |
| [§10](#10-sự-cố-thường-gặp) | Sự cố thường gặp |
| [§11](#11-checklist-go-live) | Checklist go-live |

---

## 0. Chọn mode triển khai

Repo hỗ trợ **hai** mode, khác nhau ở chỗ ai lo TLS/reverse-proxy:

| | **Mode A — compose 4 service** | **Mode B — VM dùng chung + Caddy trên host** |
|---|---|---|
| File compose | `docker-compose.yml` | `docker-compose.prod.yml` |
| Proxy/TLS | service `proxy` (Caddy trong Docker) | Caddy chạy bằng systemd **trên host** |
| Port mở ra ngoài | 80/443 của service `proxy` | 80/443 của Caddy host |
| `web` | không publish port | publish `127.0.0.1:3001` |
| Dùng khi | có máy/VM **trống** dành riêng cho dự án | VM **dùng chung** với app khác |
| Trạng thái | mode "chuẩn" theo quy tắc cứng 11 | **đang chạy thật** tại https://khupho.ailab.city |

Nếu bạn deploy production lần đầu cho FPT trên máy riêng → làm [§4](#4-mode-a--compose-4-service-máyvm-riêng).
Nếu bạn tiếp quản hệ thống đang chạy hoặc dựng lại đúng như production hiện tại → làm [§3](#3-mode-b--deploy-production-thực-tế-từng-bước).

Cả hai mode **dùng chung** file security header [`deploy/khupho-headers.caddy`](../deploy/khupho-headers.caddy)
— đó là nguồn duy nhất, không copy nội dung header đi nơi khác.

---

## 1. Điều kiện cần trước khi bắt đầu

Kiểm đủ 6 mục này rồi hãy chạy lệnh đầu tiên:

1. **Máy/VM Linux** (khuyến nghị Ubuntu 22.04+), tối thiểu 2 vCPU / 4 GB RAM. Production hiện tại:
   GCP `ai-law` (Singapore, e2-standard-2, 8 GB RAM + 4 GB swap). Build image là lúc tốn RAM nhất
   — máy 2 GB nên bật swap trước, nếu không `pnpm build` bị OOM kill.
2. **Docker Engine + plugin compose v2** (`docker compose version` ra v2.x).
3. **Domain** đã trỏ được A record về IP tĩnh của máy, và **port 80/443 mở** trên firewall
   (GCP: firewall rule cho tag của VM; Ubuntu: `ufw allow 80,443/tcp`).
4. **Quyền truy cập repo** GitHub `tonvinh/khu_pho_yeu_thuong`.
5. **Secrets đã chuẩn bị** — xem [§2](#2-biến-môi-trường--secrets). Đặc biệt `PHONE_PEPPER`:
   nếu đây là lần deploy **lại** một hệ thống đã có dữ liệu, phải dùng **đúng pepper cũ**.
6. **Nơi cất backup secrets** nằm ngoài VM (password manager của team / secret manager).

> ⚠️ Chỉ có **một** thứ trong toàn hệ thống không sửa sai được: `PHONE_PEPPER`. Nó là khoá băm
> SĐT → định danh cư dân. Sinh pepper mới trên một DB đã có dữ liệu = **toàn bộ cư dân mất tài
> khoản, điểm, phiếu thương** (dữ liệu vẫn còn trong DB nhưng không ai đăng nhập lại được vào
> đúng tài khoản của mình). Đọc kỹ [§2](#2-biến-môi-trường--secrets) trước khi gõ lệnh.

---

## 2. Biến môi trường & secrets

### 2.1 Bảng biến

Tạo file từ template: `cp .env.example .env`. File `.env` **không bao giờ** được commit (đã có trong `.gitignore`).

| Biến | Bắt buộc | Đổi lúc runtime? | Ý nghĩa |
|---|---|---|---|
| `PHONE_PEPPER` | ✅ | ❌ **Không bao giờ đổi** | Pepper HMAC-SHA256 định danh SĐT. `openssl rand -hex 32`. Đổi = mất toàn bộ tài khoản/điểm/phiếu của cư dân |
| `PHONE_AES_KEY` | ✅ | ⚠️ Cần migration dữ liệu | Khoá AES-256-GCM mã hoá SĐT lead. `openssl rand -base64 32` (đúng 32 byte). **Tách hoàn toàn** với PEPPER |
| `POSTGRES_PASSWORD` | ✅ | ✅ | Mật khẩu Postgres (user/db mặc định `khupho`) |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | ✅ | ✅ | Credentials MinIO. Secret nên ≥ 16 ký tự |
| `DATABASE_URL` | dev | ✅ | Chỉ cần khi chạy **ngoài** Docker. Trong compose bị override thành `@db:5432` |
| `SITE_ORIGIN` | | ✅ (cần `up -d web`) | Origin tuyệt đối cho OG tag/share link. Production: `https://khupho.ailab.city`. **Không** liên quan CSRF/auth |
| `BASE_PATH` | | ❌ **Build arg** | `""` cho domain riêng; `/khu-pho-de-thuong` nếu chạy dưới path. Đổi ⇒ **bắt buộc rebuild image** |
| `SITE_ADDRESS` | | ✅ | **Chỉ** dùng ở mode A: `:80` cho local, hoặc domain để Caddy tự cấp TLS |
| `POSTGRES_USER` / `POSTGRES_DB` | | | Mặc định `khupho` |
| `MINIO_BUCKET` | | ✅ | Mặc định `khupho`. Bucket **tự tạo** ở lần upload đầu (`ensureBucket`) — không phải tạo tay |
| `SEED_ADMIN_PASSWORD` | | | Chỉ cho `pnpm seed` môi trường thử (mặc định `KhuPho@2026!Demo`) |

Ở **production** (`NODE_ENV=production`), thiếu biến bắt buộc thì app **ném lỗi lúc khởi động**
thay vì âm thầm dùng giá trị dev (`src/lib/env.ts`). Đây là chốt chặn cố ý: thà container không
lên còn hơn chạy bằng pepper mặc định.

### 2.2 Sinh secrets

```bash
echo "PHONE_PEPPER=$(openssl rand -hex 32)"
echo "PHONE_AES_KEY=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')"
echo "MINIO_SECRET_KEY=$(openssl rand -base64 24 | tr -d '/+=')"
```

`PHONE_AES_KEY` phải giải mã ra **đúng 32 byte** — dùng nguyên chuỗi `openssl rand -base64 32`
sinh ra, đừng cắt bớt ký tự `=` ở cuối.

### 2.3 Backup secrets — làm NGAY, trước khi chạy app

```bash
# copy 2 dòng này vào password manager của team, KHÔNG để chung chỗ với backup DB
grep -E '^(PHONE_PEPPER|PHONE_AES_KEY)=' .env
```

Backup database **vô dụng nếu mất `PHONE_PEPPER`**: dump SQL chỉ chứa hash, không khôi phục được
liên kết SĐT → tài khoản. Vì vậy cất 2 khoá này **tách khỏi** nơi cất dump DB.

---

## 3. Mode B — deploy production thực tế, từng bước

Đích đến: `https://khupho.ailab.city` chạy trên VM dùng chung, Caddy host lo TLS cho nhiều app.

Đặc điểm `docker-compose.prod.yml` (đọc trước để hiểu vì sao các bước bên dưới như vậy):

- **Không có service `proxy`** — Caddy trên host lo TLS/reverse-proxy.
- `web` publish **chỉ nội bộ** `127.0.0.1:3001` (port 3000/8000 đã bị app khác dùng).
- `db` + `storage` **không publish port nào** → không đụng Postgres 5432 / MinIO 9000 của app kia.
- Project name cố định `khupho` → container tên `khupho-web-1|khupho-db-1|khupho-storage-1`.

### B1. Cài Docker (một lần)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# → LOGOUT/LOGIN lại (hoặc `newgrp docker`) để nhận nhóm docker
docker compose version          # kỳ vọng: Docker Compose version v2.x
```

*Nếu `docker ps` báo permission denied*: chưa logout/login sau `usermod`.

### B2. Clone repo vào `/opt/khu_pho` (một lần)

```bash
sudo mkdir -p /opt/khu_pho && sudo chown $USER /opt/khu_pho
git clone https://github.com/tonvinh/khu_pho_yeu_thuong.git /opt/khu_pho
cd /opt/khu_pho && git log --oneline -1
```

Đường dẫn `/opt/khu_pho` là **cố định** — CI (`.github/workflows/deploy.yml`, biến `APP_DIR`)
hard-code nó. Đổi chỗ khác thì phải sửa workflow.

Gốc git chính là thư mục app (không có thư mục lồng). Nếu VM còn layout cũ
`/opt/khu_pho/khu_pho_yeu_thuong/` thì bước "Ensure .env" của CI tự nâng `.env` lên gốc — xem [§6](#6-cicd-github-actions--self-hosted-runner).

### B3. Tạo `.env` production (một lần)

```bash
cd /opt/khu_pho
cp .env.example .env
nano .env
```

Điền tối thiểu:

```dotenv
BASE_PATH=
SITE_ORIGIN=https://khupho.ailab.city
POSTGRES_PASSWORD=<sinh ở §2.2>
PHONE_PEPPER=<sinh ở §2.2 — hoặc pepper CŨ nếu deploy lại hệ thống đã có dữ liệu>
PHONE_AES_KEY=<sinh ở §2.2>
MINIO_ACCESS_KEY=khupho
MINIO_SECRET_KEY=<sinh ở §2.2>
```

`SITE_ADDRESS` và `DATABASE_URL` **không dùng** ở mode B (compose tự dựng `DATABASE_URL` trỏ `@db:5432`).

```bash
chmod 600 .env                 # chỉ chủ sở hữu đọc được
grep -c '^PHONE_PEPPER=.\+' .env   # kỳ vọng: 1
```

→ **Backup `PHONE_PEPPER` + `PHONE_AES_KEY` ngay bây giờ** ([§2.3](#23-backup-secrets--làm-ngay-trước-khi-chạy-app)), đừng để đến cuối.

### B4. DNS + firewall (một lần)

1. A record `khupho.ailab.city` → IP **tĩnh** của VM.
   (GCP: reserve static IP. **Nhớ release nếu ngừng dự án** — IP tĩnh không dùng vẫn tính phí.)
2. Mở 80/443 vào VM.

```bash
dig +short khupho.ailab.city          # kỳ vọng: đúng IP của VM
curl -sS -o /dev/null -w '%{http_code}\n' http://khupho.ailab.city   # 000/404 lúc này là bình thường
```

Chờ DNS phân giải đúng **trước khi** reload Caddy ở B5 — Let's Encrypt cấp cert bằng HTTP-01,
DNS chưa trỏ thì cấp cert thất bại và Caddy sẽ backoff vài phút mới thử lại.

### B5. Caddy trên host + security header (một lần)

Security header **không viết thẳng vào file host**. `/etc/caddy/Caddyfile` trên VM còn site block
của `law.ailab.city` + `fb.ailab.city` (CSP khác hẳn — có `fonts.googleapis.com`, CDN Facebook),
nên repo chỉ sở hữu một *snippet* của riêng mình: [`deploy/khupho-headers.caddy`](../deploy/khupho-headers.caddy).

**B5.1 — cài Caddy trên host** (nếu chưa có): https://caddyserver.com/docs/install

**B5.2 — cài snippet:**

```bash
sudo mkdir -p /etc/caddy/conf.d
sudo install -m 0644 /opt/khu_pho/deploy/khupho-headers.caddy /etc/caddy/conf.d/khupho-headers.caddy
```

**B5.3 — nối snippet vào `/etc/caddy/Caddyfile` (ĐỦ CẢ HAI vế):**

```caddyfile
# vế 1 — ĐẦU /etc/caddy/Caddyfile, trước mọi site block
import /etc/caddy/conf.d/khupho-headers.caddy

khupho.ailab.city {
    encode zstd gzip
    import khupho_headers      # ← vế 2: thay cho khối header{...} viết tay
    reverse_proxy 127.0.0.1:3001
}
```

> **Chỉ làm vế 1 là trạng thái nửa vời — nguy hiểm nhất.** `caddy validate` vẫn pass (snippet
> không dùng vẫn hợp lệ), reload vẫn chạy, CI vẫn xanh, nhưng production tiếp tục phục vụ header
> cũ: sửa CSP trong repo **không có tác dụng gì**. Job CI `sync-headers` kiểm tra cả hai dòng và
> **fail** nếu thiếu vế nào ([§6](#6-cicd-github-actions--self-hosted-runner)).

**B5.4 — validate + reload:**

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl is-active caddy        # kỳ vọng: active
```

Let's Encrypt cấp cert trong ~30 giây. Theo dõi: `sudo journalctl -u caddy -f`.

**B5.5 — quyền cho CI đọc được** (để job `sync-headers` không "im lặng bỏ qua"):

```bash
sudo chmod 0755 /etc/caddy /etc/caddy/conf.d
sudo chmod 0644 /etc/caddy/Caddyfile /etc/caddy/conf.d/khupho-headers.caddy
```

> `frame-src` trong snippet **không được bỏ**. Thiếu nó thì iframe TVC rơi về `default-src 'self'`
> và Chrome chặn — trang chủ lẫn ô "Xem trước video" ở `/admin/noi-dung` chỉ còn ô xám
> *"This content is blocked."*. Đó là lỗi cấu hình proxy, không phải lỗi ID video.

### B6. Build image + khởi động

```bash
cd /opt/khu_pho
docker compose -f docker-compose.prod.yml build web     # ~2–5 phút lần đầu
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

Kỳ vọng: 3 container `khupho-web-1`, `khupho-db-1`, `khupho-storage-1` — `db`/`storage` phải
`healthy` thì `web` mới khởi động (`depends_on: service_healthy`).

*Build fail ở native deps (sharp/argon2/esbuild)?* Dockerfile ghim `pnpm@9` có chủ đích — xem [§10](#10-sự-cố-thường-gặp).

### B7. Chạy migration (bắt buộc, là lệnh RIÊNG)

Migration **không bao giờ tự chạy** khi container start (quy tắc cứng 11) — để không có chuyện
container tự đổi schema lúc restart.

```bash
docker compose -f docker-compose.prod.yml exec -T web node scripts/migrate.mjs
```

Kỳ vọng: in `+ 001_init.sql` … `+ 009_geo_units.sql` rồi `Migration hoàn tất.`
Chạy lại lần nữa sẽ in `= <file> (đã áp dụng)` — idempotent, chạy lại vô hại.

Mỗi file chạy trong **một transaction**; lỗi giữa chừng thì rollback file đó và exit 1 → sửa
nguyên nhân rồi chạy lại là đủ, không cần dọn tay.

### B8. Tạo tài khoản admin thật

```bash
docker compose -f docker-compose.prod.yml exec -T web \
  node scripts/create-admin.mjs admin@fpt.com '<mật khẩu ≥12 ký tự>'
```

- Email **bắt buộc đuôi `@fpt.com`** (validate server-side, quy tắc cứng 7).
- Lệnh này **upsert** → cũng chính là cách reset mật khẩu admin.
- Thêm `--totp` để bật 2FA: lệnh in ra secret/URL để quét bằng Google Authenticator.

> Production thật **không chạy seed**. `scripts/seed*.mjs` chỉ dành cho môi trường thử —
> `seed.mjs` tạo sẵn `admin@fpt.com / KhuPho@2026!Demo`, để lại trên production là lỗ hổng.

### B9. Nghiệm thu

```bash
# 1. App sống (trong VM)
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/v1/counters   # → 200

# 2. Qua Caddy host, có TLS
curl -s -o /dev/null -w '%{http_code}\n' https://khupho.ailab.city               # → 200

# 3. Security header đủ (đây là bước hay bị bỏ sót)
curl -sI https://khupho.ailab.city | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy'
```

Kỳ vọng ở lệnh 3 — có đủ 5 header, và CSP **phải chứa** `frame-src https://www.youtube-nocookie.com`:

```
strict-transport-security: max-age=31536000; includeSubDomains
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: no-referrer
content-security-policy: default-src 'self'; …; frame-src https://www.youtube-nocookie.com https://www.youtube.com
```

Thiếu → wiring Caddy nửa vời, quay lại [B5.3](#b5-caddy-trên-host--security-header-một-lần).

Cuối cùng chạy end-to-end trên chính domain thật:
định danh SĐT → đề xuất góc phố → admin duyệt (tick đủ 4N) → viết câu nhắc → thương → chọn câu →
`installed` → kiểm banner "tin vui" + trang share `/bien/[id]` + OG image.

---

## 4. Mode A — compose 4 service (máy/VM riêng)

Dùng khi có máy trống và muốn cả proxy + TLS nằm trong Docker. Chỉ service `proxy` mở port 80/443.

### A1. Chuẩn bị

Làm [B1](#b1-cài-docker-một-lần) (Docker) + [B2](#b2-clone-repo-vào-optkhu_pho-một-lần) (clone; mode A không bắt buộc `/opt/khu_pho`).

### A2. `.env`

Như [B3](#b3-tạo-env-production-một-lần), **thêm** `SITE_ADDRESS`:

```dotenv
SITE_ADDRESS=khupho.example.com   # domain → Caddy tự xin Let's Encrypt
# SITE_ADDRESS=:80                # local/không TLS
SITE_ORIGIN=https://khupho.example.com
```

### A3. Khởi động

```bash
docker compose up -d --build
docker compose ps          # 4 service: web, db, storage, proxy
```

### A4. Migration + admin

```bash
docker compose run --rm web node scripts/migrate.mjs
docker compose run --rm web node scripts/create-admin.mjs admin@fpt.com 'MatKhauManh!123'
# (môi trường thử) docker compose run --rm web node scripts/seed.mjs
```

### A5. Nghiệm thu

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/api/v1/counters      # → 200
curl -sI https://khupho.example.com | grep -i content-security-policy
```

### A6. Ghi nhớ về Caddy trong mode A

`deploy/Caddyfile` **không chạy độc lập** — nó `import /etc/caddy/conf.d/khupho-headers.caddy`,
và file đó được `docker-compose.yml` mount vào. Thiếu mount → Caddy báo `File to import not found`
và container `proxy` **không khởi động**. Cố ý fail-closed: proxy chạy mà không có CSP/HSTS là
vi phạm 07 §2.2, tệ hơn việc dừng hẳn và báo lỗi.

> **Sửa snippet header xong phải `docker compose restart proxy`.** Đó là bind mount *nội dung*,
> không phải đổi service definition, nên `docker compose up -d` **không** recreate `proxy` và
> Caddy vẫn giữ config đã parse lúc khởi động — rất dễ tưởng CSP mới đã có tác dụng.

---

## 5. Deploy các lần sau

Bình thường chỉ cần **push lên `main`** → CI tự làm ([§6](#6-cicd-github-actions--self-hosted-runner)). Làm tay khi CI hỏng hoặc muốn deploy một commit cụ thể:

```bash
cd /opt/khu_pho
git fetch origin main && git reset --hard origin/main       # .env là gitignored → không bị đụng
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec -T web node scripts/migrate.mjs
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/v1/counters   # → 200
```

Khi nào cần gì:

| Thay đổi | Việc phải làm |
|---|---|
| Sửa code | `build web` + `up -d` |
| Thêm file trong `db/migrations/` | `build web` + `up -d` + **`migrate.mjs`** |
| Đổi `SITE_ORIGIN`, `POSTGRES_PASSWORD`, `MINIO_*` trong `.env` | `up -d web` (không cần build) — container phải khởi động lại mới đọc `.env` mới |
| Đổi `BASE_PATH` | **Bắt buộc build lại** — là build arg, đã nướng vào image |
| Sửa `deploy/khupho-headers.caddy` | Mode B: CI tự sync + reload caddy; làm tay xem [B5.2–B5.4](#b5-caddy-trên-host--security-header-một-lần). Mode A: `docker compose restart proxy` |
| Sửa `docker-compose*.yml` | `up -d` (compose tự recreate service có định nghĩa thay đổi) |

---

## 6. CI/CD (GitHub Actions + self-hosted runner)

Push lên `main` → runner **chạy ngay trên VM** tự pull + rebuild + migrate + healthcheck (~1 phút).
Runner kết nối **outbound-only** nên VM không cần mở port SSH. File: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml);
cũng chạy tay được qua tab Actions → "Run workflow".

`concurrency: deploy-vm` đảm bảo không có 2 lần deploy chồng nhau.
Mọi push đều deploy, kể cả khi chỉ sửa tài liệu — muốn bỏ qua thì thêm
`paths-ignore: ["**.md", "docs/**"]` vào khối `on.push`.

### 6.1 Hai job độc lập — cố ý không `needs` nhau

Header là cấu hình của *host*; container app là chuyện khác. Build/migrate hỏng thì không được
chặn một bản vá CSP, và ngược lại. Runner self-hosted chạy tuần tự nên hai job không giẫm chân
nhau ở `/opt/khu_pho`.

**Job `deploy`** (app):

1. `git fetch` + `reset --hard FETCH_HEAD` tại `/opt/khu_pho`.
2. **Chốt chặn `.env`**: kiểm file tồn tại và `PHONE_PEPPER` không rỗng — thiếu thì **dừng ngay**,
   không để container khởi động và sinh pepper mới. Bước này cũng tự nâng `.env` từ layout thư mục
   lồng cũ lên gốc repo nếu còn sót (backup ở `$HOME/khu_pho.env.bak-old-layout`).
3. `docker compose -f docker-compose.prod.yml build web` + `up -d`.
4. `exec -T web node scripts/migrate.mjs`.
5. Poll `http://127.0.0.1:3001/api/v1/counters` tối đa ~45 s; khác 200 → fail.

**Job `sync-headers`** (đồng bộ security header sang Caddy host):

1. Snippet chưa có trên host → `::warning::` + in hướng dẫn [B5](#b5-caddy-trên-host--security-header-một-lần), **exit 0** (chưa nối là trạng thái hợp lệ).
2. Không **đọc** được `/etc/caddy/Caddyfile` hoặc snippet → **fail** kèm lệnh sửa quyền — không im lặng coi như "chưa nối".
3. `/etc/caddy/Caddyfile` thiếu `import …/khupho-headers.caddy` **hoặc** `import khupho_headers` → **fail** (nối nửa vời, [B5.3](#b5-caddy-trên-host--security-header-một-lần)).
4. `cmp` giống nhau → thôi. Khác → backup vào `$HOME/khupho-caddy-backups/` (giữ 10 bản) →
   `install` đè → `caddy validate` **cả file host** → `systemctl reload caddy` → `systemctl is-active`.
   **Mọi** bước trong chuỗi này đều được bọc `if !` và tự khôi phục backup khi hỏng — kể cả
   `reload`, vì step chạy dưới `bash -e` nên một lệnh trần thất bại sẽ giết step trước khi nhánh
   khôi phục kịp chạy, để lại file hỏng trên đĩa.

> Backup **không** để trong `/etc/caddy/conf.d/`: thư mục đó thường được import bằng glob
> (`import /etc/caddy/conf.d/*`), file `.bak` nằm trong đó sẽ định nghĩa trùng `(khupho_headers)`
> → `caddy validate` fail vĩnh viễn.
>
> Job `sync-headers` **chỉ** ghi đúng file `/etc/caddy/conf.d/khupho-headers.caddy`, không bao giờ
> ghi `/etc/caddy/Caddyfile`. VM dùng chung với `law.ailab.city` và `fb.ailab.city` — nếu ai đó
> sửa thành copy đè cả Caddyfile thì mỗi lần deploy khupho sẽ đánh sập 2 app kia.

### 6.2 Cài runner trên VM (một lần)

```bash
# GitHub → repo → Settings → Actions → Runners → New self-hosted runner (Linux x64)
sudo mkdir -p /opt/actions-runner && sudo chown $USER /opt/actions-runner
cd /opt/actions-runner
# … tải + giải nén theo đúng lệnh GitHub sinh ra …
./config.sh --url https://github.com/tonvinh/khu_pho_yeu_thuong --token <TOKEN> --labels khupho
sudo ./svc.sh install $USER && sudo ./svc.sh start
sudo usermod -aG docker $USER      # user chạy runner PHẢI thuộc nhóm docker
sudo systemctl restart actions.runner.*      # nhận nhóm docker mới
```

Label `khupho` là cách workflow chọn đúng runner (`runs-on: [self-hosted, khupho]`).

### 6.3 Sudoers cho job `sync-headers` (một lần)

Runner cần `sudo` **NOPASSWD** đúng 3 binary *ghi*: `install`, `caddy`, `systemctl`.
Mọi thao tác **đọc** (`test`/`cmp`/`grep`) cố tình chạy quyền thường — `sudo -n test` bị từ chối
trả non-zero y hệt "file không tồn tại", khiến sync im lặng không chạy mãi.

```bash
command -v install caddy systemctl        # lấy đường dẫn thật trên máy
sudo visudo -f /etc/sudoers.d/khupho-deploy
```

```sudoers
# thay <user> bằng user chạy runner; thay đường dẫn cho khớp `command -v`
<user> ALL=(root) NOPASSWD: /usr/bin/install, /usr/bin/caddy, /usr/bin/systemctl
```

```bash
sudo chmod 0440 /etc/sudoers.d/khupho-deploy
sudo -n install --version >/dev/null && echo "sudoers OK"
```

---

## 7. Rollback

Migration là **forward-only** — `scripts/migrate.mjs` không có bước `down`. Vì vậy:

**Rollback code (an toàn khi commit lỗi KHÔNG kèm migration mới):**

```bash
cd /opt/khu_pho
git log --oneline -10                       # chọn commit tốt gần nhất
git checkout <sha-tốt> -- . && git reset --hard <sha-tốt>
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/v1/counters
```

Sau đó phải `git push --force` hoặc revert trên `main`, nếu không lần CI kế tiếp kéo lại đúng commit lỗi.

**Nếu commit lỗi có kèm migration**: schema đã đổi, code cũ có thể không chạy được với schema mới.
Đường an toàn là **fix-forward** (viết migration mới sửa lại) thay vì rollback. Chỉ khi thật sự
buộc phải lùi schema mới restore DB từ backup ([§9](#9-backup--restore)) — chấp nhận mất dữ liệu
phát sinh sau thời điểm backup.

---

## 8. Vận hành hằng ngày

```bash
F=docker-compose.prod.yml     # bỏ "-f $F" nếu dùng mode A

docker compose -f $F ps                             # trạng thái + cột healthcheck
docker compose -f $F logs -f --tail=200 web         # log app
docker compose -f $F logs --tail=100 db             # log Postgres
docker compose -f $F exec db psql -U khupho khupho  # vào Postgres
docker compose -f $F restart web                    # restart nhanh
sudo journalctl -u caddy -n 100 --no-pager          # log Caddy host (mode B)
```

Theo dõi sức khoẻ:

| Chỉ số | Cách xem | Ngưỡng |
|---|---|---|
| App sống | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/v1/counters` | 200 |
| Container | `docker compose -f $F ps` | cột STATUS có `healthy` |
| Dung lượng | `docker system df` · `df -h` | ảnh WebP tích tụ trong volume `minio_data` |
| RAM/swap | `free -h` | build image là lúc căng nhất |
| Chứng chỉ TLS | `sudo caddy list-certificates` hoặc log Caddy | còn hạn (Caddy tự gia hạn) |

Dọn rác Docker định kỳ (image cũ sau nhiều lần build tích tụ nhanh):

```bash
docker image prune -f                 # xoá image dangling
docker builder prune -f --keep-storage 5GB
```

> Đừng chạy `docker system prune -a --volumes` — cờ `--volumes` xoá luôn `db_data`/`minio_data`.

---

## 9. Backup & restore

### 9.1 Backup thủ công

```bash
F=docker-compose.prod.yml
cd /opt/khu_pho

# Database (db không publish port → dump qua exec)
docker compose -f $F exec -T db pg_dump -U khupho khupho | gzip > backup-$(date +%F).sql.gz

# Ảnh MinIO (volume minio_data)
docker run --rm --volumes-from khupho-storage-1 -v "$PWD":/backup alpine \
  tar czf /backup/minio-$(date +%F).tar.gz /data
```

Hai pattern `backup-*.sql.gz` và `minio-*.tar.gz` đã có trong `.gitignore` **và** `.dockerignore`
— để file backup nằm trong `/opt/khu_pho` không lọt vào git lẫn build context.
Tốt nhất vẫn là **chuyển ra khỏi VM** ngay sau khi tạo.

⚠️ Backup DB **vô dụng nếu mất `PHONE_PEPPER`** — backup `.env` (hoặc ít nhất 2 khoá) riêng, ở nơi khác.

### 9.2 Backup tự động (cron)

```bash
crontab -e
```

```cron
# 02:00 mỗi ngày: dump DB, giữ 14 bản gần nhất
0 2 * * * cd /opt/khu_pho && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U khupho khupho | gzip > /var/backups/khupho/db-$(date +\%F).sql.gz 2>>/var/log/khupho-backup.log && find /var/backups/khupho -name 'db-*.sql.gz' -mtime +14 -delete
```

```bash
sudo mkdir -p /var/backups/khupho && sudo chown $USER /var/backups/khupho
```

### 9.3 Restore

```bash
F=docker-compose.prod.yml

# Database
gunzip -c backup-YYYY-MM-DD.sql.gz | docker compose -f $F exec -T db psql -U khupho khupho

# Ảnh MinIO
docker run --rm --volumes-from khupho-storage-1 -v "$PWD":/backup alpine \
  tar xzf /backup/minio-YYYY-MM-DD.tar.gz -C /
docker compose -f $F restart storage
```

Restore xong phải dùng **đúng `.env` cùng thời điểm** (cùng `PHONE_PEPPER` và `PHONE_AES_KEY`),
rồi chạy lại `migrate.mjs` (dump cũ có thể thiếu migration mới).

**Thử restore ít nhất một lần** trước go-live — backup chưa từng restore không phải là backup.

---

## 10. Sự cố thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Build fail ở native deps (sharp/argon2/esbuild) | Dockerfile ghim `pnpm@9` **có chủ đích**: corepack mặc định kéo pnpm 11 (đòi Node ≥22.13 và hard-fail "ignored builds"). Nâng pnpm phải nâng lockfile cùng lúc |
| Build bị kill giữa chừng, không rõ lỗi | Hết RAM. `free -h`, bật swap (`fallocate -l 4G /swapfile …`) rồi build lại |
| Workflow không chạy khi push | Workflow phải nằm ở `.github/workflows/` tại **gốc repo**. Kiểm runner còn online: Settings → Actions → Runners |
| Deploy fail ở bước "Ensure .env" | `/opt/khu_pho/.env` không tồn tại hoặc `PHONE_PEPPER` rỗng. Đây là chốt chặn cố ý — khôi phục `.env` từ backup, **đừng sinh pepper mới** |
| `web` unhealthy | `docker compose -f $F logs web`. Thường do thiếu `PHONE_PEPPER`/`PHONE_AES_KEY` (app ném lỗi lúc khởi động ở production) hoặc `db` chưa healthy |
| 502 từ Caddy host | `web` chưa lên hoặc lệch port. Kiểm `curl 127.0.0.1:3001/api/v1/counters` và site block trỏ đúng `127.0.0.1:3001` |
| Sửa CSP trong repo mà production không đổi | Host nối **nửa vời**: thiếu `import khupho_headers` trong site block ([B5.3](#b5-caddy-trên-host--security-header-một-lần)). Job `sync-headers` sẽ fail và chỉ đúng dòng thiếu |
| Video TVC là ô xám "This content is blocked" (trang chủ + `/admin/noi-dung`) | CSP của Caddy **host** thiếu `frame-src https://www.youtube-nocookie.com`. Kiểm `curl -sI https://<domain>/ \| grep -i content-security`, sửa theo [B5](#b5-caddy-trên-host--security-header-một-lần) → `caddy validate` + `reload`. Không cần rebuild app |
| Video TVC ra "Error 153 — Video player configuration error" | Iframe nạp được nhưng thiếu `referrerPolicy="strict-origin-when-cross-origin"` trên thẻ. Site đặt `Referrer-Policy: no-referrer` nên YouTube không xác thực được domain nhúng. **Không phải** lỗi ID video — đổi ID khác vẫn lỗi y hệt |
| Ảnh không hiện | `storage` healthy chưa? `MINIO_*` khớp chưa? Ảnh public đi qua `/api/img/…`, không truy cập MinIO trực tiếp. Bucket tự tạo ở lần upload đầu |
| Ảnh bản đồ 404 với admin | Ảnh gốc nằm ở prefix `private/`, chỉ đọc qua route admin — không phải `/api/img/` |
| Migration lỗi giữa chừng | Mỗi file chạy trong 1 transaction và idempotent — sửa nguyên nhân rồi chạy lại là đủ |
| Đổi domain | Đổi A record + site block Caddy + `SITE_ORIGIN` trong `.env` → `up -d web`. Chuyển sang chạy dưới path thì đổi `BASE_PATH` và **rebuild** |
| Người dùng mất hết tài khoản sau deploy | Gần như chắc chắn `PHONE_PEPPER` đã bị thay. Khôi phục pepper cũ → dữ liệu trở lại (hash trong DB không đổi) |
| Đăng nhập admin báo khoá | 5 lần sai → khoá 15 phút. Gấp thì: `UPDATE admin_users SET failed_attempts=0, locked_until=NULL WHERE email='…';` |
| Quên mật khẩu admin | `docker compose -f $F exec -T web node scripts/create-admin.mjs <email@fpt.com> '<mật khẩu mới>'` (lệnh upsert) |

---

## 11. Checklist go-live

Hạ tầng & bảo mật

- [ ] `.env` production có **secret thật** (không phải giá trị mẫu trong `.env.example`), `chmod 600`.
- [ ] `PHONE_PEPPER` + `PHONE_AES_KEY` đã backup **ra ngoài VM**, tách khỏi nơi cất backup DB.
- [ ] `SITE_ORIGIN` đúng domain thật (ảnh hưởng OG/share link).
- [ ] `BASE_PATH` đúng phương án domain **và image đã build với giá trị đó**.
- [ ] TLS hoạt động; `curl -sI https://<domain>` trả đủ 5 security header, CSP có `frame-src` YouTube ([B9](#b9-nghiệm-thu)).
- [ ] `/admin` không bị Google index (kiểm `robots.txt` + header `X-Robots-Tag`).
- [ ] Không service nào ngoài proxy/Caddy mở port ra ngoài (`docker compose -f $F ps` xem cột PORTS).

Dữ liệu & tài khoản

- [ ] Đã chạy migration; `curl /api/v1/counters` trả 200.
- [ ] Đã tạo admin thật bằng `create-admin.mjs`; **đã đổi hoặc xoá tài khoản demo `admin@fpt.com` nếu từng seed**.
- [ ] Đã lên lịch backup DB + MinIO (cron [§9.2](#92-backup-tự-động-cron)) và **đã thử restore ít nhất một lần**.

Ứng dụng

- [ ] `pnpm test` xanh trên đúng commit đang deploy.
- [ ] Đã thử end-to-end trên production: định danh → đề xuất → duyệt 4N → viết câu → thương → chọn câu → treo biển → banner tin vui + trang share.
- [ ] Đã test preview link share bằng Facebook Sharing Debugger và Zalo debugger.
- [ ] Mobile 360px không vỡ layout; video TVC phát được (không phải ô xám).

CI/CD

- [ ] Runner self-hosted online, label `khupho`, user thuộc nhóm `docker`.
- [ ] Sudoers NOPASSWD đúng 3 binary ([§6.3](#63-sudoers-cho-job-sync-headers-một-lần)).
- [ ] Đã chạy thử một lần "Run workflow" tay và cả 2 job đều xanh.
