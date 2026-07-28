# 17 — Cẩm nang vận hành admin

> Dành cho **đội vận hành chiến dịch**, không cần biết code. Đặc tả gốc: `04-ADMIN-SPEC.md`. Tiêu chí 4N: `06-CONTENT-COPY.md` §3.

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
| 4 KPI công khai | Giống hệt số trên trang chủ: biển đã treo · góc phố đang chờ · người đóng góp · khu phố tham gia |
| 4 KPI vận hành | **Đề xuất chờ duyệt · Câu chờ duyệt · Đã chọn chưa sản xuất · Đang sản xuất** — đây là hàng chờ công việc của bạn |
| Thương mại | Lead tầng 1/tầng 2 và trạng thái new/contacted/converted (chỉ admin thấy) |
| Biểu đồ 14 ngày | 3 cột mỗi ngày: câu nhắc · lượt thương · lead. Dùng để thấy nhịp chiến dịch, phát hiện ngày bất thường |

**Thói quen hằng ngày:** mở dashboard → nếu "Đề xuất chờ duyệt" hoặc "Câu chờ duyệt" > 0 thì xử lý trước; sau đó xem "Đã chọn chưa sản xuất" để thúc tiến độ biển.

---

## 2. Duyệt đề xuất góc xóm (`/admin/de-xuat`)

Đây là bước 3a: quyết định một góc xóm có được mở cho cả xóm viết câu nhắc hay không.

**4 tiêu chí (hiển thị sẵn trên màn hình):**

1. Thuộc danh mục an toàn/nếp sống đời thường.
2. **Không đích danh người/nhà nào.**
3. Vị trí đủ cụ thể (ngõ/hẻm/ngách, không phải "cả phường").
4. Không trùng vấn đề đã có trong khu.

| Hành động | Hậu quả |
|---|---|
| **Duyệt** | Góc xóm hiện công khai với pin **đỏ "Đang chờ"**; người đề xuất được **+2 điểm** (nếu chưa vượt trần 3 đề xuất/tuần) |
| **Từ chối** | Ẩn vĩnh viễn khỏi công khai; nhập lý do nội bộ (bắt buộc về mặt quy trình, dù hệ thống không ép) |

Ví dụ nên từ chối: *"Nhà số 12 hay mất đồ, nghi người trong xóm lấy — đề nghị gắn camera theo dõi nhà bên cạnh."* → vi phạm tiêu chí 2, dễ gây mâu thuẫn hàng xóm.

Sau khi duyệt, nhớ sang **Bản đồ** để đặt pin cho góc xóm đó (§6) — chưa có pin thì góc xóm không xuất hiện trên bản đồ, chỉ nằm trong danh sách.

---

## 3. Duyệt câu nhắc — checklist 4N (`/admin/cau-nhac`)

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
| **Duyệt hiển thị** (đủ 4 ô) | Câu hiện công khai và **mở bình chọn**; tác giả **+5 điểm**; góc xóm chuyển "Đang chờ" → **"Đang bình chọn"** (pin cam) |
| **Từ chối** | Câu ẩn vĩnh viễn; nhập lý do nội bộ |

Mẹo thực hành: đọc to câu lên. Nếu nghe như **hàng xóm nói với hàng xóm** thì thường đạt; nếu nghe như **loa phường hoặc bảng cấm** thì trượt.

---

## 4. Chọn câu & vòng đời biển (`/admin/bien`)

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

1. Upload **ảnh biển thật** (nút "Ảnh biển…") — ảnh này hiện trên trang share và trong drawer góc xóm.
2. Chọn **ngày treo** (bỏ trống = hôm nay).
3. Bấm **"Đã treo biển"**.

Hệ thống lập tức và **không thể hoàn tác bằng giao diện**:

- Góc xóm chuyển **"Đã có biển"**, pin đổi **xanh lá**.
- Bộ đếm "biển đã treo" +1.
- Tác giả câu **+30 điểm**.
- Tạo **banner báo tin vui in-web** cho tác giả kèm link chia sẻ `/bien/{id}` (**không có SMS** — đúng quyết định Q1).

---

## 5. Khu phố & chứng nhận (`/admin/khu-pho`)

- Danh sách khu phố kèm thanh tiến độ `signed/total biển · %`.
- **Thêm khu phố mới**: gõ tên → hệ thống tự sinh slug (bỏ dấu). Trùng tên → báo lỗi.
- **Cấp chứng nhận 4N**: nút chỉ xuất hiện khi khu phố đạt **100% biển đã treo** (và có ít nhất 1 vấn đề). Cấp xong khu phố được huy hiệu 🏅 trên bản đồ, trang chủ và có trang share `/khu-pho/{slug}`.
- Nếu cấp nhầm, kỹ thuật có thể thu hồi qua API (`{"revoke": true}`) — chưa có nút trên giao diện.

⚠️ Lưu ý nghiệp vụ: mẫu số là **tất cả vấn đề đã duyệt** của khu. Duyệt thêm một đề xuất mới sau khi đã chứng nhận sẽ làm tỉ lệ tụt xuống dưới 100% (nhưng **không** tự thu hồi chứng nhận đã cấp).

---

## 6. Trình quản lý bản đồ (`/admin/khu-pho/{id}/ban-do`)

### 6.1 Upload ảnh bản đồ

