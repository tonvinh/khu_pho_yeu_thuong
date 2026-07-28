# Nội dung, copy chuẩn & bộ lọc 4N
Phiên bản 1.1 — cập nhật wording 28/7/2026 theo `khupho_dieuchinh_28_7.xlsx` (bản khách duyệt)

---

## 1. Giọng điệu thương hiệu

- Ấm áp, gần gũi, "tình làng nghĩa xóm". Xưng hô: "xóm mình", "khu mình", "tụi mình" (FPT), "bạn".
- Động từ đặc trưng của chiến dịch: **"thương"** (thay cho like/vote).
- Không dùng ngôn ngữ chỉ trích, ra lệnh, doạ phạt. Không nêu đích danh người/nhà/số nhà cụ thể trong nội dung nhắc nhở.
- Emoji tiết chế: 💛 🧧 ✓, không lạm dụng.

## 2. Copy chuẩn (dùng nguyên văn — đã duyệt từ design, wording 28/7)

Nguồn: `khupho_dieuchinh_28_7.xlsx` (cột "TEXT MỚI"). Code tương ứng: `src/lib/copy.ts`.

| Vị trí | Copy |
|--------|------|
| Hero title | Muốn gửi một lời thương cho xóm mình? **Hãy viết một câu nhắc nhỏ nhẹ nhé!** |
| Hero body | Chọn một góc xóm, cùng mọi người gửi những câu nhắc dễ thương theo tinh thần 4N và bấm "Thương" để bình chọn. Câu được nhiều lượt "Thương" nhất sẽ được FPT đưa lên biển thật, nối tiếp hơn **10.000 lời nhắc** đã hiện diện khắp ngõ hẻm Việt Nam. |
| CTA chính | + Gửi lời nhắc cho xóm mình |
| CTA phụ | Xem góc phố đang chờ · 🧧 Quà dành cho cư dân |
| CTA toàn chiến dịch | Gửi một lời nhắc, thêm một chút thương cho xóm mình. |
| 4 counter labels | biển đã treo · góc phố đang chờ · người đóng góp · khu phố tham gia |
| Placeholder câu nhắc | VD: Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi... |
| Ghi chú 4N khi viết | Câu nhắc của bạn sẽ được FPT chúng tớ duyệt theo chuẩn 4N trước khi hiển thị lên website |
| Ghi chú đạo đức | 💛 Giữ cho dễ thương: gọi tên một việc tốt cụ thể, không nêu đích danh người/nhà nào. Câu được chọn sẽ qua bộ lọc 4N và đội ngũ chiến dịch duyệt trước khi lên biển. |
| Banner báo tin vui (in-web) | 🎉 Câu của bạn đã được treo tại {vị trí}! Cảm ơn bạn đã thương xóm mình. |
| Share text — biển treo | Câu nhắc của xóm mình đã lên biển thật 🎉 "{câu nhắc}" — {vị trí}. Cùng viết câu thương cho xóm bạn tại Khu Phố Của Tôi nhé! |
| Share text — Đại sứ | Mình vừa được vinh danh trên bảng "Cây bút của khu phố" 🏆 Lên Khu Phố Của Tôi, viết câu nhắc cho xóm mình nha! |
| Share text — chứng nhận khu | {Tên khu phố} đã đạt "Khu phố biết thương" chuẩn 4N 💛 100% biển đã treo! |
| Checkbox opt-in | Tôi đồng ý để FPT liên hệ tư vấn ưu đãi dành riêng cho cư dân "Khu phố biết thương". |
| Chú thích checkbox (tầng 1) | Tuỳ chọn riêng, không ảnh hưởng đến câu nhắc của bạn. |
| Chú thích checkbox (tầng 2) | *(bỏ — 28/7: không hiển thị chú thích dưới checkbox ở form ưu đãi)* |
| Section lead — badge | 🧧 Món quà nhỏ gửi người góp lời thương |
| Section lead — title | FPT muốn gửi lại xóm mình một điều dễ thương |
| Section lead — body | FPT dành riêng cho cư dân "Khu phố biết thương" những ưu đãi khi đăng ký Internet, Truyền hình và FPT Play. Khi muốn tìm hiểu thêm, bạn chỉ cần để lại thông tin để FPT liên hệ tư vấn. |
| Section lead — privacy | 🔒 Số điện thoại chỉ được sử dụng để tư vấn ưu đãi này khi có sự đồng ý của bạn, không dùng cho mục đích khác và không tự động gọi mời. |
| Nút lead | Nhận ưu đãi của xóm mình |
| Footer support | Đã là khách hàng của FPT và cần hỗ trợ kỹ thuật? Gọi **1900 6600**, không cần điền biểu mẫu này. |
| Footer chiến dịch | Một hoạt động thuộc chiến dịch "Khu phố biết thương" của FPT Telecom · *(xuống dòng)* Nhắc · Nhở · Nhỏ · Nhẹ |
| Panel biển đã treo | Biển đã treo tại đây · Cảm ơn cả khu phố đã cùng viết nên câu nhắc này 💛 |
| Cảnh báo form đề xuất | ⚠️ Khu Phố Của Tôi tiếp nhận những góp ý về an toàn và nếp sống khu phố. Mỗi đề xuất sẽ được xem xét trước khi hiển thị để lời nhắc luôn phù hợp và văn minh. |
| Leaderboard title | 🏆 Cây bút của khu phố — Những cây bút nhận được nhiều lượt "Thương" nhất từ bà con |
| Toast gửi câu thành công | Câu của bạn đã vào hàng chờ duyệt — cảm ơn bạn đã thương xóm mình 💛 |
| Empty state câu nhắc | Chưa có câu nào. Bạn viết câu đầu tiên cho điểm này nhé! |

