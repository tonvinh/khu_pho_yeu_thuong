# 12 — Từ điển dữ liệu & state machine

> Cập nhật: 8/9/2026 — đồng bộ với code sau các đợt 18/8, 2–4/9, 7/9 (**đã áp migration 002 → 011**).
> Nguồn gốc: `db/migrations/*.sql`. Đặc tả dữ liệu gốc ở `03-DATA-MODEL.md`
> (lịch sử từng migration: `03` §6).
> Mọi kiểu `uuid` mặc định `gen_random_uuid()` (extension `pgcrypto`), mọi `timestamptz` mặc định `now()` trừ khi ghi khác.

## 1. Sơ đồ quan hệ

```
neighborhoods 1─┬─* issues 1─* suggestions 1─* votes *─1 users
                │                    │                      │
                │                    └──────────────────────┤ (author_id)
                └─────────────────────────────* users ──────┤ (neighborhood_id)
                                                            │
users 1─* sessions        users 1─* score_events            │
users 1─* notifications   users 1─0..* leads (user_id)  ────┘

neighborhoods 1─* neighborhood_photos (ON DELETE CASCADE — bảng DUY NHẤT có cascade)
provinces 1─* wards                  (danh mục tra cứu, không FK tới nghiệp vụ)

admin_users 1─* admin_sessions        admin_users 1─* audit_logs
site_content (key–value độc lập)      month_snapshots (độc lập — chưa dùng trong code)
```

Ràng buộc khoá ngoại là **RESTRICT mặc định** (trừ `neighborhood_photos`): không xoá được khu phố còn issue, không xoá được user còn phiếu/điểm. Hệ thống **không có luồng xoá cứng** nào cho dữ liệu nghiệp vụ — dữ liệu chỉ được vô hiệu (`is_valid=false`, `revoked=true`, `status='rejected'`, `deleted_at IS NOT NULL`).

Hai ngoại lệ xoá hàng thật, cả hai đều do admin chủ động: **phiếu `source='admin'`** bị gỡ khi
admin giảm số thương (`/api/admin/votes`) và **ảnh** (`neighborhood_photos`, ảnh chứng nhận) khi
admin thay/xoá ảnh.

---

## 2. Bảng dữ liệu cộng đồng

### 2.1 `neighborhoods` — khu phố

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | uuid | PK | |
| `name` | varchar(200) | NOT NULL, **UNIQUE** | Tên hiển thị. UNIQUE là chốt chặn chống trùng khi bulk import |
| `ward` / `city` | varchar(120) | | Phường·xã / tỉnh·thành, lưu **TÊN chính thức** theo danh mục `wards`/`provinces`. ~~`district`~~ **đã DROP** (migration 003 — địa giới mới 1/7/2025 bỏ cấp quận/huyện) |
| `slug` | varchar(120) | NOT NULL, **UNIQUE** | Dùng cho URL share `/khu-pho/{slug}`; sinh từ tên (bỏ dấu, `đ`→`d`) |
| `map_image_key` | varchar(500) | | Key MinIO ảnh bản đồ **GỐC** — `private/maps/{id}/original.webp`, **chỉ admin**. ⚠️ Trang chủ bỏ bản đồ từ 1/8 ⇒ **không route nào còn ghi/đọc cột này** (chỉ `scripts/seed-images.mjs`) |
| `map_stylized_key` | varchar(500) | | Key bản **cách điệu** — `public/maps/{id}/stylized.webp`. Nay chỉ còn là **ảnh dự phòng** cho slider/popup khi khu chưa có `neighborhood_photos` |
| `certified_4n` | boolean | NOT NULL DEFAULT false | Đã đạt chứng nhận "Khu phố biết thương". **Từ 7/9 admin bật/tắt tự do** — bỏ điều kiện "100% biển đã treo" (quyết định vận hành, có buổi trao biển ngoài đời) |
| `certified_at` | date | | Ngày cấp chứng nhận |
| `certificate_photo_key` | varchar(500) | | Ảnh chứng nhận 4N (migration 003). Migration 005 **bỏ** CHECK "chỉ có khi `certified_4n`" ⇒ upload trước lúc cấp được, thu hồi chứng nhận không xoá ảnh |
| `hidden` | boolean | NOT NULL DEFAULT false | Khu do cư dân **tự nhập** (free text) tạo ra ⇒ `true`; admin duyệt đề xuất đầu tiên của khu đó thì tự `false` (migration 002) |
| `is_featured` | boolean | NOT NULL DEFAULT false | Vào slider "Khu phố tiêu biểu" ở hero (migration 003) |
| `featured_position` | int | CHECK `NULL OR 1..10` + **unique index bộ phận** | **Slot slide hero**, đúng 10 chỗ, không trùng. Chi tiết §2.1b |
| `deleted_at` | timestamptz | | **Xoá mềm** (migration 011). Khác NULL ⇒ khu phố + toàn bộ góc phố/câu nhắc biến mất khỏi web, `/khu-pho/<slug>` trả 404 |
| `created_at` | timestamptz | NOT NULL | |

