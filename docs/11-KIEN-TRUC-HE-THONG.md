# 11 — Kiến trúc hệ thống

> Mô tả kiến trúc **như đã triển khai**. Yêu cầu kiến trúc gốc ở `07-NFR-TECH.md` §2.

## 1. Sơ đồ tổng thể

### 1.1 Mode "chuẩn" — `docker-compose.yml` (4 service, máy/VM riêng)

```
                    Internet
                       │  :80 / :443
              ┌────────▼─────────┐
              │  proxy (Caddy)   │  ← service DUY NHẤT mở port
              │  TLS tự động     │    HSTS, X-Frame-Options, CSP, -Server
              └────────┬─────────┘
                       │ reverse_proxy web:3000
     ┌─────────────────▼──────────────────┐
     │  web — Next.js standalone, non-root │  healthcheck /api/v1/counters
     │  SSR + API routes + stream ảnh      │
     └───────┬───────────────────┬─────────┘
             │ pg (5432)         │ S3 API (9000)
     ┌───────▼────────┐  ┌───────▼──────────┐
     │ db  Postgres16 │  │ storage  MinIO   │
     │ volume db_data │  │ volume minio_data│
     └────────────────┘  └──────────────────┘
        (không publish port)   (không publish port)
                     network: internal (bridge)
```

### 1.2 Mode production thực tế — `docker-compose.prod.yml`

VM GCP dùng chung (`ai-law`, Singapore) đã chạy app khác, nên:

- **Không có service `proxy`** — Caddy chạy trên **host** (systemd), lo TLS/reverse-proxy cho nhiều app.
- `web` publish **chỉ nội bộ** `127.0.0.1:3001` (cổng 3000/8000 đã bị app khác dùng).
- `db` và `storage` **không publish port nào** (tránh đụng Postgres/MinIO của app kia).
- Compose project name cố định `khupho` → container `khupho-web|db|storage`.

Chi tiết vận hành ở [`18-TRIEN-KHAI-VAN-HANH.md`](18-TRIEN-KHAI-VAN-HANH.md).

## 2. Kiến trúc trong ứng dụng web

```
┌──────────────────────── Next.js App Router ─────────────────────────┐
│                                                                     │
│  middleware.ts        chặn UI /admin khi thiếu cookie (chỉ là UX)    │
│         │                                                           │
│  ┌──────▼──────────┐   ┌────────────────────┐   ┌────────────────┐  │
│  │ Server Component│   │  Route Handlers    │   │  OG image      │  │
│  │ page.tsx (SSR)  │   │  /api/v1, /api/admin│  │  opengraph-… │  │
│  └──────┬──────────┘   └─────────┬──────────┘   └───────┬────────┘  │
│         │  initial data          │ JSON                 │ PNG       │
│  ┌──────▼──────────┐             │                      │           │
│  │ Client island   │─fetch(+CSRF)┘                      │           │
│  │ HomeShell/Admin │  polling 20s                       │           │
│  └─────────────────┘                                    │           │
│                                                          │          │
│  ══════════════════ src/lib (lõi dùng chung) ════════════▼════════  │
│  api.ts (guard) · session · admin-session · csrf · rate-limit       │
│  score-service · scoring · leaderboard · counters · taxonomy · copy │
│  db (pool/tx) · crypto · phone · storage · stylize · og · url · env │
└─────────────────────────────────────────────────────────────────────┘
```

**Nguyên tắc phân lớp thực tế trong repo:**

- Route handler = *validate đầu vào → gọi lib → trả JSON*. Không nhúng logic điểm/bảo mật vào component.
- Mọi ghi điểm **bắt buộc** qua `src/lib/score-service.ts` (không `INSERT INTO score_events` rải rác).
- Mọi guard ghi của cư dân qua `requireUserWrite`, của admin qua `requireAdmin` (`src/lib/api.ts`).
- Copy hiển thị lấy từ `src/lib/copy.ts` — không viết chuỗi tiếng Việt marketing trực tiếp trong component.
- Mọi URL/asset đi qua `withBase()` / `absoluteUrl()` (`src/lib/url.ts`) để `basePath` đổi được bằng env.

## 3. Vòng đời một request ghi (ví dụ: bấm "Thương")

