# Khu Phố Của Tôi

Website hub chiến dịch **"Khu phố biết thương"** — FPT Telecom.
Toàn bộ đặc tả nằm trong `docs/` (đọc `docs/CLAUDE.md` để biết thứ tự đọc và các quy tắc cứng:
4N chấm thủ công, không OTP/SMS, bảo mật SĐT, Docker 4 service...).

- **Production**: https://khupho.ailab.city · Admin: https://khupho.ailab.city/admin
- **Repo**: gốc git là thư mục cha (`Projects/`), app nằm trong thư mục con `khu_pho_yeu_thuong/`
  → GitHub Actions workflow **bắt buộc** đặt ở gốc repo: `.github/workflows/deploy.yml`.

---

## 1. Stack & kiến trúc

Next.js 15 (App Router) · React 19 · TailwindCSS 4 · PostgreSQL 16 · MinIO · Caddy · Docker · pnpm 9 · Node 22.

| Thành phần | Vai trò |
|---|---|
| `web` | Next.js standalone (multi-stage Dockerfile, non-root, healthcheck `/api/v1/counters`) |
| `db` | PostgreSQL 16 — schema ở `db/migrations/`, chạy bằng `scripts/migrate.mjs` |
| `storage` | MinIO — ảnh `public/...` (stream qua `/api/img/[...key]`) và `private/...` (chỉ admin) |
| `proxy` | Caddy — service duy nhất mở port, TLS tự động, security headers (`deploy/Caddyfile`) |

Điểm thiết kế chính:

- **Định danh không OTP**: SĐT → HMAC-SHA256 + PEPPER, session cookie `kp_session` (HttpOnly/Secure/Lax, 180 ngày). SĐT gốc không bao giờ ở client/URL/log; chỉ mã hoá AES-256-GCM server-side khi lead opt-in.
- **Admin tách riêng**: email @fpt.com + Argon2id, khoá 5 lần sai, TOTP tuỳ chọn, cookie `kp_admin_session` (Strict, 8h).
- **Điểm**: sổ cái append-only `score_events` — 2×đề xuất + 5×câu 4N + 1×thương + 30×treo biển; trần 3 đề xuất/tuần ISO. Mọi ghi điểm đi qua `src/lib/score-service.ts`.
- **4N**: KHÔNG chấm tự động — admin tick 4 ô khi duyệt (server chặn nếu thiếu).
- **Bản đồ**: admin upload ảnh → sharp tự cách điệu (duotone kem–đỏ gạch) → public chỉ thấy bản cách điệu; pin theo toạ độ %.
- **CSRF double-submit**: cookie `kp_csrf` + header `x-csrf-token` — client dùng helper `src/components/client-api.ts`.
- **basePath** cấu hình bằng env `BASE_PATH` (đổi domain chỉ cần đổi env + rebuild).

## 2. Cấu trúc thư mục

```
db/migrations/       schema SQL (chạy bằng scripts/migrate.mjs — idempotent)
scripts/             migrate, seed, create-admin, seed-admin-demo (.mjs thuần — chạy được trong container)
src/lib/             crypto, phone, session, csrf, score-service, storage, stylize, copy (wording NGUYÊN VĂN)...
src/app/api/v1/      API public + cư dân (docs/03 §4)
src/app/api/admin/   API admin (duyệt, biển, leads, import, fraud)
src/app/             trang chủ, share (/dai-su /bien /khu-pho + OG động), admin UI
deploy/Caddyfile     proxy + TLS + security headers (dùng cho compose 4-service)
docker-compose.yml        compose "chuẩn" 4 service — máy/VM riêng
docker-compose.prod.yml   compose production thực tế — VM dùng chung, không có proxy (xem §6)
Dockerfile           multi-stage node:22-alpine, pnpm@9 ghim cứng
../.github/workflows/deploy.yml   CI/CD (ở GỐC repo, không phải trong thư mục app)
```

## 3. Biến môi trường

