# KẾ HOẠCH ĐIỀU CHỈNH 18/8/2026 — LP skin mới + feedback review

> **Trạng thái: ĐÃ DEV + ĐÃ CHỐT (18/8).** Chủ đầu tư duyệt **toàn bộ theo cột "Khuyến nghị"**,
> và chốt thêm **F3 = tab "Cây bút của khu phố" liệt kê NGƯỜI (đại sứ)**, không phải góc phố.
> Bảng §F giờ là **nhật ký quyết định** — muốn đổi mục nào thì sửa mục đó, không làm lại từ đầu.
>
> Còn tồn đọng (không chặn chạy, cần Design cấp file):
> · font chính thức của skin (đang dùng Baloo 2 IN HOA) · logo tròn "Khu phố Biết Thương"
> và logo FPT Telecom trên biển (đang dựng bằng chữ + khối màu) · **bản thiết kế mobile**
> (hiện dev tự quy đổi từ bản desktop) · ảnh banner cầu thủ ở chân biển.
>
> Chưa làm (đúng như khuyến nghị F8): cơ chế admin **ghim tay** 6 biển — hiện lấy tự động
> 6 câu duyệt mới nhất. Muốn ghim tay thì làm tiếp D5.

## Nguồn

| Nguồn | Nội dung |
|---|---|
| `docs/admin/admin_v1.pdf` | Email "Re: Điều chỉnh website Khu phố" — review **bản đang chạy** (skin kem), 9 điểm sửa |
| `docs/lp/lp1.png`, `lp2.png` | Full-page design **skin mới (cam FPT)** — lp1 = tab "Cây bút", lp2 = tab "Mới nhất" |
| `docs/lp/lp3.png` → `lp6.png` | 4 modal: đề xuất bước 1/2, bước 2/2, gửi câu nhắc, định danh/ưu đãi |
| `docs/lp/Khu phố 2 1.png`, `06 1.png`, `123123 1.png`, `Frame 151.png` | Asset cắt sẵn: KV khu phố 3D, cột biển "Ngõ Xóm/Khu phố Biết Thương", nền sàn gạch, dải sọc cam |

**Bản chất công việc: thay da toàn bộ landing page + tái cấu trúc 3 khối lớn**, không phải chỉnh
vặt. Email và design có **7 điểm mâu thuẫn** — gom ở **§F**, cần chốt trước khi dev.

**Nguyên tắc xử lý mâu thuẫn** (theo `docs/CLAUDE.md`): mâu thuẫn về **UI → theo design**;
về **logic/dữ liệu → theo spec + email**. Các mục §F là chỗ không tự quyết được.

---

# PHẦN A — Nền tảng skin mới

### A1 · Bảng màu & token (0.5 ngày)
`src/app/globals.css`, `tailwind.config` (nếu có), toàn bộ component.

- [ ] Thêm **theme cam FPT** song song token cũ: nền `#FFF6F0` (kem hồng rất nhạt), primary
      `#F58220`/`#EF7B27`, hover đậm `#D96A12`, accent xanh dương `#2B3FD9` (nút "Bình chọn",
      badge TOP 1, biển tên đường), chữ `#231F20`, viền `#F0E2D8`.
- [ ] **Giữ nguyên tên token cũ** (`brick`, `cream`, `olive`…) và chỉ đổi *giá trị* cho luồng
      public → trang admin/share dùng chung token vẫn chạy. Nếu muốn admin giữ da cũ thì phải
      tách 2 bộ token theo scope → xem 🔴 F7.
- [ ] Nút primary đổi từ **nền đặc** → **viền cam, nền trắng, chữ cam, bo tròn hết cỡ**
      (`kp-btn-primary` trong `globals.css`) — kiểu chủ đạo của design mới.
- [ ] Bo góc lớn hơn: card `24px`, input/nút `999px` (pill).

### A2 · Typography (0.25 ngày)
- [ ] Tiêu đề section: **IN HOA, font display, letter-spacing hẹp** (design dùng font rounded
      geometric). Hiện đang là `Baloo 2` — 🔴 **F6: team Design cấp file font chính thức?**
      Chưa có → tạm dùng `Baloo 2` uppercase, không chặn tiến độ.
- [ ] Body giữ `Be Vietnam Pro`.

### A3 · Asset tĩnh (0.25 ngày)
- [ ] Copy 4 file từ `docs/lp/` vào `public/brand/`: `kv-khu-pho.png` (KV 3D, **15MB → phải nén**
      xuống WebP ~300–500KB, cần bản @1x/@2x), `signpost.png`, `plaza-floor.png`, `stripe.png`.
