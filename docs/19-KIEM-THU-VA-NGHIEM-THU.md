# 19 — Kiểm thử & nghiệm thu

> Definition of Done chính thức nằm ở cuối `CLAUDE.md`. Tài liệu này biến nó thành checklist thực thi được.

## 1. Kiểm thử tự động

> Cập nhật: 8/9/2026 — đồng bộ với code sau các đợt 18/8, 2–4/9, 7/9.

```bash
pnpm test          # vitest run — unit (node) + UI (jsdom). Phải xanh trước khi merge
pnpm test:e2e      # gọi THẲNG server đang chạy; tự SKIP nếu không thấy server
pnpm build         # build + typecheck (TypeScript strict)
```

⚠️ **Đừng chạy `pnpm build` khi `pnpm dev` đang chạy** — build ghi đè `.next` của dev server, dev
server trả 500 cho mọi route và không tự hồi. Tắt dev server trước (hoặc `rm -rf .next` rồi khởi
động lại dev).

### 1.1 Bộ unit (môi trường `node`)

| File | Phủ gì | Vì sao bắt buộc |
|---|---|---|
| `tests/scoring.test.ts` | 3 test case điểm của `05-SCORING-RULES` §4 (81 / 87 / 45), event bị vô hiệu không tính, trần 3 đề xuất/tuần | Quy tắc cứng 4 — sai điểm là sai kết quả trao giải |
| `tests/four-n.test.ts` | `passes4N()`: đủ 4 ô mới true; thiếu bất kỳ ô nào, null, undefined đều false. Fixtures câu chuẩn ≤120 ký tự | Quy tắc cứng 2 — chốt chặn duyệt nội dung |
| `tests/phone.test.ts` | `normalizePhone` (5 dạng nhập), từ chối đầu số sai, `looksFake`, `maskPhone`, `redactPhonesInText` | Quy tắc cứng 3b — bảo vệ SĐT |
| `tests/site-content.test.ts` | Bộ khoá `site_content` đúng **13** — khoá `campaign_*` đã gỡ hẳn (QC 4/9 · D3) | Không để admin sửa thứ không hiển thị ở đâu |
| `tests/counters.test.ts` | Ghi đè 3 con số (8/9): ô rỗng → đếm thật · số hợp lệ → thắng · hàng rác (chữ/âm/lẻ) bị lơ đi · `getRealCounters()` **không** áp ghi đè | Dashboard admin phải thấy số thật, trang chủ thấy số PR |
| `tests/spreadsheet.test.ts` | `readWorkbook`: **CSV UTF-8 không BOM** phải ra đúng dấu tiếng Việt (QC 2/9 · B1) | Sai bảng mã ⇒ lỗi giả "Tỉnh/Thành phố không có trong danh mục" |
| `tests/globals-css.test.ts` | Đọc thẳng `globals.css`: khai báo có tồn tại **và có đứng ĐÚNG THỨ TỰ không** (`.kp-hero-title` sau `.kp-h2`; `.kp-input-lg` cuối cụm) | Họ bẫy C1/C2 — rule sau thắng khi cùng specificity |
| `tests/stylize.test.ts` | `stylizeMap()` cho ra ảnh **có màu** (R > G > B), không phải đen trắng | Guard hồi quy sharp 0.34. ⚠️ Hàm này nay **mồ côi** (trang chủ bỏ bản đồ) |

### 1.2 Bộ UI (môi trường **jsdom** — khai `@vitest-environment jsdom` ở đầu file)

Dev-dep: `jsdom`, `@testing-library/react`, `@testing-library/dom`. `testTimeout` nâng lên **15s**
(máy đang chạy dev server thì vài ca chạm trần 5s và đỏ oan).