~~`photo_key`~~ — **đã DROP** ở migration 003; dữ liệu cũ chuyển thành ảnh vị trí #1 trong `neighborhood_photos`.

#### 2.1b `featured_position` — slot slide hero (chốt 7/9)

- Trước 7/9 cột này là "thứ tự hiển thị" tự do, **và slider lại lọc theo `certified_4n`** nên cả
  `is_featured` lẫn vị trí đều vô nghĩa. Nay `NeighborhoodSlider` lấy `is_featured` rồi
  `.slice(0, FEATURED_SLOTS)` (`src/lib/featured.ts`, `FEATURED_SLOTS = 10`); thứ tự do server
  sắp sẵn `ORDER BY featured_position NULLS LAST, name`.
- Index: `CREATE UNIQUE INDEX neighborhoods_featured_position_uniq ON neighborhoods (featured_position)
  WHERE featured_position IS NOT NULL AND deleted_at IS NULL` — khu đã xoá **không giữ chỗ**.
- Xếp trùng slot của khu khác ⇒ server **HOÁN ĐỔI** hai khu, không báo lỗi. Vì partial index không
  DEFERRABLE được, PATCH chạy 3 bước trong 1 transaction: nhả slot của mình → đẩy khu đang giữ
  slot đích sang chỗ vừa nhả (khu chưa có slot thì bị đẩy ra NULL) → nhận slot mới.
- Bỏ cờ `is_featured` ⇒ tự `featured_position = NULL`.

### 2.1c `neighborhood_photos` — ảnh tổng quan khu phố (migration 003)

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | uuid | PK | |
| `neighborhood_id` | uuid | NOT NULL, FK **ON DELETE CASCADE** | |
| `photo_key` | varchar(500) | NOT NULL | Server chuẩn hoá **1280×720 WebP** (`toCover`) nên mọi slot cùng cỡ |
| `position` | int | NOT NULL, CHECK 1–4, **UNIQUE (neighborhood_id, position)** | Trang chủ chỉ lấy **ảnh #1** |

Index: `idx_neighborhood_photos_nb`.

### 2.1d `provinces` / `wards` — danh mục địa lý chính quy (migration 009)

| Bảng | Cột | Ghi chú |
|---|---|---|
| `provinces` | `code` varchar(2) PK · `name` varchar(120) NOT NULL UNIQUE | **34 tỉnh/thành** (Quyết định 19/2025/QĐ-TTg + Công văn 915/CTK-CSCL) |
| `wards` | `code` varchar(5) PK · `province_code` FK · `name` · `division_type` CHECK (`phường`\|`xã`\|`đặc khu`) | **3.321 đơn vị cấp xã** (2.636 xã, 672 phường, 13 đặc khu). Index `wards_province_code_idx` |

Client đọc qua `GET /api/v1/geo` (`?province=<mã|tên>` → wards) để **CHỌN thay vì nhập tay**;
server validate bằng `geoError()` async trong `src/lib/geo.ts` (file tĩnh `vn-geo.ts` đã xoá).

