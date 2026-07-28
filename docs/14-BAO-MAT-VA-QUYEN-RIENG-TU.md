# 14 — Bảo mật & quyền riêng tư

> Đây là tài liệu **bắt buộc đọc trước khi sửa bất cứ thứ gì chạm số điện thoại, phiên đăng nhập hoặc quyền admin.**
> Yêu cầu gốc: `07-NFR-TECH.md` §2.1 và quy tắc cứng 3, 3b, 7 trong `CLAUDE.md`.

## 1. Nguyên tắc nền

1. **Số điện thoại gốc không bao giờ** xuất hiện ở: cookie, localStorage, URL, response API công khai, log ứng dụng, hay bất kỳ cột DB dạng plaintext.
2. **Hai khoá, hai mục đích, tách biệt hoàn toàn:**
   - `PHONE_PEPPER` → HMAC-SHA256 → **định danh** (một chiều, không khôi phục được).
   - `PHONE_AES_KEY` → AES-256-GCM → **liên hệ** (hai chiều, chỉ khi người dùng đồng ý).
   Lộ một khoá không kéo theo khoá kia. Không bao giờ dùng chung một khoá cho hai việc.
3. **Không có OTP, không có SMS** trong toàn hệ thống (quyết định Q1). Bù lại bằng: rate limit tạo định danh, chặn dải số ảo, phát hiện gian lận và xử lý im lặng.
4. **Mọi ràng buộc kiểm ở server.** UI chỉ là trải nghiệm; chốt chặn thật nằm ở API + CHECK constraint trong DB.
5. **Hệ định danh cư dân và hệ đăng nhập admin tách rời tuyệt đối** — khác bảng, khác cookie, khác cơ chế xác thực, khác vòng đời phiên.

## 2. Vòng đời số điện thoại

```
Người dùng nhập "090 123 4567"
        │
        ▼ normalizePhone()  — bỏ khoảng trắng/dấu chấm/gạch, +84|84|0 → chuẩn "+84901234567"
        │   · sai định dạng, sai đầu số VN (03/05/07/08/09) → từ chối
        │   · looksFake(): 6+ chữ số giống nhau liên tiếp ở đuôi → từ chối
        │
        ├──► phoneHash() = HMAC-SHA256(số, PHONE_PEPPER)  ──► users.phone_hash  (UNIQUE)
        │        khoá tài khoản · một chiều · không thể suy ngược
        │
        └──► encryptPhone() = AES-256-GCM, iv(12)‖tag(16)‖ciphertext
                 │
                 ├─ luôn: gắn vào bản ghi sessions của phiên (server-side, xem 12 §6)
                 └─ CHỈ khi opt-in: leads.phone_encrypted + users.phone_encrypted
                                     + leads.phone_masked ("090***567")
```

Giải mã (`decryptPhone`) chỉ được gọi ở **đúng ba nơi**:

| Nơi | Mục đích | Audit |
|---|---|---|
| `POST /api/v1/issues/{id}/suggestions` | Tạo lead tầng 1 khi user tick opt-in (không hỏi lại số) | — (chính người dùng vừa đồng ý) |
| `GET /api/admin/leads/{id}` | Admin bấm hiện 1 SĐT để gọi | ✅ `lead_phone_reveal` |
| `GET /api/admin/leads?format=csv` | Xuất danh sách cho đội sale | ✅ `leads_export_csv` + số lượng bản ghi |

Nếu cần thêm chỗ giải mã mới ⇒ **bắt buộc kèm audit log**, và cân nhắc có thực sự cần bản rõ không.

**Che & khử SĐT khi hiển thị/ghi log:**

- `maskPhone("+84901234567")` → `090***567` — dạng mặc định trên màn admin.
- `redactPhonesInText()` thay mọi chuỗi giống SĐT bằng `0*********` trước khi ghi log.
  ⚠️ Hàm đã có và được test nhưng **chưa được gắn vào một logger tập trung** — xem [`20`](20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md) §3. Khi thêm log mới có nội dung người dùng nhập, hãy chủ động gọi nó.

## 3. Phiên đăng nhập

