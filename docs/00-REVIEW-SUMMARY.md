# 00 — TÓM TẮT KIỂM DUYỆT LẦN CUỐI
Dự án: Website "Khu Phố Của Tôi" · Chiến dịch "Khu phố biết thương" · FPT Telecom
Phiên bản tài liệu: **1.0-RC (chờ ký duyệt)** · Ngày: 17/07/2026 · Soạn: Product Manager Website

> Cập nhật: 8/9/2026 — bộ tài liệu đã được đồng bộ lại với code sau các đợt 18/8, 2–4/9, 7/9.
> Nhật ký đồng bộ + danh sách câu hỏi còn treo: [`25-DONG-BO-TAI-LIEU-08-09.md`](25-DONG-BO-TAI-LIEU-08-09.md).
> Hai quyết định làm lệch đặc tả gốc nhiều nhất: **bỏ bản đồ khỏi trang chủ** (1/8) và
> **DESIGN THẮNG SPEC** (2/9) — xem [`20`](20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md) §2.

---

## 1. Bộ tài liệu (9 file + 1 template)

| File | Nội dung | Trạng thái |
|------|----------|-----------|
| 01-PRD.md | Mục tiêu, personas, phạm vi MVP, KPI, nguyên tắc | ✅ Hoàn chỉnh |
| 02-FUNCTIONAL-SPEC.md | Đặc tả từng màn hình & flow (~~bản đồ~~ → slider khu phố, câu nhắc, lead, định danh, share) | ✅ Hoàn chỉnh · đã đối chiếu code 8/9 |
| 03-DATA-MODEL.md | Schema DB, state machines, API, chống gian lận | ✅ Hoàn chỉnh |
| 04-ADMIN-SPEC.md | Trang quản trị: duyệt, biển, lead, ~~bản đồ~~ → khu phố/slot/xoá mềm, import file, nội dung, theo dõi thương, đăng nhập | ✅ Hoàn chỉnh · đã đối chiếu code 8/9 |
| 05-SCORING-RULES.md | Công thức điểm Đại sứ (nguồn xlsx đã duyệt) + test case | ⚠️ Có 1 điểm lệch cần ký lại (mục 3) |
| 06-CONTENT-COPY.md | Copy chuẩn, định nghĩa 4N cho người duyệt, seed data | ✅ Hoàn chỉnh |
| 07-NFR-TECH.md | Bảo mật, kiến trúc Docker, stack, quyết định đã chốt | ✅ Hoàn chỉnh |
| CLAUDE.md | Quy tắc cứng + Definition of Done cho Claude Code | ✅ Hoàn chỉnh |
| ~~import-template.xlsx~~ | Template 2 sheet của đặc tả gốc — **không dùng**: mỗi màn admin tự sinh template riêng (3 cột cho khu phố, 5 cột cho lời nhắc) | ⚠️ Đã thay |

~~Design tham chiếu UI: `Khu Pho Yeu Thuong.dc.html` (public) · `Admin Khu Pho.dc.html` (admin) tại claude.ai/design.~~

**Nguồn sự thật về giao diện từ 4/9: `docs/lp/LandingpageFCM.fig`** trong repo (frame chuẩn
`7217:1990`, đọc bằng bộ giải mã `scripts/figma/`). Hai file `.dc.html` nêu trên **không có trong
repo**; bản prototype kem `KhuPhoCuaToi-prototype-v4.html` chỉ còn giá trị lịch sử.
Cách đọc + bẫy: [`16-FRONTEND-UI.md`](16-FRONTEND-UI.md) đầu file.

## 2. Nhật ký quyết định đã chốt