### 2.1e `site_content` — nội dung trang chủ sửa được (migration 008)

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `key` | varchar(50) PK | **Chỉ lưu ghi đè**; key vắng mặt/xoá hàng ⇒ quay về mặc định |
| `value` | text NOT NULL | ≤1000 ký tự (API chặn) |
| `updated_at` | timestamptz | |

Mặc định nằm ở `src/lib/site-content-defaults.ts` (`SITE_CONTENT_DEFAULTS`, phần lớn lấy lại từ
`copy.ts` nên copy gốc vẫn là nguồn chuẩn). `SITE_TEXT_KEYS` sinh **từ** bộ mặc định ⇒ gỡ một khoá
khỏi file là API admin tự bỏ khoá đó, hàng cũ trong bảng chỉ bị lơ đi (không cần migration).
Hiện đúng **13 khoá**; đã gỡ 4 khoá `campaign_*` (4/9) và 4 khoá `sign_promo_*`/`sign_sale_phone`/`sign_hotline` (3/9).

### 2.2 `users` — cư dân (KHÔNG chứa admin)

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | uuid | PK | |
| `phone_hash` | char(64) | NOT NULL, **UNIQUE** | `HMAC-SHA256(SĐT chuẩn hoá +84…, PHONE_PEPPER)` — **khoá tài khoản**, một chiều |
| `phone_encrypted` | bytea | | SĐT mã hoá AES-256-GCM. Chỉ được ghi **khi user tick opt-in lead**; trước đó NULL |
| `phone_purpose` | text[] | NOT NULL DEFAULT `{}` | Mục đích đã đồng ý; hiện chỉ dùng giá trị `'lead'` |
| `display_name` | varchar(120) | NOT NULL | Tên cả xóm hay gọi — dữ liệu công khai duy nhất |
| `share_slug` | varchar(32) | NOT NULL, **UNIQUE** | Slug ngẫu nhiên 10 ký tự cho `/dai-su/{slug}` (không đoán được, không lộ id) |
| `neighborhood_id` | uuid | FK → neighborhoods | Khu phố người dùng chọn |
| `role` | varchar(20) | NOT NULL DEFAULT `'resident'` | **Chưa dùng** — mọi user public đều là cư dân |
| `is_shadow_banned` | boolean | NOT NULL DEFAULT false | Bật = phiếu/điểm mới không hợp lệ, **không báo cho user** |
| `created_at` / `last_login_at` | timestamptz | | `last_login_at` cập nhật mỗi lần định danh |

### 2.3 `issues` — góc xóm / vấn đề

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | uuid | PK | |
| `neighborhood_id` | uuid | NOT NULL, FK | |
| `category` | varchar(30) | NOT NULL, **CHECK 6 giá trị** | `khoe_moi_ngay`, `tre_con_trong_xom`, `van_minh_tu_te`, `giup_do_san_se`, `xom_xanh_sach`, `song_vui_co_ich` — danh mục **đóng**, nguồn `src/lib/taxonomy.ts`. ~~8 mã cũ~~ → migration 002 remap dữ liệu và đổi CHECK |
| `location_text` | varchar(300) | NOT NULL | Vị trí cụ thể (ngõ/hẻm/ngách) |
| `description` | text | | Mô tả (server cắt còn 1000 ký tự khi nhận) |
| `pin_x` / `pin_y` | real | CHECK 0–100 | Toạ độ **%** trên ảnh bản đồ — độc lập kích thước ảnh. ⚠️ Trang chủ bỏ bản đồ từ 1/8: `/api/v1/map` vẫn trả `pins` nhưng **không giao diện nào đặt/hiển thị pin nữa** |
| `photo_key` | varchar(500) | | Ảnh thật của địa điểm — hiện khi bấm pin |
| `status` | varchar(20) | NOT NULL, CHECK | `pending_review` (mặc định) · `waiting` · `voting` · `signed` · `rejected` |
| `proposed_by` | uuid | FK → users | NULL với issue tạo bằng bulk import |
| `review_note` | text | | Lý do từ chối — **nội bộ, không hiển thị công khai** |
| `created_at` / `approved_at` / `signed_at` | timestamptz | | |

