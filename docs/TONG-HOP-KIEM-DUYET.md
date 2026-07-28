# BỘ TÀI LIỆU DỰ ÁN — WEBSITE "KHU PHỐ CỦA TÔI" (BẢN TỔNG HỢP KIỂM DUYỆT)
Phiên bản 1.0-RC · 17/07/2026 · Gồm 9 tài liệu, đọc liền mạch để kiểm duyệt lần cuối. File Excel `import-template.xlsx` đính kèm riêng.



---

<!-- ===== PHẦN 1/9: 00-REVIEW-SUMMARY.md ===== -->

# 📄 PHẦN 1: 00-REVIEW-SUMMARY.md

# 00 — TÓM TẮT KIỂM DUYỆT LẦN CUỐI
Dự án: Website "Khu Phố Của Tôi" · Chiến dịch "Khu phố biết thương" · FPT Telecom
Phiên bản tài liệu: **1.0-RC (chờ ký duyệt)** · Ngày: 17/07/2026 · Soạn: Product Manager Website

---

## 1. Bộ tài liệu (9 file + 1 template)

| File | Nội dung | Trạng thái |
|------|----------|-----------|
| 01-PRD.md | Mục tiêu, personas, phạm vi MVP, KPI, nguyên tắc | ✅ Hoàn chỉnh |
| 02-FUNCTIONAL-SPEC.md | Đặc tả từng màn hình & flow (bản đồ, câu nhắc, lead, định danh, share) | ✅ Hoàn chỉnh |
| 03-DATA-MODEL.md | Schema DB, state machines, API, chống gian lận | ✅ Hoàn chỉnh |
| 04-ADMIN-SPEC.md | Trang quản trị: duyệt, biển, lead, bản đồ, bulk import, đăng nhập | ✅ Hoàn chỉnh |
| 05-SCORING-RULES.md | Công thức điểm Đại sứ (nguồn xlsx đã duyệt) + test case | ⚠️ Có 1 điểm lệch cần ký lại (mục 3) |
| 06-CONTENT-COPY.md | Copy chuẩn, định nghĩa 4N cho người duyệt, seed data | ✅ Hoàn chỉnh |
| 07-NFR-TECH.md | Bảo mật, kiến trúc Docker, stack, quyết định đã chốt | ✅ Hoàn chỉnh |
| CLAUDE.md | Quy tắc cứng + Definition of Done cho Claude Code | ✅ Hoàn chỉnh |
| import-template.xlsx | Template import 20 khu phố pilot (3 sheet, có dropdown + validate) | ✅ Hoàn chỉnh |

Design tham chiếu UI (nguồn sự thật về giao diện):
`Khu Pho Yeu Thuong.dc.html` (public) · `Admin Khu Pho.dc.html` (admin) tại claude.ai/design.

## 2. Nhật ký quyết định đã chốt

| # | Quyết định | Tài liệu phản ánh |
|---|-----------|-------------------|
| D1 | **Không OTP.** Định danh: SĐT → HMAC-SHA256 + PEPPER; cookie phiên token ngẫu nhiên (HttpOnly/Secure/SameSite=Lax); server đối chiếu cookie ↔ SĐT nhập lại | 02 §8 · 03 (users, sessions) · 07 §2.1 |
| D2 | **Bảo mật ưu tiên cao:** SĐT gốc không bao giờ ở client/URL/log; mã hoá AES-256-GCM chỉ khi lead opt-in; CSRF mọi POST; PDPD NĐ13 | 07 §2.1 · CLAUDE.md quy tắc 3b |
| D3 | **Không SMS (Q1).** Báo tin vui = thông báo in-web (banner khi quay lại) | 02 §7.1 · 03 (notifications) |
| D4 | **Duyệt 4N thủ công (Q2).** Admin tick đủ 4 ô mới duyệt; không engine chấm tự động; client chỉ giới hạn 120 ký tự | 04 §3 · 06 §3 |
| D5 | **Bản đồ (Q3):** upload 1 ảnh → tự động cách điệu; admin click đặt pin; bấm pin hiện ảnh thật địa điểm | 02 §1 · 04 §10 |
| D6 | **Lead export CSV thủ công (Q4)**, có log | 04 §6 |
| D7 | **Domain (Q5):** MỘT trong hai — khupho.fpt.vn HOẶC fpt.vn/khu-pho-de-thuong; basePath qua biến env | 07 §2 · CLAUDE.md quy tắc 9 |
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



---

<!-- ===== PHẦN 2/9: 01-PRD.md ===== -->

# 📄 PHẦN 2: 01-PRD.md

# PRD — Website "Khu Phố Của Tôi"
Chiến dịch **"Khu phố biết thương"** · FPT Telecom
Phiên bản 1.0 · 17/07/2026 · Owner: Product Manager Website

---

## 1. Bối cảnh & Tầm nhìn

FPT Telecom triển khai chiến dịch treo biển nhắc nhở dễ thương ("câu nhắc") tại các ngõ/hẻm/xóm — nối tiếp hơn **10.000 lời nhắc** đã có mặt khắp ngõ hẻm Việt Nam. Website "Khu Phố Của Tôi" là **hub trung tâm của toàn chiến dịch**, biến mô hình từ *"FPT phát biển xuống cho dân"* thành *"dân cùng tạo ra khu phố của mình"*.

**Định vị:** Nền tảng để người dân, chính quyền và FPT cùng xây dựng những khu phố an toàn và đáng sống hơn, theo vòng lặp: **nêu vấn đề → viết câu nhắc → bình chọn → theo dõi kết quả**.

## 2. Mục tiêu kinh doanh (4 vai trò của website)

| # | Vai trò | Mô tả |
|---|---------|-------|
| 1 | **Xây dựng Brand Love** | Người dân là đồng tác giả câu nhắc → gắn bó cảm xúc sâu hơn nhiều so với biển phát sẵn |
| 2 | **Gamification giữ chân** | Bảng xếp hạng "Đại sứ khu phố", thi đua hoàn thiện "Khu phố biết thương" |
| 3 | **Dữ liệu cho chính quyền** | Bản đồ vấn đề do dân nêu = dữ liệu thật về điểm nóng, giá trị nghiệp vụ cho công an xã/phường |
| 4 | **Kênh core chuẩn 4N** | "Một cửa" để mọi hoạt động truyền thông (đại sứ, biệt đội treo biển, trend MXH) quy về |

**Một CTA duy nhất cho mọi hoạt động:** *"Lên Khu Phố Của Tôi, viết câu nhắc cho xóm mình."*

**Mục tiêu thương mại (thứ cấp, không phô trương):** thu lead Internet/Truyền hình/FPT Play/Camera qua 2 tầng opt-in tự nguyện (xem 02-FUNCTIONAL-SPEC §7).

## 3. Người dùng & Personas

| Persona | Mô tả | Nhu cầu chính |
|---------|-------|---------------|
| **Cư dân đóng góp** (Cô Tám tạp hoá, Anh Dũng, Minh lớp 11) | Người dân trong khu phố, mọi lứa tuổi, dùng điện thoại là chính | Nêu vấn đề khu mình, viết câu nhắc, bình chọn, khoe khi câu được treo |
| **Người xem thụ động** | Vào từ MXH/QR trên biển | Xem bản đồ, đọc câu hay, có thể để lại lead |
| **Admin FPT (vận hành)** | Đội chiến dịch FPT Telecom | Duyệt đề xuất, duyệt câu, quản lý sản xuất & treo biển, quản lý leads |
| **Chính quyền** | Công an xã/phường, tổ dân phố | Nhận báo cáo offline (export từ admin) — KHÔNG có tài khoản trong MVP (Q7) |

## 4. Phạm vi (Scope)

### 4.1 In scope — MVP (sprint 4 tuần)
1. **Trang chủ công khai** (mobile-first): hero + CTA, bản đồ khu phố (ảnh upload → cách điệu tự động), bộ đếm thời gian thực, danh sách vấn đề, bảng xếp hạng Đại sứ (kèm share MXH), section Ưu đãi cư dân.
2. **Luồng 4 bước**: Đề xuất vấn đề → Viết & bình chọn câu nhắc (chấm 4N tự động) → Duyệt nội dung (admin) → Lên biển & cập nhật.
3. **Định danh bằng SĐT băm + cookie phiên, KHÔNG dùng OTP** (1 SĐT = 1 tài khoản = 1 phiếu thương/câu; SĐT gốc chỉ lưu server-side dạng mã hoá — xem 02-FUNCTIONAL-SPEC §8).
4. **Hệ thống điểm & bảng xếp hạng** theo Quy định điểm Đại sứ (xem 05-SCORING-RULES).
5. **Thu lead 2 tầng** + trang quản lý lead cho admin.
6. **Trang Admin**: duyệt đề xuất, duyệt câu nhắc, cập nhật trạng thái biển, chứng nhận khu phố, quản lý lead, dashboard.
7. **Chứng nhận "Khu phố biết thương" chuẩn 4N** cho khu phố đạt 100% biển đã treo.
8. **Bulk import 20 khu phố pilot** trong 1 lần từ file Excel template (khu phố + vấn đề + ảnh + toạ độ pin).
9. **Chia sẻ mạng xã hội**: URL công khai + OG image động cho thành tích Đại sứ, biển đã treo, chứng nhận khu phố (Facebook/Zalo).

