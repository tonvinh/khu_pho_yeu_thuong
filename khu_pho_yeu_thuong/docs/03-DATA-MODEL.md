# Mô hình dữ liệu & API — "Khu Phố Của Tôi"
Phiên bản 1.0

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
| name | varchar | "Phường Bàn Cờ", "Hẻm chợ Xóm Mới" |
| ward, district, city | varchar | |
| slug | varchar unique | URL share công khai `/khu-pho/{slug}` |
| map_image_url | varchar | Ảnh bản đồ gốc do admin upload (Q3) — chỉ admin thấy; public thấy bản cách điệu |
| certified_4n | bool | Chứng nhận "Khu phố biết thương" |
| certified_at | date | Hiển thị "Hoàn thành 09/2026" |
| photo_url | varchar | Ảnh chứng nhận |

### issues (vấn đề / điểm nóng)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| neighborhood_id | FK | |
| category | enum: `toc_do, trom_cap, an_toan_tre_em, chieu_sang, ve_sinh, phong_chay, giup_nhau, nguoi_gia` | |
| location_text | varchar | "Hẻm 42 Lê Lợi" |
| description | text | Mô tả ngắn, không đích danh |
| pin_x, pin_y | float | Toạ độ % (0–100) trên ảnh bản đồ khu phố — admin click để đặt |
| photo_url | varchar nullable | Ảnh thật của địa điểm — hiển thị khi bấm pin (Q3) |
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
| content | text | Nội dung câu nhắc |
| review_4n | jsonb | `{nhac, nho, nho2, nhe: bool}` — checklist do **admin tick thủ công khi duyệt** (Q2: không có chấm tự động); duyệt hiển thị yêu cầu đủ 4 ô |
| sign_photo_url | varchar nullable | Ảnh biển thật sau khi treo (admin upload ở bước installed) |
| status | enum: `submitted, approved, rejected, selected, produced, installed` | |
| review_note | text nullable | |
| created_at, approved_at, installed_at | timestamptz | |

### votes (lượt thương)
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| suggestion_id | FK | |
| user_id | FK | |
| created_at | timestamptz | |
| is_valid | bool default true | Đặt false khi hệ thống lọc phiếu bất thường (lặng lẽ) |
| UNIQUE(suggestion_id, user_id) | | 1 người 1 phiếu/câu |
| CHECK: user_id ≠ suggestion.author_id | Enforce ở tầng ứng dụng | Không tự thương |

### leads
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| name | varchar nullable | Tầng 1 có thể không có tên |
| phone | varchar | |
| neighborhood_text | varchar nullable | |
| interests | text[] | `internet, internet_tv, fpt_play, internet_camera` |
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
| type | enum: `sign_installed` | Mở rộng sau |
| ref_id | uuid | suggestion liên quan |
| seen | bool default false | Hiện banner khi user quay lại (cookie) đến khi bấm đóng |
| created_at | timestamptz | |

### counters (materialized/cached)
`signs_installed, issues_waiting, contributors, neighborhoods_joined` — tính từ dữ liệu gốc, cache 15s.

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
submitted ──auto chấm 4N──▶ (đính score_4n)
submitted ──admin duyệt──▶ approved (hiện công khai, mở bình chọn)
        └──admin từ chối──▶ rejected
approved ──admin chọn (thường là câu nhiều thương nhất)──▶ selected
selected ──đưa sản xuất──▶ produced ──treo thật──▶ installed
```
Side-effects khi `installed`: issue → signed; +30 điểm tác giả; counter +1; tạo bản ghi `notifications` cho tác giả (banner in-web lần quay lại kế tiếp).

## 4. API (REST, prefix `/api/v1`)

### Public (không cần auth)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | /counters | 4 bộ đếm |
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
| POST | /suggestions/:id/vote | Toggle thương; 409 nếu tự thương |
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
