# URD — Yêu cầu người dùng · Website "Khu Phố Của Tôi"
Chiến dịch **"Khu phố biết thương"** · FPT Telecom
Phiên bản **2.0 (URD)** · 10/09/2026 · Owner: Product Manager Website
Tiền thân: PRD 1.0 (17/07/2026) — bối cảnh, mục tiêu, personas, KPI **giữ nguyên nội dung đã duyệt**;
bản 2.0 bổ sung phần yêu cầu người dùng theo từng vai trò, **gồm cả vai trò Admin** vốn trước đây
chỉ nằm ở [`04-ADMIN-SPEC.md`](04-ADMIN-SPEC.md).

> **Tài liệu này trả lời: ai dùng hệ thống, họ được làm gì, và điều gì tuyệt đối không được phép.**
> Nó KHÔNG mô tả cách hiện thực. Hành vi từng màn ở [`02`](02-FUNCTIONAL-SPEC.md), chi tiết admin ở
> [`04`](04-ADMIN-SPEC.md), endpoint ở [`13`](13-API-REFERENCE.md), cơ chế bảo mật ở [`14`](14-BAO-MAT-VA-QUYEN-RIENG-TU.md).
>
> **Đọc cho mục đích đánh giá bên thứ ba (pentest / kiểm toán)**: bắt đầu ở §4 (vai trò & ranh giới
> tin cậy), §5–§6 (quyền của từng vai trò), §8 (dữ liệu cá nhân & đồng thuận), §10 (khoảng trống đã
> biết — đã công bố, không phải phát hiện mới).

---

## 1. Bối cảnh & Tầm nhìn

FPT Telecom triển khai chiến dịch treo biển nhắc nhở dễ thương ("câu nhắc") tại các ngõ/hẻm/xóm — nối tiếp hơn **10.000 lời nhắc** đã có mặt khắp ngõ hẻm Việt Nam. Website "Khu Phố Của Tôi" là **hub trung tâm của toàn chiến dịch**, biến mô hình từ *"FPT phát biển xuống cho dân"* thành *"dân cùng tạo ra khu phố của mình"*.

**Định vị:** Nền tảng để người dân, chính quyền và FPT cùng xây dựng những khu phố an toàn và đáng sống hơn, theo vòng lặp: **nêu vấn đề → viết câu nhắc → bình chọn → theo dõi kết quả**.

## 2. Mục tiêu kinh doanh (4 vai trò của website)

| # | Vai trò | Mô tả |
|---|---------|-------|
| 1 | **Xây dựng Brand Love** | Người dân là đồng tác giả câu nhắc → gắn bó cảm xúc sâu hơn nhiều so với biển phát sẵn |
| 2 | **Gamification giữ chân** | Bảng xếp hạng "Đại sứ khu phố", thi đua hoàn thiện "Khu phố biết thương" |
| 3 | **Dữ liệu cho chính quyền** | Danh sách góc phố do dân nêu = dữ liệu thật về điểm nóng, giá trị nghiệp vụ cho công an xã/phường. *(Không còn màn hình bản đồ — dữ liệu xuất offline theo Q7.)* |
| 4 | **Kênh core chuẩn 4N** | "Một cửa" để mọi hoạt động truyền thông (đại sứ, biệt đội treo biển, trend MXH) quy về |

**Một CTA duy nhất cho mọi hoạt động:** *"Lên Khu Phố Của Tôi, viết câu nhắc cho xóm mình."*

**Mục tiêu thương mại (thứ cấp, không phô trương):** thu lead Internet/Truyền hình/FPT Play/Camera qua 2 tầng opt-in tự nguyện (xem [`02`](02-FUNCTIONAL-SPEC.md) §7).

## 3. Người dùng & Personas

