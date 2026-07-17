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
