# Khu Phố Của Tôi

Website hub chiến dịch **"Khu phố biết thương"** — FPT Telecom.
Toàn bộ đặc tả trong `docs/` (đọc `docs/CLAUDE.md` để biết thứ tự).

## Stack

Next.js 15 (App Router) · TailwindCSS 4 · PostgreSQL 16 · MinIO · Caddy · Docker.

- **Định danh không OTP**: SĐT → HMAC-SHA256+PEPPER, session cookie `kp_session` (HttpOnly/Secure/Lax, 180 ngày). SĐT gốc không bao giờ ở client/URL/log; chỉ mã hoá AES-256-GCM server-side khi lead opt-in.
- **Admin tách riêng**: email @fpt.com + Argon2id, khoá 5 lần sai, TOTP tuỳ chọn, cookie `kp_admin_session` (Strict, 8h).
- **Điểm**: sổ cái append-only `score_events` — 2×đề xuất + 5×câu 4N + 1×thương + 30×treo; trần 3 đề xuất/tuần ISO.
- **4N**: KHÔNG chấm tự động — admin tick 4 ô khi duyệt (server chặn nếu thiếu).
- **Bản đồ**: admin upload ảnh → sharp tự cách điệu (duotone kem–đỏ gạch) → public chỉ thấy bản cách điệu; pin theo toạ độ %.
- **basePath** cấu hình bằng env `BASE_PATH` (Q5 — đổi domain chỉ đổi env).

## Chạy dev

```bash
cp .env.example .env          # điền PHONE_PEPPER, PHONE_AES_KEY (openssl rand)
# Postgres + MinIO local (hoặc dùng docker compose)
pnpm install
pnpm migrate                  # tạo schema
pnpm seed                     # dữ liệu demo (admin: admin@fpt.com / KhuPho@2026!Demo)
pnpm dev                      # http://localhost:3000 · admin: /admin
```

## Chạy production (Docker — 4 service, chỉ proxy mở port)

```bash
cp .env.example .env          # điền secrets thật
docker compose up -d --build
docker compose run --rm web node scripts/migrate.mjs   # migration là lệnh riêng
docker compose run --rm web node scripts/seed.mjs      # (tuỳ chọn) seed demo
```

## Lệnh khác

```bash
pnpm test                     # 3 test case điểm 05 §4 + 4N + phone (bắt buộc pass)
pnpm build                    # build + typecheck
pnpm create-admin <email@fpt.com> <mật_khẩu_≥12_ký_tự> [--totp]
```

## Cấu trúc

```
db/migrations/       schema SQL (chạy bằng scripts/migrate.mjs)
scripts/             migrate, seed, create-admin (node thuần — chạy được trong container)
src/lib/             crypto, phone, session, csrf, scoring, storage, stylize, ...
src/app/api/v1/      API public + cư dân (03-DATA-MODEL §4)
src/app/api/admin/   API admin (duyệt, biển, leads, import, fraud)
src/app/             trang chủ, share (/dai-su /bien /khu-pho + OG động), admin UI
deploy/Caddyfile     proxy + TLS + security headers
```
