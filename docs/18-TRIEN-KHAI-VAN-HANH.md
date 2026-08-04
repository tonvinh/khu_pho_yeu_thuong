# 18 — Triển khai & vận hành hạ tầng

> Bản đầy đủ, có giải thích "vì sao". Bản rút gọn để copy-paste nhanh nằm ở [`../README.md`](../README.md).

## 1. Biến môi trường

Tạo từ template: `cp .env.example .env`. **Không bao giờ commit `.env` thật** (đã có trong `.gitignore`).

| Biến | Bắt buộc | Đổi lúc runtime? | Ý nghĩa |
|---|---|---|---|
| `PHONE_PEPPER` | ✅ | ❌ **Không bao giờ đổi** | Pepper HMAC định danh SĐT. `openssl rand -hex 32`. Đổi = **mất toàn bộ tài khoản, điểm, phiếu của cư dân** |
| `PHONE_AES_KEY` | ✅ | ⚠️ Cần migration | Khoá AES-256-GCM mã hoá SĐT lead. `openssl rand -base64 32` (đúng 32 byte). Tách hoàn toàn với PEPPER |
| `POSTGRES_PASSWORD` | ✅ | ✅ | Mật khẩu Postgres (user/db mặc định `khupho`) |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | ✅ | ✅ | Credentials MinIO |
| `DATABASE_URL` | dev | ✅ | Chỉ cần khi chạy ngoài Docker. Trong compose bị override thành `@db:5432` |
| `SITE_ORIGIN` | | ✅ (cần `up -d web`) | Origin tuyệt đối cho OG tag/share link. Production: `https://khupho.ailab.city`. **Không** liên quan CSRF/auth |
| `BASE_PATH` | | ❌ **Build arg** | `""` cho domain riêng; `/khu-pho-de-thuong` nếu chạy dưới path. Đổi ⇒ **phải rebuild image** |
| `SITE_ADDRESS` | | ✅ | Chỉ dùng ở mode 4 service: `:80` local, hoặc domain để Caddy tự cấp TLS |
| `POSTGRES_USER` / `POSTGRES_DB` | | | Mặc định `khupho` |
| `MINIO_BUCKET` | | ✅ | Mặc định `khupho` |
| `SEED_ADMIN_PASSWORD` | | | Tuỳ chọn cho `pnpm seed` (mặc định `KhuPho@2026!Demo`) |

Ở **production**, thiếu biến bắt buộc thì app **ném lỗi khi khởi động** thay vì âm thầm dùng giá trị dev — đây là chốt chặn cố ý.

**Sinh secret:**

```bash
openssl rand -hex 32      # PHONE_PEPPER
openssl rand -base64 32   # PHONE_AES_KEY
openssl rand -base64 24   # POSTGRES_PASSWORD / MINIO_SECRET_KEY
```

→ Backup `PHONE_PEPPER` và `PHONE_AES_KEY` vào nơi an toàn **ngay lập tức**, tách khỏi backup DB.

---

## 2. Chạy dev local

Yêu cầu: Node ≥22, pnpm 9, Postgres 16 + MinIO (cài trực tiếp hoặc mượn container từ compose).

```bash
cp .env.example .env             # điền PHONE_PEPPER, PHONE_AES_KEY, DATABASE_URL localhost
pnpm install
pnpm migrate                     # tạo schema (idempotent)
pnpm seed                        # dữ liệu demo (admin: admin@fpt.com / KhuPho@2026!Demo)
pnpm dev                         # http://localhost:3000 · admin: /admin
```

Lệnh khác:

```bash
pnpm test                        # vitest — BẮT BUỘC pass trước khi merge
pnpm build                       # build production + typecheck
pnpm create-admin <email@fpt.com> <mật_khẩu_≥12_ký_tự> [--totp]
pnpm seed:admin-demo             # thêm dữ liệu demo cho các màn admin
```

Ghi chú về seed:

