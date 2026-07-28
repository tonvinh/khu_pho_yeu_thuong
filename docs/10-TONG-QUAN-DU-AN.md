# 10 — Tổng quan dự án "Khu Phố Của Tôi"

> Tài liệu hệ thống · mô tả **hệ thống như đã triển khai**. Đặc tả yêu cầu gốc ở `01-PRD.md`, `02-FUNCTIONAL-SPEC.md`.

## 1. Sản phẩm là gì

"Khu Phố Của Tôi" là website hub của chiến dịch **"Khu phố biết thương"** (FPT Telecom). Người dân:

1. **Đề xuất một góc xóm** cần một lời nhắc (tốc độ xe, rác, chiếu sáng, người già…).
2. **Viết câu nhắc** cho góc xóm đó theo tinh thần **4N — Nhắc · Nhở · Nhỏ · Nhẹ**, tối đa 120 ký tự.
3. **Bấm "Thương"** để bình chọn câu của hàng xóm.
4. FPT chọn câu được thương nhiều nhất, **sản xuất và treo biển thật** tại đúng góc xóm đó.
5. Khu phố treo đủ 100% biển được cấp **chứng nhận "Khu phố biết thương" chuẩn 4N**.

Song song, website là kênh thu **lead** (khách quan tâm dịch vụ FPT) theo cơ chế **opt-in tự nguyện**, tách bạch hoàn toàn với hoạt động cộng đồng.

**Điểm khác biệt cốt lõi so với một web bình chọn thông thường:** không có nội dung nào lên công khai trước khi người thật duyệt, không dùng OTP/SMS, và số điện thoại của cư dân được bảo vệ ở mức ưu tiên cao nhất.

## 2. Bốn vai trò trong hệ thống

| Vai trò | Định danh | Làm được gì |
|---|---|---|
| **Khách vãng lai** | Không | Xem bản đồ, đọc câu nhắc đã duyệt, xem bảng xếp hạng, tra chứng nhận khu phố |
| **Cư dân** | SĐT băm + cookie `kp_session` (180 ngày) | Đề xuất góc xóm, viết câu nhắc, bấm "Thương", nhận thông báo in-web, để lại lead |
| **Admin chiến dịch** | Email `@fpt.com` + mật khẩu Argon2id (+TOTP tuỳ chọn), cookie `kp_admin_session` (8h) | Duyệt đề xuất, duyệt 4N, chọn câu, quản lý vòng đời biển, bản đồ & pin, leads, chống gian lận, bulk import |
| **Hệ thống** | — | Ghi sổ cái điểm, cách điệu ảnh bản đồ, sinh OG image, gắn cờ gian lận |

Không có vai trò `gov_viewer` (đã chốt bỏ — Q7). Bảng `users` (cư dân) và `admin_users` **tách hoàn toàn**, không dùng chung cơ chế đăng nhập.

## 3. Vòng đời một lời nhắc (end-to-end)

Đây là luồng xương sống của toàn hệ thống — mọi màn hình, API và bảng dữ liệu đều phục vụ nó.

```
 CƯ DÂN                     ADMIN                      HỆ THỐNG                 CÔNG KHAI
────────────────────────────────────────────────────────────────────────────────────────────
 1. Đề xuất góc xóm ─────►  issues.pending_review
                            duyệt ─────────────────►  +2đ (trần 3/tuần)  ────►  pin ĐỎ "Đang chờ"
                                                       issues.waiting

 2. Viết câu nhắc ───────►  suggestions.submitted
    (≤120 ký tự)            tick đủ 4 ô 4N ────────►  +5đ tác giả       ────►  câu hiện, mở bình chọn
                                                       suggestions.approved     issue → voting (pin CAM)

 3. Bấm "Thương" ────────►  (không cần admin)          +1đ tác giả/phiếu ────►  số lượt thương tăng
                                                       votes (1 người/1 phiếu)

 4.                         chọn câu lên biển ──────►  suggestions.selected
                            đưa sản xuất ───────────►  suggestions.produced
                            xác nhận đã treo ──────►  +30đ tác giả      ────►  pin XANH "Đã có biển"
                            (+ ảnh biển, ngày treo)    issues.signed            banner báo tin vui in-web
                                                       notifications            trang share /bien/{id}

 5.                         cấp chứng nhận 4N ──────►  neighborhoods            trang share /khu-pho/{slug}
                            (khi 100% biển đã treo)    .certified_4n
```

Các chốt chặn bắt buộc (kiểm tra **server-side**, không chỉ ở UI):

