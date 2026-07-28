# Yêu cầu phi chức năng, Tech stack đề xuất & Câu hỏi mở
Phiên bản 1.0

---

## 1. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
|------|---------|
| Thiết bị | **Mobile-first** (đa số truy cập từ QR trên biển/MXH). Hỗ trợ từ 360px. Desktop responsive. |
| Hiệu năng | LCP < 2.5s trên 4G; trang chủ SSR/SSG; ảnh lazy-load, WebP. |
| Realtime | Bộ đếm/lượt thương cập nhật ≤ 30s (polling hoặc SSE — không cần WebSocket cho MVP). |
| Bảo mật (ƯU TIÊN CAO) | Xem §2.1 — mô hình định danh SĐT băm + cookie, không OTP. Session cookie HttpOnly/Secure/SameSite=Lax; CSRF double-submit; rate limit mọi POST và tạo định danh; validate server-side toàn bộ; chặn tự thương ở server; SĐT gốc mã hoá AES-256-GCM, không bao giờ xuất hiện ở client/log/URL. |
| Riêng tư (PDPD — Nghị định 13/2023) | SĐT chỉ dùng đúng mục đích đã ghi; leads chỉ ghi khi opt-in; che SĐT trên admin, log truy cập/ export; có trang chính sách dữ liệu; cho phép yêu cầu xoá dữ liệu qua hotline. |
| Kiểm duyệt | Không nội dung nào hiển thị công khai trước khi admin duyệt (đề xuất & câu nhắc). |
| Accessibility | Cỡ chữ tối thiểu 16px (người lớn tuổi dùng nhiều), contrast AA, nút chạm ≥ 44px. |
| SEO/Share | OG image theo khu phố (khoe chứng nhận/biển mới) — quan trọng cho lan toả MXH. `/admin` noindex. |
| Ngôn ngữ | Tiếng Việt duy nhất. |

## 2. Tech stack đề xuất (cho Claude Code)

| Lớp | Đề xuất | Lý do |
|-----|---------|-------|
| Frontend | **Next.js 14+ (App Router) + TailwindCSS** | SSR cho SEO/tốc độ, 1 codebase cho public + admin |
| Backend | Next.js API routes (hoặc tách NestJS nếu đội backend FPT yêu cầu) | MVP gọn, deploy 1 nơi |
| DB | **PostgreSQL** (Supabase hoặc RDS nội bộ FPT) | Quan hệ rõ, sổ cái điểm, unique constraints chống gian lận |
| Auth | Định danh SĐT băm (HMAC-SHA256 + pepper) + session cookie server-side | Không OTP — quyết định PM; chi tiết 02 §8, bảo mật §2.1 |
| Realtime | Polling 15–30s (MVP) → SSE nếu cần | Đơn giản, đủ dùng |
| Bản đồ | Ảnh upload + lớp filter cách điệu (CSS/SVG duotone) + pins toạ độ % | Đã chốt Q3 |
| Ảnh | Upload lên object storage (S3-compatible của FPT), resize/WebP tự động | Bản đồ, ảnh địa điểm, ảnh biển |
| OG image | Route render ảnh động (@vercel/og hoặc satori + resvg) | Phục vụ share MXH (Q8) |
| Deploy | **Toàn bộ infra chạy Docker** trên hạ tầng FPT · domain: **một trong hai** — `khupho.fpt.vn` **hoặc** `fpt.vn/khu-pho-de-thuong` (chốt phương án sau) | Đã chốt — chi tiết §2.2. `basePath` cấu hình bằng biến env (`''` cho subdomain, `'/khu-pho-de-thuong'` cho path); mọi link/asset/OG qua helper URL, không hard-code |
| Font/màu | Theo design file `Khu Pho Yeu Thuong.dc.html`: nền kem, đỏ gạch (primary), cam, xanh lá, xanh dương; heading dạng chữ nét thanh đậm | Design là nguồn sự thật về UI |

## 2.1 Kiến trúc bảo mật định danh (ƯU TIÊN CAO — không OTP)

### Nguyên tắc lõi
1. **SĐT gốc là dữ liệu nhạy cảm nhất của hệ thống.** Nó chỉ tồn tại: (a) trong request POST /auth/identify hoặc /leads qua HTTPS, (b) server-side dạng mã hoá AES-256-GCM khi có mục đích rõ. Không bao giờ ở cookie, localStorage, URL, log, response API, hay mã nguồn client.
2. **Định danh = băm, liên hệ = mã hoá.** Hai nhu cầu, hai cơ chế, hai khoá tách biệt:
   - Định danh: `phone_hash = HMAC-SHA256(phone_chuẩn_hoá, PEPPER)` — một chiều, dùng làm khoá tài khoản và mọi ràng buộc (unique vote, trần tuần). HMAC + pepper (không phải SHA thuần) vì không gian SĐT VN nhỏ (~10^9), SHA thuần bị dò ngược bằng brute-force trong vài phút nếu lộ DB.
   - Liên hệ: `phone_encrypted` AES-256-GCM với khoá riêng — chỉ giải mã tại module xuất lead, có log truy cập.