- `seed.mjs` **bỏ qua** nếu DB đã có khu phố (không ghi đè dữ liệu thật).
- Điểm trong seed khớp **chính xác** công thức 05: Bà Liên 82đ · Anh Dũng 77đ · Chú Ba 41đ · Cô Tám 34đ · Minh 21đ. (Vài con số trong file design mâu thuẫn công thức — seed ưu tiên công thức.)
- `seed-admin-demo.mjs` idempotent, nhận biết bằng marker user `"Số Lạ 0908"`.
- Muốn seed lại từ đầu: xoá sạch dữ liệu (`docker compose down -v` ở dev) rồi `pnpm migrate && pnpm seed`.

Mượn Postgres/MinIO từ compose để dev nhanh:

```bash
docker compose up -d db storage
# .env: DATABASE_URL=postgres://khupho:<pass>@localhost:5432/khupho
#       MINIO_ENDPOINT=localhost  MINIO_PORT=9000
```
(Lưu ý: `docker-compose.yml` không publish port `db`/`storage` — thêm `ports` tạm ở file override local nếu cần.)

---

## 3. Docker image

`Dockerfile` multi-stage:

| Stage | Việc |
|---|---|
| `deps` | `node:22-alpine` + `pnpm@9`, `pnpm install --frozen-lockfile` |
| `builder` | `node:22-alpine`, nhận `ARG BASE_PATH`, chạy `pnpm build` (Next `output: standalone`) |
| `runner` | alpine, tạo user **non-root** `khupho`, copy `.next/standalone`, `.next/static`, `public`, `db/`, `scripts/`; `HEALTHCHECK` gọi `/api/v1/counters` mỗi 30s |

Hai điểm cố ý, **đừng "nâng cấp" nếu chưa hiểu**:

- **Ghim `pnpm@9`**: corepack mặc định kéo pnpm 11 (đòi Node ≥22.13 và hard-fail "ignored builds" của sharp/esbuild). Nâng pnpm phải nâng lockfile cùng lúc.
- **Migration không tự chạy khi container start** — luôn là lệnh riêng (quy tắc cứng 11), để không bao giờ có chuyện container tự đổi schema lúc restart.

---

## 4. Production mode A — compose 4 service (máy/VM riêng)

Dùng khi có máy trống, muốn cả proxy + TLS trong Docker. Chỉ service `proxy` mở port 80/443.

```bash
cp .env.example .env             # điền secrets thật; SITE_ADDRESS=<domain> để tự động TLS
docker compose up -d --build
docker compose run --rm web node scripts/migrate.mjs
docker compose run --rm web node scripts/seed.mjs      # tuỳ chọn, chỉ môi trường thử
docker compose run --rm web node scripts/create-admin.mjs admin@fpt.com 'MatKhauManh!123'

curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/api/v1/counters   # → 200
```

Caddy (`deploy/Caddyfile`) đặt sẵn: HSTS 1 năm, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, CSP `default-src 'self'` (kèm `frame-src` cho YouTube — xem §5.2), ẩn header `Server`, nén `zstd gzip`.

Header thật nằm ở snippet [`deploy/khupho-headers.caddy`](../deploy/khupho-headers.caddy),
`deploy/Caddyfile` chỉ `import` nó — cùng một file với Caddy host ở §5.2, nên hai mode
không bao giờ lệch CSP.

> **Sửa snippet xong phải `docker compose restart proxy`.** Đó là bind mount *nội dung*,
> không phải đổi service definition, nên `docker compose up -d` không recreate `proxy` và
> Caddy vẫn giữ config đã parse lúc khởi động — rất dễ tưởng CSP mới đã có tác dụng.
>
> Mount `./deploy/khupho-headers.caddy:/etc/caddy/conf.d/khupho-headers.caddy:ro` là **bắt
> buộc**: thiếu file đó Caddy báo `File to import not found` và `proxy` không khởi động.
> Cố ý fail-closed — proxy chạy mà không có CSP/HSTS là vi phạm 07 §2.2.

---

## 5. Production mode B — VM dùng chung + Caddy trên host (đang chạy thật)

