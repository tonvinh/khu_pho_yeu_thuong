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