### 4.2 Out of scope (giai đoạn sau)
- App mobile native; đăng nhập MXH; đa ngôn ngữ; chat/bình luận tự do (rủi ro kiểm duyệt); tích hợp CRM tự động (đã chốt: export CSV thủ công); **SMS mọi loại** (đã chốt Q1: không SMS — báo tin vui bằng thông báo in-web khi khách quay lại); chấm 4N tự động (đã chốt Q2: người duyệt trực tiếp); tài khoản chính quyền `gov_viewer` (đã chốt Q7: không cần trong MVP).

## 5. KPI chiến dịch (đo trên website)

| Nhóm | Chỉ số | Ghi chú |
|------|--------|---------|
| Tham gia | Số khu phố tham gia, số người đóng góp, số đề xuất, số câu nhắc | Hiển thị công khai trên bộ đếm |
| Sản lượng | Số câu đạt 4N được duyệt, số biển đã treo | "Biển đã treo" là chỉ số đích |
| Chất lượng | Lượt thương/câu, tỉ lệ câu qua bộ lọc 4N | |
| Thương mại | Số lead opt-in tầng 1, tầng 2; tỉ lệ lead/người đóng góp | Không hiển thị công khai |

## 6. Nguyên tắc sản phẩm (không thoả hiệp)

1. **Chuẩn 4N** (Nhắc – Nhở – Nhỏ – Nhẹ): mọi câu lên biển phải trung lập, **không công kích, không nêu đích danh người/nhà nào**, gọi tên một việc tốt cụ thể.
2. **Minh bạch với chính quyền**: câu bình chọn cao nhất phải qua duyệt (bộ lọc 4N + đội chiến dịch, thông qua công an xã) trước khi lên biển thật.
3. **Lead là tự nguyện**: SĐT không bắt buộc, checkbox opt-in tách riêng, ghi rõ mục đích sử dụng; không tick vẫn được trân trọng như nhau.
4. **Chống gian lận lặng lẽ**: lọc phiếu bất thường không thông báo, không bêu tên.
5. **Giọng điệu**: ấm áp, "tình làng nghĩa xóm", xưng hô gần gũi ("xóm mình", "thương").

## 7. Tài liệu liên quan

| File | Nội dung |
|------|----------|
| 02-FUNCTIONAL-SPEC.md | Đặc tả chức năng từng màn hình, user flows |
| 03-DATA-MODEL.md | Mô hình dữ liệu, trạng thái, API |
| 04-ADMIN-SPEC.md | Đặc tả trang quản trị |
| 05-SCORING-RULES.md | Quy định điểm Đại sứ khu phố (nguồn: QuydinhdiemDaisukhupho.xlsx) |
| 06-CONTENT-COPY.md | Copy chuẩn, taxonomy loại vấn đề, quy tắc 4N |
| 07-NFR-TECH.md | Yêu cầu phi chức năng, đề xuất tech stack, câu hỏi mở |
| CLAUDE.md | Chỉ dẫn cho Claude Code khi triển khai |

**Design tham chiếu (nguồn sự thật về UI):**
- Trang người dùng: `https://claude.ai/design/p/510abc71-8520-4f78-a4f8-b0eaa3a10be9?file=Khu+Pho+Yeu+Thuong.dc.html&via=share`
- Trang Admin: `https://claude.ai/design/p/510abc71-8520-4f78-a4f8-b0eaa3a10be9?file=Admin+Khu+Pho.dc.html`



---

<!-- ===== PHẦN 3/9: 02-FUNCTIONAL-SPEC.md ===== -->

# 📄 PHẦN 3: 02-FUNCTIONAL-SPEC.md

# Đặc tả chức năng — Website "Khu Phố Của Tôi"
Phiên bản 1.0 · Tham chiếu design: `Khu Pho Yeu Thuong.dc.html`

---

## 0. Cấu trúc trang chủ (một trang, mobile-first)

Thứ tự section từ trên xuống:

1. **Header**: logo "Khu Phố Của Tôi" (icon trái tim), badge "Cùng xây khu phố biết thương".
2. **Hero**: tiêu đề *"Muốn gửi một lời thương cho xóm mình? Viết một câu nhắc nhỏ nhẹ."* + đoạn mô tả cơ chế (chọn góc xóm → cả xóm viết câu nhắc chuẩn 4N → bấm "thương" bình chọn → câu được thương nhiều nhất thành biển thật do FPT treo — nối tiếp hơn **10.000 lời nhắc**). 3 nút:
   - `+ Gửi lời nhắc cho xóm mình` (primary, đỏ gạch) → mở luồng viết câu nhắc
   - `Xem góc xóm đang chờ` (secondary) → cuộn tới danh sách vấn đề
   - `🧧 Ưu đãi cư dân` (tertiary) → cuộn tới section lead tầng 2
3. **Bộ đếm thời gian thực** (4 ô): `biển đã treo` · `góc xóm đang chờ` · `người đóng góp` · `khu phố tham gia`. Cập nhật ngay khi có hoạt động mới (polling/SSE).
4. **Bản đồ khu phố** (§1)
5. **Danh sách vấn đề** (§2)
6. **Bảng xếp hạng "Đại sứ khu phố"** + "Khu phố tử tế nhất tháng" (§5)
7. **Section "Ưu đãi cư dân"** — lead tầng 2 (§7.2)
8. **Footer**: hotline 1900 6600, link chính sách dữ liệu, credit chiến dịch.

---

## 1. Bản đồ khu phố — ảnh upload → cách điệu tự động (đã chốt Q3)

**Cơ chế:** admin upload **một hình bản đồ** cho mỗi khu phố (ảnh chụp/scan sơ đồ, screenshot bản đồ) → hệ thống **tự động cách điệu** theo bảng màu chiến dịch (lớp filter duotone/posterize tông kem–đỏ gạch render trong khung SVG, kèm làm mờ chi tiết thừa) → admin đặt pin bằng cách **click trực tiếp lên ảnh** (lưu toạ độ % x,y). Người dân chỉ thấy bản đồ đã cách điệu + pins; không thấy ảnh gốc.

- Mỗi **điểm nóng (vấn đề)** là một ghim trên bản đồ, **đổi màu theo trạng thái**:
  - 🔴 Đỏ — `Đang chờ` (đã đề xuất, chưa có/đang thu câu nhắc)
  - 🟠 Cam — `Đang bình chọn`
  - 🟢 Xanh — `Đã có biển`
- Legend hiển thị 3 trạng thái ngay trên bản đồ.
- **Bấm vào pin bất kỳ** → panel hiển thị **hình ảnh thật của địa điểm** (issue.photo_url — ảnh chụp góc xóm thực tế) + thông tin: loại, vị trí, trạng thái.
  - **Pin xanh (đã có biển)**: thêm khung **"Biển đã treo tại đây"** với nguyên văn câu trên biển (VD *"Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày."*), ảnh biển thật (sign_photo_url), dòng cảm ơn *"Cảm ơn cả khu phố đã cùng viết nên câu nhắc này 💛"* và nút **Chia sẻ** (§11).
  - **Pin đỏ/cam**: nút chuyển sang drawer vấn đề (§3) để viết/bình chọn câu.
- **Bấm vào địa chỉ phố/xóm (khu phố)** → xem trạng thái chứng nhận **"Khu phố biết thương" chuẩn 4N** (§6).
- Ảnh gốc và ảnh địa điểm do admin quản lý (04-ADMIN-SPEC §10); import hàng loạt qua template (04 §11).

## 2. Danh sách vấn đề ("góc xóm đang chờ")

Từng **thẻ vấn đề** hiển thị:
- Icon + **loại vấn đề** (taxonomy §2.1) · **vị trí** (VD "Hẻm 42 Lê Lợi")
- Dòng mô tả: "Khu phố nêu: cần một câu nhắc cho điểm này"
- Badge **trạng thái** (Đang chờ / Đang bình chọn / Đã có biển)
- **Số câu đề xuất** (VD "2 câu đề xuất") và **lượt bình chọn cao nhất** (VD "★ 34 bình chọn")
- Bấm thẻ → mở drawer vấn đề (§3)