| File | Phủ gì |
|---|---|
| `tests/ui/home-shell.test.tsx` | Top bar (3 nhãn mới, breakpoint `xl`/`lg`) · banner báo tin là lớp **`fixed`** và KHÔNG là con của khối bọc nền hero · deep-link `?khu-pho=` và `?viet-loi-nhac=` (kể cả một ca đọc thẳng `src/app/khu-pho/[slug]/page.tsx` để hai đầu deep-link không lệch) |
| `tests/ui/issue-board.test.tsx` | 3 tab tách hẳn: tab 1 chỉ góc phố **chưa có câu**, tab 2 là **câu nhắc** + nút `Bình chọn` viền xanh có trái tim + **không phân trang**, tab 3 là **người** + nút `Xem lời nhắc` viền cam |
| `tests/ui/counters.test.tsx` · `home-blocks.test.tsx` | Dải 3 con số (node ẩn "+300 Người đóng góp" **không** dựng) · tab lọc · khối ưu đãi |
| `tests/ui/hero-lookup.test.tsx` | Ba trạng thái dropdown · panel là lớp **nổi** · thanh tra cứu **không chứa `<button>`** nào · hai câu mời theo `notes_count` |
| `tests/ui/modal.test.tsx` | Khung modal 700 / viền 2px / tiêu đề 25px Regular / nút 35×35 / sọc nằm trong |
| `tests/ui/propose-modal.test.tsx` | Đúng **4 nhãn theo thứ tự** + payload; không còn hộp cảnh báo / chip 4N / ô câu nhắc kèm |
| `tests/ui/suggest-modal.test.tsx` | Chú thích 4 chip 4N; chip **không phải `<button>`** (Q4); đã bỏ ghi chú đạo đức |
| `tests/ui/spot-picker-modal.test.tsx` | Popup "Chọn góc phố": nhóm xóm mình lên đầu, tìm bỏ dấu, Enter chọn dòng đầu |
| `tests/ui/neighborhood-view.test.tsx` | Danh sách câu + pill trạng thái; **nút bình chọn CHỈ ở câu `approved`** (6 ca: 3 trạng thái × có/không `voted`) |
| `tests/ui/ambassador-modal.test.tsx` | Popup "Cây bút khu phố" |
| `tests/ui/sign-card.test.tsx` | Biển 404×199, **không còn dải khuyến mãi**, cỡ chữ co theo độ dài câu (`fontSizeFor`) |
| `tests/ui/lead-section.test.tsx` | 6 lựa chọn lưới 3 cột, tiêu đề canh trái |
| `tests/ui/identify-modal.test.tsx` | Không OTP; tự nhập khu phố thì **bắt buộc tỉnh/thành** |
| `tests/ui/user-menu.test.tsx` | Avatar là `<button>`, menu có Đăng xuất |
| `tests/ui/back-to-top.test.tsx` | Nút nổi, chỉ hiện khi cuộn quá 1 màn hình |
| `tests/ui/slider-motion.test.tsx` | Slider **đứng yên** khi bật "giảm chuyển động" (phải tắt bằng **JS**, CSS không đủ) |
| `tests/ui/slider-slots.test.tsx` | Slider lấy `is_featured` và cắt đúng **10 slot**, theo `featured_position` |
| `tests/ui/admin-neighborhoods.test.tsx` | 3 trạng thái bật/tắt tự do · 10 slot (hoán đổi) · xoá mềm + tab 🗑 Đã xoá |
| `tests/ui/signs-panel.test.tsx` | Ô "ngày treo" **riêng từng dòng** |
| `tests/ui/admin-site-counters.test.tsx` | Màn `/admin/noi-dung`: khối 3 con số, placeholder là số đếm thật, ô rỗng gửi `""` để xoá ghi đè |
| `tests/ui/admin-loading.test.tsx` | Cờ `loaded` → "Đang tải…" thay vì loé thông báo rỗng |

> ⚠️ **jsdom KHÔNG tính layout và KHÔNG hiểu media query.** Số đo px / breakpoint /
> `prefers-reduced-motion` **phải đo bằng DOM thật trong Chrome** — đừng tin test suông.
> Mẹo dùng lại được: dựng `<iframe src="/" width=…>` rồi đo trong `contentDocument` (media query
> ăn theo bề ngang iframe; **cộng 17px** cho thanh cuộn: `width:1457px` mới ra `clientWidth` 1440),
> và vá `matchMedia`/`fetch` của `contentWindow` **trước khi** trang hydrate.

### 1.3 Bộ E2E (`pnpm test:e2e` — `vitest.e2e.config.ts`)

`tests/e2e/qc-fixes.e2e.ts` (~33 ca) gọi **THẲNG server đang chạy**, không mock gì.

- `E2E_BASE_URL`, mặc định `http://localhost:3001`. Không thấy server ⇒ **cả bộ tự SKIP** để
  `pnpm test` trên máy khác không đỏ oan.