| Persona | Mô tả | Nhu cầu chính |
|---------|-------|---------------|
| **Cư dân đóng góp** (Cô Tám tạp hoá, Anh Dũng, Minh lớp 11) | Người dân trong khu phố, mọi lứa tuổi, dùng điện thoại là chính | Nêu vấn đề khu mình, viết câu nhắc, bình chọn, khoe khi câu được treo |
| **Người xem thụ động** | Vào từ MXH/QR trên biển | Đọc câu hay, tra chứng nhận khu phố, có thể để lại lead |
| **Admin FPT (vận hành)** | Đội chiến dịch FPT Telecom | Duyệt đề xuất, duyệt câu, quản lý sản xuất & treo biển, quản lý leads, chỉnh nội dung trang chủ |
| **Chính quyền** | Công an xã/phường, tổ dân phố | Nhận báo cáo offline (export CSV từ admin) — **KHÔNG có tài khoản trong hệ thống** (Q7) |

---

## 4. Vai trò hệ thống & ranh giới tin cậy

Hệ thống có **đúng ba mức truy cập**. Không có vai trò trung gian, không có self-service tạo tài khoản admin.

| Mã | Vai trò | Cách trở thành | Chứng thực | Phạm vi |
|---|---|---|---|---|
| `R0` | **Khách vãng lai** | Mở web | Không | Chỉ đọc nội dung đã được duyệt công khai |
| `R1` | **Cư dân đã định danh** | Nhập SĐT + tên (**không OTP, không SMS** — quyết định Q1) | Cookie phiên `kp_session`, 180 ngày | Đọc như R0 + mọi hành động đóng góp dưới danh nghĩa chính mình |
| `R2` | **Admin vận hành** | Super-admin tạo thủ công bằng `scripts/create-admin.mjs`; **không có form tự đăng ký** | Email đuôi `@fpt.com` + mật khẩu (Argon2id) + TOTP tuỳ chọn; cookie `kp_admin_session`, 8 giờ | Toàn quyền kiểm duyệt, vận hành, xem dữ liệu cá nhân đã opt-in |

**Ranh giới tin cậy phải giữ:**

1. **R1 không bao giờ leo lên R2.** Hai hệ chứng thực tách hoàn toàn: cookie khác nhau, bảng khác nhau, không có đường nâng quyền nào trong sản phẩm. Bỏ OTP ở cửa public **không được** làm yếu cửa admin.
2. **R0/R1 chỉ thấy nội dung đã qua duyệt.** Đề xuất và câu nhắc chưa duyệt không xuất hiện ở bất kỳ bề mặt công khai nào, kể cả dưới dạng bộ đếm.
3. **R1 hành động chỉ dưới danh nghĩa chính mình** — không viết/bình chọn/để lại SĐT thay người khác.
4. **Không vai trò nào đọc được SĐT gốc của người khác**, trừ R2 với bản ghi đã opt-in, và mọi lần đọc đều ghi nhật ký.

### 4.1 Ma trận quyền (mức yêu cầu, không phải mức endpoint)

| Việc | R0 khách | R1 cư dân | R2 admin |
|---|:--:|:--:|:--:|
| Đọc trang chủ, hồ sơ khu phố, hồ sơ cây bút, trang chia sẻ | ✅ | ✅ | ✅ |
| Tra cứu khu phố đã đạt chuẩn 4N | ✅ | ✅ | ✅ |
| Đề xuất góc phố cần treo biển | ❌ | ✅ | — (duyệt, không tự đề xuất) |
| Viết lời nhắc | ❌ | ✅ | ✅ *(thay mặt, qua import/sửa)* |
| Bình chọn lời nhắc | ❌ | ✅ | ✅ *(điều chỉnh số lượt, không bình chọn)* |
| Để lại SĐT nhận ưu đãi | ❌ | ✅ | — |
| Xem điểm & thứ hạng của chính mình | ❌ | ✅ | ✅ *(xem của mọi người)* |
| Nhận thông báo in-web | ❌ | ✅ | — |
| Duyệt / từ chối nội dung | ❌ | ❌ | ✅ |
| Chọn câu lên biển, cập nhật vòng đời biển | ❌ | ❌ | ✅ |
| Quản lý khu phố, cấp/thu hồi chứng nhận 4N | ❌ | ❌ | ✅ |
| Xem SĐT cư dân đã opt-in, xuất CSV | ❌ | ❌ | ✅ *(ghi nhật ký)* |
| Sửa nội dung chữ & 3 con số trang chủ | ❌ | ❌ | ✅ |
| Shadow-ban, vô hiệu phiếu gian lận | ❌ | ❌ | ✅ |

