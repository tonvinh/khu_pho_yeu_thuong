# 13 — Tham chiếu API

> Cập nhật: 8/9/2026 — đồng bộ với code sau các đợt 18/8, 2–4/9, 7/9.
> Tất cả endpoint hiện có trong `src/app/api` (đối chiếu bằng `find src/app/api -name route.ts`). Đường dẫn dưới đây **chưa gồm `basePath`** — chạy dưới path (`BASE_PATH=/khu-pho-biet-thuong`, chốt 8/9) thì tiền tố thêm vào đầu.
> Định dạng: JSON UTF-8. Thông báo lỗi là **tiếng Việt, dành cho người dùng cuối** — có thể hiển thị thẳng lên UI.

## 1. Quy ước chung

### 1.1 Xác thực

| Nhóm | Cookie | Bắt buộc CSRF | Guard trong code |
|---|---|---|---|
| Public đọc | — | Không | (không có) |
| Cư dân ghi | `kp_session` (HttpOnly, SameSite=Lax, 180 ngày) | **Có** | `requireUserWrite()` |
| Admin đọc | `kp_admin_session` (HttpOnly, SameSite=Strict, 8h) | Không (GET) | `requireAdmin()` |
| Admin ghi | `kp_admin_session` | **Có** | `requireAdmin()` |
| `POST /auth/identify`, `/auth/logout` | — | **Có** | tự kiểm `verifyCsrf` |

### 1.2 CSRF (double-submit)

1. Gọi `GET /api/v1/csrf` một lần → server set cookie `kp_csrf` (**không** HttpOnly, TTL 24h).
2. Mọi request ghi phải gắn header `x-csrf-token` = giá trị cookie đó.
3. Server so khớp bằng `timingSafeEqual`; lệch hoặc thiếu → **403 `CSRF token không hợp lệ`**.

Client trong repo dùng `src/components/client-api.ts` (`apiGet` / `apiSend` / `apiUpload`) — helper tự lo cả CSRF lẫn `basePath`. Viết code gọi API mới thì **dùng helper này**, đừng gọi `fetch` trần.

### 1.3 Rate limit (in-memory, cửa sổ trượt theo key)

| Hành vi | Hạn mức | Key |
|---|---|---|
| Tạo định danh **mới** | 3 / giờ | `ip_hash + ua_hash` (định danh lại tài khoản đã có: không giới hạn) |
| Mọi hành động ghi của cư dân | 30 / giờ | `user_id` |
| Đăng nhập admin | 20 / 15 phút | `ip_hash` |

Vượt hạn → **429** kèm câu nhắc nhẹ nhàng ("Bạn thao tác hơi nhanh — nghỉ chút rồi quay lại nhé").
Riêng tài khoản admin còn bị **khoá 15 phút sau 5 lần sai mật khẩu** (lưu trong DB, độc lập rate limit theo IP).

### 1.4 Mã lỗi dùng chung

| Mã | Khi nào |
|---|---|
| 400 | Dữ liệu không hợp lệ (thiếu trường, sai định dạng, thiếu tick 4N, thiếu lý do chọn câu) |
| 401 | Chưa định danh / chưa đăng nhập admin / sai mật khẩu |
| 403 | CSRF không hợp lệ |
| 404 | Không tìm thấy, hoặc tài nguyên chưa ở trạng thái công khai |
| 409 | Xung đột trạng thái: tự thương, chuyển trạng thái sai, trùng tên khu phố, SĐT lệch định danh, chưa đủ điều kiện cấp chứng nhận |
| 422 | Bulk import còn dòng lỗi khi `mode=commit` |
| 423 | Tài khoản admin đang bị khoá tạm |
| 429 | Vượt rate limit |

Thân lỗi luôn có dạng `{"error": "…"}`; một số trường hợp kèm cờ phụ (`need_confirm_switch`, dữ liệu preview import).

### 1.5 Nguyên tắc bất di bất dịch

- **Không endpoint nào trả về SĐT gốc** trừ 2 chỗ dành riêng cho admin và **đều ghi audit log**: `GET /api/admin/leads/{id}` và `GET /api/admin/leads?format=csv`.
- Không endpoint public nào trả `phone_hash`, `*_key` ảnh nội bộ, `review_note`, `select_note`.
- Ảnh trả về dưới dạng `*_url` đã qua `imgUrl()`, không phải key MinIO thô.

---

## 2. API công khai & cư dân (`/api/v1`)

### 2.1 `GET /api/v1/csrf`

Khởi tạo token CSRF. Không tạo mới nếu cookie đã tồn tại.

```json
{ "ok": true }
```

### 2.2 `GET /api/v1/counters`

**3** bộ đếm trang chủ (cache 15 giây trong RAM tiến trình). ~~4 ô~~ → 18/8 rút còn 3, Figma 2/9 · B2
đổi ý nghĩa hai ô cuối; `issues_waiting` và `contributors` **đã gỡ khỏi cả truy vấn**.

> **8/9**: route này trả số **đã áp ghi đè của admin** (`getCounters()`). Ô nào admin không ghi đè
> thì vẫn là số đếm thật theo bảng dưới. Xem §3.5c để biết cách đặt/xoá ghi đè.

```json
{ "signs_installed": 2, "neighborhoods_joined": 5, "suggestions_total": 7 }
```

| Khoá | Nhãn trên trang | Đếm gì |
|---|---|---|
| `signs_installed` | Biển đã treo | `suggestions.status = 'installed'` |
| `neighborhoods_joined` | Khu phố | `neighborhoods` NOT hidden **AND `deleted_at IS NULL`** |
| `suggestions_total` | Câu đóng góp | `suggestions.status IN (approved, selected, produced, installed)` |

### 2.3 `GET /api/v1/map`

Danh sách khu phố công khai (+ `pins` còn lại từ thời có bản đồ). **Chỉ trả bản cách điệu** —
không bao giờ có ảnh gốc. Lọc `NOT hidden AND deleted_at IS NULL`, sắp
`ORDER BY featured_position NULLS LAST, name`.

> Trang chủ **bỏ bản đồ từ 1/8**: dữ liệu này nay nuôi `NeighborhoodSlider`, `HeroLookup`,
> `NeighborhoodPicker` và `IdentifyModal`. Mảng `pins` vẫn trả nhưng **không giao diện nào dùng**.
> Mỗi khu trả thêm: `ward`, `city`, `is_featured`, `notes_count` (số câu đã duyệt),
> `photo_urls[]` (tối đa 4 ảnh `neighborhood_photos`), `certificate_url`.