- `tests/e2e/client.ts` là cookie jar + CSRF double-submit; **mỗi Client có User-Agent riêng** vì
  trần "3 SĐT mới/thiết bị/giờ" tính theo `(IP + UA)`.
- `tests/e2e/db.ts` chỉ dùng để **DỰNG/DỌN fixture** (đọc `DATABASE_URL` từ `.env`); mọi khẳng định
  vẫn đi qua HTTP.
- **Dọn user E2E một lần ở CUỐI file** — xoá giữa chừng làm mỗi lần định danh sau bị tính là "tạo
  định danh MỚI" và đâm trần rate limit.
- `fileParallelism: false`, `testTimeout` 30s (server + DB thật chậm hơn unit test nhiều).

**Khoảng trống còn lại:** chưa có test tích hợp route handler chạy trên DB tạm (testcontainers) và
chưa có E2E trình duyệt (Playwright) cho luồng xương sống §2. Xem
[`20`](20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md) §3.

Khi thêm test mới: `tests/**/*.test.ts(x)`, alias `@` → `src` đã cấu hình. Test giao diện nhớ khai
`// @vitest-environment jsdom` ở dòng đầu để không đổi môi trường của bộ test logic.

---

## 2. Kịch bản E2E thủ công (chạy trước mỗi release)

Chuẩn bị: DB sạch → `pnpm migrate && pnpm seed`, hoặc môi trường staging.

### E2E-1 · Luồng xương sống (bắt buộc)

| # | Thao tác | Kỳ vọng |
|---|---|---|
| 1 | Mở trang chủ ẩn danh | Thấy slider khu phố tiêu biểu, 3 con số, `IssueBoard` 3 tab, 6 biển. **Không** bị hỏi SĐT. ~~bản đồ, pin~~ |
| 2 | Bấm nav "Đề xuất khu phố cần treo biển" | **Mở THẲNG popup đề xuất** (bước 1/2 chọn chủ đề) — **không** bung modal định danh |
| 3 | Chọn chủ đề → bước 2/2: chọn tỉnh + phường, nhập tên khu phố, mô tả → Gửi đề xuất | Lúc này mới hiện modal định danh; nhập SĐT + tên + khu phố + **tỉnh/thành** xong thì đề xuất tự gửi tiếp |
| 4 | Gửi đề xuất | Toast "…đã vào danh sách chờ duyệt"; **trang chủ chưa hiện đề xuất này** |
| 5 | Admin `/admin/khu-pho?tab=de-xuat` → Duyệt | Góc xóm hiện ở **tab 1** của `IssueBoard`, meta "Chưa có câu đề xuất"; người đề xuất +2đ (kiểm bằng psql trên `score_events`) |
| 6 | Cư dân bấm `Gửi lời nhắc` ở tab 1, viết câu ≤120 ký tự, gửi | Toast "vào hàng chờ duyệt"; **câu chưa hiện ở đâu** |
| 7 | Admin `/admin/loi-nhac`: tick 3/4 ô | Nút "Duyệt hiển thị" **vẫn disabled** |
| 8 | Tick đủ 4 ô → Duyệt | Câu hiện ở **tab 2** (`Lời nhắc chờ bạn bình chọn`); góc xóm **biến mất khỏi tab 1** (đã có câu); tác giả +5đ |
| 9 | Cư dân **khác** bấm `Bình chọn` ngay tại dòng tab 2 | Số tăng ngay (optimistic), tác giả +1đ, **nút khoá thành "Đã bình chọn"** |
| 9b | Bấm lại lần nữa (hoặc gọi thẳng API) | **409 `ALREADY_VOTED`** — không rút phiếu được (Q6) |
| 10 | Chính tác giả bấm `Bình chọn` câu mình | Nút **disabled**; gọi API trực tiếp → 409 `SELF_VOTE` |
| 10b | Bấm CTA `+ Viết câu nhắc của riêng bạn` | Mở popup **"Chọn góc phố"** trước, **không** tự lấy góc phố đầu tiên |
| 11 | Admin `/admin/loi-nhac?tab=bien`: chọn câu cao phiếu nhất | Chuyển "Đã chọn", không cần lý do |
| 12 | Admin chọn câu **không** cao phiếu nhất | Bắt buộc nhập lý do mới cho chọn |
| 13 | Đưa sản xuất → upload ảnh biển → "Đã treo biển" | Góc phố "Đã có biển", counter "biển đã treo" +1, tác giả +30đ |
| 14 | Cư dân tác giả tải lại trang chủ | Hiện **banner báo tin vui in-web** kèm nút Chia sẻ. **Không có SMS nào được gửi** |
| 15 | Bấm Chia sẻ → `/bien/{id}` | Hiện câu, tác giả, địa điểm, ảnh biển; OG preview đúng |
| 16 | Admin bật công tắc "Đạt chuẩn 4N" ở `/admin/khu-pho` | Bật được **không cần** đủ 100% biển (bỏ điều kiện 7/9); trang `/khu-pho/{slug}` hiện huy hiệu |
| 17 | Admin bật "Khu phố tiêu biểu" + xếp **slot slide 5** | Khu ra slider hero đúng vị trí. Xếp trùng slot khu khác ⇒ **hoán đổi**, thông báo nói rõ ca nào |
| 18 | Admin bấm **🗑 Xoá** khu phố đó | Khu biến mất khỏi trang chủ, ô tra cứu, `IssueBoard`, khối biển; `/khu-pho/{slug}` → **404**. Sang tab **🗑 Đã xoá** bấm khôi phục ⇒ khu về nhưng **đang ẩn**, điểm/câu/phiếu nguyên vẹn |

