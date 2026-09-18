# 18 — Triển khai production & vận hành (runbook từng bước)

> Đây là tài liệu **thao tác**: làm theo đúng thứ tự, mỗi bước có *lệnh chạy*, *kết quả mong đợi*
> và *nếu sai thì làm gì*. Bản tóm tắt copy-paste nhanh ở [`../README.md`](../README.md).
> Kiến trúc & lý do thiết kế: [`11-KIEN-TRUC-HE-THONG.md`](11-KIEN-TRUC-HE-THONG.md).
>
> Cập nhật: **17/9/2026 — bỏ object storage**: ảnh upload lưu filesystem `/app/uploads` (compose: volume
> `uploads_data`; production Kubernetes: PVC NFS — yêu cầu cho bên vận hành ở [§12](#12-kubernetes--nfs--yêu-cầu-cho-bên-vận-hành),
> chuyển dữ liệu ảnh cũ ở [§13](#13-chuyển-ảnh-cũ-sang-filesystem-một-lần)). Còn 3 service; không còn service/biến môi trường nào cho object storage.
>
> Trước đó 8/9/2026 — soát nhanh sau các đợt 18/8, 2–4/9, 7/9. Thay đổi duy nhất ảnh hưởng runbook:
> **khối video TVC đã gỡ khỏi sản phẩm** (component xoá 2/9, 4 khoá `campaign_*` gỡ 4/9) ⇒ mọi mục
> nói về iframe YouTube nay chỉ còn giá trị lịch sử. `frame-src` trong CSP **vẫn nên giữ** phòng khi
> Design khôi phục khối này; giữ nó không làm CSP yếu đi đáng kể.

**Mục lục**

| Phần | Nội dung |
|---|---|
| [§0](#0-chọn-mode-triển-khai) | Chọn mode triển khai (A hay B) |
| [§1](#1-điều-kiện-cần-trước-khi-bắt-đầu) | Điều kiện cần trước khi bắt đầu |
| [§2](#2-biến-môi-trường--secrets) | Biến môi trường & secrets |
| [§3](#3-mode-b--deploy-production-thực-tế-từng-bước) | **Mode B — deploy production thực tế, từng bước B1→B9** |
| [§4](#4-mode-a--compose-3-service-máyvm-riêng) | Mode A — compose 3 service (máy/VM riêng) |
| [§5](#5-deploy-các-lần-sau) | Deploy các lần sau (thủ công) |
| [§6](#6-cicd-github-actions--self-hosted-runner) | CI/CD (GitHub Actions + self-hosted runner) |
| [§7](#7-rollback) | Rollback |
| [§8](#8-vận-hành-hằng-ngày) | Vận hành hằng ngày |
| [§9](#9-backup--restore) | Backup & restore |
| [§10](#10-sự-cố-thường-gặp) | Sự cố thường gặp |
| [§11](#11-checklist-go-live) | Checklist go-live |
| [§12](#12-kubernetes--nfs--yêu-cầu-cho-bên-vận-hành) | **Kubernetes + NFS** — yêu cầu cho bên vận hành |
| [§13](#13-chuyển-ảnh-cũ-sang-filesystem-một-lần) | Chuyển ảnh cũ sang filesystem (một lần) |

---

## 0. Chọn mode triển khai

Repo hỗ trợ **hai** mode, khác nhau ở chỗ ai lo TLS/reverse-proxy:

| | **Mode A — compose 3 service** | **Mode B — VM dùng chung + Caddy trên host** |
|---|---|---|
| File compose | `docker-compose.yml` | `docker-compose.prod.yml` |
| Proxy/TLS | service `proxy` (Caddy trong Docker) | Caddy chạy bằng systemd **trên host** |
| Port mở ra ngoài | 80/443 của service `proxy` | 80/443 của Caddy host |
| `web` | không publish port | publish `127.0.0.1:3001` |
| Dùng khi | có máy/VM **trống** dành riêng cho dự án | VM **dùng chung** với app khác |
| Trạng thái | mode "chuẩn" theo quy tắc cứng 11 | **đang chạy thật** tại https://khupho.ailab.city |

Nếu bạn deploy production lần đầu cho FPT trên máy riêng → làm [§4](#4-mode-a--compose-3-service-máyvm-riêng).
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
| `DATABASE_URL` | dev | ✅ | Chỉ cần khi chạy **ngoài** Docker. Trong compose bị override thành `@db:5432` |
| `SITE_ORIGIN` | | ✅ (cần `up -d web`) | Origin tuyệt đối cho OG tag/share link. Production: `https://khupho.ailab.city`. **Không** liên quan CSRF/auth |
| `BASE_PATH` | | ❌ **Build arg** | **Chốt 8/9: `/khu-pho-biet-thuong`** (site ở `https://fpt.vn/khu-pho-biet-thuong`); `""` nếu chuyển sang domain riêng. Đổi ⇒ **bắt buộc rebuild image**. Cả 2 file compose đều đọc biến này từ `.env` (sửa 8/9 — `docker-compose.prod.yml` trước đó chốt cứng `""`, làm CI build lại là mất subpath) |
| `SITE_ADDRESS` | | ✅ | **Chỉ** dùng ở mode A: `:80` cho local, hoặc domain để Caddy tự cấp TLS |
| `POSTGRES_USER` / `POSTGRES_DB` | | | Mặc định `khupho` |
| `UPLOAD_DIR` | | ⚠️ Cần chuyển file | Thư mục gốc chứa ảnh upload. Image đặt sẵn `/app/uploads`; cả 2 file compose **ghi đè** thành `/app/uploads` + mount volume `uploads_data`, nên **không cần** khai trong `.env` production. Dev ngoài Docker: `./uploads`. Đổi giá trị = ảnh cũ nằm lại thư mục cũ |
| `SEED_ADMIN_PASSWORD` | | | Chỉ cho `pnpm seed` môi trường thử (mặc định `KhuPho@2026!Demo`) |

Ở **production** (`NODE_ENV=production`), thiếu biến bắt buộc thì app **ném lỗi lúc khởi động**
thay vì âm thầm dùng giá trị dev (`src/lib/env.ts`). Đây là chốt chặn cố ý: thà container không
lên còn hơn chạy bằng pepper mặc định.

### 2.2 Sinh secrets

```bash
echo "PHONE_PEPPER=$(openssl rand -hex 32)"
echo "PHONE_AES_KEY=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')"
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

### 2.4 Vault — CHỈ dùng khi deploy k8s bên FPT

Áp dụng cho đường deploy k8s của ISC ([wiki nội bộ](https://iscdoc.fpt.net/pages/viewpage.action?pageId=52232317)).
**Không liên quan** localhost và VM `khupho.ailab.city`: hai nơi đó không có `/vault/secrets` nên
`loadVaultEnv()` thoát ngay, im lặng, chạy bằng `.env` như mục 2.1.

Bên mình khai secret tại `isc-project/khu-pho-yeu-thuong/app-secret/<env>/khu-pho-yeu-thuong-web-portal`
(env: `development` · `staging` · `production`) gồm **`PHONE_PEPPER`**, **`PHONE_AES_KEY`**,
**`SITE_ORIGIN`**. Connect string DB do **đội DBA** khai ở nhánh `database/`. Hạ tầng merge cả hai
thành MỘT file trong pod: `/vault/secrets/configuration.<env>.json`.

| Điều | Quy tắc |
|---|---|
| Chọn file | `VAULT_SECRET_FILE` → `configuration.$NODE_ENV.json` → **file `configuration.*.json` duy nhất** trong thư mục |
| Vì sao cần nhánh 3 | Next **ép `NODE_ENV=production` ở mọi môi trường**, nên pod staging vẫn mang giá trị `production` và nhánh 2 tìm nhầm tên file. Mỗi pod chỉ được inject 1 file nên không có gì để nhầm |
| Nhiều file khớp | **Không đoán** — log cảnh báo rồi bỏ qua; app chết lúc khởi động theo đúng fail-fast của mục 2.1. Muốn chỉ định thì đặt `VAULT_SECRET_FILE` |
| Thứ tự ưu tiên | **Biến môi trường THẮNG Vault** — khoá nào `process.env` đã có thì bỏ qua, để vận hành override được bằng `env:` trong manifest |
| `DATABASE_URL` | Có nguyên chuỗi thì dùng luôn; không thì ghép từ `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` (+ alias `POSTGRES_*`, `PG*`), user/password được URL-encode, `DB_SSLMODE` → `?sslmode=` |
| Xoay secret | **Không** đọc lại file khi Vault renew — muốn nhận giá trị mới thì restart pod |
| `BASE_PATH` | **KHÔNG** đưa vào Vault: là build arg, bake vào bundle lúc `next build`, inject runtime là quá muộn |

Code: `src/lib/vault-env.ts` (app) và bản chép trong `scripts/migrate.mjs` — job migration chạy pod
RIÊNG, file `.mjs` thuần nên không import được `src/`; **sửa một bên nhớ sửa bên kia**.

Log lúc nạp chỉ ghi **tên khoá**, không bao giờ ghi giá trị:

```
[vault] nạp 4 biến từ /vault/secrets/configuration.production.json: PHONE_PEPPER, PHONE_AES_KEY, SITE_ORIGIN, DATABASE_URL
```

Không thấy dòng này trong log pod = secret chưa vào được: kiểm annotation Vault agent trước, rồi
tới tên khoá trong Vault. Dòng `[vault] bỏ qua secret: …` nói rõ lý do.

⚠️ `pg` cảnh báo `sslmode=require` sẽ đổi nghĩa ở pg v9 (hiện được hiểu như `verify-full`). Nếu DBA
đặt `DB_SSLMODE=require` thì chốt ý định bằng `verify-full` hoặc `uselibpqcompat=true&sslmode=require`.

---

## 3. Mode B — deploy production thực tế, từng bước

Đích đến: `https://khupho.ailab.city` chạy trên VM dùng chung, Caddy host lo TLS cho nhiều app.

Đặc điểm `docker-compose.prod.yml` (đọc trước để hiểu vì sao các bước bên dưới như vậy):

- **Không có service `proxy`** — Caddy trên host lo TLS/reverse-proxy.
- `web` publish **chỉ nội bộ** `127.0.0.1:3001` (port 3000/8000 đã bị app khác dùng).
- `db` **không publish port nào** → không đụng Postgres 5432 của app kia.
- Ảnh upload nằm trong volume `khupho_uploads_data` mount vào `web:/app/uploads` (thuộc UID/GID 1001).
- Project name cố định `khupho` → container tên `khupho-web-1|khupho-db-1`.

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

> ⚠️ **Cập nhật 8/9**: khối video TVC **đã gỡ khỏi trang chủ và khỏi `/admin/noi-dung`** (2/9 và 4/9)
> nên hiện **không còn iframe YouTube nào** trên site — `frame-src` không còn bắt buộc về mặt chức năng.
> Vẫn khuyến nghị **giữ nguyên** dòng đó để không phải sửa lại proxy nếu Design khôi phục khối này.
>
> <details><summary>Ghi chú cũ (khi còn khối TVC)</summary>
>
> `frame-src` trong snippet không được bỏ. Thiếu nó thì iframe TVC rơi về `default-src 'self'`
> và Chrome chặn — trang chủ lẫn ô "Xem trước video" ở `/admin/noi-dung` chỉ còn ô xám
> *"This content is blocked."*. Đó là lỗi cấu hình proxy, không phải lỗi ID video.
>
> </details>

### B6. Build image + khởi động

```bash
cd /opt/khu_pho
docker compose -f docker-compose.prod.yml build web     # ~2–5 phút lần đầu
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

Kỳ vọng: 2 container `khupho-web-1`, `khupho-db-1` — `db` phải `healthy` thì `web` mới khởi động
(`depends_on: service_healthy`). Nâng cấp từ bản còn service `storage` cũ? Làm [§13](#13-chuyển-ảnh-cũ-sang-filesystem-một-lần) **trước** bước này.

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

## 4. Mode A — compose 3 service (máy/VM riêng)

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
docker compose ps          # 3 service: web, db, proxy
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
| Đổi `SITE_ORIGIN`, `POSTGRES_PASSWORD` trong `.env` | `up -d web` (không cần build) — container phải khởi động lại mới đọc `.env` mới |
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
| Dung lượng | `docker system df` · `df -h` | ảnh WebP tích tụ trong volume `uploads_data` (`docker compose -f $F exec web du -sh /app/uploads`) |
| RAM/swap | `free -h` | build image là lúc căng nhất |
| Chứng chỉ TLS | `sudo caddy list-certificates` hoặc log Caddy | còn hạn (Caddy tự gia hạn) |

Dọn rác Docker định kỳ (image cũ sau nhiều lần build tích tụ nhanh):

```bash
docker image prune -f                 # xoá image dangling
docker builder prune -f --keep-storage 5GB
```

> Đừng chạy `docker system prune -a --volumes` — cờ `--volumes` xoá luôn `db_data`/`uploads_data`.

---

## 9. Backup & restore

### 9.1 Backup thủ công

```bash
F=docker-compose.prod.yml
cd /opt/khu_pho

# Database (db không publish port → dump qua exec)
docker compose -f $F exec -T db pg_dump -U khupho khupho | gzip > backup-$(date +%F).sql.gz

# Ảnh upload (volume uploads_data) — tar chạy TRONG container web rồi stream ra host,
# không phụ thuộc tên volume/project; file đang ghi dở là `.…tmp` ẩn, restore về vô hại
docker compose -f $F exec -T web tar czf - -C /app/uploads . > uploads-$(date +%F).tar.gz
```

Hai pattern `backup-*.sql.gz` và `uploads-*.tar.gz` đã có trong `.gitignore` **và** `.dockerignore`
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
# 02:30 mỗi ngày: tar thư mục ảnh upload, giữ 14 bản
30 2 * * * cd /opt/khu_pho && docker compose -f docker-compose.prod.yml exec -T web tar czf - -C /app/uploads . > /var/backups/khupho/uploads-$(date +\%F).tar.gz 2>>/var/log/khupho-backup.log && find /var/backups/khupho -name 'uploads-*.tar.gz' -mtime +14 -delete
```

```bash
sudo mkdir -p /var/backups/khupho && sudo chown $USER /var/backups/khupho
```

### 9.3 Restore

```bash
F=docker-compose.prod.yml

# Database
gunzip -c backup-YYYY-MM-DD.sql.gz | docker compose -f $F exec -T db psql -U khupho khupho

# Ảnh upload — giải nén trong container web nên file thuộc đúng UID/GID 1001, không cần restart
docker compose -f $F exec -T web tar xzf - -C /app/uploads < uploads-YYYY-MM-DD.tar.gz
```

Restore xong phải dùng **đúng `.env` cùng thời điểm** (cùng `PHONE_PEPPER` và `PHONE_AES_KEY`),
rồi chạy lại `migrate.mjs` (dump cũ có thể thiếu migration mới).

**Thử restore ít nhất một lần** trước go-live — backup chưa từng restore không phải là backup.

---

## 10. Sự cố thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Build fail ở native deps (sharp/argon2/esbuild) | Dockerfile ghim `pnpm@9` **có chủ đích**: corepack mặc định kéo pnpm 11 (đòi Node ≥22.13 và hard-fail "ignored builds"). Nâng pnpm phải nâng lockfile cùng lúc |
| Build chết `packages field missing or empty` | pnpm 9 đọc phải `pnpm-workspace.yaml` — file này CHỈ cho pnpm 11 ở máy dev (`allowBuilds` sharp/esbuild), không có khoá `packages`. `.dockerignore` đã chặn, nhưng buildah/CI có thể không áp ignorefile ⇒ Dockerfile `RUN rm -f pnpm-workspace.yaml` ngay sau `COPY . .` (17/9). Đừng gỡ dòng này; thêm cấu hình workspace thật thì phải xem lại cả hai chỗ |
| Build bị kill giữa chừng, không rõ lỗi | Hết RAM. `free -h`, bật swap (`fallocate -l 4G /swapfile …`) rồi build lại |
| Workflow không chạy khi push | Workflow phải nằm ở `.github/workflows/` tại **gốc repo**. Kiểm runner còn online: Settings → Actions → Runners |
| Deploy fail ở bước "Ensure .env" | `/opt/khu_pho/.env` không tồn tại hoặc `PHONE_PEPPER` rỗng. Đây là chốt chặn cố ý — khôi phục `.env` từ backup, **đừng sinh pepper mới** |
| `web` unhealthy | `docker compose -f $F logs web`. Thường do thiếu `PHONE_PEPPER`/`PHONE_AES_KEY` (app ném lỗi lúc khởi động ở production) hoặc `db` chưa healthy |
| 502 từ Caddy host | `web` chưa lên hoặc lệch port. Kiểm `curl 127.0.0.1:3001/api/v1/counters` và site block trỏ đúng `127.0.0.1:3001` |
| Sửa CSP trong repo mà production không đổi | Host nối **nửa vời**: thiếu `import khupho_headers` trong site block ([B5.3](#b5-caddy-trên-host--security-header-một-lần)). Job `sync-headers` sẽ fail và chỉ đúng dòng thiếu |
| *(lịch sử — khối TVC đã gỡ 2–4/9)* Video TVC là ô xám "This content is blocked" | CSP của Caddy **host** thiếu `frame-src https://www.youtube-nocookie.com`. Kiểm `curl -sI https://<domain>/ \| grep -i content-security`, sửa theo [B5](#b5-caddy-trên-host--security-header-một-lần) → `caddy validate` + `reload`. Không cần rebuild app |
| *(lịch sử)* Video TVC ra "Error 153 — Video player configuration error" | Iframe nạp được nhưng thiếu `referrerPolicy="strict-origin-when-cross-origin"` trên thẻ. Site đặt `Referrer-Policy: no-referrer` nên YouTube không xác thực được domain nhúng. **Không phải** lỗi ID video — đổi ID khác vẫn lỗi y hệt |
| Ảnh không hiện (404) | Ảnh public đi qua `/api/img/…`. Kiểm file có thật: `docker compose -f $F exec web ls -l /app/uploads/<key>`. Thiếu → volume chưa mount đúng `/app/uploads` (xem `docker inspect khupho-web-1 --format '{{json .Mounts}}'`) hoặc chưa chuyển ảnh cũ ([§13](#13-chuyển-ảnh-cũ-sang-filesystem-một-lần)). File có mà vẫn 404 → key sai quy ước (`..`, `\`, đoạn bắt đầu bằng `.`) hoặc không đọc được (log có `[img] đọc ảnh thất bại code=…`) |
| Upload ảnh báo "Không lưu được ảnh, vui lòng thử lại sau" (500) | Log `web` có dòng `[storage] ghi ảnh thất bại UPLOAD_DIR=… code=…`. `EACCES`: thư mục không thuộc/không cho UID 1001 ghi → `chown -R 1001:1001` thư mục export/volume. `EROFS`: volume mount read-only hoặc chưa mount mà root filesystem read-only. `ENOENT`/`ENOTDIR`: `UPLOAD_DIR` trỏ sai. App vẫn chạy bình thường, chỉ upload lỗi |
| Ảnh prefix `private/` trả 404 | Đúng như thiết kế: `/api/img/…` **chỉ** phục vụ key `public/`. *(Route đọc ảnh bản đồ gốc dành cho admin đã xoá cùng khối bản đồ 1/8 — hiện không còn ảnh `private/` nào được sinh ra.)* |
| Slider hero trống dù admin đã bật "tiêu biểu" | Từ 7/9 slider lấy khu `is_featured` và **cắt đúng 10 slot**. Kiểm: khu có `hidden=false`, `deleted_at IS NULL`, và `featured_position` nằm trong 1–10 (hoặc NULL nhưng 10 slot chưa đầy) |
| Khu phố biến mất khỏi toàn bộ web | Có thể đã bị **xoá mềm**: `SELECT name, deleted_at FROM neighborhoods WHERE deleted_at IS NOT NULL;` → khôi phục ở tab 🗑 Đã xoá của `/admin/khu-pho` |
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
- [ ] Đã lên lịch backup DB + ảnh upload (cron [§9.2](#92-backup-tự-động-cron)) và **đã thử restore ít nhất một lần**.

Ứng dụng

- [ ] `pnpm test` xanh trên đúng commit đang deploy.
- [ ] Đã thử end-to-end trên production: định danh → đề xuất (popup 2 bước) → duyệt → viết câu → duyệt 4N → **bình chọn (không rút lại được)** → chọn câu → treo biển → banner tin vui + trang share.
- [ ] Đã test preview link share bằng Facebook Sharing Debugger và Zalo debugger.
- [ ] Mobile 360px không vỡ layout. ~~video TVC phát được~~ (khối TVC đã gỡ).
- [ ] **Đo LCP trang chủ trên bản production** (`pnpm build && pnpm start`) — mục **C4 của QC 2/9 vẫn CHƯA làm**; DoD yêu cầu < 2.5s.

CI/CD

- [ ] Runner self-hosted online, label `khupho`, user thuộc nhóm `docker`.
- [ ] Sudoers NOPASSWD đúng 3 binary ([§6.3](#63-sudoers-cho-job-sync-headers-một-lần)).
- [ ] Đã chạy thử một lần "Run workflow" tay và cả 2 job đều xanh.

---

## 12. Kubernetes + NFS — yêu cầu cho bên vận hành

Production chạy **Kubernetes**, ảnh upload nằm trên **NFS mount bằng PV/PVC**. Repo **không** chứa
manifest/Helm: GitLab CI của FPT build image theo template riêng và bên vận hành tự deploy. Mục này
là hợp đồng giữa app và hạ tầng — mọi điểm dưới đây đã thử bằng Docker (kết quả ở cuối mục).

### 12.1 App cần gì

| # | Yêu cầu | Chi tiết |
|---|---|---|
| 1 | **PVC `ReadWriteMany`** mount vào **`/app/uploads`** | Nhiều replica cùng ghi/đọc. Key trong DB (`public/…`, `private/…`) là đường dẫn tương đối dưới thư mục này. Đổi chỗ mount thì đặt `UPLOAD_DIR=<đường dẫn tuyệt đối>` |
| 2 | Thư mục export NFS thuộc **UID 1001 / GID 1001** (hoặc cho GID 1001 ghi, mode `2775`) | **NFS không áp `fsGroup`** — kubelet không chown volume NFS; server hay bật `root_squash` nên init container chạy root cũng không chown được. Chown **phía NFS server**: `chown -R 1001:1001 <export> && chmod 2775 <export>` |
| 3 | `securityContext` pod: `runAsNonRoot: true`, **`runAsUser: 1001`**, **`runAsGroup: 1001`**, `allowPrivilegeEscalation: false` | Dockerfile của repo chốt `USER 1001:1001` (số, để `runAsNonRoot` kiểm được). Image build bằng **template CI của FPT không dùng Dockerfile này** ⇒ user trong image có thể khác — **vẫn phải đặt `runAsUser/runAsGroup` tường minh** cho khớp chủ sở hữu thư mục NFS |
| 4 | Khuyến nghị **`readOnlyRootFilesystem: true`** | App chỉ ghi vào `/app/uploads`. Đã kiểm: **không cần tmpfs/emptyDir nào khác** (xem 12.3). Lợi ích phụ: quên mount PVC thì upload báo lỗi `EROFS` ngay, thay vì âm thầm ghi vào lớp ghi của container rồi **mất ảnh khi pod restart** |
| 5 | **Liveness/readiness KHÔNG đụng NFS** | Dùng `GET <BASE_PATH>/api/v1/counters` port 3000 (production chốt `BASE_PATH=/khu-pho-biet-thuong` ⇒ path là `/khu-pho-biet-thuong/api/v1/counters`). Route này chỉ đọc DB. Đừng thêm probe kiểm thư mục ảnh: NFS chập chờn vài giây sẽ làm kubelet restart **mọi** pod cùng lúc |
| 6 | Ingress cho body upload **≥ 12MB** | Route upload nhận tối đa 10MB/ảnh (multipart có thêm overhead). ingress-nginx mặc định `proxy-body-size: 1m` ⇒ ảnh >1MB bị **413** trước khi tới app: đặt annotation `nginx.ingress.kubernetes.io/proxy-body-size: "12m"` |
| 7 | **Không** publish thư mục NFS qua ingress/web server tĩnh | Mọi ảnh đi qua `/api/img/…` — route chỉ phục vụ `public/`, `private/` không được lộ |
| 8 | Không cần biến môi trường nào cho ảnh | `UPLOAD_DIR` mặc định `/app/uploads`. Không còn secret object storage |
| 9 | **Vault agent inject vào `/vault/secrets`** | Annotation do bên vận hành đặt. App đọc file `configuration.*.json` trong thư mục này (chi tiết ở **§2.4**). Mỗi pod **đúng một file**; nhiều file thì app không đoán mà chết lúc khởi động. Thư mục này là volume riêng nên `readOnlyRootFilesystem: true` không ảnh hưởng. **Job migration cần y hệt** — nó chạy pod riêng và cũng đọc `/vault/secrets` |

Khi volume **chưa ghi được** (chưa mount, sai quyền, NFS read-only): app **vẫn khởi động**, trang chủ và
API trả 200 bình thường; chỉ upload trả **500** câu chung "Không lưu được ảnh, vui lòng thử lại sau",
log có một dòng đủ để chẩn đoán:

```
[storage] ghi ảnh thất bại UPLOAD_DIR=/app/uploads code=EACCES key=public/neighborhoods/<id>/photo-1-<ts>.webp
```

`EACCES` = sai chủ sở hữu/quyền (mục 2–3) · `EROFS` = mount read-only hoặc chưa mount PVC khi bật
`readOnlyRootFilesystem` · `ENOENT`/`ENOTDIR` = `UPLOAD_DIR` trỏ sai. Ảnh thiếu file khi xem → 404.

### 12.2 Chạy nhiều replica

- **Phần ảnh an toàn**: code không giữ trạng thái file nào trong RAM; mọi lần ghi là ghi file tạm
  `.<tên>.<hex>.tmp` **cùng thư mục** → `fsync` → `rename` (nguyên tử trên NFS). Hai pod ghi cùng key
  thì bản sau thắng, không file nào hỏng; người đọc không bao giờ thấy file dở.
- **Phần khác CHƯA an toàn** ([20 §3.1](20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md)): rate limit, token tạm
  bước 2 TOTP và cache bộ đếm vẫn nằm trong RAM từng pod. Hệ quả thật: admin bật TOTP có thể **đăng
  nhập không được** nếu bước 2 rơi vào pod khác ⇒ trước khi chạy >1 replica phải bật
  `sessionAffinity`/sticky cookie ở ingress (hoặc chạy 1 replica) cho tới khi xử lý nợ này.
- File tạm mồ côi (pod bị kill giữa lúc ghi) là file ẩn, không bao giờ được phục vụ. Dọn định kỳ
  nếu muốn: `find /app/uploads -name '.*.tmp' -mmin +60 -delete`.

Ví dụ phần liên quan trong Deployment (chỉ để minh hoạ — manifest thật do bên vận hành quản lý):

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
      containers:
        - name: web
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
          volumeMounts:
            - name: uploads
              mountPath: /app/uploads
          livenessProbe:
            httpGet: { path: /khu-pho-biet-thuong/api/v1/counters, port: 3000 }
          readinessProbe:
            httpGet: { path: /khu-pho-biet-thuong/api/v1/counters, port: 3000 }
      volumes:
        - name: uploads
          persistentVolumeClaim:
            claimName: khupho-uploads   # accessModes: [ReadWriteMany], NFS
```

### 12.3 Đã kiểm bằng Docker (17/9, không có cluster thật)

| Điều kiện k8s/NFS | Cách mô phỏng | Kết quả |
|---|---|---|
| 2 replica chung PVC | 2 container `web` cùng mount một volume | Upload ở A xem ngay ở B và ngược lại; thay ảnh thì URL cũ 404 ở cả hai; 20 lần upload đồng thời cùng một key từ A và B → 20×200, file cuối giải mã được, không sót `.tmp` |
| Export NFS sai chủ sở hữu | Volume thuộc UID 2000, mode 755 | Container vẫn `healthy`, `/` và `/api/v1/counters` 200, ảnh có sẵn vẫn đọc được; upload **500** câu chung, log `code=EACCES` |
| `readOnlyRootFilesystem` | `docker run --read-only`, chỉ `/app/uploads` là volume | **Không cần tmpfs**. Trang chủ, 4 route OG, `/bien`, `/dai-su`, `/khu-pho`, admin login, các API + upload/thay/xem ảnh đều chạy; log không có `EROFS` |
| Next.js có ghi `.next/cache`? | `docker diff` container thường sau khi gọi hết các route trên | **Rỗng** — không ghi gì ngoài volume. App không dùng `next/image`, ISR `revalidate` hay fetch cache nên Next không cần `.next/cache`. Nếu sau này thêm các thứ đó thì mount `emptyDir` vào `/app/.next/cache` |

---

## 13. Chuyển ảnh cũ sang filesystem (một lần)

Chỉ cần khi nâng cấp một hệ thống **đã có ảnh trong MinIO** (bản trước 17/9). Key trong DB giữ
nguyên — chỉ chép file, **không migration DB**.

> ⚠️ **Không chép thẳng thư mục dữ liệu của MinIO** (volume `minio_data`, đường dẫn `/data/<bucket>/…`):
> MinIO lưu mỗi object thành **một thư mục chứa `xl.meta`**, không phải file ảnh. Phải xuất qua
> `mc mirror` như dưới đây.

Trong lúc chuyển, **tạm dừng upload ảnh ở admin** (ảnh upload sau bước 1 sẽ không có trong bản xuất;
hoặc chạy lại bước 1 ngay trước bước 3 — `mc mirror` chỉ chép phần mới).

> 🚨 **Bước 2 KHÔNG do bạn bấm: push lên `main` là đã deploy** ([§5](#5-deploy-các-lần-sau) — CI
> chạy `build web` + `up -d` cho mọi push). Volume `uploads_data` sinh ra **rỗng**, nên tính từ
> giây stack mới lên, **mọi ảnh cũ 404** (slider trang chủ, popup khu phố, ảnh góc phố, chứng
> nhận, thẻ OG) cho tới khi xong bước 3. Vì vậy:
>
> - **Làm bước 1 TRƯỚC khi merge/push** bản bỏ MinIO — lúc đó stack cũ còn service `storage`.
>   Bản xuất đã nằm sẵn ở `/var/backups/khupho/` thì bước 3 chạy ngay sau khi CI xanh, khoảng
>   tối ưu chỉ còn vài phút.
> - Lỡ push trước rồi: **đừng rollback**. Service `storage` vẫn chạy (orphan, còn nguyên dữ
>   liệu) ⇒ chạy bước 1 rồi bước 3 là ảnh trở lại, không mất gì.
> - Muốn tự chọn thời điểm: tạm để nhánh release ngoài `main`, deploy bằng tab Actions →
>   "Run workflow" sau khi bước 1 xong.

**Bước 1 — xuất bucket ra host** (stack CŨ còn chạy; ví dụ mode B, bucket mặc định `khupho`):

```bash
cd /opt/khu_pho && F=docker-compose.prod.yml
BUCKET=$(grep -E '^MINIO_BUCKET=' .env | cut -d= -f2); BUCKET=${BUCKET:-khupho}
docker compose -f $F exec -T storage sh -c "mc alias set src http://127.0.0.1:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null \
  && rm -rf /tmp/kp-export && mc mirror --quiet src/$BUCKET /tmp/kp-export >/dev/null && mc du src/$BUCKET"
# image MinIO không có tar/find ⇒ lấy ra bằng docker cp (đặt NGOÀI thư mục repo)
sudo mkdir -p /var/backups/khupho && sudo chown $USER /var/backups/khupho
docker cp khupho-storage-1:/tmp/kp-export /var/backups/khupho/minio-export
find /var/backups/khupho/minio-export -type f | wc -l     # PHẢI bằng số "objects" mc du in ra
```

**Bước 2 — deploy code mới** như [§5](#5-deploy-các-lần-sau) — **push lên `main` là đã xong bước
này**, CI tự build + `up -d` (xem cảnh báo ở trên). Compose báo container `storage` là *orphan* —
**để nguyên nó chạy** tới khi kiểm xong bước 4.

**Bước 3 — nạp vào volume ảnh mới** (giải nén trong container `web` ⇒ file thuộc đúng UID/GID 1001):

```bash
COPYFILE_DISABLE=1 tar czf - -C /var/backups/khupho/minio-export . \
  | docker compose -f $F exec -T web tar xzf - -C /app/uploads
```

`COPYFILE_DISABLE=1` chỉ có tác dụng khi chạy `tar` **trên macOS**: thiếu nó, tar của macOS nhét
thêm file AppleDouble `._<tên>` cho mỗi file/thư mục (đo thật: 95 ảnh thành 273 file). File đó bắt
đầu bằng `.` nên không bao giờ bị phục vụ, nhưng là rác. Trên Linux biến này vô hại.

**Kubernetes/NFS**: chép nội dung `minio-export/` vào **gốc** thư mục export NFS (cùng cấp với
`public/`, `private/`) rồi `chown -R 1001:1001` phía NFS server.

**Bước 4 — đối chiếu mọi key trong DB với file** (kỳ vọng `thiếu file: 0`):

```bash
docker compose -f $F exec -T db psql -U khupho -d khupho -Atc "
  SELECT photo_key FROM neighborhood_photos
  UNION ALL SELECT certificate_photo_key FROM neighborhoods WHERE certificate_photo_key IS NOT NULL
  UNION ALL SELECT map_image_key FROM neighborhoods WHERE map_image_key IS NOT NULL
  UNION ALL SELECT map_stylized_key FROM neighborhoods WHERE map_stylized_key IS NOT NULL
  UNION ALL SELECT photo_key FROM issues WHERE photo_key IS NOT NULL
  UNION ALL SELECT image_key FROM suggestions WHERE image_key IS NOT NULL" \
| docker compose -f $F exec -T web sh -c 'n=0; t=0; while read k; do t=$((t+1));
    [ -f "/app/uploads/$k" ] || { echo "THIẾU $k"; n=$((n+1)); }; done; echo "key trong DB: $t · thiếu file: $n"'
```

(Kubernetes: thay `docker compose … exec -T web` bằng `kubectl exec -i deploy/<web> --`.) Mở thử vài ảnh
trên trang chủ / popup khu phố.

**Bước 5 — dọn** (sau vài ngày chạy ổn):

```bash
docker compose -f $F up -d --remove-orphans     # dừng + xoá container storage cũ
docker volume rm khupho_minio_data               # KHÔNG hoàn tác được — backup uploads trước (§9.1)
sed -i '/^MINIO_/d' .env                         # các biến này không còn được đọc
rm -rf /var/backups/khupho/minio-export
```

Đã chạy thử toàn bộ bước 1 → 4 trên dữ liệu dev (95 object): 95 file, băm SHA-256 khớp từng object
lấy mẫu, 95/95 key trong DB có file, mọi file thuộc UID/GID 1001.