Nút `+ Đề xuất vấn đề khu mình` đứng đầu danh sách → mở form đề xuất (§4).

### 2.1 Taxonomy loại vấn đề (danh mục đóng — không cho nhập tự do)
| Mã | Nhãn | Icon gợi ý |
|----|------|-----------|
| `toc_do` | Tốc độ | 🚸 |
| `trom_cap` | Trộm cắp | 🔒 |
| `an_toan_tre_em` | An toàn trẻ em | 🧒 |
| `chieu_sang` | Chiếu sáng | 💡 |
| `ve_sinh` | Vệ sinh | 🧹 |
| `phong_chay` | Phòng cháy | 🧯 |
| `giup_nhau` | Giúp nhau, san sẻ | 🤝 |
| `nguoi_gia` | Ông bà, người già | 👵 |

Lý do danh mục đóng: *"chỉ nhận vấn đề an toàn đời thường; mọi đề xuất hiển thị sau khi qua duyệt — đây là bước giữ trung lập và đúng mực"* (copy hiển thị ngay trong form).

## 3. Drawer vấn đề — Viết & bình chọn câu nhắc (Bước 2)

Khi mở một vấn đề:
- Header: icon loại + tên loại + vị trí, nút đóng ✕.
- **Danh sách câu nhắc đang chờ bình chọn**, mỗi câu gồm: nội dung, tác giả (tên hiển thị, VD "— Cô Tám tạp hoá", "— Minh (lớp 11)"), badge `✓ Đạt chuẩn 4N`, và nút/bộ đếm **thương** (VD "34 thương"). Nếu chưa có câu: *"Chưa có câu nào. Bạn viết câu đầu tiên cho điểm này nhé!"*
- **Ô "Viết câu nhắc của bạn"** (textarea, placeholder: *"VD: Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi..."*).
- **Checklist 4N tự soát**: 4 chip tĩnh `Nhắc · Nhở · Nhỏ · Nhẹ` hiển thị như gợi ý để người viết tự soát (không chấm tự động — đã chốt Q2); chú thích *"Câu của bạn sẽ được đội chiến dịch duyệt theo chuẩn 4N trước khi hiển thị"*. (Định nghĩa 4N cho người duyệt: 06-CONTENT-COPY §3.)
- **Khối lead tầng 1** (§7.1): chỉ còn checkbox opt-in ưu đãi — SĐT đã có từ bước định danh (§8), KHÔNG hỏi lại.
- Chú thích đạo đức: 💛 *"Giữ cho dễ thương: gọi tên một việc tốt cụ thể, không nêu đích danh người/nhà nào. Câu được chọn sẽ qua bộ lọc 4N và đội ngũ chiến dịch duyệt trước khi lên biển."*
- Nút `Gửi câu nhắc` (primary).

**Quy tắc bình chọn ("thương"):**
- Chỉ tài khoản đã định danh SĐT mới được thương. Người chưa định danh bấm thương → mở modal định danh (§8.1).
- 1 tài khoản = 1 phiếu thương cho mỗi câu (bấm lại để bỏ thương — toggle).
- Không tự thương câu của chính mình (ẩn/disable nút trên câu của mình).

## 4. Form "Đề xuất vấn đề khu mình" (Bước 1)

Modal/drawer gồm:
- Tiêu đề: **"Đề xuất vấn đề khu mình"** · phụ đề "Chọn loại vấn đề an toàn đời thường"
- **Loại vấn đề**: chip chọn 1 trong taxonomy §2.1
- **Vị trí (ngõ/hẻm/ngách)**: text, placeholder *"VD: Hẻm 25 Nguyễn Trãi"* — bắt buộc
- **Mô tả ngắn (không nêu đích danh ai)**: textarea, placeholder *"VD: Xe hay phóng nhanh đoạn cua, gần chỗ trẻ con chơi."*
- Cảnh báo danh mục đóng (copy §2.1)
- Nút `Gửi đề xuất → vào danh sách chờ`
- Sau khi gửi: đề xuất ở trạng thái `pending_review`, **chỉ hiển thị công khai sau khi admin duyệt**.
- Yêu cầu định danh SĐT (§8) trước khi gửi (để tính điểm + chặn spam; tối đa 3 đề xuất được tính điểm/tuần — vẫn cho gửi quá 3 nhưng không cộng điểm, xem 05-SCORING-RULES).

## 5. Bảng xếp hạng

### 5.1 "Đại sứ khu phố" — "Cây bút của khu phố"
- Tiêu đề: 🏆 **"Cây bút của khu phố"** · phụ đề *"Người viết câu nhắc được cả xóm thương nhất"*.
- Top 5–10, mỗi dòng: hạng, tên hiển thị (VD "Bà Liên", "Chú Ba xe ôm"), thống kê ("1 câu được treo · 52 lượt thương"), **điểm** (VD "82đ").
- Điểm tính theo công thức trong 05-SCORING-RULES, cập nhật thời gian thực.

### 5.2 "Khu phố tử tế nhất tháng"
- Dòng tổng kết dưới bảng: *"Khu phố tử tế nhất tháng: **Phường Lê Lợi** — 3 biển mới, 76 lượt thương"*.
- Điểm khu phố = tổng điểm cư dân trong khu + số biển mới treo trong khu (chu kỳ tháng).

## 6. Chứng nhận "Khu phố biết thương" chuẩn 4N

- Mỗi **khu phố** có trang/panel trạng thái. Khi đạt điều kiện (**100% biển của các vấn đề đã duyệt trong khu được treo**), khu phố nhận badge:
  - Ảnh thực tế khu phố + ribbon **"CHỨNG NHẬN ĐẠT CHUẨN 4N"**
  - Tên khu (VD **"Phường Bàn Cờ"**) + dòng *"đạt 'Khu phố biết thương' chuẩn 4N"*
  - Chip `100% biển đã treo` (xanh lá) + chip `Hoàn thành 09/2026`
- Việc cấp chứng nhận do admin xác nhận thủ công trên trang quản trị (dựa trên điều kiện hệ thống gợi ý).

## 7. Luồng thu lead (2 tầng)

### 7.1 Tầng 1 — Lead "mềm" trong drawer viết câu nhắc
- **SĐT đã có từ bước định danh (§8) — không hỏi lại.** Drawer chỉ hiển thị **checkbox opt-in riêng biệt** (mặc định KHÔNG tick): *"Tôi muốn nhận ưu đãi dành riêng cho cư dân khu phố biết thương từ FPT."* — chú thích *"Tuỳ chọn riêng, không ảnh hưởng đến câu nhắc của bạn."*
- Tick → tạo lead `source = soft_drawer` từ SĐT định danh (server ghi `phone_encrypted` với purpose `lead`). Không tick → không có lead, không lưu SĐT cho mục đích liên hệ.
- **"Báo tin vui" khi câu được treo: KHÔNG gửi SMS (đã chốt Q1).** Thay bằng thông báo in-web: khi khách quay lại (cookie nhận diện), hiện banner 🎉 *"Câu của bạn đã được treo tại {vị trí}!"* + nút Chia sẻ (§11) + nút xem trên bản đồ.

### 7.2 Tầng 2 — Lead chủ động: section "Ưu đãi cư dân" cuối trang
- Badge: 🧧 *"Món quà nhỏ cho người góp câu thương"*. Tiêu đề: **"FPT muốn gửi lại xóm mình một điều dễ thương"**.
- Mô tả: FPT xin gửi lại ưu đãi dành riêng cho cư dân khu phố biết thương: gói Internet, Truyền hình và FPT Play với mức giá "tình làng nghĩa xóm". Chỉ khi bạn muốn, tụi mình mới liên hệ.
- Ghi chú riêng tư (bắt buộc hiển thị): 🔒 *"Số điện thoại của bạn chỉ dùng để gửi ưu đãi này khi bạn chủ động đồng ý — không dùng cho bất kỳ mục đích nào khác, không tự động gọi mời."*
- Form:
  - **Tên bạn (hoặc tên cả nhà hay gọi)** — placeholder *"VD: Cô Tám, anh Dũng, nhà số 7..."*
  - **Số điện thoại** — placeholder *"VD: 090xxxxxxx"* (bắt buộc, validate đầu số VN)
  - **Khu phố của bạn (để ưu đãi đúng khu vực)** — placeholder *"VD: Hẻm 42 Lê Lợi, P. Bàn Cờ"*
  - **Bạn đang quan tâm điều gì cho nhà mình?** — chip đa chọn: `📶 Internet cho cả nhà` · `📺 Internet + Truyền hình` · `🎬 Gói FPT Play` · `📷 Internet + Camera`
  - Checkbox opt-in (copy như tầng 1) + chú thích *"Không tick, không sao cả — câu nhắc của bạn vẫn được trân trọng như nhau."*
  - Nút `Nhận ưu đãi của xóm mình`