```json
{
  "neighborhoods": [
    { "id": "…", "name": "Phường Bàn Cờ", "ward": "Phường Bàn Cờ",
      "city": "Thành phố Hồ Chí Minh", "slug": "phuong-ban-co",
      "certified_4n": true, "certified_at": "2026-09-01",
      "is_featured": true, "notes_count": 7,
      "map_url": "/api/img/public/maps/…/stylized.webp",
      "certificate_url": null,
      "photo_urls": ["/api/img/public/neighborhoods/…/1.webp"] }
  ],
  "pins": [
    { "id": "…", "neighborhood_id": "…", "category": "tre_con_trong_xom",
      "location_text": "Hẻm 42 Lê Lợi", "status": "voting", "pin_x": 35, "pin_y": 60 }
  ]
}
```

Pin chỉ gồm issue công khai **và đã có toạ độ** (khu phố chưa xoá).

### 2.4 `GET /api/v1/leaderboard`

Không nhận tham số. ~~`?type=ambassador|neighborhood`~~ và ~~`neighborhood_of_month`~~ **đã bỏ**
(18/8: khối "Khu phố dễ thương nhất tháng" gỡ khỏi trang chủ theo email review).

```json
{
  "ambassadors": [
    { "user_id": "…", "display_name": "Bà Liên", "share_slug": "k3f9…",
      "neighborhood_name": "Hẻm chợ Xóm Mới", "score": 82,
      "signs_installed": 1, "suggestions_count": 3, "votes_received": 45,
      "week_points": 12, "top_quote": "…", "top_quote_spot": "Hẻm 42 Lê Lợi",
      "top_quote_installed": true }
  ],
  "viewer_rank": { "rank": 4, "score": 41, "above_name": "Anh Dũng", "above_score": 77 }
}
```

Top 10, đã loại tài khoản shadow-ban và người có điểm 0. `suggestions_count` thêm 2/9 (Figma · B4 —
tab 3 hiện "N câu đóng góp"). `viewer_rank` là `null` khi khách chưa định danh hoặc chưa có điểm.
Khu phố **đã xoá mềm** ⇒ `neighborhood_name` về `null`.

### 2.5 `GET /api/v1/issues`

| Query | Ý nghĩa |
|---|---|
| `status` | `waiting` \| `voting` \| `signed`. Bỏ trống = cả ba |
| `neighborhood` | Lọc theo uuid khu phố |

```json
{ "issues": [
  { "id": "…", "category": "tre_con_trong_xom", "location_text": "Hẻm 42 Lê Lợi",
    "description": "…", "status": "voting",
    "neighborhood_id": "…", "neighborhood_name": "Phường Lê Lợi",
    "suggestion_count": 2, "top_votes": 27,
    "top_quote": "Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi.",
    "top_author_name": "Bà Liên",
    "voted": false }
] }
```

Sắp xếp: chưa treo biển lên trước, rồi `approved_at` mới nhất. Luôn lọc **`n.deleted_at IS NULL`**.

- `top_author_name` **thêm 2/9** (Figma · B4). ⚠️ Truy vấn này được **nhân đôi** trong
  `src/app/page.tsx` (SSR) — sửa route mà quên SSR (hoặc ngược lại) là dòng **nhảy chữ** sau
  20 giây polling.
- `voted` tính theo cookie phiên; khách vãng lai luôn `false`.
- Bộ lọc "tab 1 chỉ hiện góc phố **chưa có câu nào**" (chốt 7/9) nằm ở **CLIENT** trong
  `IssueBoard`, **không** ở route này — popup "Chọn góc phố" (`SpotPickerModal`) vẫn phải thấy
  mọi góc phố chưa treo biển.

### 2.6 `POST /api/v1/issues` — đề xuất góc xóm 🔒

Yêu cầu: session + CSRF + rate limit.

```json
{ "category": "tre_con_trong_xom",
  "location_text": "Hẻm 25 Nguyễn Trãi",
  "neighborhood_text": "Hẻm 25 Nguyễn Trãi",
  "neighborhood_city": "Thành phố Hồ Chí Minh",
  "neighborhood_ward": "Phường Bàn Cờ",
  "description": "Xóm mình hay có trẻ nhỏ chơi đoạn cua.",
  "neighborhood_id": "uuid | null" }
```

- `category` phải thuộc **6 mã** hợp lệ (`src/lib/taxonomy.ts`), sai → 400.
- **Tỉnh/thành bắt buộc** và phải nằm trong danh mục 34 tỉnh (`geoError()` — 400 nếu sai).
- `neighborhood_id` bỏ trống thì `resolveNeighborhoodId` tra theo `neighborhood_text`
  (chưa có ⇒ tạo khu phố `hidden=true`); không ra được gì thì lấy khu phố trong hồ sơ user;
  không có cả ba → 400 "Vui lòng chọn khu phố của bạn".
- `location_text` cắt 300 ký tự, `description` cắt 1000 ký tự.
- `suggested_content` (câu nhắc gửi kèm, ≤120 ký tự): route **vẫn nhận**, nhưng từ 7/9
  **client không còn gửi** — design Figma 2/9 của popup đề xuất không vẽ ô này. Giữ endpoint
  vì là API công khai và để bật lại được nếu Design xác nhận là quên vẽ (xem `20` §2.1).

**201** `{ "ok": true, "issue": { "id": "…", "status": "pending_review" } }` — chưa hiện công khai.

### 2.7 `GET /api/v1/issues/{id}`

Chi tiết một góc xóm + **các câu nhắc đã duyệt**. Nếu issue chưa công khai → 404.

```json
{
  "issue": { "id": "…", "category": "ve_sinh", "location_text": "…", "description": "…",
             "status": "signed", "pin_x": 70, "pin_y": 55,
             "neighborhood_id": "…", "neighborhood_name": "…",
             "photo_url": "/api/img/public/issues/…/photo.webp" },
  "suggestions": [
    { "id": "…", "content": "Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày.",
      "status": "installed", "author_name": "Bà Liên",
      "is_mine": false, "votes": 45, "voted": true,
      "sign_photo_url": "/api/img/public/signs/…/photo.webp" }
  ]
}
```

`voted` / `is_mine` tính theo cookie phiên; khách vãng lai luôn nhận `false`.