- [ ] Dải sọc cam (`Frame 151.png`) dùng làm viền trên/dưới card danh sách → dựng bằng CSS
      `repeating-linear-gradient` thay vì ảnh (nhẹ hơn, co giãn tốt).
- [ ] Logo tròn "KHU PHỐ Biết Thương" ở giữa top bar — 🔴 **F6: cần file SVG/PNG nền trong.**

### A4 · Top bar mới (0.5 ngày) — `HomeShell.tsx`
- [ ] Nền cam đặc (không còn sticky mờ kem), 1 thanh bo tròn: trái `Góc phố đang chờ` ·
      `Quà dành cho cư dân`; **giữa: logo tròn nhô lên**; phải: nút viền trắng
      `+ Đề xuất góc phố mới` + **avatar tròn** khi đã định danh.
- [ ] Avatar: chưa có ảnh đại diện trong DB → dùng chữ cái đầu `display_name` trên nền cam.
      Bấm vào → menu nhỏ (tên, hạng, đăng xuất?) — 🔴 **F5: menu avatar có gì?**

### A5 · Hero (1 ngày) — `HomeShell.tsx` + `NeighborhoodSlider.tsx`
- [ ] Nền cam gradient + hình mờ toà nhà 2 bên; tiêu đề trắng IN HOA
      "HÃY GỬI MỘT LỜI THƯƠNG CHO XÓM MÌNH NHÉ!" + 2 dòng mô tả (giữ nguyên văn design, sửa
      được ở `/admin/noi-dung`).
- [ ] **Bỏ 3 nút CTA hero** và **bỏ dải 4 counter khỏi hero** (design chuyển counter xuống
      dưới KV — xem B2).
- [ ] Slider khu phố: 1 ảnh lớn bo góc, badge xanh dương **"KHU PHỐ TIÊU BIỂU"** góc trái trên,
      **pill địa chỉ góc phải trên** (`Phố Cổ` / `P. Hội An, TP. Đà Nẵng`), mũi tên ‹ › tròn
      trắng nằm **ngoài** ảnh.
- [ ] Dưới slider: **KV khu phố 3D** đè lên nền sàn gạch, hai bên là các nhân vật cắt rời.
- [ ] Dưới KV: **ô tìm kiếm full-width** pill trắng `🔍 Tìm kiếm khu phố của bạn tại đây` + nút
      tròn cam `+` bên phải.

---

# PHẦN B — Các khối trang chủ

### B1 · Khối "Khu phố tiêu biểu" (0.5 ngày) — `NeighborhoodSlider.tsx`
Gộp yêu cầu email (trang 2–3) + design.

- [ ] Chỉ hiển thị khu **đạt chuẩn 4N** (`certified_4n`), bỏ fallback "chưa chọn tiêu biểu → hiện tất cả".
- [ ] **Bỏ hàng chip chọn phường** + effect cuộn chip (`chipRowRef`).
- [ ] **Bỏ bộ đếm ảnh** `2/5`.
- [ ] **Bỏ nút `+ Đề xuất góc phố mới`** trong slider (email: *"đây chỉ là chỗ vinh danh"*)
      → bỏ prop `onPropose`.
- [ ] Địa chỉ dồn **1 dòng**, chuyển thành **pill nổi góc phải trên ảnh** (tên khu phố đậm +
      dòng `Phường – Tỉnh` nhỏ) thay cho 2 dòng dưới ảnh.
- [ ] Badge trạng thái: bỏ 2 trạng thái `has_suggestions`/`empty` trong `NB_STATUS`; đổi badge
      còn lại thành "KHU PHỐ TIÊU BIỂU" nền xanh dương.
- [ ] Ô tra cứu 4N (đang nằm cột phải trong `Leaderboard.tsx`) → **chuyển lên hero**, thành ô
      search dưới KV (A5). Giữ nguyên `NeighborhoodPicker` + 3 nhánh kết quả.

### B2 · Dải số liệu (0.5 ngày) — `Counters.tsx`, `src/lib/counters.ts`, `copy.ts:14`
- [ ] Chuyển ra **ngoài hero**, đặt ngay dưới hero cam, nền kem, **3 số nằm ngang, số cam cỡ
      lớn + nhãn xám bên phải**, có padding `08` (2 chữ số).
- [ ] 4 số → **3 số**. 🔴 **F1: lấy bộ nào?** — email: *biển · khu phố · câu đóng góp*;
      design: *biển · góc phố đang chờ · khu phố tham gia*.
- [ ] Nếu theo email: `counters.ts` bỏ `issues_waiting` + `contributors`, thêm `suggestions_total`
      (đếm `status IN ('approved','selected','produced','installed')` — quy tắc cứng 1).