VM GCP `ai-law` (Singapore, e2-standard-2, 8GB RAM + 4GB swap) đang chạy app khác, nên dùng `docker-compose.prod.yml`:

- **Không có service `proxy`** — Caddy trên host lo TLS/reverse-proxy cho nhiều app.
- `web` publish **chỉ nội bộ** `127.0.0.1:3001`.
- `db` + `storage` **không publish port** (tránh đụng Postgres 5432 / MinIO 9000 của app kia).
- Project name cố định `khupho` → container `khupho-web|db|storage`.

### 5.1 Chuẩn bị VM (một lần)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER          # logout/login lại

sudo mkdir -p /opt/khu_pho && sudo chown $USER /opt/khu_pho
git clone https://github.com/tonvinh/khu_pho_yeu_thuong.git /opt/khu_pho
cd /opt/khu_pho
cp .env.example .env                   # điền secrets thật, SITE_ORIGIN=https://khupho.ailab.city, BASE_PATH=""
```

### 5.2 DNS + Caddy trên host (một lần)

A record `khupho.ailab.city` → IP tĩnh của VM (đã reserve static trên GCP — **nhớ release nếu ngừng dự án**, IP tĩnh không dùng vẫn tính phí). Firewall GCP mở 80/443.

Security header **không viết thẳng vào file host**. `/etc/caddy/Caddyfile` trên VM còn site
block của `law.ailab.city` + `fb.ailab.city` (CSP khác hẳn — có `fonts.googleapis.com`, CDN
Facebook), nên repo chỉ sở hữu một *snippet* của riêng mình:
[`deploy/khupho-headers.caddy`](../deploy/khupho-headers.caddy). Cả mode 4 service lẫn Caddy
host đều `import` cùng file đó → không còn chuyện sửa CSP trong repo mà production không đổi.

```bash
sudo mkdir -p /etc/caddy/conf.d
sudo install -m 0644 /opt/khu_pho/deploy/khupho-headers.caddy /etc/caddy/conf.d/khupho-headers.caddy
```

```caddyfile
# ĐẦU /etc/caddy/Caddyfile (trước mọi site block)
import /etc/caddy/conf.d/khupho-headers.caddy

khupho.ailab.city {
    encode zstd gzip
    import khupho_headers      # ← thay cho khối header{...} viết tay
    reverse_proxy 127.0.0.1:3001
}
```

```bash
sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
# Let's Encrypt tự cấp cert trong ~30s
```

Wiring gồm **hai vế, phải đủ cả hai**: dòng `import /etc/caddy/conf.d/khupho-headers.caddy`
ở đầu file, **và** dòng `import khupho_headers` bên trong site block khupho (thay cho khối
`header{...}` viết tay). Chỉ làm vế đầu là trạng thái *nửa vời* nguy hiểm nhất: `caddy validate`
vẫn pass (snippet không dùng vẫn hợp lệ), reload vẫn chạy, CI vẫn xanh — nhưng production
tiếp tục phục vụ header cũ. Job CI ở §6 kiểm tra cả hai dòng và **fail** nếu thiếu vế nào.

Sau bước một lần này, mỗi lần deploy CI tự đồng bộ snippet (§6). Nếu host **chưa** nối gì cả,
job đó chỉ in cảnh báo rồi bỏ qua — app vẫn deploy bình thường, nhưng CSP sẽ đứng yên
ở bản cũ, nên đừng để trạng thái đó kéo dài.

Runner phải **đọc** được `/etc/caddy/Caddyfile` và snippet bằng quyền thường (mặc định
`0644`, thư mục `0755`) — job cố tình không dùng `sudo` cho `test/cmp/grep` vì `sudo -n`
bị từ chối trả về non-zero y hệt "file không tồn tại", khiến sync im lặng không chạy mãi.

> **`frame-src` không được bỏ.** Thiếu directive này thì iframe TVC rơi về `default-src 'self'`
> và Chrome chặn — trang chủ lẫn ô "Xem trước video" ở `/admin/noi-dung` chỉ còn ô xám
> *"This content is blocked. Contact the site owner to fix the issue."* Đây là lỗi cấu hình
> proxy, không phải lỗi ID video.

### 5.3 Chạy lần đầu

```bash
cd /opt/khu_pho
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec -T web node scripts/migrate.mjs
docker compose -f docker-compose.prod.yml exec -T web node scripts/create-admin.mjs admin@fpt.com 'MatKhauManh!123'

curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/v1/counters   # → 200
curl -s -o /dev/null -w '%{http_code}\n' https://khupho.ailab.city               # → 200
```

### 5.4 Deploy thủ công lần sau

```bash
cd /opt/khu_pho
git fetch origin main && git reset --hard origin/main
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec -T web node scripts/migrate.mjs
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/v1/counters
```

Chỉ đổi `.env` (ví dụ `SITE_ORIGIN`) thì không cần build, nhưng phải `up -d web` để container đọc lại. Riêng `BASE_PATH` là **build arg** → bắt buộc build lại.

---

## 6. CI/CD (GitHub Actions + self-hosted runner)

Push lên `main` → runner **chạy ngay trên VM** tự pull + rebuild + migrate + healthcheck (~1 phút). Runner kết nối **outbound-only**, VM không cần mở port SSH. File: `.github/workflows/deploy.yml`; cũng chạy tay được qua tab Actions → "Run workflow".

Workflow có **hai job độc lập, không `needs` nhau** — cố ý: header là cấu hình của *host*,
container app là chuyện khác. Build/migrate hỏng thì không được chặn một bản vá CSP, và
ngược lại. Runner self-hosted chạy tuần tự nên hai job không giẫm chân nhau ở `/opt/khu_pho`.

**Job `deploy`** (app):

1. `git fetch` + `reset --hard FETCH_HEAD` tại `/opt/khu_pho`.
2. **Chốt chặn `.env`**: kiểm tra file tồn tại và `PHONE_PEPPER` không rỗng — thiếu thì **dừng ngay**, không để container khởi động với secret mới (sinh pepper mới = mất toàn bộ định danh cư dân). Bước này cũng tự nâng `.env` từ layout thư mục lồng cũ lên gốc repo nếu còn sót.
3. `docker compose -f docker-compose.prod.yml build web` + `up -d`.
4. `exec -T web node scripts/migrate.mjs`.
5. Poll `http://127.0.0.1:3001/api/v1/counters` tối đa ~45s; khác 200 → fail.

**Job `sync-headers`** (security header sang Caddy host): pull source, rồi

1. Snippet chưa có trên host → `::warning::` + in hướng dẫn §5.2, **exit 0** (chưa nối là
   trạng thái hợp lệ).
2. Không đọc được `/etc/caddy/Caddyfile` hoặc snippet → **fail** kèm lệnh sửa quyền —
   không im lặng coi như "chưa nối".
3. `/etc/caddy/Caddyfile` thiếu `import …/khupho-headers.caddy` hoặc `import khupho_headers`
   → **fail**: host nối nửa vời, CSP trong repo không có tác dụng (§5.2).
4. `cmp` giống nhau → thôi. Khác → backup vào `$HOME/khupho-caddy-backups/` (giữ 10 bản)
   → `install` đè → `caddy validate` **cả file host** → `systemctl reload caddy` →
   `systemctl is-active`. **Mọi** bước trong chuỗi này đều được bọc `if !` và tự khôi phục
   backup khi hỏng — kể cả `reload`, vì step chạy dưới `bash -e` nên một lệnh trần thất bại
   sẽ giết step trước khi nhánh khôi phục kịp chạy, để lại file hỏng trên đĩa.

> Backup **không** để trong `/etc/caddy/conf.d/`: thư mục đó thường được import bằng glob
> (`import /etc/caddy/conf.d/*`), file `.bak` nằm trong đó sẽ định nghĩa trùng
> `(khupho_headers)` → `caddy validate` fail vĩnh viễn.

