# CLAUDE.md — repo Khu Phố Của Tôi

**Đọc `docs/CLAUDE.md` trước** — đó là nguồn quy tắc cứng (4N thủ công, không OTP, không SMS,
bảo mật SĐT, Docker 4 service...). File này chỉ bổ sung thông tin triển khai thực tế.

## Lệnh

- `pnpm dev` · `pnpm build` · `pnpm test` (3 test case điểm 05 §4 phải pass)
- `pnpm migrate` / `pnpm seed` / `pnpm create-admin <email@fpt.com> <pass> [--totp]`
- Docker: `docker compose up -d --build` rồi `docker compose run --rm web node scripts/migrate.mjs`

## Điểm cần biết khi sửa code

- Mọi ghi điểm đi qua `src/lib/score-service.ts` (trần 3 đề xuất/tuần, shadow-ban → is_valid=false).
- Side-effects "installed" (issue→signed, +30đ, notification in-web) nằm ở `applyInstalledSideEffects` — gọi trong transaction PATCH /api/admin/suggestions/[id].
- CSRF double-submit: cookie `kp_csrf` + header `x-csrf-token` — client dùng helper `src/components/client-api.ts`.
- Copy tiếng Việt NGUYÊN VĂN ở `src/lib/copy.ts` (từ docs/06 §2) — không sửa lời.
- Ảnh: MinIO key `public/...` (route stream `/api/img/[...key]`) vs `private/...` (chỉ admin — ảnh bản đồ gốc Q3).
- ASSUMPTION đã ghi chú trong code: SĐT mã hoá AES gắn ở bảng `sessions` để tạo lead tầng 1
  không hỏi lại SĐT (hash một chiều không khôi phục được) — xem db/migrations/001_init.sql.
- Seed ưu tiên đúng CÔNG THỨC điểm; vài con số hiển thị trong design (52 thương của Bà Liên)
  mâu thuẫn công thức nên seed dùng số khớp điểm (45 thương → 82đ).
- Node scripts trong `scripts/` là .mjs thuần (không TS) để chạy được trong image production.
- Trang admin "Theo dõi thương" (`/admin/voting`): admin sửa số thương của câu/người qua
  `PATCH /api/admin/votes`. Tăng = phiếu `votes` thật với `source='admin'`, `user_id NULL`
  (migration 007) nên mọi query đếm votes không phải sửa; giảm = xoá phiếu admin trước rồi
  vô hiệu phiếu cư dân mới nhất. Điểm ghi/thu hồi kèm theo qua `recordVoteReceivedBulk` /
  `invalidateVoteReceivedBulk` (score-service), có audit_logs `votes_adjust`.

- Địa lý hành chính MỚI (1/7/2025): danh mục chính quy 34 tỉnh/thành + 3.321 phường/xã
  (Quyết định 19/2025/QĐ-TTg) nằm trong bảng `provinces`/`wards` (migration 009, tên chính
  thức "Thành phố Hồ Chí Minh"/"Tỉnh ..."). Client load qua GET `/api/v1/geo`
  (`?province=<mã|tên>` → wards) để CHỌN thay vì nhập tay (form đề xuất + admin Khu phố);
  validate server dùng `geoError()` async trong `src/lib/geo.ts` (vn-geo.ts tĩnh đã xoá).
  `neighborhoods.city/ward` vẫn lưu TÊN — không có phường trùng tên trong cùng tỉnh.

- Gộp màn admin (4/8): `/admin/de-xuat` → tab "Đề xuất góc phố" trong `/admin/khu-pho`
  (`components/admin/IssuesPanel.tsx`, xem được mọi trạng thái chứ không chỉ hàng chờ);
  `/admin/cau-nhac` đổi tên thành `/admin/loi-nhac` và nuốt luôn `/admin/bien` thành tab
  "Chọn câu & vòng đời biển" (`components/admin/SignsPanel.tsx`). 3 route cũ đã xoá.
  Mọi bộ lọc/tìm kiếm/phân trang của admin giữ trên query string qua `useUrlState`
  (`components/admin/table-tools.tsx` — kèm `SearchBox`, `Tabs`, `Th`, `Pager`): đọc URL
  sau khi mount rồi ghi bằng `history.replaceState` (KHÔNG dùng `useSearchParams` để
  không phải bọc Suspense). `/api/admin/issues` có filter + `q` + phân trang + `counts`
  theo trạng thái; `/api/admin/suggestions` phân trang khi truyền `per` (không truyền →
  trả hết, tab vòng đời biển cần vậy), luôn kèm `total`.

- Trang admin "Nội dung" (`/admin/noi-dung`): sửa text trang chủ (hero, khu "Câu chuyện
  chiến dịch" + video YouTube + ảnh KV, khối ưu đãi lead). Bảng `site_content` (migration
  008) CHỈ lưu ghi đè key–value — key vắng/xoá → fallback mặc định trong
  `src/lib/site-content.ts` (mặc định lấy từ copy.ts nên copy gốc vẫn là nguồn chuẩn).
  API: GET/PATCH `/api/admin/site-content`, ảnh KV POST/DELETE `/api/admin/site-content/kv`.
  Trang chủ SSR nội dung qua `getSiteContent()` → `HomeData.content`.

## Điều chỉnh 1/8 (`dieuchinh.1.8.xlsx` — sheet ACTION LIST; file ở Drive, xem docs/README §C)