Tạo từ template: `cp .env.example .env`. **Không bao giờ commit `.env` thật.**

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `PHONE_PEPPER` | ✅ | Pepper cho HMAC SĐT — `openssl rand -hex 32`. **KHÔNG xoay được giữa chừng** (đổi là mất toàn bộ định danh cư dân) — chọn kỹ ngay từ đầu và backup an toàn. |
| `PHONE_AES_KEY` | ✅ | Khoá AES-256-GCM mã hoá SĐT lead — `openssl rand -base64 32`. Tách biệt hoàn toàn với PEPPER. |
| `POSTGRES_PASSWORD` | ✅ | Mật khẩu Postgres (user/db mặc định `khupho`). |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | ✅ | Credentials MinIO. |
| `DATABASE_URL` | dev | Chỉ cần khi chạy ngoài Docker: `postgres://khupho:...@localhost:5432/khupho`. Trong compose bị override thành `@db:5432`. |
| `BASE_PATH` | | `""` cho domain riêng; `/khu-pho-de-thuong` nếu chạy dưới path. Là **build arg** — đổi phải rebuild image. |
| `SITE_ORIGIN` | | Origin tuyệt đối cho OG tag / share link (`src/lib/url.ts`). KHÔNG dính CSRF/auth. Production: `https://khupho.ailab.city`. |
| `SITE_ADDRESS` | | Chỉ dùng cho compose 4-service: `:80` local, hoặc `khupho.example.com` để Caddy tự cấp TLS. |
| `MINIO_BUCKET` | | Mặc định `khupho`. |
| `SEED_ADMIN_PASSWORD` | | Tuỳ chọn, cho `pnpm seed`. |

## 4. Chạy dev local

Yêu cầu: Node ≥ 22, pnpm 9, Postgres 16 + MinIO (cài trực tiếp hoặc mượn container từ compose).

```bash
cp .env.example .env             # điền PHONE_PEPPER, PHONE_AES_KEY, DATABASE_URL localhost
pnpm install
pnpm migrate                     # tạo schema (idempotent, chạy lại vô hại)
pnpm seed                        # dữ liệu demo (admin: admin@fpt.com / KhuPho@2026!Demo)
pnpm dev                         # http://localhost:3000 · admin: /admin
```

Lệnh khác:

```bash
pnpm test                        # vitest — 3 test case điểm docs/05 §4 + 4N + phone (BẮT BUỘC pass)
pnpm build                       # build + typecheck
pnpm create-admin <email@fpt.com> <mật_khẩu_≥12_ký_tự> [--totp]
pnpm seed:admin-demo             # dữ liệu demo cho màn admin
```

## 5. Chạy production kiểu "chuẩn" (máy/VM riêng — compose 4 service)

Dùng khi có một máy trống, muốn cả proxy + TLS trong Docker. Chỉ `proxy` mở port 80/443.

```bash
cp .env.example .env             # điền secrets thật; SITE_ADDRESS=<domain> để tự động TLS
docker compose up -d --build
docker compose run --rm web node scripts/migrate.mjs   # migration là lệnh riêng, không tự chạy khi start
docker compose run --rm web node scripts/seed.mjs      # (tuỳ chọn) seed demo
docker compose run --rm web node scripts/create-admin.mjs admin@fpt.com 'MatKhauManh!123'
```

Kiểm tra: `curl -s http://127.0.0.1/api/v1/counters` (hoặc qua domain) trả HTTP 200 JSON.

## 6. Deploy production thực tế (VM dùng chung + Caddy trên host)

Production hiện chạy trên **VM GCP dùng chung** (`ai-law`, Singapore, e2-standard-2 8GB + 4GB swap)
— VM này đồng thời chạy app khác, nên khu-pho dùng `docker-compose.prod.yml` với khác biệt:

- **Không có service proxy** — Caddy chạy trên **host** (systemd) lo TLS/reverse-proxy cho nhiều app.
- `web` publish **chỉ nội bộ** `127.0.0.1:3001` (port 3000/8000 đã bị app khác dùng).
- `db` + `storage` **không publish port nào** (tránh đụng Postgres 5432 / MinIO 9000 của app khác).
- Compose project name cố định `khupho` → container `khupho-web|db|storage`, tách hoàn toàn khỏi app kia.