### E2E-2 · Bảo mật & quyền riêng tư

| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | Mở DevTools → Application → Cookies | Chỉ có `kp_session` (HttpOnly), `kp_csrf` (đọc được). **Không có SĐT ở đâu** |
| 2 | Xem toàn bộ response mạng của trang chủ | Không có `phone`, `phone_hash`, `phone_encrypted` |
| 3 | Gọi POST bất kỳ **không** kèm header `x-csrf-token` | 403 |
| 4 | Gọi API ghi khi chưa định danh | 401 |
| 5 | Truy cập `/api/img/private/…` (bất kỳ key nào không bắt đầu `public/`) | **404** |
| 6 | Truy cập `/admin/…` khi chưa đăng nhập | Chuyển hướng `/admin/login`; gọi thẳng API admin → 401 |
| 7 | Đăng nhập admin bằng email không phải `@fpt.com` (kể cả nếu tồn tại trong DB) | 401, thông báo chung chung |
| 8 | Sai mật khẩu 5 lần | Lần thứ 6 trả **423** (khoá 15 phút) |
| 9 | `curl -s https://…/robots.txt` | Disallow `/admin` và `/api` |
| 10 | `curl -I https://…` | Có HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy |
| 11 | Bấm hiện SĐT ở `/admin/leads`, rồi query `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5` | Có dòng `lead_phone_reveal` |
| 12 | Export CSV leads → kiểm audit_logs | Có dòng `leads_export_csv` kèm `{"count": n}` |

### E2E-3 · Lead & opt-in

| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | Mở khối "Ưu đãi cư dân" | Checkbox opt-in **mặc định KHÔNG tick** |
| 2 | Điền form, không tick, bấm gửi | Bị chặn ở client; gọi thẳng API → 400. **Không có bản ghi lead nào** |
| 3 | Tick rồi gửi | Thẻ cảm ơn 🧧; `/admin/leads` có bản ghi `Tầng 2`, SĐT hiển thị `090***567` |
| 1b | Ô **Tỉnh/thành phố** để trống rồi gửi | Bị chặn — tỉnh/thành **bắt buộc** từ 18/8 (server trả 400 nếu không thuộc danh mục 34 tỉnh) |
| 4 | Trong popup viết câu: tick opt-in tầng 1 | Hiện ô SĐT; lead `Tầng 1` được tạo |
| 5 | Gửi lead với SĐT **khác** số đã định danh | 409 + hộp xác nhận "Tiếp tục với số mới"; xác nhận → cấp phiên mới, dữ liệu 2 tài khoản không gộp |

### E2E-4 · Chống gian lận

| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | Cùng tài khoản bấm `Bình chọn` 2 lần cho một câu | Lần 2 trả **409 `ALREADY_VOTED`** — ~~bỏ thương (toggle)~~ đã bỏ (Q6); không tạo phiếu thứ hai |
| 1b | Admin sửa số thương ở `/admin/voting` (tăng rồi giảm) | Số công khai đổi theo; điểm tác giả cộng/thu hồi tương ứng; `audit_logs` có dòng `votes_adjust` kèm `{from,to}` |
| 2 | Shadow-ban một tài khoản rồi để tài khoản đó bấm thương | UI người đó **không đổi gì**; số lượt thương công khai **không tăng**; không sinh điểm |
| 3 | `/admin/gian-lan` sau khi chạy `pnpm seed:admin-demo` | Đủ 3 nhóm cảnh báo có dữ liệu |
| 4 | Bấm "Vô hiệu phiếu" | Số thương của các câu liên quan giảm; `score_events` tương ứng có `is_valid=false` (kiểm bằng psql — **không có màn `/admin/diem`**) |
| 5 | Đề xuất và duyệt 4 đề xuất trong cùng tuần cho một người | Đề xuất thứ 4 vẫn hiện công khai nhưng event ghi **+0đ** |

### E2E-5 · Ảnh & import

| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | Upload 4 ảnh tổng quan cho một khu ở `/admin/khu-pho` | Ảnh nào cũng ra **1280×720** (cùng cỡ), trang chủ chỉ dùng ảnh #1; upload ảnh thứ 5 → **409** |
| 2 | Upload ảnh chứng nhận khi khu **chưa** đạt 4N | Cho phép (migration 005 bỏ ràng buộc); thu hồi chứng nhận cũng **không xoá ảnh** |
| 3 | Upload file >10MB hoặc định dạng lạ | Bị từ chối với thông báo rõ ràng |
| 4 | Import khu phố: file có 1 dòng sai tên tỉnh, bấm Commit | **422**, không bản ghi nào được ghi |
| 5 | Import khu phố: tên trùng khu **đã xoá mềm** | Báo riêng *"trùng tên với khu phố ĐÃ XOÁ"*, hướng admin đi khôi phục |
| 6 | Import file **CSV UTF-8 không BOM** | Dấu tiếng Việt đúng (không ra `ThÃ nh phá»‘…`) — QC 2/9 · B1 |
| 7 | Import lời nhắc → Commit | Câu vào thẳng `approved` (4N tick đủ), góc phố chuyển `voting`, **không ai được cộng điểm** |

> ~~Upload ảnh bản đồ → bản cách điệu → đặt pin bằng click~~ — **màn bản đồ đã gỡ** (trang chủ bỏ
> bản đồ từ 1/8).

### E2E-6 · Giao diện & hiệu năng

| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | Thu trình duyệt còn **360px** | Không vỡ layout, không tràn ngang, mọi nút bấm được |
| 2 | Lighthouse trang chủ (mobile) | **LCP < 2.5s** |
| 3 | Bật "Reduce motion" trong OS | **Slider hero đứng yên hẳn** (không auto-slide 4s), popup không animate |
| 3b | Mở một popup rồi cuộn nền | Nền **không cuộn được**; đóng popup thì về đúng vị trí cũ. Mở modal định danh **chồng** lên popup khác: nó phải nằm TRÊN |
| 4 | Mở popup, nhấn Esc | Popup đóng |
| 5 | Ngắt mạng rồi chờ 20s (chu kỳ polling) | Dữ liệu cũ giữ nguyên, không màn hình trắng, không toast lỗi liên tục |
| 6 | Kiểm 3 link share bằng Facebook Sharing Debugger + Zalo debugger | Ảnh OG 1200×630 hiện đúng, tiêu đề/mô tả tiếng Việt đúng dấu |

---

## 3. Nghiệm thu theo 11 quy tắc cứng

