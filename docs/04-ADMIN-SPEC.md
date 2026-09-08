# Đặc tả trang quản trị — "Admin Khu Phố"
Phiên bản 1.0 · ~~Tham chiếu design: `Admin+Khu+Pho.dc.html`~~ — file này **không có trong repo**;
giao diện admin do team dev tự dựng, mô tả thực tế ở [`16-FRONTEND-UI.md`](16-FRONTEND-UI.md) §7.

> Cập nhật: 8/9/2026 — đồng bộ với code sau các đợt 18/8, 2–4/9, 7/9.
>
> **Bản đồ màn hình hiện tại (7 mục sidebar)** — đã gộp/đổi tên so với đặc tả gốc:
>
> | Màn | Nội dung | Ghi chú |
> |---|---|---|
> | `/admin` | Dashboard phân tích (`GET /api/admin/analytics`, lọc 7/30/90 ngày) | §1 |
> | `/admin/khu-pho` | Khu phố & chứng nhận · tab **Đề xuất góc phố** · tab **🗑 Đã xoá** | §2, §5 — gộp `/admin/de-xuat` (4/8) |
> | `/admin/loi-nhac` | Duyệt lời nhắc 4N · tab **Chọn câu & vòng đời biển** | §3, §4 — đổi tên từ `/admin/cau-nhac`, gộp `/admin/bien` (4/8) |
> | `/admin/voting` | **Theo dõi thương** — sửa số lượt thương của câu/người | §8b (MỚI) |
> | `/admin/leads` | Quản lý leads | §6 |
> | `/admin/noi-dung` | **Nội dung trang chủ** — 13 khoá text + **3 con số hero** | §8c (MỚI) |
> | `/admin/gian-lan` | Chống gian lận | §7 |
>
> **Đã XOÁ**: ~~`/admin/de-xuat`~~ · ~~`/admin/cau-nhac`~~ · ~~`/admin/bien`~~ (gộp 4/8) ·
> ~~`/admin/khu-pho/{id}/ban-do`~~ (§10 — trang chủ bỏ bản đồ) · ~~`/admin/diem`~~ (§8 — chưa bao
> giờ có trong code) · ~~`/admin/import`~~ (§11 — thay bằng 2 nút "📥 Import file" trong màn
> Khu phố và màn Lời nhắc).
>
> Mọi bộ lọc / tìm kiếm / phân trang của admin nằm trên **query string**
> (`?tab=…&status=…&q=…&page=…&per=…`) qua `useUrlState` — chia sẻ link là ra đúng màn đang xem.

> Trang Admin dành cho đội vận hành chiến dịch FPT Telecom. Đăng nhập bằng tài khoản role=admin (tài khoản nội bộ FPT: **email + mật khẩu**, email bắt buộc đuôi **@fpt.com** — validate cả client và server, kèm 2FA TOTP khuyến nghị. KHÔNG dùng cơ chế định danh SĐT của trang public, vì admin có quyền cao và bỏ OTP phía public không được làm yếu cửa admin)

**Đặc tả đăng nhập admin:**
- Email: regex `^[a-zA-Z0-9._%+-]+@fpt\.com$` — kiểm tra ở **server-side** (client chỉ để UX); email khác đuôi @fpt.com bị từ chối ngay cả khi tồn tại trong DB (defense in depth).
- Mật khẩu: tối thiểu 12 ký tự; hash **Argon2id** (không dùng MD5/SHA thuần); khoá tài khoản 15 phút sau 5 lần sai liên tiếp; thông báo lỗi chung "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không).
- 2FA TOTP (khuyến nghị giữ): sau email + mật khẩu đúng → nhập mã 6 số từ app authenticator; secret cấp lúc tạo tài khoản qua QR, kèm 10 mã dự phòng dùng 1 lần.
- Session admin **tách hoàn toàn** khỏi session public: cookie riêng `kp_admin_session` (HttpOnly, Secure, SameSite=Strict), TTL 8 giờ, không gia hạn tự động qua đêm.
- Tài khoản admin do super-admin tạo thủ công (không có form tự đăng ký); vô hiệu hoá được ngay lập tức (revoke toàn bộ session).. Toàn bộ đường dẫn dưới `/admin`, không index SEO, chặn robots.

---

## 1. Dashboard tổng quan

