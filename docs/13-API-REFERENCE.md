# 13 — Tham chiếu API

> Tất cả endpoint hiện có trong `src/app/api`. Đường dẫn dưới đây **chưa gồm `basePath`** — nếu chạy dưới path (`BASE_PATH=/khu-pho-de-thuong`) thì tiền tố thêm vào đầu.
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

4 bộ đếm trang chủ (cache 15 giây).

```json
{ "signs_installed": 2, "issues_waiting": 5, "contributors": 7, "neighborhoods_joined": 5 }
```

### 2.3 `GET /api/v1/map`

Dữ liệu bản đồ. **Chỉ trả bản cách điệu** — không bao giờ có ảnh gốc.

```json
{
  "neighborhoods": [
    { "id": "…", "name": "Phường Bàn Cờ", "slug": "phuong-ban-co",
      "certified_4n": true, "certified_at": "2026-09-01",
      "map_url": "/api/img/public/maps/…/stylized.webp",
      "photo_url": null }
  ],
  "pins": [
    { "id": "…", "neighborhood_id": "…", "category": "toc_do",
      "location_text": "Hẻm 42 Lê Lợi", "status": "voting", "pin_x": 35, "pin_y": 60 }
  ]
}
```

Pin chỉ gồm issue công khai **và đã có toạ độ**.

### 2.4 `GET /api/v1/leaderboard`

| Query | Giá trị |
|---|---|
| `type` | `ambassador` (mặc định) — trả cả hai · `neighborhood` — chỉ khu phố của tháng |

```json
{
  "ambassadors": [
    { "user_id": "…", "display_name": "Bà Liên", "share_slug": "k3f9…",
      "neighborhood_name": "Hẻm chợ Xóm Mới", "score": 82,
      "signs_installed": 1, "votes_received": 45 }
  ],
  "neighborhood_of_month": { "name": "…", "slug": "…", "new_signs": 1, "votes": 27 }
}
```

Top 10, đã loại tài khoản shadow-ban và người có điểm 0.

### 2.5 `GET /api/v1/issues`

| Query | Ý nghĩa |
|---|---|
| `status` | `waiting` \| `voting` \| `signed`. Bỏ trống = cả ba |
| `neighborhood` | Lọc theo uuid khu phố |

```json
{ "issues": [
  { "id": "…", "category": "toc_do", "location_text": "Hẻm 42 Lê Lợi",
    "description": "…", "status": "voting",
    "neighborhood_id": "…", "neighborhood_name": "Phường Lê Lợi",
    "suggestion_count": 2, "top_votes": 27,
    "top_quote": "Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi." }
] }
```

Sắp xếp: chưa treo biển lên trước, rồi `approved_at` mới nhất.

### 2.6 `POST /api/v1/issues` — đề xuất góc xóm 🔒

Yêu cầu: session + CSRF + rate limit.

```json
{ "category": "toc_do", "location_text": "Sân chung Hẻm 25 Nguyễn Trãi",
  "description": "Xe hay phóng nhanh đoạn cua.", "neighborhood_id": "uuid | null" }
```

- `category` phải thuộc 8 mã hợp lệ, sai → 400.
- `neighborhood_id` bỏ trống thì lấy khu phố trong hồ sơ user; không có cả hai → 400.
- `location_text` cắt 300 ký tự, `description` cắt 1000 ký tự.

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

### 2.9 `POST /api/v1/suggestions/{id}/vote` — bấm/bỏ "Thương" 🔒

Không có body. Đây là **toggle**.

| Kết quả | Nghĩa |
|---|---|
| `{ "ok": true, "voted": true }` | Vừa thương (+1đ cho tác giả) |
| `{ "ok": true, "voted": false }` | Vừa bỏ thương (event điểm bị vô hiệu) |
| 404 | Câu không tồn tại hoặc chưa được duyệt |
| 409 | Tự thương câu của mình — `Câu của mình thì để cả xóm thương nhé 💛` |

Người bị shadow-ban vẫn nhận 200 và thấy UI bình thường, nhưng phiếu ghi `is_valid=false` và **không sinh điểm**.

### 2.10 `GET /api/v1/neighborhoods/{idOrSlug}`

Tra cứu tiến độ chứng nhận (dùng cho ô "Xóm mình đã đạt chuẩn 4N chưa?").

