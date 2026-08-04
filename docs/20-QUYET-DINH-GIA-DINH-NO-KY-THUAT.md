# 20 — Quyết định, giả định & nợ kỹ thuật

> Nơi ghi "vì sao hệ thống làm thế này" và "chỗ nào còn thiếu". Cập nhật mỗi khi có quyết định kiến trúc mới.

## 1. Quyết định đã chốt (từ `07-NFR-TECH.md` §4)

| Mã | Câu hỏi | Quyết định | Hệ quả trong code |
|---|---|---|---|
| **Q1** | Báo tin vui bằng SMS? | **Không có SMS** trong toàn hệ thống | Bảng `notifications` + banner in-web ở `HomeShell`; không có SDK SMS nào trong `package.json` |
| **Q2** | Chấm 4N tự động? | **Không** — admin tick tay 4 ô | `passes4N()` guard trong API; nút duyệt disabled ở UI; client chỉ giới hạn 120 ký tự |
| **Q3** | Bản đồ dùng gì? | Ảnh admin upload → **cách điệu tự động**; public không thấy ảnh gốc; pin theo % | `stylize.ts`, prefix `private/` vs `public/`, `pin_x/pin_y` là `real` 0–100 |
| **Q4** | Xuất lead thế nào? | **CSV thủ công**, có audit log | `GET /api/admin/leads?format=csv` + `audit_logs` |
| **Q5** | Domain? | Chưa chốt 1 trong 2 phương án ⇒ **`basePath` bằng env** | `next.config.ts` đọc `BASE_PATH` (build arg), mọi URL qua `withBase()`/`absoluteUrl()` |
| **Q6** | Nhập 20 khu phố pilot? | **Bulk import Excel** 3 bước, all-or-nothing | `POST /api/admin/import` + `docs/import-template.xlsx` |
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
| **Chưa có script xoay `PHONE_AES_KEY`** | Xoay khoá cần giải mã bằng khoá cũ + mã hoá lại toàn bộ `leads.phone_encrypted`, `users.phone_encrypted`, `sessions.phone_encrypted` | Viết migration script nhận cả 2 khoá |
| **`redactPhonesInText` chưa gắn vào logger** | Hàm đã có + đã test nhưng chưa có logger tập trung gọi nó | Bọc một `log()` chung, dùng thay `console.*` |
| **Chưa có backup tự động** | Backup DB/MinIO hiện là lệnh chạy tay | Thêm cron trên VM + kiểm tra restore định kỳ |

### 3.3 Nghiệp vụ chưa hoàn chỉnh

| Vấn đề | Chi tiết | Ảnh hưởng |
|---|---|---|
| **Từ chối câu đã duyệt không thu hồi điểm** | Action `reject` áp dụng được cho câu đang `approved`, nhưng event `suggestion_approved` (+5) và các `vote_received` đã cộng **không bị vô hiệu** | Điểm hơi cao hơn thực tế; admin phải xử lý thủ công qua `invalidate_votes` hoặc SQL |
| **Lead không khử trùng lặp** | Mỗi lần tick opt-in tạo một bản ghi `leads` mới; không kiểm `phone_hash` đã có | Danh sách sale có thể trùng số. Nên gộp theo `phone_hash` khi export |
| **Chứng nhận không tự thu hồi** | Duyệt thêm đề xuất mới sau khi khu phố đã đạt 100% làm tỉ lệ tụt xuống nhưng `certified_4n` vẫn `true` | Admin tự quyết; thu hồi phải gọi API `{"revoke": true}` (chưa có nút UI) |
| **`month_snapshots` chưa dùng** | Bảng đã tạo nhưng bảng xếp hạng tháng tính động | Số liệu "khu phố của tháng" thay đổi theo thời gian thực, không chốt được kỳ lịch sử |
| **Cột chưa dùng** | `users.role`, `admin_users.backup_codes_hash` | Không ảnh hưởng; giữ để mở rộng sau |
| **`notifications` chỉ có 1 loại** | Chỉ sinh `sign_installed` | Muốn thêm loại (câu được duyệt, được chọn…) thì thêm nơi gọi INSERT |
| **Không có phân trang** | Danh sách admin giới hạn cứng (100 user, 500 event, 20 dòng cảnh báo mỗi nhóm); danh sách leads/issues trả hết | Đủ cho quy mô pilot; cần phân trang khi dữ liệu lớn |

### 3.4 Chất lượng & kiểm thử

| Vấn đề | Hướng xử lý |
|---|---|
| Không có test tích hợp route handler (cần DB) | Dùng testcontainers hoặc DB test riêng; ưu tiên phủ: duyệt 4N, vote toggle, installed side-effects, import |
| Không có E2E tự động | Playwright cho E2E-1 trong [`19`](19-KIEM-THU-VA-NGHIEM-THU.md) §2 |
| Không có CI chạy test | Workflow hiện chỉ deploy. Nên thêm job `pnpm test` chạy **trước** bước build/deploy |

### 3.5 Chi tiết nhỏ cần dọn

| Mục | Chi tiết |
|---|---|
| **`Dockerfile` stage `runner` dùng `node:20-alpine`** trong khi `deps`/`builder` dùng `node:22-alpine` (và comment đầu file ghi node:22) | Không gây lỗi hiện tại nhưng lệch với chủ ý ban đầu; nên thống nhất về `node:22-alpine` và kiểm thử lại native deps |
| ~~**`README 2.md`** ở gốc repo~~ | ~~Bản README cũ (mô tả layout thư mục lồng đã bỏ), là file rác do đồng bộ. Nên xoá~~ — **đã xoá** (4/8): nó còn là nguồn thứ ba của hướng dẫn Caddy cũ không có CSP |
| **`docs/CLAUDE.md` §"Nguồn sự thật về UI"** trỏ tới `Khu Pho Yeu Thuong.dc.html` và `Admin Khu Pho.dc.html` | Hai file này **không có** trong `docs/`; design tham chiếu thực tế là `KhuPhoCuaToi-prototype-v4.html` |
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
- Bản đồ tương tác kiểu Google Maps (chủ ý dùng ảnh cách điệu — quyết định Q3).

## 5. Cách ghi thêm quyết định mới

Khi có quyết định kiến trúc/nghiệp vụ mới:

1. Thêm một dòng vào §2 (hoặc §1 nếu là quyết định của PM), ghi rõ **lý do** và **đánh đổi**.
2. Nếu là giả định chưa được duyệt: ghi `ASSUMPTION` ngay tại chỗ trong code + báo PM (đúng như `docs/CLAUDE.md` yêu cầu).
3. Nếu quyết định làm lệch đặc tả gốc (00–07): ghi rõ ở đây **và** báo PM để cập nhật tài liệu gốc — đừng sửa tài liệu gốc một mình.
4. Nếu tạo ra nợ kỹ thuật: thêm vào §3 kèm hướng xử lý, để lần sau không phải điều tra lại từ đầu.