```
Client (IssueDrawer)
 └─ apiSend("POST", "/api/v1/suggestions/{id}/vote")
     ├─ ensureCsrf(): đọc cookie kp_csrf; chưa có → GET /api/v1/csrf rồi đọc lại
     └─ fetch với header x-csrf-token + cookie kp_session (HttpOnly, tự gửi)
          │
Server  /api/v1/suggestions/[id]/vote  → requireUserWrite(req)
          ├─ verifyCsrf: so cookie vs header bằng timingSafeEqual → sai: 403
          ├─ getSessionUser: SHA-256(token cookie) tra bảng sessions (chưa revoke, chưa hết hạn)
          │     → không có: 401 · có: gia hạn last_seen_at/expires_at (fire-and-forget)
          └─ rateLimit("write:{userId}", 30/giờ) → vượt: 429
          │
       tx(BEGIN)
          ├─ SELECT … FROM suggestions WHERE id=$1 AND status IN (approved…installed) FOR UPDATE
          ├─ author_id === user.id → SELF_VOTE → 409 "Câu của mình thì để cả xóm thương nhé 💛"
          ├─ đã có phiếu → DELETE votes + invalidateScoreEvent(vote_received) → {voted:false}
          └─ chưa có   → INSERT votes(is_valid = !shadow_ban)
                         nếu không shadow-ban: recordScoreEvent(author, 'vote_received', suggestionId)
       COMMIT → 200 {ok:true, voted:true}
          │
Client  cập nhật optimistic đã áp trước đó; lỗi thì rollback state + toast
```

Điểm cần nhớ: **UI của người bị shadow-ban không đổi** — phiếu vẫn được ghi nhưng `is_valid = false` và không sinh điểm.

## 4. Chiến lược render & làm mới dữ liệu

| Trang | Kiểu | Chi tiết |
|---|---|---|
| `/` (trang chủ) | SSR `force-dynamic` + client island | `page.tsx` chạy 6 truy vấn song song (counters, issues, neighborhoods, pins, ambassadors, khu phố của tháng) rồi truyền vào `HomeShell` → LCP không phải chờ fetch client |
| `/bien/[id]`, `/dai-su/[slug]`, `/khu-pho/[slug]` | SSR `force-dynamic` | Truy vấn 1 lần, sinh `generateMetadata` cho OG |
| `opengraph-image` | Server, `next/og` (satori) | Render PNG 1200×630, font Be Vietnam Pro nạp từ `public/fonts` |
| `/admin/*` | Client component | Gọi API admin sau khi mount; `middleware` chặn sớm nếu thiếu cookie |
| `/chinh-sach-du-lieu` | Static | Nội dung tĩnh |

**Realtime:** không WebSocket. `HomeShell` polling **20 giây** (`/api/v1/counters`, `/issues`, `/map`, `/leaderboard`) — đáp ứng yêu cầu "cập nhật ≤30s" của `07-NFR-TECH` §1. Lỗi mạng thì giữ nguyên dữ liệu cũ, không làm trắng màn hình.

**Cache:** `getCounters()` cache trong RAM tiến trình 15 giây. Ảnh public trả `Cache-Control: public, max-age=86400, immutable`; ảnh bản đồ gốc (admin) trả `private, no-store`.

## 5. Truy cập dữ liệu

`src/lib/db.ts` cung cấp đúng 4 thứ:

```ts
getPool()  // Pool pg singleton (global) — max 10 connection, tái dùng qua hot-reload
q<T>()     // trả mảng row
one<T>()   // trả row đầu hoặc null
tx(fn)     // BEGIN → fn(client) → COMMIT, lỗi thì ROLLBACK, luôn release
```

Quy ước:

- **Luôn dùng tham số hoá `$1, $2…`** — không nối chuỗi SQL từ input người dùng.
- Thao tác nhiều bảng phải nằm trong `tx()`: duyệt đề xuất, duyệt câu, bỏ/ghi phiếu, treo biển, bulk import.
- Khoá hàng bằng `SELECT … FOR UPDATE` trước khi chuyển trạng thái (chống double-submit).
- Ghi điểm chỉ qua `recordScoreEvent` / `invalidateScoreEvent` (nhận `PoolClient` để nằm chung transaction).

## 6. Pipeline ảnh

```
Admin upload ảnh bản đồ (jpg/png/webp ≤10MB)
   ├─ toWebp(buf, 2400, q90)   → private/maps/{nbId}/original.webp   ← CHỈ admin đọc được
   └─ stylizeMap(buf)          → public/maps/{nbId}/stylized.webp    ← public thấy cái này
        grayscale → median(3) → normalise → gamma(1.2)
        → tint đỏ gạch #B23A2E → modulate(brightness 1.18, saturation .85) → webp q78

Ảnh địa điểm / ảnh biển / ảnh khu phố
   └─ toWebp(buf, 1400, q80)   → public/issues/{id}/photo.webp
                                 public/signs/{id}/photo.webp
                                 public/neighborhoods/{id}/photo.webp
```