- Nhận jpg/png/webp, tối đa **10MB**.
- Hệ thống lưu **hai bản**: bản gốc (chỉ admin xem được) và **bản cách điệu** (duotone kem–đỏ gạch) — người dân **chỉ thấy bản cách điệu**.
- Sau khi upload, màn hình hiện đúng bản cách điệu để bạn kiểm tra trước khi công khai.
- Có link **"Xem ảnh gốc (chỉ admin)"** khi cần đối chiếu.

### 6.2 Đặt pin

1. Ở danh sách "Vấn đề trong khu", bấm **"Đặt pin"** ở dòng cần đặt → con trỏ thành dấu cộng.
2. Click đúng vị trí trên ảnh bản đồ → toạ độ lưu theo **phần trăm**, báo lại ví dụ "Đã đặt pin tại 35.4%, 60.1%".
3. Muốn sửa: bấm **"Đặt lại pin"** rồi click chỗ mới.

⚠️ **Thay ảnh bản đồ không xoá pin.** Vì pin lưu theo %, ảnh mới có bố cục khác sẽ làm pin lệch — hệ thống nhắc bạn kiểm tra lại, hãy rà từng pin sau khi thay ảnh.

### 6.3 Ảnh địa điểm

Mỗi vấn đề có thể gắn **ảnh thật của góc xóm** — người dân bấm pin sẽ thấy ảnh này ở đầu drawer. Ảnh nên chụp ngang, rõ bối cảnh, **không có mặt người nhận diện được**.

---

## 7. Leads (`/admin/leads`)

Danh sách **chỉ gồm người đã tick đồng ý** (`opt-in`). Người để lại SĐT nhưng không tick **không bao giờ** vào đây.

| Cột | Ghi chú |
|---|---|
| SĐT | Hiển thị dạng `090***567`. **Bấm mới hiện đầy đủ — mỗi lần bấm đều ghi nhật ký ai xem, lúc nào** |
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

## 9. Sổ cái điểm (`/admin/diem`)

Dùng để **giải trình khi trao giải Đại sứ**.

- Cột trái: xếp hạng theo điểm, **bao gồm cả tài khoản đã shadow-ban** (có nhãn đỏ).
- Bấm một người → cột phải hiện từng lần cộng điểm: loại, số điểm, ngày. Event đã bị vô hiệu hiện **gạch ngang, mờ**.
- Công thức in sẵn trên màn: `2×đề xuất duyệt + 5×câu 4N duyệt + 1×lượt thương + 30×câu treo`.

Trước khi công bố giải: đối chiếu top 10 với màn chống gian lận (§8) và xử lý xong các cảnh báo còn tồn.

---

## 10. Bulk import khu phố (`/admin/import`)

Dùng khi khởi động chiến dịch với danh sách khu phố pilot.

**Chuẩn bị file** — dùng đúng `docs/import-template.xlsx`, 2 sheet:

| Sheet `KhuPho` | Sheet `VanDe` |
|---|---|
| `ten`, `phuong`, `quan`, `thanhpho`, `anh_ban_do`, `anh_khu_pho` | `ten_khu_pho`, `loai`, `vi_tri`, `mo_ta`, `pin_x`, `pin_y`, `anh_dia_diem` |

- `loai` phải là 1 trong 8 mã: `toc_do`, `trom_cap`, `an_toan_tre_em`, `chieu_sang`, `ve_sinh`, `phong_chay`, `giup_nhau`, `nguoi_gia`.
- `pin_x`, `pin_y` là số **0–100** (phần trăm), có thể bỏ trống rồi đặt pin sau bằng chuột.
- `ten_khu_pho` ở sheet VanDe phải **khớp chính xác** tên ở sheet KhuPho.
- Ảnh: nén tất cả vào 1 file `.zip`, **tên file phải khớp** giá trị ghi trong ô Excel. Không có zip cũng được — bổ sung ảnh sau qua trình quản lý bản đồ.

**Quy trình 3 bước:**

1. Chọn file Excel (+ zip ảnh nếu có).
2. **Validate & Preview** — hệ thống báo lỗi **theo từng dòng**: thiếu trường, trùng tên trong file, trùng tên với dữ liệu đã có, sai mã danh mục, pin ngoài 0–100, thiếu ảnh trong zip.
3. **Commit** — nút chỉ bật khi **sạch lỗi**. Ghi **tất cả hoặc không ghi gì** (all-or-nothing).

Sau import: các vấn đề vào thẳng trạng thái **"Đang chờ"** (admin nhập ⇒ coi như đã duyệt) và **không sinh điểm** cho ai. Việc còn lại là upload/đặt pin và chờ người dân viết câu.

---

## 11. Nhịp vận hành gợi ý

| Tần suất | Việc |
|---|---|
| **Hằng ngày** | Dọn sạch 2 hàng chờ: đề xuất + câu nhắc 4N. Trả lời hàng chờ trong ngày để người dân không nản |
| **2–3 lần/tuần** | Xem `/admin/bien`: chọn câu cho những góc xóm đã đủ lượt thương; thúc sản xuất |
| **Hằng tuần** | Lướt `/admin/gian-lan`; cập nhật trạng thái leads; kiểm tra pin của khu phố mới |
| **Khi treo biển xong** | Upload ảnh biển + xác nhận "Đã treo biển" **ngay trong ngày** (người dân đang chờ banner báo tin vui) |
| **Hằng tháng** | Đối soát sổ cái điểm, chốt "Khu phố dễ thương nhất tháng", rà khu phố nào sắp đạt 100% để chuẩn bị lễ trao chứng nhận |