### 2.8 `POST /api/v1/issues/{id}/suggestions` — viết câu nhắc 🔒

```json
{ "content": "Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi.", "lead_opt_in": false }
```

- Issue phải ở `waiting`/`voting`, ngược lại 404 "Vấn đề này chưa mở nhận câu nhắc".
- `content` rỗng → 400; dài > 120 ký tự → 400 "Câu nhắc tối đa 120 ký tự (tiêu chí Nhỏ)".
- `lead_opt_in: true` → tạo **lead tầng 1** (`source='soft_drawer'`) từ SĐT đã mã hoá trong phiên, **không hỏi lại số**. Mặc định là `false`.

**201** `{ "ok": true, "suggestion": { "id": "…" } }` — trạng thái `submitted`, chờ admin duyệt 4N.

### 2.9 `POST /api/v1/suggestions/{id}/vote` — bấm "Bình chọn" 🔒

Không có body. ~~Đây là **toggle**~~ → **quyết định Q6 (2/9): bình chọn xong là CHỐT**, không rút lại.

| Kết quả | Nghĩa |
|---|---|
| `{ "ok": true, "voted": true }` | Vừa bình chọn (+1đ cho tác giả) |
| 404 | Câu không tồn tại hoặc chưa được duyệt |
| 409 `SELF_VOTE` | Tự thương câu của mình — `Câu của mình thì để cả xóm thương nhé 💛` |
| 409 `ALREADY_VOTED` | Đã bình chọn câu này rồi — `Bạn đã bình chọn câu này rồi 💛` |

Người bị shadow-ban vẫn nhận 200 và thấy UI bình thường, nhưng phiếu ghi `is_valid=false` và **không sinh điểm**.
UI (`IssueBoard` tab 2, `NeighborhoodView`, `AmbassadorModal`) khoá nút thành "Đã bình chọn" sau khi bấm.

### 2.9b `POST /api/v1/issues/{id}/vote` — thương câu đang dẫn đầu của một góc phố 🔒

Cùng luật (1 phiếu/câu, cấm tự thương, **không rút phiếu**). Chọn câu đã duyệt nhiều phiếu nhất
**không phải của mình**; hoà thì câu tạo trước thắng.

| Kết quả | Nghĩa |
|---|---|
| `{ "ok": true, "voted": true }` | Đã thương câu dẫn đầu |
| 404 `NO_SUGGESTION` | `Góc này chưa có câu nhắc — bạn mở hàng nhé!` |
| 409 | `SELF_VOTE` hoặc `ALREADY_VOTED` (đã có phiếu trên **bất kỳ** câu nào của góc phố này) |

> ⚠️ Từ bản Figma 2/9 **không còn client nào gọi route này**. Giữ vì là API công khai — nhưng luật
> phải luôn khớp với route theo câu.

### 2.9c `GET /api/v1/notes` — lời nhắc đang chờ bình chọn (MỚI, 4/9)

Nguồn dữ liệu cho **tab 2 "Lời nhắc chờ bạn bình chọn"** của `IssueBoard`.

```json
{ "notes": [
  { "id": "…", "content": "Đi chậm chút nha…", "issue_id": "…",
    "ward_label": "Phường Bàn Cờ", "author_name": "Bà Liên",
    "votes": 27, "voted": false, "is_mine": false }
] }
```

Câu `status='approved'` của góc phố `waiting`/`voting`, khu phố chưa xoá. Xếp
**chưa-bình-chọn trước → nhiều thương → mới nhất**; `LIMIT 50` (UI cắt 5 dòng, không phân trang).
Dùng chung hàm `getVotingNotes()` với SSR `page.tsx` — **quên một bên là dòng nhảy chữ sau polling**.

### 2.9d `GET /api/v1/ambassadors/{share_slug}` — hồ sơ cây bút (MỚI, 2/9)

Cho popup "Cây bút khu phố" (nút "Xem lời nhắc" ở tab 3). Loader `src/lib/ambassador.ts`.

```json
{ "ambassador": { "display_name": "Bà Liên", "share_slug": "k3f9…",
  "ward": "Phường Bàn Cờ", "city": "Thành phố Hồ Chí Minh",
  "notes": [ { "id": "…", "content": "…", "ward": "…", "city": "…",
               "votes": 45, "voted": false, "is_mine": false } ] } }
```

Tối đa **8 câu** (`NOTE_LIMIT`), đều là câu đã qua duyệt 4N.

Không tìm thấy (hoặc tài khoản shadow-ban) → **404** `Không tìm thấy cây bút này`.

### 2.9e `GET /api/v1/geo` — danh mục địa lý chính quy (MỚI, 3/8)

| Gọi | Trả |
|---|---|
| `GET /api/v1/geo` | `{ "provinces": [{ "code": "79", "name": "Thành phố Hồ Chí Minh" }, … ] }` — **34 tỉnh/thành** |
| `GET /api/v1/geo?province=79` (nhận **mã hoặc tên chính thức**) | `{ "wards": [{ "code": "…", "name": "Phường Bàn Cờ" }, … ] }` |

`Cache-Control: public, max-age=86400, s-maxage=86400` — danh mục chỉ đổi khi có nghị quyết mới.

### 2.10 `GET /api/v1/neighborhoods/{idOrSlug}`

Hồ sơ khu phố — dùng cho POPUP khu phố ở trang chủ (`NeighborhoodModal`, mở từ ô tra cứu
"Xóm mình đã đạt chuẩn 4N chưa?" / pill địa chỉ trên slider) và trang share `/khu-pho/{slug}`
(cùng loader `src/lib/neighborhood.ts` nên hai chỗ hiện y hệt nhau).

```json
{ "neighborhood": { "id": "…", "name": "…", "slug": "…", "ward": "…", "city": "…",
  "certified_4n": false, "certified_at": null,
  "photo_urls": ["/api/img/public/…"], "certificate_url": null, "map_url": null,
  "total_issues": 4, "signed_issues": 1, "suggestions_total": 7, "progress_pct": 25,
  "notes": [{ "id": "…", "content": "…", "author_name": "…",
              "status": "approved", "votes": 12, "voted": false, "is_mine": false }] } }
```

- ~~`signs`~~ → **`notes`** (Figma 2/9 · B9): popup đổi từ lưới `SignCard` sang **danh sách câu nhắc**
  kèm pill trạng thái và nút Bình chọn. Loader `loadNeighborhoodDetail(key, viewerId)` nhận thêm
  **người xem** để đánh dấu `voted` / `is_mine`.
