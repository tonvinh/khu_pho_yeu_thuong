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