3. **Cookie chứa session token ngẫu nhiên, KHÔNG chứa hash SĐT.** Nếu cookie mang trực tiếp phone_hash: bị đánh cắp là chiếm tài khoản vĩnh viễn, không thu hồi được. Session token thì thu hồi được (revoked), có TTL, gia hạn theo hoạt động. DB chỉ lưu `SHA-256(token)` — lộ DB không tái tạo được cookie.
4. **Quản lý khoá:** PEPPER và khoá AES nằm ở secret manager/biến môi trường, không hard-code, không cùng nơi với DB backup. Có kế hoạch xoay khoá AES (re-encrypt batch); PEPPER không xoay được giữa chừng (đổi = mất liên kết tài khoản) → chọn ngẫu nhiên ≥256-bit ngay từ đầu và bảo vệ nghiêm ngặt.

### Đăng nhập admin (tách biệt hoàn toàn với public)
- **Email + mật khẩu; email bắt buộc đuôi @fpt.com** — validate server-side (regex đầy đủ), không chỉ dựa client. Mật khẩu ≥12 ký tự, hash **Argon2id**.
- Chống dò: khoá 15 phút sau 5 lần sai; thông báo lỗi chung không tiết lộ email tồn tại; rate limit theo IP.
- **2FA TOTP khuyến nghị** (mã 6 số từ app authenticator, đổi mỗi 30s): chặn chiếm quyền khi mật khẩu bị lộ — chi phí triển khai thấp (thư viện otplib/pyotp), kèm 10 mã dự phòng.
- Cookie admin riêng `kp_admin_session` (SameSite=Strict, TTL 8h); tài khoản do super-admin cấp, không tự đăng ký; vô hiệu hoá tức thì.
- Lưu ý: đuôi @fpt.com là kiểm soát **định danh nội bộ**, không phải xác thực — bảo mật thật nằm ở mật khẩu mạnh + Argon2id + TOTP + khoá tài khoản.

### Kiểm soát request (server-side, mọi hành động ghi)
- Cookie session hợp lệ, chưa revoked, chưa hết hạn → nếu không: 401.
- **CSRF double-submit token** cho mọi POST/PATCH (bắt buộc vì auth dựa cookie).
- Request có kèm SĐT (form lead): băm và đối chiếu với phone_hash của session — lệch → luồng xác nhận chuyển định danh (02 §8.3), không bao giờ ghi dữ liệu chéo tài khoản.
- Rate limit: 3 định danh mới/thiết bị+IP/giờ; 30 hành động ghi/user/giờ; captcha khi vượt.

### Vận hành & tuân thủ (PDPD — NĐ 13/2023)
- Admin xem SĐT: mặc định che `090***123`, bấm-để-hiện có ghi log (ai, khi nào, bản ghi nào); export CSV có log.
- Log ứng dụng: filter tự động mọi pattern giống SĐT trước khi ghi.
- Không có kênh SMS nào trong hệ thống (Q1) — giảm hẳn một bề mặt rò rỉ SĐT.
- Trang chính sách dữ liệu nêu rõ: SĐT dùng để định danh (dạng băm) + liên hệ đúng mục đích đã đồng ý; kênh yêu cầu xoá dữ liệu (hotline 1900 6600) — xoá = xoá phone_encrypted + revoke sessions, giữ phone_hash ẩn danh để bảo toàn tính toàn vẹn điểm/phiếu.
- HTTPS toàn trang (HSTS); security headers (CSP, X-Frame-Options, Referrer-Policy no-referrer).

### Rủi ro tồn dư (chấp nhận có chủ đích — cần stakeholder xác nhận)
| Rủi ro | Mức | Vì sao chấp nhận / giảm nhẹ |
|--------|-----|------------------------------|
| Mạo danh: nhập SĐT người khác để thao tác thay họ | Trung bình | Không có tài sản tài chính; thiệt hại tối đa là điểm gamification. Giảm nhẹ: hotline gỡ tranh chấp, admin có thể revoke + tách tài khoản |
| Tạo nhiều tài khoản bằng số ảo để bơm phiếu | Trung bình–cao | Rate limit định danh, chặn dải số ảo, heuristics cụm ip_hash/ua_hash → vô hiệu phiếu lặng lẽ; giải Đại sứ được admin rà sổ cái trước khi trao |
| Lead giả (điền SĐT người khác vào form ưu đãi) | Trung bình | Sale gọi xác nhận trước khi tư vấn; nút báo "không phải tôi đăng ký" trong quy trình sale |