| | Cư dân | Admin |
|---|---|---|
| Cookie | `kp_session` | `kp_admin_session` |
| Thuộc tính | HttpOnly, Secure (prod), **SameSite=Lax**, Path=/ | HttpOnly, Secure (prod), **SameSite=Strict**, Path=/ |
| TTL | 180 ngày, **gia hạn trượt** mỗi lần truy cập | **8 giờ, không gia hạn** |
| Token | 256-bit ngẫu nhiên (`randomBytes(32)`, base64url) | như trên |
| Lưu trong DB | **chỉ `SHA-256(token)`** (`sessions.token_hash` UNIQUE) | `admin_sessions.token_hash` |
| Thu hồi | `revoked = true` khi logout | như trên |
| Dấu vết | `ip_hash`, `ua_hash` (SHA-256 có prefix, không lưu IP/UA thô) | `ip_hash` |

Vì DB chỉ giữ hash: rò rỉ bản dump DB **không** cho phép giả mạo phiên. Ngược lại, trộm được cookie thì chiếm được phiên — nên `Secure` + HSTS + CSP là bắt buộc ở production.

SameSite=Lax cho cư dân là chủ ý: cho phép người dùng bấm link share từ Facebook/Zalo mà vẫn giữ phiên. Admin dùng Strict vì không có nhu cầu điều hướng chéo site.

## 4. CSRF

Vì xác thực dựa trên cookie, mọi request ghi đều cần double-submit token:

- Cookie `kp_csrf` (**không HttpOnly** — client cần đọc được), Secure ở prod, SameSite=Lax, TTL 24h.
- Header `x-csrf-token` phải khớp cookie, so sánh bằng `timingSafeEqual` (chống timing).
- Token 192-bit ngẫu nhiên; **không phải bí mật phiên** — giá trị của nó là kẻ tấn công ở site khác không đọc được cookie để đặt header.

Guard: `requireUserWrite` kiểm CSRF trước cả session; `requireAdmin` kiểm CSRF với mọi method ≠ GET.

## 5. Đăng nhập admin

Quy tắc cứng 7 được ép ở **ba tầng**:

1. **DB**: `admin_users.email CHECK (email ~* '@fpt\.com$')`.
2. **API**: regex `^[a-zA-Z0-9._%+-]+@fpt\.com$` trước khi tra DB.
3. **Script tạo tài khoản**: `create-admin.mjs` chặn email sai đuôi và mật khẩu < 12 ký tự.

Biện pháp phòng thủ khác:

| Biện pháp | Chi tiết |
|---|---|
| Hash mật khẩu | Argon2id, memoryCost 19456 KiB, timeCost 2, parallelism 1 |
| Không lộ email tồn tại | Mọi thất bại đều trả cùng câu `Email hoặc mật khẩu không đúng` |
| Chống timing attack | Không tìm thấy email vẫn verify với hash giả trước khi trả lỗi |
| Khoá tài khoản | 5 lần sai liên tiếp → `locked_until = now() + 15 phút` → HTTP **423** |
| Rate limit theo IP | 20 lần thử / 15 phút |
| 2FA TOTP | Tuỳ chọn từng tài khoản (`--totp` khi tạo). Bước 2 dùng token tạm 5 phút, dùng một lần, lưu in-memory |
| Không tự đăng ký | Không có form đăng ký. Tài khoản chỉ tạo bằng CLI `pnpm create-admin` |
| Chặn index | `robots.ts` disallow `/admin`, `/api`; header `X-Robots-Tag: noindex, nofollow` cho `/admin/*` |

⚠️ `middleware.ts` chỉ kiểm **sự tồn tại** của cookie để chuyển hướng UI — đó là trải nghiệm, không phải bảo mật. Bảo mật thật nằm ở `requireAdmin()` trong từng API (tra phiên trong DB + kiểm `is_active`).

## 6. Chống lạm dụng (không có OTP)