- Bước 1→2: chỉ issue ở trạng thái `waiting`/`voting` mới nhận câu nhắc.
- Bước 2: **không có chấm 4N tự động** — admin phải tick đủ 4 ô, thiếu 1 ô là API trả 400.
- Bước 3: 1 tài khoản = 1 phiếu/câu (UNIQUE trong DB), **cấm tự thương** (409).
- Bước 4: chuyển trạng thái theo đúng thứ tự `approved → selected → produced → installed`; chọn câu không cao phiếu nhất thì **bắt buộc nhập lý do**.
- Bước 5: chỉ cấp chứng nhận khi `signed == total` và `total > 0`.

## 4. 11 quy tắc cứng (bản rút gọn)

Chi tiết ở [`CLAUDE.md`](CLAUDE.md). Vi phạm bất kỳ điều nào = lỗi nghiệm thu.

1. Không nội dung nào công khai trước khi admin duyệt.
2. Không chấm 4N tự động — checklist thủ công, đủ 4 ô mới duyệt được.
3. Định danh không OTP; 1 SĐT = 1 tài khoản = 1 phiếu/câu; cấm tự thương; lọc gian lận im lặng.
   3b. SĐT gốc không bao giờ ở cookie/client/URL/log/response; PEPPER và khoá AES tách nhau; CSRF mọi POST; admin đăng nhập riêng.
4. Điểm ghi bằng sổ cái append-only `score_events`; trần 3 đề xuất/tuần ISO.
5. Lead chỉ ghi khi `opted_in = true`; checkbox mặc định **không** tick.
6. Copy tiếng Việt lấy nguyên văn (`src/lib/copy.ts`).
7. `/admin` chặn index; đăng nhập email `@fpt.com` + Argon2id; khoá 15 phút sau 5 lần sai.
8. **Không có SMS** trong toàn hệ thống — báo tin vui bằng `notifications` + banner in-web.
9. `basePath` cấu hình bằng env, không hard-code đường dẫn gốc.
10. Ảnh bản đồ gốc chỉ admin thấy; public luôn là bản cách điệu; pin dùng toạ độ %.
11. Toàn bộ infra chạy Docker; chỉ service proxy mở port; migration là lệnh riêng.

## 5. Bản đồ repo

```
db/migrations/001_init.sql      Toàn bộ schema (13 bảng) — chạy bằng scripts/migrate.mjs, idempotent
scripts/                        .mjs thuần (chạy được trong image production)
  migrate.mjs                   Migration runner + bảng schema_migrations
  seed.mjs                      Seed demo public: 5 khu phố · 7 vấn đề · 9 câu · sổ cái khớp công thức
  seed-admin-demo.mjs           Seed demo cho màn admin (hàng chờ, leads, cảnh báo gian lận)
  create-admin.mjs              Tạo/đổi admin: email @fpt.com + Argon2id [+ --totp]

src/lib/                        Lõi nghiệp vụ & hạ tầng (không phụ thuộc React)
  db.ts        Pool pg + helper q/one/tx        env.ts       Đọc secret từ biến môi trường
  crypto.ts    HMAC/AES/session token/slug      phone.ts     Chuẩn hoá, mask, redact SĐT
  session.ts   Phiên cư dân                     admin-session.ts  Phiên admin
  admin-totp.ts Token tạm bước 2 TOTP           csrf.ts      Double-submit token
  api.ts       Guard requireUserWrite/requireAdmin, ipHash/uaHash, jsonError
  rate-limit.ts In-memory bucket                storage.ts   MinIO + imgUrl
  stylize.ts   sharp: cách điệu bản đồ, WebP    og.tsx       OG image động (satori)
  scoring.ts   Công thức điểm + passes4N        score-service.ts  Ghi/vô hiệu event + side-effects
  leaderboard.ts Xếp hạng đại sứ & khu phố      counters.ts  4 bộ đếm (cache 15s)
  taxonomy.ts  8 danh mục, nhãn trạng thái      copy.ts      Copy tiếng Việt NGUYÊN VĂN
  examples.ts  Câu mẫu/placeholder theo danh mục url.ts      withBase/absoluteUrl (basePath)

src/app/
  page.tsx                      Trang chủ (SSR) → HomeShell
  api/v1/…                      API public + cư dân
  api/admin/…                   API admin
  api/img/[...key]              Stream ảnh public/ từ MinIO
  admin/login, admin/(panel)/…  9 màn admin
  bien/[id], dai-su/[slug], khu-pho/[slug]   Trang share + opengraph-image động
  chinh-sach-du-lieu            Chính sách dữ liệu (PDPD)
  robots.ts                     Chặn index /admin và /api

src/components/
  client-api.ts                 fetch helper: tự gắn CSRF header + basePath
  home/                         HomeShell + 9 component trang chủ
  admin/AdminShell.tsx          Khung admin (sidebar, guard, Card/Btn dùng chung)

tests/                          vitest: scoring (3 case bắt buộc), four-n, phone
deploy/Caddyfile                Proxy + TLS + security headers (mode 4 service)
docker-compose.yml              Mode "chuẩn": web + db + storage + proxy
docker-compose.prod.yml         Mode production thực tế (VM dùng chung, Caddy trên host)
Dockerfile                      Multi-stage, standalone, non-root, healthcheck
.github/workflows/deploy.yml    CI/CD self-hosted runner trên VM
```