- Nút Bình chọn **chỉ hiện ở câu `status='approved'`** (chốt 7/9) — `selected`/`produced`
  ("Chờ treo biển") và `installed` ("Đã lên biển") đã hết vòng bình chọn.
- Khu phố **đã xoá mềm** ⇒ **404**.

### 2.11 `POST /api/v1/auth/identify` — định danh (KHÔNG OTP)

```json
{ "phone": "0901234567", "display_name": "Cô Tám tạp hoá", "neighborhood_id": "uuid | null" }
```

Xử lý:

1. Chuẩn hoá SĐT về `+84…`; sai định dạng hoặc trùng dải số ảo → 400 (**cùng một câu lỗi** để không lộ thông tin).
2. `phone_hash = HMAC-SHA256(sđt, PEPPER)`; đã tồn tại ⇒ đăng nhập lại tài khoản cũ (cập nhật tên/khu phố nếu gửi kèm).
3. Chưa tồn tại ⇒ kiểm rate limit tạo mới, bắt buộc có `display_name`, tạo user + `share_slug` ngẫu nhiên.
4. Tạo phiên, set cookie `kp_session`, đính SĐT mã hoá vào bản ghi phiên (xem `12` §6).

```json
{ "ok": true, "me": { "display_name": "…", "share_slug": "…",
                      "neighborhood_id": "…", "neighborhood_name": "…" } }
```

**Response không bao giờ chứa SĐT hay hash.**

### 2.12 `POST /api/v1/auth/logout`

Thu hồi phiên (`revoked=true`) + xoá cookie. `{ "ok": true }`.

### 2.13 `GET /api/v1/me` · `PATCH /api/v1/me`

- `GET` (cần cookie phiên): `{ "me": { display_name, share_slug, neighborhood_id, neighborhood_name, score } }`; chưa định danh → 401.
- `PATCH` 🔒: `{ "display_name": "…", "neighborhood_id": "…" }` — trường rỗng/thiếu thì giữ nguyên giá trị cũ.

### 2.14 `GET /api/v1/me/notifications` · `PATCH /api/v1/me/notifications/{id}`

- `GET`: tối đa 5 thông báo **chưa xem**, mới nhất trước.
  ```json
  { "notifications": [ { "id": "…", "type": "sign_installed", "ref_id": "…",
      "payload": { "location_text": "…", "content": "…" }, "created_at": "…" } ] }
  ```
- `PATCH` 🔒: đánh dấu đã xem. Không phải của mình → 404.

### 2.15 `GET /api/img/{key…}`

Stream ảnh từ MinIO. **Chỉ** phục vụ key bắt đầu `public/`; chứa `..` hoặc prefix khác → 404.
`Cache-Control: public, max-age=86400, immutable`. Content-Type suy từ đuôi (`.webp`/`.png`/mặc định jpeg).

---

## 3. API admin (`/api/admin`)

Tất cả yêu cầu cookie `kp_admin_session` hợp lệ (401 nếu thiếu). Mọi method khác GET cần header CSRF (403 nếu thiếu).

### 3.1 Xác thực

#### `POST /api/admin/auth/login`

```json
{ "email": "admin@fpt.com", "password": "…" }
```

- Email **bắt buộc đuôi `@fpt.com`** (regex server-side) — sai đuôi trả cùng lỗi chung 401 `Email hoặc mật khẩu không đúng`.
- Không tìm thấy email vẫn chạy verify với hash giả (chống timing attack).
- Đang bị khoá → **423**. Sai mật khẩu → tăng `failed_attempts`, chạm 5 → khoá 15 phút.
- Thành công, chưa bật 2FA → set cookie, `{ "ok": true }`.
- Thành công, đã bật 2FA → **chưa cấp phiên**: `{ "ok": true, "totp_required": true, "totp_token": "…" }` (token sống 5 phút, dùng 1 lần).

#### `POST /api/admin/auth/totp`

```json
{ "totp_token": "…", "code": "123456" }
```
Đúng → set cookie `kp_admin_session`. Token hết hạn → 401 "Phiên xác thực hết hạn — đăng nhập lại".

#### `POST /api/admin/auth/logout` · `GET /api/admin/me`

Thu hồi phiên / trả `{ "admin": { "email": "…" } }`.

### 3.2 `GET /api/admin/dashboard`

```json
{
  "counters": { "signs_installed": 2, "neighborhoods_joined": 5, "suggestions_total": 7 },
  "ops": { "issues_pending": 5, "suggestions_pending": 7, "selected_not_produced": 1, "producing": 1 },
  "leads": { "tier1": 2, "tier2": 5, "new": 2, "contacted": 2, "converted": 1 },
  "daily": [ { "day": "2026-07-15", "suggestions": 3, "votes": 12, "leads": 1 } ]
}
```
`daily` = 14 ngày gần nhất (kể cả ngày không có dữ liệu). `counters` vẫn là **3 chỉ số** nhưng
từ 8/9 route này gọi **`getRealCounters()`** — số ĐẾM THẬT, **không** áp ghi đè của admin: dashboard
phải thấy dữ liệu thật chứ không phải con số PR đang hiển thị ngoài trang chủ. Dashboard `/admin` hiện đọc `GET /api/admin/analytics`
(§3.5d) là chính; route này giữ cho khối KPI vận hành/thương mại.

### 3.3 Đề xuất góc phố

`GET /api/admin/issues` — dữ liệu cho **tab "Đề xuất góc phố"** trong `/admin/khu-pho` (gộp từ
`/admin/de-xuat` cũ, 4/8).

| Query | Mặc định | Ý nghĩa |
|---|---|---|
| `status` | `pending_review` | Mọi trạng thái, hoặc `all` |
| `category` · `neighborhood` · `city` | — | Bộ lọc |
| `q` | — | Tìm trong vị trí, mô tả, tên khu phố, phường, tên người đề xuất (≤120 ký tự) |
| `per` · `page` | 20 · 1 | Phân trang (`per` tối đa 200) |

Trả `{ issues: [...], total, counts }` — `counts` đếm theo **từng trạng thái với cùng bộ lọc**
(trừ chính trạng thái) để hiện badge trên tab. Hàng chờ duyệt sắp **cũ nhất trước** (theo SLA 24h),
các trạng thái khác mới nhất trước. Mỗi dòng kèm `photo_url`, `proposer_name`, `review_note`,
`suggestion_count`, thông tin khu phố (`ward`, `city`, `hidden`).

