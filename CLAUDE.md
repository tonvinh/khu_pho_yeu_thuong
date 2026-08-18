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

## Điều chỉnh 1/8 (docs/dieuchinh.1.8.xlsx — sheet ACTION LIST)

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
- TVC/KV demo ở `CampaignMedia.tsx` (YOUTUBE_ID placeholder, chờ final design).
- Còn CHỜ ASSET từ team Design/trade: ảnh 20 khu phố (#1), biển bảng 6 chủ đề (#3),
  bảng chứng nhận chính thức (#9, #10) — flow upload theo sheet ORDER chưa dựng.

## Điều chỉnh 18/8 — SKIN MỚI (docs/lp/*.png) + email review (docs/admin/admin_v1.pdf)

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
  in ra cây node kèm x/y/w/h, màu, bo góc, viền, font. Bản dump đã lưu sẵn:
  `docs/lp/figma-frame-7217-1990.txt` (frame "Landing page" 1440×4450).
- BẪY khi tự đọc Kiwi: `uint64` KHÔNG phải LEB128 thuần — 8 nhóm 7 bit rồi byte thứ 9
  lấy trọn 8 bit. Đọc sai là lệch cả stream (xem `scripts/figma/kiwi.py`).
- Số chuẩn: khối nội dung rộng **1276** (lề 82) · hero cao **900**, gradient
  `#FF7B00 → #FFEFE6` · thanh nav trắng **10%** viền `#FFEBB8` · chữ `#3D3D3D`,
  chữ mờ `#969696`, kẻ `#DEDEDE`, cam `#FF8206`, xanh `#2323FF`.
- Asset đã nén sẵn vào `public/brand/`: `skyline` · `plaza` · `kv-khu-pho(-sm)` ·
  `signpost` · `hero-arc` · `sign-logos` · `sign-fptplay` (2 cái cuối cắt từ layer
  "INT - EPL-01 1" 4096×2731 để `SignCard` dùng logo FPT + artwork FPT Play thật).
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
