# Mô hình dữ liệu & API — "Khu Phố Của Tôi"
Phiên bản 1.0

> Cập nhật: 8/9/2026 — đồng bộ với code sau các đợt 18/8, 2–4/9, 7/9.
> Bảng dưới đây mô tả schema **sau migration 011**. Tên cột chuẩn (kể cả các cột đổi tên
> ở migration 003/006) tra ở [`12-DATA-DICTIONARY.md`](12-DATA-DICTIONARY.md); danh sách
> migration và lý do từng cái ở §6 cuối file này.

---

## 1. Entities

### users
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| phone_hash | char(64) unique NOT NULL | `HMAC-SHA256(SĐT chuẩn hoá +84, PEPPER)` — khoá định danh duy nhất. PEPPER là secret server (secret manager), KHÔNG lưu trong DB/code |
| phone_encrypted | bytea nullable | SĐT gốc mã hoá **AES-256-GCM** (khoá riêng, tách khỏi PEPPER). Chỉ ghi khi cần liên hệ: báo tin vui hoặc lead opt-in |
| phone_purpose | text[] | Cờ mục đích: `lead` (duy nhất — không còn SMS báo tin vui). Không opt-in lead → phone_encrypted để NULL |
| display_name | varchar | "Cô Tám tạp hoá" |
| neighborhood_id | FK → neighborhoods | Khu phố của user |
| role | enum: `resident` | Bảng users chỉ dành cho cư dân (định danh SĐT). Admin nằm ở bảng riêng `admin_users` — hai hệ đăng nhập tách biệt |
| created_at, last_login_at | timestamptz | |
| is_shadow_banned | bool | Lọc gian lận lặng lẽ: hành vi vẫn ghi nhưng không tính điểm/hiển thị |

### neighborhoods (khu phố)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| name | varchar(200) unique | "Phường Bàn Cờ", "Hẻm chợ Xóm Mới" |
| ward, city | varchar(120) | ~~district~~ **đã bỏ** (migration 003 — địa giới mới 1/7/2025 chỉ còn 2 cấp Tỉnh/Thành + Phường/Xã). Lưu **TÊN chính thức** ("Thành phố Hồ Chí Minh", "Phường Bàn Cờ") |
| slug | varchar unique | URL share công khai `/khu-pho/{slug}` |
| map_image_key | varchar(500) | Ảnh bản đồ gốc (Q3) — **hiện không còn route nào ghi/đọc cột này**, xem `20` §3.5 |
| map_stylized_key | varchar(500) | Bản cách điệu public — nay chỉ còn dùng làm **ảnh dự phòng** cho slider/popup khi khu chưa có `neighborhood_photos` |
| certified_4n | bool | Chứng nhận "Khu phố biết thương". Từ 7/9 admin bật/tắt **không điều kiện** |
| certified_at | date | Hiển thị "Hoàn thành 09/2026" |
| certificate_photo_key | varchar(500) | Ảnh chứng nhận (migration 003). Từ migration 005 **không còn ràng buộc** phải `certified_4n` |
| hidden | bool default false | Khu do cư dân tự nhập (free text) tạo ra → ẩn tới khi admin duyệt đề xuất đầu tiên (migration 002) |
| is_featured | bool default false | Vào slider "Khu phố tiêu biểu" ở hero (migration 003) |
| featured_position | int NULL, CHECK 1..10 | **SLOT SLIDE của hero** — 10 chỗ, **duy nhất** (unique index bộ phận, bỏ qua khu đã xoá). Migration 004 tạo, migration 011 siết còn 1..10 + unique |
| deleted_at | timestamptz NULL | **Xoá mềm** (migration 011): khác NULL ⇒ cả cụm khu phố biến mất khỏi web |
| created_at | timestamptz | |

> ~~`photo_url` = ảnh chứng nhận~~ → (đổi 3/8, migration 003) ảnh tổng quan khu phố tách sang
> bảng riêng **`neighborhood_photos`** (tối đa 4 ảnh, `position` 1–4, server chuẩn hoá 1280×720);
> ảnh chứng nhận đổi tên thành `certificate_photo_key`.

### neighborhood_photos (ảnh tổng quan khu phố — migration 003)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| neighborhood_id | FK → neighborhoods, ON DELETE CASCADE | |
| photo_key | varchar(500) | `public/neighborhoods/{id}/…webp` |
| position | int CHECK 1–4 | UNIQUE (neighborhood_id, position). Trang chủ chỉ lấy **ảnh #1** |

