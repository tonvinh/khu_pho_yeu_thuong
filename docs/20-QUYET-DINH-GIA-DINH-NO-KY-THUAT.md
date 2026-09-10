# 20 — Quyết định, giả định & nợ kỹ thuật

> Cập nhật: 8/9/2026 — đồng bộ với code sau các đợt 18/8, 2–4/9, 7/9.
> Nơi ghi "vì sao hệ thống làm thế này" và "chỗ nào còn thiếu". Cập nhật mỗi khi có quyết định kiến trúc mới.

## 1. Quyết định đã chốt (từ `07-NFR-TECH.md` §4)

| Mã | Câu hỏi | Quyết định | Hệ quả trong code |
|---|---|---|---|
| **Q1** | Báo tin vui bằng SMS? | **Không có SMS** trong toàn hệ thống | Bảng `notifications` + banner in-web ở `HomeShell`; không có SDK SMS nào trong `package.json` |
| **Q2** | Chấm 4N tự động? | **Không** — admin tick tay 4 ô | `passes4N()` guard trong API; nút duyệt disabled ở UI; client chỉ giới hạn 120 ký tự |
| **Q3** | Bản đồ dùng gì? | Ảnh admin upload → **cách điệu tự động**; public không thấy ảnh gốc; pin theo % — ⚠️ **quyết định này đã hết hiệu lực từ 1/8**: trang chủ bỏ bản đồ, thay bằng slider ảnh khu phố | `stylize.ts` (`stylizeMap` nay mồ côi), prefix `private/` vs `public/` **vẫn áp dụng**; `pin_x/pin_y` còn trong DB nhưng không UI nào dùng |
| **Q4** | Xuất lead thế nào? | **CSV thủ công**, có audit log | `GET /api/admin/leads?format=csv` + `audit_logs` |
| **Q5** | Domain? | Chưa chốt 1 trong 2 phương án ⇒ **`basePath` bằng env** | `next.config.ts` đọc `BASE_PATH` (build arg), mọi URL qua `withBase()`/`absoluteUrl()` |
| **Q6** | Nhập 20 khu phố pilot? | **Bulk import Excel** 3 bước, all-or-nothing | Triển khai thành **2 route riêng**: `/api/admin/neighborhoods/import` (3 cột) và `/api/admin/suggestions/import` (5 cột), mỗi route tự sinh template. ~~`POST /api/admin/import` + `docs/import-template.xlsx` 2 sheet~~ |
| **Q7** | Có vai trò gov_viewer? | **Không** — chỉ admin | Không có phân quyền con trong `admin_users` |
| **Q8** | Chia sẻ mạng xã hội? | **OG image động** cho 3 loại trang share | `src/lib/og.tsx` + 3 route `opengraph-image.tsx` |
| **D11** | Đăng nhập admin? | Email `@fpt.com` + Argon2id + TOTP tuỳ chọn, phiên tách biệt | `admin_users`/`admin_sessions`, cookie `kp_admin_session` Strict 8h |
| **D12** | Hạ tầng? | **Toàn bộ Docker**, chỉ proxy mở port, migration là lệnh riêng | `docker-compose.yml` 4 service + `deploy/Caddyfile` |

## 2. Quyết định phát sinh trong lúc triển khai