---

## 5. Yêu cầu người dùng — Khách & Cư dân (`UR-U-*`)

| Mã | Vai trò | Người dùng muốn… | Điều kiện & ràng buộc bắt buộc |
|---|---|---|---|
| **UR-U-01** | R0 | Xem trang chủ và hiểu chiến dịch ngay trên điện thoại | Mobile-first; không phần tử nào chạm mép ở khổ 375px |
| **UR-U-02** | R0 | Tra cứu xóm mình đã đạt chuẩn 4N chưa | Gõ tên khu phố → kết quả mở **popup hồ sơ khu phố**, không rời trang |
| **UR-U-03** | R0 | Đọc lời nhắc hay và xem ai đóng góp nhiều | Chỉ hiện câu đã duyệt; tab "Cây bút của khu phố" là **người**, top 10 |
| **UR-U-04** | R0 | Chia sẻ thành tích khu phố / cây bút ra Facebook, Zalo | Mỗi khu phố và mỗi cây bút có URL công khai + ảnh OG động |
| **UR-U-05** | R0→R1 | Tham gia **không phải chờ OTP, không nhận SMS** | Định danh = SĐT + tên hiển thị + tỉnh/thành (+ khu phố). Hệ thống **không gửi SMS/OTP ở bất kỳ luồng nào** (Q1) |
| **UR-U-06** | R1 | Đề xuất một góc phố cần treo biển | Popup 2 bước; 1 chủ đề trong **6 chủ đề** cho phép; mô tả ≤1000 ký tự. Đề xuất vào hàng chờ, **không hiện công khai trước khi admin duyệt** |
| **UR-U-07** | R1 | Viết lời nhắc cho một góc phố cụ thể | ≤**120 ký tự** (tiêu chí "Nhỏ"); vào hàng chờ duyệt 4N; chọn góc phố qua popup, **hệ thống không tự đoán góc phố** |
| **UR-U-08** | R1 | Bình chọn lời nhắc mình thích | **1 phiếu / 1 câu / 1 tài khoản** · **cấm tự bình chọn câu của mình** · **bình chọn xong là chốt, không rút lại được** (Q6) |
| **UR-U-09** | R1 | Biết khi nào câu của mình được treo biển | Thông báo **in-web** khi quay lại (duyệt/từ chối đề xuất, duyệt/từ chối câu, câu lên biển). Không SMS, không email |
| **UR-U-10** | R1 | Thấy điểm và thứ hạng của mình | Công thức cố định: `2×đề xuất duyệt + 5×câu duyệt + 1×lượt thương + 30×câu được treo`; trần **3 đề xuất/tuần** |
| **UR-U-11** | R1 | Để lại SĐT để nhận ưu đãi FPT — **hoàn toàn tự nguyện** | Checkbox opt-in **mặc định không tick**; không tick vẫn đóng góp được bình thường và vẫn được trân trọng như nhau; văn bản nêu rõ mục đích dùng số |
| **UR-U-12** | R1 | Biết SĐT của mình được dùng làm gì, và đòi xoá được | Trang công khai `/chinh-sach-du-lieu`; yêu cầu xoá qua hotline **1900 6600** |
| **UR-U-13** | R1 | Không bị người khác mạo danh đóng góp | Một SĐT = một tài khoản = một tiếng nói; nhập SĐT khác số đang đăng nhập ở form ưu đãi thì phải **xác nhận chuyển định danh**, dữ liệu hai tài khoản **không gộp** |
| **UR-U-14** | R1 | Đăng xuất khỏi thiết bị đang dùng | Thu hồi phiên phía server, không chỉ xoá cookie |
| **UR-U-15** | R0/R1 | Không thấy SĐT của bất kỳ ai trên web | Không bề mặt công khai nào hiển thị SĐT, kể cả dạng che, kể cả của chính mình |

## 6. Yêu cầu người dùng — Admin vận hành (`UR-A-*`)

Bảy màn: `/admin` (dashboard) · `/admin/khu-pho` · `/admin/loi-nhac` · `/admin/voting` ·
`/admin/leads` · `/admin/noi-dung` · `/admin/gian-lan`. Chi tiết từng màn ở [`04`](04-ADMIN-SPEC.md),
cẩm nang vận hành ở [`17`](17-VAN-HANH-ADMIN.md).