| # | Quyết định | Tài liệu phản ánh |
|---|-----------|-------------------|
| D1 | **Không OTP.** Định danh: SĐT → HMAC-SHA256 + PEPPER; cookie phiên token ngẫu nhiên (HttpOnly/Secure/SameSite=Lax); server đối chiếu cookie ↔ SĐT nhập lại | 02 §8 · 03 (users, sessions) · 07 §2.1 |
| D2 | **Bảo mật ưu tiên cao:** SĐT gốc không bao giờ ở client/URL/log; mã hoá AES-256-GCM chỉ khi lead opt-in; CSRF mọi POST; PDPD NĐ13 | 07 §2.1 · CLAUDE.md quy tắc 3b |
| D3 | **Không SMS (Q1).** Báo tin vui = thông báo in-web (banner khi quay lại) | 02 §7.1 · 03 (notifications) |
| D4 | **Duyệt 4N thủ công (Q2).** Admin tick đủ 4 ô mới duyệt; không engine chấm tự động; client chỉ giới hạn 120 ký tự | 04 §3 · 06 §3 |
| D5 | ~~**Bản đồ (Q3):** upload 1 ảnh → tự động cách điệu; admin click đặt pin~~ → **ĐÃ GỠ khỏi sản phẩm 1/8**, thay bằng slider ảnh khu phố | 02 §1 · 04 §10 · `20` §1 |
| D6 | **Lead export CSV thủ công (Q4)**, có log | 04 §6 |
| D7 | **Domain (Q5):** ~~MỘT trong hai — khupho.fpt.vn HOẶC fpt.vn/khu-pho-de-thuong~~ → **chốt 8/9: `fpt.vn/khu-pho-biet-thuong`**; basePath qua biến env | 07 §2 · CLAUDE.md quy tắc 9 |
| D8 | **Pilot 20 khu phố (Q6):** bulk import 1 lần bằng import-template.xlsx (validate → preview → commit all-or-nothing) | 04 §11 |
| D9 | **Không gov_viewer (Q7):** chính quyền nhận báo cáo offline | 04 §9 |
| D10 | **Vinh danh (Q8):** leaderboard + share MXH (URL công khai + OG image động, FB/Zalo) | 02 §11 |
| D11 | **Admin login:** email + mật khẩu, email bắt buộc đuôi **@fpt.com** (validate server-side), Argon2id, khoá 5 lần sai, bảng & cookie tách riêng | 04 §0 · 03 (admin_users) · 07 §2.1 |
| D12 | **Toàn bộ infra Docker:** compose 4 service (web/db/storage/proxy); secrets qua .env; chỉ proxy mở port | 07 §2.2 · CLAUDE.md quy tắc 11 |

## 3. Điểm cần người duyệt quyết định / xác nhận

| # | Điểm | Đề xuất của PM |
|---|------|----------------|
| P1 | **2FA TOTP cho admin: giữ hay bỏ?** Spec đang để "khuyến nghị giữ" (totp_secret nullable — bật/tắt không đổi kiến trúc) | GIỮ — chi phí gần 0, chặn chiếm quyền khi lộ mật khẩu |
| P2 | **Điểm lệch so với xlsx điểm đã duyệt:** xlsx ghi "lượt thương từ tài khoản xác thực OTP"; hệ thống nay dùng định danh SĐT không OTP → mức chống bơm phiếu thấp hơn, bù bằng rate limit + heuristics lọc lặng lẽ | Ký xác nhận chấp nhận trade-off (đã ghi chú ngay trong 05-SCORING-RULES §3) |
| P3 | **Bảng rủi ro tồn dư** (07 §2.1 cuối): mạo danh SĐT, số ảo bơm phiếu, lead giả — kèm biện pháp giảm nhẹ | Xác nhận chấp nhận trước go-live |
| P4 | Chốt phương án domain cuối (D7) trước go-live | khupho.fpt.vn (gọn, dễ nhớ, QR đẹp) |

## 4. Checklist người kiểm duyệt

- [ ] Phạm vi MVP (01 §4) khớp ngân sách & timeline 4 tuần
- [ ] Luồng 4 bước + vòng đời nội dung (02 §9, 03 §3): không nội dung nào public trước khi duyệt
- [ ] Copy chuẩn (06 §2) đúng giọng chiến dịch, đặc biệt khối lead & cam kết riêng tư
- [ ] Công thức điểm + 3 test case (05 §1, §4) khớp xlsx gốc
- [ ] Kiến trúc bảo mật (07 §2.1): định danh, mã hoá, admin @fpt.com
- [ ] Quyết định P1–P4 ở mục 3
- [ ] Template import (import-template.xlsx) đủ trường cho dữ liệu 20 khu phố thực tế

## 5. Sau khi ký duyệt
1. Đóng băng phiên bản 1.0.
2. Đưa nguyên thư mục (kèm 2 file design HTML) vào repo, mở Claude Code — CLAUDE.md dẫn đường tự động.
3. Tuần 1 bắt đầu: docker-compose 4 service + schema + định danh + trang chủ tĩnh.