| Quyết định | Lý do | Đánh đổi |
|---|---|---|
| **Phiên bằng cookie + bảng `sessions`**, không dùng JWT (dù `03-DATA-MODEL` §4 ghi "Resident (JWT)") | Cần **thu hồi được phiên** ngay lập tức (shadow-ban, yêu cầu xoá dữ liệu). JWT không thu hồi được nếu không có blacklist — mà blacklist thì đã là session | Mỗi request có thêm 1 truy vấn DB (rất rẻ, có index UNIQUE trên `token_hash`) |
| **Lưu SĐT mã hoá trong `sessions`** | Đặc tả yêu cầu lead tầng 1 không hỏi lại SĐT, nhưng hash một chiều không khôi phục được | SĐT mã hoá tồn tại theo vòng đời phiên kể cả khi chưa opt-in. Đã ghi ASSUMPTION trong `001_init.sql` và báo PM |
| **Rate limit / TOTP pending / cache counters lưu in-memory** | MVP chốt chạy 1 instance; tránh thêm Redis vào 4 service đã quyết | Không scale ngang được (xem §3) |
| **Polling 20s thay vì WebSocket** | NFR chỉ yêu cầu cập nhật ≤30s; WebSocket thêm phức tạp hạ tầng | Tải nhẹ nhưng đều đặn lên server; chấp nhận được ở quy mô chiến dịch |
| **Seed dùng con số khớp CÔNG THỨC, không khớp design** | Vài con số trong design (VD "52 lượt thương" của Bà Liên) mâu thuẫn công thức điểm đã duyệt. Test case 05 §4 là nguồn sự thật | Ảnh chụp màn hình demo lệch nhẹ so với file design |
| **Người "đóng góp" không tính người chỉ bình chọn** | Cần khớp seed 06 §5 và tinh thần "người góp lời" | Con số nhỏ hơn nếu tính cả người bấm thương. Đã ghi ASSUMPTION trong `counters.ts` |
| **Import ghi DB trước, upload ảnh sau** | Lỗi upload MinIO không được phép phá vỡ tính all-or-nothing của dữ liệu | Có thể tồn tại bản ghi trỏ tới ảnh chưa upload được; API trả `upload_errors` để admin biết mà bổ sung |
| **Scripts giữ `.mjs` thuần, không TypeScript** | Chạy được trực tiếp trong image production (không có tsx/ts-node ở runner) | Không có kiểm kiểu ở scripts |
| **Bulk import đưa issue thẳng vào `waiting`** | Dữ liệu do admin nhập ⇒ coi như đã duyệt | Không sinh điểm cho ai (không có `proposed_by`) — đúng ý đồ |
| **DESIGN 18/8 THẮNG SPEC 02/06 (chốt 2/9)** — xem §2.1 | PM chốt "bám thiết kế đã duyệt 100%" | 4 khối copy bắt buộc trong đặc tả gốc bị gỡ khỏi giao diện |
| **Bình chọn là CHỐT, không rút phiếu** (Q6 của phiên 2/9 — xem §2.2) | BA chốt luật "bình chọn xong là chốt" | Bỏ nhánh toggle ở cả 2 route vote; điểm chỉ thay đổi khi admin can thiệp |
| **Xoá khu phố là XOÁ MỀM** (7/9) | Khu phố có góc phố/câu/phiếu/điểm gắn theo; xoá cứng sẽ mất dữ liệu đóng góp của cư dân | Mọi truy vấn công khai phải nhớ `deleted_at IS NULL` — dễ quên khi thêm truy vấn mới |
| **Chứng nhận 4N là quyết định vận hành, không phải hệ quả dữ liệu** (7/9) | Có buổi trao biển ngoài đời; điều kiện "100% biển đã treo" chặn admin cấp đúng lúc | Bỏ ràng buộc ở `/certify` và ở PATCH khu phố; UI chỉ còn cảnh báo trong tooltip |
| **`featured_position` = slot slide, đúng 10 chỗ, duy nhất** (7/9) | Trước đó slider lọc theo `certified_4n` nên cả cờ tiêu biểu lẫn vị trí đều **vô nghĩa** — admin xếp mà trang chủ không đổi | Unique index bộ phận + PATCH 3 bước trong 1 transaction để **hoán đổi** hai khu |
| **Tab 1 chỉ hiện góc phố chưa có câu nào** (7/9) | Góc đã có câu thuộc về tab 2 (bình chọn từng câu); không lọc thì hai tab trùng nội dung | Bộ lọc đặt ở **client** trong `IssueBoard`, KHÔNG ở `/api/v1/issues` — `SpotPickerModal` vẫn cần thấy mọi góc phố chưa treo biển |
| **Bỏ ô "câu nhắc gửi kèm" ở popup đề xuất** (7/9) | `.fig` bản 2/9 không vẽ ô này | Client không gửi `suggested_content`; **route vẫn nhận** để bật lại được. Admin cũng gỡ khối "💬 Câu nhắc gửi kèm" nhưng **hành vi backend giữ nguyên** |
| **`SpotPickerModal` tự thiết kế** (5/9) | Design chưa vẽ frame cho popup chọn góc phố, nhưng luồng bắt buộc phải có | Dựng theo khung `Modal` chung + mượn cấu trúc dòng tab 1; nếu Design vẽ sau thì phải đối chiếu lại |
| **Nguồn design = `.fig` HIỆN TẠI trong repo** (chốt 4/9) | File trên figma.com đã đi trước bản `.fig` local; xin export mới thì chờ | Ngoại lệ duy nhất: hai nhãn nút chốt bằng lời (tab 2 `Bình chọn` xanh, tab 3 `Xem lời nhắc` cam). Số đo px của bản live **chưa đo được** |
| **Chân trang giữ đủ 4 dòng** (chốt 4/9) | Dòng "Đã là khách hàng của FPT… 1900 6600" là cam kết với người dùng | Khối chữ cao 134 vs `.fig` 84 — **lệch có chủ ý**, đừng "sửa" lại theo `.fig` |

