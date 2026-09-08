# 17 — Cẩm nang vận hành admin

> Cập nhật: 8/9/2026 — đồng bộ với code sau các đợt 18/8, 2–4/9, 7/9.
> Dành cho **đội vận hành chiến dịch**, không cần biết code. Đặc tả gốc: `04-ADMIN-SPEC.md`. Tiêu chí 4N: `06-CONTENT-COPY.md` §3.
>
> **Menu hiện có 7 mục**: 📊 Dashboard · 🏘️ Khu phố · ✍️ Lời nhắc · 💛 Theo dõi thương · 🧧 Leads ·
> 📝 Nội dung · 🛡️ Chống gian lận. Ba màn cũ đã **gộp/xoá**: duyệt đề xuất → tab trong *Khu phố*;
> vòng đời biển → tab trong *Lời nhắc*; **Bản đồ & pin** và **Sổ cái điểm** không còn.

## 0. Đăng nhập & nguyên tắc chung

- Địa chỉ: `https://khupho.ailab.city/admin` (hoặc domain đang dùng) → tự chuyển sang `/admin/login`.
- Tài khoản là **email đuôi `@fpt.com`** + mật khẩu ≥12 ký tự. Không có form tự đăng ký — tài khoản do kỹ thuật tạo bằng lệnh `pnpm create-admin`.
- Sai 5 lần liên tiếp → **khoá 15 phút**. Nếu bật 2FA, sau mật khẩu sẽ có bước nhập mã 6 số (mã sống 5 phút).
- Phiên đăng nhập **8 giờ, không tự gia hạn** — hết giờ phải đăng nhập lại. Đây là chủ ý bảo mật.
- Ba việc **không thể hoàn tác bằng giao diện**: xác nhận **đã treo biển**, **export CSV leads**, **hiện số điện thoại**. Hai việc sau đều bị ghi nhật ký.

Ba nguyên tắc nghề nghiệp:

1. **Không có gì lên công khai trước khi bạn duyệt.** Người dân đã được báo là "chờ duyệt" — cứ duyệt kỹ, đừng vội.
2. **Xử lý gian lận thì im lặng.** Không nhắn, không cảnh cáo, không giải thích cho người vi phạm.
3. **Từ chối phải có lý do nội bộ.** Lý do không hiển thị cho người dân nhưng là căn cứ khi có khiếu nại.

---

## 1. Dashboard (`/admin`)

| Khối | Đọc thế nào |
|---|---|
| 3 KPI công khai | Giống hệt số trên trang chủ: **biển đã treo · khu phố · câu đóng góp** |
| 4 KPI vận hành | **Đề xuất chờ duyệt · Câu chờ duyệt · Đã chọn chưa sản xuất · Đang sản xuất** — đây là hàng chờ công việc của bạn |
| Thương mại | Lead tầng 1/tầng 2 và trạng thái new/contacted/converted (chỉ admin thấy) |
| Biểu đồ theo ngày | Câu nhắc · lượt thương · lead. Lọc được **7 / 30 / 90 ngày**, theo khu phố và chủ đề; kỳ so sánh là cùng độ dài liền trước. Leads và cư dân mới không có chủ đề, leads không gắn khu phố ⇒ hai khối đó bỏ qua bộ lọc tương ứng |

**Thói quen hằng ngày:** mở dashboard → nếu "Đề xuất chờ duyệt" hoặc "Câu chờ duyệt" > 0 thì xử lý trước; sau đó xem "Đã chọn chưa sản xuất" để thúc tiến độ biển.

---

## 2. Duyệt đề xuất góc xóm (`/admin/khu-pho?tab=de-xuat`)

Đây là bước 3a: quyết định một góc xóm có được mở cho cả xóm viết câu nhắc hay không.

**4 tiêu chí (hiển thị sẵn trên màn hình):**