### 2.1 Copy đặt trực tiếp trong component (cũng thuộc bản duyệt 28/7)

| Vị trí | Copy | File |
|--------|------|------|
| Nav top bar | Góc phố đang chờ · Quà dành cho cư dân | `HomeShell.tsx` |
| Section ví dụ biển — title/hint | Lời nhắc khi lên biển trông như thế nào? · Cùng ngắm qua vài mẫu minh họa với những câu nhắc chuẩn tinh thần 4N | `HomeShell.tsx` |
| Caption biển nổi bật | Được "Thương" nhiều nhất tuần này 🧡 · {vị trí} | `HomeShell.tsx` |
| Section danh sách — title/hint | Cùng đóng góp một câu cho khu phố của mình! · chọn một góc phố, để lại lời nhắn dễ thương và bình chọn cho lời thương ấm áp nhất | `HomeShell.tsx` |
| Nút đề xuất điểm mới | + Đề xuất khu phố mới | `HomeShell.tsx`, `IssueList.tsx` |
| Dòng khu phố của tháng | Khu phố dễ thương nhất tháng này: {tên} — {n} biển mới, {m} lượt thương. | `Leaderboard.tsx` |
| Thẻ chứng nhận — mô tả | Khi 100% lời nhắc đã hiện diện khắp các ngõ ngách, khu phố sẽ được gắn chứng nhận "Khu phố biết thương" chuẩn 4N. | `Leaderboard.tsx` |
| Nút chia sẻ chứng nhận | Chia sẻ ngay 💛 | `Leaderboard.tsx` |
| Tra cứu chứng nhận — label | Tra cứu: Xóm mình đã đạt chuẩn 4N chưa? | `Leaderboard.tsx` |
| Tra cứu — kết quả đã đạt | {tên khu} đã chính thức trở thành "Khu phố biết thương" chuẩn 4N từ ngày {dd/mm/yyyy}. | `Leaderboard.tsx` |
| Tra cứu — kết quả chưa đạt | {tên khu} còn thiếu biển để đạt chuẩn 4N. Hãy cùng góp thêm câu nhắc cho xóm mình! | `Leaderboard.tsx` |
| Form ưu đãi — label khu phố | Bạn đang ở khu phố nào? | `LeadSection.tsx` |
| Form ưu đãi — label quan tâm | Nhà mình đang muốn tìm hiểu dịch vụ nào? | `LeadSection.tsx` |
| Form ưu đãi — note định danh | Bạn sẽ xác thực số điện thoại một lần trước khi gửi để bảo vệ thông tin của mình. | `LeadSection.tsx` |
| Modal định danh — title/body | Để FPT gửi ưu đãi đến bạn 💛 · Chỉ cần để lại một vài thông tin. FPT sẽ liên hệ khi bạn đồng ý; số điện thoại được bảo mật và không hiển thị công khai. | `IdentifyModal.tsx` |
| Modal định danh — nút | Bắt đầu thôi | `IdentifyModal.tsx` |
| Drawer đề xuất — title/sub | Góp một điều xóm mình nên để ý · Chọn vấn đề bạn muốn viết lời nhắc | `ProposeModal.tsx` |
| Drawer đề xuất — label mô tả | Viết lời nhắc "thương" bạn muốn gửi cho góc phố này | `ProposeModal.tsx` |
| Drawer đề xuất — nút gửi | Gửi góp ý cho xóm mình | `ProposeModal.tsx` |

**Ghi chú biên tập khi áp bản 28/7** (đã sửa so với nguyên văn file Excel):
sửa lỗi chính tả "webiste" → "website" (ghi chú 4N); chuẩn hoá dấu nháy lệch `'thương"` → `"thương"` (label mô tả đề xuất);
giữ emoji 💛 ở nút "Chia sẻ ngay" theo ảnh đính kèm; nút đề xuất ở empty-state danh sách đồng bộ theo nút chính.

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
- Leaderboard: Bà Liên 82đ (1 treo · 52 thương) · Anh Dũng 77đ (1 treo · 47 thương) · Chú Ba xe ôm 41đ · Cô Tám tạp hoá 34đ · Minh (lớp 11) 21đ. Khu phố dễ thương nhất tháng này: Phường Lê Lợi — 3 biển mới, 76 lượt thương.
- Counters khởi điểm demo: 2 · 5 · 7 · 5.