- Dòng cuối: *"Đang là khách FPT và cần hỗ trợ kỹ thuật? Gọi tổng đài **1900 6600** — không cần điền form này."*
- `lead.source = active_section`.

## 8. Định danh khách hàng — SĐT băm + cookie (KHÔNG dùng OTP)

**Nguyên tắc:** không gửi OTP. Khách hàng nhập SĐT một lần; hệ thống **băm SĐT** làm khoá định danh và cấp **cookie phiên** để nhận diện các lần truy cập sau. Ưu tiên cao nhất là bảo mật SĐT.

### 8.1 Luồng lần đầu
1. Khi thực hiện hành động cần định danh (gửi đề xuất, gửi câu nhắc, bấm thương, gửi lead) → mở modal **"Cho xóm biết bạn là ai"**: ô SĐT + tên hiển thị (VD "Cô Tám tạp hoá") + chọn khu phố. Xem bản đồ/danh sách/bảng xếp hạng: không cần.
2. Server chuẩn hoá SĐT (+84) → tính `phone_hash = HMAC-SHA256(phone_chuẩn_hoá, PEPPER)` với PEPPER là secret phía server (secret manager, không nằm trong code/DB). Upsert user theo `phone_hash` — **1 SĐT = 1 tài khoản**.
3. Server tạo **session token ngẫu nhiên 256-bit** (không phải hash SĐT), lưu `sha256(token)` vào bảng sessions, và set cookie:
   `kp_session` — `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=180 ngày`.
4. **SĐT gốc không bao giờ nằm trong cookie, localStorage, URL hay log.** SĐT gốc chỉ lưu server-side dạng **mã hoá AES-256-GCM** khi và chỉ khi cần liên hệ (báo tin vui / lead opt-in), kèm cờ mục đích sử dụng.

### 8.2 Luồng truy cập lại
- Có cookie hợp lệ → server tra session → nhận diện user, hiển thị "Chào Cô Tám 👋", không hỏi lại SĐT.
- Mất cookie (đổi máy, xoá cookie) → nhập lại SĐT → cùng `phone_hash` → **khôi phục đúng tài khoản cũ** (điểm, câu nhắc giữ nguyên) → cấp session mới.

### 8.3 Kiểm tra server-side (bắt buộc mọi hành động ghi)
- Xác thực chữ ký/tra cứu session từ cookie; session hết hạn/thu hồi → 401, yêu cầu nhập lại SĐT.
- Ở các form có nhập lại SĐT (VD form lead tầng 2): server **đối chiếu hash SĐT nhập vào với định danh trong cookie**. Khớp → xử lý bình thường. Lệch → hỏi xác nhận "Bạn muốn tiếp tục với số mới?" rồi chuyển định danh sang tài khoản của số mới (cấp lại session), tuyệt đối không gộp/ghi chéo dữ liệu giữa 2 tài khoản.
- Ràng buộc phiếu, điểm, trần tuần đều tính theo `phone_hash`.

### 8.4 Rủi ro đã chấp nhận & biện pháp bù (do bỏ OTP)
- ⚠️ Không OTP nghĩa là **không chứng minh được người nhập sở hữu SĐT đó** — có thể nhập số của người khác hoặc số ảo để tạo nhiều tài khoản. Đây là trade-off có chủ đích (giảm ma sát), phải bù bằng:
  - Rate limit tạo định danh: tối đa 3 SĐT mới/thiết bị+IP/giờ; captcha nhẹ khi vượt ngưỡng.
  - Chặn dải số không hợp lệ (regex đầu số VN, số lặp bất thường 0900000000...).
  - Heuristics gian lận (03-DATA-MODEL §5) hoạt động mạnh hơn: cụm tài khoản cùng IP/thiết bị/thời gian, vote hàng loạt → vô hiệu lặng lẽ.
  - Không còn kênh SMS nào (đã chốt Q1) → không phát sinh rủi ro gửi tin nhầm chủ số; tranh chấp mạo danh xử lý qua hotline + admin revoke/tách tài khoản.

## 9. Vòng đời nội dung (state machine — chi tiết ở 03-DATA-MODEL)

```
Đề xuất:   pending_review → approved (hiện công khai, pin đỏ) | rejected (ẩn, báo riêng)
Vấn đề:    waiting (đỏ) → voting (cam, khi có ≥1 câu được duyệt) → signed (xanh, biển đã treo)
Câu nhắc:  submitted → auto_scored_4n → approved (hiện + cho thương) | rejected
           → selected (admin chọn câu cao nhất) → produced → installed (biển treo thật)
```
Khi câu chuyển `installed`: pin đổi xanh, bộ đếm "biển đã treo" +1, tác giả +30 điểm, tạo **thông báo in-web** cho tác giả (hiện banner lần quay lại kế tiếp), panel bản đồ hiển thị nguyên văn câu + ảnh biển thật.

## 10. Realtime & phản hồi UI

- Bộ đếm, lượt thương, bảng xếp hạng cập nhật không cần reload (SSE hoặc polling 15–30s là đủ cho MVP).
- Mọi hành động có toast xác nhận giọng ấm áp (VD gửi câu: *"Câu của bạn đã vào hàng chờ duyệt — cảm ơn bạn đã thương xóm mình 💛"*).

## 11. Chia sẻ mạng xã hội (đã chốt Q8)

- **Vị trí nút chia sẻ**: (a) mỗi dòng bảng xếp hạng Đại sứ + trang thành tích cá nhân; (b) panel "biển đã treo" trên bản đồ; (c) panel chứng nhận "Khu phố biết thương"; (d) banner báo tin vui in-web.
- Mỗi đối tượng có **URL công khai riêng**: `/dai-su/{slug}`, `/bien/{id}`, `/khu-pho/{slug}` — server render **OG image động** (nền chiến dịch + tên hiển thị/câu nhắc/tên khu phố + thành tích), tối ưu preview **Facebook và Zalo**.
- Share text gợi ý điền sẵn (06-CONTENT-COPY §2).
- **Bảo mật**: URL/OG không bao giờ chứa SĐT hay ID nội bộ đoán được — dùng slug/ID ngẫu nhiên; chỉ hiển thị tên hiển thị công khai.



---

<!-- ===== PHẦN 4/9: 03-DATA-MODEL.md ===== -->

# 📄 PHẦN 4: 03-DATA-MODEL.md

# Mô hình dữ liệu & API — "Khu Phố Của Tôi"
Phiên bản 1.0

---

## 1. Entities

### users
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| phone_hash | char(64) unique NOT NULL | `HMAC-SHA256(SĐT chuẩn hoá +84, PEPPER)` — khoá định danh duy nhất. PEPPER là secret server (secret manager), KHÔNG lưu trong DB/code |
| phone_encrypted | bytea nullable | SĐT gốc mã hoá **AES-256-GCM** (khoá riêng, tách khỏi PEPPER). Chỉ ghi khi cần liên hệ: báo tin vui hoặc lead opt-in |
| phone_purpose | text[] | Cờ mục đích: `lead` (duy nhất — không còn SMS báo tin vui). Không opt-in lead → phone_encrypted để NULL |
| display_name | varchar | "Cô Tám tạp hoá" |
| neighborhood_id | FK → neighborhoods | Khu phố của user |
| role | enum: `resident` | Bảng users chỉ dành cho cư dân (định danh SĐT). Admin nằm ở bảng riêng `admin_users` — hai hệ đăng nhập tách biệt |
| created_at, last_login_at | timestamptz | |
| is_shadow_banned | bool | Lọc gian lận lặng lẽ: hành vi vẫn ghi nhưng không tính điểm/hiển thị |

### neighborhoods (khu phố)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| name | varchar | "Phường Bàn Cờ", "Hẻm chợ Xóm Mới" |
| ward, district, city | varchar | |
| slug | varchar unique | URL share công khai `/khu-pho/{slug}` |
| map_image_url | varchar | Ảnh bản đồ gốc do admin upload (Q3) — chỉ admin thấy; public thấy bản cách điệu |
| certified_4n | bool | Chứng nhận "Khu phố biết thương" |
| certified_at | date | Hiển thị "Hoàn thành 09/2026" |
| photo_url | varchar | Ảnh chứng nhận |