- [ ] Sửa `CounterData`, `/api/v1/counters`, grep mọi nơi đọc field cũ.

### B3 · Khối "Đóng góp một câu cho khu phố mình nhé" (2 ngày) — `IssueList.tsx`, `HomeShell.tsx`
Đây là thay đổi **cấu trúc lớn nhất**: từ layout 2 cột (danh sách + bảng xếp hạng) → **1 khối
full-width, bảng xếp hạng thành 1 tab**.

- [ ] Header: cột biển "Ngõ Xóm / Khu phố Biết Thương" bên trái + tiêu đề IN HOA giữa + mô tả.
- [ ] **3 tab pill** căn giữa, mỗi tab kèm badge số. 🔴 **F2: bộ tab nào?** — email:
      `Khu phố chờ bạn viết lời nhắc` / `Khu phố chờ bạn bình chọn` / (bỏ "Được yêu thích nhất");
      design: `Mới nhất` / `Chờ bạn bình chọn` / `Cây bút của khu phố`.
- [ ] Danh sách đổi từ card lưới → **bảng dòng ngang** trong 1 card lớn, viền trên/dưới là dải
      sọc cam: mỗi dòng = tiêu đề đậm, meta `📍 Phường` + `✎ N câu đề xuất`, nút phải.
- [ ] Nút phải theo trạng thái: **`Bình chọn`** (viền xanh dương, có icon tim) khi góc phố đã có
      câu; **`Gửi lời nhắc`** (viền xám nhạt) khi chưa có câu nào — thấy rõ ở `lp2.png` dòng cuối.
- [ ] Tab "Cây bút của khu phố": 3 dòng đầu có **badge TOP 1 (xanh dương) / TOP 2 (cam) /
      TOP 3 (xanh lá)**, dòng 4–5 số xám. 🔴 **F3: tab này liệt kê NGƯỜI (đại sứ) hay GÓC PHỐ?**
      Design vẽ lorem nên không phân biệt được; nhưng vẫn có nút "Bình chọn" ở mỗi dòng.
- [ ] Cuối card: nút **`+ Đề xuất góc phố mới`** căn giữa (viền cam).
- [ ] **Bỏ "Xem thêm N góc phố"** — 🔴 **F4: danh sách cố định 5 dòng, hay phân trang?**
- [ ] Bỏ card issue cũ (icon chủ đề, chip "N câu đề xuất / N lượt thương", nút thương inline).

### B4 · Bảng xếp hạng "Cây bút của khu phố" (0.5 ngày) — `Leaderboard.tsx`
- [ ] **Bỏ khối cột phải** (header gradient ô liu, hạng 1 spotlight, ô "Bạn đang ở hạng #N"),
      chuyển nội dung vào tab ở B3 theo layout dòng ngang.
- [ ] Bỏ 2 tab `Từ đầu mùa / Tuần này` — email: *"Mình cứ rank từ đầu mùa thôi"*.
- [ ] Bỏ dòng **"Khu phố dễ thương nhất tháng này"** → bỏ luôn `getNeighborhoodOfMonth()`,
      field trong `/api/v1/leaderboard`, `HomeData.neighborhoodOfMonth`.
- [ ] 🔴 **F5: giữ hay bỏ** 🔥 "đang lên nhanh tuần này", mũi tên ▲▼ đổi hạng, nút chia sẻ ↗,
      dòng "Bạn đang ở hạng #N"? Design không vẽ chỗ nào cho chúng.

### B5 · Bỏ khối chứng nhận 4N ở cột phải (0.25 ngày) — `Leaderboard.tsx`
- [ ] Xoá slideshow ảnh chứng nhận + biển placeholder 4N + nút "Chia sẻ ngay 💛"
      (email trang 8: *"Bỏ cái này"*). Design mới cũng không có khối này.
- [ ] **Không** xoá `certificate_photo_key` và trang `/khu-pho/[slug]` — vẫn dùng để share.

### B6 · Bỏ khối TVC/KV chiến dịch (0.25 ngày) — `HomeShell.tsx`, `CampaignMedia.tsx`
- [ ] Bỏ `<CampaignMedia />` khỏi trang chủ (**giữ file component**, ghi comment lý do).
      Design mới cũng không có khối này → 2 nguồn thống nhất.
- [ ] Tool admin quản lý nhiều video: xem **D3**.

