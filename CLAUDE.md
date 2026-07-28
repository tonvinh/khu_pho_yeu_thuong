# CLAUDE.md — repo Khu Phố Của Tôi

**Đọc `docs/CLAUDE.md` trước** — đó là nguồn quy tắc cứng (4N thủ công, không OTP, không SMS,
bảo mật SĐT, Docker 4 service...). File này chỉ bổ sung thông tin triển khai thực tế.

## Lệnh

- `pnpm dev` · `pnpm build` · `pnpm test` (3 test case điểm 05 §4 phải pass)
- `pnpm migrate` / `pnpm seed` / `pnpm create-admin <email@fpt.com> <pass> [--totp]`
- Docker: `docker compose up -d --build` rồi `docker compose run --rm web node scripts/migrate.mjs`

## Điểm cần biết khi sửa code

- Mọi ghi điểm đi qua `src/lib/score-service.ts` (trần 3 đề xuất/tuần, shadow-ban → is_valid=false).
- Side-effects "installed" (issue→signed, +30đ, notification in-web) nằm ở `applyInstalledSideEffects` — gọi trong transaction PATCH /api/admin/suggestions/[id].
- CSRF double-submit: cookie `kp_csrf` + header `x-csrf-token` — client dùng helper `src/components/client-api.ts`.
- Copy tiếng Việt NGUYÊN VĂN ở `src/lib/copy.ts` (từ docs/06 §2) — không sửa lời.
- Ảnh: MinIO key `public/...` (route stream `/api/img/[...key]`) vs `private/...` (chỉ admin — ảnh bản đồ gốc Q3).
- ASSUMPTION đã ghi chú trong code: SĐT mã hoá AES gắn ở bảng `sessions` để tạo lead tầng 1
  không hỏi lại SĐT (hash một chiều không khôi phục được) — xem db/migrations/001_init.sql.
- Seed ưu tiên đúng CÔNG THỨC điểm; vài con số hiển thị trong design (52 thương của Bà Liên)
  mâu thuẫn công thức nên seed dùng số khớp điểm (45 thương → 82đ).
- Node scripts trong `scripts/` là .mjs thuần (không TS) để chạy được trong image production.