```json
{ "neighborhood": { "id": "…", "name": "…", "slug": "…",
  "certified_4n": false, "certified_at": null,
  "total_issues": 4, "signed_issues": 1, "progress_pct": 25,
  "photo_url": null } }
```

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
  "counters": { "signs_installed": 2, "issues_waiting": 5, "contributors": 7, "neighborhoods_joined": 5 },
  "ops": { "issues_pending": 5, "suggestions_pending": 7, "selected_not_produced": 1, "producing": 1 },
  "leads": { "tier1": 2, "tier2": 5, "new": 2, "contacted": 2, "converted": 1 },
  "daily": [ { "day": "2026-07-15", "suggestions": 3, "votes": 12, "leads": 1 } ]
}
```
`daily` = 14 ngày gần nhất (kể cả ngày không có dữ liệu).

### 3.3 Đề xuất vấn đề

| Endpoint | Mô tả |
|---|---|
| `GET /api/admin/issues?status=pending_review` | Hàng chờ duyệt (mặc định `pending_review`; nhận mọi trạng thái). Trả kèm `photo_url`, `proposer_name`, `review_note` |
| `PATCH /api/admin/issues/{id}` | `{ "action": "approve" }` → `waiting` + ghi điểm +2 cho người đề xuất (áp trần tuần)<br>`{ "action": "reject", "note": "lý do nội bộ" }` → `rejected` |

Issue không ở `pending_review` → **409**.

| `PATCH /api/admin/issues/{id}/pin` | Hai kiểu body |
|---|---|
| JSON | `{ "pin_x": 35.4, "pin_y": 60.1 }` — phải trong 0–100, sai → 400 |
| multipart | trường `file` = ảnh địa điểm ≤10MB → convert WebP, lưu `public/issues/{id}/photo.webp` |

### 3.4 Câu nhắc & vòng đời biển

`GET /api/admin/suggestions?status=submitted&issue={uuid}` — mặc định `submitted`; trả kèm `votes`, `review_4n`, `author_name`, thông tin issue/khu phố.

`PATCH /api/admin/suggestions/{id}`:

| Body | Điều kiện | Hiệu ứng |
|---|---|---|
| `{"action":"approve","review_4n":{"nhac":true,"nho":true,"nho2":true,"nhe":true}}` | đang `submitted`, **đủ 4 ô true** | → `approved`, +5đ tác giả, issue `waiting → voting`. Thiếu ô → 400 "Cần tick đủ 4 ô Nhắc · Nhở · Nhỏ · Nhẹ mới duyệt được" |
| `{"action":"reject","note":"…"}` | đang `submitted`/`approved` | → `rejected` |
| `{"action":"select","note":"…"}` | đang `approved` | → `selected`. Nếu **không** phải câu cao phiếu nhất mà thiếu `note` → 400 |
| `{"action":"produced"}` | đang `selected` | → `produced` |
| `{"action":"installed","installed_date":"2026-09-20"}` | đang `produced` | → `installed`; issue → `signed`; +30đ; tạo notification in-web. `installed_date` bỏ trống = hôm nay |

Sai trạng thái → 409 "Trạng thái hiện tại không cho phép hành động này".

`POST /api/admin/suggestions/{id}/sign-photo` — multipart `file` (≤10MB) → `public/signs/{id}/photo.webp`, trả `sign_photo_url`.

### 3.5 Khu phố, chứng nhận, bản đồ

| Endpoint | Mô tả |
|---|---|
| `GET /api/admin/neighborhoods` | Danh sách + `total_issues`, `signed_issues`, `has_map`, `map_stylized_url`. **Không trả `map_image_key`** |
| `POST /api/admin/neighborhoods` | `{ "name": "…", "ward": "…", "district": "…", "city": "…", "slug": "…" }` — slug tự sinh nếu bỏ trống; trùng tên → 409 |
| `PATCH /api/admin/neighborhoods/{id}/certify` | `{}` → cấp chứng nhận, **chỉ khi `signed == total` và `total > 0`**, ngược lại 409 `Chưa đạt 100% biển đã treo (1/4)`.<br>`{ "certified_at": "2026-09-01" }` đặt ngày thủ công. `{ "revoke": true }` thu hồi |
| `POST /api/admin/neighborhoods/{id}/map-image` | multipart `file` (jpg/png/webp ≤10MB) → lưu **bản gốc `private/`** + **bản cách điệu `public/`**, trả `stylized_url` |
| `GET /api/admin/neighborhoods/{id}/map-image` | Trả **ảnh gốc** (image/webp, `private, no-store`) — chỉ admin |

### 3.6 Leads

| Endpoint | Mô tả |
|---|---|
| `GET /api/admin/leads` | Chỉ bản ghi `opted_in`. Trả `phone_masked`, **không** trả `phone_encrypted` |
| `GET /api/admin/leads?format=csv` | Xuất CSV UTF-8 có BOM (mở Excel không lỗi font), cột `thoi_gian,ten,sdt,khu_pho,quan_tam,nguon,trang_thai`. **Giải mã SĐT + ghi `audit_logs(leads_export_csv)`** |
| `GET /api/admin/leads/{id}` | Hiện **1 SĐT** đã giải mã: `{ "phone": "+8490…" }`. **Ghi `audit_logs(lead_phone_reveal)`** |
| `PATCH /api/admin/leads/{id}` | `{ "status": "contacted", "note": "…" }` — status thuộc `new/contacted/converted/closed` |

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

### 3.8 `GET /api/admin/scores`

- Không tham số: top 100 user có ít nhất 1 event, kèm `score` (chỉ event hợp lệ) và `event_count`. **Bao gồm cả tài khoản shadow-ban** (để đối soát).
- `?user={uuid}`: 500 event gần nhất của người đó, kèm `is_valid` để hiển thị gạch ngang.

### 3.9 `POST /api/admin/import` — bulk import khu phố

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
  -d '{"category":"toc_do","location_text":"Hẻm 25 Nguyễn Trãi","neighborhood_id":"<uuid>"}'

# 4) Viết câu nhắc cho một góc xóm đã duyệt
curl -s -b $J -X POST "$BASE/api/v1/issues/<issueId>/suggestions" \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"content":"Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi.","lead_opt_in":false}'

# 5) Bấm Thương (toggle)
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

| Method | Đường dẫn | Auth | CSRF |
|---|---|---|---|
| GET | `/api/v1/csrf` | — | — |
| GET | `/api/v1/counters` | — | — |
| GET | `/api/v1/map` | — | — |
| GET | `/api/v1/leaderboard` | — | — |
| GET | `/api/v1/issues` | — | — |
| POST | `/api/v1/issues` | cư dân | ✅ |
| GET | `/api/v1/issues/{id}` | tuỳ chọn | — |
| POST | `/api/v1/issues/{id}/suggestions` | cư dân | ✅ |
| POST | `/api/v1/suggestions/{id}/vote` | cư dân | ✅ |
| GET | `/api/v1/neighborhoods/{idOrSlug}` | — | — |
| POST | `/api/v1/auth/identify` | — | ✅ |
| POST | `/api/v1/auth/logout` | — | ✅ |
| GET·PATCH | `/api/v1/me` | cư dân | ✅ (PATCH) |
| GET | `/api/v1/me/notifications` | cư dân | — |
| PATCH | `/api/v1/me/notifications/{id}` | cư dân | ✅ |
| POST | `/api/v1/leads` | cư dân | ✅ |
| GET | `/api/img/{key…}` | — | — |
| POST | `/api/admin/auth/login` · `/totp` · `/logout` | — / admin | ✅ |
| GET | `/api/admin/me` · `/dashboard` | admin | — |
| GET | `/api/admin/issues` | admin | — |
| PATCH | `/api/admin/issues/{id}` · `/{id}/pin` | admin | ✅ |
| GET | `/api/admin/suggestions` | admin | — |
| PATCH | `/api/admin/suggestions/{id}` | admin | ✅ |
| POST | `/api/admin/suggestions/{id}/sign-photo` | admin | ✅ |
| GET·POST | `/api/admin/neighborhoods` | admin | ✅ (POST) |
| PATCH | `/api/admin/neighborhoods/{id}/certify` | admin | ✅ |
| GET·POST | `/api/admin/neighborhoods/{id}/map-image` | admin | ✅ (POST) |
| GET | `/api/admin/leads` (+`?format=csv`) | admin | — |
| GET·PATCH | `/api/admin/leads/{id}` | admin | ✅ (PATCH) |
| GET·POST | `/api/admin/fraud` | admin | ✅ (POST) |
| GET | `/api/admin/scores` | admin | — |
| POST | `/api/admin/import` | admin | ✅ |

### `POST /api/v1/leads` — lead tầng 2 🔒

Chưa liệt kê chi tiết ở §2 vì gắn với quy tắc riêng:

```json
{ "name": "Cô Tám", "phone": "0901234567", "neighborhood_text": "Hẻm 42 Lê Lợi",
  "interests": ["internet","internet_tv"], "opted_in": true, "confirm_switch": false }
```

- `opted_in` **phải là `true`** — thiếu → 400 "Cần tick đồng ý nhận ưu đãi thì tụi mình mới lưu số nhé". Không có đường nào ghi lead khi chưa đồng ý.
- `interests` lọc theo danh sách hợp lệ, giá trị lạ bị bỏ.
- Nếu `phone` **khác** số đã định danh trong cookie: trả **409** `{ "error": "Số này khác với số bạn đã dùng…", "need_confirm_switch": true }`. Gửi lại với `confirm_switch: true` → hệ thống chuyển định danh sang tài khoản của số mới (tạo mới nếu chưa có) và **cấp cookie phiên mới**; dữ liệu hai tài khoản **không gộp**.
- Thành công: `{ "ok": true, "switched": false }`.