### 2.1 Quyết định 2/9 — Figma thắng đặc tả copy

Đối chiếu 4 frame popup trong `docs/lp/LandingpageFCM.fig` (page `7217:1989`) với giao diện
đang chạy, 4 khối chữ sau **có trong đặc tả nhưng KHÔNG có trong design**. PM chốt bỏ theo
design; đặc tả gốc (00–07) **chưa** được sửa nên bảng này là nguồn giải thích:

| Khối chữ bị gỡ | Đặc tả bắt buộc | Nơi từng hiển thị |
|---|---|---|
| ⚠️ "Khu Phố Của Tôi tiếp nhận những góp ý về an toàn và nếp sống khu phố…" | `02 §62`, `06 §43` | `ProposeModal` bước 2/2 |
| 💛 "Giữ cho dễ thương: gọi tên một việc tốt cụ thể…" | `02 §72`, `06 §27` | `SuggestModal` |
| Chip 4N + bộ đếm ký tự ở popup **Đề xuất** | `02 §70` (chip 4N ở form viết câu) | `ProposeModal` bước 2/2 |
| "Bạn sẽ xác thực số điện thoại một lần trước khi gửi…" | `06 §65` | `LeadSection` |

Vẫn **giữ** (design có vẽ): ghi chú 4N `COPY.note4N`, 4 chip 4N trong `SuggestModal`,
checkbox đồng ý + ghi chú tuỳ chọn, ô SĐT hiện khi tick nhận ưu đãi (design chỉ vẽ trạng
thái chưa tick nên không mâu thuẫn). Các chuỗi bị gỡ vẫn còn trong `src/lib/copy.ts` để
bật lại được nếu PM đổi ý.

**Mobile**: file design không có frame mobile nào → quy chuẩn mobile do team dev tự đặt,
ghi trong `CLAUDE.md` §"Quy chuẩn mobile" và `16-FRONTEND-UI.md` §5.