### issues (vấn đề / điểm nóng)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| neighborhood_id | FK | |
| category | enum: `toc_do, trom_cap, an_toan_tre_em, chieu_sang, ve_sinh, phong_chay, giup_nhau, nguoi_gia` | |
| location_text | varchar | "Hẻm 42 Lê Lợi" |
| description | text | Mô tả ngắn, không đích danh |
| pin_x, pin_y | float | Toạ độ % (0–100) trên ảnh bản đồ khu phố — admin click để đặt |
| photo_url | varchar nullable | Ảnh thật của địa điểm — hiển thị khi bấm pin (Q3) |
| status | enum: `pending_review, waiting, voting, signed, rejected` | Xem state machine §3 |
| proposed_by | FK → users | |
| review_note | text nullable | Lý do từ chối (admin) |
| created_at, approved_at, signed_at | timestamptz | |

### suggestions (câu nhắc)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| issue_id | FK → issues | |
| author_id | FK → users | |
| content | text | Nội dung câu nhắc |
| review_4n | jsonb | `{nhac, nho, nho2, nhe: bool}` — checklist do **admin tick thủ công khi duyệt** (Q2: không có chấm tự động); duyệt hiển thị yêu cầu đủ 4 ô |
| sign_photo_url | varchar nullable | Ảnh biển thật sau khi treo (admin upload ở bước installed) |
| status | enum: `submitted, approved, rejected, selected, produced, installed` | |
| review_note | text nullable | |
| created_at, approved_at, installed_at | timestamptz | |

### votes (lượt thương)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| suggestion_id | FK | |
| user_id | FK | |
| created_at | timestamptz | |
| is_valid | bool default true | Đặt false khi hệ thống lọc phiếu bất thường (lặng lẽ) |
| UNIQUE(suggestion_id, user_id) | | 1 người 1 phiếu/câu |
| CHECK: user_id ≠ suggestion.author_id | Enforce ở tầng ứng dụng | Không tự thương |

### leads
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| name | varchar nullable | Tầng 1 có thể không có tên |
| phone | varchar | |
| neighborhood_text | varchar nullable | |
| interests | text[] | `internet, internet_tv, fpt_play, internet_camera` |
| source | enum: `soft_drawer` \| `active_section` | Tầng 1 / Tầng 2 |
| opted_in | bool | Chỉ true mới là lead sale |
| user_id | FK nullable | Nếu gắn được với tài khoản |
| status | enum: `new, contacted, converted, closed` | Admin cập nhật |
| created_at | timestamptz | |

### score_events (sổ cái điểm — append-only)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| user_id | FK | |
| type | enum: `issue_approved(+2), suggestion_approved(+5), vote_received(+1), sign_installed(+30)` | |
| points | int | Trọng số tại thời điểm ghi |
| ref_id | uuid | issue/suggestion/vote liên quan |
| is_valid | bool | Cho phép thu hồi lặng lẽ |
| created_at | timestamptz | |

> Điểm Đại sứ = SUM(points) WHERE is_valid. Điểm khu phố = SUM điểm cư dân trong khu + 0 (số biển đã cộng qua sign_installed của tác giả; bảng "Khu phố tử tế nhất tháng" tính thêm số biển mới trong tháng — xem 05-SCORING-RULES §3).
> **Trần 3 đề xuất/tuần**: khi ghi `issue_approved`, đếm số event cùng loại của user trong tuần ISO hiện tại; nếu ≥3 thì ghi event với points=0.

### sessions (cookie định danh)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| user_id | FK → users | |
| token_hash | char(64) unique | `SHA-256(session token)` — token gốc 256-bit random chỉ nằm trong cookie `kp_session` (HttpOnly, Secure, SameSite=Lax), KHÔNG lưu bản rõ |
| created_at, last_seen_at, expires_at | timestamptz | TTL 180 ngày, gia hạn khi hoạt động |
| revoked | bool | Thu hồi khi nghi gian lận / user đổi số trên form |
| ip_hash, ua_hash | char(64) | Băm IP + user-agent phục vụ heuristics gian lận (không lưu bản rõ) |

> **Không có bảng OTP.** Định danh = nhập SĐT → server băm → upsert user → cấp session cookie. Chi tiết luồng: 02-FUNCTIONAL-SPEC §8.

### admin_users (tách hẳn khỏi users)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| email | varchar unique | **CHECK server-side: đuôi @fpt.com** (`email ~* '@fpt\.com$'` + regex đầy đủ ở tầng ứng dụng) |
| password_hash | varchar | **Argon2id** (memory-hard); không bao giờ log/trả về |
| totp_secret | varchar nullable | Mã hoá at-rest; null = chưa bật 2FA (khuyến nghị bắt buộc bật ở lần đăng nhập đầu) |
| backup_codes_hash | text[] | 10 mã dự phòng dùng 1 lần (hash) |
| failed_attempts, locked_until | int, timestamptz | Khoá 15 phút sau 5 lần sai |
| is_active | bool | Vô hiệu hoá = revoke mọi session ngay |
| created_at, last_login_at | timestamptz | |

### admin_sessions
| token_hash unique, admin_user_id FK, created_at, expires_at (TTL 8h), revoked, ip_hash | Cookie riêng `kp_admin_session` (HttpOnly, Secure, SameSite=Strict) — tách hoàn toàn khỏi `kp_session` của public |

### notifications (báo tin vui in-web — thay SMS, Q1)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| user_id | FK → users | |
| type | enum: `sign_installed` | Mở rộng sau |
| ref_id | uuid | suggestion liên quan |
| seen | bool default false | Hiện banner khi user quay lại (cookie) đến khi bấm đóng |
| created_at | timestamptz | |

### counters (materialized/cached)
`signs_installed, issues_waiting, contributors, neighborhoods_joined` — tính từ dữ liệu gốc, cache 15s.

## 2. Quan hệ

```
neighborhoods 1—n issues 1—n suggestions 1—n votes
users 1—n issues (proposed_by) · 1—n suggestions (author) · 1—n votes · 1—n score_events
leads (độc lập, optional FK user)
```

## 3. State machines

### Issue
```
pending_review ──admin duyệt──▶ waiting (pin ĐỎ)
       └──admin từ chối──▶ rejected (ẩn)
waiting ──có ≥1 suggestion approved──▶ voting (pin CAM)
voting ──suggestion của issue chuyển installed──▶ signed (pin XANH)
```

### Suggestion
```
submitted ──auto chấm 4N──▶ (đính score_4n)
submitted ──admin duyệt──▶ approved (hiện công khai, mở bình chọn)
        └──admin từ chối──▶ rejected
approved ──admin chọn (thường là câu nhiều thương nhất)──▶ selected
selected ──đưa sản xuất──▶ produced ──treo thật──▶ installed
```
Side-effects khi `installed`: issue → signed; +30 điểm tác giả; counter +1; tạo bản ghi `notifications` cho tác giả (banner in-web lần quay lại kế tiếp).

## 4. API (REST, prefix `/api/v1`)

### Public (không cần auth)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | /counters | 4 bộ đếm |
| GET | /map | Danh sách pins: issues (id, category, status, x, y) + neighborhoods certified |
| GET | /issues?status=&neighborhood= | Danh sách thẻ vấn đề (kèm suggestion_count, top_votes) |
| GET | /issues/:id | Chi tiết + suggestions approved (content, author display_name, votes) |
| GET | /leaderboard?type=ambassador\|neighborhood | Bảng xếp hạng |
| GET | /neighborhoods/:id | Trạng thái chứng nhận 4N |
| GET | /share/dai-su/:slug · /share/bien/:id · /share/khu-pho/:slug | Trang share công khai + OG image động (Q8) |

### Auth (định danh không OTP)
| POST | /auth/identify | body: {phone, display_name?, neighborhood_id?} → server băm SĐT, upsert user, set cookie `kp_session` (HttpOnly, Secure, SameSite=Lax). Response KHÔNG trả lại SĐT/hash. Rate limit: 3 định danh mới/thiết bị+IP/giờ |
| POST | /auth/logout | Thu hồi session hiện tại (revoked=true), xoá cookie |
| GET/PATCH | /me | Hồ sơ: display_name, neighborhood_id (nhận diện qua cookie) |

> Mọi endpoint ghi (POST/PATCH) yêu cầu: (1) cookie session hợp lệ chưa thu hồi, (2) CSRF token (double-submit) vì cookie-based, (3) nếu request chứa SĐT (VD /leads) → server băm và **đối chiếu với phone_hash của session**; lệch → 409 kèm luồng xác nhận chuyển định danh (02 §8.3).