### 6.1. Chuẩn bị VM (làm một lần)

```bash
# 1. Cài Docker + compose plugin (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER    # logout/login lại để nhận nhóm

# 2. Clone repo (lưu ý: app ở thư mục con)
sudo mkdir -p /opt/khu_pho && sudo chown $USER /opt/khu_pho
git clone https://github.com/tonvinh/khu_pho_yeu_thuong.git /opt/khu_pho
cd /opt/khu_pho/khu_pho_yeu_thuong

# 3. Tạo .env production (KHÔNG có trong repo — gitignored)
cp .env.example .env
# Điền: PHONE_PEPPER (openssl rand -hex 32), PHONE_AES_KEY (openssl rand -base64 32),
#       POSTGRES_PASSWORD, MINIO_ACCESS_KEY/SECRET_KEY mạnh,
#       SITE_ORIGIN=https://khupho.ailab.city, BASE_PATH="" (SITE_ADDRESS không dùng ở mode này)
# → Backup PHONE_PEPPER + PHONE_AES_KEY vào nơi an toàn NGAY — mất là mất dữ liệu.
```

### 6.2. DNS + Caddy trên host (làm một lần)

```bash
# 1. DNS: trỏ A record khupho.ailab.city → IP tĩnh của VM (IP đã reserve static trên GCP,
#    nhớ release nếu ngừng dự án). Firewall GCP mở 80/443.

# 2. Cài Caddy trên host (nếu chưa có): https://caddyserver.com/docs/install
# 3. Thêm site block vào /etc/caddy/Caddyfile:
```

```caddyfile
khupho.ailab.city {
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "no-referrer"
        -Server
    }
    reverse_proxy 127.0.0.1:3001
}
```

```bash
sudo systemctl reload caddy      # Let's Encrypt tự cấp cert trong ~30s
```

### 6.3. Build + chạy lần đầu

```bash
cd /opt/khu_pho/khu_pho_yeu_thuong

docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec -T web node scripts/migrate.mjs

# Tạo admin thật (hoặc seed demo nếu là môi trường thử)
docker compose -f docker-compose.prod.yml exec -T web node scripts/create-admin.mjs admin@fpt.com 'MatKhauManh!123'

# Kiểm tra
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/v1/counters   # → 200
curl -s -o /dev/null -w '%{http_code}\n' https://khupho.ailab.city               # → 200
```

### 6.4. Deploy thủ công các lần sau

```bash
cd /opt/khu_pho
git fetch origin main && git reset --hard origin/main

cd khu_pho_yeu_thuong
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec -T web node scripts/migrate.mjs
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/v1/counters
```

Lưu ý: chỉ đổi `.env` (ví dụ `SITE_ORIGIN`) thì không cần build, nhưng phải
`docker compose -f docker-compose.prod.yml up -d web` để container đọc lại.
Riêng `BASE_PATH` là build arg → bắt buộc build lại.

## 7. CI/CD tự động (GitHub Actions + self-hosted runner)

Push lên `main` có thay đổi trong `khu_pho_yeu_thuong/**` → runner **trên chính VM** tự
pull + rebuild + migrate + healthcheck (~1 phút). Runner kết nối **outbound-only** — VM không
cần mở port SSH. Workflow: `.github/workflows/deploy.yml` (gốc repo), cũng chạy tay được qua
tab Actions → "Run workflow".

Flow của workflow:

1. `git fetch` + `reset --hard FETCH_HEAD` tại `/opt/khu_pho`
2. `docker compose -f docker-compose.prod.yml build web` + `up -d`
3. `exec -T web node scripts/migrate.mjs`
4. Poll `http://127.0.0.1:3001/api/v1/counters` tối đa 45s, khác 200 → fail.

### Cài runner trên VM (làm một lần)