Ô **"Viết câu nhắc thương của bạn (nếu có)"** trong popup đề xuất (thêm 1/8 theo `dieuchinh.1.8` #5)
cũng bị gỡ ngày 7/9 vì `.fig` bản 2/9 không vẽ — nhưng **chưa có xác nhận của Design** là cố ý hay
quên vẽ (câu hỏi treo, xem `25` §Câu hỏi).

### 2.2 Bảy quyết định chặn của phiên 2–3/9 (Q1–Q7)

| # | Chốt | Hệ quả trong code |
|---|---|---|
| **Q1** | Nav: `Đóng góp lời nhắc` cuộn `#goc-xom` · `Đề xuất khu phố cần treo biển` **mở popup đề xuất** · CTA `Ưu đãi dành cho cư dân` cuộn `#uu-dai` | Dưới 1280px hai link ẩn ⇒ **nav mobile không còn lối vào đề xuất** (vào từ CTA đáy tab 3 / dropdown tra cứu rỗng) |
| **Q2** | Avatar giữ "chỉ hiện khi đã định danh" | **Lệch Figma có chủ ý** |
| **Q3** | `INTERESTS` giữ **4 MÃ cũ**, chỉ đổi nhãn + thêm `camera`, `internet_tv_camera` | **Không migration**. Nhãn `fpt_play` → "Truyền hình FPT Play" nên lead cũ hiện theo nhãn mới |
| **Q4** | Chip 4N chỉ **trang trí + chú thích**, KHÔNG cho chọn, không lưu DB | Test khoá: chip không phải `<button>` |
| **Q5** | `NeighborhoodView` đổi theo design mới cho **cả** popup lẫn trang share, nhưng trang share bật prop `hero` để giữ ảnh + badge 4N | Nội dung chứng nhận là lý do tồn tại của trang share và ảnh OG dựng theo nó |
| **Q6** | **Cấm rút phiếu**: cả 2 route vote trả 409 `ALREADY_VOTED`; UI khoá nút sau khi bấm | Bỏ nhánh toggle + `invalidateScoreEvent` khỏi route vote |
| **Q7** | Tab 3 bỏ `Chia sẻ ↗`, dùng nút mở popup Cây bút | `/dai-su/[slug]` vẫn sống nhưng **không còn lối vào từ trang chủ** |

### 2.3 Ba khác biệt LIVE vs `.fig` 2/9 (áp code 4/9)

`docs/lp/LandingpageFCM.fig` (lưu 2/9 22:34) **không còn khớp file trên figma.com**. Bằng chứng đo
được — cùng node id, khác hẳn:

| Node | Trong `.fig` local | Render live 4/9 |
|---|---|---|
| `7651:1537` nút mỗi dòng tab 2 | viền **#FF8206**, w=137, nhãn *Xem câu nhắc* | viền **xanh #2323FF**, nhãn **Bình chọn** |
| `7458:38738` nút mỗi dòng tab 3 | viền **#2323FF**, w=120, nhãn *Bình chọn* | viền **cam**, nhãn **Xem lời nhắc** |
| Dòng tab 2 | là **GÓC PHỐ**, nút mở popup danh sách câu | là **CÂU NHẮC**, bình chọn thẳng tại dòng |

Ảnh export `docs/lp/Landing page*.png` (2/9 22:17) còn **cũ hơn cả `.fig`** → đây chính là thứ làm
phiên QC 2/9 đọc sai nhãn nút. Trước khi đo px lại phải xin Design export `.fig` mới.

**Cách đọc Figma live bằng Claude-in-Chrome** (đã chạy được): dùng **chế độ prototype**
`figma.com/proto/<file>?node-id=<a-b>&scaling=min-zoom&content-scaling=fixed` → khung render ~1200px,
chữ đọc được. Prototype **không cuộn** bằng lệnh scroll thường; phải bắn wheel vào canvas
(`dispatchEvent(new WheelEvent('wheel',{deltaY:130,bubbles:true}))`; thêm `ctrlKey:true` là zoom,
một nấc ≈ ×4.7 — rất nhạy). ⚠️ **Đừng bấm vào panel phải ở góc %**: trúng tab Comments và bật công
cụ bình luận; bấm nhầm lên canvas lúc đó là **tạo comment thật trong file của khách**.

## 3. Nợ kỹ thuật & giới hạn đã biết

Xếp theo mức độ cần xử lý.

### 3.1 Chặn scale ngang (cần làm trước khi chạy >1 instance)

| Vấn đề | Nơi | Hệ quả nếu bỏ qua | Hướng xử lý |
|---|---|---|---|
| Rate limit in-memory | `src/lib/rate-limit.ts` | Hạn mức nhân lên theo số instance ⇒ chống lạm dụng yếu đi | Chuyển sang Redis hoặc bảng đếm trong Postgres |
| Token tạm TOTP in-memory | `src/lib/admin-totp.ts` | **Đăng nhập 2FA hỏng** nếu bước 2 rơi vào instance khác | Lưu vào DB (bảng tạm có TTL) hoặc Redis |
| Cache counters in-memory | `src/lib/counters.ts` | Chỉ lệch độ tươi số liệu ≤15s giữa các instance | Chấp nhận được, hoặc chuyển cache dùng chung |

### 3.2 Tuân thủ & vận hành

| Vấn đề | Chi tiết | Hướng xử lý |
|---|---|---|
| **Chưa có luồng xoá dữ liệu theo yêu cầu** | Chính sách công bố cho phép yêu cầu xoá qua 1900 6600, nhưng thao tác hiện là **thủ công bằng psql** (xoá `phone_encrypted`, thu hồi phiên, giữ nội dung ẩn danh) | Viết `scripts/erase-contact.mjs` nhận `phone_hash` + ghi `audit_logs` |
| **Chưa có màn hình đọc `audit_logs`** | Log ghi đủ nhưng phải query tay | Thêm trang admin chỉ đọc, lọc theo action/thời gian |
| **Sửa câu nhắc qua drawer không ghi audit** | `PATCH /api/admin/suggestions/[id]` với `action:"update"` chỉ ghi `audit_logs` khi request có đổi `status`. Sửa nội dung câu, chủ đề, vị trí, **tên hiển thị của tác giả** (ghi thẳng vào `users.display_name`) ⇒ không để lại dòng nào | Ghi một audit `suggestion_edit` kèm diff các trường, độc lập với việc đổi trạng thái |
| **Chưa có script xoay `PHONE_AES_KEY`** | Xoay khoá cần giải mã bằng khoá cũ + mã hoá lại toàn bộ `leads.phone_encrypted`, `users.phone_encrypted`, `sessions.phone_encrypted` | Viết migration script nhận cả 2 khoá |
| **`redactPhonesInText` chưa gắn vào logger** | Hàm đã có + đã test nhưng chưa có logger tập trung gọi nó | Bọc một `log()` chung, dùng thay `console.*` |
| **Chưa có backup tự động** | Backup DB/MinIO hiện là lệnh chạy tay | Thêm cron trên VM + kiểm tra restore định kỳ |

### 3.3 Nghiệp vụ chưa hoàn chỉnh

| Vấn đề | Chi tiết | Ảnh hưởng |
|---|---|---|
| **Từ chối câu đã duyệt không thu hồi điểm** | Action `reject` áp dụng được cho câu đang `approved`, nhưng event `suggestion_approved` (+5) và các `vote_received` đã cộng **không bị vô hiệu** | Điểm hơi cao hơn thực tế; admin phải xử lý thủ công qua `invalidate_votes` hoặc SQL |
| **Bắt buộc tỉnh/thành chỉ do UI ép** | `geoError()` validate giá trị có gửi, nhưng **bỏ trống thì cho qua**: `POST /api/v1/issues` và `POST /api/v1/leads` gọi API trực tiếp vẫn ghi được bản ghi không tỉnh/thành. Ràng buộc 18/8 nằm ở `ProposeModal` / form ưu đãi | Chặn ở route (`if (!city) return 400`) nếu BA xác nhận đây là ràng buộc nghiệp vụ, không chỉ là UX |
| **Lead không khử trùng lặp** | Mỗi lần tick opt-in tạo một bản ghi `leads` mới; không kiểm `phone_hash` đã có | Danh sách sale có thể trùng số. Nên gộp theo `phone_hash` khi export |
| **Chứng nhận không tự thu hồi** | Duyệt thêm đề xuất mới sau khi khu phố đã đạt 100% làm tỉ lệ tụt xuống nhưng `certified_4n` vẫn `true` | Admin tự quyết; thu hồi phải gọi API `{"revoke": true}` (chưa có nút UI) |
| **`month_snapshots` chưa dùng** | Bảng đã tạo nhưng khối "Khu phố dễ thương nhất tháng" **đã gỡ khỏi trang chủ 18/8** | Không còn màn nào cần chốt kỳ; bảng thành **hoàn toàn mồ côi** |
| **Cột chưa dùng** | `users.role`, `admin_users.backup_codes_hash`, `neighborhoods.map_image_key`, `issues.pin_x/pin_y/photo_key` | 3 nhóm sau thành mồ côi khi bỏ bản đồ (1/8). Giữ để mở rộng / khôi phục |
| ~~**`notifications` chỉ có 1 loại**~~ | Nay có **5 loại**: `sign_installed`, `issue_approved`, `issue_rejected`, `suggestion_approved`, `suggestion_rejected` | Đã xử lý |
| **Không có màn hình sổ cái điểm** | `/admin/diem` và `GET /api/admin/scores` **chưa bao giờ có trong code** dù `04` §8 và `15` §5 mô tả | Đối soát phải dùng psql. Cần trước khi trao giải Đại sứ |
| **Phân trang chưa đều** | `/admin/issues` có phân trang; `/admin/suggestions` chỉ khi truyền `per`; `/admin/leads`, `/admin/votes` (LIMIT 300), `/admin/fraud` (20 dòng/nhóm) trả cứng | Đủ cho quy mô pilot |
| **Lối vào đề xuất trên mobile hẹp** | Hai link nav ẩn dưới 1280px (Q1) ⇒ chỉ còn CTA đáy tab 3 và dropdown tra cứu rỗng | Có chủ ý theo design, nhưng nên theo dõi số liệu đề xuất từ mobile |

### 3.4 Chất lượng & kiểm thử

| Vấn đề | Hướng xử lý |
|---|---|
| Không có test tích hợp route handler chạy trên DB tạm | Bộ `pnpm test:e2e` (33 ca, gọi HTTP thật) đã lấp phần lớn, nhưng **cần server + DB đang chạy** và tự SKIP nếu không có. Hướng: testcontainers cho CI |
| Không có E2E trình duyệt | Playwright cho E2E-1 trong [`19`](19-KIEM-THU-VA-NGHIEM-THU.md) §2 — hiện luồng UI vẫn nghiệm thu tay |
| Không có CI chạy test | Workflow hiện chỉ deploy. Nên thêm job `pnpm test` chạy **trước** bước build/deploy |
| **jsdom không đo được layout** | `tests/ui/*` chỉ khoá cấu trúc DOM; mọi số đo px/media query phải đo tay trên Chrome. Hướng: thêm bước đo tự động bằng Playwright + screenshot diff |
| **C4 — chưa đo LCP bản production** | QC 2/9 để lại: phải dừng dev server để `pnpm build && pnpm start` mới đo được. **Chưa làm.** DoD yêu cầu LCP < 2.5s |

### 3.5 Chi tiết nhỏ cần dọn

| Mục | Chi tiết |
|---|---|
| **`Dockerfile` stage `runner` dùng `node:20-alpine`** trong khi `deps`/`builder` dùng `node:22-alpine` (và comment đầu file ghi node:22) | Không gây lỗi hiện tại nhưng lệch với chủ ý ban đầu; nên thống nhất về `node:22-alpine` và kiểm thử lại native deps |
| ~~**`README 2.md`** ở gốc repo~~ | ~~Bản README cũ (mô tả layout thư mục lồng đã bỏ), là file rác do đồng bộ. Nên xoá~~ — **đã xoá** (4/8): nó còn là nguồn thứ ba của hướng dẫn Caddy cũ không có CSP |
| **`docs/CLAUDE.md` §"Nguồn sự thật về UI"** trỏ tới `Khu Pho Yeu Thuong.dc.html` và `Admin Khu Pho.dc.html` | Hai file này **không có** trong `docs/`; nguồn design chuẩn hiện nay là **`docs/lp/LandingpageFCM.fig`** (chốt 4/9), `KhuPhoCuaToi-prototype-v4.html` chỉ còn giá trị lịch sử. `docs/CLAUDE.md` là **quy tắc cứng do PM giữ** nên chưa sửa — cần PM duyệt |
| **`docs/CLAUDE.md` quy tắc cứng 10 (bản đồ)** | Trang chủ bỏ bản đồ từ 1/8 nên vế "public luôn là bản cách điệu, pin dùng toạ độ %" **không còn đối tượng áp dụng**; vế "ảnh gốc chỉ admin thấy" vẫn đúng cho mọi ảnh `private/`. Cần PM duyệt trước khi sửa |
| **DoD trong `docs/CLAUDE.md`** còn hạng mục "upload ảnh bản đồ → đặt pin bằng click" | Hạng mục này đã rút khỏi phạm vi. Cần PM duyệt |
| **Asset mồ côi** `public/brand/sign-fptplay.webp` (21KB) | Dải khuyến mãi trên biển bỏ 3/9. Giữ phòng Design khôi phục; xoá được nếu chốt là bỏ hẳn |
| **Hằng mồ côi** `EXAMPLE_ISSUE_DESC` (`src/lib/examples.ts`) | Popup đề xuất bỏ placeholder theo chủ đề (7/9). Đã ghi chú tại chỗ, giữ lại |
| **Hàm mồ côi** `stylizeMap()` (`src/lib/stylize.ts`) | Chỉ còn `scripts/seed-images.mjs` và `tests/stylize.test.ts` gọi — không route nào dùng |
| **`/dai-su/[slug]` không còn lối vào** | Quyết định Q7: tab 3 mở popup Cây bút thay vì rời trang. Route vẫn sống cho link đã chia sẻ; OG image vẫn dựng |
| **Ảnh hero `cart.webp` / `sweepers.webp` nằm cao hơn design** | Nghi do `HomeShell` đặt `top-%` theo chiều cao div bọc (phụ thuộc tỉ lệ ảnh KV) chứ không theo khổ 1440 của `.fig`. Còn treo từ 4/9 |
| **Trang cao 3853 vs `.fig` 3780 — dư 73px** | Đầu phiên 2/9 dư 887px, đã kéo về 73. Phần dư còn lại chủ yếu ở chân trang (giữ đủ 4 dòng — có chủ ý) |
| **`03-DATA-MODEL.md` §4 ghi "Resident (JWT)"** | Triển khai thực tế dùng cookie + bảng `sessions` (xem §2). Là chênh lệch **có chủ ý**, không phải lỗi |
| **CSP có `script-src 'unsafe-inline'`** | Yêu cầu của Next.js runtime; làm CSP yếu hơn lý tưởng. Có thể siết bằng nonce nếu cần |

## 4. Ranh giới phạm vi (out of scope MVP)

Không có trong hệ thống hiện tại và **không phải lỗi**:

- Đăng nhập bằng mạng xã hội, email cư dân, khôi phục tài khoản.
- Bình luận, nhắn tin giữa cư dân, báo cáo nội dung xấu từ phía người dùng.
- Ứng dụng di động, thông báo đẩy, email marketing.
- Đa ngôn ngữ (chỉ tiếng Việt).
- Phân quyền admin nhiều cấp, nhật ký thao tác admin đầy đủ (chỉ có audit cho dữ liệu cá nhân).
- Tích hợp CRM/hệ thống bán hàng FPT (lead xuất bằng CSV thủ công — quyết định Q4).
- Bản đồ tương tác kiểu Google Maps. *(Cả bản đồ ảnh cách điệu của Q3 cũng đã gỡ khỏi sản phẩm từ 1/8.)*
- Chốt kỳ tháng / bảng "Khu phố dễ thương nhất tháng" (gỡ 18/8).

## 5. Cách ghi thêm quyết định mới

Khi có quyết định kiến trúc/nghiệp vụ mới:

1. Thêm một dòng vào §2 (hoặc §1 nếu là quyết định của PM), ghi rõ **lý do** và **đánh đổi**.
2. Nếu là giả định chưa được duyệt: ghi `ASSUMPTION` ngay tại chỗ trong code + báo PM (đúng như `docs/CLAUDE.md` yêu cầu).
3. Nếu quyết định làm lệch đặc tả gốc (00–07): ghi rõ ở đây **và** báo PM để cập nhật tài liệu gốc — đừng sửa tài liệu gốc một mình.
4. Nếu tạo ra nợ kỹ thuật: thêm vào §3 kèm hướng xử lý, để lần sau không phải điều tra lại từ đầu.