### Resident (JWT)
| POST | /issues | Gửi đề xuất → pending_review |
| POST | /issues/:id/suggestions | Gửi câu nhắc (server chấm 4N lại — client chỉ preview) |
| POST | /suggestions/:id/vote | Toggle thương; 409 nếu tự thương |
| POST | /leads | Ghi lead (cả 2 tầng; validate opt_in; tầng 1 dùng SĐT của session, không nhận SĐT mới) |
| GET | /me/notifications · PATCH /me/notifications/:id (seen) | Banner báo tin vui in-web |

### Admin auth
| POST | /admin/auth/login | body: {email, password} → nếu bật TOTP trả bước 2; validate đuôi @fpt.com server-side; rate limit + khoá 5 lần sai |
| POST | /admin/auth/totp | body: {code} → set cookie `kp_admin_session` |
| POST | /admin/auth/logout | Revoke session |

### Admin (cookie kp_admin_session — chi tiết ở 04-ADMIN-SPEC)
| GET | /admin/issues?status=pending_review | Hàng chờ duyệt đề xuất |
| PATCH | /admin/issues/:id | approve/reject + note |
| GET | /admin/suggestions?status=submitted | Hàng chờ duyệt câu |
| PATCH | /admin/suggestions/:id | approve/reject/select/produced/installed |
| GET | /admin/leads (+ export CSV) · PATCH /admin/leads/:id | |
| PATCH | /admin/neighborhoods/:id/certify | Cấp chứng nhận 4N |
| POST | /admin/neighborhoods/:id/map-image | Upload ảnh bản đồ gốc (Q3) |
| PATCH | /admin/issues/:id/pin | Đặt toạ độ pin {pin_x, pin_y} + upload photo_url |
| POST | /admin/import | Bulk import từ Excel template (Q6): multipart file → validate → preview → commit; response báo lỗi theo từng dòng |
| GET | /admin/dashboard | Số liệu tổng |
| GET | /admin/fraud | Danh sách phiếu/tài khoản nghi vấn + hành động shadow-ban |

## 5. Chống gian lận (im lặng)

- 1 SĐT (định danh qua phone_hash) = 1 tài khoản; UNIQUE vote; cấm tự thương (server-side).
- **Bù đắp việc bỏ OTP** (không chứng minh sở hữu số): rate limit tạo định danh theo thiết bị+IP, captcha khi vượt ngưỡng, chặn dải số ảo, trọng số cao hơn cho heuristics cụm tài khoản cùng ip_hash/ua_hash/thời gian.
- Heuristics gắn cờ: cụm tài khoản đăng ký cùng dải thời gian/IP; 1 người nhận thương hàng loạt từ nhóm tài khoản mới; tốc độ vote bất thường.
- Xử lý: set `is_valid=false` trên votes/score_events, hoặc `is_shadow_banned` trên user. **Không thông báo, không hiển thị lý do.** UI của người bị lọc vẫn thấy phiếu của mình bình thường.



---

<!-- ===== PHẦN 5/9: 04-ADMIN-SPEC.md ===== -->

# 📄 PHẦN 5: 04-ADMIN-SPEC.md

# Đặc tả trang quản trị — "Admin Khu Phố"
Phiên bản 1.0 · Tham chiếu design: `Admin+Khu+Pho.dc.html`

> Trang Admin dành cho đội vận hành chiến dịch FPT Telecom. Đăng nhập bằng tài khoản role=admin (tài khoản nội bộ FPT: **email + mật khẩu**, email bắt buộc đuôi **@fpt.com** — validate cả client và server, kèm 2FA TOTP khuyến nghị. KHÔNG dùng cơ chế định danh SĐT của trang public, vì admin có quyền cao và bỏ OTP phía public không được làm yếu cửa admin)

**Đặc tả đăng nhập admin:**
- Email: regex `^[a-zA-Z0-9._%+-]+@fpt\.com$` — kiểm tra ở **server-side** (client chỉ để UX); email khác đuôi @fpt.com bị từ chối ngay cả khi tồn tại trong DB (defense in depth).
- Mật khẩu: tối thiểu 12 ký tự; hash **Argon2id** (không dùng MD5/SHA thuần); khoá tài khoản 15 phút sau 5 lần sai liên tiếp; thông báo lỗi chung "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không).
- 2FA TOTP (khuyến nghị giữ): sau email + mật khẩu đúng → nhập mã 6 số từ app authenticator; secret cấp lúc tạo tài khoản qua QR, kèm 10 mã dự phòng dùng 1 lần.
- Session admin **tách hoàn toàn** khỏi session public: cookie riêng `kp_admin_session` (HttpOnly, Secure, SameSite=Strict), TTL 8 giờ, không gia hạn tự động qua đêm.
- Tài khoản admin do super-admin tạo thủ công (không có form tự đăng ký); vô hiệu hoá được ngay lập tức (revoke toàn bộ session).. Toàn bộ đường dẫn dưới `/admin`, không index SEO, chặn robots.

---

## 1. Dashboard tổng quan

- 4 KPI lớn (đồng bộ bộ đếm public): biển đã treo · vấn đề đang chờ · người đóng góp · khu phố tham gia.
- KPI vận hành: đề xuất chờ duyệt, câu chờ duyệt, câu đã chọn chưa sản xuất, biển đang sản xuất.
- KPI thương mại (chỉ admin thấy): lead mới tầng 1 / tầng 2, lead theo trạng thái.
- Biểu đồ theo ngày: câu nhắc gửi, lượt thương, lead (14 ngày gần nhất).

## 2. Duyệt đề xuất vấn đề (Bước 3 - phần a)

- Bảng hàng chờ `pending_review`: thời gian, người gửi, khu phố, loại, vị trí, mô tả.
- Hành động: **Duyệt** (→ hiện công khai, pin đỏ, +2 điểm nếu chưa vượt trần 3/tuần) · **Từ chối** (+ ô lý do nội bộ, không hiển thị công khai).
- Tiêu chí duyệt (hiển thị checklist nhắc admin): thuộc danh mục an toàn đời thường; không đích danh người/nhà; vị trí đủ cụ thể; không trùng vấn đề đã có (gợi ý trùng theo vị trí gần nhau).

## 3. Duyệt câu nhắc (Bước 3 - phần b)

- Bảng hàng chờ `submitted`: nội dung câu, tác giả, vấn đề/vị trí, thời gian.
- **Checklist 4N thủ công (Q2 — người duyệt trực tiếp, không chấm tự động):** admin tick 4 ô `Nhắc · Nhở · Nhỏ · Nhẹ` theo định nghĩa 06-CONTENT-COPY §3; nút **Duyệt hiển thị** chỉ bật khi đủ 4 ô (→ approved, +5 điểm, mở bình chọn, lưu review_4n). **Từ chối** (+ lý do) không cần tick.
- Tiêu chí duyệt (checklist): trung lập, **không công kích, không nêu đích danh**; đạt chuẩn 4N; đúng ngữ cảnh vấn đề; chính tả ổn.
- Bộ lọc: theo khu phố, loại vấn đề, kết quả 4N.

## 4. Chọn câu & quản lý vòng đời biển (Bước 3→4)

- Với mỗi issue đang `voting`: bảng các câu approved xếp theo lượt thương (chỉ đếm phiếu hợp lệ). Nút **"Chọn câu này lên biển"** — mặc định gợi ý câu cao phiếu nhất; nếu admin chọn câu khác phải nhập lý do (đảm bảo trung lập/tránh rủi ro nội dung).
- Pipeline trạng thái biển: `selected → produced → installed`, mỗi bước 1 nút + timestamp.
- Khi bấm **"Đã treo biển"** (installed): hệ thống tự động — issue → signed (pin xanh), +30 điểm tác giả, counter +1, tạo **thông báo in-web** cho tác giả (không SMS — Q1), panel bản đồ hiển thị nguyên văn câu + ảnh biển.
- Trường nhập kèm: ảnh biển thực tế (upload), ngày treo.

## 5. Chứng nhận "Khu phố biết thương"

- Danh sách khu phố + tiến độ: số issue đã duyệt / số biển đã treo / % hoàn thành.
- Khi đạt 100%: nút **"Cấp chứng nhận 4N"** → nhập ảnh khu phố + tháng hoàn thành → public panel chứng nhận (VD "Phường Bàn Cờ · 100% biển đã treo · Hoàn thành 09/2026").

## 6. Quản lý leads