| Mã | Admin muốn… | Điều kiện & ràng buộc bắt buộc |
|---|---|---|
| **UR-A-01** | Đăng nhập bằng tài khoản nội bộ FPT | Email **bắt buộc đuôi `@fpt.com`**, kiểm ở server; mật khẩu ≥12 ký tự hash Argon2id; **khoá 15 phút sau 5 lần sai**; thông báo lỗi chung không tiết lộ email có tồn tại; TOTP 6 số nếu tài khoản đã bật |
| **UR-A-02** | Phiên admin không sống lay lắt qua đêm | Cookie riêng `kp_admin_session`, **TTL 8 giờ**, SameSite=Strict, không tự gia hạn; toàn bộ `/admin` **noindex**, chặn robots |
| **UR-A-03** | Thấy ngay hôm nay phải làm gì | Dashboard: 3 KPI chiến dịch + hàng đợi vận hành (đề xuất chờ, câu chờ, đã chọn chưa sản xuất, đang sản xuất) + biểu đồ 7/30/90 ngày. **Dashboard hiện số đếm THẬT**, không phải số đã ghi đè cho trang chủ |
| **UR-A-04** | Duyệt hoặc từ chối đề xuất góc phố | Chỉ đề xuất đang chờ duyệt; từ chối **phải có lý do nội bộ** (không hiện cho cư dân); duyệt ⇒ khu phố tự nhập được hiện công khai + cộng điểm người đề xuất + thông báo in-web. SLA tham chiếu: **24 giờ** |
| **UR-A-05** | Duyệt lời nhắc theo chuẩn 4N | **Phải tick đủ 4 ô** Nhắc · Nhở · Nhỏ · Nhẹ mới duyệt được — không có chấm 4N tự động (Q2). Thiếu ô ⇒ từ chối thao tác |
| **UR-A-06** | Sửa câu sai chính tả / sai chỗ mà không phải bắt cư dân viết lại | Sửa được nội dung, chủ đề, vị trí, khu phố, **tên hiển thị tác giả**; khôi phục câu đã từ chối về hàng chờ. Đổi trạng thái **phải đi đúng vòng đời biển**, không nhảy bậc |
| **UR-A-07** | Chọn câu để đem đi làm biển | Chỉ câu đã duyệt; **chọn câu không cao phiếu nhất thì bắt buộc nhập lý do** (minh bạch với xóm và với chính quyền) |
| **UR-A-08** | Theo dõi biển từ lúc chọn đến lúc treo xong | Vòng đời một chiều: `đã chọn → đã sản xuất → đã treo`; đánh dấu đã treo ⇒ ghi ngày treo, cộng 30đ tác giả, góc phố thành "đã có biển", gửi thông báo in-web. Upload được ảnh biển thật |
| **UR-A-09** | Quản lý khu phố tham gia | Tạo/sửa; **tỉnh/thành + phường/xã phải thuộc danh mục chính quy 34 tỉnh / 3.321 phường xã** (địa giới từ 1/7/2025) — chọn, không nhập tay; trùng tên ⇒ báo lỗi rõ |
| **UR-A-10** | Quyết định khu nào lên slider trang chủ và ở slide số mấy | **Đúng 10 slot**; xếp vào slot đang có khu khác ⇒ **hoán đổi hai khu**, thông báo nói rõ khu nào bị đẩy đi đâu; bỏ cờ tiêu biểu ⇒ nhả slot |
| **UR-A-11** | Cấp chứng nhận "Khu phố biết thương" theo quyết định vận hành | **Không còn điều kiện máy móc "100% biển đã treo"** (chốt 7/9) — có buổi trao biển ngoài đời thì cấp; đặt ngày thủ công được; thu hồi được; upload ảnh chứng nhận bất kỳ lúc nào |
| **UR-A-12** | Ẩn hoặc xoá một khu phố mà không mất dữ liệu của cư dân | **Xoá mềm**: khu phố biến mất khỏi toàn bộ web (trang chủ, tra cứu, popup, trang chia sẻ → 404, ảnh OG) nhưng **điểm, câu nhắc, phiếu bình chọn giữ nguyên**; khôi phục được, và khôi phục về trạng thái **ẩn** để admin kiểm trước |
| **UR-A-13** | Nạp dữ liệu 20 khu phố pilot và câu duyệt sẵn từ Excel | Excel/CSV; **xem trước lỗi từng dòng rồi mới ghi**; còn lỗi ⇒ **không ghi gì** (all-or-nothing). Câu import coi như đã duyệt và **không cộng điểm** |
| **UR-A-14** | Chỉnh số lượt thương khi số liệu ngoài đời lệch web | Chỉnh theo câu hoặc theo người; tăng/giảm đều **ghi nhật ký thao tác** kèm số trước–sau; giảm **không xoá dấu vết người đã bình chọn** (trạng thái "đã bình chọn" của họ không đổi) |
| **UR-A-15** | Sửa chữ và 3 con số ở trang chủ không cần dev deploy | 13 khoá chữ + 3 con số hero; **để trống ⇒ quay về mặc định** (chữ gốc đã duyệt / số đếm thật); trang chủ đổi ngay |
| **UR-A-16** | Gọi lại cư dân đã đồng ý nhận ưu đãi | Danh sách **chỉ** bản ghi đã opt-in, SĐT **che sẵn**; bấm-để-hiện từng số; xuất CSV cho sale; lọc theo tỉnh; cập nhật trạng thái & ghi chú theo dõi |
| **UR-A-17** | Mọi lần chạm vào SĐT đều có dấu vết | Hiện 1 SĐT hoặc xuất CSV ⇒ **ghi `audit_logs`** (ai, lúc nào, bao nhiêu bản ghi). Duyệt/từ chối/chọn câu/treo biển cũng ghi nhật ký |
| **UR-A-18** | Chặn người cày phiếu **mà không bêu tên ai** | Ba nhóm cảnh báo tự động (nhiều tài khoản cùng thiết bị, phiếu dồn từ tài khoản mới, phiếu quá nhanh); **shadow-ban im lặng** — UI của người bị ban không đổi, phiếu của họ ngừng tính điểm; vô hiệu được phiếu đã ghi. **Không thông báo, không công bố** |
| **UR-A-19** | Biết rõ mình **không** làm được gì | Admin **không** xem được SĐT của người chưa opt-in (kỹ thuật không cho phép, không phải quy định); **không** đọc được ảnh ở vùng `private/`; **không** tự tạo tài khoản admin khác |

