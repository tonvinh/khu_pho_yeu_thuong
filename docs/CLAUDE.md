# CLAUDE.md — Chỉ dẫn cho Claude Code
Dự án: Website "Khu Phố Của Tôi" · Chiến dịch "Khu phố biết thương" · FPT Telecom

## Đọc tài liệu theo thứ tự
1. `01-PRD.md` — mục tiêu, phạm vi, nguyên tắc không thoả hiệp
2. `02-FUNCTIONAL-SPEC.md` — từng màn hình & flow (nguồn sự thật về hành vi)
3. `03-DATA-MODEL.md` — schema, state machines, API (nguồn sự thật về dữ liệu)
4. `04-ADMIN-SPEC.md` — trang quản trị
5. `05-SCORING-RULES.md` — công thức điểm (KHÔNG tự chế trọng số; có test case §4)
6. `06-CONTENT-COPY.md` — copy dùng NGUYÊN VĂN, luật 4N, seed data
7. `07-NFR-TECH.md` — stack, NFR, câu hỏi mở + giả định mặc định

## Nguồn sự thật về UI
Hai file design (đã có sẵn HTML tham chiếu):
- Người dùng: `Khu Pho Yeu Thuong.dc.html`
- Admin: `Admin Khu Pho.dc.html`
Bám sát bố cục, màu (nền kem, đỏ gạch primary, cam/xanh lá/xanh dương theo trạng thái), giọng copy. Nếu spec và design mâu thuẫn về UI → theo design; về logic/dữ liệu → theo spec, ghi chú lại mâu thuẫn.

## Quy tắc cứng (không được vi phạm)
1. Không nội dung nào hiển thị công khai trước khi admin duyệt (đề xuất & câu nhắc).
2. **KHÔNG có chấm 4N tự động** (Q2): 4N là checklist admin tick thủ công khi duyệt (đủ 4 ô mới duyệt được); client chỉ giới hạn 120 ký tự. Mọi ràng buộc bình chọn/điểm validate **server-side**.
3. **Định danh KHÔNG dùng OTP**: SĐT → `HMAC-SHA256 + PEPPER` = khoá tài khoản; session cookie HttpOnly/Secure/SameSite=Lax; 1 SĐT = 1 tài khoản = 1 phiếu/câu; cấm tự thương; lọc gian lận lặng lẽ (không báo user).
3b. **Bảo mật SĐT là ưu tiên cao nhất**: SĐT gốc không bao giờ ở cookie/client/URL/log/response; chỉ lưu server-side mã hoá AES-256-GCM khi có mục đích duy nhất là lead opt-in; PEPPER và khoá AES lấy từ biến môi trường/secret manager, tách nhau; CSRF cho mọi POST; server đối chiếu hash SĐT nhập lại với định danh cookie (02 §8.3); admin đăng nhập riêng bằng **email (bắt buộc đuôi @fpt.com, validate server-side) + mật khẩu Argon2id**, 2FA TOTP khuyến nghị, bảng `admin_users` + cookie `kp_admin_session` tách hoàn toàn khỏi hệ định danh SĐT public.
4. Điểm ghi bằng sổ cái append-only `score_events`; trần 3 đề xuất/tuần (ISO week); test case điểm ở 05 §4 phải pass.
5. Lead chỉ ghi vào danh sách sale khi `opted_in = true`; checkbox mặc định KHÔNG tick; SĐT "báo tin vui" không opt-in không vào danh sách lead.
6. Copy tiếng Việt lấy nguyên văn từ 06-CONTENT-COPY §2.
7. `/admin` chặn index; chỉ admin (Q7: không có gov_viewer). Đăng nhập admin: email đuôi **@fpt.com** (regex server-side) + mật khẩu ≥12 ký tự hash Argon2id; khoá 15 phút sau 5 lần sai; lỗi chung không lộ email tồn tại; TOTP khuyến nghị; session admin riêng (SameSite=Strict, TTL 8h).
8. **Không có SMS** trong toàn hệ thống (Q1) — báo tin vui qua bảng `notifications` + banner in-web.
9. Domain: site chạy ở **MỘT trong hai** — `khupho.fpt.vn` **hoặc** `fpt.vn/khu-pho-de-thuong` (chưa chốt phương án nào). Vì vậy cấu hình Next.js `basePath` bằng biến môi trường, mọi URL/asset/OG qua helper, không hard-code đường dẫn gốc — đổi phương án chỉ là đổi 1 biến env.
10. Bản đồ (Q3): ảnh gốc chỉ admin thấy; public luôn là bản cách điệu; pin dùng toạ độ % để không phụ thuộc kích thước ảnh.
11. **Toàn bộ infra dùng Docker** (07-NFR-TECH §2.2): 1 file `docker-compose.yml` với 4 service — `web` (Next.js multi-stage, non-root), `db` (postgres:16-alpine, không expose port ngoài), `storage` (MinIO cho ảnh), `proxy` (Caddy/nginx — service duy nhất mở port, lo TLS + security headers). Secrets qua `.env` không commit (kèm `.env.example`); healthcheck mọi service; migration là lệnh riêng, không tự chạy khi container start.

## Quyết định đã chốt
Tất cả 8 câu hỏi mở đã được chốt — xem bảng 07-NFR-TECH §4. Không còn giả định treo; nếu phát sinh mơ hồ mới, ghi chú ASSUMPTION trong code + báo lại PM.

## Definition of Done cho MVP
- Chạy được luồng end-to-end: đề xuất → duyệt → viết câu → thương (định danh SĐT + cookie) → admin duyệt với checklist 4N → chọn câu → installed → pin xanh + counter + điểm +30 + banner báo tin vui in-web.
- Bulk import 20 khu phố từ `import-template.xlsx` chạy trọn trong 1 lần (validate → preview → commit all-or-nothing).
- Upload ảnh bản đồ → hiển thị bản cách điệu + đặt pin bằng click hoạt động; bấm pin hiện ảnh thật địa điểm.
- Share URL + OG image render đúng cho Đại sứ / biển đã treo / chứng nhận khu phố (test preview Facebook & Zalo debugger).
- `docker compose up -d` từ máy sạch (chỉ cần Docker + file `.env`) dựng được toàn bộ hệ thống chạy end-to-end; không service nào ngoài `proxy` mở port ra ngoài.
- Seed data theo 06 §5 tái hiện đúng các màn hình trong design.
- 3 test case điểm (05 §4) pass. Test 4N với fixtures 06 §3.3 pass.
- Mobile 360px không vỡ layout; LCP trang chủ < 2.5s.