## 2.2 Kiến trúc Docker (đã chốt — toàn bộ infra dùng Docker)

**Một `docker-compose.yml` chạy được toàn hệ thống**, dùng chung cho dev và production (khác nhau bằng file env + compose override).

| Service | Image | Vai trò | Ghi chú |
|---------|-------|---------|---------|
| `web` | Build từ `Dockerfile` (Next.js, multi-stage) | App public + admin + API | Multi-stage: builder → runner `node:20-alpine`, output standalone, chạy user non-root, image cuối < 300MB |
| `db` | `postgres:16-alpine` | PostgreSQL | Volume named cho data; KHÔNG expose port ra ngoài host ở production (chỉ mạng nội bộ compose) |
| `storage` | `minio/minio` | Object storage S3-compatible | Ảnh bản đồ, ảnh địa điểm, ảnh biển; volume riêng; bucket private, web truy cập qua presigned URL |
| `proxy` | `caddy` (hoặc `nginx`) | Reverse proxy + TLS | HTTPS/HSTS, security headers (CSP, X-Frame-Options...), gzip; là service DUY NHẤT mở port ra ngoài |

**Quy tắc vận hành Docker:**
- **Secrets** (PEPPER, khoá AES, DB password, MinIO keys) qua biến môi trường từ file `.env` KHÔNG commit (có `.env.example` đủ biến, giá trị giả) hoặc Docker secrets — tuyệt đối không nướng secret vào image.
- **Healthcheck** cho từng service; `web` depends_on `db` + `storage` với `condition: service_healthy`.
- **Migration DB** chạy như một bước riêng (`docker compose run web npm run migrate`), không tự chạy ngầm lúc container khởi động ở production.
- **Backup**: volume Postgres dump định kỳ (cron trên host hoặc sidecar container), lưu ngoài máy chạy.
- **Log** ra stdout/stderr theo chuẩn container (không ghi file trong container); filter pattern SĐT trước khi log (§2.1) áp dụng ở tầng ứng dụng.
- Mạng: `db` và `storage` chỉ ở internal network; chỉ `proxy` publish port 80/443.
- CI build image có tag theo git SHA; deploy = kéo image mới + `docker compose up -d` (zero-downtime không bắt buộc cho MVP).

## 3. Kế hoạch triển khai gợi ý (4 tuần)

| Tuần | Nội dung |
|------|----------|
| 1 | Setup dự án **+ docker-compose đủ 4 service chạy được ngay** (web, db, storage, proxy), DB schema + migration, định danh SĐT băm + session cookie + CSRF, trang chủ tĩnh theo design + seed data |
| 2 | Luồng đề xuất → viết câu → thương (đủ state machine), bộ lọc 4N rule-based |
| 3 | Trang Admin đầy đủ, hệ thống điểm + leaderboard, lead 2 tầng |
| 4 | Chứng nhận khu phố, chống gian lận, share MXH + OG image, bulk import 20 khu phố pilot, QA + test theo fixtures 05/06, soft-launch |

## 4. Quyết định đã chốt (PM, 07/2026) — KHÔNG còn là câu hỏi mở

| # | Vấn đề | Quyết định |
|---|--------|-----------|
| Q1 | SMS "báo tin vui" | **Không làm SMS.** Báo tin vui bằng thông báo in-web (banner khi khách quay lại, cookie nhận diện) — 02 §7.1, bảng notifications 03 |
| Q2 | Chấm 4N | **Người duyệt trực tiếp.** Không có engine chấm tự động; admin tick checklist 4N khi duyệt (04 §3); client chỉ giới hạn 120 ký tự |
| Q3 | Bản đồ | **Upload 1 ảnh bản đồ → tự động cách điệu** (filter duotone theo bảng màu chiến dịch); admin click đặt pin; bấm pin hiển thị **ảnh thật địa điểm** + thông tin (02 §1, 04 §10) |
| Q4 | Lead | **Export CSV thủ công** có log |
| Q5 | Hosting/domain | Hạ tầng FPT; domain là **một trong hai**: **khupho.fpt.vn** hoặc **fpt.vn/khu-pho-de-thuong** (phương án cuối chốt trước go-live). Code hỗ trợ `basePath` qua biến env để chuyển giữa hai phương án không cần sửa code |
| Q6 | Pilot | **20 khu phố đầu tiên**, import 1 lần bằng Excel template `import-template.xlsx` qua trình bulk import (04 §11) |
| Q7 | Chính quyền | **Không có tài khoản gov_viewer trong MVP** — báo cáo offline (export từ admin) |
| Q8 | Vinh danh Đại sứ | **Leaderboard + chức năng share MXH** (URL công khai + OG image động, Facebook/Zalo) — 02 §11. Chưa hiển thị giải thưởng hiện vật |