### provinces · wards (danh mục địa lý chính quy — migration 009)
| Bảng | Trường | Ghi chú |
|---|---|---|
| `provinces` | `code` varchar(2) PK · `name` varchar(120) unique | **34 tỉnh/thành** theo Quyết định 19/2025/QĐ-TTg (hiệu lực 1/7/2025) |
| `wards` | `code` varchar(5) PK · `province_code` FK · `name` · `division_type` CHECK (`phường`/`xã`/`đặc khu`) | **3.321 đơn vị cấp xã** |

Form đề xuất, modal định danh, khối ưu đãi và form admin đều **CHỌN** từ danh mục này qua
`GET /api/v1/geo`; server validate bằng `geoError()` (`src/lib/geo.ts`). `neighborhoods.city/ward`
vẫn lưu **TÊN** (không có phường trùng tên trong cùng tỉnh).

### site_content (nội dung trang chủ sửa được — migration 008)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| `key` | varchar(50) PK | Chỉ lưu **giá trị ghi đè**; key vắng → dùng mặc định trong `src/lib/site-content-defaults.ts` |
| `value` | text NOT NULL | |
| `updated_at` | timestamptz | |

Bộ khoá hiện tại đúng **13** (test khoá `tests/site-content.test.ts`): `hero_title`, `hero_body`,
`hero_search_placeholder`, `board_title`, `board_hint`, `signs_title`, `lead_title`, `lead_body`,
`lead_privacy`, `footer_line1`, `footer_line2`, `footer_support`, `footer_tagline`.
Đã gỡ khỏi bộ khoá (hàng cũ trong bảng chỉ bị lơ đi, **không migration**): 4 khoá `campaign_*`
(khối TVC/KV, gỡ 4/9) và 4 khoá `sign_promo_line1/2`, `sign_sale_phone`, `sign_hotline`
(dải khuyến mãi trên biển, gỡ 3/9).

### issues (vấn đề / điểm nóng)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| neighborhood_id | FK | |
| category | enum **6 chủ đề**: `khoe_moi_ngay, tre_con_trong_xom, van_minh_tu_te, giup_do_san_se, xom_xanh_sach, song_vui_co_ich` | ~~8 mã cũ~~ → (đổi 1/8, migration 002 remap dữ liệu cũ). Nguồn: `src/lib/taxonomy.ts` |
| location_text | varchar | "Hẻm 42 Lê Lợi" |
| description | text | Mô tả ngắn, không đích danh |
| pin_x, pin_y | float | Toạ độ % (0–100) trên ảnh bản đồ khu phố. **Trang chủ không còn bản đồ từ 1/8** — cột vẫn còn, `/api/v1/map` vẫn trả `pins`, nhưng không giao diện nào đặt pin nữa |
| photo_key | varchar(500) nullable | Ảnh thật của địa điểm (Q3) |
| status | enum: `pending_review, waiting, voting, signed, rejected` | Xem state machine §3 |
| proposed_by | FK → users | |
| review_note | text nullable | Lý do từ chối (admin) |
| created_at, approved_at, signed_at | timestamptz | |

### suggestions (câu nhắc)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| issue_id | FK → issues | |
| author_id | FK → users | |
| content | text | Nội dung câu nhắc (CHECK ≤120 ký tự) |
| neighborhood_id | FK → neighborhoods NOT NULL | migration 006 — câu tự đứng được, không phải lần ngược qua `issues` (trigger tự điền từ issue khi INSERT) |
| category | varchar(30) NOT NULL, CHECK 6 chủ đề | migration 006 |
| review_4n | jsonb | `{nhac, nho, nho2, nhe: bool}` — checklist do **admin tick thủ công khi duyệt** (Q2: không có chấm tự động); duyệt hiển thị yêu cầu đủ 4 ô |
| image_key | varchar(500) nullable | ~~`sign_photo_key`~~ → đổi tên ở migration 006: 1 hình duy nhất cho mỗi câu, cũng là ảnh biển thật |
| installed_date | date | Ngày treo (admin nhập, mặc định hôm nay) |
| status | enum: `submitted, approved, rejected, selected, produced, installed` | |
| review_note | text nullable | |
| created_at, approved_at, installed_at | timestamptz | |