### B7 · Khối "Lời nhắc khi lên biển trông như thế nào?" (1.5 ngày) — `SignGallery.tsx`, `ui.tsx`
- [ ] 🔴 **F1b: tên khối** — email yêu cầu đổi thành **"Biển mới của khu phố"**; design vẫn ghi
      "LỜI NHẮC KHI LÊN BIỂN TRÔNG NHƯ THẾ NÀO?".
- [ ] **Bỏ 3 tab**, **bỏ nút bình chọn** trên từng biển, **bỏ "Xem thêm"/"Thu gọn"**,
      **bỏ card ghim "Được Thương nhiều nhất tuần này"** → chốt với cả email lẫn design.
- [ ] Lưới **3 × 2 = 6 biển cố định**, sắp theo ngày đăng mới nhất
      (`page.tsx`: `ORDER BY approved_at DESC LIMIT 6`, hiện đang `votes DESC LIMIT 24`).
- [ ] **Đổi cách render biển**: hiện là ảnh upload (`suggestions.image_key`); design là
      **template thương hiệu dựng bằng HTML/CSS**: header logo `FPT Telecom | Khí phách tiên phong`
      + logo tròn chiến dịch, thân là câu nhắc 2 dòng chữ cam trên nền trắng, **footer banner cam
      "Đăng ký Internet nhanh — Xem Ngoại Hạng Anh cùng FPT" + `098.420.xxxx` + `1900.6600`**.
- [ ] Meta dưới mỗi biển: `Chủ đề: <tên chủ đề>` · `📍 Phường` · `👤 Tên người viết`.
- [ ] **Di chuyển section xuống dưới** khối B3 (email: *"Cho xuống sau phần đóng góp câu nhắc"*)
      — design cũng xếp vậy.
- [ ] 🔴 **F8: 6 biển tự động theo ngày, hay admin ghim tay?** (email: *"team plan pick ra 6 biển"*).
      Ghim tay → phát sinh migration + UI admin, xem D5.

### B8 · Khối ưu đãi "FPT muốn gửi lại xóm mình một điều dễ thương" (1 ngày) — `LeadSection.tsx`
- [ ] Bỏ layout 2 cột (pitch trái + form phải) → **1 card trắng lớn, tiêu đề + mô tả căn giữa,
      form 2 cột bên dưới**.
- [ ] Trường mới theo design: `Họ và tên` · `Số điện thoại` · **`Tỉnh thành` (select)** ·
      **`Địa chỉ` (text)** — thay ô free text "Bạn đang ở khu phố nào?" hiện tại.
      Khớp yêu cầu email *"bắt buộc phải điền tỉnh thành"*.
- [ ] 4 chip dịch vụ giữ nguyên nội dung (`INTERESTS`), đổi style thành pill viền.
- [ ] Checkbox opt-in **mặc định KHÔNG tick** (quy tắc cứng 5) + icon ⓘ tooltip giải thích.
- [ ] Nút `Nhận ưu đãi của xóm mình` (viền cam, full-width).
- [ ] Bỏ ô "dòng cam kết bảo mật" dạng khung đứt nét → chuyển vào tooltip ⓘ.
- [ ] DB: `leads` cần 2 cột mới `province` + `address` (migration, xem E2) → kéo theo D6.

### B9 · Footer (0.25 ngày) — `HomeShell.tsx`
- [ ] KV khu phố 3D lặp lại + logo tròn chiến dịch ở giữa.
- [ ] 4 dòng text, trong đó **dòng mới**: *"Đã là khách hàng của FPT và cần hỗ trợ kỹ thuật?
      Gọi **1900 6600**, không cần điền biểu mẫu này."*
- [ ] Giữ link `Chính sách dữ liệu`. Text sửa được ở `/admin/noi-dung` (xem D3).

---

# PHẦN C — Modal & flow

### C1 · Modal "Đề xuất góc phố mới" → wizard 2 bước (1.5 ngày) — `ProposeModal.tsx`
Hiện là drawer trượt phải, 5 bước trên **một** màn. Design: **modal giữa màn hình, 2 bước**.

- [ ] **Bước 1/2 — "Lựa chọn chủ đề"** (`lp3.png`): danh sách 6 chủ đề dạng card viền
      (tên đậm + mô tả xám), chọn → **nền tối, tick ✓ bên phải**. Nút `Tiếp tục đề xuất`.
      Nội dung 6 chủ đề khớp `src/lib/taxonomy.ts` hiện có ✓ (không đổi mã).
- [ ] **Bước 2/2 — "Thông tin khu phố của bạn"** (`lp4.png`): mũi tên ‹ quay lại góc trái;
      `Tên khu phố` · `Tỉnh/thành phố` (select) · `Phường/Xã` (select) · `Tên hẻm/ngõ muốn treo`
      · `Mô tả vấn đề tại khu phố` (textarea) · **textarea thứ 2**. Nút `Gửi đề xuất`.