Quy tắc truy cập (quy tắc cứng 10):

- Bucket MinIO **private**; không expose MinIO ra internet.
- `/api/img/[...key]` chỉ phục vụ key bắt đầu bằng `public/` và chặn `..` → mọi thứ khác trả 404.
- Ảnh bản đồ gốc chỉ đọc được qua `GET /api/admin/neighborhoods/[id]/map-image` (có `requireAdmin`).
- Pin lưu **toạ độ %** (0–100) nên đổi ảnh bản đồ không làm lệch pin — nhưng admin được cảnh báo kiểm tra lại vị trí.

## 7. Cấu hình theo môi trường

| Cơ chế | Mô tả |
|---|---|
| `src/lib/env.ts` | Getter lười cho secret. Production thiếu biến bắt buộc → **ném lỗi ngay**; dev có fallback rõ ràng ("dev-only-…") |
| `BASE_PATH` | **Build arg** (`next.config.ts` đọc lúc build, đẩy sang client qua `NEXT_PUBLIC_BASE_PATH`). Đổi domain kiểu path ⇒ phải rebuild image |
| `SITE_ORIGIN` | Chỉ dùng cho URL tuyệt đối (OG, share link). Đổi runtime được, chỉ cần `up -d web` |
| `serverExternalPackages` | `sharp`, `minio`, `@node-rs/argon2`, `xlsx`, `adm-zip` không bị bundle (native/binary) |
| Header | `X-Robots-Tag: noindex, nofollow` cho `/admin/*`; `poweredByHeader: false`; security header còn lại do Caddy đặt |

## 8. Trạng thái lưu trong RAM (giới hạn 1 instance)

Ba thứ sau **không nằm trong DB**, gắn với tiến trình `web`:

| Thứ | File | Hệ quả |
|---|---|---|
| Bucket rate limit | `rate-limit.ts` (`globalThis.__kpRate`) | Chạy nhiều instance ⇒ hạn mức nhân lên theo số instance |
| Token tạm bước 2 TOTP (5 phút) | `admin-totp.ts` | Nhiều instance ⇒ đăng nhập TOTP hỏng nếu request 2 rơi vào instance khác |
| Cache 4 bộ đếm (15s) | `counters.ts` | Chỉ ảnh hưởng độ tươi số liệu |

MVP chốt chạy **1 instance** nên chấp nhận được. Khi scale ngang phải chuyển sang Redis/DB — xem [`20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md`](20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md) §3.

## 9. Bảo mật ở mức kiến trúc

| Lớp | Biện pháp |
|---|---|
| Mạng | Chỉ proxy mở port (mode 4 service) / chỉ `127.0.0.1:3001` (mode VM chung). DB & MinIO không ra internet |
| Vận chuyển | TLS do Caddy (Let's Encrypt tự động) + HSTS 1 năm |
| Header | X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy no-referrer, CSP `default-src 'self'` |
| Ứng dụng | CSRF double-submit mọi request ghi; session token chỉ lưu SHA-256 trong DB; rate limit; Argon2id cho admin |
| Dữ liệu | SĐT: HMAC-SHA256+PEPPER (định danh, một chiều) và AES-256-GCM (liên hệ, chỉ khi opt-in) — hai khoá tách biệt |
| Container | Image chạy user `khupho` non-root, `output: standalone` (không mang toàn bộ `node_modules`) |
| Vận hành | Migration là lệnh riêng; CI chặn deploy nếu `.env` thiếu `PHONE_PEPPER` |

Chi tiết đầy đủ ở [`14-BAO-MAT-VA-QUYEN-RIENG-TU.md`](14-BAO-MAT-VA-QUYEN-RIENG-TU.md).

## 10. Sơ đồ phụ thuộc module (rút gọn)

```
route handlers ──► api.ts ──► csrf.ts
                       ├────► session.ts / admin-session.ts ──► crypto.ts ──► env.ts
                       └────► rate-limit.ts
               ──► db.ts ──► env.ts
               ──► score-service.ts ──► scoring.ts
               ──► storage.ts ──► env.ts        stylize.ts ──► sharp
               ──► leaderboard.ts / counters.ts ──► db.ts
components ────► client-api.ts (CSRF + basePath)
               ──► copy.ts / taxonomy.ts / examples.ts   (thuần dữ liệu, không I/O)
```

`scoring.ts`, `phone.ts`, `taxonomy.ts`, `copy.ts`, `examples.ts` là **thuần hàm/dữ liệu** — không chạm DB, dễ unit test (và đang được test).