---

## 7. Phạm vi (Scope)

### 7.1 In scope
1. **Trang chủ công khai** (mobile-first): hero + slider khu phố tiêu biểu + ô tra cứu 4N, **3 con số**, khối đóng góp 3 tab (góc phố · lời nhắc chờ bình chọn · cây bút), 6 biển mới, section Ưu đãi cư dân, chân trang.
2. **Trang phụ công khai**: hồ sơ khu phố `/khu-pho/{slug}`, hồ sơ cây bút `/dai-su/{slug}`, biển `/bien/{id}`, chính sách dữ liệu `/chinh-sach-du-lieu`.
3. **Luồng 4 bước**: Đề xuất góc phố → Viết & bình chọn lời nhắc → Duyệt nội dung (admin, 4N thủ công) → Lên biển & cập nhật.
4. **Định danh bằng SĐT băm + cookie phiên, KHÔNG OTP, KHÔNG SMS** (1 SĐT = 1 tài khoản = 1 phiếu/câu; SĐT gốc chỉ tồn tại server-side dạng mã hoá).
5. **Hệ thống điểm & bảng xếp hạng** theo [`05-SCORING-RULES`](05-SCORING-RULES.md).
6. **Thu lead 2 tầng** + màn quản lý lead cho admin.
7. **Bảy màn Admin** (§6).
8. **Chứng nhận "Khu phố biết thương" chuẩn 4N**.
9. **Bulk import** khu phố pilot và câu duyệt sẵn từ Excel/CSV.
10. **Chia sẻ mạng xã hội**: URL công khai + OG image động.