> ~~`attached_suggestion` (câu nhắc gửi kèm đề xuất)~~ — **đã gỡ khỏi response** (chốt 7/9,
> "gỡ cho đỡ rối"): popup đề xuất không còn ô câu nhắc kèm. **Hành vi backend giữ nguyên** —
> xem `PATCH` dưới đây.

`PATCH /api/admin/issues/{id}`:

| Body | Hiệu ứng |
|---|---|
| `{ "action": "approve" }` | → `waiting`; **khu phố `hidden` tự hiện công khai** (#11); +2đ cho người đề xuất (áp trần 3/tuần); notification `issue_approved`; audit `issue_approve` |
| `{ "action": "reject", "note": "lý do nội bộ" }` | → `rejected`; **câu nhắc gửi kèm còn `submitted` bị `rejected` theo** (khỏi kẹt trong hàng chờ vô hình); notification `issue_rejected`; audit `issue_reject` |

Issue không ở `pending_review` → **409**.

~~`PATCH /api/admin/issues/{id}/pin`~~ — **route này không tồn tại trong code.** Trang chủ bỏ bản đồ
từ 1/8 nên không còn giao diện đặt pin; ảnh địa điểm hiện chỉ đến từ bulk import/seed.

### 3.4 Câu nhắc & vòng đời biển

`GET /api/admin/suggestions` — dữ liệu cho `/admin/loi-nhac` (đổi tên từ `/admin/cau-nhac`, 4/8).

| Query | Mặc định | Ý nghĩa |
|---|---|---|
| `status` | `submitted` | Mọi trạng thái, hoặc `all` |
| `issue` · `category` · `neighborhood` · `city` | — | Bộ lọc |
| `q` | — | Tìm trong nội dung câu, người đăng, tên khu phố, vị trí |
| `per` · `page` | **không truyền `per` ⇒ trả HẾT** | Tab "Chọn câu & vòng đời biển" cần đủ danh sách nên không phân trang |

Luôn kèm `total`. Trả `votes`, `review_4n`, `author_name`, `image_url`, thông tin issue/khu phố.
Bộ lọc cứng: **câu `submitted` của đề xuất đang `pending_review`/`rejected` KHÔNG vào danh sách này**
(#17) — admin xử lý chúng ở màn duyệt đề xuất.

`PATCH /api/admin/suggestions/{id}`:

| Body | Điều kiện | Hiệu ứng |
|---|---|---|
| `{"action":"approve","review_4n":{"nhac":true,"nho":true,"nho2":true,"nhe":true}}` | đang `submitted`, **đủ 4 ô true** | → `approved`, +5đ tác giả, issue `waiting → voting`. Thiếu ô → 400 "Cần tick đủ 4 ô Nhắc · Nhở · Nhỏ · Nhẹ mới duyệt được" |
| `{"action":"reject","note":"…"}` | đang `submitted`/`approved` | → `rejected` |
| `{"action":"select","note":"…"}` | đang `approved` | → `selected`. Nếu **không** phải câu cao phiếu nhất mà thiếu `note` → 400 |
| `{"action":"produced"}` | đang `selected` | → `produced` |
| `{"action":"installed","installed_date":"2026-09-20"}` | đang `produced` | → `installed`; issue → `signed`; +30đ; tạo notification in-web. `installed_date` bỏ trống = hôm nay |

Sai trạng thái → 409 "Trạng thái hiện tại không cho phép hành động này".

`POST /api/admin/suggestions/{id}/photo` (~~`/sign-photo`~~) — multipart `file` (≤10MB) →
`public/signs/{id}/photo.webp`, ghi `suggestions.image_key`, trả `image_url`.

`POST /api/admin/suggestions/import` — import **câu duyệt** từ Excel/CSV 5 cột
(`Câu | Tên khu phố (phải có sẵn) | Vị trí treo biển | Chủ đề (mã hoặc tên) | Người đăng`);
`GET` cùng đường dẫn tải file template. Validate → commit all-or-nothing như bulk import khu phố.
Câu import coi như **đã duyệt** (`approved`, 4N tick đủ) và **không cộng điểm**; góc phố chưa có thì
tạo mới ở `waiting` rồi chuyển `voting`, người đăng chưa có thì tạo cư dân mới (không SĐT thật).
`maxDuration = 60s`.

### 3.5 Khu phố, ảnh, chứng nhận, xoá mềm

| Endpoint | Mô tả |
|---|---|
| `GET /api/admin/neighborhoods` | Danh sách **kể cả khu đã xoá mềm** (kèm `deleted_at` — bảng admin có tab "🗑 Đã xoá", các tab khác lọc ở client). Trả `visible` (= `NOT hidden`), `is_featured`, `featured_position`, `certified_4n`, `certified_at`, `certificate_photo_url`, `photos[{position,url}]`, `total_issues`, `signed_issues`. **Không trả key MinIO thô** |
| `POST /api/admin/neighborhoods` | `{ "name", "city", "ward", "slug?", "visible?" }` — ~~`district`~~ đã bỏ; **`city` và `ward` bắt buộc** và phải khớp danh mục 34 tỉnh (`geoError()`). Slug tự sinh nếu bỏ trống. Trùng tên → **409**; nếu tên đó thuộc khu **đã xoá** thì lỗi nói rõ *"vào tab 'Đã xoá' để khôi phục thay vì tạo mới"* |
| `PATCH /api/admin/neighborhoods/{id}` | `{ name?, ward?, city?, visible?, is_featured?, featured_position? }`. **Từ 7/9 ba trạng thái bật/tắt KHÔNG điều kiện** (trước: tiêu biểu bắt buộc đang hiển thị). `featured_position` là **slot slide 1–10**; trùng slot của khu khác ⇒ **HOÁN ĐỔI** hai khu, không báo lỗi. Bỏ `is_featured` ⇒ nhả slot. Khu đã xoá → **409** "khôi phục trước khi sửa" |
| `PATCH /api/admin/neighborhoods/{id}` với `{ "restore": true }` | **Khôi phục** khu đã xoá — về trạng thái **ẩn** (`hidden=true`) để admin kiểm rồi mới bật |
| `DELETE /api/admin/neighborhoods/{id}` | **Xoá mềm**: `deleted_at = now()`, `hidden = true`, `is_featured = false`, nhả slot. Dữ liệu (góc phố, câu nhắc, phiếu, điểm) **giữ nguyên**. Xoá lại khu đã xoá → 200, không đổi gì |
| `PATCH /api/admin/neighborhoods/{id}/certify` | `{}` → cấp chứng nhận. **Từ 7/9 BỎ điều kiện "100% biển đã treo"** — chứng nhận là quyết định vận hành (có buổi trao biển ngoài đời), UI chỉ hiện tiến độ để tham khảo.<br>`{ "certified_at": "2026-09-01" }` đặt ngày thủ công · `{ "revoke": true }` thu hồi (**không** xoá ảnh chứng nhận). Khu đã xoá → 409 |
| `POST` · `DELETE /api/admin/neighborhoods/{id}/photos` | Ảnh tổng quan khu phố, **tối đa 4**: multipart `{ file, position? (1–4) }` — không gửi `position` thì lấy slot trống đầu tiên (đủ 4 → **409**). Server chuẩn hoá **1280×720 WebP** nên các slot luôn cùng cỡ |
| `POST` · `DELETE /api/admin/neighborhoods/{id}/certificate` | Ảnh chứng nhận 4N, **tối đa 1**, upload được bất kỳ lúc nào (không phụ thuộc `certified_4n` — migration 005). Ảnh cũ bị xoá khỏi MinIO khi thay |
| `GET` · `POST /api/admin/neighborhoods/import` | `GET` tải template `.xlsx`; `POST` multipart `{ file, mode: validate\|commit }` — Excel/CSV **3 cột** `Tên khu phố \| Tỉnh/Thành phố \| Phường/Xã`, all-or-nothing. `maxDuration = 60s` |

~~`POST` / `GET /api/admin/neighborhoods/{id}/map-image`~~ — **hai route này không tồn tại trong code.**
Trang chủ bỏ bản đồ từ 1/8; `stylizeMap()` trong `src/lib/stylize.ts` giờ **mồ côi** (chỉ còn
`scripts/seed-images.mjs` và `tests/stylize.test.ts` gọi).

### 3.5b `GET` · `PATCH /api/admin/votes` — Theo dõi thương (MỚI)

Dữ liệu cho `/admin/voting`: `{ suggestions: [...], users: [...] }` (mỗi bên LIMIT 300, kèm
`votes` và `admin_votes`).

`PATCH` nhận **đúng một** trong `suggestion_id` / `user_id`, cùng `votes` (số nguyên 0–100000):

- **Tăng** ⇒ chèn phiếu thật `source='admin'`, `user_id NULL` (migration 007) nên mọi query đếm
  votes hiện có tự đúng; ghi điểm qua `recordVoteReceivedBulk`.
- **Giảm** ⇒ xoá hẳn phiếu admin trước, hết mới `is_valid=false` phiếu cư dân **mới nhất**
  (giữ bản ghi để trạng thái "đã bình chọn" của người bấm không đổi); thu hồi điểm qua
  `invalidateVoteReceivedBulk`.
- Theo **người nhận**: tăng thì dồn phiếu vào câu cao phiếu nhất; giảm thì gỡ trên toàn bộ câu.
- Luôn ghi `audit_logs` action **`votes_adjust`** kèm `{from, to}`.
- 404 câu chưa duyệt · 409 `Người này chưa có câu nào được duyệt để gắn thương`.

### 3.5c `GET` · `PATCH /api/admin/site-content` — Nội dung trang chủ (MỚI)

- `GET` → `{ defaults, overrides, counters: { real, overrides } }`. `overrides` là **13 khoá text**;
  `counters.real` là số đếm thật (dùng làm placeholder "để trống thì trang chủ ra số này"),
  `counters.overrides` là ghi đè đang lưu (`""` = đang tự đếm).
- `PATCH` nhận các khoá text (≤1000 ký tự). Giá trị **rỗng hoặc trùng mặc định ⇒ XOÁ hàng ghi đè**
  (quay về copy gốc). Không có khoá hợp lệ nào → 400. Ghi audit `site_content_update` kèm danh sách khoá.
- `SITE_TEXT_KEYS` sinh **từ** `SITE_CONTENT_DEFAULTS` ⇒ gỡ khoá khỏi file là API tự bỏ theo.
- **Nhóm `counters` (MỚI 8/9)** — ghi đè dải 3 con số ở hero, gửi trong body như một object riêng:

  ```json
  { "hero_title": "…", "counters": { "signs_installed": "1200", "neighborhoods_joined": "", "suggestions_total": 350 } }
  ```

  Nhận cả chuỗi lẫn số. Ô **rỗng ⇒ xoá ghi đè** (về đếm thật). Không phải số nguyên 0…1.000.000 → 400.
  `counters` không phải object → 400. Ghi cùng bảng `site_content` (khoá `counter_*`) và cùng audit
  `site_content_update`; sau khi ghi gọi `resetCountersCache()` nên **trang chủ đổi số ngay**, không
  đợi hết cache 15s.

~~`POST` / `DELETE /api/admin/site-content/kv`~~ (ảnh KV chiến dịch) — **route đã XOÁ** ngày 4/9
cùng khối TVC/KV.

### 3.5d `GET /api/admin/analytics` — dashboard phân tích (MỚI)

Gộp toàn bộ số liệu của `/admin` trong 1 response, cache 60s theo khoá bộ lọc.
Bộ lọc: `days` ∈ {7, 30, 90} (mặc định 30) · `neighborhood_id` · `category`; kỳ so sánh là
cùng độ dài liền trước. Leads và cư dân mới không có `category`, leads không gắn khu phố ⇒ hai
khối đó bỏ qua bộ lọc tương ứng (UI có ghi chú). Hàng đợi vận hành + chất lượng: không theo bộ lọc.

### 3.6 Leads

| Endpoint | Mô tả |
|---|---|
| `GET /api/admin/leads` | Chỉ bản ghi `opted_in`. Trả `phone_masked`, **không** trả `phone_encrypted` |
| `GET /api/admin/leads?province=…` | Lọc theo tỉnh/thành (sale chia vùng — thêm 18/8) |
| `GET /api/admin/leads?format=csv` | Xuất CSV UTF-8 có BOM (mở Excel không lỗi font), **9 cột** `thoi_gian,ten,sdt,tinh_thanh,dia_chi,khu_pho,quan_tam,nguon,trang_thai` (thêm `tinh_thanh` + `dia_chi` từ 18/8). **Giải mã SĐT + ghi `audit_logs(leads_export_csv)`** kèm `{count, province}` |
| `GET /api/admin/leads/{id}` | Hiện **1 SĐT** đã giải mã: `{ "phone": "+8490…" }`. **Ghi `audit_logs(lead_phone_reveal)`**. **Id không đúng dạng UUID → 404** (trước 4/9 là 500 vì lỗi Postgres 22P02) |
| `PATCH /api/admin/leads/{id}` | `{ "status": "contacted", "note": "…" }` — status thuộc `new/contacted/converted/closed`; id sai dạng → 404 |

### 3.7 Chống gian lận

`GET /api/admin/fraud` — ba nhóm cảnh báo:

```json
{
  "ipClusters":   [ { "ip_hash": "…", "accounts": 4, "names": ["…"], "user_ids": ["…"] } ],
  "burstTargets": [ { "author_id": "…", "display_name": "…", "votes_from_new_accounts": 12 } ],
  "fastVoters":   [ { "user_id": "…", "display_name": "…", "is_shadow_banned": false, "votes_last_hour": 20 } ]
}
```

Ngưỡng: ≥3 tài khoản cùng `ip_hash` trong 24h · ≥10 phiếu từ tài khoản <48h tuổi trong 48h · ≥20 phiếu/giờ từ 1 tài khoản. Mỗi nhóm giới hạn 20 dòng.

`POST /api/admin/fraud`:

| Body | Hiệu ứng |
|---|---|
| `{"action":"shadow_ban","user_id":"…"}` | Bật `is_shadow_banned` — **im lặng**, UI người đó không đổi |
| `{"action":"unban","user_id":"…"}` | Tắt cờ |
| `{"action":"invalidate_votes","user_id":"…"}` | Vô hiệu mọi phiếu hợp lệ của user **và thu hồi đúng 1 event `vote_received` tương ứng mỗi phiếu** |

### 3.8 ~~`GET /api/admin/scores`~~ — KHÔNG TỒN TẠI

Route này (và màn `/admin/diem` đi kèm) **không có trong code**. Việc đối soát điểm hiện làm ở
`/admin/voting` (Theo dõi thương), `/admin/gian-lan` và truy vấn `score_events` bằng psql.
Xem `20` §3 — nợ kỹ thuật.

### 3.9 ~~`POST /api/admin/import`~~ → hai route import riêng

Đường dẫn `/api/admin/import` **không tồn tại**. Thay vào đó có hai route, cả hai đều
`GET` = tải template · `POST` multipart `{ file, mode: validate|commit }` · all-or-nothing:

| Route | File | Cột |
|---|---|---|
| `/api/admin/neighborhoods/import` | 1 sheet `KhuPho` | `Tên khu phố \| Tỉnh/Thành phố \| Phường/Xã` |
| `/api/admin/suggestions/import` | 1 sheet `Cau` | `Câu (≤120) \| Tên khu phố (đã có) \| Vị trí treo biển \| Chủ đề \| Người đăng` |

Cả hai nhận **`.xlsx` lẫn `.csv`**; CSV không BOM được tự giải mã UTF-8 (`@/lib/spreadsheet` —
QC 2/9 · B1, nếu không SheetJS đoán latin-1 và làm hỏng dấu tiếng Việt).

Mô tả template 2 sheet `KhuPho` + `VanDe` dưới đây là **đặc tả gốc chưa được triển khai** —
giữ lại để đối chiếu:

#### (đặc tả gốc, chưa triển khai) `POST /api/admin/import` — bulk import khu phố

multipart:

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `file` | ✅ | `.xlsx` đúng template: 2 sheet **`KhuPho`** và **`VanDe`** |
| `images_zip` | | Zip ảnh, khớp theo **tên file** ghi trong cột Excel |
| `mode` | | `validate` (mặc định) hoặc `commit` |

Cột sheet `KhuPho`: `ten, phuong, quan, thanhpho, anh_ban_do, anh_khu_pho`.
Cột sheet `VanDe`: `ten_khu_pho, loai, vi_tri, mo_ta, pin_x, pin_y, anh_dia_diem`.

Kiểm tra từng dòng: thiếu trường bắt buộc · trùng tên trong file · trùng tên với DB · `loai` không thuộc 8 mã · `pin_x/pin_y` ngoài 0–100 · tên khu phố ở sheet VanDe không khớp sheet KhuPho · thiếu ảnh trong zip (chỉ tính là lỗi khi **có** gửi zip).

`mode=validate` → 200 kèm preview từng dòng + `summary`:

```json
{ "mode": "validate",
  "khupho": [ { "row": 2, "ten": "…", "errors": [] } ],
  "vande":  [ { "row": 2, "ten_khu_pho": "…", "loai": "toc_do", "errors": ["Thiếu vị trí"] } ],
  "summary": { "neighborhoods": 20, "issues": 45, "errors": 1, "images": 30 } }
```

`mode=commit`:
- Còn lỗi → **422**, **không ghi gì** (all-or-nothing).
- Sạch lỗi → ghi toàn bộ trong **một transaction**; issue import vào thẳng `waiting`. Ảnh upload lên MinIO **sau khi DB commit** để lỗi upload không phá dữ liệu:
  ```json
  { "mode": "commit", "ok": true,
    "created": { "neighborhoods": 20, "issues": 45 }, "upload_errors": [] }
  ```
`maxDuration = 120s` cho route này.

---

## 4. Ví dụ kịch bản đầy đủ (curl)

```bash
BASE=https://khupho.ailab.city
J=/tmp/cookies.txt

# 1) Lấy CSRF
curl -s -c $J "$BASE/api/v1/csrf" >/dev/null
CSRF=$(awk '/kp_csrf/{print $7}' $J)

# 2) Định danh (tạo/đăng nhập tài khoản cư dân)
curl -s -b $J -c $J -X POST "$BASE/api/v1/auth/identify" \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"phone":"0901234567","display_name":"Cô Tám tạp hoá"}'

# 3) Đề xuất một góc xóm
curl -s -b $J -X POST "$BASE/api/v1/issues" \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"category":"tre_con_trong_xom","location_text":"Hẻm 25 Nguyễn Trãi",
       "neighborhood_city":"Thành phố Hồ Chí Minh","neighborhood_ward":"Phường Bàn Cờ",
       "neighborhood_id":"<uuid>"}'

# 4) Viết câu nhắc cho một góc xóm đã duyệt
curl -s -b $J -X POST "$BASE/api/v1/issues/<issueId>/suggestions" \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"content":"Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi.","lead_opt_in":false}'

# 5) Bình chọn một câu (KHÔNG rút lại được — bấm lần 2 trả 409)
curl -s -b $J -X POST "$BASE/api/v1/suggestions/<suggestionId>/vote" \
  -H "x-csrf-token: $CSRF"
```

Phía admin:

```bash
curl -s -c $J "$BASE/api/v1/csrf" >/dev/null; CSRF=$(awk '/kp_csrf/{print $7}' $J)
curl -s -b $J -c $J -X POST "$BASE/api/admin/auth/login" \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"email":"admin@fpt.com","password":"…"}'

# Duyệt câu nhắc (bắt buộc đủ 4 ô)
curl -s -b $J -X PATCH "$BASE/api/admin/suggestions/<id>" \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"action":"approve","review_4n":{"nhac":true,"nho":true,"nho2":true,"nhe":true}}'
```

## 5. Bảng tra nhanh toàn bộ endpoint

> Danh sách này sinh từ `find src/app/api -name route.ts` ngày 8/9/2026 — **43 file route**.

| Method | Đường dẫn | Auth | CSRF |
|---|---|---|---|
| GET | `/api/v1/csrf` | — | — |
| GET | `/api/v1/counters` | — | — |
| GET | `/api/v1/map` | — | — |
| GET | `/api/v1/geo` (`?province=`) | — | — |
| GET | `/api/v1/leaderboard` | — | — |
| GET | `/api/v1/notes` | tuỳ chọn | — |
| GET | `/api/v1/issues` | tuỳ chọn | — |
| POST | `/api/v1/issues` | cư dân | ✅ |
| GET | `/api/v1/issues/{id}` | tuỳ chọn | — |
| POST | `/api/v1/issues/{id}/suggestions` | cư dân | ✅ |
| POST | `/api/v1/issues/{id}/vote` | cư dân | ✅ |
| POST | `/api/v1/suggestions/{id}/vote` | cư dân | ✅ |
| GET | `/api/v1/neighborhoods/{idOrSlug}` | tuỳ chọn | — |
| GET | `/api/v1/ambassadors/{share_slug}` | tuỳ chọn | — |
| POST | `/api/v1/auth/identify` | — | ✅ |
| POST | `/api/v1/auth/logout` | — | ✅ |
| GET·PATCH | `/api/v1/me` | cư dân | ✅ (PATCH) |
| GET | `/api/v1/me/notifications` | cư dân | — |
| PATCH | `/api/v1/me/notifications/{id}` | cư dân | ✅ |
| POST | `/api/v1/leads` | cư dân | ✅ |
| GET | `/api/img/{key…}` | — | — |
| POST | `/api/admin/auth/login` · `/totp` · `/logout` | — / admin | ✅ |
| GET | `/api/admin/me` · `/dashboard` · `/analytics` | admin | — |
| GET | `/api/admin/issues` | admin | — |
| PATCH | `/api/admin/issues/{id}` | admin | ✅ |
| GET | `/api/admin/suggestions` | admin | — |
| PATCH | `/api/admin/suggestions/{id}` | admin | ✅ |
| POST | `/api/admin/suggestions/{id}/photo` | admin | ✅ |
| GET·POST | `/api/admin/suggestions/import` | admin | ✅ (POST) |
| GET·POST | `/api/admin/neighborhoods` | admin | ✅ (POST) |
| PATCH·DELETE | `/api/admin/neighborhoods/{id}` | admin | ✅ |
| PATCH | `/api/admin/neighborhoods/{id}/certify` | admin | ✅ |
| POST·DELETE | `/api/admin/neighborhoods/{id}/photos` | admin | ✅ |
| POST·DELETE | `/api/admin/neighborhoods/{id}/certificate` | admin | ✅ |
| GET·POST | `/api/admin/neighborhoods/import` | admin | ✅ (POST) |
| GET·PATCH | `/api/admin/votes` | admin | ✅ (PATCH) |
| GET·PATCH | `/api/admin/site-content` | admin | ✅ (PATCH) |
| GET | `/api/admin/leads` (+`?format=csv`, `?province=`) | admin | — |
| GET·PATCH | `/api/admin/leads/{id}` | admin | ✅ (PATCH) |
| GET·POST | `/api/admin/fraud` | admin | ✅ (POST) |

**Đường dẫn từng có trong tài liệu nhưng KHÔNG tồn tại trong code:** `/api/v1/share/*` ·
`/api/admin/scores` · `/api/admin/import` · `/api/admin/issues/{id}/pin` ·
`/api/admin/neighborhoods/{id}/map-image` · `/api/admin/suggestions/{id}/sign-photo`
(tên đúng là `/photo`) · `/api/admin/site-content/kv` (**đã xoá 4/9**).

### `POST /api/v1/leads` — lead tầng 2 🔒

Chưa liệt kê chi tiết ở §2 vì gắn với quy tắc riêng:

```json
{ "name": "Cô Tám", "phone": "0901234567",
  "province": "Thành phố Hồ Chí Minh", "address": "42 Lê Lợi",
  "neighborhood_text": "Hẻm 42 Lê Lợi",
  "interests": ["internet","internet_tv_camera"], "opted_in": true, "confirm_switch": false }
```

- **`province` bắt buộc** (18/8) và phải thuộc danh mục 34 tỉnh — sai → 400. `address` tuỳ chọn.
  `neighborhood_text` vẫn nhận để popup ưu đãi nhanh (`LeadPromptModal`) không phải đổi.
- `interests` lọc theo **6 mã** trong `INTERESTS` (`internet`, `camera`, `fpt_play`, `internet_tv`,
  `internet_camera`, `internet_tv_camera`).
- `opted_in` **phải là `true`** — thiếu → 400 "Cần tick đồng ý nhận ưu đãi thì tụi mình mới lưu số nhé". Không có đường nào ghi lead khi chưa đồng ý.
- Nếu `phone` **khác** số đã định danh trong cookie: trả **409** `{ "error": "Số này khác với số bạn đã dùng…", "need_confirm_switch": true }`. Gửi lại với `confirm_switch: true` → hệ thống chuyển định danh sang tài khoản của số mới (tạo mới nếu chưa có) và **cấp cookie phiên mới**; dữ liệu hai tài khoản **không gộp**.
- Thành công: `{ "ok": true, "switched": false }`.