| # | Quy tắc | Cách chứng minh |
|---|---|---|
| 1 | Không công khai trước duyệt | E2E-1 bước 4, 6 |
| 2 | Không chấm 4N tự động | E2E-1 bước 7–8 + `tests/four-n.test.ts` |
| 3 | Định danh không OTP, 1 phiếu/câu, cấm tự thương, lọc im lặng | E2E-1 bước 3, 10 · E2E-4 bước 1, 2 |
| 3b | Bảo mật SĐT | Toàn bộ E2E-2 |
| 4 | Sổ cái append-only + trần tuần | `tests/scoring.test.ts` · E2E-4 bước 5 · màn `/admin/diem` |
| 5 | Lead chỉ khi opt-in | E2E-3 bước 1–3 |
| 6 | Copy nguyên văn | So `src/lib/copy.ts` với `06-CONTENT-COPY.md` §2 (và bản duyệt 28/7) |
| 7 | `/admin` chặn index + đăng nhập chuẩn | E2E-2 bước 6–9 |
| 8 | Không SMS | Rà toàn repo: không có SDK/nhà cung cấp SMS nào. E2E-1 bước 14 |
| 9 | `basePath` bằng env | Build với `BASE_PATH=/khu-pho-biet-thuong` (giá trị production, chốt 8/9) → mọi link/asset/OG vẫn đúng. Kiểm cả `docker-compose.prod.yml` có truyền biến (CI build bằng file này) |
| 10 | Ảnh prefix `private/` chỉ admin đọc được | E2E-2 bước 5. *(Bản đồ + pin đã gỡ khỏi sản phẩm từ 1/8 — quy tắc vẫn áp cho mọi ảnh `private/`)* |
| 11 | Toàn bộ infra Docker, chỉ proxy mở port | `docker compose up -d` từ máy sạch chỉ với Docker + `.env`; `docker compose ps` xác nhận chỉ `proxy` publish port |

## 4. Definition of Done (bản checklist)

- [ ] Chạy được end-to-end: đề xuất → duyệt → viết câu → bình chọn → duyệt 4N → chọn câu → installed → counter + +30đ + banner in-web.
- [ ] Import khu phố và import lời nhắc từ file (validate → preview → commit all-or-nothing).
- [ ] ~~Upload ảnh bản đồ → bản cách điệu + đặt pin~~ — **hạng mục đã rút khỏi phạm vi** (bỏ bản đồ 1/8). Thay bằng: upload 4 ảnh tổng quan + 1 ảnh chứng nhận cho khu phố.
- [ ] Share URL + OG image đúng cho Đại sứ / biển đã treo / chứng nhận khu phố (test Facebook & Zalo debugger).
- [ ] `docker compose up -d` từ máy sạch (chỉ Docker + `.env`) dựng được toàn hệ thống; không service nào ngoài `proxy` mở port.
- [ ] Seed data tái hiện đúng các màn hình trong design.
- [ ] 3 test case điểm pass. Test 4N pass. Toàn bộ `pnpm test` (unit + UI jsdom) xanh.
- [ ] Mobile 360px không vỡ layout; **LCP trang chủ < 2.5s đo trên bản production** — ⚠️ **CHƯA LÀM**
  (mục C4 của QC 2/9): phải dừng dev server để `pnpm build && pnpm start` mới đo được.

## 5. Quy trình trước khi merge / release

```bash
pnpm test          # bắt buộc xanh (unit + UI jsdom)
pnpm build         # bắt buộc xanh (typecheck) — TẮT dev server trước
pnpm test:e2e      # khi có server chạy: 33 ca gọi thẳng HTTP
```

- [ ] Đã chạy đủ E2E-1 (luồng xương sống) trên môi trường dev/staging.
- [ ] Nếu chạm auth/SĐT/điểm → chạy thêm E2E-2 và/hoặc E2E-4, và soát checklist review ở [`14`](14-BAO-MAT-VA-QUYEN-RIENG-TU.md) §11.
- [ ] Nếu đổi schema → có file migration mới (không sửa `001_init.sql`), đã cập nhật [`12-DATA-DICTIONARY.md`](12-DATA-DICTIONARY.md).
- [ ] Nếu đổi API → đã cập nhật [`13-API-REFERENCE.md`](13-API-REFERENCE.md).
- [ ] Nếu đổi copy → đã có duyệt của PM và cập nhật `06-CONTENT-COPY.md` §2.2.
- [ ] Nếu đổi giao diện trang chủ → **đo lại bằng Chrome**, không tin số đo của jsdom; nếu thêm
      class `.kp-*` thì kiểm lại **thứ tự khai báo** trong `globals.css` (`tests/globals-css.test.ts`).
- [ ] Nếu thêm truy vấn công khai đụng `neighborhoods` → nhớ `deleted_at IS NULL`.
- [ ] Nếu sửa `/api/v1/issues`, `/api/v1/notes` hay `/api/v1/leaderboard` → **sửa cả SSR
      `src/app/page.tsx`** (dùng chung hàm/truy vấn; quên một bên là dòng nhảy chữ sau 20s polling).
