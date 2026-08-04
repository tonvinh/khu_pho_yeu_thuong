# Khu Phố Của Tôi

Website hub chiến dịch **"Khu phố biết thương"** — FPT Telecom.
Toàn bộ đặc tả nằm trong `docs/` (đọc `docs/CLAUDE.md` để biết thứ tự đọc và các quy tắc cứng:
4N chấm thủ công, không OTP/SMS, bảo mật SĐT, Docker 4 service...).

- **Production**: https://khupho.ailab.city · Admin: https://khupho.ailab.city/admin
- **Repo**: gốc git chính là thư mục app. Trên VM, repo clone tại `/opt/khu_pho` và mọi lệnh
  deploy chạy ngay tại đó.
- **Hướng dẫn deploy production đầy đủ, từng bước**: [`docs/18-TRIEN-KHAI-VAN-HANH.md`](docs/18-TRIEN-KHAI-VAN-HANH.md)
  — file README này chỉ là bản tóm tắt để copy-paste nhanh.

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
deploy/Caddyfile             proxy + TLS cho mode 4-service
deploy/khupho-headers.caddy  security header — NGUỒN DUY NHẤT, cả 2 mode đều import
docker-compose.yml           compose "chuẩn" 4 service — máy/VM riêng (mode A)
docker-compose.prod.yml      compose production thực tế — VM dùng chung, không có proxy (mode B)
Dockerfile                   multi-stage node:22-alpine, pnpm@9 ghim cứng
.github/workflows/deploy.yml CI/CD — self-hosted runner trên VM
```

## 3. Biến môi trường

Tạo từ template: `cp .env.example .env`. **Không bao giờ commit `.env` thật.**
Bảng đầy đủ + cách sinh/backup secrets: [docs/18 §2](docs/18-TRIEN-KHAI-VAN-HANH.md#2-biến-môi-trường--secrets).

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `PHONE_PEPPER` | ✅ | Pepper cho HMAC SĐT — `openssl rand -hex 32`. **KHÔNG xoay được giữa chừng** (đổi là mất toàn bộ định danh cư dân). |
| `PHONE_AES_KEY` | ✅ | Khoá AES-256-GCM mã hoá SĐT lead — `openssl rand -base64 32`. Tách biệt hoàn toàn với PEPPER. |
| `POSTGRES_PASSWORD` | ✅ | Mật khẩu Postgres (user/db mặc định `khupho`). |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | ✅ | Credentials MinIO. |
| `DATABASE_URL` | dev | Chỉ cần khi chạy ngoài Docker. Trong compose bị override thành `@db:5432`. |
| `BASE_PATH` | | `""` cho domain riêng; `/khu-pho-de-thuong` nếu chạy dưới path. Là **build arg** — đổi phải rebuild. |
| `SITE_ORIGIN` | | Origin tuyệt đối cho OG tag / share link. Production: `https://khupho.ailab.city`. |
| `SITE_ADDRESS` | | Chỉ dùng cho mode 4-service: `:80` local, hoặc domain để Caddy tự cấp TLS. |
| `MINIO_BUCKET` | | Mặc định `khupho` (bucket tự tạo ở lần upload đầu). |
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

Mượn Postgres/MinIO từ compose cho nhanh: `docker compose up -d db storage`
(hai service này không publish port — thêm `ports` trong file compose override local nếu cần).

## 5. Deploy production — tóm tắt

> Chi tiết từng bước, kèm kết quả mong đợi và cách xử lý khi sai:
> **[`docs/18-TRIEN-KHAI-VAN-HANH.md`](docs/18-TRIEN-KHAI-VAN-HANH.md)**.
> Lần deploy đầu tiên **hãy đọc docs/18**, đừng chỉ copy khối lệnh dưới đây.

Hai mode:

| | Mode A — compose 4 service | Mode B — VM dùng chung *(đang chạy thật)* |
|---|---|---|
| File | `docker-compose.yml` | `docker-compose.prod.yml` |
| Proxy/TLS | service `proxy` trong Docker | Caddy systemd **trên host** |
| `web` | không publish port | publish `127.0.0.1:3001` |
| Dùng khi | máy/VM riêng cho dự án | VM dùng chung với app khác |