```bash
# GitHub → repo → Settings → Actions → Runners → New self-hosted runner (Linux x64)
# Làm theo lệnh tải + config được sinh sẵn, với 2 điểm riêng của dự án:
sudo mkdir -p /opt/actions-runner && sudo chown $USER /opt/actions-runner
cd /opt/actions-runner
# ... tải + giải nén theo hướng dẫn GitHub ...
./config.sh --url https://github.com/tonvinh/khu_pho_yeu_thuong --token <TOKEN> \
            --labels khupho                 # workflow chọn runner bằng label này
sudo ./svc.sh install $USER && sudo ./svc.sh start    # chạy như systemd service
# User chạy runner phải thuộc nhóm docker: sudo usermod -aG docker $USER
```

## 8. Vận hành

```bash
F=docker-compose.prod.yml   # (bỏ -f nếu dùng compose 4-service)

docker compose -f $F ps                          # trạng thái + healthcheck
docker compose -f $F logs -f --tail=200 web      # log app
docker compose -f $F exec db psql -U khupho khupho    # vào Postgres

# Backup DB (db không publish port — backup qua exec)
docker compose -f $F exec -T db pg_dump -U khupho khupho | gzip > backup-$(date +%F).sql.gz
# Restore
gunzip -c backup-YYYY-MM-DD.sql.gz | docker compose -f $F exec -T db psql -U khupho khupho

# Backup ảnh MinIO (volume minio_data)
docker run --rm --volumes-from khupho-storage-1 -v "$PWD":/backup alpine \
  tar czf /backup/minio-$(date +%F).tar.gz /data
```

## 9. Troubleshooting

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Build fail ở bước native deps (sharp/argon2/esbuild) | Dockerfile ghim `node:22-alpine` + `pnpm@9` có chủ đích — corepack mặc định kéo pnpm 11 (đòi Node ≥22.13, hard-fail "ignored builds"). Đừng nâng pnpm trong Dockerfile nếu chưa nâng lockfile. |
| Workflow không chạy khi push | Workflow phải ở `.github/workflows/` tại **gốc repo** (thư mục cha), không phải trong `khu_pho_yeu_thuong/`. Kiểm tra path filter `khu_pho_yeu_thuong/**`. |
| Healthcheck fail / web unhealthy | `docker compose -f $F logs web`. Thường do thiếu `PHONE_PEPPER`/`PHONE_AES_KEY` hoặc db chưa healthy. Endpoint check: `/api/v1/counters`. |
| 502 từ Caddy host | `web` chưa lên hoặc port lệch — xác nhận `curl 127.0.0.1:3001/api/v1/counters` trên VM, và Caddyfile trỏ đúng `127.0.0.1:3001`. |
| Đổi domain | Đổi A record + site block Caddy + `SITE_ORIGIN` trong `.env` → `up -d web`. Nếu chuyển sang chạy dưới path thì đổi `BASE_PATH` và **rebuild**. |
| Ảnh không hiện | Kiểm tra `storage` healthy và `MINIO_*` khớp; ảnh public đi qua `/api/img/[...key]`, không truy cập MinIO trực tiếp. |
| Migration lỗi giữa chừng | `scripts/migrate.mjs` idempotent — sửa nguyên nhân rồi chạy lại lệnh migrate là đủ. |

## 10. Quy tắc khi sửa code (tóm tắt — chi tiết ở `CLAUDE.md` + `docs/CLAUDE.md`)

- Mọi ghi điểm qua `src/lib/score-service.ts`; side-effects "treo biển" ở `applyInstalledSideEffects` (trong transaction PATCH `/api/admin/suggestions/[id]`).
- Copy tiếng Việt NGUYÊN VĂN ở `src/lib/copy.ts` (từ docs/06 §2) — không tự sửa lời.
- `pnpm test` phải pass trước khi merge (3 test case điểm docs/05 §4).
- Scripts trong `scripts/` giữ là `.mjs` thuần (không TS) để chạy trong image production.