| Rủi ro | Biện pháp đã có |
|---|---|
| Tạo hàng loạt tài khoản ảo | Rate limit 3 định danh mới / (IP+UA) / giờ · chặn dải số ảo `looksFake` · phát hiện cụm cùng IP |
| Cày phiếu | UNIQUE (suggestion_id, user_id) · cấm tự thương (409) · cảnh báo ≥20 phiếu/giờ · shadow-ban |
| Spam đề xuất/câu nhắc | 30 hành động ghi / user / giờ · trần 3 đề xuất tính điểm mỗi tuần ISO · mọi nội dung phải qua duyệt |
| Nội dung xấu lên biển | Duyệt 2 tầng (đề xuất + 4N) · không có đường nào công khai nội dung chưa duyệt |
| Chiếm tài khoản bằng cách đoán SĐT | Chấp nhận có chủ đích (không OTP) — bù bằng việc **không có dữ liệu nhạy cảm nào lộ ra**: đăng nhập bằng SĐT người khác chỉ thấy tên hiển thị và điểm, vốn đã công khai |
| Ghi lead chéo tài khoản | Server đối chiếu `phone_hash` nhập vào với định danh cookie; lệch → 409 và bắt xác nhận chuyển định danh |

**Xử lý gian lận luôn im lặng**: người bị shadow-ban thấy UI y hệt bình thường, phiếu vẫn "ghi nhận" nhưng `is_valid=false` và không sinh điểm. Không thông báo, không đổi màu, không chặn thao tác — để kẻ gian không biết mà tìm cách né.

## 7. Quản lý khoá & secret

| Biến | Sinh bằng | Đặc tính |
|---|---|---|
| `PHONE_PEPPER` | `openssl rand -hex 32` | ⚠️ **KHÔNG XOAY ĐƯỢC.** Đổi pepper = mọi `phone_hash` cũ không còn khớp = **toàn bộ cư dân mất tài khoản, điểm, phiếu** |
| `PHONE_AES_KEY` | `openssl rand -base64 32` (đúng 32 byte) | Xoay được nhưng phải viết migration giải mã bằng khoá cũ + mã hoá lại bằng khoá mới (**chưa có script**) |
| `POSTGRES_PASSWORD` | ngẫu nhiên mạnh | Xoay được (đổi env + recreate container) |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | ngẫu nhiên mạnh | Xoay được |

Quy tắc vận hành:

- `.env` **không bao giờ commit** (`.gitignore` đã chặn; chỉ commit `.env.example`).
- Backup `PHONE_PEPPER` và `PHONE_AES_KEY` vào nơi an toàn **ngay khi tạo**, tách khỏi backup DB.
- CI/CD có chốt chặn cố ý: workflow **dừng deploy** nếu `/opt/khu_pho/.env` thiếu hoặc `PHONE_PEPPER` rỗng — để container không bao giờ khởi động với pepper mới sinh.
- Ở production, thiếu biến bắt buộc thì app **ném lỗi khi khởi động** (`env.ts`), không âm thầm dùng giá trị dev.
- Giá trị fallback dev (`dev-only-pepper-khong-dung-cho-production`) chỉ hoạt động khi `NODE_ENV !== production`.

## 8. Tuân thủ PDPD (Nghị định 13/2023/NĐ-CP)

| Yêu cầu | Cách hệ thống đáp ứng |
|---|---|
| **Đồng ý rõ ràng, có thể từ chối** | Checkbox opt-in **mặc định không tick**; API từ chối ghi lead nếu `opted_in ≠ true`; văn bản đồng ý nêu rõ mục đích (`COPY.optInCheckbox`) |
| **Đúng mục đích** | SĐT dùng cho định danh (băm) tách khỏi liên hệ (mã hoá). `phone_purpose` ghi nhận mục đích đã đồng ý |
| **Tối thiểu hoá dữ liệu** | Không thu thập địa chỉ, ngày sinh, email của cư dân. Không lưu IP/UA thô — chỉ hash |
| **Minh bạch** | Trang công khai `/chinh-sach-du-lieu` giải thích rõ băm một chiều vs mã hoá, và quyền của người dùng |
| **Nhật ký truy cập dữ liệu cá nhân** | `audit_logs` ghi mọi lần admin hiện SĐT hoặc export CSV |
| **Quyền xoá** | Chính sách công bố: yêu cầu qua hotline **1900 6600**; khi xoá → xoá SĐT mã hoá + thu hồi phiên, giữ điểm/câu nhắc ở dạng ẩn danh để không phá kết quả bình chọn của cả xóm |
| **Bảo mật khi truyền/lưu** | TLS bắt buộc; AES-256-GCM cho dữ liệu liên hệ; DB/MinIO không mở ra internet |