1. Thuộc danh mục an toàn/nếp sống đời thường.
2. **Không đích danh người/nhà nào.**
3. Vị trí đủ cụ thể (ngõ/hẻm/ngách, không phải "cả phường").
4. Không trùng vấn đề đã có trong khu.

| Hành động | Hậu quả |
|---|---|
| **Duyệt** | Góc xóm hiện công khai ở trạng thái **"Đang chờ"**; người đề xuất được **+2 điểm** (nếu chưa vượt trần 3 đề xuất/tuần). Khu phố do dân tự nhập cũng **hiện công khai** từ đây |
| **Từ chối** | Ẩn vĩnh viễn khỏi công khai; nhập lý do nội bộ (bắt buộc về mặt quy trình, dù hệ thống không ép) |

Ví dụ nên từ chối: *"Nhà số 12 hay mất đồ, nghi người trong xóm lấy — đề nghị gắn camera theo dõi nhà bên cạnh."* → vi phạm tiêu chí 2, dễ gây mâu thuẫn hàng xóm.

Từ chối cũng **kéo theo câu nhắc gửi kèm** (nếu đề xuất cũ có) sang "Từ chối" — bạn không phải xử lý
riêng, và câu đó cũng không kẹt lại trong hàng chờ.

~~Sau khi duyệt, nhớ sang **Bản đồ** để đặt pin~~ — **không còn bước này**: trang chủ đã bỏ bản đồ
từ 1/8, góc xóm duyệt xong là hiện ngay trong khối "Đóng góp một câu".

> Tab này xem được **mọi trạng thái**, không chỉ hàng chờ. Có bộ lọc chủ đề / khu phố / tỉnh-thành,
> ô tìm kiếm và phân trang; con số trên tab đếm theo đúng bộ lọc đang chọn.

---

## 3. Duyệt câu nhắc — checklist 4N (`/admin/loi-nhac`)

**Đây là chốt chặn quan trọng nhất của cả chiến dịch.** Hệ thống **không** chấm điểm tự động: nút "Duyệt hiển thị" chỉ bật khi bạn tự tay tick đủ 4 ô, và server kiểm tra lại lần nữa.

| Tiêu chí | Ý nghĩa | Duyệt khi | Trượt khi |
|---|---|---|---|
| **Nhắc** | Nhắc một **hành vi cụ thể, tích cực** | "Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi." | Khẩu hiệu chung chung: "Hãy nâng cao ý thức chấp hành, xây dựng nếp sống văn minh đô thị." |
| **Nhở** | Giọng **gợi nhớ nhẹ nhàng**, không ra lệnh | "Khoá cửa cẩn thận nha, đi đâu cũng an tâm hơn." | Mệnh lệnh/doạ: "CẤM TRỘM CẮP! VI PHẠM SẼ BỊ BÁO CÔNG AN XỬ LÝ NGHIÊM." |
| **Nhỏ** | ≤120 ký tự, ≤2 mệnh đề — **vừa một tấm biển** | Câu ngắn, đọc một hơi | Câu dài lê thê, nhiều vế nối |
| **Nhẹ** | Không công kích, **không đích danh người/nhà**, không tiêu cực | "Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày." | "Ai lấy đồ nhà số 12 thì tự giác đem trả lại đi!" |

Màn hình hiển thị sẵn số ký tự (`n/120`), tên tác giả, góc xóm, khu phố và thời gian gửi.

| Hành động | Hậu quả |
|---|---|
| **Duyệt hiển thị** (đủ 4 ô) | Câu hiện công khai và **mở bình chọn**; tác giả **+5 điểm**; góc xóm chuyển "Đang chờ" → **"Đang bình chọn"** |
| **Từ chối** | Câu ẩn vĩnh viễn; nhập lý do nội bộ |

Mẹo thực hành: đọc to câu lên. Nếu nghe như **hàng xóm nói với hàng xóm** thì thường đạt; nếu nghe như **loa phường hoặc bảng cấm** thì trượt.