- ~~4 KPI lớn~~ → **3 KPI** đồng bộ bộ đếm public: **biển đã treo · khu phố · câu đóng góp**.
- Màn `/admin` hiện đọc `GET /api/admin/analytics` (cache 60s) với bộ lọc **7 / 30 / 90 ngày**,
  khu phố, chủ đề; kỳ so sánh là cùng độ dài liền trước. Leads và cư dân mới không có chủ đề, leads
  không gắn khu phố ⇒ hai khối đó bỏ qua bộ lọc tương ứng (UI có ghi chú).
- KPI vận hành: đề xuất chờ duyệt, câu chờ duyệt, câu đã chọn chưa sản xuất, biển đang sản xuất.
- KPI thương mại (chỉ admin thấy): lead mới tầng 1 / tầng 2, lead theo trạng thái.
- Biểu đồ theo ngày: câu nhắc gửi, lượt thương, lead (14 ngày gần nhất).

## 2. Duyệt đề xuất góc phố (Bước 3 - phần a) — `/admin/khu-pho?tab=de-xuat`

- Bảng **xem được mọi trạng thái** (không chỉ hàng chờ), mặc định `pending_review`: thời gian,
  người gửi, khu phố, chủ đề, vị trí, mô tả. Có bộ lọc chủ đề / khu phố / tỉnh-thành, ô tìm kiếm
  và phân trang; badge trên tab đếm theo **cùng bộ lọc**.
- Hành động: **Duyệt** (→ hiện công khai, +2 điểm nếu chưa vượt trần 3/tuần; khu phố `hidden` tự
  hiện công khai) · **Từ chối** qua **popup nhập lý do** nội bộ (không hiển thị công khai).
- Từ chối cũng **kéo theo câu nhắc gửi kèm** còn `submitted` sang `rejected` (khỏi kẹt trong hàng
  chờ vô hình) và ghi `audit_logs` (`issue_approve` / `issue_reject`).
- ~~Khối "💬 Câu nhắc gửi kèm" trên mỗi dòng~~ — **gỡ khỏi UI 7/9** ("gỡ cho đỡ rối") vì popup đề
  xuất không còn ô câu nhắc kèm; API cũng bỏ `attached_suggestion`. **Hành vi backend giữ nguyên**.
- Cả hai hành động tạo **notification in-web** cho người đề xuất (`issue_approved` / `issue_rejected`).
- Tiêu chí duyệt (hiển thị checklist nhắc admin): thuộc danh mục an toàn đời thường; không đích danh người/nhà; vị trí đủ cụ thể; không trùng vấn đề đã có (gợi ý trùng theo vị trí gần nhau).

## 3. Duyệt lời nhắc (Bước 3 - phần b) — `/admin/loi-nhac`