**Mode A** ([docs/18 §4](docs/18-TRIEN-KHAI-VAN-HANH.md#4-mode-a--compose-4-service-máyvm-riêng)):

```bash
cp .env.example .env             # điền secrets thật; SITE_ADDRESS=<domain> để tự động TLS
docker compose up -d --build
docker compose run --rm web node scripts/migrate.mjs    # migration là lệnh RIÊNG, không tự chạy
docker compose run --rm web node scripts/create-admin.mjs admin@fpt.com 'MatKhauManh!123'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/api/v1/counters    # → 200
```

**Mode B** ([docs/18 §3](docs/18-TRIEN-KHAI-VAN-HANH.md#3-mode-b--deploy-production-thực-tế-từng-bước)) — sau khi đã cài Docker, clone `/opt/khu_pho`, tạo `.env`, trỏ DNS và nối Caddy host:

```bash
cd /opt/khu_pho
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec -T web node scripts/migrate.mjs
docker compose -f docker-compose.prod.yml exec -T web node scripts/create-admin.mjs admin@fpt.com 'MatKhauManh!123'

curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/v1/counters   # → 200
curl -s -o /dev/null -w '%{http_code}\n' https://khupho.ailab.city               # → 200
curl -sI https://khupho.ailab.city | grep -i content-security-policy             # phải có frame-src YouTube
```

> Security header là **một nguồn duy nhất**: [`deploy/khupho-headers.caddy`](deploy/khupho-headers.caddy)
> — cả hai mode đều `import` đúng file đó, và CI tự đồng bộ nó sang host mỗi lần deploy (job
> `sync-headers`). Đừng chép khối `header{...}` ra file host: sửa CSP trong repo sẽ không có tác
> dụng trên production — đúng lỗi đã làm iframe TVC bị chặn suốt một thời gian.
> Wiring cần **đủ cả hai** dòng import (xem [docs/18 §3 B5.3](docs/18-TRIEN-KHAI-VAN-HANH.md#b5-caddy-trên-host--security-header-một-lần)); thiếu một vế là trạng thái nửa vời và CI sẽ fail.

Deploy các lần sau: **push lên `main`** → CI tự pull + rebuild + migrate + healthcheck (~1 phút).
Làm tay hoặc rollback: [docs/18 §5](docs/18-TRIEN-KHAI-VAN-HANH.md#5-deploy-các-lần-sau) và [§7](docs/18-TRIEN-KHAI-VAN-HANH.md#7-rollback).

## 6. Vận hành nhanh

Đầy đủ (log, cron backup, restore, theo dõi sức khoẻ): [docs/18 §8–§9](docs/18-TRIEN-KHAI-VAN-HANH.md#8-vận-hành-hằng-ngày).

```bash
F=docker-compose.prod.yml   # (bỏ "-f $F" nếu dùng mode 4-service)

docker compose -f $F ps                               # trạng thái + healthcheck
docker compose -f $F logs -f --tail=200 web           # log app
docker compose -f $F exec db psql -U khupho khupho    # vào Postgres

# Backup DB (db không publish port — backup qua exec)
docker compose -f $F exec -T db pg_dump -U khupho khupho | gzip > backup-$(date +%F).sql.gz
# Restore
gunzip -c backup-YYYY-MM-DD.sql.gz | docker compose -f $F exec -T db psql -U khupho khupho
```

⚠️ Backup DB **vô dụng nếu mất `PHONE_PEPPER`** — cất 2 khoá trong `.env` ở nơi khác, tách khỏi dump DB.

## 7. Troubleshooting

Bảng đầy đủ: [docs/18 §10](docs/18-TRIEN-KHAI-VAN-HANH.md#10-sự-cố-thường-gặp). Vài lỗi hay gặp nhất:

| Triệu chứng | Xử lý |
|---|---|
| Build fail ở native deps (sharp/argon2/esbuild) | Dockerfile ghim `pnpm@9` có chủ đích — đừng nâng pnpm nếu chưa nâng lockfile |
| Deploy fail ở bước "Ensure .env" | `/opt/khu_pho/.env` thiếu hoặc `PHONE_PEPPER` rỗng — chốt chặn cố ý, khôi phục từ backup, **đừng sinh pepper mới** |
| 502 từ Caddy host | `web` chưa lên hoặc lệch port — kiểm `curl 127.0.0.1:3001/api/v1/counters` |
| Video TVC ra ô xám "This content is blocked" | CSP host thiếu `frame-src youtube-nocookie` — host nối Caddy nửa vời |
| Người dùng mất hết tài khoản sau deploy | `PHONE_PEPPER` đã bị thay — khôi phục pepper cũ là dữ liệu trở lại |

## 8. Quy tắc khi sửa code (tóm tắt — chi tiết ở `CLAUDE.md` + `docs/CLAUDE.md`)

- Mọi ghi điểm qua `src/lib/score-service.ts`; side-effects "treo biển" ở `applyInstalledSideEffects` (trong transaction PATCH `/api/admin/suggestions/[id]`).
- Copy tiếng Việt NGUYÊN VĂN ở `src/lib/copy.ts` (từ docs/06 §2) — không tự sửa lời.
- `pnpm test` phải pass trước khi merge (3 test case điểm docs/05 §4).
- Scripts trong `scripts/` giữ là `.mjs` thuần (không TS) để chạy trong image production.