Index: `idx_issues_status`, `idx_issues_neighborhood`.

### 2.4 `suggestions` — câu nhắc

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | uuid | PK | Cũng là id trang share `/bien/{id}` |
| `issue_id` | uuid | NOT NULL, FK | |
| `author_id` | uuid | NOT NULL, FK → users | |
| `content` | text | NOT NULL, **CHECK ≤120 ký tự** | Ràng buộc "Nhỏ" được ép ở tầng DB, không chỉ ở client |
| `neighborhood_id` | uuid | NOT NULL, FK | migration 006 — câu **tự đứng được**, không phải lần ngược qua `issues`. Trigger `trg_suggestions_fill_from_issue` (BEFORE INSERT) tự điền từ issue nên mọi câu `INSERT` cũ vẫn hợp lệ |
| `category` | varchar(30) | NOT NULL, CHECK 6 chủ đề | migration 006, cũng do trigger điền |
| `review_4n` | jsonb | | `{nhac,nho,nho2,nhe}` — admin tick tay. `nho2` = tiêu chí **Nhỏ** (tên cột tránh trùng `nho` = Nhở) |
| `image_key` | varchar(500) | | ~~`sign_photo_key`~~ → đổi tên ở migration 006: **1 hình duy nhất** cho mỗi câu, cũng là ảnh biển thật ở `/bien/{id}` |
| `installed_date` | date | | Ngày treo (admin nhập, mặc định hôm nay) |
| `status` | varchar(20) | NOT NULL, CHECK | `submitted` (mặc định) · `approved` · `rejected` · `selected` · `produced` · `installed` |
| `review_note` | text | | Lý do từ chối (nội bộ) |
| `select_note` | text | | **Bắt buộc** khi chọn câu không cao phiếu nhất |
| `created_at` / `approved_at` / `installed_at` | timestamptz | | |

Index: `idx_suggestions_issue`, `idx_suggestions_status`, `idx_suggestions_neighborhood`, `idx_suggestions_category`.

### 2.5 `votes` — lượt thương

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | uuid | PK |
| `suggestion_id` | uuid | NOT NULL, FK |
| `user_id` | uuid | **NULLABLE** từ migration 007 — NULL chỉ hợp lệ khi `source='admin'` (CHECK `votes_user_id_required`) |
| `source` | varchar(10) | NOT NULL DEFAULT `'user'`, CHECK (`user`,`admin`) — migration 007 |
| `is_valid` | boolean | NOT NULL DEFAULT true — false khi shadow-ban hoặc admin vô hiệu |
| `created_at` | timestamptz | |
| — | | **UNIQUE (suggestion_id, user_id)** → 1 tài khoản 1 phiếu/câu, ép ở tầng DB. NULL ≠ NULL trong Postgres nên **không** chặn nhiều phiếu admin trên cùng một câu |

Index bộ phận: `idx_votes_suggestion ON votes(suggestion_id) WHERE is_valid` — mọi thống kê công khai chỉ đếm phiếu hợp lệ.

**Bình chọn là CHỐT** (quyết định Q6, 2/9): ~~bỏ thương = xoá hàng trong `votes` + vô hiệu event điểm~~
→ cư dân **không rút phiếu được nữa**, cả hai route vote trả **409 `ALREADY_VOTED`**.

Phiếu admin (`source='admin'`, `user_id NULL`) do màn `/admin/voting` sinh ra — xem §5 và
`13` §3.7. Giảm số thương thì **xoá hẳn** phiếu admin trước, hết mới vô hiệu (`is_valid=false`)
phiếu cư dân mới nhất, để trạng thái "đã bình chọn" của người bấm không đổi.