- [ ] ⚠️ **Lỗi trong design**: textarea thứ 2 bị đặt nhãn trùng `Mô tả vấn đề tại khu phố`.
      Theo flow hiện có, đây phải là **"Viết câu nhắc thương của bạn (nếu có)"** →
      xử lý theo cách này, kèm 4 chip `Nhắc/Nhở/Nhỏ/Nhẹ` + đếm `0/120`.
- [ ] Design bỏ ô preview địa chỉ `📍 Tên hẻm – Phường – Tỉnh` và bỏ combobox tìm khu phố có sẵn
      (thành input thường). 🔴 **F9: có giữ combobox tìm khu phố + preview địa chỉ không?**
      Bỏ đi thì người dùng luôn tạo khu phố mới `hidden=true`, admin sẽ ngập bản trùng.
      **Khuyến nghị: giữ combobox** (giữ đúng logic `resolveNeighborhoodId`).

### C2 · Modal "Gửi câu nhắc" (1.5 ngày) — thay `IssueDrawer.tsx`
Hiện là drawer trượt phải gồm: ảnh góc phố + **danh sách câu nhắc có nút "thương"** + form viết.
Design (`lp5.png`) là **modal gọn chỉ còn form viết**: tên chủ đề + `📍 Phường`, textarea,
4 chip 4N, dòng note duyệt 4N, 2 ví dụ bấm-để-điền, checkbox opt-in, nút `Gửi câu nhắc`.

- [ ] Dựng modal mới theo design.
- [ ] **Thêm ô Số điện thoại** — email trang 9: *"Đang ko có ô điền số điện thoại"*.
      Design **không** vẽ ô này → làm theo email. Đã định danh: hiện "Đang dùng số bạn đã xác
      thực" + cho đổi; chưa định danh: nhập ngay tại đây thay vì bật modal định danh chồng lên.
      🔴 **F10: ô SĐT bắt buộc luôn, hay chỉ khi tick nhận ưu đãi?** (khuyến nghị: chỉ khi tick).
- [ ] 🔴 **F11 — QUAN TRỌNG: bỏ danh sách câu nhắc + nút "thương" trong drawer thì cư dân
      bình chọn từng câu ở đâu?** Design chỉ có nút `Bình chọn` ở dòng góc phố (B3) — bấm vào
      ra cái gì? 3 phương án:
      (a) nút `Bình chọn` mở **modal thứ hai** liệt kê các câu của góc phố đó để chọn;
      (b) mở **trang riêng** `/goc-pho/[id]`;
      (c) bấm = thương thẳng câu đang dẫn đầu (mất khả năng chọn câu khác).
      **Khuyến nghị (a)** — giữ nguyên cơ chế 1 phiếu/câu, ít rủi ro nhất cho luật điểm.
- [ ] Bỏ ảnh góc phố trong modal? Design không vẽ → 🔴 gộp vào F11.

### C3 · Modal định danh "Để FPT gửi ưu đãi đến bạn" (0.75 ngày) — `IdentifyModal.tsx`
Design `lp6.png`: `Số điện thoại` · `Tên người dùng` · `Địa chỉ khu phố` (tìm kiếm hoặc tự nhập)
· **`Tỉnh/thành phố` (select)** · nút `Bắt đầu thôi`.

- [ ] Thêm select Tỉnh/thành (load `GET /api/v1/geo`), **bắt buộc** khi tự nhập tên khu phố
      (email trang 6). Đổi nhãn theo design.
- [ ] API `/api/v1/auth/identify`: nhận `neighborhood_city`/`neighborhood_ward`, validate bằng
      `geoError()`, **truyền tiếp vào `resolveNeighborhoodId(..., { city, ward })`** — hiện đang
      gọi thiếu tham số `geo` nên khu phố tự nhập lưu `city = NULL` (bug thật, sửa luôn).
- [ ] Chặn ở server: free text mà thiếu `city` → 400.
- [ ] Design bỏ select Phường/Xã (chỉ còn Tỉnh) → 🔴 **F12: có bắt buộc Phường/Xã không?**

### C4 · Sửa bug nút "Đề xuất góc phố mới" mở nhầm form ưu đãi (0.25 ngày)
Email trang 6: *"click vào đang ra ô offer ưu đãi, chưa đúng form đề xuất khu phố và vấn đề"*.

- [ ] **Nguyên nhân**: `HomeShell` gọi `requireIdentity(() => setProposeOpen(true))` → chưa định
      danh thì bật `IdentifyModal` tiêu đề "Để FPT gửi ưu đãi đến bạn 💛" trước.