> Job `sync-headers` **chỉ** ghi đúng file `/etc/caddy/conf.d/khupho-headers.caddy`, không bao
> giờ ghi `/etc/caddy/Caddyfile`. VM dùng chung với `law.ailab.city` và `fb.ailab.city` — nếu ai
> đó sửa thành copy đè cả Caddyfile thì mỗi lần deploy khupho sẽ đánh sập 2 app kia.
> Runner chạy bằng user `nct`, cần `sudo` NOPASSWD đúng 3 binary **ghi**: `install`, `caddy`,
> `systemctl`. Mọi thao tác đọc (`test/cmp/grep`) chạy quyền thường — xem §5.2.

`concurrency: deploy-vm` đảm bảo không có 2 lần deploy chồng nhau.

Mọi push đều deploy, kể cả khi chỉ sửa tài liệu. Muốn bỏ qua, thêm `paths-ignore: ["**.md", "docs/**"]` vào khối `on.push`.

**Cài runner (một lần):**

```bash
# GitHub → repo → Settings → Actions → Runners → New self-hosted runner (Linux x64)
sudo mkdir -p /opt/actions-runner && sudo chown $USER /opt/actions-runner
cd /opt/actions-runner
# … tải + giải nén theo hướng dẫn GitHub …
./config.sh --url https://github.com/tonvinh/khu_pho_yeu_thuong --token <TOKEN> --labels khupho
sudo ./svc.sh install $USER && sudo ./svc.sh start
sudo usermod -aG docker $USER      # user chạy runner phải thuộc nhóm docker
```

Label `khupho` là cách workflow chọn đúng runner (`runs-on: [self-hosted, khupho]`).

---

## 7. Vận hành hằng ngày

```bash
F=docker-compose.prod.yml     # bỏ -f nếu dùng compose 4 service

docker compose -f $F ps                            # trạng thái + healthcheck
docker compose -f $F logs -f --tail=200 web        # log app
docker compose -f $F exec db psql -U khupho khupho # vào Postgres
docker compose -f $F restart web                   # restart nhanh
```

### 7.1 Backup

```bash
# Database (db không publish port — backup qua exec)
docker compose -f $F exec -T db pg_dump -U khupho khupho | gzip > backup-$(date +%F).sql.gz

# Ảnh MinIO (volume minio_data)
docker run --rm --volumes-from khupho-storage-1 -v "$PWD":/backup alpine \
  tar czf /backup/minio-$(date +%F).tar.gz /data
```

⚠️ Backup DB **vô dụng nếu mất `PHONE_PEPPER`** — hãy backup file `.env` (hoặc ít nhất 2 khoá) riêng, ở nơi khác.

### 7.2 Restore

```bash
gunzip -c backup-YYYY-MM-DD.sql.gz | docker compose -f $F exec -T db psql -U khupho khupho
docker run --rm --volumes-from khupho-storage-1 -v "$PWD":/backup alpine \
  tar xzf /backup/minio-YYYY-MM-DD.tar.gz -C /
```

Restore xong nhớ dùng **đúng `.env` cùng thời điểm** (cùng `PHONE_PEPPER` và `PHONE_AES_KEY`).

### 7.3 Theo dõi sức khoẻ