### 7.2 Out of scope (giai đoạn sau)
App mobile native · đăng nhập MXH · đa ngôn ngữ · chat/bình luận tự do (rủi ro kiểm duyệt) ·
tích hợp CRM tự động (đã chốt: export CSV thủ công) · **SMS/OTP mọi loại** (Q1) ·
chấm 4N tự động (Q2 — người duyệt trực tiếp) · tài khoản chính quyền `gov_viewer` (Q7) ·
màn hình bản đồ khu phố (gỡ 1/8) · màn hình đọc `audit_logs` · nút xoá dữ liệu cá nhân trên UI admin.

---

## 8. Yêu cầu về dữ liệu cá nhân & sự đồng thuận

Đây là nhóm yêu cầu **không thoả hiệp** — ràng buộc pháp lý (Nghị định 13/2023/NĐ-CP) chứ không phải lựa chọn thiết kế. Cơ chế thực thi ở [`14`](14-BAO-MAT-VA-QUYEN-RIENG-TU.md).

| Mã | Yêu cầu |
|---|---|
| **UR-P-01** | Hệ thống **chỉ** thu SĐT; **không** thu email, ngày sinh, CMND/CCCD, vị trí GPS của cư dân |
| **UR-P-02** | SĐT dùng cho **định danh** được băm một chiều; SĐT dùng để **liên hệ bán hàng** được mã hoá, và chỉ tồn tại khi người dùng đã tick opt-in |
| **UR-P-03** | Không có đường nào — API, giao diện, ảnh OG, CSV công khai — trả SĐT gốc hay giá trị băm ra cho R0/R1 |
| **UR-P-04** | Lead **chỉ** được ghi khi người dùng tick đồng ý. Không có luồng nào ghi lead "âm thầm" |
| **UR-P-05** | Không lưu IP và User-Agent thô; chỉ lưu giá trị băm phục vụ chống gian lận |
| **UR-P-06** | Mọi lần admin xem hoặc xuất SĐT đều để lại nhật ký không xoá được từ giao diện |
| **UR-P-07** | Mất khoá mã hoá ⇒ mất khả năng đọc SĐT đã lưu. Đây là **hệ quả chấp nhận có chủ ý**, không phải lỗi |

---

## 9. KPI chiến dịch (đo trên website)

| Nhóm | Chỉ số | Ghi chú |
|------|--------|---------|
| Tham gia | Số khu phố tham gia, số người đóng góp, số đề xuất, số câu nhắc | Hiển thị công khai trên bộ đếm |
| Sản lượng | Số câu đạt 4N được duyệt, số biển đã treo | "Biển đã treo" là chỉ số đích |
| Chất lượng | Lượt thương/câu, tỉ lệ câu qua bộ lọc 4N | |
| Thương mại | Số lead opt-in tầng 1, tầng 2; tỉ lệ lead/người đóng góp | Không hiển thị công khai |

## 10. Nguyên tắc sản phẩm (không thoả hiệp)

1. **Chuẩn 4N** (Nhắc – Nhở – Nhỏ – Nhẹ): mọi câu lên biển phải trung lập, **không công kích, không nêu đích danh người/nhà nào**, gọi tên một việc tốt cụ thể.
2. **Minh bạch với chính quyền**: câu bình chọn cao nhất vẫn phải qua duyệt (4N + đội chiến dịch, thông qua công an xã) trước khi lên biển thật.
3. **Lead là tự nguyện**: SĐT không bắt buộc, checkbox opt-in tách riêng, ghi rõ mục đích; không tick vẫn được trân trọng như nhau.
4. **Chống gian lận lặng lẽ**: lọc phiếu bất thường không thông báo, không bêu tên.
5. **Giọng điệu**: ấm áp, "tình làng nghĩa xóm", xưng hô gần gũi ("xóm mình", "thương").
6. **Cửa admin không được yếu theo cửa public**: bỏ OTP cho cư dân là quyết định về trải nghiệm, không phải về bảo mật.

### 10.1 Khoảng trống đã biết (công bố chủ động)