### 2.6 `score_events` — sổ cái điểm (append-only)

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | uuid | PK | |
| `user_id` | uuid | NOT NULL, FK | Người **nhận** điểm |
| `type` | varchar(30) | NOT NULL, CHECK | `issue_approved` (+2) · `suggestion_approved` (+5) · `vote_received` (+1) · `sign_installed` (+30) |
| `points` | int | NOT NULL | Ghi giá trị **tại thời điểm phát sinh**; = 0 khi vượt trần 3 đề xuất/tuần |
| `ref_id` | uuid | | Trỏ tới issue hoặc suggestion liên quan |
| `is_valid` | boolean | NOT NULL DEFAULT true | false = bị vô hiệu (bỏ thương, shadow-ban, admin xử lý gian lận) |
| `created_at` | timestamptz | | Dùng để tính trần theo tuần ISO |

Index: `idx_score_events_user … WHERE is_valid`, `idx_score_events_ref`.

**Bất biến:** không UPDATE `points`, không DELETE. Sửa sai = ghi event mới hoặc đặt `is_valid=false`. Tổng điểm luôn tính lại bằng `SUM(points) WHERE is_valid` — **không có cột tổng cứng ở đâu cả**.

### 2.7 `leads` — người đồng ý nhận tư vấn

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | uuid | PK | |
| `name` | varchar(200) | | Tên tự khai |
| `phone_encrypted` | bytea | NOT NULL | AES-256-GCM: `iv(12) ‖ tag(16) ‖ ciphertext` — **không lưu bản rõ** |
| `phone_masked` | varchar(20) | NOT NULL | Dạng `090***567` để admin nhìn mặc định |
| `phone_hash` | char(64) | NOT NULL | Đối chiếu với `users.phone_hash` (không UNIQUE — cho phép nhiều lead cùng số) |
| `neighborhood_text` | varchar(300) | | Khu phố người dùng tự gõ. Khối ưu đãi 18/8 không còn ô này (dùng `province` + `address`); popup ưu đãi nhanh `LeadPromptModal` vẫn ghi |
| `province` | varchar(120) | | migration 010 — chọn từ danh mục 34 tỉnh, **bắt buộc** ở khối ưu đãi. Index bộ phận `idx_leads_province … WHERE opted_in` (sale chia vùng) |
| `address` | varchar(300) | | migration 010 |
| `interests` | text[] | NOT NULL DEFAULT `{}` | **6 mã** (`src/lib/taxonomy.ts` → `INTERESTS`): `internet`, `camera`, `fpt_play`, `internet_tv`, `internet_camera`, `internet_tv_camera`. Quyết định Q3 (2/9): giữ nguyên 4 mã cũ, chỉ đổi **nhãn** (`fpt_play` → "Truyền hình FPT Play") và thêm 2 mã ⇒ **không migration**, lead cũ hiện theo nhãn mới |
| `source` | varchar(20) | NOT NULL, CHECK | `soft_drawer` (tầng 1) · `active_section` (tầng 2) |
| `opted_in` | boolean | NOT NULL DEFAULT false | **Code chỉ INSERT khi = true**; API admin chỉ đọc `WHERE opted_in` |
| `user_id` | uuid | FK → users | |
| `status` | varchar(20) | NOT NULL, CHECK | `new` · `contacted` · `converted` · `closed` |
| `note` | text | | Ghi chú sale (≤1000 ký tự) |
| `created_at` | timestamptz | | |