### votes (lượt thương)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| suggestion_id | FK | |
| user_id | FK **nullable** | NULL **chỉ khi** `source='admin'` (CHECK `votes_user_id_required`) |
| source | varchar(10) default `'user'`, CHECK (`user`,`admin`) | migration 007 — phiếu do admin điều chỉnh ở `/admin/voting` là phiếu thật với `source='admin'`, nhờ vậy **mọi query đếm votes hiện có không phải sửa** |
| created_at | timestamptz | |
| is_valid | bool default true | Đặt false khi hệ thống lọc phiếu bất thường (lặng lẽ) hoặc khi admin giảm số thương |
| UNIQUE(suggestion_id, user_id) | | 1 người 1 phiếu/câu. NULL ≠ NULL trong Postgres nên không chặn nhiều phiếu admin |
| CHECK: user_id ≠ suggestion.author_id | Enforce ở tầng ứng dụng | Không tự thương |

> **Bình chọn là CHỐT (quyết định Q6, 2/9).** ~~Bấm lại để bỏ thương (toggle)~~ → cả hai route
> vote trả **409 `ALREADY_VOTED`**; UI khoá nút thành "Đã bình chọn". Không có đường nào rút phiếu
> từ phía cư dân; chỉ admin gỡ được (qua `/admin/voting` hoặc `/admin/gian-lan`).

### leads
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| name | varchar nullable | Tầng 1 có thể không có tên |
| phone_encrypted / phone_masked / phone_hash | bytea / varchar / char(64) | ~~`phone` bản rõ~~ — **không bao giờ lưu bản rõ** |
| neighborhood_text | varchar nullable | Ô free text cũ; popup ưu đãi nhanh (`LeadPromptModal`) vẫn dùng |
| province | varchar(120) | migration 010 — chọn từ danh mục 34 tỉnh, **bắt buộc** ở khối ưu đãi (18/8) |
| address | varchar(300) | migration 010 |
| interests | text[] | **6 mã** (quyết định Q3, 2/9 — giữ 4 mã cũ, chỉ đổi nhãn, thêm 2 mã mới): `internet`, `camera`, `fpt_play`, `internet_tv`, `internet_camera`, `internet_tv_camera` |
| source | enum: `soft_drawer` \| `active_section` | Tầng 1 / Tầng 2 |
| opted_in | bool | Chỉ true mới là lead sale |
| user_id | FK nullable | Nếu gắn được với tài khoản |
| status | enum: `new, contacted, converted, closed` | Admin cập nhật |
| created_at | timestamptz | |

### score_events (sổ cái điểm — append-only)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| user_id | FK | |
| type | enum: `issue_approved(+2), suggestion_approved(+5), vote_received(+1), sign_installed(+30)` | |
| points | int | Trọng số tại thời điểm ghi |
| ref_id | uuid | issue/suggestion/vote liên quan |
| is_valid | bool | Cho phép thu hồi lặng lẽ |
| created_at | timestamptz | |

> Điểm Đại sứ = SUM(points) WHERE is_valid. Điểm khu phố = SUM điểm cư dân trong khu + 0 (số biển đã cộng qua sign_installed của tác giả; bảng "Khu phố tử tế nhất tháng" tính thêm số biển mới trong tháng — xem 05-SCORING-RULES §3).
> **Trần 3 đề xuất/tuần**: khi ghi `issue_approved`, đếm số event cùng loại của user trong tuần ISO hiện tại; nếu ≥3 thì ghi event với points=0.

### sessions (cookie định danh)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| user_id | FK → users | |
| token_hash | char(64) unique | `SHA-256(session token)` — token gốc 256-bit random chỉ nằm trong cookie `kp_session` (HttpOnly, Secure, SameSite=Lax), KHÔNG lưu bản rõ |
| created_at, last_seen_at, expires_at | timestamptz | TTL 180 ngày, gia hạn khi hoạt động |
| revoked | bool | Thu hồi khi nghi gian lận / user đổi số trên form |
| ip_hash, ua_hash | char(64) | Băm IP + user-agent phục vụ heuristics gian lận (không lưu bản rõ) |

> **Không có bảng OTP.** Định danh = nhập SĐT → server băm → upsert user → cấp session cookie. Chi tiết luồng: 02-FUNCTIONAL-SPEC §8.