---

## 4. Chọn câu & vòng đời biển (`/admin/loi-nhac?tab=bien`)

Ba khối tương ứng ba giai đoạn.

### 4.1 "Đang bình chọn — chọn câu lên biển"

Các câu đã duyệt được nhóm **theo từng góc xóm**, xếp giảm dần theo số lượt thương.

- Câu cao phiếu nhất: nút **"Chọn câu này lên biển"** — bấm là xong.
- Câu khác: nút **"Chọn (cần lý do)"** — hệ thống **bắt buộc nhập lý do** (ví dụ: câu cao phiếu nhất có rủi ro nội dung, trùng biển đã có, hoặc quá dài khi in). Lý do được lưu vĩnh viễn để giải trình.

Chọn xong → câu chuyển trạng thái **"Đã chọn"**. Trang công khai chưa đổi gì.

### 4.2 "Đã chọn → đưa sản xuất"

Khi đã gửi file cho xưởng in/gia công, bấm **"Đưa sản xuất"** → trạng thái **"Đang sản xuất"**. Bước này thuần theo dõi tiến độ.

### 4.3 "Đang sản xuất → đã treo biển"

Chỉ bấm khi **biển đã thật sự treo ngoài đời**. Trước khi bấm:

1. Upload **ảnh biển thật** (nút "Ảnh biển…") — ảnh này hiện trên trang share `/bien/{id}`.
2. Chọn **ngày treo** (bỏ trống = hôm nay) — ô ngày **riêng cho từng dòng**, nhập ở dòng nào áp cho dòng đó.
3. Bấm **"Đã treo biển"**.

Hệ thống lập tức và **không thể hoàn tác bằng giao diện**:

- Góc xóm chuyển **"Đã có biển"**.
- Bộ đếm "biển đã treo" +1.
- Tác giả câu **+30 điểm**.
- Tạo **banner báo tin vui in-web** cho tác giả kèm link chia sẻ `/bien/{id}` (**không có SMS** — đúng quyết định Q1).

---

## 5. Khu phố (`/admin/khu-pho`)

- Danh sách khu phố kèm thanh tiến độ `signed/total biển · %`.
- **Thêm khu phố mới**: gõ tên + **chọn Tỉnh/thành phố** và **Phường/Xã** từ danh mục chính quy
  (34 tỉnh · 3.321 phường/xã, hiệu lực 1/7/2025 — **không còn quận/huyện**). Hệ thống tự sinh slug.
  Trùng tên → báo lỗi; nếu tên đó thuộc khu **đã xoá** thì hệ thống nói rõ *"vào tab 🗑 Đã xoá để
  khôi phục thay vì tạo mới"*.
- **Import file**: nút "📥 Import file" nhận Excel/CSV **3 cột** `Tên khu phố | Tỉnh/Thành phố |
  Phường/Xã`, có nút tải template. Quy trình validate → commit, **tất cả hoặc không gì cả**.