- Bảng leads: thời gian, tên, SĐT (che giữa dạng 090***123, bấm để hiện — có log truy cập), khu phố, quan tâm, nguồn (tầng 1/tầng 2), trạng thái.
- Chỉ hiển thị bản ghi `opted_in = true`. SĐT "báo tin vui" không opt-in **không xuất hiện** ở đây.
- Hành động: đổi trạng thái (new → contacted → converted/closed), ghi chú, **Export CSV** (log ai export, khi nào).
- MVP không tích hợp CRM tự động — export CSV bàn giao đội sale (xem 07-NFR-TECH Q4).

## 7. Chống gian lận

- Tab cảnh báo: cụm tài khoản đăng ký cùng lúc/cùng IP, chuỗi vote bất thường, một người nhận thương hàng loạt từ tài khoản mới.
- Hành động: **Vô hiệu phiếu** (is_valid=false) · **Shadow-ban tài khoản**. Mọi hành động im lặng — không thông báo cho người dùng, không đổi UI phía họ.

## 8. Quản lý danh mục & bảng xếp hạng

- Sửa danh sách khu phố (thêm khu mới, toạ độ pin trên bản đồ cách điệu).
- Xem bảng điểm chi tiết từng user (sổ cái score_events) — phục vụ giải trình khi trao giải Đại sứ.
- Nút "Chốt kỳ tháng" cho bảng "Khu phố tử tế nhất tháng" (lưu snapshot, reset chu kỳ nếu chuyển vận hành dài hạn — xem 05-SCORING-RULES Luật nền 4).

## 9. Phân quyền

| Role | Quyền |
|------|-------|
| `admin` | Toàn bộ mục trên |

> Q7 đã chốt: **không có tài khoản chính quyền trong MVP.** Nhu cầu báo cáo cho công an xã/phường đáp ứng bằng export offline (CSV/PDF từ dashboard).

## 10. Trình quản lý bản đồ (Q3)

- Mỗi khu phố: **upload 1 ảnh bản đồ** (jpg/png ≤ 10MB) → xem preview **bản cách điệu tự động** (filter duotone/posterize theo bảng màu chiến dịch) đúng như người dân sẽ thấy.
- **Đặt pin bằng click**: chọn issue chưa có toạ độ → click vị trí trên ảnh → lưu pin_x/pin_y (%). Kéo-thả để chỉnh.
- Với mỗi pin: upload **ảnh thật của địa điểm** (photo_url) — hiển thị khi người dân bấm pin.
- Thay ảnh bản đồ: pins giữ nguyên toạ độ %, admin được cảnh báo kiểm tra lại vị trí.

## 11. Bulk import khu phố pilot (Q6 — 20 khu phố trong 1 lần)

- Upload file Excel theo **template `import-template.xlsx`** (2 sheet: `KhuPho`, `VanDe` — cấu trúc trong file kèm hướng dẫn).
- Quy trình 3 bước: **Upload → Validate & Preview → Commit**. Validate báo lỗi theo từng dòng (khu phố trùng tên, loại vấn đề sai mã, thiếu vị trí...) — không ghi gì vào DB nếu còn lỗi (all-or-nothing).
- Ảnh (bản đồ, địa điểm) upload kèm dạng zip cùng tên file khớp cột trong Excel, hoặc bổ sung sau qua §10.
- Import tạo: neighborhoods + issues ở trạng thái `waiting` (mặc định coi như đã duyệt vì do admin nhập).



---

<!-- ===== PHẦN 6/9: 05-SCORING-RULES.md ===== -->

# 📄 PHẦN 6: 05-SCORING-RULES.md

# Quy định điểm — "Đại sứ khu phố"
Nguồn chuẩn: `QuydinhdiemDaisukhupho.xlsx` (đã được phê duyệt) · Chiến dịch Khu Phố Biết Thương · nền tảng Khu Phố Của Tôi

---

## 1. Công thức

```
ĐIỂM ĐẠI SỨ = (2 × Đề xuất được duyệt)
            + (5 × Câu đạt 4N được duyệt)
            + (1 × Lượt thương)
            + (30 × Câu được treo)
```

## 2. Chi tiết từng chỉ số

| Chỉ số | Điểm | Điều kiện tính | Lý do trọng số |
|--------|------|----------------|----------------|
| Đề xuất góc xóm cần treo biển | **+2** | Chỉ tính đề xuất **ĐƯỢC DUYỆT** · tối đa **3 đề xuất/tuần** được tính điểm | Giữ mức thấp đúng chủ trương "ít thôi": mỗi đề xuất tạo việc thẩm định cho đội vận hành. Trần tuần chặn spam đề xuất. |
| Câu nhắc đạt 4N, được duyệt hiển thị | **+5** | Tính theo câu **được admin duyệt lên trang với checklist 4N tick đủ 4 ô** (Q2: duyệt thủ công, không chấm tự động) — không tính câu gửi bị loại | Cột sản lượng chính của chiến dịch. Tính theo câu được duyệt để lượng không đè chất. |
| Lượt thương nhận được | **+1/lượt** | **Không trần** · chỉ tính lượt thương từ tài khoản đã định danh SĐT hợp lệ (*) · **không tự thương câu mình** | Cột chất lượng — cả xóm chấm thay ban tổ chức. Câu được thương nhiều nhất xứng đáng định đoạt cuộc đua. |
| Câu được chọn treo thành biển thật | **+30** | Tính khi biển **sản xuất và treo thực tế** tại góc xóm (trạng thái `installed`) | Jackpot của mechanic — mọi hành vi khác đều hướng về đích này. Khoảnh khắc tạo UGC mạnh nhất (khoe biển). |

## 3. Luật nền (áp dụng cho mọi chỉ số)

1. **Một số điện thoại = một tài khoản, một phiếu thương cho mỗi câu.**
   > (*) **Ghi chú thay đổi so với xlsx gốc:** bản xlsx quy định "xác thực OTP". Theo quyết định PM (07/2026), OTP được thay bằng **định danh SĐT băm + cookie** (02-FUNCTIONAL-SPEC §8) để giảm ma sát. Mức đảm bảo chống gian lận thấp hơn OTP — bù bằng rate limit định danh, chặn số ảo và heuristics lọc lặng lẽ. Cần stakeholder ký duyệt lại điểm lệch này.
2. **Không tính điểm khi tự thương câu của chính mình**; phiếu bất thường (cụm tài khoản đăng ký cùng lúc, thương hàng loạt một người) bị **lọc lặng lẽ, không thông báo**.
3. **Điểm cá nhân cộng dồn thành điểm khu phố** — dùng cho bảng **"Khu phố tử tế nhất tháng"** (tổng điểm cư dân + số biển mới treo trong khu).
4. **Điểm tích luỹ suốt chiến dịch (sprint 4 tuần).** Nếu chuyển sang vận hành dài hạn: đổi sang chu kỳ tháng và **reset điểm** để người mới còn cửa đua.

## 4. Ví dụ kiểm thử (dùng làm test case)

| Cư dân | Đề xuất duyệt | Câu 4N duyệt | Lượt thương | Câu treo | **Điểm** |
|--------|---------------|--------------|-------------|----------|----------|
| Cô Tám tạp hoá | 1 | 3 | 34 | 1 | **81** = 2+15+34+30 |
| Anh Dũng | 0 | 2 | 47 | 1 | **87** = 0+10+47+30 |
| Minh (lớp 11) | 2 | 4 | 21 | 0 | **45** = 4+20+21+0 |

## 5. Yêu cầu triển khai kỹ thuật

- Điểm ghi dạng **sổ cái append-only** (`score_events`, xem 03-DATA-MODEL) — không lưu tổng cứng; tổng = SUM(events hợp lệ). Cho phép vô hiệu event lặng lẽ khi phát hiện gian lận.
- Trần 3 đề xuất/tuần: tính theo **tuần ISO**, đề xuất duyệt thứ 4 trở đi vẫn hiển thị công khai nhưng ghi event points=0.
- Bỏ thương (toggle off) → vô hiệu event `vote_received` tương ứng.
- Bảng xếp hạng Đại sứ hiển thị: hạng, tên, "{n} câu được treo · {m} lượt thương", tổng điểm (đơn vị "đ" theo design — VD "82đ").



---

<!-- ===== PHẦN 7/9: 06-CONTENT-COPY.md ===== -->

# 📄 PHẦN 7: 06-CONTENT-COPY.md

# Nội dung, copy chuẩn & bộ lọc 4N
Phiên bản 1.0

---

## 1. Giọng điệu thương hiệu

- Ấm áp, gần gũi, "tình làng nghĩa xóm". Xưng hô: "xóm mình", "khu mình", "tụi mình" (FPT), "bạn".
- Động từ đặc trưng của chiến dịch: **"thương"** (thay cho like/vote).
- Không dùng ngôn ngữ chỉ trích, ra lệnh, doạ phạt. Không nêu đích danh người/nhà/số nhà cụ thể trong nội dung nhắc nhở.
- Emoji tiết chế: 💛 🧧 ✓, không lạm dụng.