### admin_users (tách hẳn khỏi users)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| email | varchar unique | **CHECK server-side: đuôi @fpt.com** (`email ~* '@fpt\.com$'` + regex đầy đủ ở tầng ứng dụng) |
| password_hash | varchar | **Argon2id** (memory-hard); không bao giờ log/trả về |
| totp_secret | varchar nullable | Mã hoá at-rest; null = chưa bật 2FA (khuyến nghị bắt buộc bật ở lần đăng nhập đầu) |
| backup_codes_hash | text[] | 10 mã dự phòng dùng 1 lần (hash) |
| failed_attempts, locked_until | int, timestamptz | Khoá 15 phút sau 5 lần sai |
| is_active | bool | Vô hiệu hoá = revoke mọi session ngay |
| created_at, last_login_at | timestamptz | |

### admin_sessions
| token_hash unique, admin_user_id FK, created_at, expires_at (TTL 8h), revoked, ip_hash | Cookie riêng `kp_admin_session` (HttpOnly, Secure, SameSite=Strict) — tách hoàn toàn khỏi `kp_session` của public |

### notifications (báo tin vui in-web — thay SMS, Q1)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| user_id | FK → users | |
| type | varchar(30) | `sign_installed` · `issue_approved` · `issue_rejected` · `suggestion_approved` · `suggestion_rejected` (4 loại sau thêm 1/8, wording #15 trong `copy.ts`) |
| ref_id | uuid | suggestion hoặc issue liên quan |
| seen | bool default false | Hiện banner khi user quay lại (cookie) đến khi bấm đóng |
| created_at | timestamptz | |

### counters (cache trong RAM tiến trình, 15s)
**Còn 3 chỉ số** (Figma 2/9 · B2 — `src/lib/counters.ts`):

> **8/9 — admin ghi đè được cả 3 con số.** Chiến dịch có biển treo ngoài đời / khu phố tham gia
> mà web chưa kịp có dữ liệu, nên `/admin/noi-dung` cho nhập số hiển thị. Ghi đè lưu trong bảng
> `site_content` dưới 3 khoá `counter_signs_installed` · `counter_neighborhoods_joined` ·
> `counter_suggestions_total` (**không migration** — cùng cơ chế "ô rỗng → xoá hàng → về mặc định"
> như text, chỉ khác mặc định là số đếm thật). Hai đường tách bạch:
> `getCounters()` = số công khai (đã áp ghi đè) · `getRealCounters()` = số đếm thật cho dashboard
> admin. Cả hai dùng chung một lượt truy vấn + cache 15s; PATCH gọi `resetCountersCache()`.

| Khoá | Nhãn hiển thị | Định nghĩa |
|---|---|---|
| `signs_installed` | Biển đã treo | `suggestions.status = 'installed'` |
| `neighborhoods_joined` | Khu phố | `neighborhoods` NOT hidden **AND `deleted_at IS NULL`** |
| `suggestions_total` | Câu đóng góp | `suggestions.status IN (approved, selected, produced, installed)` |

~~`issues_waiting` (góc phố đang chờ) · `contributors` (người đóng góp)~~ → gỡ khỏi giao diện
và khỏi cả truy vấn (18/8 rút còn 3 ô, 2/9 đổi ý nghĩa 2 ô cuối).

## 2. Quan hệ

```
neighborhoods 1—n issues 1—n suggestions 1—n votes
users 1—n issues (proposed_by) · 1—n suggestions (author) · 1—n votes · 1—n score_events
leads (độc lập, optional FK user)
```

## 3. State machines

### Issue
```
pending_review ──admin duyệt──▶ waiting (pin ĐỎ)
       └──admin từ chối──▶ rejected (ẩn)
waiting ──có ≥1 suggestion approved──▶ voting (pin CAM)
voting ──suggestion của issue chuyển installed──▶ signed (pin XANH)
```

### Suggestion
```
submitted ──admin tick đủ 4 ô 4N──▶ approved (hiện công khai, mở bình chọn)
        └──admin từ chối──▶ rejected
approved ──admin chọn (thường là câu nhiều thương nhất)──▶ selected
selected ──đưa sản xuất──▶ produced ──treo thật──▶ installed
```
> ~~`submitted ──auto chấm 4N──▶ (đính score_4n)`~~ — **không có bước tự động nào** (quy tắc cứng 2).
Side-effects khi `installed` (`applyInstalledSideEffects` trong `api/admin/suggestions/[id]/route.ts`):
issue → signed; +30 điểm tác giả; counter +1; tạo bản ghi `notifications` cho tác giả (banner in-web lần quay lại kế tiếp).

### Neighborhood (thêm 7/9)
```
sống ──admin DELETE──▶ deleted_at = now() (+ hidden=true, is_featured=false, nhả slot)
deleted ──PATCH {restore:true}──▶ sống nhưng ẨN (admin kiểm rồi mới bật hiển thị)
```
Khu đã xoá **biến mất cả cụm khỏi web**: trang chủ, tra cứu 4N, IssueBoard, khối biển, popup
khu phố, `/khu-pho/<slug>` (404) và OG image. Điểm / lượt thương / câu nhắc **không bị xoá** —
khôi phục là về nguyên trạng. Mọi truy vấn công khai mới đụng `neighborhoods` **phải** thêm
`deleted_at IS NULL` (danh sách nơi đã thêm: `12` §4.3).

## 4. API (REST, prefix `/api/v1`)

> ⚠️ **Bảng dưới đây là đặc tả gốc (7/2026), đã lệch code.** Danh sách endpoint đúng với
> code hôm nay ở [`13-API-REFERENCE.md`](13-API-REFERENCE.md). Khác biệt lớn nhất:
> `/share/*` không tồn tại (trang share là route Next thường), `/admin/import`,
> `/admin/scores`, `/admin/issues/:id/pin`, `/admin/neighborhoods/:id/map-image`
> **chưa bao giờ/không còn** được triển khai; ngược lại có thêm `/api/v1/notes`,
> `/api/v1/geo`, `/api/v1/ambassadors/{slug}`, `/api/admin/votes`, `/api/admin/site-content`,
> `/api/admin/analytics` và 2 route import riêng.

### Public (không cần auth)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | /counters | 3 bộ đếm (đã áp ghi đè của admin nếu có) |
| GET | /map | Danh sách pins: issues (id, category, status, x, y) + neighborhoods certified |
| GET | /issues?status=&neighborhood= | Danh sách thẻ vấn đề (kèm suggestion_count, top_votes) |
| GET | /issues/:id | Chi tiết + suggestions approved (content, author display_name, votes) |
| GET | /leaderboard?type=ambassador\|neighborhood | Bảng xếp hạng |
| GET | /neighborhoods/:id | Trạng thái chứng nhận 4N |
| GET | /share/dai-su/:slug · /share/bien/:id · /share/khu-pho/:slug | Trang share công khai + OG image động (Q8) |

### Auth (định danh không OTP)
| POST | /auth/identify | body: {phone, display_name?, neighborhood_id?} → server băm SĐT, upsert user, set cookie `kp_session` (HttpOnly, Secure, SameSite=Lax). Response KHÔNG trả lại SĐT/hash. Rate limit: 3 định danh mới/thiết bị+IP/giờ |
| POST | /auth/logout | Thu hồi session hiện tại (revoked=true), xoá cookie |
| GET/PATCH | /me | Hồ sơ: display_name, neighborhood_id (nhận diện qua cookie) |

> Mọi endpoint ghi (POST/PATCH) yêu cầu: (1) cookie session hợp lệ chưa thu hồi, (2) CSRF token (double-submit) vì cookie-based, (3) nếu request chứa SĐT (VD /leads) → server băm và **đối chiếu với phone_hash của session**; lệch → 409 kèm luồng xác nhận chuyển định danh (02 §8.3).

### Resident (JWT)
| POST | /issues | Gửi đề xuất → pending_review |
| POST | /issues/:id/suggestions | Gửi câu nhắc (server chấm 4N lại — client chỉ preview) |
| POST | /suggestions/:id/vote | ~~Toggle thương~~ → (đổi 2/9, Q6) **chỉ thêm phiếu**; 409 nếu tự thương hoặc đã bình chọn |
| POST | /leads | Ghi lead (cả 2 tầng; validate opt_in; tầng 1 dùng SĐT của session, không nhận SĐT mới) |
| GET | /me/notifications · PATCH /me/notifications/:id (seen) | Banner báo tin vui in-web |

### Admin auth
| POST | /admin/auth/login | body: {email, password} → nếu bật TOTP trả bước 2; validate đuôi @fpt.com server-side; rate limit + khoá 5 lần sai |
| POST | /admin/auth/totp | body: {code} → set cookie `kp_admin_session` |
| POST | /admin/auth/logout | Revoke session |

### Admin (cookie kp_admin_session — chi tiết ở 04-ADMIN-SPEC)
| GET | /admin/issues?status=pending_review | Hàng chờ duyệt đề xuất |
| PATCH | /admin/issues/:id | approve/reject + note |
| GET | /admin/suggestions?status=submitted | Hàng chờ duyệt câu |
| PATCH | /admin/suggestions/:id | approve/reject/select/produced/installed |
| GET | /admin/leads (+ export CSV) · PATCH /admin/leads/:id | |
| PATCH | /admin/neighborhoods/:id/certify | Cấp chứng nhận 4N |
| POST | /admin/neighborhoods/:id/map-image | Upload ảnh bản đồ gốc (Q3) |
| PATCH | /admin/issues/:id/pin | Đặt toạ độ pin {pin_x, pin_y} + upload photo_url |
| POST | /admin/import | Bulk import từ Excel template (Q6): multipart file → validate → preview → commit; response báo lỗi theo từng dòng |
| GET | /admin/dashboard | Số liệu tổng |
| GET | /admin/fraud | Danh sách phiếu/tài khoản nghi vấn + hành động shadow-ban |

## 5. Chống gian lận (im lặng)

- 1 SĐT (định danh qua phone_hash) = 1 tài khoản; UNIQUE vote; cấm tự thương (server-side).
- **Bù đắp việc bỏ OTP** (không chứng minh sở hữu số): rate limit tạo định danh theo thiết bị+IP, captcha khi vượt ngưỡng, chặn dải số ảo, trọng số cao hơn cho heuristics cụm tài khoản cùng ip_hash/ua_hash/thời gian.
- Heuristics gắn cờ: cụm tài khoản đăng ký cùng dải thời gian/IP; 1 người nhận thương hàng loạt từ nhóm tài khoản mới; tốc độ vote bất thường.
- Xử lý: set `is_valid=false` trên votes/score_events, hoặc `is_shadow_banned` trên user. **Không thông báo, không hiển thị lý do.** UI của người bị lọc vẫn thấy phiếu của mình bình thường.

---

## 6. Lịch sử thay đổi schema (migration 002 → 011)

| # | File | Ngày/đợt | Nội dung |
|---|---|---|---|
| 002 | `002_dieuchinh_1_8.sql` | 1/8 | Remap **8 chủ đề cũ → 6 chủ đề mới** (đổi CHECK `issues_category_check`); thêm `neighborhoods.hidden` cho khu phố cư dân tự nhập |
| 003 | `003_khu_pho_admin.sql` | 3/8 | Bỏ `neighborhoods.district`; thêm `is_featured`, `certificate_photo_key`; tách bảng **`neighborhood_photos`** (tối đa 4 ảnh) và bỏ `neighborhoods.photo_key` |
| 004 | `004_featured_position.sql` | 3/8 | Thêm `featured_position` (khi đó chỉ CHECK ≥1) |
| 005 | `005_certificate_independent.sql` | 3/8 | Bỏ ràng buộc "ảnh chứng nhận phải kèm `certified_4n`" |
| 006 | `006_suggestion_sign_fields.sql` | 3/8 | `suggestions` thêm `neighborhood_id` + `category` (NOT NULL, có trigger backfill khi INSERT); đổi tên `sign_photo_key` → **`image_key`** |
| 007 | `007_admin_vote_adjust.sql` | — | `votes.user_id` cho phép NULL + thêm `source` (`user`/`admin`) — nền cho màn `/admin/voting` |
| 008 | `008_site_content.sql` | — | Bảng **`site_content`** (key–value ghi đè nội dung trang chủ) |
| 009 | `009_geo_units.sql` | 3/8 | Bảng **`provinces`** (34) + **`wards`** (3.321) theo Quyết định 19/2025/QĐ-TTg |
| 010 | `010_lead_address.sql` | 18/8 | `leads` thêm `province` + `address` + index bộ phận `idx_leads_province WHERE opted_in` |
| 011 | `011_soft_delete_featured_slots.sql` | 7/9 | `neighborhoods.deleted_at` (xoá mềm); đánh số lại `featured_position` 1..10, CHECK 1–10 và **unique index bộ phận** `neighborhoods_featured_position_uniq` (bỏ qua khu đã xoá) |

Quy ước khi thêm migration mới: xem [`12-DATA-DICTIONARY.md`](12-DATA-DICTIONARY.md) §7.