- Bảng hàng chờ `submitted`: nội dung câu, tác giả, vấn đề/vị trí, thời gian.
- **Checklist 4N thủ công (Q2 — người duyệt trực tiếp, không chấm tự động):** admin tick 4 ô `Nhắc · Nhở · Nhỏ · Nhẹ` theo định nghĩa 06-CONTENT-COPY §3; nút **Duyệt hiển thị** chỉ bật khi đủ 4 ô (→ approved, +5 điểm, mở bình chọn, lưu review_4n). **Từ chối** (+ lý do) không cần tick.
- Tiêu chí duyệt (checklist): trung lập, **không công kích, không nêu đích danh**; đạt chuẩn 4N; đúng ngữ cảnh vấn đề; chính tả ổn.
- Bộ lọc: trạng thái (tabs), chủ đề, khu phố, tỉnh/thành + ô tìm kiếm (nội dung, người đăng, khu phố, vị trí).
- **Không phân trang khi không truyền `per`** — tab "Chọn câu & vòng đời biển" cần đủ danh sách.
- Câu `submitted` của đề xuất đang `pending_review`/`rejected` **không vào danh sách này** (#17) —
  admin xử lý chúng ở màn duyệt đề xuất.
- Có nút **📥 Import file** (Excel/CSV 5 cột) — câu import coi như **đã duyệt**, 4N tick đủ, **không cộng điểm**.

## 4. Chọn câu & quản lý vòng đời biển (Bước 3→4) — `/admin/loi-nhac?tab=bien`

- Với mỗi issue đang `voting`: bảng các câu approved xếp theo lượt thương (chỉ đếm phiếu hợp lệ). Nút **"Chọn câu này lên biển"** — mặc định gợi ý câu cao phiếu nhất; nếu admin chọn câu khác phải nhập lý do (đảm bảo trung lập/tránh rủi ro nội dung).
- Pipeline trạng thái biển: `selected → produced → installed`, mỗi bước 1 nút + timestamp.
- Khi bấm **"Đã treo biển"** (installed): hệ thống tự động — góc phố → signed, +30 điểm tác giả,
  counter +1, tạo **thông báo in-web** cho tác giả (không SMS — Q1). ~~pin đổi xanh, panel bản đồ~~
  — trang chủ không còn bản đồ; câu hiện ở trang share `/bien/{id}`.
- Trường nhập kèm: ảnh biển thực tế (upload → `suggestions.image_key`), ngày treo.
  Ô "ngày treo" là **`Record<id, string>` riêng cho từng dòng** — trước 2/9 cả khối dùng chung một
  state nên nhập ngày ở dòng A rồi bấm ở dòng B lại ghi ngày của A (QC · B2).

## 5. Khu phố, chứng nhận, slot slide, xoá mềm — `/admin/khu-pho`

- Danh sách khu phố dạng bảng + tiến độ: số góc phố đã duyệt / số biển đã treo / % hoàn thành.
- **Thêm khu phố**: tên + **Tỉnh/thành phố** + **Phường/Xã** (chọn từ danh mục 34 tỉnh · 3.321
  phường/xã, `GET /api/v1/geo`); ~~ô quận/huyện~~ đã bỏ (địa giới mới 1/7/2025). Có nút
  **📥 Import file** (Excel/CSV 3 cột) và nút tải template.
- **Ảnh**: tối đa **4 ảnh tổng quan** (server chuẩn hoá 1280×720 nên các slot luôn cùng cỡ; trang chủ
  chỉ lấy ảnh #1) + tối đa **1 ảnh chứng nhận** (upload được bất kỳ lúc nào, không phụ thuộc 4N).

### 5.1 Ba trạng thái bật/tắt KHÔNG điều kiện (chốt 7/9)

| Công tắc | Ý nghĩa | Ràng buộc cũ đã BỎ |
|---|---|---|
| Hiển thị website | `NOT hidden` | — |
| Khu phố tiêu biểu | `is_featured` → vào slider hero | ~~bắt buộc đang hiển thị; ẩn website thì server tự tắt tiêu biểu~~ |
| Đạt chuẩn 4N | `certified_4n` | ~~bắt buộc 100% biển đã treo~~ |

Chứng nhận 4N là **quyết định vận hành** (có buổi trao biển ngoài đời), không phải hệ quả tự động
của dữ liệu web. UI chỉ còn **cảnh báo trong tooltip**: khu đang ẩn mà bật tiêu biểu thì cờ vẫn lưu
nhưng chưa ra slider (server công khai vẫn lọc `NOT hidden`).

### 5.2 `featured_position` = SLOT SLIDE của hero, đúng 10 chỗ

- Slot là **duy nhất** (unique index bộ phận, bỏ qua khu đã xoá). Xếp trùng slot của khu khác →
  server **HOÁN ĐỔI** hai khu, không báo lỗi.
- Bỏ cờ tiêu biểu ⇒ nhả slot.
- Ba ca thông báo (đừng gộp): slot còn trống → *Đã xếp vào slot slide số N ✓*; khu vừa xếp đang
  giữ slot khác → *đổi chỗ với "X" (giờ ở slot cũ)*; khu vừa xếp chưa có slot → *"X" bị đẩy ra
  khỏi 10 slot*.

### 5.3 Xoá mềm + tab 🗑 Đã xoá

- Nút **🗑 Xoá** chỉ đặt `deleted_at`, đồng thời `hidden=true`, `is_featured=false`, nhả slot.
- Tab **🗑 Đã xoá** + nút khôi phục (`PATCH { restore: true }`) — khôi phục xong khu ở trạng thái
  **ẩn**, admin kiểm rồi mới bật.
- Khu đã xoá **biến mất cả cụm khỏi web** (trang chủ, tra cứu, IssueBoard, khối biển, popup,
  `/khu-pho/<slug>` → 404, OG image). **Điểm / lượt thương / câu nhắc KHÔNG bị xoá** — khôi phục là
  về nguyên trạng.
- Tạo khu mới trùng tên với khu **đã xoá** → lỗi nói rõ *"vào tab 'Đã xoá' để khôi phục thay vì tạo mới"*.

## 6. Quản lý leads

- Bảng leads: thời gian, tên, SĐT (che giữa dạng 090***123, bấm để hiện — có log truy cập),
  **Tỉnh/thành**, **Địa chỉ** (2 cột thêm 18/8), khu phố, quan tâm, nguồn (tầng 1/tầng 2), trạng thái.
- Lọc theo **tỉnh/thành** (sale chia vùng); CSV xuất thêm 2 cột tương ứng (9 cột).
- Chỉ hiển thị bản ghi `opted_in = true`. SĐT "báo tin vui" không opt-in **không xuất hiện** ở đây.
- Hành động: đổi trạng thái (new → contacted → converted/closed), ghi chú, **Export CSV** (log ai export, khi nào).
- MVP không tích hợp CRM tự động — export CSV bàn giao đội sale (xem 07-NFR-TECH Q4).

## 7. Chống gian lận

- Tab cảnh báo: cụm tài khoản đăng ký cùng lúc/cùng IP, chuỗi vote bất thường, một người nhận thương hàng loạt từ tài khoản mới.
- Hành động: **Vô hiệu phiếu** (is_valid=false) · **Shadow-ban tài khoản**. Mọi hành động im lặng — không thông báo cho người dùng, không đổi UI phía họ.

## 8. ~~Quản lý danh mục & bảng xếp hạng~~ — CHƯA TRIỂN KHAI

- ~~Sửa danh sách khu phố (thêm khu mới, toạ độ pin)~~ → phần khu phố đã có ở §5; **pin không còn**.
- ~~Màn sổ cái điểm `/admin/diem` + `GET /api/admin/scores`~~ — **không có trong code**. Việc đối
  soát điểm hiện làm ở §8b, §7 và truy vấn `score_events` bằng psql. (Nợ kỹ thuật: `20` §3.)
- ~~Nút "Chốt kỳ tháng"~~ — bảng `month_snapshots` đã tạo nhưng **chưa dùng**; khối "Khu phố dễ
  thương nhất tháng" cũng đã gỡ khỏi trang chủ 18/8.

## 8b. Theo dõi thương (`/admin/voting`) — MỚI

Admin sửa **số lượt thương** của một câu hoặc của một người qua `PATCH /api/admin/votes`.

- **Tăng** = chèn phiếu `votes` **thật** với `source='admin'`, `user_id NULL` (migration 007) nên
  mọi query đếm votes hiện có không phải sửa.
- **Giảm** = xoá hẳn phiếu admin trước, hết mới vô hiệu (`is_valid=false`) phiếu cư dân **mới nhất**
  — giữ bản ghi để trạng thái "đã bình chọn" của người bấm không đổi.
- Điểm ghi/thu hồi kèm theo qua `recordVoteReceivedBulk` / `invalidateVoteReceivedBulk`.
- Luôn ghi `audit_logs` action **`votes_adjust`** kèm `{from, to}` — hành động nhạy cảm như reveal SĐT.
- Theo **người nhận**: tăng thì dồn phiếu vào câu cao phiếu nhất; giảm thì gỡ trên toàn bộ câu của họ.

## 8c. Nội dung trang chủ (`/admin/noi-dung`) — MỚI

Sửa text hiển thị trang chủ: hero (tiêu đề, mô tả, placeholder ô tra cứu), khối đóng góp, khối biển,
khối ưu đãi, chân trang. Bảng `site_content` **chỉ lưu ghi đè** — để trống hoặc trùng mặc định là
**xoá ghi đè** (quay về copy gốc trong `src/lib/site-content-defaults.ts`).

Hiện đúng **13 khoá text**. Đã gỡ: 4 khoá `campaign_*` (khối TVC/KV, 4/9 — route ảnh KV
`/api/admin/site-content/kv` cũng xoá) và 4 khoá `sign_promo_*` / `sign_sale_phone` / `sign_hotline`
(dải khuyến mãi trên biển, 3/9). Ghi `audit_logs` action `site_content_update`.

### 8c-bis. Ghi đè dải 3 con số ở hero (MỚI 8/9)

Cùng màn `/admin/noi-dung`, một khối riêng cho `Biển đã treo` · `Khu phố` · `Câu đóng góp`.

- **Vì sao có**: chiến dịch trao biển ngoài đời thường đi trước dữ liệu trên web; số hiển thị ở
  trang chủ là con số truyền thông, không nhất thiết bằng số bản ghi trong DB.
- Mỗi ô có **placeholder là số đếm thật** — để trống nghĩa là "cứ tự đếm".
- Nhập số ⇒ trang chủ và `GET /api/v1/counters` hiện đúng số đó. **Xoá ô ⇒ quay lại tự đếm.**
- Chỉ nhận **số nguyên 0…1.000.000**; ngoài khoảng đó API trả 400.
- **Dashboard `/admin` KHÔNG bị ảnh hưởng** — nó đọc `getRealCounters()` để admin luôn thấy dữ
  liệu thật. Đây là điểm phải giữ khi sửa code sau này.
- Lưu trong bảng `site_content` (3 khoá `counter_*`), **không có migration**, cùng audit
  `site_content_update`.

## 9. Phân quyền

| Role | Quyền |
|------|-------|
| `admin` | Toàn bộ mục trên |

> Q7 đã chốt: **không có tài khoản chính quyền trong MVP.** Nhu cầu báo cáo cho công an xã/phường đáp ứng bằng export offline (CSV/PDF từ dashboard).

## 10. ~~Trình quản lý bản đồ (Q3)~~ — ĐÃ GỠ (1/8)

Trang chủ bỏ bản đồ từ 1/8 nên màn `/admin/khu-pho/{id}/ban-do` và hai route ảnh bản đồ
(`POST`/`GET /api/admin/neighborhoods/{id}/map-image`) **không còn trong code**. Ảnh khu phố nay
quản lý ở §5 (4 ảnh tổng quan + 1 ảnh chứng nhận). `stylizeMap()` trong `src/lib/stylize.ts` giờ
**mồ côi** (chỉ `scripts/seed-images.mjs` và test còn gọi).

<details>
<summary>Đặc tả trình quản lý bản đồ gốc (lưu trữ)</summary>

### Trình quản lý bản đồ (Q3)

- Mỗi khu phố: **upload 1 ảnh bản đồ** (jpg/png ≤ 10MB) → xem preview **bản cách điệu tự động** (filter duotone/posterize theo bảng màu chiến dịch) đúng như người dân sẽ thấy.
- **Đặt pin bằng click**: chọn issue chưa có toạ độ → click vị trí trên ảnh → lưu pin_x/pin_y (%). Kéo-thả để chỉnh.
- Với mỗi pin: upload **ảnh thật của địa điểm** (photo_url) — hiển thị khi người dân bấm pin.
- Thay ảnh bản đồ: pins giữ nguyên toạ độ %, admin được cảnh báo kiểm tra lại vị trí.

</details>

## 11. Import từ file (Q6)

**Đang chạy**: hai nút **"📥 Import file"** đặt ngay trong màn tương ứng, mỗi nút có `GET` tải
template `.xlsx` riêng. ~~Một màn `/admin/import` với template 2 sheet `KhuPho` + `VanDe`~~ chưa bao
giờ được triển khai.

| Nút ở màn | Route | Cột |
|---|---|---|
| Khu phố | `/api/admin/neighborhoods/import` | `Tên khu phố \| Tỉnh/Thành phố \| Phường/Xã` |
| Lời nhắc | `/api/admin/suggestions/import` | `Câu (≤120) \| Tên khu phố (đã có) \| Vị trí treo biển \| Chủ đề (mã hoặc tên) \| Người đăng` |

- Cả hai: quy trình **validate → commit**, all-or-nothing, nhận cả `.xlsx` lẫn `.csv`
  (CSV không BOM được tự giải mã UTF-8 — QC 2/9 · B1).
- Import **câu** thì: câu coi như **đã duyệt** (`approved`, 4N tick đủ) và **không cộng điểm**;
  góc phố chưa có thì tạo mới ở `waiting` rồi chuyển `voting`; người đăng chưa có thì tạo cư dân mới.
- Import **khu phố** báo riêng lỗi *"trùng tên với khu phố ĐÃ XOÁ"* để admin đi khôi phục.
- Có ghi nhật ký import.

<details>
<summary>Đặc tả bulk import gốc (lưu trữ)</summary>

### Bulk import khu phố pilot (Q6 — 20 khu phố trong 1 lần)

- Upload file Excel theo **template `import-template.xlsx`** (2 sheet: `KhuPho`, `VanDe` — cấu trúc trong file kèm hướng dẫn).
- Quy trình 3 bước: **Upload → Validate & Preview → Commit**. Validate báo lỗi theo từng dòng (khu phố trùng tên, loại vấn đề sai mã, thiếu vị trí...) — không ghi gì vào DB nếu còn lỗi (all-or-nothing).
- Ảnh (bản đồ, địa điểm) upload kèm dạng zip cùng tên file khớp cột trong Excel, hoặc bổ sung sau qua §10.
- Import tạo: neighborhoods + issues ở trạng thái `waiting` (mặc định coi như đã duyệt vì do admin nhập).

</details>