- **Ảnh**: tối đa **4 ảnh tổng quan** cho mỗi khu (trang chủ chỉ dùng ảnh #1) + tối đa **1 ảnh
  chứng nhận**. Hệ thống tự cắt ảnh tổng quan về cùng cỡ nên slider không bị nhấp nhô.

### 5.1 Ba công tắc — bật/tắt tự do (từ 7/9)

| Công tắc | Tác dụng |
|---|---|
| **Hiển thị website** | Khu phố có xuất hiện trên web hay không |
| **Khu phố tiêu biểu** | Đưa khu vào **slider ở đầu trang chủ** |
| **Đạt chuẩn 4N** | Gắn chứng nhận "Khu phố biết thương" |

~~Trước đây: bật tiêu biểu bắt buộc khu đang hiển thị; ẩn website thì tiêu biểu tự tắt theo;
chứng nhận 4N chỉ bật được khi 100% biển đã treo.~~ **Nay cả ba bật/tắt độc lập.**

Lý do bỏ điều kiện 4N: chứng nhận là **quyết định vận hành** của ban tổ chức (có buổi trao biển
ngoài đời), không phải hệ quả tự động của dữ liệu trên web. Màn hình vẫn hiện tiến độ biển để bạn
tham khảo.

⚠️ Khu đang **ẩn** mà bạn bật "tiêu biểu" thì cờ vẫn được lưu **nhưng khu chưa ra slider** — trang
công khai vẫn lọc khu đang ẩn. Tooltip trên màn hình có nhắc điều này.

Cấp nhầm chứng nhận thì **tắt lại được ngay trên giao diện** (thu hồi không xoá ảnh chứng nhận).

### 5.2 Vị trí slide — 10 slot

Cột **"Vị trí tiêu biểu"** là **slot slide của trang chủ**, đúng **10 chỗ (1–10)** và **không trùng nhau**.

- Bỏ cờ "tiêu biểu" ⇒ khu tự nhả slot.
- Xếp một khu vào slot đang có khu khác giữ ⇒ hệ thống **đổi chỗ hai khu**, không báo lỗi. Thông báo
  nói rõ chuyện gì vừa xảy ra:

| Trường hợp | Bạn sẽ thấy |
|---|---|
| Slot còn trống | *Đã xếp vào slot slide số N ✓* |
| Khu vừa xếp đang giữ slot khác | *đổi chỗ với "X" (giờ ở slot cũ)* |
| Khu vừa xếp chưa có slot nào | *"X" bị đẩy ra khỏi 10 slot* |

### 5.3 Xoá khu phố = **xoá mềm**, khôi phục được

- Nút **🗑 Xoá** không xoá dữ liệu: khu phố chuyển sang tab **🗑 Đã xoá**, đồng thời bị ẩn khỏi
  website, tắt tiêu biểu và nhả slot.
- Khu đã xoá **biến mất cả cụm khỏi web**: trang chủ, ô tra cứu 4N, danh sách góc phố, khối biển,
  popup khu phố, link chia sẻ `/khu-pho/…` (báo 404) và cả ảnh preview khi chia sẻ.
- **Điểm, lượt thương và câu nhắc KHÔNG bị xoá.** Bấm khôi phục là mọi thứ trở lại nguyên trạng —
  nhưng khu về trạng thái **ẩn**, bạn kiểm rồi mới bật hiển thị.
- Khu đã xoá **không sửa được** — phải khôi phục trước.

## 6. ~~Trình quản lý bản đồ~~ — KHÔNG CÒN

Trang chủ đã bỏ bản đồ từ 1/8 (thay bằng slider ảnh khu phố), nên màn bản đồ & đặt pin **không còn
trong hệ thống**. Ảnh khu phố nay quản lý ngay ở màn Khu phố (§5): 4 ảnh tổng quan + 1 ảnh chứng nhận.

Ảnh nên chụp ngang, rõ bối cảnh, **không có mặt người nhận diện được**.

## 6b. Nội dung trang chủ (`/admin/noi-dung`)

Sửa được **13 khối chữ** của trang chủ: tiêu đề + mô tả hero, placeholder ô tra cứu, tiêu đề + mô tả
khối đóng góp, tiêu đề khối biển, tiêu đề + mô tả + dòng bảo mật của khối ưu đãi, và 4 dòng chân trang.

- Để **trống** một ô (hoặc gõ đúng y như bản mặc định) = **quay về bản gốc**.
- Mỗi lần lưu đều ghi nhật ký (`site_content_update`).
- Khối "Câu chuyện chiến dịch / video TVC / ảnh KV" và các dòng khuyến mãi trên biển **đã gỡ khỏi
  màn này** cùng lúc với việc gỡ khỏi trang chủ — không còn ô nào sửa thứ không hiển thị ở đâu.

## 6c. Theo dõi thương (`/admin/voting`)

Sửa **số lượt thương** của một câu nhắc hoặc của một người.

- Tăng ⇒ hệ thống thêm phiếu do admin ghi; giảm ⇒ gỡ phiếu admin trước, hết mới vô hiệu phiếu cư dân
  mới nhất (người đã bấm vẫn thấy "đã bình chọn" như cũ).
- **Điểm đi kèm luôn được cộng/thu hồi tương ứng** — không cần chỉnh tay chỗ nào khác.
- **Mỗi lần chỉnh đều ghi nhật ký** (`votes_adjust`, kèm số cũ → số mới). Đây là hành động nhạy cảm
  ngang với việc hiện số điện thoại lead — chỉ dùng khi có lý do vận hành rõ ràng.

⚠️ Mẹo thao tác: sau khi lưu, thanh thông báo tự ẩn sau 6 giây làm **trôi cả bảng** — đừng bấm theo
thói quen vị trí cũ, hãy tìm lại đúng dòng trước khi bấm tiếp.

## 7. Leads (`/admin/leads`)

Danh sách **chỉ gồm người đã tick đồng ý** (`opt-in`). Người để lại SĐT nhưng không tick **không bao giờ** vào đây.

| Cột | Ghi chú |
|---|---|
| SĐT | Hiển thị dạng `090***567`. **Bấm mới hiện đầy đủ — mỗi lần bấm đều ghi nhật ký ai xem, lúc nào** |
| Tỉnh/thành · Địa chỉ | Hai cột mới (18/8) — **lọc được theo tỉnh** cho sale chia vùng, CSV cũng xuất 2 cột này |
| Nguồn | *Tầng 1 (drawer)* = tick khi viết câu nhắc · *Tầng 2 (ưu đãi)* = điền form cuối trang |
| Quan tâm | Dịch vụ người dùng chọn |
| Trạng thái | `Mới → Đã liên hệ → Chuyển đổi / Đóng` — cập nhật ngay trên bảng |

**Export CSV**: nút góc phải, file UTF-8 mở bằng Excel không lỗi font. **Mỗi lần export đều ghi nhật ký kèm số lượng bản ghi.**

Cam kết đã công bố với người dân — đội sale phải tuân thủ:

- Chỉ liên hệ **đúng mục đích tư vấn ưu đãi** người dùng đã đồng ý.
- **Không tự động gọi mời**, không chuyển số cho bên thứ ba.
- Khách yêu cầu xoá dữ liệu (qua **1900 6600**) → chuyển ngay cho kỹ thuật xử lý.
- Khách đã là thuê bao cần hỗ trợ kỹ thuật → hướng dẫn gọi 1900 6600, không đưa vào luồng lead.

---

## 8. Chống gian lận (`/admin/gian-lan`)

Ba nhóm cảnh báo tự động:

| Cảnh báo | Nghĩa là gì | Xử lý gợi ý |
|---|---|---|
| **Cụm tài khoản cùng IP** (≥3 tài khoản/24h) | Có thể là quán net, nhà đông người… **hoặc** một người tạo nhiều tài khoản | Xem tên và hành vi trước khi hành động. Nhà đông người là bình thường |
| **Nhận thương hàng loạt từ tài khoản mới** (≥10 phiếu, tài khoản <48h) | Dấu hiệu điển hình của cày phiếu | Kiểm tra sổ cái điểm của người đó rồi cân nhắc shadow-ban |
| **Tốc độ vote bất thường** (≥20 phiếu/giờ) | Bấm máy móc hoặc script | "Vô hiệu phiếu" trước, theo dõi tiếp |

Ba hành động:

| Nút | Làm gì | Người bị xử lý thấy gì |
|---|---|---|
| **Shadow-ban** | Từ giờ phiếu và điểm của người đó không được tính; biến mất khỏi bảng xếp hạng | **Không thấy gì cả** — giao diện y hệt bình thường |
| **Bỏ ban** | Khôi phục | Không thấy gì |
| **Vô hiệu phiếu** | Huỷ toàn bộ phiếu người đó đã bấm và điểm tương ứng đã cộng cho người khác | Số lượt thương của vài câu giảm xuống |

**Tuyệt đối không** nhắn tin, bình luận hay cảnh cáo người bị xử lý. Im lặng là một phần của biện pháp.

---

## 9. ~~Sổ cái điểm (`/admin/diem`)~~ — CHƯA CÓ MÀN HÌNH

Màn sổ cái điểm **không tồn tại trong hệ thống**. Khi cần giải trình trước lúc trao giải:

- Xem tab **"Cây bút của khu phố"** trên trang chủ (top 10 theo điểm, đã tự loại tài khoản shadow-ban).
- Đối chiếu với màn **Chống gian lận** (§8) và **Theo dõi thương** (§6c).
- Cần bảng điểm chi tiết từng lần cộng ⇒ **nhờ kỹ thuật truy vấn** bảng `score_events`.

Công thức không đổi: `2×đề xuất duyệt + 5×câu 4N duyệt + 1×lượt thương + 30×câu treo`.

## 10. Import từ file

Không còn màn `/admin/import` riêng — mỗi màn có nút **"📥 Import file"** của mình, kèm nút tải
template đúng định dạng. Nhận cả **`.xlsx` lẫn `.csv`**.

### 10.1 Import khu phố (nút ở màn **Khu phố**)

Template 3 cột: `Tên khu phố` · `Tỉnh/Thành phố` · `Phường/Xã` — tỉnh và phường phải **đúng tên
trong danh mục chính quy** (34 tỉnh · 3.321 phường/xã, hiệu lực 1/7/2025).

Lỗi hay gặp: tên trùng khu đã có · tên trùng **khu đã xoá** (hệ thống bảo bạn vào tab 🗑 Đã xoá để
khôi phục) · sai tên tỉnh/phường.

### 10.2 Import lời nhắc (nút ở màn **Lời nhắc**)

Template 5 cột: `Câu (≤120 ký tự)` · `Tên khu phố (đã có trong hệ thống)` · `Vị trí treo biển` ·
`Chủ đề (mã hoặc tên)` · `Người đăng`.

- Câu import **coi như đã duyệt** (4N tick đủ) và **không cộng điểm cho ai** — đây là dữ liệu nhập hộ.
- Góc phố chưa có thì hệ thống tạo mới rồi mở bình chọn; người đăng chưa có thì tạo cư dân mới
  (không có số điện thoại thật).

### 10.3 Quy trình chung — 3 bước

1. Chọn file.
2. **Validate & Preview** — báo lỗi **theo từng dòng**.
3. **Commit** — nút chỉ bật khi **sạch lỗi**. Ghi **tất cả hoặc không ghi gì**.

Việc import có ghi nhật ký.

## 11. Nhịp vận hành gợi ý

| Tần suất | Việc |
|---|---|
| **Hằng ngày** | Dọn sạch 2 hàng chờ: đề xuất + câu nhắc 4N. Trả lời hàng chờ trong ngày để người dân không nản |
| **2–3 lần/tuần** | Xem `/admin/loi-nhac?tab=bien`: chọn câu cho những góc xóm đã đủ lượt thương; thúc sản xuất |
| **Hằng tuần** | Lướt `/admin/gian-lan`; cập nhật trạng thái leads; kiểm tra **ảnh + slot slide** của khu phố mới |
| **Khi treo biển xong** | Upload ảnh biển + xác nhận "Đã treo biển" **ngay trong ngày** (người dân đang chờ banner báo tin vui) |
| **Hằng tháng** | Đối soát sổ cái điểm, chốt "Khu phố dễ thương nhất tháng", rà khu phố nào sắp đạt 100% để chuẩn bị lễ trao chứng nhận |