- [ ] **Sửa**: mở thẳng `ProposeModal`, chỉ `requireIdentity` ở bước bấm *Gửi đề xuất*.
- [ ] Đổi tiêu đề `IdentifyModal` theo ngữ cảnh: vào từ luồng đề xuất/viết câu → "Cho xóm biết
      bạn là ai"; vào từ luồng ưu đãi → giữ copy hiện tại.
- [ ] 🔴 **F13: nhãn nút là "Đề xuất góc phố mới" (design, 3 chỗ) hay "Đề xuất khu phố mới"
      (email)?** Design nhất quán dùng "góc phố" → khuyến nghị giữ "góc phố".

---

# PHẦN D — Phần admin tương ứng

### D1 · Da admin (0.25 ngày hoặc 0) — `src/components/admin/AdminShell.tsx`
- [ ] 🔴 **F7: admin đổi màu theo skin cam, hay giữ da kem hiện tại?**
      Admin đang dùng chung token `brick`/`cream` với LP → đổi token ở A1 sẽ **tự động** đổi màu
      admin. Muốn giữ da cũ phải tách 2 bộ token theo scope (`.admin { … }`) — thêm ~0.5 ngày.
      **Khuyến nghị: để admin đổi theo** (rẻ, đồng bộ thương hiệu; admin nội bộ nên không rủi ro).

### D2 · Khu phố tiêu biểu (0.5 ngày) — `/admin/khu-pho`
- [ ] Slider giờ **chỉ lấy khu đạt chuẩn 4N** → trong bảng khu phố phải thấy rõ 2 cờ
      `certified_4n` + `is_featured` và cảnh báo khi bật "tiêu biểu" cho khu **chưa** đạt chuẩn
      (sẽ không hiện ra trang chủ).
- [ ] Design chỉ hiện **1 ảnh/khu** (bỏ chấm chuyển ảnh) → ghi chú trong màn upload: ảnh vị trí
      #1 là ảnh hiển thị trang chủ. 🔴 **F14: có bỏ hẳn tính năng 4 ảnh/khu không?**
      (khuyến nghị: giữ dữ liệu, chỉ hiển thị ảnh đầu).

### D3 · Nội dung trang chủ (1 ngày) — `/admin/noi-dung`, `src/lib/site-content.ts`
- [ ] **Thêm key mới** cho các text vừa xuất hiện trong design: tiêu đề + 2 dòng mô tả hero,
      tiêu đề khối B3, tiêu đề khối B7, tiêu đề + mô tả khối ưu đãi, **4 dòng footer** (gồm dòng
      hotline `1900 6600`), placeholder ô tìm kiếm.
