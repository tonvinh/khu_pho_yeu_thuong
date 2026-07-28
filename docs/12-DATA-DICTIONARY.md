# 12 — Từ điển dữ liệu & state machine

> Nguồn gốc: `db/migrations/001_init.sql`. Đặc tả dữ liệu gốc ở `03-DATA-MODEL.md`.
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

admin_users 1─* admin_sessions        admin_users 1─* audit_logs
month_snapshots (độc lập — chưa dùng trong code)
```

Ràng buộc khoá ngoại là **RESTRICT mặc định** (không CASCADE): không xoá được khu phố còn issue, không xoá được user còn phiếu/điểm. Hệ thống **không có luồng xoá cứng** nào trong code — dữ liệu chỉ được vô hiệu (`is_valid=false`, `revoked=true`, `status='rejected'`).

---

## 2. Bảng dữ liệu cộng đồng

### 2.1 `neighborhoods` — khu phố

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `id` | uuid | PK | |
| `name` | varchar(200) | NOT NULL, **UNIQUE** | Tên hiển thị. UNIQUE là chốt chặn chống trùng khi bulk import |
| `ward` / `district` / `city` | varchar(120) | | Phường / quận · huyện / tỉnh · thành |
| `slug` | varchar(120) | NOT NULL, **UNIQUE** | Dùng cho URL share `/khu-pho/{slug}`; sinh từ tên (bỏ dấu, `đ`→`d`) |
| `map_image_key` | varchar(500) | | Key MinIO ảnh bản đồ **GỐC** — `private/maps/{id}/original.webp`, **chỉ admin** |
| `map_stylized_key` | varchar(500) | | Key bản **cách điệu** — `public/maps/{id}/stylized.webp`, public thấy cái này |
| `certified_4n` | boolean | NOT NULL DEFAULT false | Đã đạt chứng nhận "Khu phố biết thương" |
| `certified_at` | date | | Ngày cấp chứng nhận |
| `photo_key` | varchar(500) | | Ảnh khu phố — `public/neighborhoods/{id}/photo.webp` |
| `created_at` | timestamptz | NOT NULL | |

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
| `category` | varchar(30) | NOT NULL, **CHECK 8 giá trị** | `toc_do`, `trom_cap`, `an_toan_tre_em`, `chieu_sang`, `ve_sinh`, `phong_chay`, `giup_nhau`, `nguoi_gia` — danh mục **đóng** |
| `location_text` | varchar(300) | NOT NULL | Vị trí cụ thể (ngõ/hẻm/ngách) |
| `description` | text | | Mô tả (server cắt còn 1000 ký tự khi nhận) |
| `pin_x` / `pin_y` | real | CHECK 0–100 | Toạ độ **%** trên ảnh bản đồ — độc lập kích thước ảnh |
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
| `review_4n` | jsonb | | `{nhac,nho,nho2,nhe}` — admin tick tay. `nho2` = tiêu chí **Nhỏ** (tên cột tránh trùng `nho` = Nhở) |
| `sign_photo_key` | varchar(500) | | Ảnh biển thật sau khi treo |
| `installed_date` | date | | Ngày treo (admin nhập, mặc định hôm nay) |
| `status` | varchar(20) | NOT NULL, CHECK | `submitted` (mặc định) · `approved` · `rejected` · `selected` · `produced` · `installed` |
| `review_note` | text | | Lý do từ chối (nội bộ) |
| `select_note` | text | | **Bắt buộc** khi chọn câu không cao phiếu nhất |
| `created_at` / `approved_at` / `installed_at` | timestamptz | | |

Index: `idx_suggestions_issue`, `idx_suggestions_status`.

### 2.5 `votes` — lượt thương

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | uuid | PK |
| `suggestion_id` | uuid | NOT NULL, FK |
| `user_id` | uuid | NOT NULL, FK |
| `is_valid` | boolean | NOT NULL DEFAULT true — false khi shadow-ban hoặc admin vô hiệu |
| `created_at` | timestamptz | |
| — | | **UNIQUE (suggestion_id, user_id)** → 1 tài khoản 1 phiếu/câu, ép ở tầng DB |

Index bộ phận: `idx_votes_suggestion ON votes(suggestion_id) WHERE is_valid` — mọi thống kê công khai chỉ đếm phiếu hợp lệ.

Bỏ thương = **xoá hàng** trong `votes` + vô hiệu event điểm tương ứng (không xoá event).

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
| `neighborhood_text` | varchar(300) | | Khu phố người dùng tự gõ (khác `neighborhood_id`) |
| `interests` | text[] | NOT NULL DEFAULT `{}` | `internet`, `internet_tv`, `fpt_play`, `internet_camera` |
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
| `type` | varchar(30) | DEFAULT `'sign_installed'` — hiện chỉ sinh đúng loại này |
| `ref_id` | uuid | id câu nhắc → link share `/bien/{ref_id}` |
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
| `action` | `lead_phone_reveal` (bấm hiện 1 SĐT) · `leads_export_csv` (xuất danh sách) |
| `ref_id` | id lead khi reveal |
| `detail` | jsonb, ví dụ `{count: 37}` khi export |

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
| `issues` | `status IN ('waiting','voting','signed')` |
| `suggestions` | `status IN ('approved','selected','produced','installed')` |
| `votes` | chỉ đếm `is_valid = true` |
| `leads` | **không bao giờ** hiện công khai |

Quy tắc cứng 1 được ép bằng chính các mệnh đề `WHERE` này — nằm rải trong `page.tsx`, `/api/v1/issues`, `/api/v1/issues/[id]`, `/api/v1/map`. Khi thêm truy vấn công khai mới, **phải lặp lại đúng bộ lọc này**.

---

## 5. Truy vấn phái sinh quan trọng

| Số liệu | Định nghĩa thực tế trong code |
|---|---|
| **Điểm một người** | `SUM(points) FROM score_events WHERE user_id=? AND is_valid` |
| **Biển đã treo** (counter 1) | `count(*) FROM suggestions WHERE status='installed'` |
| **Góc phố đang chờ** (counter 2) | `count(*) FROM issues WHERE status IN ('waiting','voting')` |
| **Người đóng góp** (counter 3) | Số user **có ít nhất 1 issue đã duyệt hoặc 1 câu đã duyệt** — người chỉ bấm thương **không** được tính (ASSUMPTION khớp seed 06 §5) |
| **Khu phố tham gia** (counter 4) | `count(*) FROM neighborhoods` |
| **Bảng Đại sứ** | User chưa shadow-ban, điểm > 0, sắp xếp `score DESC, created_at ASC`, LIMIT 10 (UI hiện 5) |
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
