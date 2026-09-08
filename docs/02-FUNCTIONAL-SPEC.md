# Đặc tả chức năng — Website "Khu Phố Của Tôi"
Phiên bản 1.0 · ~~Tham chiếu design: `Khu Pho Yeu Thuong.dc.html`~~
→ **Nguồn design chuẩn từ 4/9: `docs/lp/LandingpageFCM.fig` trong repo** (xem `16-FRONTEND-UI.md`).

> Cập nhật: 8/9/2026 — đồng bộ với code sau các đợt 18/8, 2–4/9, 7/9.
> **Quy ước đọc file này**: phần gạch ngang `~~…~~` là đặc tả gốc **đã bị thay** (giữ lại để biết
> vì sao từng làm vậy), phần in đậm phía sau là hành vi **đang chạy**. Khi đặc tả và design mâu
> thuẫn, PM đã chốt 2/9: **DESIGN THẮNG SPEC** (danh sách 4 khối chữ bị gỡ: `20` §2.1).

---

## 0. Cấu trúc trang chủ (một trang, mobile-first)

**Thứ tự section ĐANG CHẠY** (khớp `.fig` 2/9 — mô tả chi tiết ở `16` §2):

1. **Top bar cam**: 2 link nav (`Đóng góp lời nhắc` cuộn `#goc-xom` · `Đề xuất khu phố cần treo biển`
   mở popup đề xuất — chỉ hiện từ 1280px), pill logo tròn ở giữa, CTA `Ưu đãi dành cho cư dân`
   cuộn `#uu-dai`, avatar (chỉ khi đã định danh).
2. **Hero cam**: tiêu đề IN HOA + mô tả · **slider khu phố tiêu biểu** (§6b) · KV khu phố 3D ·
   **ô tra cứu 4N** (§6c).
3. **Dải 3 con số**: `Biển đã treo` · `Khu phố` · `Câu đóng góp`.
4. **Khối "Đóng góp một câu cho khu phố mình nhé"** (`IssueBoard`) — 3 tab (§2).
5. **Khối 6 biển mới** (`SignGallery`) — biển render bằng HTML/CSS.
6. **Khối ưu đãi cư dân** — lead tầng 2 (§7.2).
7. **Footer**: 4 dòng chữ (hotline 1900 6600, link chính sách dữ liệu, credit chiến dịch).

Ngoài luồng: nút nổi **"Lên đầu trang"** và **banner báo tin in-web** (lớp `fixed` góc trái dưới).

### Đã bỏ khỏi trang chủ

| Khối | Bỏ khi | Lý do |
|---|---|---|
| ~~Bản đồ khu phố + pin~~ (§1) | 1/8 | `dieuchinh.1.8` — thay bằng slider ảnh khu phố |
| ~~3 nút CTA trong hero~~ | 18/8 | Gom về top bar |
| ~~Bộ đếm 4 ô~~ | 18/8 → 2/9 | Còn **3 ô**, hai ô cuối đổi cả nhãn lẫn ý nghĩa |
| ~~Bảng xếp hạng rời + "Khu phố dễ thương nhất tháng này"~~ (§5) | 18/8 | `IssueBoard` nuốt bảng xếp hạng thành tab 3; khối "khu phố của tháng" gỡ hẳn |
| ~~Khối TVC / Câu chuyện chiến dịch~~ | 18/8 (component xoá 2/9) | Email review |
| ~~Khối KV + logo ở chân trang~~ | 2/9 | `.fig` để `Frame 202` ở `visible=false` |
| ~~Dải khuyến mãi ở đáy mỗi biển~~ | 3/9 | `.fig` bản 2/9 biển xuống 404×199, dải biến mất |

---

## 1. ~~Bản đồ khu phố~~ — ĐÃ GỠ KHỎI TRANG CHỦ (1/8)