## 2. Copy chuẩn (dùng nguyên văn — đã duyệt từ design)

| Vị trí | Copy |
|--------|------|
| Hero title | Muốn gửi một lời thương cho xóm mình? **Viết một câu nhắc nhỏ nhẹ.** |
| Hero body | Bạn chọn một góc xóm. Cả xóm cùng viết câu nhắc dễ thương theo chuẩn 4N và bấm "thương" để bình chọn. Câu được thương nhiều nhất sẽ thành biển thật do FPT treo — nối tiếp hơn **10.000 lời nhắc** đã có mặt khắp ngõ hẻm Việt Nam. |
| CTA chính | + Gửi lời nhắc cho xóm mình |
| CTA phụ | Xem góc xóm đang chờ · 🧧 Ưu đãi cư dân |
| CTA toàn chiến dịch | "Lên Khu Phố Của Tôi, viết câu nhắc cho xóm mình." |
| 4 counter labels | biển đã treo · góc xóm đang chờ · người đóng góp · khu phố tham gia |
| Placeholder câu nhắc | VD: Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi... |
| Ghi chú 4N khi viết | Câu của bạn sẽ được đội chiến dịch duyệt theo chuẩn 4N trước khi hiển thị |
| Ghi chú đạo đức | 💛 Giữ cho dễ thương: gọi tên một việc tốt cụ thể, không nêu đích danh người/nhà nào. Câu được chọn sẽ qua bộ lọc 4N và đội ngũ chiến dịch duyệt trước khi lên biển. |
| Banner báo tin vui (in-web) | 🎉 Câu của bạn đã được treo tại {vị trí}! Cảm ơn bạn đã thương xóm mình. |
| Share text — biển treo | Câu nhắc của xóm mình đã lên biển thật 🎉 "{câu nhắc}" — {vị trí}. Cùng viết câu thương cho xóm bạn tại Khu Phố Của Tôi nhé! |
| Share text — Đại sứ | Mình vừa được vinh danh trên bảng "Cây bút của khu phố" 🏆 Lên Khu Phố Của Tôi, viết câu nhắc cho xóm mình nha! |
| Share text — chứng nhận khu | {Tên khu phố} đã đạt "Khu phố biết thương" chuẩn 4N 💛 100% biển đã treo! |
| Checkbox opt-in | Tôi muốn nhận ưu đãi dành riêng cho cư dân khu phố biết thương từ FPT. |
| Chú thích checkbox (tầng 1) | Tuỳ chọn riêng, không ảnh hưởng đến câu nhắc của bạn. |
| Chú thích checkbox (tầng 2) | Không tick, không sao cả — câu nhắc của bạn vẫn được trân trọng như nhau. |
| Section lead — badge | 🧧 Món quà nhỏ cho người góp câu thương |
| Section lead — title | FPT muốn gửi lại xóm mình một điều dễ thương |
| Section lead — privacy | 🔒 Số điện thoại của bạn chỉ dùng để gửi ưu đãi này khi bạn chủ động đồng ý — không dùng cho bất kỳ mục đích nào khác, không tự động gọi mời. |
| Nút lead | Nhận ưu đãi của xóm mình |
| Footer support | Đang là khách FPT và cần hỗ trợ kỹ thuật? Gọi tổng đài **1900 6600** — không cần điền form này. |
| Panel biển đã treo | Biển đã treo tại đây · Cảm ơn cả khu phố đã cùng viết nên câu nhắc này 💛 |
| Cảnh báo form đề xuất | ⚠️ Danh mục đóng: chỉ nhận vấn đề an toàn đời thường. Mọi đề xuất hiển thị sau khi qua duyệt — đây là bước giữ trung lập và đúng mực. |
| Leaderboard title | 🏆 Cây bút của khu phố — Người viết câu nhắc được cả xóm thương nhất |
| Toast gửi câu thành công | Câu của bạn đã vào hàng chờ duyệt — cảm ơn bạn đã thương xóm mình 💛 |
| Empty state câu nhắc | Chưa có câu nào. Bạn viết câu đầu tiên cho điểm này nhé! |

## 3. Chuẩn 4N — Nhắc · Nhở · Nhỏ · Nhẹ (checklist duyệt thủ công)

**Đã chốt Q2: không có chấm tự động.** Chuẩn 4N là **checklist mà admin tick thủ công khi duyệt câu** (04-ADMIN-SPEC §3 — đủ 4 ô mới duyệt hiển thị). Phía người viết, 4 chip hiển thị tĩnh như gợi ý tự soát. Bảng dưới là **định nghĩa chuẩn để huấn luyện người duyệt**, đảm bảo các admin duyệt nhất quán.

### 3.1 Định nghĩa 4 tiêu chí (hướng dẫn người duyệt)

| Tiêu chí | Ý nghĩa | Luật kiểm tra gợi ý (MVP) |
|----------|---------|---------------------------|
| **Nhắc** | Có nội dung nhắc một hành vi cụ thể, tích cực | Chứa động từ hành vi (đi chậm, bỏ rác, khoá cửa, tắt bếp, chào, nhường...) + gắn với bối cảnh |
| **Nhở** | Giọng gợi nhớ nhẹ nhàng, không ra lệnh | Không chứa từ mệnh lệnh/cấm đoán gắt: "cấm", "phạt", "nghiêm cấm", "bắt buộc", "không được" |
| **Nhỏ** | Ngắn gọn, vừa một tấm biển | ≤ 120 ký tự, ≤ 2 mệnh đề |
| **Nhẹ** | Không công kích, không đích danh, không tiêu cực | Không tên riêng người/số nhà cụ thể ("nhà số 7", "ông X"); không từ xúc phạm; không đại từ chỉ trích ("mấy người", "cái bọn") |

Duyệt hiển thị = tick đủ cả 4. Phía client chỉ áp **ràng buộc kỹ thuật tối thiểu**: giới hạn 120 ký tự (tiêu chí Nhỏ) và chặn gửi rỗng — mọi đánh giá nội dung là của người duyệt.

### 3.2 Ví dụ chuẩn (huấn luyện người duyệt + demo)
Đạt: *"Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày."* · *"Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi."* · *"Ông bà đi chậm, mình chờ chút một — ngõ mình đâu có vội."* · *"Hẻm nhỏ, lòng người thì rộng — chạy chậm giùm nhau."*
Không đạt: *"Cấm đổ rác, phạt 500k"* (fail Nhở/Nhẹ) · *"Nhà số 7 đừng để xe chắn hẻm"* (fail Nhẹ — đích danh).

## 4. Taxonomy loại vấn đề
Xem 02-FUNCTIONAL-SPEC §2.1 — 8 loại đóng: Tốc độ, Trộm cắp, An toàn trẻ em, Chiếu sáng, Vệ sinh, Phòng cháy, Giúp nhau san sẻ, Ông bà người già.

## 5. Seed data demo (khớp design)
- Khu phố: Phường Bàn Cờ (certified 09/2026, 100%), Phường Lê Lợi, Hẻm chợ Xóm Mới.
- Issues: Tốc độ · Hẻm 42 Lê Lợi (voting, 2 câu, 34 thương) · Trộm cắp · Ngõ 7 Trần Phú (voting, 2 câu, 41 thương) · Phòng cháy · Khu trọ 88 Hai Bà Trưng (voting) · Vệ sinh · Cuối hẻm chợ Xóm Mới (signed — biển: "Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày.") · Giúp nhau, san sẻ · Ngách 12/3 Nguyễn Du (waiting, 0 câu) · Ông bà, người già · Đầu ngõ 7 Trần Phú (voting — câu "Ông bà đi chậm, mình chờ chút một — ngõ mình đâu có vội." — Hương, 18 thương).
- Leaderboard: Bà Liên 82đ (1 treo · 52 thương) · Anh Dũng 77đ (1 treo · 47 thương) · Chú Ba xe ôm 41đ · Cô Tám tạp hoá 34đ · Minh (lớp 11) 21đ. Khu phố tử tế nhất tháng: Phường Lê Lợi — 3 biển mới, 76 lượt thương.
- Counters khởi điểm demo: 2 · 5 · 7 · 5.



---

<!-- ===== PHẦN 8/9: 07-NFR-TECH.md ===== -->

# 📄 PHẦN 8: 07-NFR-TECH.md

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



---

<!-- ===== PHẦN 9/9: CLAUDE.md ===== -->

# 📄 PHẦN 9: CLAUDE.md

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
