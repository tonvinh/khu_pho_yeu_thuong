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