> **Toàn bộ §1 dưới đây không còn hiệu lực.** `dieuchinh.1.8` ACTION LIST #2 thay bản đồ bằng
> `NeighborhoodSlider` (slide ảnh khu phố). Trạng thái còn lại trong code: cột `issues.pin_x/pin_y`
> và `neighborhoods.map_image_key` / `map_stylized_key` vẫn tồn tại, `/api/v1/map` vẫn trả mảng
> `pins`, nhưng **không giao diện nào đặt hay hiển thị pin nữa**; màn `/admin/khu-pho/{id}/ban-do`
> và các route ảnh bản đồ đã xoá. `map_stylized_key` chỉ còn là **ảnh dự phòng** cho slider/popup.
> Ba màu trạng thái (đỏ/cam/xanh) vẫn dùng cho pill trạng thái trong admin.
>
> Quy tắc cứng 10 (ảnh gốc chỉ admin thấy) **vẫn còn hiệu lực** cho mọi ảnh prefix `private/`.

<details>
<summary>Đặc tả bản đồ gốc (lưu trữ)</summary>

### Bản đồ khu phố — ảnh upload → cách điệu tự động (đã chốt Q3)

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

</details>

## 2. Khối "Đóng góp một câu cho khu phố mình nhé" (`IssueBoard`)

~~Danh sách vấn đề ("góc phố đang chờ") với thẻ vấn đề + nút `+ Đề xuất khu phố mới` đứng đầu~~
→ **một card sọc cam với 3 tab** (bố cục Figma 2/9, nhãn nút chốt 4/9):

| Tab | Dòng là gì | Điều kiện | Nút mỗi dòng | CTA đáy |
|---|---|---|---|---|
| 1. `Góc phố mới cần treo biển` | **GÓC PHỐ** | `status !== 'signed'` **và chưa có câu nào** (`suggestion_count === 0`) — chốt 7/9 | `Gửi lời nhắc` → form viết câu | *(không có)* |
| 2. `Lời nhắc chờ bạn bình chọn` | **CÂU NHẮC** | câu `approved` của góc phố `waiting`/`voting` | `Bình chọn` (viền xanh, có trái tim) — bấm **thẳng tại dòng** | `+ Viết câu nhắc của riêng bạn` → popup **Chọn góc phố** |
| 3. `Cây bút của khu phố` | **NGƯỜI** | top 10 theo điểm, đã loại shadow-ban | `Xem lời nhắc` (viền cam) → popup Cây bút | `+ Đề xuất góc phố mới` |

- Tab 1 lọc "chưa có câu nào" là **quyết định 7/9**: góc đã có câu thuộc về tab 2 (bình chọn từng
  câu), nếu không hai tab hiện trùng nội dung. Bộ lọc đặt ở **client** — popup "Chọn góc phố" vẫn
  phải thấy mọi góc phố chưa treo biển.
- Tab 1 và 3 có phân trang (6 / 5 dòng); **tab 2 không có** — design chỉ vẽ 5 câu rồi tới CTA.
- Tab 2 xếp: **câu người xem chưa bình chọn lên trước** → nhiều thương → mới nhất.

<details>
<summary>Đặc tả danh sách vấn đề gốc (lưu trữ)</summary>

### Danh sách vấn đề ("góc phố đang chờ")

Từng **thẻ vấn đề** hiển thị:
- Icon + **loại vấn đề** (taxonomy §2.1) · **vị trí** (VD "Hẻm 42 Lê Lợi")
- Dòng mô tả: "Khu phố nêu: cần một câu nhắc cho điểm này"
- Badge **trạng thái** (Đang chờ / Đang bình chọn / Đã có biển)
- **Số câu đề xuất** (VD "2 câu đề xuất") và **lượt bình chọn cao nhất** (VD "★ 34 bình chọn")
- Bấm thẻ → mở drawer vấn đề (§3)

Nút `+ Đề xuất khu phố mới` đứng đầu danh sách → mở form đề xuất (§4).

</details>

### 2.1 Taxonomy chủ đề (danh mục đóng — không cho nhập tự do)