- [ ] **Video: 1 → nhiều link** (email trang 4: *"back up ngầm cho em tool up link video… hiển
      thị được nhiều vid, play lần lượt"*): key `campaign_youtube_ids` (danh sách, giữ thứ tự),
      UI thêm/xoá/đổi thứ tự, nhận cả URL đầy đủ lẫn ID, có preview thumbnail. Giữ key cũ
      `campaign_youtube_id` làm fallback đọc. `CampaignMedia` play lần lượt (`playlist=` +
      `enablejsapi`) — dựng sẵn dù chưa render ra LP.
- [ ] Bỏ/ẩn ô sửa các text của khối đã gỡ khỏi LP, hoặc gom vào nhóm "Khối tạm ẩn".

### D4 · Duyệt câu nhắc — hiển thị preview biển (0.5 ngày) — `/admin/loi-nhac`
- [ ] Biển giờ render bằng template (B7) → admin cần **xem trước đúng như trên LP** khi duyệt
      (câu dài bao nhiêu chữ thì vỡ layout 2 dòng?). Thêm preview dùng chung component với LP.
- [ ] Giữ nguyên checklist 4N tick tay (quy tắc cứng 2) — **không** đụng.

### D5 · Chọn 6 biển hiển thị trang chủ (0.75 ngày — **chỉ làm nếu chốt F8 = ghim tay**)
- [ ] Migration thêm `suggestions.home_position smallint NULL` (1–6, unique).
- [ ] `/admin/loi-nhac` tab "Chọn câu & vòng đời biển": thêm cột/nút "Ghim lên trang chủ",
      kéo-thả thứ tự 6 vị trí, cảnh báo khi < 6 biển được ghim (phần thiếu tự bù theo ngày).
- [ ] `page.tsx` ưu tiên `home_position`, thiếu thì bù `approved_at DESC`.

### D6 · Leads: 2 cột mới (0.5 ngày) — `/admin/leads`, `/api/admin/leads`
- [ ] Bảng thêm cột **Tỉnh thành** + **Địa chỉ** (từ B8), thay cột "Khu phố" hiện tại.
- [ ] **CSV export thêm 2 cột** — nhớ sửa cả header và hàng dữ liệu (`format=csv`), giữ nguyên
      audit log `leads_export_csv`.
- [ ] Thêm **bộ lọc theo tỉnh thành** (sale chia vùng) — nhỏ mà dùng nhiều.

### D7 · Không đổi
Điểm/chống gian lận (`/admin/gian-lan`), theo dõi thương (`/admin/voting`), đăng nhập admin,
audit log — **giữ nguyên**.

---

# PHẦN E — Dữ liệu, API, migration

### E1 · Migration `010_lp_redesign.sql`
- [ ] `ALTER TABLE leads ADD COLUMN province varchar(120), ADD COLUMN address varchar(300);`
- [ ] *(nếu F8 = ghim tay)* `ALTER TABLE suggestions ADD COLUMN home_position smallint;`
      + unique partial index.
- [ ] Không đổi schema nào khác — mọi thứ còn lại là UI.

### E2 · API đổi
| Endpoint | Thay đổi |
|---|---|
| `GET /api/v1/counters` | Bỏ 2 field, thêm `suggestions_total` (theo F1) |
| `GET /api/v1/leaderboard` | Bỏ `neighborhood_of_month` |
| `POST /api/v1/auth/identify` | Nhận + validate `neighborhood_city`/`ward`, truyền vào `resolveNeighborhoodId` |
| `POST /api/v1/leads` | Nhận `province`, `address` (validate tỉnh bằng `geoError()`) |
| `POST /api/v1/issues/[id]/suggestions` | Nhận `phone` khi `lead_opt_in = true` |
| `GET /api/admin/leads` | Trả + export CSV 2 cột mới |
| `GET/PATCH /api/admin/site-content` | Key text mới + danh sách video |

### E3 · Dọn code chết
`getNeighborhoodOfMonth()`, `HomeData.neighborhoodOfMonth`, `voteSign`, `featured`, prop
`onVote`/`voted` của `HangSign`, `EXAMPLE_SIGNS` (nếu B7 không còn bù ví dụ), 3 nhánh
`EMPTY_HINT` cũ, `MapData.pins` nếu slider không dùng nữa (kiểm tra chỗ khác trước khi xoá).

---

# PHẦN F — 14 quyết định (đã chốt theo cột "Khuyến nghị" và đã code)

| # | Vấn đề | Email nói | Design nói | Khuyến nghị |
|---|---|---|---|---|
| **F1** | 3 con số nào? | biển · **khu phố** · **câu đóng góp** | biển · **góc phố đang chờ** · khu phố | Theo **email** (mới hơn, là chỉ đạo trực tiếp) |
| **F1b** | Tên khối biển | **"Biển mới của khu phố"** | "Lời nhắc khi lên biển trông như thế nào?" | Theo **email** |
| **F2** | 3 tab khối đóng góp | "Khu phố chờ bạn viết lời nhắc" / "Khu phố chờ bạn bình chọn" | "Mới nhất" / "Chờ bạn bình chọn" / "Cây bút của khu phố" | Lấy **tên tab của email** + **giữ tab "Cây bút"** của design (3 tab) |
| **F3** | Tab "Cây bút" liệt kê gì? | — | lorem, không rõ | ✅ **CHỐT: NGƯỜI (đại sứ)** — hàng = tên cây bút · khu phố · câu được thương nhất · điểm · nút chia sẻ ↗ |
| **F4** | Danh sách 5 dòng cố định hay phân trang? | "bỏ xem thêm" (nói về khối biển) | 5 dòng, không thấy nút xem thêm | **Phân trang 5 dòng/trang** để không mất dữ liệu |
| **F5** | Giữ 🔥, ▲▼ đổi hạng, nút chia sẻ ↗, "Bạn đang ở hạng #N"? | bỏ tab tuần | không vẽ | **Giữ ▲▼ và ↗**, bỏ 🔥 và dòng hạng cá nhân nếu không có chỗ |
| **F6** | File font + logo tròn chính thức? | — | dùng font riêng | **Cần Design cấp file**; chưa có thì tạm `Baloo 2` |
| **F7** | Admin đổi da theo skin cam? | — | — | **Có** (rẻ, đồng bộ) |
| **F8** | 6 biển: tự động theo ngày hay admin ghim tay? | "team plan pick ra 6 biển" | 6 ô cố định | **Tự động theo ngày** trước; ghim tay = +0.75 ngày (D5) |
| **F9** | Giữ combobox tìm khu phố + preview địa chỉ ở form đề xuất? | — | bỏ, thành input thường | **Giữ combobox** (tránh trùng khu phố) |
| **F10** | Ô SĐT ở form gửi câu nhắc: bắt buộc luôn? | "đang ko có ô điền SĐT" | không vẽ ô này | **Chỉ bắt buộc khi tick nhận ưu đãi** |
| **F11** | **Bỏ danh sách câu + nút thương trong drawer → bình chọn từng câu ở đâu?** | — | chỉ có nút "Bình chọn" ở dòng góc phố | **(a) mở modal thứ hai liệt kê câu để chọn** |
| **F12** | Định danh có bắt buộc Phường/Xã không? | "bắt buộc điền tỉnh thành" | chỉ có select Tỉnh | **Chỉ bắt buộc Tỉnh** |
| **F13** | Nhãn nút: "góc phố mới" hay "khu phố mới"? | "khu phố" | "góc phố" (3 chỗ) | **"góc phố mới"** theo design |
| **F14** | Bỏ hẳn 4 ảnh/khu phố? | — | 1 ảnh | ✅ **Giữ dữ liệu 4 ảnh ở admin, trang chủ chỉ hiện ảnh #1** — mũi tên/auto-slide chuyển thẳng sang khu kế |

---

# PHẦN G — Thứ tự thực thi & ước lượng

| Giai đoạn | Task | Ước tính |
|---|---|---|
| **0. Chốt** | Trả lời §F, Design cấp font + logo + KV bản nén | — |
| **1. Nền** | A1 A2 A3 A4 | 1.5 ngày |
| **2. Hero** | A5 · B1 · B2 | 2 ngày |
| **3. Khối chính** | B3 · B4 · B5 | 3 ngày |
| **4. Biển** | B7 (+ D4) | 2 ngày |
| **5. Modal** | C1 · C2 · C3 · C4 | 4 ngày |
| **6. Ưu đãi + footer** | B8 · B9 · B6 · E1 | 1.5 ngày |
| **7. Admin** | D1 D2 D3 D6 (+D5 nếu chốt) | 2.5–3.5 ngày |
| **8. Dọn + kiểm thử** | E3 · H | 1.5 ngày |
| | **Tổng** | **~18–19 ngày công** |

Có thể cắt song song: nhánh LP (1→6) và nhánh admin (7) làm song song sau khi xong giai đoạn 1.

---

# PHẦN H — Định nghĩa hoàn thành

- [ ] `pnpm test` pass (3 test case điểm 05 §4 — quy tắc cứng 4).
- [ ] `npx tsc --noEmit` + `pnpm lint` sạch. **Không chạy `pnpm build` khi dev server đang chạy.**
- [ ] Mobile 360px không vỡ (design chỉ có bản desktop → **🔴 cần Design cấp bản mobile**,
      hoặc dev tự quy đổi và team duyệt lại).
- [ ] LCP < 2.5s — KV 3D 15MB **bắt buộc** nén + `priority`/`sizes` đúng.
- [ ] Luồng end-to-end còn nguyên: đề xuất → duyệt → viết câu → thương → duyệt 4N → chọn câu →
      installed → +30đ + banner in-web.
- [ ] Quy tắc cứng không vi phạm: không OTP/SMS, SĐT không ra client, opt-in mặc định không tick,
      không có gì công khai trước khi duyệt.
- [ ] Cập nhật `docs/16-FRONTEND-UI.md`, `docs/02-FUNCTIONAL-SPEC.md`, `CLAUDE.md`.

---

*Ghi chú: file này gộp và thay thế `docs/admin/TASK-dieu-chinh-admin-v1.md` (bản chỉ có phần email).*

---

## Nhật ký kiểm chứng sau khi dev (18/8)

| Kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit` | ✅ sạch |
| `pnpm test` (19 test, gồm 3 case điểm 05 §4) | ✅ pass |
| `pnpm lint` | ⚠️ không chạy được — repo chưa cấu hình ESLint, `next lint` bung prompt hỏi cấu hình (có từ trước, không phải do đợt này) |
| Chạy thật end-to-end | ⚠️ **chưa chạy được**: Docker chưa bật nên không có Postgres/MinIO; cần `docker compose up -d` + `node scripts/migrate.mjs` (migration 010) rồi soát lại bằng mắt |
| Nén asset | ✅ KV 15MB → 400KB (`public/brand/kv-khu-pho.webp`), có bản `-sm` 160KB cho footer |
