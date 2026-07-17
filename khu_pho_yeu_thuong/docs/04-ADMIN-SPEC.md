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