- Danh mục còn ĐÚNG 6 chủ đề (`src/lib/taxonomy.ts`); migration 002 remap 8 mã cũ → 6 mã mới.
- Trang chủ KHÔNG còn bản đồ — thay bằng `NeighborhoodSlider` (slide ảnh khu phố, 3 tag trạng
  thái theo ORDER #2). Ảnh lấy từ `neighborhoods.photo_key`/`map_stylized_key`.
- Đề xuất góc phố: flow 5 bước trong `ProposeModal` — kèm câu nhắc tuỳ chọn
  (`suggested_content` → suggestions.submitted, admin thấy ở màn duyệt đề xuất; hàng duyệt câu
  lọc bỏ câu của issue chưa duyệt).
- Phường/xã chọn bằng `NeighborhoodPicker` (search + TỰ NHẬP free text). Free text → tạo
  neighborhood `hidden=true`, unhide khi admin duyệt đề xuất đầu tiên của khu đó.
- Notification in-web thêm 4 type: issue/suggestion × approved/rejected (wording #15 trong copy.ts).
- Popup lead "Tôi muốn nhận ưu đãi" (`LeadPromptModal`) hiện 1 lần/thiết bị sau đề xuất/viết câu/vote.
- Modal định danh z-50 (PHẢI trên drawer z-40) — fix vote "Thương" mobile bị che (#16).
- ~~TVC/KV demo ở `CampaignMedia.tsx`~~ — component XOÁ 2/9 (khối TVC bỏ khỏi trang chủ từ 18/8),
  4 khoá `campaign_*` gỡ nốt 4/9. Xem §"Dọn sau QC 4/9".
- Còn CHỜ ASSET từ team Design/trade: ảnh 20 khu phố (#1), biển bảng 6 chủ đề (#3),
  bảng chứng nhận chính thức (#9, #10) — flow upload theo sheet ORDER chưa dựng.

## Điều chỉnh 18/8 — SKIN MỚI (ảnh Figma) + email review (`admin_v1.pdf`) — cả hai ở Drive

Kế hoạch đầy đủ + 14 quyết định đã chốt: `docs/21-KE-HOACH-DIEU-CHINH-18-8.md`.

- **Da mới cam FPT**: đổi GIÁ TRỊ token trong `globals.css` (giữ nguyên tên `brick/cream/…`)
  nên admin đổi màu theo luôn. Nút CTA chính giờ là **viền cam nền trắng** (`.kp-btn-primary`);
  `.kp-btn-solid` mới dành cho khối cam đặc; `.kp-btn-vote` xanh dương cho nút "Bình chọn".
  Asset thương hiệu nén sẵn ở `public/brand/*.webp`.
- **Trang chủ đổi bố cục**: hero cam (slider CHỈ khu đạt chuẩn 4N + KV + ô tra cứu 4N chuyển
  từ cột phải lên) → 3 con số (`biển · khu phố · câu đóng góp`) → `IssueBoard` → 6 biển mới →
  khối ưu đãi → footer. Bỏ khối TVC, khối chứng nhận cột phải, bản đồ.
- **`IssueBoard` nuốt cả bảng xếp hạng**: 1 card sọc cam, 3 tab (chờ viết lời nhắc / chờ bình
  chọn / cây bút), 5 dòng/trang. `IssueList.tsx` + `Leaderboard.tsx` đã XOÁ.
- **Drawer góc xóm tách đôi**: `SuggestModal` (viết câu, có ô SĐT khi tick nhận ưu đãi) và
  `VoteModal` (danh sách câu để bình chọn — giữ nguyên luật 1 phiếu/câu, cấm tự thương).
  `IssueDrawer.tsx` đã XOÁ; `ui.tsx` bỏ `Drawer`/`HangSign`/`Eyebrow`, thêm `Modal`/`Stripe`.
- **Biển render bằng HTML/CSS** (`components/home/SignCard.tsx`) thay vì ảnh upload — dùng
  chung với preview lúc admin duyệt câu. Text banner khuyến mãi + hotline sửa ở `/admin/noi-dung`.
- **Bắt buộc tỉnh/thành**: modal định danh và khối ưu đãi đều phải có tỉnh (validate `geoError()`
  ở server). Sửa luôn bug `/api/v1/auth/identify` gọi `resolveNeighborhoodId` thiếu tham số geo
  nên khu phố tự nhập luôn lưu `city = NULL`.
- **`leads` thêm `province` + `address`** (migration 010) → `/admin/leads` có 2 cột mới, lọc theo
  tỉnh, CSV xuất thêm 2 cột.
- **Nút "Đề xuất góc phố mới" mở THẲNG form** (trước gọi `requireIdentity` nên bung modal
  "Để FPT gửi ưu đãi…" — team review tưởng ra nhầm popup ưu đãi); định danh hỏi ở bước Gửi.
- **Hồ sơ khu phố là POPUP** (`components/home/NeighborhoodModal.tsx`): ô tra cứu 4N
  (nút "Xem khu phố"), pill địa chỉ trên slider hero và deep-link `/?khu-pho=<slug>` đều mở
  popup chứ không rời trang. Ruột popup là `NeighborhoodView.tsx` — DÙNG CHUNG với trang
  share `/khu-pho/[slug]` (link chia sẻ ra ngoài vẫn cần URL thật cho OG). Dữ liệu một
  loader duy nhất `src/lib/neighborhood.ts` (ảnh + tiến độ 4N + 4 biển mới nhất), phục vụ
  cả `GET /api/v1/neighborhoods/{idOrSlug}` lẫn trang share.
- **site_content đổi bộ key** theo khối của design (`hero_title`, `board_*`, `signs_title`,
  `sign_promo_*`, `footer_*`); video TVC thành DANH SÁCH `campaign_youtube_ids` (phát lần lượt),
  key cũ `campaign_youtube_id` vẫn đọc được làm fallback.

## Nguồn design CHUẨN: docs/lp/LandingpageFCM.fig (18/8)

Từ nay đối chiếu giao diện trang chủ với FILE FIGMA, không đo bằng mắt trên PNG nữa.

- `.fig` là ZIP: `canvas.fig` (Kiwi + **Zstandard**) + `images/` (767 ảnh gốc) + `meta.json`.
- Bộ giải mã tự viết ở `scripts/figma/` — chạy `python3 scripts/figma/dump.py 7217:1990`
  in ra cây node kèm x/y/w/h, màu, bo góc, viền, font. **Không còn bản dump sẵn trong
  repo** (`docs/lp/figma-frame-7217-1990.txt` gỡ 8/9) — lấy `.fig` ở Drive rồi
  `parse.py` + `dump.py` sinh lại; frame chuẩn hiện cao 3780, không phải 4450.
- BẪY khi tự đọc Kiwi: `uint64` KHÔNG phải LEB128 thuần — 8 nhóm 7 bit rồi byte thứ 9
  lấy trọn 8 bit. Đọc sai là lệch cả stream (xem `scripts/figma/kiwi.py`).
- Số chuẩn: khối nội dung rộng **1276** (lề 82) · hero cao **900**, gradient
  `#FF7B00 → #FFEFE6` · thanh nav trắng **10%** viền `#FFEBB8` · chữ `#3D3D3D`,
  chữ mờ `#969696`, kẻ `#DEDEDE`, cam `#FF8206`, xanh `#2323FF`.
- Asset đã nén sẵn vào `public/brand/`: `skyline` · `plaza` · `kv-khu-pho` ·
  `signpost` · `hero-arc` · `sign-logos` (cắt từ layer "INT - EPL-01 1" 4096×2731 để
  `SignCard` dùng logo FPT thật). `kv-khu-pho-sm` và `sign-fptplay` đã XOÁ ngày 8/9
  (mồ côi từ 2/9 và 3/9) — lấy lại từ `.fig` trên Drive nếu Design cần.
- Font **FPT SongVui** (nguồn `docs/lp/font_FPT_songvui.zip`) đã chuyển sang woff2 ở
  `public/fonts/` — 6 face, Light 300 / Regular 400 / Bold 700 (+ nghiêng).
  KHÔNG dùng `font-extrabold`/`font-semibold` ở trang chủ: SongVui không có 600/800 nên
  trình duyệt giả đậm, nét bệt và sai mặt chữ. Body/hint/meta trong design là **Light**.
- **Đối chiếu lại 18/8 (review ảnh chú thích của team)** — số đo đã sửa vào code:
  · Thanh nav là HAI mảnh Subtract (gộp 1276×60 từ x=82), bị **khoét cung r=60** quanh pill
    logo (tâm ±48px so với tâm thanh, cách đỉnh thanh 26px = viền pill nới ra 12px). Khoét
    bằng `mask` (`.kp-nav-cut`), nét cung vẽ bù bằng 2 vòng tròn 120×120 bị `overflow-hidden`
    cắt. Viền `#FFEBB8` **mờ dần** về hai đầu bo tròn (`.kp-nav-line`, đo alpha trên lp1.png:
    0 ở x=169 → 1.0 ở x=610, 1.0 ở x=838 → 0 ở x=1270). Chữ trái bắt đầu x=189 (lề 107px),
    lề phải 14px.
  · Badge "KHU PHỐ TIÊU BIỂU" **nghiêng -2°** (hộp 213×55, gốc xoay ở góc trên trái đặt tại
    (283.8, 285.4)). Khung ảnh slider là **trắng 50% + viền trắng 1.5px** (không phải trắng
    đặc, không bóng). Mũi tên 40×40 nền trắng 50%, chevron cam, tâm (260/1180, 522).
  · Hero còn 3 hình rời trước đây bị thiếu, nay lấy từ `.fig` → `public/brand/`:
    `signpost.webp` ("06 2" 1135.2/646/176.8×308.6), `sweepers.webp` ("02 2" 1238.2/708/
    160.5×187.5), `cart.webp` ("01 1" 10/739/236×171) — đều nằm DƯỚI lớp KV.
  · Line-height trong .fig là số ĐO ĐƯỢC, không phải "auto" của trình duyệt: tiêu đề hero
    56px, tiêu đề section 52px, tiêu đề khối ưu đãi 60px, số đếm 60px→lh 78. `.kp-h2` khai
    báo ngoài @layer nên utility `leading-*` KHÔNG đè được → dùng `.kp-hero-title`,
    `.kp-sec-title`, `.kp-lead-title`.
  · Nhịp dọc chuẩn (khổ 1440): ô tra cứu y=1140 · 3 con số y=1209 · tiêu đề "Đóng góp"
    y=1357 · tab y=1474 · card y=1556 h=550 · tiêu đề "Lời nhắc" y=2186 · lưới biển y=2278 ·
    panel ưu đãi y=3054 (full-bleed, bo 40px hai góc trên) · tiêu đề ưu đãi y=3101.
- **Logo lockup** "Khu phố biết thương": Design đã export `docs/lp/logo.svg` (pill trắng
  192×96 + hình logo). Đã tách RIÊNG phần hình (2 path: nền trắng + `#FF8206`) ra
  `public/brand/logo-khu-pho.svg` — viewBox `29.5 11.7 133 71.2`, toạ độ làm tròn 2 số lẻ
  (97KB → 75KB). Pill vẫn dựng bằng CSS trong `HomeShell` nên 1 file dùng cho cả 2 chỗ:
  top bar (133×71 trong pill) và footer (rộng 23% khối KV, `margin-top: -9.16%` để đè lên
  đáy KV đúng tỷ lệ .fig: logo 286.5×153.2 thò xuống 39.2px).
  `public/brand/sign-logos.webp` vẫn dùng bản cắt từ artwork nên không cần đổi.

## Điều chỉnh 2/9 — bám Figma 100% + quy chuẩn mobile

Link design chuẩn: `figma.com/design/FMiW4tzQvKgi8qomzYFlff/...?node-id=7217-1989`.
**`7217:1989` là một PAGE, không phải frame** — trong đó section "Design" có 6 frame:
`7217:1990` + `7458:38738` (landing 1440×4450, khác nhau ở tab đang chọn) và 4 frame
1440×1024 chứa popup: `7458:40650` (đề xuất 1/2) · `7458:41331` (đề xuất 2/2) ·
`7458:41901` (gửi câu nhắc) · `7502:831` (định danh/ưu đãi).

- **Đọc lại `.fig`**: `python3 scripts/figma/parse.py` (sinh `nodes.pkl`, ~40s) rồi
  `python3 scripts/figma/dump.py <node-id> [maxdepth]`. `parse.py` mới bổ sung: chunk
  SCHEMA nén **raw deflate**, chunk DATA nén **zstd** — nhầm cái nào cũng vỡ stream.
- **`dump.py` KHÔNG lọc `visible=false`**: dải con số ở hero có node ẩn "+300 Người đóng
  góp" — design thật chỉ 3 ô (`Biển đã treo · Góc phố đang chờ · Khu phố tham gia`).
- **Quyết định: DESIGN THẮNG SPEC** (chi tiết + danh sách 4 khối chữ bị gỡ:
  `docs/20` §2.1). Chuỗi bị gỡ vẫn nằm trong `copy.ts` để bật lại được.
- **Khung modal** (`ui.tsx`): mọi popup rộng **700**, viền **2px #FF8206**, lề trong 32,
  tiêu đề **25px Regular** (KHÔNG bold), nút ‹/× 35×35 dạng icon, dải sọc `.kp-stripe-b`
  cao 12 nằm TRONG khung. Prop `wide` đã bỏ.
- **Hai cỡ ô nhập**: `.kp-input` (cao 40, chữ 14 — khối ưu đãi) và `.kp-input-lg`
  (cao 50 / textarea 90, chữ 16 — trong popup). `Field size="lg"` cho nhãn 16px Bold.
- **Quy chuẩn mobile** (design KHÔNG có frame mobile, team dev tự đặt):
  breakpoint `sm=640` · lề ngang 16px, **không phần tử nào chạm mép** · ô nhập 16px
  (chống iOS auto-zoom) · vùng chạm ≥44px · modal = bottom sheet bo trên 24 có tay nắm,
  ẩn dải sọc · mũi tên slider nằm trong khung · dải con số 1 hàng 3 cột (số trên, nhãn
  dưới) · top bar rút gọn nhãn CTA còn "+ Đề xuất" và thu nhỏ pill logo để không đè nhau.
- **Test giao diện**: `tests/ui/*.test.tsx` chạy jsdom (`@vitest-environment jsdom` ở
  đầu file; bộ test logic cũ vẫn môi trường `node`). Dev-dep mới: `jsdom`,
  `@testing-library/react`, `@testing-library/dom`. jsdom KHÔNG tính layout/media query
  → số đo mobile & popup phải đo bằng DOM thật trong trình duyệt, đừng tin test suông.
- Đã xoá: `CampaignMedia.tsx` (khối TVC bỏ khỏi trang chủ từ 18/8, 0 tham chiếu) và 10
  class CSS chết trong `globals.css` (`kp-drawer`, `kp-scrim`, `kp-quote`, `kp-pin`,
  `kp-pin-sign`, `kp-kicker`, `kp-card`, `kp-card-3`, `kp-sway`, `floaty`).

## Sửa lỗi QC 2/9 (docs/QC-02-09-2026.md)

Đã sửa A1–A3, B1–B4, C1–C3. Còn **C4 (đo LCP bản production)** vì phải dừng dev server để
`pnpm build && pnpm start` — chưa làm, xem QC §E-a.

- **A1**: nền hero là `absolute` nên mọi con `static` trong cùng stacking context bị vẽ đè.
  Khối banner báo tin phải có `relative` (`HomeShell.tsx`). Bẫy này áp cho MỌI khối mới đặt
  trong `<div className="relative">` bọc hero.
- **A2**: tab "Cây bút của khu phố" giờ là NGƯỜI (quyết định F3). `page.tsx` gọi thêm
  `getAmbassadors(10)` → `HomeData.ambassadors` → `IssueBoard`; `refresh()` polling kéo luôn
  `/api/v1/leaderboard`. Hai tab đầu vẫn là góc phố. Dòng người dùng `sm:min-h-[82px]`
  (KHÔNG chốt `h-`) vì có thêm dòng câu trích.
- **A3**: bố cục nav lấy số đo Figma khổ 1440 nên chỉ bật từ `xl` (hai link) và `lg`
  (nhãn CTA đầy đủ). Đo lại 375→1440: không còn chồng lấn.
- **B1**: `@/lib/spreadsheet` — CSV phải tự giải mã UTF-8 (`XLSX.read(string)`), SheetJS
  không có `cptable` sẽ đoán latin-1 cho CSV không BOM. Dùng ở cả 2 route import.
- **B2**: ô "ngày treo" trong `SignsPanel` là `Record<id, string>`, không phải một biến chung.
- **B3**: `/admin/khu-pho` + `/admin/loi-nhac` có cờ `loaded` → "Đang tải…" thay vì loé
  thông báo rỗng ở khung hình đầu.
- **B4**: `components/home/UserMenu.tsx` — avatar là `<button>` mở menu (tên · điểm ·
  Đăng xuất). Bản tối giản vì câu hỏi F5 (docs/21) vẫn treo.
- **C1**: `.kp-h2` ngoài `@layer` đè cả `letter-spacing` chứ không chỉ `line-height` →
  thêm `.kp-hero-title/.kp-sec-title/.kp-lead-title` (khai báo SAU `.kp-h2`).
- **C2**: `.kp-input` chốt `height` (44 mobile → 40 từ sm) và **phải nhả `min-height: 0`**
  ở sm, nếu không `.tap` (min-height 44) đè mất.
- **C3**: `NeighborhoodSlider` đọc `prefers-reduced-motion` để tắt auto-slide; CSS
  `motion-reduce:transition-none` chỉ tắt hiệu ứng trượt, ảnh vẫn nhảy.

### Kiểm thử

- `pnpm test` — unit + UI (jsdom). Test mới: `tests/spreadsheet.test.ts`,
  `tests/globals-css.test.ts` (đọc thẳng `globals.css`: khai báo có tồn tại và có đứng
  SAU `.kp-h2` không), `tests/ui/{issue-board,user-menu,home-shell,slider-motion,signs-panel,admin-loading}.test.tsx`.
- `pnpm test:e2e` — gọi THẲNG server đang chạy (`E2E_BASE_URL`, mặc định
  `http://localhost:3001`), không mock gì; tự SKIP khi không thấy server.
  `tests/e2e/client.ts` là cookie jar + CSRF double-submit; mỗi Client có User-Agent
  riêng vì trần "3 SĐT mới/thiết bị/giờ" tính theo (IP + UA). `tests/e2e/db.ts` chỉ dùng
  để DỰNG/DỌN fixture (đọc `DATABASE_URL` từ `.env`), mọi khẳng định vẫn đi qua HTTP.
  Dọn user E2E một lần ở CUỐI file — xoá giữa chừng làm mỗi lần định danh sau bị tính là
  "tạo định danh MỚI" và đâm trần rate limit.
- Số đo px / media query / prefers-reduced-motion đo bằng DOM thật trong Chrome (jsdom
  không tính layout). Mẹo dùng lại được: dựng `<iframe src="/" width=...>` rồi đo trong
  `contentDocument` — media query ăn theo bề ngang iframe, và vá `matchMedia`/`fetch` của
  `contentWindow` trước khi trang hydrate để giả lập giảm chuyển động / mạng chậm.

## Figma BẢN MỚI 2/9 — design đã đổi, code chưa theo

**Đọc `docs/22-QC-FIGMA-MOI-02-09.md` trước khi động vào trang chủ.** File `.fig` 18/8 đã bị
xoá và thay bằng bản mới (`docs/lp/LandingpageFCM.fig`, upload 2/9) + 5 ảnh export
`docs/lp/Landing page*.png`. Frame chuẩn `7217:1990` giờ cao **3780** (cũ 4450).

- Parse lại: `rm scripts/figma/nodes.pkl && python3 scripts/figma/parse.py` rồi
  `python3 scripts/figma/dump.py 7217:1990 [depth]`.
- **Design đã BỎ khối KV + logo ở chân trang** (`Frame 202` bị `visible=false`) — web vẫn render
  `kv-khu-pho-sm.webp` nên dư ~887px. Đây là lỗi team báo đầu tiên.
- Đổi nhiều chữ/bố cục: nhãn nav, nhãn 3 con số, 3 nhãn tab, mô tả khối đóng góp thành 2 dòng,
  dòng danh sách khác nhau theo tab, 6 lựa chọn dịch vụ ở khối ưu đãi, nút "Lên đầu trang",
  kẻ ngăn dòng là **nét đứt [5,5]** chứ không liền. Chi tiết + số đo trong docs/22.
- 2 popup MỚI chưa dựng: `Cây bút khu phố` (7727:1743) · `Thông tin khu phố` (7756:2954).
- **BẪY**: `dump.py` không lọc `visible=false` VÀ không resolve text override của INSTANCE →
  nhãn nút/tab phải đọc từ ảnh PNG, chỉ tin `.fig` ở toạ độ/màu/kích thước.
- Design chưa đồng bộ: 6 frame popup còn nhãn nav CŨ, 3 frame landing còn nhãn 3 con số CŨ.
  Lấy `7217:1990` làm chuẩn, phần mâu thuẫn phải hỏi lại Design (danh sách câu hỏi ở docs/22 §E.3).

## Đã áp Figma 2/9 (ngày 2–3/9) — 7 quyết định + phần còn treo

Toàn bộ mục A, B1–B10, C1–C5 của `docs/22` đã làm. 7 câu chặn đã chốt:

| # | Chốt |
|---|---|
| Q1 | Nav: `Đóng góp lời nhắc` cuộn `#goc-xom` · `Đề xuất khu phố cần treo biển` **mở popup đề xuất** · CTA `Ưu đãi dành cho cư dân` cuộn `#uu-dai`. Dưới 1280px hai link ẩn ⇒ nav mobile KHÔNG còn lối vào đề xuất (vào từ nút đáy IssueBoard / tra cứu rỗng) |
| Q2 | Avatar giữ "chỉ hiện khi đã định danh" — lệch Figma có chủ ý |
| Q3 | `INTERESTS` giữ 4 MÃ cũ, chỉ đổi nhãn + thêm `camera`, `internet_tv_camera`. Không migration. Nhãn `fpt_play` đổi thành "Truyền hình FPT Play" nên lead cũ hiện theo nhãn mới |
| Q4 | Chip 4N chỉ trang trí + chú thích, KHÔNG cho chọn, không lưu DB (test khoá: chip không phải `<button>`) |
| Q5 | `NeighborhoodView` đổi theo design mới cho cả popup lẫn trang share, nhưng trang share bật prop `hero` để giữ ảnh + badge 4N (nội dung chứng nhận + ảnh OG) |
| Q6 | **Cấm rút phiếu**: cả 2 route vote trả 409 `ALREADY_VOTED`; UI khoá nút sau khi bấm |
| Q7 | Tab 3 bỏ `Chia sẻ ↗`, dùng `Bình chọn` mở popup Cây bút. `/dai-su/[slug]` vẫn sống nhưng KHÔNG còn lối vào từ trang chủ |

### Bẫy mới phát hiện khi đo trên Chrome

- **`scroll-behavior: smooth` toàn cục** ⇒ `window.scrollTo(0, y)` dạng 2 tham số bị cuộn
  MƯỢT và bị cắt ngang giữa đường. Đây chính là C3. Mọi lệnh cuộn "phải tới nơi" bắt buộc
  dùng `scrollTo({ top, behavior: "instant" })`. Xem `lockScroll`/`unlockScroll` (`ui.tsx`).
- Khoá cuộn nền dùng `position: fixed; top: -scrollY` (không phải `overflow:hidden` — iOS
  Safari vẫn cuộn) + **đếm số modal đang mở**: modal định danh mở chồng, nhả khoá sớm là
  nền cuộn được trong khi vẫn còn popup.
- Đo bằng iframe thì **cộng thêm 17px** cho thanh cuộn: `width:1457px` mới ra `clientWidth`
  1440. Iframe cũng không cuộn được bằng `scrollTo` khi trang có `scroll-behavior: smooth`.

### API đổi / thêm

- `GET /api/v1/issues` + SSR `page.tsx` trả thêm `top_author_name`; `getAmbassadors()` trả
  thêm `suggestions_count`. **Sửa route mà quên SSR (hoặc ngược lại) là dòng nhảy chữ sau
  20s polling.**
- `GET /api/v1/ambassadors/{share_slug}` (MỚI) → `src/lib/ambassador.ts`, cho popup B10.
- `loadNeighborhoodDetail(key, viewerId)` — thêm tham số người xem; `NeighborhoodDetail.signs`
  → `notes` (status/votes/voted/is_mine).
- `POST /api/v1/suggestions/{id}/vote` và `/api/v1/issues/{id}/vote`: đã bỏ nhánh rút phiếu.
  `/api/v1/issues/{id}/vote` **không còn client nào gọi** — giữ vì là API công khai.
- `wardAddress()` trong `address.ts`: dạng "Phường Bàn Cờ, TP. Hồ Chí Minh" mà .fig dùng ở
  B3a/B9/B10 (khác `shortAddress` — không rút "Phường"→"P.", không bỏ phần trùng tên khu).

### Khối biển: bản 2/9 BỎ dải khuyến mãi (docs/22 §B5 ghi thiếu)

§B5 kết luận "khớp, không cần sửa" nhưng chỉ đối chiếu TOẠ ĐỘ y=2186, không đối chiếu
chiều cao — đo ra khối biển cao 872 vs 648. Đọc lại `.fig`: `INT - EPL-01 1` xuống
**404×199** (cũ 404×269), và ảnh export cho thấy panel trắng nở ra chiếm ~95% chiều cao,
**dải khuyến mãi ở đáy biến mất** (ô QR fpt.vn · 2 dòng banner · 2 chip số · artwork
FPT Play), chỉ sót một mảng vàng cụt ở góc phải dưới — tàn dư crop của Design.

Quyết định 3/9: bỏ hẳn dải khuyến mãi, **gỡ luôn 4 khoá site_content** đổ vào nó
(`sign_promo_line1/2`, `sign_sale_phone`, `sign_hotline`) để không để lại trường chết ở
`/admin/noi-dung`. `SITE_TEXT_KEYS` sinh từ `SITE_CONTENT_DEFAULTS` nên API admin tự bỏ
4 khoá này; hàng cũ trong bảng `site_content` (nếu có) chỉ bị lơ đi, không cần migration.
`SignCard` mất prop `promo` ⇒ `NeighborhoodView` cũng bỏ theo.

- **Cỡ chữ câu nhắc phải co theo độ dài** (`fontSizeFor`): design chỉ vẽ câu 2 dòng nên
  chữ rất to (~9.6cqw), câu thật tới 120 ký tự sẽ tràn khỏi panel thấp 199 — đo trên
  Chrome thấy câu 3–4 dòng bị cắt cụt đáy. Ba bậc 9.6 / 7.4 / 6.2 cqw.
- `public/brand/sign-fptplay.webp` (21KB) thành **mồ côi** → đã xoá khỏi repo ngày 8/9.
  Design muốn khôi phục dải khuyến mãi thì cắt lại từ `.fig` (layer "INT - EPL-01 1").
- Sau khi sửa: biển 403×198 (Figma 404×199), ô 260 (262), lưới 553 (556), **trang 3853 vs
  3780 — còn dư 73px** (đầu phiên là 887).

### CÒN TREO — phải hỏi Design/BA

1. ~~**Chân trang dài hơn design**~~ (chốt 4/9: giữ nguyên) — bỏ qua mục này. Nội dung cũ:: khối chữ 697×134 (5 dòng) vs .fig 697×84 (~3 dòng) — dòng
   `footer_support` ("Đã là khách hàng của FPT…") chiếm 2 dòng. Design có bỏ dòng này không?
2. ~~**Dropdown tra cứu 1 kết quả**~~ (chốt 7/9: hai câu theo `notes_count`, xem mục dưới).
3. Sáu frame popup trong .fig vẫn còn nhãn nav CŨ — chưa đồng bộ với `7217:1990`.

## Figma LIVE 4/9 — file trên figma.com ĐÃ ĐI TRƯỚC bản `.fig` trong repo

`docs/lp/LandingpageFCM.fig` (lưu 2/9 22:34) **không còn khớp file trên figma.com**.
Bằng chứng đo được (không phải suy đoán) — cùng node id, khác hẳn:

| Node | Trong `.fig` local | Render live 4/9 |
|---|---|---|
| `7651:1537` nút mỗi dòng tab 2 | `Button 4/5`, viền **#FF8206**, w=**137** (Xem câu nhắc) | viền **xanh #2323FF**, nhãn **Bình chọn** |
| `7458:38738` nút mỗi dòng tab 3 | `Button 3/4`, viền **#2323FF**, w=**120** (Bình chọn) | viền **cam**, nhãn **Xem lời nhắc** |

(File local có 11 frame tên "Landing page", live có 12 — chênh 1 frame, không phải 5→12.)
Ảnh export `docs/lp/Landing page*.png` (2/9 22:17) còn CŨ HƠN cả `.fig` → đây chính là thứ
làm phiên QC 2/9 đọc sai nhãn nút. Trước khi đo px lại phải xin Design export `.fig` mới,
hoặc đọc trực tiếp như dưới đây.

**Cách đọc Figma live bằng Claude-in-Chrome** (đã chạy được, quyền figma.com có sẵn):
- Canvas đọc rất khó (zoom bằng phím/nút không ăn khi focus ở panel). Dùng **chế độ
  prototype**: `figma.com/proto/<file>?node-id=<a-b>&scaling=min-zoom&content-scaling=fixed`
  → khung render ~1200px, chữ đọc được.
- Prototype **không cuộn** bằng `computer.scroll`; phải bắn wheel vào canvas:
  `document.querySelector('canvas').dispatchEvent(new WheelEvent('wheel',{deltaY:130,bubbles:true}))`.
  Thêm `ctrlKey:true` là zoom (một nấc ≈ ×4.7 — rất nhạy).
- **Đừng bấm vào panel phải ở góc %**: trúng tab Comments và bật công cụ bình luận;
  bấm nhầm lên canvas lúc đó là tạo comment thật trong file của khách.

### Ba khác biệt LIVE vs `.fig` 2/9 (đã áp code ngày 4/9)

| Khối | .fig 2/9 | Figma live 4/9 |
|---|---|---|
| Tab 2 | dòng là **GÓC PHỐ**, nút `Xem câu nhắc` mở popup danh sách câu | dòng là **CÂU NHẮC**: tiêu đề = nội dung câu, meta `phường · tác giả · N Bình chọn`, nút **`Bình chọn`** viền xanh bấm thẳng tại dòng |
| Tab 3 | nút `Bình chọn` viền xanh | nút **`Xem lời nhắc`** viền cam (vẫn mở popup Cây bút) |
| Q6 | — | giữ nguyên: đã bình chọn là **chốt**, nút khoá thành `Đã bình chọn`, route trả 409 |

- Dữ liệu tab 2 lấy từ `src/lib/notes.ts` (`getVotingNotes`) — câu `status='approved'` của
  góc phố `waiting|voting`, xếp **chưa-bình-chọn trước → nhiều thương → mới nhất**.
  **Không cần migration**: `suggestions + votes + users + issues + neighborhoods` đã đủ.
- Route mới `GET /api/v1/notes`; SSR `page.tsx` và `refresh()` của `HomeShell` đều gọi
  cùng hàm/route đó (quên một bên = dòng nhảy chữ sau 20s polling).
- `VoteModal.tsx` **đã xoá** (cùng `tests/ui/vote-modal.test.tsx`): design bỏ nút
  `Xem câu nhắc` nên popup không còn lối vào. Muốn xem toàn bộ câu của một khu thì vào
  popup "Thông tin khu phố" (`NeighborhoodModal`).
- CTA đáy tab 2 (`+ Viết câu nhắc của riêng bạn`) mở popup **"Chọn góc phố"**
  (`SpotPickerModal.tsx`) rồi mới sang form viết câu — chốt 4/9, KHÔNG được tự lấy góc
  phố mở đầu tiên. Design chưa vẽ frame cho popup này nên dựng theo khung Modal chung.

### Dọn sau QC 4/9

- **Gỡ hẳn khối TVC/KV** (D3): 4 khoá `campaign_title/hint/youtube_ids/kv_url` biến mất
  khỏi `SITE_CONTENT_DEFAULTS`, `SiteContentData`, màn `/admin/noi-dung`; route
  `/api/admin/site-content/kv` đã XOÁ; `SITE_KV_KEY`, `LEGACY_VIDEO_KEY`,
  `parseYoutubeIds` cũng bỏ. Hàng cũ trong bảng `site_content` chỉ bị lơ đi — không
  migration. `site_content` giờ đúng **13 khoá TEXT** (test khoá `tests/site-content.test.ts`) —
  từ 8/9 bảng này còn giữ thêm 3 khoá SỐ `counter_*` nằm ngoài `SITE_TEXT_KEYS`.
- **Tiêu đề tab riêng từng màn admin** (D4): layout `(panel)` khai
  `title: { template: "%s — Admin Khu Phố" }`, mỗi route con có `layout.tsx` chỉ khai tên
  ngắn. Trang admin là client component nên KHÔNG tự khai `metadata` được — nhớ tạo
  `layout.tsx` khi thêm màn mới. `/admin/login` nằm ngoài `(panel)` nên khai đủ + `noindex`.
- **`SpotPickerModal.tsx`** (mới): CTA "+ Viết câu nhắc của riêng bạn" ở tab 2 mở popup
  chọn góc phố rồi mới sang form viết câu — không tự đoán góc phố đầu tiên.
- Sửa bám `.fig`: sàn gạch/cung nét đứt/skyline đặt trong khung 1440 của KV (trước đó sàn
  lệch 110px làm hình rời trông lơ lửng), mô tả khối đóng góp bó `max-w-848` để xuống 2
  dòng, khối nội dung rộng **1276** (`sm:px-[18px]`), nhịp dọc 66/64/24 theo `.fig`.
- `/api/admin/leads/[id]`: id không phải uuid → **404** (trước đó 500 vì lỗi Postgres 22P02).
- `SearchBox` + 3 `<select>` lọc của admin thêm `w-full min-w-0` — `<input>` có bề rộng
  nội tại ~363px làm `/admin/loi-nhac` tràn ngang ở khổ 375.

### Chốt 4/9 sau QC

- **Nguồn chuẩn giao diện = `docs/lp/LandingpageFCM.fig` HIỆN TẠI trong repo** (không chờ
  export mới). Ngoại lệ duy nhất: hai nhãn nút đã chốt bằng lời — tab 2 `Bình chọn` viền
  xanh, tab 3 `Xem lời nhắc` viền cam.
- **Chân trang giữ nguyên đủ 4 dòng**, gồm câu “Đã là khách hàng của FPT… 1900 6600”.
  Khối chữ cao 134 vs `.fig` 84 là chấp nhận có chủ ý — đừng “sửa” lại theo .fig.
- “Dòng đầu tab 2 màu cam” trong Figma: **không tái hiện được** (để chuột ra xa và rê lên
  từng dòng đều ra màu đậm) — coi như khung render dở lúc prototype tải, không phải trạng
  thái thiết kế. Web render tất cả dòng màu đậm là đúng.

### CÒN TREO sau phiên 4/9

1. Ảnh hero `cart.webp` (gánh hàng rong) và `sweepers.webp` (ông cháu quét sân) nằm **cao
   hơn** design — trong Figma cả hai đứng trên sàn gạch ngang chân KV. Nguyên nhân nghi:
   `HomeShell.tsx` đặt `top-%` theo chiều cao div bọc (phụ thuộc tỉ lệ ảnh KV) chứ không
   theo khổ 1440 của `.fig`.
2. Ở frame tab 2 của Figma, **dòng đầu tiên có chữ màu cam** còn 4 dòng sau màu đậm —
   chưa rõ là trạng thái gì (hover? đã bình chọn? câu dẫn đầu?). Đang render tất cả màu đậm.
3. Toàn bộ số đo px của bản live chưa đo được (thiếu `.fig` mới) — mới đối chiếu được
   nhãn/cấu trúc từ prototype.

## Chốt 7/9 — tab 1 chỉ là góc phố CHƯA có câu nào

`IssueBoard` tab "Góc phố mới cần treo biển" lọc `status !== 'signed' && suggestion_count === 0`
(trước chỉ bỏ góc đã treo biển nên góc có 1–2 câu vẫn hiện, trùng nội dung tab 2). Kéo theo:
dòng meta luôn là **"Chưa có câu đề xuất"** (bỏ nhánh "N câu đề xuất"), bộ đếm trên tab đếm
theo bộ lọc, câu rỗng đổi thành "Góc phố nào cũng đã có lời nhắc rồi — bạn đề xuất góc mới nhé!".
Lọc đặt ở CLIENT trong `IssueBoard`, KHÔNG ở `/api/v1/issues`: `SpotPickerModal` (popup
"Chọn góc phố") vẫn phải thấy mọi góc phố chưa treo biển, kể cả góc đã có câu.

## Sửa 7/9 sau review tab 2 "Lời nhắc chờ bạn bình chọn"

- Nút `Bình chọn` phải có **trái tim** ở đầu: vòng tròn 20px nền `#2323FF` 40% + tim đặc
  `#2323FF` (component `VoteHeart` trong `IssueBoard.tsx`). Số đo lấy từ export
  `docs/lp/Landing page-2.png` (button 119×35, r=70, viền `#2323FF` 1px, lề trong 12,
  gap 8) — chính là component nút mà bản live 4/9 chuyển từ tab 3 sang tab 2.
- **Tab 2 bỏ thanh phân trang**: design chỉ vẽ 5 câu rồi tới CTA đáy. `noteRows` cắt
  thẳng 5 câu đầu; tab 1 và tab 3 vẫn giữ pager (tab 3 cần để xem hạng 6–10).

## Sửa 7/9 — banner báo tin in-web thành LỚP NỔI

Ảnh QC: 3 thông báo "Rất tiếc! Câu nhắc/Đề xuất… chưa phù hợp" xếp thành 3 thẻ trắng to
choán hết đầu trang, tiêu đề hero chữ trắng rơi xuống nền kem. Nguyên nhân: khối banner
nằm TRONG luồng giữa thanh nav và hero, cao ~430px, trong khi nền hero là lớp `absolute`
cao ĐÚNG 900px tính từ mép trang (số đo .fig) — hero bị đẩy tụt ra ngoài dải gradient, và
nền cam ĐẶC `--kp-hero-from` của khối banner còn cắt gradient thành hai mảng lệch màu.

Nay khối banner là `fixed` (góc trái dưới, `sm:w-380`, `max-h-60vh` cuộn được, `z-40` để
modal z-50 vẫn đè lên), đặt cạnh toast ở CUỐI `HomeShell` — trang chủ giữ nguyên mọi số đo
.fig dù có bao nhiêu thông báo (đo Chrome: h1 y=149 desktop / 108 mobile, y như khi không
có thông báo). Đặt bên TRÁI và `bottom-[96px]` ở mobile để không đè nút nổi "Lên đầu trang"
(`BackToTop.tsx` — `fixed bottom-6 right-4`, cũng z-40).
Test A1 cũ (banner phải có `relative` + nền hero) đã đổi thành: banner `fixed` và KHÔNG là
con của khối bọc nền hero — `tests/ui/home-shell.test.tsx`.

## Sửa 7/9 — dropdown ô tra cứu 4N bám lại `Frame 261`

Ảnh QC: gõ đủ tên một khu phố ra khối kem + dòng chữ đen nằm TRONG luồng, đẩy dải 3 con số
xuống. `.fig` vẽ CẢ BA trạng thái trong cùng `Frame 261` (x=312 y=1193 w=816 r=16 **nền
trắng**, cách ô nhập 8px) và đó là dropdown **NỔI** đè lên dải con số:

| Trạng thái | Frame | Khung |
|---|---|---|
| (a) nhiều kết quả | `7745:2107` | h=231, lề trong 24, dòng 45 gap 24 |
| (b) đúng 1 kết quả | `7458:38738` | h=184: card `Frame 274` 768×77 r=16 nền `#FFF7EA` → gap 24 → hàng 35: chữ **CAM Bold 16** `#FF8206` + nút `Xem khu phố` 140×35 viền cam |
| (c) rỗng | `7745:1345` | h=72: pin + chữ 16 Light `#969696` (lề trái 32) + nút 212.3×40 |

Khung chung là class `.kp-lookup-panel` (globals.css) — `position:absolute` nên nội dung
dưới KHÔNG bị đẩy (đo Chrome: nhãn "Biển đã treo" giữ y=1234 dù dropdown mở hay đóng).
Đo lại trong iframe 1457px: (b) panel 816×184, card 768×77, nút 140×35 @x=964;
(c) panel 816×72, nút 212×40 @x=892 — khớp `.fig`.

**BẪY lặp lại (họ C1)**: `.tap { min-height:44px }` và `.kp-btn { font-size:15px }` khai báo
NGOÀI `@layer` nên `sm:min-h-0` / `text-[14px]` của Tailwind không đè được — nút đo ra
h=44 thay vì 35. Chốt chiều cao bằng `h-11 sm:h-[35px]` (bỏ `.tap`) và mượn `.kp-btn-row`
cho cỡ chữ 14px + nowrap.

## Sửa 7/9 — thanh tra cứu KHÔNG có nút tròn cam "+"

QC báo icon "+" bên phải ô tra cứu không có trong design. Kiểm lại `.fig`: component
`Searchbox` (`7458:39736`) THẬT SỰ có node `Button` 30×30 r=800 fill `#FF8206` chứa
`vuesax/linear/add` — nhưng instance dùng ở frame landing (`7458:39755`) override
`visible: false` cho node đó. Ảnh export `docs/lp/Landing page*.png` cũng không vẽ nút này.

**BẪY (mở rộng cảnh báo cũ)**: `dump.py` không lọc `visible=false` VÀ không áp
`symbolOverrides` của INSTANCE — nên một node in ra trong dump vẫn có thể bị TẮT ở frame
đang xem. Muốn kiểm, đọc thẳng `by[<instance>]['symbolData']['symbolOverrides']`
(mỗi phần tử có `guidPath` trỏ tới node con + các trường bị đè, gồm cả `visible`).
Đối chiếu chéo với ảnh export trước khi dựng bất kỳ chi tiết nào lấy từ dump.

Ruột thanh tra cứu theo `Frame 135`: 816×45 r=97.5 nền trắng viền cam, autolayout ngang
lề trong **16**, gap 8, chỉ gồm kính lúp **18px** + placeholder **16px Light `#969696`**.
Test khoá: `tests/ui/hero-lookup.test.tsx` — thanh tra cứu không chứa `<button>` nào.

## Sửa 7/9 — popup "Đề xuất khu phố mới" bước 2/2 dựng lại theo `.fig` 7458:41331

QC khoanh đỏ toàn bộ thân bước 2/2 ("chưa đúng thiết kế"). Đọc lại `.fig` thì đúng là sai
bộ trường: docs/22 chỉ QC popup "Gửi câu nhắc" (§B8), **không có mục nào cho popup đề xuất**
nên bản dựng 18/8 chưa từng được đối chiếu với bản Figma 2/9.

Design chỉ có ĐÚNG 3 nhóm ô (`Frame 241`, autolayout dọc gap 16), nhãn 16px Bold cách ô 8:

| # | Nhóm | Số đo `.fig` | Nhãn / placeholder |
|---|---|---|---|
| 1 | `Frame 198` 636×82 | 2 cột **310** gap 16, select cao **50** r=80 | `Tỉnh/thành phố` · `Phường /Xã` — cả hai placeholder **`Lựa chọn`** |
| 2 | `Frame 199` 636×82 | input cao **50** r=80 | `Tên khu phố/hẻm/ngõ muốn treo biển` — `Nhập tên hẻm ngõ nơi bạn sinh sống` |
| 3 | `Frame 200` 636×122 | textarea **636×90** r=16 | `Điều dễ thương bạn muốn chia sẻ ở khu phố này` — `Nhập đoạn mô tả` |

Nút `Button 02` 636×50 r=100 viền `#FF8206` 1.5px, nhãn **`Gửi đề xuất`** (bước 1 là
`Tiếp tục đề xuất`) — đọc bằng `symbolOverrides`, xem mẹo bên dưới.

### Design vs code — khác biệt THẬT đã sửa

| | Code cũ | Design 2/9 | Đã làm |
|---|---|---|---|
| Tiêu đề popup | `Đề xuất góc phố mới` | TEXT node `Đề xuất khu phố mới` (cả 2 frame) | đổi theo design |
| Thứ tự | Tên khu phố → tỉnh/phường → hẻm | tỉnh/phường **lên đầu** | đổi |
| Tên khu phố + Tên hẻm/ngõ | **2 ô** | **1 ô GỘP** | gộp |
| Mô tả | `Mô tả vấn đề tại khu phố`, placeholder theo chủ đề | `Điều dễ thương…`, placeholder cố định | đổi |
| Câu nhắc kèm | ô `Viết câu nhắc thương của bạn (nếu có)` | **không có** | BỎ |
| Ô tỉnh/phường khi đã chọn khu phố | input đọc-chỉ | select bình thường | luôn là select |

Hệ quả đã đi hết chuỗi:
- `location_text` và `neighborhood_text` nay **cùng một giá trị** (ô gộp). `neighborhood_id`
  chỉ có khi người dùng chọn khu phố có sẵn từ gợi ý.
- Ô gộp vẫn là `NeighborhoodPicker` (design vẽ input thường; lúc không focus trông y hệt) —
  giữ để `resolveNeighborhoodId` không sinh khu phố trùng. Chọn khu phố có sẵn thì điền hộ
  tỉnh/phường; đổi tỉnh/phường thì **xoá `nbId`** vì khu phố đã chọn không còn khớp địa giới.
- **Bắt buộc tỉnh/thành** cho mọi trường hợp (trước đây khu phố chọn sẵn được miễn).
- Payload POST `/api/v1/issues` **không còn `suggested_content`** → đề xuất không sinh
  `suggestions` nữa. Route vẫn NHẬN trường này (API công khai, bật lại được nếu Design xác
  nhận là quên vẽ). Luồng viết câu nhắc đi qua `SpotPickerModal` → `SuggestModal` (chốt 4/9).
- **Admin đã gỡ theo** (chốt 7/9 "gỡ cho đỡ rối"): `/api/admin/issues` bỏ subquery
  `attached_suggestion`; `IssuesPanel` bỏ khối "💬 Câu nhắc gửi kèm" + dòng chú thích
  "Câu nhắc gửi kèm đề xuất này (nếu có) cũng bị từ chối theo" ở popup từ chối. Đề xuất CŨ
  còn câu kèm thì admin xem ở màn Lời nhắc sau khi duyệt đề xuất — **hành vi backend giữ
  nguyên**: `PATCH /api/admin/issues/[id]` vẫn cho câu kèm đi theo số phận của đề xuất, và
  `/api/admin/suggestions` vẫn lọc bỏ câu của đề xuất chưa duyệt (#17). Không migration.
- `EXAMPLE_ISSUE_DESC` (`src/lib/examples.ts`) thành **mồ côi** — giữ lại, đã ghi chú.
- Test: `tests/ui/propose-modal.test.tsx` khoá đúng 4 nhãn theo thứ tự + payload;
  `tests/ui/home-shell.test.tsx` đổi theo tiêu đề mới.

### BẪY CSS mới (họ C1/C2): `.kp-input-lg` bị đè, ô popup ra 40px chứ không phải 50

Đo bằng Chrome: mọi ô một dòng trong 4 popup cao **40px** và textarea cao **95.4px**, dù
`globals.css` ghi rõ 50/90. Nguyên nhân là THỨ TỰ khai báo (cùng specificity → rule sau thắng):
`@media(sm){.kp-input{height:40px}}` và `textarea.kp-input{height:auto}` đứng SAU
`.kp-input-lg`. Nay `.kp-input-lg` + `textarea.kp-input-lg` chuyển xuống **cuối cụm**, và
khối `.kp-input-lg{font-size:16px}` trong `@media(sm)` thành dư nên bỏ.
Sửa này ảnh hưởng **cả 4 popup** (`SuggestModal`, `IdentifyModal`, `LeadPromptModal`,
`ProposeModal`) — đúng số của `.fig`. Test khoá: 2 case thứ tự trong `tests/globals-css.test.ts`.

### Mẹo đọc `.fig` dùng lại được

`symbolOverrides` **giải được nhãn chữ của INSTANCE**, không chỉ cờ `visible` (mở rộng mục
"Sửa 7/9 — thanh tra cứu"): mỗi phần tử có thể mang `textData.characters`. Nhờ vậy đọc được
nhãn `Button 02` mà không cần ảnh export — 5 ảnh `docs/lp/Landing page*.png` đều là frame
landing 1440×3780, **không có ảnh nào của 6 frame popup**.

```python
(by['7458:41872'].get('symbolData') or {}).get('symbolOverrides')
```

### CÒN TREO — hỏi Design

1. **Tiêu đề popup**: `.fig` ghi `Đề xuất khu phố mới`, còn nav link là
   `Đề xuất khu phố cần treo biển` và CTA đáy tab 1 vẫn `+ Đề xuất góc phố mới` — ba cách
   gọi cho cùng một luồng. Thống nhất "góc phố" hay "khu phố"?
2. **Bỏ ô câu nhắc kèm có chủ ý không?** Nếu Design chỉ quên vẽ thì phải bật lại (code cũ
   còn trong git, route vẫn nhận `suggested_content`).
3. Ô `Phường /Xã` khi chưa chọn tỉnh: design chỉ vẽ `Lựa chọn`, web đang khoá xám và cũng
   hiện `Lựa chọn` — có cần câu gợi ý riêng cho trạng thái khoá không?
4. Nhãn `Phường /Xã` trong `.fig` có dấu cách lạc chỗ (`Phường` + space + `/Xã`) — giữ
   nguyên văn hay sửa thành `Phường/Xã`?

## Sửa 7/9 — popup "Thông tin khu phố": nút bình chọn CHỈ ở câu `approved`

QC: câu pill "Chờ treo biển" vẫn còn nút (kể cả dạng khoá "Đã bình chọn"). Đúng design thì
chỉ trạng thái **`approved`** (pill "Đang chờ bạn bình chọn") mới có nút — `selected` /
`produced` (Chờ treo biển) và `installed` (Đã lên biển) đã hết vòng bình chọn nên KHÔNG
render nút, kể cả khi người xem từng bình chọn câu đó.
`NeighborhoodView.tsx`: `canVote = note.status === "approved" && !note.is_mine`
(trước là `!is_mine && status !== "installed"`). Test khoá: 6 case mới trong
`tests/ui/neighborhood-view.test.tsx` (3 trạng thái × có/không `voted`).

## Sửa 7/9 — hai câu mời ở dropdown tra cứu 1 kết quả (QC duyệt lời)

`HeroLookup.tsx` — câu mời dưới card kết quả duy nhất, tách theo `notes_count`:

| `notes_count` | Câu |
|---|---|
| = 0 | `Khu phố mình chưa có lời nhắc, bạn viết câu đầu tiên nhé?` (bỏ chữ "nhiều") |
| > 0 | `Hãy cùng góp thêm lời nhắc cho khu phố nhé!` (cũ: "Bạn viết lời nhắc cho khu phố nhé!") |

Đây là câu trả lời cho mục CÒN TREO #2 của phiên 2–3/9 (design chỉ vẽ MỘT dòng nên khu đã
có lời nhắc đọc thấy câu "viết câu đầu tiên"). Test khoá: `tests/ui/hero-lookup.test.tsx`.

## Sửa 7/9 — nút "Viết lời nhắc cho xóm mình" đi đúng luồng viết câu

QC: nút ở đáy popup "Thông tin khu phố" không chạy. Thật ra nó chỉ đóng popup rồi
`scrollIntoView("#goc-xom")` — nhìn như không có gì xảy ra.

Nay đi ĐÚNG luồng của CTA `+ Viết câu nhắc của riêng bạn` (tab 2): mở `SpotPickerModal`
→ chọn góc phố → `SuggestModal`. `NeighborhoodModal.onWrite` nhận **tên khu phố đang
xem** và `HomeShell` giữ thêm state `spotPickerNb`, nên `myNeighborhood` của popup chọn
góc phố là khu ĐANG XEM chứ không phải khu của người đã định danh
(`spotPickerNb ?? me?.neighborhood_name ?? null`). Vào từ tab 2 thì vẫn như cũ.

Trang share `/khu-pho/[slug]` là server component nên không mở popup tại chỗ được: nút
cùng tên ở đó trỏ `/?viet-loi-nhac=<tên khu phố>` (trước là `href="/"` — về trang chủ
mất ngữ cảnh). `HomeShell` xử lý query này chung chỗ với `?khu-pho=<slug>` và cũng xoá
query bằng `replaceState`. **Mang TÊN chứ không mang slug**: `SpotPickerModal` so khớp
theo `issues[].neighborhood_name` (cùng cột DB), truyền slug thì phải fetch thêm rồi
nhóm đầu danh sách nhảy sau khi popup đã mở.

Test khoá: 5 case cuối `tests/ui/home-shell.test.tsx` (kể cả một case đọc thẳng
`src/app/khu-pho/[slug]/page.tsx` để hai đầu deep-link không lệch nhau).

## Sửa 7/9 — /admin/khu-pho: trạng thái tự do · 10 slot slide · xoá mềm

Ba yêu cầu trong một điểm QC ("Trong Admin ⇒ Khu phố"). Migration **011**
(`deleted_at` + đánh số lại `featured_position` + CHECK 1..10 + unique index).

**1. Ba trạng thái bật/tắt KHÔNG điều kiện.** Trước đây `is_featured` bắt buộc khu đang
hiển thị (ẩn website → server tự tắt tiêu biểu), `certified_4n` bắt buộc 100% biển đã
treo. Nay cả `PATCH /api/admin/neighborhoods/[id]` lẫn `.../certify` đều bỏ ràng buộc —
chứng nhận 4N là quyết định vận hành (có buổi trao biển ngoài đời), không phải hệ quả tự
động của dữ liệu web. UI chỉ còn *cảnh báo* trong tooltip: khu đang ẩn mà bật tiêu biểu
thì cờ vẫn lưu nhưng chưa ra slider (server công khai vẫn lọc `NOT hidden`).

**2. `featured_position` = SLOT SLIDE của hero, đúng 10 chỗ.** Đây là câu trả lời cho ghi
chú QC "Chưa chạy được — đây là vị trí của slide": `NeighborhoodSlider` trước đó lọc theo
`certified_4n` nên cả `is_featured` lẫn vị trí đều **vô nghĩa**. Nay slider lấy
`is_featured` rồi `.slice(0, FEATURED_SLOTS)` (`src/lib/featured.ts` — module riêng để
client component không kéo theo lớp DB); thứ tự do server sắp sẵn
(`ORDER BY featured_position NULLS LAST, name`).
- Slot là **duy nhất**: `neighborhoods_featured_position_uniq` (partial, bỏ qua khu đã xoá).
- Xếp trùng slot của khu khác → server **HOÁN ĐỔI** hai khu, không báo lỗi. Unique index
  kiểm theo TỪNG CÂU LỆNH (partial index không DEFERRABLE được) nên PATCH chạy 3 bước
  trong 1 transaction: nhả slot của mình → đẩy khu đang giữ slot đích sang chỗ vừa nhả
  (khu chưa có slot thì đối phương bị đẩy ra NULL) → nhận slot mới.
- Bỏ cờ tiêu biểu ⇒ nhả slot (`featured_position = NULL`).

**3. Xoá mềm.** `DELETE /api/admin/neighborhoods/[id]` chỉ đặt `deleted_at`, đồng thời
`hidden=true`, `is_featured=false`, nhả slot. `PATCH { restore: true }` khôi phục nhưng
để **ẩn** (admin kiểm rồi mới bật). Bảng admin có tab **🗑 Đã xoá**; mọi tab khác + ô lọc
tỉnh/thành + ô chọn khu phố của tab Đề xuất đều dùng `alive` (đã lọc).
- Quy tắc: khu đã xoá **biến mất cả cụm khỏi web** — trang chủ, tra cứu 4N, IssueBoard,
  khối biển, popup khu phố, `/khu-pho/<slug>` (404) và OG image. Đã thêm
  `deleted_at IS NULL` vào: `page.tsx` (4 query), `/api/v1/map`, `/api/v1/issues` (+`[id]`),
  `lib/{notes,counters,neighborhood,leaderboard,ambassador}.ts`, `/api/v1/me`,
  `/api/v1/auth/identify`, `opengraph-image.tsx`. **Thêm truy vấn công khai mới đụng
  `neighborhoods` thì nhớ lọc theo.** Điểm/lượt thương/câu nhắc KHÔNG bị xoá — khôi phục
  là về nguyên trạng.
- `resolveNeighborhoodId`: nhánh **id** lọc `deleted_at IS NULL`, nhánh **tên** thì
  KHÔNG (tên là UNIQUE — bỏ qua khu đã xoá thì INSERT của cư dân vỡ). Import file cũng
  báo riêng "trùng tên với khu phố ĐÃ XOÁ" để admin đi khôi phục.

**Câu thông báo sau khi xếp slot có BA ca, đừng gộp** (QC trên Chrome bắt được): slot còn
trống → `Đã xếp vào slot slide số N ✓`; khu vừa xếp đang giữ slot khác → *đổi chỗ với "X"
(giờ ở slot cũ)*; khu vừa xếp chưa có slot → *"X" bị đẩy ra khỏi 10 slot*. Hàm
`slotMessage(rows, n, pos)` tra khu đang giữ slot đích ngay trong `rows` của client.
Câu "ẩn khu phố (tiêu biểu cũng tắt theo)" cũng phải sửa — nay giữ nguyên cờ tiêu biểu.

Test khoá: `tests/ui/admin-neighborhoods.test.tsx` (12 case) · `tests/ui/slider-slots.test.tsx`
(3 case). `tests/ui/slider-motion.test.tsx` đổi fixture sang `is_featured`.

**Mẹo QC màn admin bằng Claude-in-Chrome**: thanh thông báo tự ẩn sau 6s làm TRÔI cả bảng
~52px — click theo toạ độ chụp trước đó là bấm nhầm hàng khác (phiên này lỡ ẩn nhầm một khu
phố). Thao tác chắc ăn: tìm hàng bằng JS (`tbody tr` chứa tên) rồi `.click()`. Riêng ô số
phải bắn `nativeInputValueSetter` + `input` + **`focusout`** (`inp.blur()` không ăn vì
element chưa thực sự được focus).

**BẪY môi trường (mất 5 phút phiên này)**: `pnpm build` khi `pnpm dev` đang chạy sẽ ghi đè
`.next` của dev server → dev server trả 500 cho mọi route và không tự hồi. Muốn build thử
thì tắt dev server trước (hoặc chấp nhận `rm -rf .next` rồi khởi động lại dev).

## Sửa 8/9 — admin ghi đè được dải 3 con số ở hero

QC khoanh đỏ dải `Biển đã treo · Khu phố · Câu đóng góp`: "cho phép chỉnh các con số này
trong admin". Ghi đè lưu ngay trong bảng `site_content` (3 khoá `counter_signs_installed`,
`counter_neighborhoods_joined`, `counter_suggestions_total`) — **không migration**, cùng cơ
chế "rỗng → xoá hàng → về mặc định" như ô chữ, chỉ khác mặc định là SỐ ĐẾM THẬT chứ không
phải copy gốc.

- `src/lib/counters.ts` tách hai đường: `getCounters()` = số CÔNG KHAI (đã áp ghi đè, dùng ở
  `page.tsx` + `/api/v1/counters`) · `getRealCounters()` = số đếm thật (dashboard admin phải
  thấy dữ liệu thật, không thấy số PR). Cả hai dùng chung một lượt truy vấn + cache 15s.
- 3 khoá này KHÔNG nằm trong `SITE_TEXT_KEYS` (bộ khoá text vẫn đúng 13) — API admin nhận
  chúng ở nhóm riêng `counters` của body PATCH, validate số nguyên 0…`COUNTER_MAX` (1.000.000).
- PATCH gọi `resetCountersCache()` nên trang chủ đổi số ngay, không đợi hết 15s cache.
  Sửa thẳng bằng SQL thì phải chờ 15s (đã kiểm bằng curl).
- Hàng rác trong bảng (`abc`, số âm, số lẻ) bị lơ đi → rơi về đếm thật, trang chủ không ra NaN.
- Test khoá: `tests/counters.test.ts` (6 case logic) · `tests/ui/admin-site-counters.test.tsx`
  (4 case màn `/admin/noi-dung`).

## Dọn repo 8/9 — mọi nguồn/ảnh design ra khỏi git

Repo **không còn giữ ảnh, dump hay prototype nào của design** — chỉ còn code, tài liệu
`.md` và 3 ảnh nhỏ (`lp/Frame 151.png`, `lp/Group 4.png`, `lp/vuesax/tick-circle.svg`).
Muốn đối chiếu giao diện thì mở `.fig` trên Drive của team Design, hoặc dump lại bằng
`scripts/figma/`. Danh sách đầy đủ "file nào ở Drive": `docs/README.md` §C; `.gitignore`
đã chặn để không lọt lại.

Đợt 1 (28MB) còn gỡ khỏi **toàn bộ lịch sử** bằng `git filter-repo` (`.git` 68MB → 4.8MB)
nên mọi hash commit trước 8/9 đã đổi — ai còn bản clone cũ phải clone lại.

**BẪY `.gitignore`**: file này KHÔNG có chú thích cuối dòng — `docs/*.xlsx  # ghi chú`
biến cả cụm thành pattern nên không khớp gì cả. Ghi chú phải nằm ở dòng riêng.


## Sửa 8/9 sau QC — chip số của tab + huy hiệu TOP (file `.fig` MỚI upload 8/9)

`docs/lp/LandingpageFCM.fig` được thay bản mới ngày 8/9 → phải
`rm scripts/figma/nodes.pkl && python3 scripts/figma/parse.py` rồi mới dump. Node id
giữ nguyên (11 frame "Landing page"): `7217:1990` (tab 1) · `7651:1537` (tab 2) ·
`7458:38738` (tab 3, chứa huy hiệu TOP) — 5 ảnh export cũ ở `docs/lp/export-02-09/*.webp`
vẫn khớp bản mới ở khối này nên dùng để đối chiếu nét chữ.

**Chip số trong tab** (`Tab` = `7367:20672` Selected / `7367:20649` Default):
Ø**25** nền trắng (đang chọn) hoặc `#3D3D3D`, chữ **16px REGULAR** — bản cũ Ø24/13px
**Bold** nên nhỏ và đậm hơn design. Pill cao **40**, chữ nhãn **18px ls -2%**, lề trong
**trái 16 / phải 8** (instance đè `stackHorizontalPadding: 16`, master giữ
`stackPaddingRight: 8`). Kiểm chéo được bằng bề rộng: 16 + chữ + 10 + 25 + 8 =
271/278/224 đúng ba tab trong `.fig` (đo chữ bằng canvas: 211.2/217.9/164.3).

**BẪY chữ SỐ không nằm giữa vòng tròn** (chính là điểm QC khoanh đỏ): FPT SongVui có
ascent 0.75em / descent 0.25em, mà chữ số KHÔNG có phần chìm ⇒ căn giữa HỘP DÒNG
(`place-items-center`, `leading-none`…) luôn đẩy số cao hơn tâm ô đúng **0.077em**
(= (0.75−0.25)/2 − 0.654/2, đo bằng `canvas.measureText`). Class `.kp-num-mid`
(globals.css) kéo xuống đúng chừng đó — dùng lại cho MỌI số đặt trong ô tròn/vuông.

**Huy hiệu hạng** (`Text button` 40×50 trong `7458:38738`):
- Nền là **GRADIENT DỌC mờ dần xuống đáy**, KHÔNG phải màu đặc — đây là "shadow bên
  dưới box" mà QC nhắc. TOP1 `#2323FF` (1 → .6 ở mốc 66.35% → 0), TOP2 `#FF8206` và
  TOP3 `#3EAF3F` (1 → .5 → 0), hạng ≥4 `#EEEEEE` (1 → 0).
- **KHÔNG bo góc** (`cornerRadius` vắng ⇒ 0) — bản cũ `rounded-[8px]`.
- Hộp autolayout có lề dọc 5 và **gap ÂM −10** (TOP chồng lên số) nên khoảng cách
  TOP↔số không suy ra được từ `items-center`; dựng bằng absolute theo baseline:
  TOP 14px hộp dòng 15 top 5 (baseline 16) · số 30px hộp dòng 45 top 10 (baseline 40).
- **Hạng ≥4 KHÔNG có chữ TOP**: chỉ còn số 30px **Light** màu `#C9C9C9`, top 0
  (baseline 30). Bản cũ vẫn in "TOP 4"/"TOP 5".
- Kiểm chéo trên `landing-page-2.webp` (huy hiệu TOP 1 bắt đầu ở y=1612): nét chữ TOP
  nằm 7→15.5, nét số nằm 21→39.5 — khớp hai baseline trên.

**BẪY letter-spacing**: Chrome **không** cộng letter-spacing sau ký tự cuối, nên chữ
`text-center` có `tracking` âm KHÔNG bị lệch phải — bù thêm `padding-right` là hỏng
(đo ra lệch trái đúng nửa khoảng). Khác với giả định thường gặp.

**Nhịp dọc danh sách** (cả ba tab giống nhau trong `.fig`): dòng đầu bắt đầu ở y=**42**
tính từ mép card, bước lặp 82 = dòng 50 + 16 + kẻ + 16, và **CÓ kẻ sau dòng CUỐI** ở cả
ba tab (`Line 9` tab 1, `Line 6` tab 2 và 3) — trước đây chỉ tab 1 có. Vì ruột dòng canh
giữa hộp 82 nên mỗi dòng tự mang 16px đệm trên ⇒ lề trong TRÊN của card là **18**
(18 + 16 = 34 của `.fig`), và khoảng tab → card là **40** (không phải 43).

**Còn lệch, chấp nhận có chủ ý**: tab 1/2 khối chữ mỗi dòng cao ~54 vs 50 của `.fig`
(tiêu đề 18px + meta 14px theo line-height body); tab 1 và tab 3 vẫn giữ thanh phân
trang mà `.fig` không vẽ (chốt 7/9 — cần xem hạng 6–10) nên card cao hơn 550.