**ĐÚNG 6 chủ đề** từ 1/8 (`dieuchinh.1.8` #2 · `src/lib/taxonomy.ts` · migration 002 remap dữ liệu cũ):

| Mã | Nhãn | Icon | Mô tả |
|----|------|------|-------|
| `khoe_moi_ngay` | Khoẻ mỗi ngày | 🏃 | Kêu gọi người dân vận động, thể dục, đi bộ,… |
| `tre_con_trong_xom` | Trẻ con trong xóm | 🧒 | Nhắc chạy chậm vì có trẻ nhỏ, khu vực trường học,… |
| `van_minh_tu_te` | Lối sống văn minh, tử tế | 💛 | Hỏi thăm, chào hỏi, giúp người lớn tuổi, treo đèn trước hiên tối,… |
| `giup_do_san_se` | Giúp đỡ, san sẻ | 🤝 | Trông nhà giúp nhau, thấy lạ báo nhau, hô hoán khi cháy, giữ lối thông thoáng |
| `xom_xanh_sach` | Xóm xanh, xóm sạch | 🌿 | Vứt rác đúng chỗ, giữ vệ sinh khi nuôi thú cưng, giữ ngõ sạch,… |
| `song_vui_co_ich` | Sống vui, sống có ích | 🎈 | An toàn giao thông, không gây ồn |

~~8 mã cũ~~ `toc_do` · `trom_cap` · `an_toan_tre_em` · `chieu_sang` · `ve_sinh` · `phong_chay` ·
`giup_nhau` · `nguoi_gia` — remap: `toc_do`/`an_toan_tre_em` → `tre_con_trong_xom`;
`trom_cap`/`phong_chay`/`giup_nhau` → `giup_do_san_se`; `chieu_sang`/`nguoi_gia` → `van_minh_tu_te`;
`ve_sinh` → `xom_xanh_sach`.

Lý do danh mục đóng: *"Khu Phố Của Tôi tiếp nhận những góp ý về an toàn và nếp sống khu phố. Mỗi đề xuất sẽ được xem xét trước khi hiển thị để lời nhắc luôn phù hợp và văn minh."* (copy hiển thị ngay trong form).

## 3. Viết & bình chọn câu nhắc (Bước 2)

~~Một drawer trượt phải gộp cả xem–viết–bình chọn~~ → **tách đôi từ 18/8**, rồi rút gọn tiếp 4/9:

| Việc | Nơi làm |
|---|---|
| **Viết câu** | `SuggestModal` — vào từ nút `Gửi lời nhắc` (tab 1) hoặc qua `SpotPickerModal` (CTA tab 2 / nút trong popup khu phố) |
| **Bình chọn** | Bấm **thẳng tại dòng** ở tab 2 của `IssueBoard`; hoặc trong popup "Thông tin khu phố" / popup "Cây bút khu phố" |
| **Xem toàn bộ câu của một khu** | Popup "Thông tin khu phố" (`NeighborhoodModal`) |

~~`VoteModal` (popup danh sách câu để bình chọn)~~ đã **xoá 4/9**: design bỏ nút "Xem câu nhắc" nên
popup không còn lối vào.

**Quy tắc bình chọn ĐANG CHẠY:**
- Chỉ tài khoản đã định danh SĐT mới được bình chọn; chưa định danh thì mở modal định danh (§8.1).
- 1 tài khoản = 1 phiếu cho mỗi câu. **Bình chọn xong là CHỐT — không rút lại được** (quyết định
  Q6, 2/9): ~~bấm lại để bỏ thương (toggle)~~ → route trả **409 `ALREADY_VOTED`**, nút khoá thành
  "Đã bình chọn".
- Không tự thương câu của chính mình (nút disabled, server trả 409).
- Trong popup "Thông tin khu phố", nút bình chọn **chỉ hiện ở câu `approved`** ("Đang chờ bạn bình
  chọn") — câu `selected`/`produced` ("Chờ treo biển") và `installed` ("Đã lên biển") đã hết vòng
  bình chọn (chốt 7/9).

<details>
<summary>Đặc tả drawer gốc (lưu trữ)</summary>

### Drawer vấn đề — Viết & bình chọn câu nhắc

Khi mở một vấn đề:
- Header: icon loại + tên loại + vị trí, nút đóng ✕.
- **Danh sách câu nhắc đang chờ bình chọn**, mỗi câu gồm: nội dung, tác giả (tên hiển thị, VD "— Cô Tám tạp hoá", "— Minh (lớp 11)"), badge `✓ Đạt chuẩn 4N`, và nút/bộ đếm **thương** (VD "34 thương"). Nếu chưa có câu: *"Chưa có câu nào. Bạn viết câu đầu tiên cho điểm này nhé!"*
- **Ô "Viết câu nhắc của bạn"** (textarea, placeholder: *"VD: Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi..."*).
- **Checklist 4N tự soát**: 4 chip tĩnh `Nhắc · Nhở · Nhỏ · Nhẹ` hiển thị như gợi ý để người viết tự soát (không chấm tự động — đã chốt Q2); chú thích *"Câu nhắc của bạn sẽ được FPT chúng tớ duyệt theo chuẩn 4N trước khi hiển thị lên website"*. (Định nghĩa 4N cho người duyệt: 06-CONTENT-COPY §3.)
- **Khối lead tầng 1** (§7.1): chỉ còn checkbox opt-in ưu đãi — SĐT đã có từ bước định danh (§8), KHÔNG hỏi lại.
- Chú thích đạo đức: 💛 *"Giữ cho dễ thương: gọi tên một việc tốt cụ thể, không nêu đích danh người/nhà nào. Câu được chọn sẽ qua bộ lọc 4N và đội ngũ chiến dịch duyệt trước khi lên biển."*
- Nút `Gửi câu nhắc` (primary).

**Quy tắc bình chọn ("thương"):**
- Chỉ tài khoản đã định danh SĐT mới được thương. Người chưa định danh bấm thương → mở modal định danh (§8.1).
- 1 tài khoản = 1 phiếu thương cho mỗi câu (bấm lại để bỏ thương — toggle).
- Không tự thương câu của chính mình (ẩn/disable nút trên câu của mình).

</details>

## 4. Đề xuất góc phố / khu phố (Bước 1) — popup 2 bước

**Đang chạy** (dựng lại 7/9 theo `.fig` `7458:40650` + `7458:41331`):

| Bước | Nội dung | Nút |
|---|---|---|
| 1/2 | Chọn 1 trong **6 chủ đề** | `Tiếp tục đề xuất` |
| 2/2 | `Tỉnh/thành phố` + `Phường /Xã` (2 cột, chọn từ danh mục 34 tỉnh) → `Tên khu phố/hẻm/ngõ muốn treo biển` (**ô GỘP**) → `Điều dễ thương bạn muốn chia sẻ ở khu phố này` (textarea) | `Gửi đề xuất` |

Tiêu đề popup theo `.fig`: **"Đề xuất khu phố mới"**.

Khác đặc tả gốc (đều là **design thắng spec** — xem `20` §2.1):

| | Đặc tả gốc | Đang chạy |
|---|---|---|
| Thứ tự | Vị trí → mô tả | **Tỉnh/phường lên đầu** |
| Tên khu phố + tên hẻm/ngõ | 2 ô riêng | **1 ô GỘP** (`location_text` = `neighborhood_text`) |
| Mô tả | `Mô tả ngắn (không nêu đích danh ai)`, placeholder theo chủ đề | `Điều dễ thương bạn muốn chia sẻ ở khu phố này`, placeholder cố định *"Nhập đoạn mô tả"* |
| Ô câu nhắc gửi kèm (thêm 1/8) | có | **BỎ** (7/9) — route `POST /api/v1/issues` vẫn nhận `suggested_content`, chỉ client không gửi |
| Hộp cảnh báo ⚠️ danh mục đóng | bắt buộc hiển thị | **BỎ** (2/9) — `.fig` không vẽ; chuỗi vẫn còn trong `copy.ts` |
| Chip 4N + bộ đếm ký tự ở bước 2 | có | **BỎ** (2/9) |
| Tỉnh/thành | không bắt buộc | **BẮT BUỘC cho mọi trường hợp** (18/8, validate `geoError()` server) |

- Nút mở popup **KHÔNG hỏi định danh trước** — định danh chỉ hỏi ở bước bấm Gửi (sửa 18/8: trước
  đó bung modal "Để FPT gửi ưu đãi…", team review đọc thành "ra nhầm popup ưu đãi").
- Sau khi gửi: đề xuất ở `pending_review`, **chỉ hiển thị công khai sau khi admin duyệt**.
- Trần 3 đề xuất/tuần được **tính điểm** vẫn giữ nguyên (05-SCORING-RULES).
- Khu phố tự nhập (free text) → tạo bản ghi `neighborhoods` với `hidden = true`, hiện công khai khi
  admin duyệt đề xuất **đầu tiên** của khu đó.

<details>
<summary>Đặc tả form đề xuất gốc (lưu trữ)</summary>

### Form "Góp một điều xóm mình nên để ý" (Bước 1)

Modal/drawer gồm:
- Tiêu đề: **"Góp một điều xóm mình nên để ý"** · phụ đề "Chọn vấn đề bạn muốn viết lời nhắc"
- **Loại vấn đề**: chip chọn 1 trong taxonomy §2.1
- **Vị trí (ngõ/hẻm/ngách)**: text, placeholder *"VD: Hẻm 25 Nguyễn Trãi"* — bắt buộc
- **Mô tả ngắn (không nêu đích danh ai)**: textarea, placeholder *"VD: Xe hay phóng nhanh đoạn cua, gần chỗ trẻ con chơi."*
- Cảnh báo danh mục đóng (copy §2.1)
- Nút `Gửi góp ý cho xóm mình`
- Sau khi gửi: đề xuất ở trạng thái `pending_review`, **chỉ hiển thị công khai sau khi admin duyệt**.
- Yêu cầu định danh SĐT (§8) trước khi gửi (để tính điểm + chặn spam; tối đa 3 đề xuất được tính điểm/tuần — vẫn cho gửi quá 3 nhưng không cộng điểm, xem 05-SCORING-RULES).

</details>

## 5. Bảng xếp hạng — nay là **tab 3 của `IssueBoard`**

- ~~Khối riêng "Đại sứ khu phố" cuối trang~~ → tab `Cây bút của khu phố` trong `IssueBoard` (18/8).
- Mỗi dòng: **huy hiệu hạng** (TOP1 xanh dương · TOP2 cam · TOP3 xanh lá · ≥4 xám), tên hiển thị,
  meta `N câu đóng góp · N Bình chọn`, nút `Xem lời nhắc` mở popup "Cây bút khu phố".
- Top 10 (5 dòng/trang, có phân trang), đã loại tài khoản shadow-ban và người có điểm 0.
- ~~"Khu phố dễ thương nhất tháng này"~~ — **gỡ hẳn khỏi trang chủ 18/8**; API `/api/v1/leaderboard`
  cũng không còn trả `neighborhood_of_month`. Bảng `month_snapshots` vẫn chưa dùng.

<details>
<summary>Đặc tả bảng xếp hạng gốc (lưu trữ)</summary>

### Bảng xếp hạng

### 5.1 "Đại sứ khu phố" — "Cây bút của khu phố"
- Tiêu đề: 🏆 **"Cây bút của khu phố"** · phụ đề *"Những cây bút nhận được nhiều lượt “Thương” nhất từ bà con"*.
- Top 5–10, mỗi dòng: hạng, tên hiển thị (VD "Bà Liên", "Chú Ba xe ôm"), thống kê ("1 câu được treo · 52 lượt thương"), **điểm** (VD "82đ").
- Điểm tính theo công thức trong 05-SCORING-RULES, cập nhật thời gian thực.

### 5.2 "Khu phố dễ thương nhất tháng này"
- Dòng tổng kết dưới bảng: *"Khu phố dễ thương nhất tháng này: **Phường Lê Lợi** — 3 biển mới, 76 lượt thương"*.
- Điểm khu phố = tổng điểm cư dân trong khu + số biển mới treo trong khu (chu kỳ tháng).

</details>

## 6. Chứng nhận "Khu phố biết thương" chuẩn 4N

**Đang chạy (chốt 7/9):** cấp và thu hồi chứng nhận là **quyết định vận hành của ban tổ chức**
(có buổi trao biển ngoài đời), admin bật/tắt **không điều kiện**. ~~Điều kiện "100% biển của các
vấn đề đã duyệt trong khu được treo"~~ đã **bỏ** khỏi cả API lẫn UI — màn admin chỉ còn *hiển thị*
tiến độ `signed/total` để tham khảo.

Ảnh chứng nhận (`certificate_photo_key`) **độc lập** với trạng thái 4N từ migration 005: upload
trước lúc cấp được, thu hồi chứng nhận cũng không xoá ảnh.

### 6b. Slider "Khu phố tiêu biểu" ở hero

Thay chỗ bản đồ từ 1/8. **Chốt 7/9**: slider hiện khu có cờ `is_featured`, tối đa **10 SLOT**
(`featured_position` 1–10, duy nhất, admin xếp ở `/admin/khu-pho`; xếp trùng slot ⇒ hoán đổi hai khu).
~~Trước đó slider lọc theo `certified_4n`~~ nên cả cờ tiêu biểu lẫn vị trí đều vô nghĩa.

### 6c. Ô tra cứu "Xóm mình đã đạt chuẩn 4N chưa?"

Chuyển từ cột phải lên **hero** (18/8). Dropdown là lớp **nổi**, ba trạng thái: nhiều kết quả ·
đúng 1 kết quả (card + nút `Xem khu phố`) · rỗng (mời đề xuất). Câu mời ở trạng thái 1 kết quả
tách theo số câu nhắc của khu (chốt 7/9 — xem `06` §2.2).

### 6d. Hồ sơ khu phố là **POPUP**

Ô tra cứu, pill địa chỉ trên slider và deep-link `/?khu-pho=<slug>` đều mở popup
`NeighborhoodModal`, **không rời trang**. Trang thật `/khu-pho/{slug}` vẫn còn cho link chia sẻ
(cần OG image) và **dùng chung ruột `NeighborhoodView`**.

Nội dung popup (Figma 2/9): **danh sách câu nhắc** của khu — mỗi thẻ gồm nội dung câu, pill trạng
thái, tên người viết, nút Bình chọn (chỉ ở câu `approved`). ~~Tiến độ 4N + dải 3 con số + lưới biển~~
chỉ còn ở **trang share** (prop `hero`).

Khu phố **đã xoá mềm** ⇒ popup và trang share đều 404, khu biến mất khỏi mọi chỗ trên web.

<details>
<summary>Đặc tả chứng nhận gốc (lưu trữ)</summary>

- Mỗi **khu phố** có trang/panel trạng thái. Khi đạt điều kiện (**100% biển của các vấn đề đã duyệt trong khu được treo**), khu phố nhận badge:
  - Ảnh thực tế khu phố + ribbon **"CHỨNG NHẬN ĐẠT CHUẨN 4N"**
  - Tên khu (VD **"Phường Bàn Cờ"**) + dòng *"đạt 'Khu phố biết thương' chuẩn 4N"*
  - Chip `100% biển đã treo` (xanh lá) + chip `Hoàn thành 09/2026`
- Việc cấp chứng nhận do admin xác nhận thủ công trên trang quản trị (dựa trên điều kiện hệ thống gợi ý).

</details>

## 7. Luồng thu lead (2 tầng)

### 7.1 Tầng 1 — Lead "mềm" trong drawer viết câu nhắc
- **SĐT đã có từ bước định danh (§8) — không hỏi lại.** Drawer chỉ hiển thị **checkbox opt-in riêng biệt** (mặc định KHÔNG tick): *"Tôi đồng ý để FPT liên hệ tư vấn ưu đãi dành riêng cho cư dân “Khu phố biết thương”."* — chú thích *"Tuỳ chọn riêng, không ảnh hưởng đến câu nhắc của bạn."*
- Tick → tạo lead `source = soft_drawer` từ SĐT định danh (server ghi `phone_encrypted` với purpose `lead`). Không tick → không có lead, không lưu SĐT cho mục đích liên hệ.
- **"Báo tin vui" khi câu được treo: KHÔNG gửi SMS (đã chốt Q1).** Thay bằng thông báo in-web: khi khách quay lại (cookie nhận diện), hiện banner 🎉 *"Câu của bạn đã được treo tại {vị trí}!"* + nút Chia sẻ (§11) + nút xem trên bản đồ.

### 7.2 Tầng 2 — Lead chủ động: section "Quà dành cho cư dân" cuối trang
- Badge: 🧧 *"Món quà nhỏ gửi người góp lời thương"*. Tiêu đề: **"FPT muốn gửi lại xóm mình một điều dễ thương"**.
- Mô tả: FPT dành riêng cho cư dân "Khu phố biết thương" những ưu đãi khi đăng ký Internet, Truyền hình và FPT Play. Khi muốn tìm hiểu thêm, bạn chỉ cần để lại thông tin để FPT liên hệ tư vấn.
- Ghi chú riêng tư (bắt buộc hiển thị): 🔒 *"Số điện thoại của bạn chỉ dùng để gửi ưu đãi này khi bạn chủ động đồng ý — không dùng cho bất kỳ mục đích nào khác, không tự động gọi mời."*
- Form:
  - **Tên bạn (hoặc tên cả nhà hay gọi)** — placeholder *"VD: Cô Tám, anh Dũng, nhà số 7..."*
  - **Số điện thoại** — placeholder *"VD: 090xxxxxxx"* (bắt buộc, validate đầu số VN)
  - ~~**Bạn đang ở khu phố nào?** (free text)~~ → **Tỉnh/thành phố (chọn, BẮT BUỘC)** + **Địa chỉ** (18/8, migration 010)
  - **Nhà mình đang muốn tìm hiểu dịch vụ nào?** — ~~4 chip 1 hàng~~ → **6 lựa chọn, lưới 3 cột × 2 hàng** (Figma 2/9 · B6): `FPT Internet` · `FPT Camera` · `Truyền hình FPT Play` · `Internet + truyền hình` · `Internet + Camera` · `Internet + Truyền hình + Camera`. Quyết định Q3: **giữ nguyên 4 mã cũ**, chỉ đổi nhãn và thêm 2 mã (`camera`, `internet_tv_camera`) ⇒ không migration
  - Checkbox opt-in (copy như tầng 1) — **không kèm chú thích** (bỏ theo wording 28/7)
  - ~~Dòng "Bạn sẽ xác thực số điện thoại một lần trước khi gửi…"~~ → **BỎ** (2/9, design không vẽ)
  - Nút `Nhận ưu đãi của xóm mình`
- Dòng cuối: *"Đã là khách hàng của FPT và cần hỗ trợ kỹ thuật? Gọi **1900 6600**, không cần điền biểu mẫu này."*
- `lead.source = active_section`.

## 8. Định danh khách hàng — SĐT băm + cookie (KHÔNG dùng OTP)

**Nguyên tắc:** không gửi OTP. Khách hàng nhập SĐT một lần; hệ thống **băm SĐT** làm khoá định danh và cấp **cookie phiên** để nhận diện các lần truy cập sau. Ưu tiên cao nhất là bảo mật SĐT.

### 8.1 Luồng lần đầu
1. Khi thực hiện hành động cần định danh (gửi đề xuất, gửi câu nhắc, bấm bình chọn, gửi lead) → mở modal **"Để FPT gửi ưu đãi đến bạn"**: ô SĐT + tên hiển thị (VD "Cô Tám tạp hoá") + chọn khu phố **+ Tỉnh/thành phố**. Xem danh sách/bảng xếp hạng: không cần.
   - **18/8**: tự nhập tên khu phố thì **BẮT BUỘC chọn tỉnh/thành** — trước đó khu phố tạo từ đây
     luôn có `city = NULL` vì `resolveNeighborhoodId` bị gọi thiếu tham số geo.
   - Modal định danh mở **chồng** lên modal khác phải ở lớp cao hơn (`topmost` → `z-[60]`), nếu
     không nó nằm dưới và người dùng tưởng bấm không ăn (lỗi #16 của bản drawer cũ).
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
Đề xuất:   pending_review → waiting (hiện công khai) | rejected (ẩn, báo riêng in-web)
Góc phố:   waiting → voting (khi có ≥1 câu được duyệt) → signed (biển đã treo)
Câu nhắc:  submitted → approved (hiện + cho bình chọn) | rejected
           → selected (admin chọn) → produced → installed (biển treo thật)
Khu phố:   sống ⇄ deleted_at (xoá mềm / khôi phục — thêm 7/9)
```
~~`submitted → auto_scored_4n`~~ — **không có bước tự động nào** (quy tắc cứng 2).
~~pin đổi màu~~ — trang chủ không còn bản đồ.

Khi câu chuyển `installed`: góc phố → `signed`, bộ đếm "biển đã treo" +1, tác giả +30 điểm, tạo
**thông báo in-web** cho tác giả (hiện banner lần quay lại kế tiếp).

Khi đề xuất bị **từ chối**: câu nhắc gửi kèm còn `submitted` cũng bị `rejected` theo (khỏi kẹt
trong hàng chờ vô hình), và ghi `audit_logs`.

Khi khu phố bị **xoá mềm**: cả cụm (khu phố + góc phố + câu nhắc) biến mất khỏi web; điểm/phiếu
giữ nguyên, khôi phục là về nguyên trạng.

## 10. Realtime & phản hồi UI

- Bộ đếm, lượt thương, bảng xếp hạng cập nhật không cần reload (SSE hoặc polling 15–30s là đủ cho MVP).
- Mọi hành động có toast xác nhận giọng ấm áp (VD gửi câu: *"Câu của bạn đã vào hàng chờ duyệt — cảm ơn bạn đã thương xóm mình 💛"*).

## 11. Chia sẻ mạng xã hội (đã chốt Q8)

- **Vị trí nút chia sẻ ĐANG CHẠY**: (a) banner báo tin vui in-web (nút `Chia sẻ` → `/bien/{id}`);
  (b) trang share `/khu-pho/{slug}`. ~~(c) mỗi dòng bảng xếp hạng (`Chia sẻ ↗`)~~ → thay bằng nút
  `Xem lời nhắc` mở popup Cây bút (quyết định Q7, 2/9); ~~(d) panel biển trên bản đồ~~ — không còn bản đồ.
- Ba URL share vẫn sống đầy đủ; `/dai-su/{slug}` chỉ mất **lối vào từ trang chủ**, link đã chia sẻ vẫn mở được.
- Mỗi đối tượng có **URL công khai riêng**: `/dai-su/{slug}`, `/bien/{id}`, `/khu-pho/{slug}` — server render **OG image động** (nền chiến dịch + tên hiển thị/câu nhắc/tên khu phố + thành tích), tối ưu preview **Facebook và Zalo**.
- Share text gợi ý điền sẵn (06-CONTENT-COPY §2).
- **Bảo mật**: URL/OG không bao giờ chứa SĐT hay ID nội bộ đoán được — dùng slug/ID ngẫu nhiên; chỉ hiển thị tên hiển thị công khai.