### 2.8 `notifications` — báo tin vui in-web (thay SMS)

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | NOT NULL, FK |
| `type` | varchar(30) | DEFAULT `'sign_installed'`. **5 loại đang sinh**: `sign_installed` · `issue_approved` · `issue_rejected` · `suggestion_approved` · `suggestion_rejected` (4 loại sau thêm 1/8 — wording #15 trong `copy.ts`) |
| `ref_id` | uuid | id câu nhắc → link share `/bien/{ref_id}`; hoặc id đề xuất với 2 loại `issue_*` |
| `payload` | jsonb | `{location_text, content}` |
| `seen` | boolean | NOT NULL DEFAULT false |
| `created_at` | timestamptz | |

Index bộ phận: `idx_notifications_user_unseen … WHERE NOT seen`.

---

## 3. Bảng phiên & quản trị

### 3.1 `sessions` — phiên cư dân

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `token_hash` | char(64) NOT NULL UNIQUE | `SHA-256(token)`; **bản rõ chỉ tồn tại trong cookie `kp_session`** |
| `expires_at` | timestamptz NOT NULL | TTL 180 ngày, **gia hạn trượt** mỗi lần truy cập |
| `last_seen_at` | timestamptz | Cập nhật fire-and-forget để không làm chậm request |
| `revoked` | boolean | Đăng xuất đặt true (không xoá hàng) |
| `ip_hash` / `ua_hash` | char(64) | `SHA-256("ip:"+ip)` / `SHA-256("ua:"+ua)` — dùng cho heuristics gian lận, **không lưu IP/UA thô** |
| `phone_encrypted` | bytea | ⚠️ **ASSUMPTION đã báo PM** — xem §6 |

### 3.2 `admin_users`

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `email` | varchar(200) NOT NULL UNIQUE, **CHECK `~* '@fpt\.com$'`** | Ràng buộc đuôi email ép ở **cả DB lẫn API lẫn script tạo admin** |
| `password_hash` | varchar(300) NOT NULL | Argon2id (m=19456, t=2, p=1) |
| `totp_secret` | varchar(300) | NULL = chưa bật 2FA |
| `backup_codes_hash` | text[] | **Chưa dùng** — dành cho mã dự phòng 2FA sau này |
| `failed_attempts` | int | Đếm sai liên tiếp |
| `locked_until` | timestamptz | Đặt `now() + 15 phút` khi chạm 5 lần sai |
| `is_active` | boolean | false = vô hiệu tài khoản |
| `created_at` / `last_login_at` | timestamptz | |

### 3.3 `admin_sessions`

TTL **8 giờ, KHÔNG gia hạn**; `token_hash` SHA-256; có `revoked`, `ip_hash`. Cookie `kp_admin_session` dùng `SameSite=Strict`.

### 3.4 `audit_logs` — nhật ký chạm dữ liệu cá nhân (PDPD)

| Cột | Ý nghĩa |
|---|---|
| `admin_user_id` | Ai thao tác |
| `action` | `lead_phone_reveal` (bấm hiện 1 SĐT) · `leads_export_csv` (xuất danh sách) · `votes_adjust` (admin sửa số thương) · `issue_approve` / `issue_reject` (duyệt đề xuất) · `site_content_update` (sửa nội dung trang chủ) |
| `ref_id` | id lead khi reveal · id câu/người khi `votes_adjust` · id đề xuất khi duyệt |
| `detail` | jsonb — `{count, province}` khi export · `{from, to}` khi `votes_adjust` · `{location_text, note}` khi duyệt đề xuất · `{keys:[…]}` khi sửa nội dung |

Hiện **chỉ ghi, chưa có màn hình đọc** — truy vấn trực tiếp bằng psql khi cần đối soát.

### 3.5 `month_snapshots`

Bảng chốt kỳ "Khu phố tử tế nhất tháng" (`month` dạng `'2026-09'`, `data` jsonb). **Đã tạo schema nhưng code chưa ghi/đọc** — bảng xếp hạng hiện tính động theo tháng hiện tại.

### 3.6 `schema_migrations`

Do `scripts/migrate.mjs` tạo: `name text PRIMARY KEY, applied_at timestamptz`. Mỗi file `.sql` chạy trong 1 transaction; đã ghi tên thì lần sau bỏ qua ⇒ chạy lại vô hại.

---

## 4. State machine

### 4.1 Issue

```
              admin duyệt (+2đ cho proposed_by)
pending_review ──────────────────► waiting ──────────────────► voting
      │                                 (câu nhắc ĐẦU TIÊN được duyệt 4N)
      │ admin từ chối (review_note)                              │
      ▼                                                          │ câu được chọn treo xong
   rejected                                                      ▼
                                                              signed
```

- `waiting` và `voting` **đều nhận câu nhắc mới** (API kiểm `status IN ('waiting','voting')`).
- Chuyển `waiting → voting` xảy ra **tự động trong transaction duyệt câu nhắc**, không có nút riêng.
- `signed` được đặt bởi `applyInstalledSideEffects()` khi câu chuyển sang `installed`.
- Issue tạo bằng **bulk import** vào thẳng `waiting` (admin nhập ⇒ coi như đã duyệt), `approved_at = now()`, không sinh điểm.

### 4.1b Neighborhood (xoá mềm — migration 011, chốt 7/9)

```
  sống ──DELETE /api/admin/neighborhoods/{id}──▶ deleted_at = now()
                                                 (+ hidden=true, is_featured=false, slot=NULL)
  deleted ──PATCH {restore:true}──▶ sống nhưng ẨN (hidden=true) — admin kiểm rồi mới bật
```

- Khu đã xoá **không sửa được**: PATCH thường và `/certify` trả **409** "khôi phục trước khi sửa".
- Bảng admin có tab **🗑 Đã xoá**; `GET /api/admin/neighborhoods` trả cả khu đã xoá (kèm `deleted_at`),
  client lọc.
- `resolveNeighborhoodId` (`src/lib/neighborhoods.ts`): nhánh **theo id** lọc `deleted_at IS NULL`;
  nhánh **theo tên** thì KHÔNG — `name` là UNIQUE nên bỏ qua khu đã xoá sẽ làm INSERT của cư dân vỡ.
  Import file báo riêng "trùng tên với khu phố ĐÃ XOÁ" để admin đi khôi phục.

### 4.2 Suggestion

```
             tick đủ 4N (+5đ)          chọn (cần lý do nếu không cao phiếu nhất)
submitted ──────────────────► approved ──────────────────► selected
    │                             │                            │ đưa sản xuất
    │ từ chối                     │ từ chối                    ▼
    ▼                             ▼                        produced
rejected ◄────────────────────────┘                            │ xác nhận đã treo (+30đ)
                                                               ▼
                                                           installed
```

Bảng chuyển trạng thái hợp lệ (`TRANSITIONS` trong `api/admin/suggestions/[id]/route.ts`):

| Action | Chỉ từ trạng thái | Hiệu ứng phụ |
|---|---|---|
| `approve` | `submitted` | Cần `review_4n` đủ 4 ô, ghi `approved_at`, +5đ, issue `waiting → voting` |
| `reject` | `submitted`, `approved` | Ghi `review_note` |
| `select` | `approved` | Cần `note` nếu không phải câu cao phiếu nhất → `select_note` |
| `produced` | `selected` | — |
| `installed` | `produced` | Ghi `installed_at`/`installed_date`, issue → `signed`, +30đ, tạo notification |

Sai trạng thái ⇒ **409**, không âm thầm bỏ qua.

### 4.3 Điều gì hiện công khai

| Bảng | Điều kiện hiện công khai |
|---|---|
| `neighborhoods` | **`deleted_at IS NULL`** (thêm 7/9) — và `NOT hidden` với danh sách khu phố |
| `issues` | `status IN ('waiting','voting','signed')` **+ khu phố chưa xoá** |
| `suggestions` | `status IN ('approved','selected','produced','installed')` **+ khu phố chưa xoá** |
| `votes` | chỉ đếm `is_valid = true` |
| `leads` | **không bao giờ** hiện công khai |

Quy tắc cứng 1 được ép bằng chính các mệnh đề `WHERE` này. **Khi thêm truy vấn công khai mới,
phải lặp lại đúng bộ lọc này** — kể cả `deleted_at IS NULL`.

Nơi bộ lọc đang nằm (đã rà 7/9): `src/app/page.tsx` (4 truy vấn) · `/api/v1/map` ·
`/api/v1/issues` (+ `[id]`) · `/api/v1/me` · `/api/v1/auth/identify` ·
`src/lib/{notes,counters,neighborhood,leaderboard,ambassador}.ts` ·
`src/app/khu-pho/[slug]/opengraph-image.tsx`.

---

## 5. Truy vấn phái sinh quan trọng

| Số liệu | Định nghĩa thực tế trong code |
|---|---|
| **Điểm một người** | `SUM(points) FROM score_events WHERE user_id=? AND is_valid` |
| **Biển đã treo** (counter 1) | `count(*) FROM suggestions WHERE status='installed'` |
| **Khu phố** (counter 2) | `count(*) FROM neighborhoods WHERE NOT hidden AND deleted_at IS NULL` |
| **Câu đóng góp** (counter 3) | `count(*) FROM suggestions WHERE status IN ('approved','selected','produced','installed')` |
| ~~Góc phố đang chờ · Người đóng góp · Khu phố tham gia~~ | Ba chỉ số cũ **đã gỡ** khỏi giao diện lẫn truy vấn (18/8 rút còn 3 ô, 2/9 đổi ý nghĩa 2 ô cuối) |
| **Bảng cây bút** (`getAmbassadors`) | User chưa shadow-ban, điểm > 0, sắp xếp `score DESC, created_at ASC`, LIMIT 10. Trả kèm `suggestions_count`, `votes_received`, `week_points`, `top_quote` |
| **Lời nhắc chờ bình chọn** (`getVotingNotes`, tab 2) | Câu `status='approved'` của góc phố `waiting`/`voting`, khu chưa xoá; xếp **chưa-bình-chọn trước → nhiều thương → mới nhất**; LIMIT 50 (UI cắt 5) |
| **Khu phố tử tế nhất tháng** | `SUM(points trong tháng của cư dân khu đó) + số biển mới treo trong tháng`, sắp xếp giảm dần, LIMIT 1 |
| **Tiến độ chứng nhận** | `signed_issues / total_issues` với `total = issues status IN (waiting,voting,signed)` |
| **`top_quote` của issue** | Câu đã duyệt có nhiều phiếu hợp lệ nhất, hoà thì câu tạo trước thắng |

---

## 6. ASSUMPTION quan trọng: `sessions.phone_encrypted`

Đặc tả yêu cầu: lead tầng 1 (tick opt-in trong drawer viết câu) **không được hỏi lại SĐT**. Nhưng `users.phone_hash` là hàm một chiều, không khôi phục được số.

Giải pháp đã triển khai (ghi chú ngay trong `001_init.sql`, đã báo PM):

- Khi định danh, SĐT chuẩn hoá được **mã hoá AES-256-GCM và gắn vào bản ghi `sessions`** của phiên đó.
- Giá trị này **chỉ nằm server-side**, không bao giờ trả về client, không nằm trong cookie.
- Nó **chỉ được giải mã đúng một chỗ**: khi user tick opt-in lúc gửi câu nhắc → tạo lead + ghi `users.phone_encrypted`.
- Nếu user không bao giờ opt-in: `users.phone_encrypted` vẫn NULL, và bản mã trong `sessions` mất hiệu lực khi phiên hết hạn/bị thu hồi.

Đánh đổi: SĐT mã hoá tồn tại tối đa bằng vòng đời phiên (180 ngày trượt) kể cả khi người dùng chưa đồng ý liên hệ. Phương án thay thế (hỏi lại SĐT khi tick) đã bị loại vì mâu thuẫn đặc tả 02 §7.1.

---

## 7. Quy ước khi đổi schema

1. **Không sửa `001_init.sql`** khi hệ thống đã chạy production — thêm file mới `002_*.sql`, `003_*.sql`… (runner sắp theo tên).
2. Mỗi file phải chạy được trọn vẹn trong 1 transaction; tránh lệnh không hỗ trợ transaction trong Postgres.
3. Viết idempotent khi có thể (`IF NOT EXISTS`) để chạy lại an toàn sau khi sửa lỗi giữa chừng.
4. Không thêm cột lưu **SĐT bản rõ**, không thêm cột "tổng điểm" (phá nguyên tắc sổ cái).
5. Thêm trạng thái mới ⇒ cập nhật đồng thời: CHECK constraint, `TRANSITIONS`, bộ lọc "hiện công khai", `ISSUE_STATUS_LABEL`, và tài liệu này.
6. Chạy `pnpm migrate` ở dev, rồi `docker compose … exec -T web node scripts/migrate.mjs` ở production (bước riêng, không tự chạy khi container start).