| Chỉ số | Cách xem |
|---|---|
| App sống | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/v1/counters` → 200 |
| Healthcheck container | `docker compose -f $F ps` (cột STATUS có `healthy`) |
| Dung lượng | `docker system df`, `df -h` (ảnh WebP tích tụ trong volume `minio_data`) |
| RAM/swap | `free -h` — VM dùng chung 8GB + 4GB swap, build image là lúc căng nhất |
| Chứng chỉ TLS | `sudo caddy list-certificates` hoặc log Caddy trên host |

---

## 8. Sự cố thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Build fail ở native deps (sharp/argon2/esbuild) | Dockerfile ghim `pnpm@9` có chủ đích. Đừng nâng pnpm nếu chưa nâng lockfile |
| Workflow không chạy khi push | Workflow phải nằm ở `.github/workflows/` tại **gốc repo**. Kiểm tra runner còn online: Settings → Actions → Runners |
| Deploy fail ở bước "Ensure .env" | `/opt/khu_pho/.env` không tồn tại hoặc `PHONE_PEPPER` rỗng. Đây là chốt chặn cố ý — khôi phục `.env` từ backup, **đừng sinh pepper mới** |
| `web` unhealthy | `docker compose -f $F logs web`. Thường do thiếu `PHONE_PEPPER`/`PHONE_AES_KEY` hoặc `db` chưa healthy |
| 502 từ Caddy host | `web` chưa lên hoặc lệch port. Kiểm `curl 127.0.0.1:3001/api/v1/counters`, và Caddyfile trỏ đúng `127.0.0.1:3001` |
| Video TVC là ô xám "This content is blocked" (trang chủ + `/admin/noi-dung`) | CSP của Caddy **host** thiếu `frame-src https://www.youtube-nocookie.com`. Kiểm `curl -sI https://<domain>/ \| grep -i content-security`, sửa `/etc/caddy/Caddyfile` theo §5.2 → `sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy`. Không cần rebuild app |
| Video TVC ra "Error 153 — Video player configuration error" | Iframe nạp được nhưng thiếu `referrerPolicy="strict-origin-when-cross-origin"` trên thẻ. Site đặt `Referrer-Policy: no-referrer` nên YouTube không xác thực được domain nhúng. **Không phải** lỗi ID video hay video tắt nhúng — đổi ID khác vẫn lỗi y hệt |
| Ảnh không hiện | `storage` healthy chưa? `MINIO_*` khớp chưa? Ảnh public đi qua `/api/img/…`, không truy cập MinIO trực tiếp |
| Ảnh bản đồ 404 với admin | Ảnh gốc nằm ở `private/`, chỉ đọc qua `/api/admin/neighborhoods/{id}/map-image` |
| Migration lỗi giữa chừng | `scripts/migrate.mjs` chạy mỗi file trong 1 transaction và idempotent — sửa nguyên nhân rồi chạy lại là đủ |
| Đổi domain | Đổi A record + site block Caddy + `SITE_ORIGIN` trong `.env` → `up -d web`. Chuyển sang chạy dưới path thì đổi `BASE_PATH` và **rebuild** |
| Người dùng mất hết tài khoản sau deploy | Gần như chắc chắn `PHONE_PEPPER` đã bị thay. Khôi phục pepper cũ → dữ liệu trở lại (hash không đổi trong DB) |
| Đăng nhập admin báo khoá | 5 lần sai → khoá 15 phút. Gấp thì kỹ thuật chạy `UPDATE admin_users SET failed_attempts=0, locked_until=NULL WHERE email='…';` |
| Quên mật khẩu admin | `docker compose -f $F exec -T web node scripts/create-admin.mjs <email@fpt.com> '<mật khẩu mới>'` (lệnh này upsert) |

---

## 9. Checklist trước khi go-live

- [ ] `.env` production có **secret thật** (không phải giá trị mẫu), đã backup `PHONE_PEPPER` + `PHONE_AES_KEY` ra ngoài VM.
- [ ] `SITE_ORIGIN` đúng domain thật (ảnh hưởng OG/share link).
- [ ] `BASE_PATH` đúng phương án domain và **image đã build với giá trị đó**.
- [ ] Đã chạy migration, `curl /api/v1/counters` trả 200.
- [ ] Đã tạo admin thật bằng `create-admin.mjs`; **đã đổi/xoá tài khoản demo `admin@fpt.com` nếu từng seed**.
- [ ] TLS hoạt động, HSTS + security headers trả về đúng (`curl -I https://…`).
- [ ] `/admin` không bị Google index: kiểm `robots.txt` và header `X-Robots-Tag`.
- [ ] `pnpm test` xanh trên commit đang deploy.
- [ ] Đã thử end-to-end trên production: định danh → viết câu → duyệt 4N → thương → treo biển → banner + trang share.
- [ ] Đã test preview link share bằng Facebook Sharing Debugger và Zalo debugger.
- [ ] Đã lên lịch backup DB + MinIO (cron), và **thử restore ít nhất một lần**.