## 6. Stack

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Web | Next.js 15 App Router · React 19 · TypeScript strict | `output: standalone` |
| Style | TailwindCSS 4 (`@theme` token trong `globals.css`) | Font Be Vietnam Pro + Baloo 2 (self-host) |
| DB | PostgreSQL 16 | driver `pg`, pool max 10, `pgcrypto` cho `gen_random_uuid()` |
| Ảnh | MinIO (S3-compatible) | prefix `public/` (stream qua app) và `private/` (chỉ admin) |
| Xử lý ảnh | sharp | cách điệu duotone bản đồ + convert WebP |
| Mật khẩu | @node-rs/argon2 (Argon2id, m=19456, t=2, p=1) | chỉ dùng cho admin |
| 2FA | otplib (TOTP) | tuỳ chọn từng tài khoản admin |
| Excel/Zip | xlsx + adm-zip | bulk import khu phố |
| Test | vitest | 3 test case điểm bắt buộc pass |
| Proxy | Caddy | TLS tự động, security headers |
| Đóng gói | Docker + Docker Compose · pnpm 9 · Node 22 | |

## 7. Từ điển thuật ngữ

| Thuật ngữ | Nghĩa trong hệ thống | Định danh kỹ thuật |
|---|---|---|
| **Khu phố** | Đơn vị địa lý tham gia chiến dịch (phường/hẻm/xóm) | bảng `neighborhoods` |
| **Góc xóm / Vấn đề / Điểm nóng** | Một địa điểm cụ thể cần lời nhắc | bảng `issues` |
| **Câu nhắc** | Câu ≤120 ký tự người dân viết cho một góc xóm | bảng `suggestions` |
| **Thương** | Một lượt bình chọn cho câu nhắc | bảng `votes` |
| **4N** | Nhắc · Nhở · Nhỏ · Nhẹ — chuẩn duyệt nội dung, **admin tick tay** | `suggestions.review_4n` |
| **Biển** | Tấm biển thật treo ngoài đời từ câu được chọn | `suggestions.status = 'installed'` |
| **Đại sứ / Cây bút của khu phố** | Cư dân có điểm cao trên bảng xếp hạng | `score_events` + `leaderboard.ts` |
| **Chứng nhận 4N** | Danh hiệu khu phố treo đủ 100% biển | `neighborhoods.certified_4n` |
| **Lead** | Người đồng ý để FPT liên hệ tư vấn ưu đãi | bảng `leads`, `opted_in = true` |
| **Lead tầng 1** | Tick opt-in ngay trong drawer viết câu (không hỏi lại SĐT) | `source = 'soft_drawer'` |
| **Lead tầng 2** | Điền form ở khối "Quà dành cho cư dân" | `source = 'active_section'` |
| **Shadow-ban** | Chặn im lặng: phiếu/điểm không tính, UI người đó không đổi | `users.is_shadow_banned` |
| **Sổ cái điểm** | Bảng append-only ghi từng lần cộng điểm | `score_events` |
| **Pin** | Điểm đánh dấu góc xóm trên bản đồ, toạ độ **%** | `issues.pin_x/pin_y` |
| **Bản cách điệu** | Ảnh bản đồ đã duotone hoá cho public xem | `neighborhoods.map_stylized_key` |

## 8. Màu trạng thái (thống nhất toàn hệ thống)

| Trạng thái issue | Nhãn hiển thị | Màu pin/pill |
|---|---|---|
| `waiting` | "Đang chờ" | Đỏ gạch `#C0573B` |
| `voting` | "Đang bình chọn" | Cam FPT `#EF7B27` |
| `signed` | "Đã có biển" | Xanh lá `#2F6B4F` |
| `pending_review` / `rejected` | "Chờ duyệt" / "Từ chối" | Chỉ hiện trong admin |

## 9. Đọc tiếp

- Kiến trúc kỹ thuật → [`11-KIEN-TRUC-HE-THONG.md`](11-KIEN-TRUC-HE-THONG.md)
- Dữ liệu & state machine → [`12-DATA-DICTIONARY.md`](12-DATA-DICTIONARY.md)
- Hợp đồng API → [`13-API-REFERENCE.md`](13-API-REFERENCE.md)