Các điểm dưới đây là **nợ kỹ thuật đã ghi nhận**, không phải phát hiện mới — liệt kê ở đây để đơn vị đánh giá không mất thời gian báo lại. Chi tiết ở [`20`](20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md) §3 và [`14`](14-BAO-MAT-VA-QUYEN-RIENG-TU.md) §10.

| # | Khoảng trống |
|---|---|
| 1 | **Mạo danh bằng SĐT người khác** là hệ quả chấp nhận có chủ ý của việc bỏ OTP. Hậu quả giới hạn ở tên hiển thị công khai; không có dữ liệu riêng tư nào bị lộ qua đường này |
| 2 | Rate limit và token TOTP tạm **lưu trong RAM tiến trình** — đúng cho MVP 1 instance, sẽ sai nếu chạy nhiều instance |
| 3 | **Chưa có màn hình đọc `audit_logs`** — đối soát hành vi admin hiện phải truy vấn thủ công |
| 4 | **Xoá dữ liệu theo yêu cầu làm thủ công qua psql**, chưa có nút trên UI admin |
| 5 | `script-src` còn `'unsafe-inline'` theo yêu cầu của Next.js, làm CSP yếu hơn mức lý tưởng |
| 6 | Mã dự phòng TOTP: cột `backup_codes_hash` đã có trong DB nhưng **chức năng chưa triển khai** |
| 7 | Một số ràng buộc nhập liệu (bắt buộc tỉnh/thành khi đề xuất, khi để lại lead) hiện **do giao diện ép**, tầng API nhận thiếu vẫn cho qua — xem [`13`](13-API-REFERENCE.md) §2.6 và §5 |

## 11. Tiêu chí nghiệm thu (mức URD)

Một bản release được coi là đáp ứng tài liệu này khi:

1. Mọi yêu cầu `UR-U-*`, `UR-A-*`, `UR-P-*` ở trên có đường đi được trên hệ thống thật, hoặc được ghi nhận là ngoại lệ có người duyệt.
2. **11 quy tắc cứng** trong [`CLAUDE.md`](CLAUDE.md) không bị vi phạm.
3. Ba test case điểm bắt buộc ([`05`](05-SCORING-RULES.md) §4) pass.
4. Checklist nghiệm thu ở [`19`](19-KIEM-THU-VA-NGHIEM-THU.md) hoàn tất.

## 12. Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [`CLAUDE.md`](CLAUDE.md) | 11 quy tắc cứng + Definition of Done — **đọc trước tiên** |
| [`02-FUNCTIONAL-SPEC.md`](02-FUNCTIONAL-SPEC.md) | Đặc tả chức năng từng màn hình, user flows |
| [`03-DATA-MODEL.md`](03-DATA-MODEL.md) | Mô hình dữ liệu, state machine |
| [`04-ADMIN-SPEC.md`](04-ADMIN-SPEC.md) | Đặc tả chi tiết 7 màn admin |
| [`05-SCORING-RULES.md`](05-SCORING-RULES.md) | Quy định điểm Đại sứ khu phố |
| [`06-CONTENT-COPY.md`](06-CONTENT-COPY.md) | Copy chuẩn, 6 chủ đề, quy tắc 4N |
| [`07-NFR-TECH.md`](07-NFR-TECH.md) | Yêu cầu phi chức năng, tech stack, kiến trúc bảo mật |
| [`13-API-REFERENCE.md`](13-API-REFERENCE.md) | Tham chiếu 43 endpoint — **tài liệu API cho đơn vị tích hợp / đánh giá** |
| [`14-BAO-MAT-VA-QUYEN-RIENG-TU.md`](14-BAO-MAT-VA-QUYEN-RIENG-TU.md) | Cơ chế bảo mật, PDPD, mô hình đe doạ |
| [`17-VAN-HANH-ADMIN.md`](17-VAN-HANH-ADMIN.md) | Cẩm nang vận hành cho đội chiến dịch |
| [`19-KIEM-THU-VA-NGHIEM-THU.md`](19-KIEM-THU-VA-NGHIEM-THU.md) | Kiểm thử & nghiệm thu |

**Nguồn design chuẩn của giao diện**: `docs/lp/LandingpageFCM.fig` (file ở Drive của team Design — xem [`README.md`](README.md) §C), đọc bằng `scripts/figma/`.