⚠️ **Khoảng trống cần biết:** quy trình xoá theo yêu cầu hiện là **thủ công qua psql**, chưa có nút trên giao diện admin. Xem [`20`](20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md) §3.

## 9. Bảo mật ảnh

| Loại ảnh | Prefix | Ai xem được |
|---|---|---|
| Bản đồ **gốc** | `private/maps/{nbId}/original.webp` | **Chỉ admin**, qua `GET /api/admin/neighborhoods/{id}/map-image` (`Cache-Control: private, no-store`) |
| Bản đồ cách điệu | `public/maps/{nbId}/stylized.webp` | Công khai |
| Ảnh địa điểm / biển / khu phố | `public/…` | Công khai |

`/api/img/[...key]` **chỉ** phục vụ key bắt đầu `public/` và chặn `..` — không có đường nào từ internet chạm tới `private/`. Bucket MinIO không expose ra ngoài; mọi ảnh đều đi qua ứng dụng.

## 10. Mô hình đe doạ rút gọn

| Kẻ tấn công | Mục tiêu | Phòng thủ chính | Rủi ro còn lại |
|---|---|---|---|
| Người dùng phổ thông tò mò | Xem SĐT hàng xóm | Không API nào trả SĐT; UI chỉ hiển thị tên | — |
| Kẻ cày phiếu | Đẩy câu của mình lên biển | 1 phiếu/tài khoản, cấm tự thương, rate limit, heuristics + shadow-ban | Kẻ kiên nhẫn dùng nhiều SĐT thật vẫn qua được → admin vẫn là chốt chặn cuối khi **chọn câu** |
| Kẻ giả mạo người khác | Đăng bài dưới tên người khác | Cần biết SĐT nạn nhân; hậu quả giới hạn (chỉ tên hiển thị công khai) | Chấp nhận có chủ đích do bỏ OTP |
| Attacker web (CSRF/XSS) | Ghi dữ liệu thay người dùng | CSRF double-submit, CSP `default-src 'self'`, React escape mặc định, không `dangerouslySetInnerHTML` | `script-src` có `'unsafe-inline'` (yêu cầu của Next.js) làm CSP yếu hơn lý tưởng |
| Kẻ có quyền đọc DB dump | Lấy SĐT hàng loạt | `phone_hash` một chiều; `phone_encrypted` cần khoá AES nằm ở env, không trong DB | Nếu lộ **cả** dump lẫn `PHONE_AES_KEY` thì lộ SĐT của người đã opt-in |
| Insider (admin) | Xuất data cá nhân | Chỉ đọc được bản ghi opt-in; mọi lần hiện/xuất đều ghi `audit_logs` | Chưa có màn hình đọc audit log → cần đối soát thủ công |

## 11. Checklist review khi sửa code chạm bảo mật

- [ ] Có endpoint mới nào ghi dữ liệu mà **không** dùng `requireUserWrite`/`requireAdmin` không?
- [ ] Response mới có vô tình chứa `phone_hash`, `phone_encrypted`, `*_key`, `review_note`, `select_note` không?
- [ ] Truy vấn công khai mới có lặp đủ bộ lọc trạng thái ("chỉ nội dung đã duyệt") không?
- [ ] Có chỗ nào `console.log` nội dung người dùng nhập mà chưa `redactPhonesInText` không?
- [ ] Có thêm nơi gọi `decryptPhone` mà chưa ghi `audit_logs` không?
- [ ] Ghi điểm có đi qua `score-service.ts` và nằm trong transaction không?
- [ ] Ảnh mới lưu đúng prefix (`public/` vs `private/`) chưa?
- [ ] Có hard-code đường dẫn gốc thay vì `withBase()`/`absoluteUrl()` không?
