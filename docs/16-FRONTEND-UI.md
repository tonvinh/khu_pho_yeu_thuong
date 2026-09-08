# 16 — Giao diện & frontend

> Cập nhật: 8/9/2026 — đồng bộ với code sau các đợt 18/8, 2–4/9, 7/9.
>
> **Nguồn design CHUẨN: `docs/lp/LandingpageFCM.fig` HIỆN TẠI trong repo** (chốt 4/9), đọc bằng
> bộ giải mã tự viết `scripts/figma/` (`parse.py` → `nodes.pkl`, rồi `dump.py <node-id> [depth]`).
> Frame chuẩn trang chủ: `7217:1990` (1440×3780). Ảnh export `docs/lp/Landing page*.png` **cũ hơn**
> `.fig` — chỉ dùng để đối chiếu nhãn nút/tab, không đo px.
> Ngoại lệ đã chốt bằng lời (file `.fig` local lệch bản live 4/9): tab 2 nút **`Bình chọn`** viền
> xanh, tab 3 nút **`Xem lời nhắc`** viền cam.
> ~~`docs/lp/lp1.png` → `lp6.png`~~ (skin 18/8) và bản prototype kem `KhuPhoCuaToi-prototype-v4.html`
> chỉ còn giá trị lịch sử.
>
> **BẪY khi đọc `.fig`**: `dump.py` KHÔNG lọc `visible=false` và KHÔNG áp `symbolOverrides` của
> INSTANCE — một node in ra trong dump vẫn có thể bị TẮT hoặc bị đổi nhãn ở frame đang xem
> (đọc `by['<instance>']['symbolData']['symbolOverrides']`, mỗi phần tử có `guidPath` + trường bị đè,
> gồm cả `visible` và `textData.characters`). Luôn đối chiếu chéo với ảnh export trước khi dựng.
>
> Kế hoạch/QC từng đợt: `21-KE-HOACH-DIEU-CHINH-18-8.md` · `22-QC-FIGMA-MOI-02-09.md` · `24-QC-04-09.md`.
> Copy tiếng Việt: `src/lib/copy.ts` (nguyên văn từ `06-CONTENT-COPY.md` §2); text hiển thị
> trang chủ sửa được ở `/admin/noi-dung` (mặc định trong `src/lib/site-content-defaults.ts`).

## 1. Bản đồ route

| Route | Kiểu | Mô tả |
|---|---|---|
| `/` | Server + client island | Trang chủ một trang — bố cục §2 |
| `/bien/{suggestionId}` | Server | Trang share "biển đã treo" + OG image động |
| `/dai-su/{share_slug}` | Server | Trang share thành tích cây bút + OG image động. **Từ 2/9 không còn lối vào từ trang chủ** (tab 3 mở popup `AmbassadorModal`); route vẫn sống cho link đã chia sẻ |
| `/khu-pho/{slug}` | Server | Trang share chứng nhận / hồ sơ khu phố + OG image động. Khu **đã xoá mềm → 404** |
| `/chinh-sach-du-lieu` | Static | Chính sách dữ liệu (PDPD) |
| `/admin/login` | Client | Đăng nhập admin (2 bước nếu bật TOTP) — nằm **ngoài** group `(panel)`, khai `noindex` |
| `/admin` | Client | Dashboard phân tích (`GET /api/admin/analytics`) |
| `/admin/khu-pho` | Client | Khu phố & chứng nhận · tab **Đề xuất góc phố** (gộp `/admin/de-xuat` cũ, 4/8) · tab **🗑 Đã xoá** (7/9) |
| `/admin/loi-nhac` | Client | Duyệt lời nhắc với checklist 4N (đổi tên từ `/admin/cau-nhac`) · tab **Chọn câu & vòng đời biển** (gộp `/admin/bien` cũ, 4/8) |
| `/admin/voting` | Client | Theo dõi thương — sửa số lượt thương của câu/người |
| `/admin/leads` | Client | Quản lý leads |
| `/admin/noi-dung` | Client | Sửa 13 khoá text + **3 con số hero** (`site_content`) |
| `/admin/gian-lan` | Client | Chống gian lận |

**Route admin đã XOÁ** (đừng dựng lại link tới chúng): ~~`/admin/de-xuat`~~ ·
~~`/admin/cau-nhac`~~ · ~~`/admin/bien`~~ (gộp 4/8) · ~~`/admin/khu-pho/{id}/ban-do`~~ ·
~~`/admin/diem`~~ · ~~`/admin/import`~~ (chưa bao giờ tồn tại trong code).

Tiêu đề tab từng màn admin (D4, 4/9): layout `(panel)` khai
`title: { template: "%s — Admin Khu Phố" }`, mỗi route con có `layout.tsx` chỉ khai tên ngắn.
Trang admin là client component nên **không tự khai `metadata` được** — nhớ tạo `layout.tsx`
khi thêm màn mới.

Mọi link nội bộ trong client dùng hằng `BASE` (từ `client-api.ts`); trong server dùng `withBase()`. **Không hard-code `/`**.

## 2. Cây component trang chủ

Thứ tự khối từ trên xuống (khớp `.fig` 2/9, khổ 1440 · trang cao ~3853 so với design 3780):

```
app/page.tsx  (Server — 8 truy vấn song song, force-dynamic)
└── HomeShell  "use client"   ← orchestrator: state, polling 20s, modal, toast, deep-link
    ├── Top bar cam           2 link nav (từ xl) · pill logo tròn ở giữa · CTA "Ưu đãi dành cho
    │                         cư dân" · UserMenu (chỉ khi đã định danh)
    ├── <header> hero nền cam gradient #FF7B00 → #FFEFE6, cao ĐÚNG 900px tính từ mép trang
    │   ├── h1 IN HOA + mô tả (site_content: hero_title / hero_body)
    │   ├── NeighborhoodSlider   khu `is_featured`, tối đa 10 SLOT (§4)
    │   ├── KV khu phố 3D + skyline + sàn gạch + 3 hình rời (public/brand/*.webp)
    │   └── (ngoài <header>) HeroLookup  ô tra cứu 4N + dropdown NỔI 3 trạng thái (§4b)
    ├── Counters                 3 con số: Biển đã treo · Khu phố · Câu đóng góp
    │                            (8/9: admin ghi đè được từng ô ở /admin/noi-dung)
    ├── IssueBoard  #goc-xom     1 card sọc cam, 3 tab (§3.6)
    ├── SignGallery              6 biển mới nhất — SignCard render bằng HTML/CSS
    ├── #uu-dai LeadSection      họ tên · SĐT · TỈNH THÀNH (bắt buộc) · địa chỉ · 6 lựa chọn · opt-in
    ├── <footer>                 CHỈ khối chữ 4 dòng (có hotline 1900 6600) + link chính sách
    ├── BackToTop                nút nổi, hiện khi cuộn quá 1 màn hình
    ├── Modals: IdentifyModal · ProposeModal · SuggestModal · SpotPickerModal ·
    │           NeighborhoodModal(→NeighborhoodView) · AmbassadorModal · LeadPromptModal
    ├── Banner báo tin in-web    LỚP NỔI `fixed` góc trái dưới (§3.7)
    └── Toast
```

### Component đã XOÁ (đừng tìm lại trong repo)

| Component | Xoá khi | Thay bằng |
|---|---|---|
| `IssueList.tsx`, `Leaderboard.tsx` | 18/8 | `IssueBoard` nuốt cả danh sách lẫn bảng xếp hạng |
| `IssueDrawer.tsx` (+ `Drawer`, `HangSign`, `Eyebrow` trong `ui.tsx`) | 18/8 | `SuggestModal` + `VoteModal`; `Modal` + `Stripe` |
| `VoteModal.tsx` (+ test) | 4/9 | Design bỏ nút "Xem câu nhắc" ⇒ popup mất lối vào. Xem toàn bộ câu của một khu thì mở `NeighborhoodModal` |
| `CampaignMedia.tsx` (TVC + KV) | 2/9 | Khối TVC bỏ khỏi trang chủ từ 18/8; 4 khoá `campaign_*` gỡ nốt ngày 4/9 |

### Component MỚI

| Component | Từ | Vai trò |
|---|---|---|
| `IssueBoard.tsx` | 18/8 | Card 3 tab, thay `IssueList` + `Leaderboard` |
| `SignCard.tsx` | 18/8 | Biển render bằng **HTML/CSS** (không phải ảnh upload) — dùng chung với preview lúc admin duyệt câu |
| `HeroLookup.tsx` | 18/8 | Ô tra cứu 4N chuyển từ cột phải lên hero |
| `NeighborhoodModal.tsx` + `NeighborhoodView.tsx` | 18/8 | Hồ sơ khu phố dạng **popup**; `NeighborhoodView` dùng chung với trang share `/khu-pho/[slug]` (prop `hero` bật khối ảnh + badge 4N cho trang share — quyết định Q5) |
| `UserMenu.tsx` | 2/9 | Avatar là `<button>` mở menu: tên · điểm · Đăng xuất (bản tối giản, câu hỏi F5 còn treo) |
| `BackToTop.tsx` | 2/9 | Nút nổi "Lên đầu trang" |
| `AmbassadorModal.tsx` | 2/9 | Popup "Cây bút khu phố" (frame `7727:1743`) |
| `SpotPickerModal.tsx` | 5/9 | Popup "Chọn góc phố" — bước trước form viết câu. Design **không vẽ frame**, tự thiết kế theo khung `Modal` chung |

### Dùng chung — `components/home/ui.tsx`

`SectionHead` (IN HOA, căn giữa, tuỳ chọn cột biển bên trái) · `FilterTabs` (pill, tab đang chọn
là khối cam, có nhãn `short` cho mobile) · `Field` (`size="lg"` cho nhãn 16px Bold) ·
`Modal` · `Stripe` (dải sọc chéo cam) · 10 icon SVG (`IconPin`, `IconPencil`, `IconUser`,
`IconHeart`, `IconHeartSolid`, `IconCheck`, `IconChevronDown`, `IconClose`, `IconArrowLeft`,
`IconSearch`) · `lockScroll` / `unlockScroll`.

**Khung `Modal` (chốt 2/9)**: rộng **700**, viền **2px `#FF8206`**, lề trong 32, tiêu đề
**25px Regular (KHÔNG bold)**, nút ‹ / × 35×35 dạng icon, dải sọc `.kp-stripe-b` cao 12 **nằm TRONG**
khung. Prop `wide` đã bỏ. Mobile = **bottom sheet** bo trên 24px có tay nắm, ẩn dải sọc.
Prop `topmost` nâng lên `z-[60]` cho modal định danh mở **chồng** lên modal khác.

Khoá cuộn nền dùng `position: fixed; top: -scrollY` (không phải `overflow:hidden` — iOS Safari
vẫn cuộn) **+ đếm số modal đang mở**; nhả khoá sớm là nền cuộn được trong khi vẫn còn popup.

## 3. Luồng tương tác then chốt

### 3.1 "Định danh khi cần" (lazy identity)

`HomeShell` giữ hàm `requireIdentity(fn)`:

```
Người dùng bấm một hành động cần định danh (viết câu / thương / đề xuất / gửi lead)
   ├─ đã có `me`  → chạy fn ngay
   └─ chưa có     → lưu fn vào ref, mở IdentifyModal
                     └─ định danh xong → setMe + tự chạy tiếp fn đang chờ
```

Người dùng **không bị hỏi SĐT khi chỉ xem** — chỉ hỏi đúng lúc sắp làm điều gì đó cần danh tính. Đóng modal giữa chừng thì hành động đang chờ bị huỷ.

### 3.2 Bấm "Bình chọn" (optimistic, KHÔNG rút lại)

Cập nhật số ngay trên UI, gọi API nền. Lỗi → rollback đúng trạng thái cũ và hiện toast lỗi
(409 tự thương / 409 đã bình chọn). Câu của chính mình: nút **disabled** kèm title
"Câu của mình thì để cả xóm thương nhé 💛".

**Quyết định Q6 (2/9): bình chọn xong là CHỐT.** ~~Bấm lại để bỏ thương (toggle)~~ — nút khoá
thành **"Đã bình chọn"**, route trả 409 `ALREADY_VOTED`. Nút "Bình chọn" ở tab 2 có **trái tim**
ở đầu (vòng tròn 20px nền `#2323FF` 40% + tim đặc — component `VoteHeart`).

Ba nơi bình chọn được: dòng tab 2 của `IssueBoard` · thẻ câu trong `NeighborhoodView`
(**chỉ câu `status='approved'`** — chốt 7/9) · thẻ câu trong `AmbassadorModal`.

### 3.3 Viết câu nhắc

- Textarea cắt cứng **120 ký tự**, đếm `n/120` cạnh 4 chip tĩnh `Nhắc · Nhở · Nhỏ · Nhẹ`.
- 4 chip này chỉ để **tự soát** — không có chấm điểm tự động (quy tắc cứng 2).
- Có gợi ý ví dụ theo danh mục (`EXAMPLE_SUGGESTIONS`), bấm để điền rồi sửa; ví dụ trùng câu đã có sẽ bị ẩn.
- Ghi chú duyệt 4N (`COPY.note4N`) luôn hiển thị. ~~Ghi chú đạo đức `COPY.noteEthics`~~ →
  **đã gỡ** (quyết định "DESIGN THẮNG SPEC" 2/9 — `.fig 7458:41901` không vẽ; chuỗi vẫn còn trong `copy.ts`).
- Mỗi chip 4N có chú thích riêng nguyên văn `.fig` (Frame 243): Nhắc *"Không cấm, không phạt"* ·
  Nhở *"Như nói với người nhà"* · Nhỏ *"Quan tâm từ những chuyện nhỏ"* · Nhẹ *"Đọc xong thấy nhẹ lòng"*.
  4 chip **không phải `<button>`** (quyết định Q4: chỉ trang trí + chú thích, không cho chọn, không lưu DB).
- Checkbox opt-in lead tầng 1 nằm cuối form, **mặc định không tick**, kèm dòng "Tuỳ chọn riêng,
  không ảnh hưởng đến câu nhắc của bạn." Tick vào thì **hiện ô SĐT** (email review 18/8).
- Gửi xong: toast "Câu của bạn đã vào hàng chờ duyệt…" — nói rõ là **chờ duyệt**, không giả vờ đã đăng.

### 3.3b Vào form viết câu bằng đường nào

Từ 4/9, CTA "+ Viết câu nhắc của riêng bạn" (đáy tab 2) **không tự đoán góc phố** nữa:

```
CTA tab 2  ─┐
            ├─► SpotPickerModal (Chọn góc phố) ─► SuggestModal (viết câu)
Nút "Viết lời nhắc cho xóm mình" trong NeighborhoodModal ─┘
Dòng tab 1 "Gửi lời nhắc" ───────────────────────────────► SuggestModal (đã biết góc phố)
```

`SpotPickerModal` nhóm **góc phố của xóm mình lên đầu**: `myNeighborhood` =
`spotPickerNb ?? me?.neighborhood_name ?? null` — mở từ popup khu phố thì lấy **khu đang xem**,
mở từ tab 2 thì lấy khu của người đã định danh. Ô tìm dính ở đầu, bỏ dấu vẫn ra, Enter chọn
góc phố đầu tiên.

Trang share `/khu-pho/[slug]` là server component nên không mở popup tại chỗ được: nút cùng tên
ở đó trỏ **`/?viet-loi-nhac=<TÊN khu phố>`** (mang TÊN chứ không phải slug — `SpotPickerModal`
so khớp theo `issues[].neighborhood_name`). `HomeShell` xử lý query này chung chỗ với
`?khu-pho=<slug>` và xoá query bằng `replaceState` để F5 không mở lại popup.

### 3.4 Đề xuất góc phố — wizard 2 bước (dựng lại 7/9 theo `.fig`)

| Bước | Frame | Nội dung |
|---|---|---|
| 1/2 | `7458:40650` | Chọn 1 trong **6 chủ đề** · nút `Tiếp tục đề xuất` |
| 2/2 | `7458:41331` | 3 nhóm ô + nút `Gửi đề xuất` |

Bước 2 có **đúng 3 nhóm ô** (autolayout dọc gap 16, nhãn 16px Bold cách ô 8):

1. `Tỉnh/thành phố` · `Phường /Xã` — 2 cột 310 gap 16, select cao 50 r=80, placeholder cả hai là **`Lựa chọn`**
2. `Tên khu phố/hẻm/ngõ muốn treo biển` — input cao 50 r=80, placeholder *"Nhập tên hẻm ngõ nơi bạn sinh sống"*
3. `Điều dễ thương bạn muốn chia sẻ ở khu phố này` — textarea 636×90 r=16, placeholder *"Nhập đoạn mô tả"*

Khác biệt so với bản 18/8 (đều là **design thắng spec**):

| | Bản cũ | Bản 7/9 |
|---|---|---|
| Tiêu đề popup | `Đề xuất góc phố mới` | **`Đề xuất khu phố mới`** |
| Thứ tự | Tên khu phố → tỉnh/phường → hẻm | **tỉnh/phường lên đầu** |
| Tên khu phố + tên hẻm/ngõ | 2 ô | **1 ô GỘP** |
| Ô "Viết câu nhắc thương của bạn (nếu có)" | có | **BỎ** |
| Hộp cảnh báo ⚠️ + chip 4N ở bước 2 | có | **BỎ** (docs/20 §2.1) |
| Ô tỉnh/phường khi đã chọn khu phố | input đọc-chỉ | select bình thường |

Hệ quả: `location_text` và `neighborhood_text` nay **cùng một giá trị**; `neighborhood_id` chỉ có
khi người dùng chọn khu phố có sẵn từ gợi ý; đổi tỉnh/phường thì **xoá `nbId`** (khu đã chọn
không còn khớp địa giới); **tỉnh/thành bắt buộc cho mọi trường hợp**; payload POST
`/api/v1/issues` không còn `suggested_content`.

Nút "Đề xuất" mở **THẲNG form** — định danh chỉ hỏi ở bước Gửi (trước 18/8 gọi `requireIdentity`
trước nên bung modal "Để FPT gửi ưu đãi…", team review đọc thành "ra nhầm popup ưu đãi").

### 3.5 Lead tầng 2 (khối "Ưu đãi cư dân")

- Form: tên · SĐT · **Tỉnh/thành (chọn, BẮT BUỘC)** · địa chỉ · **6 lựa chọn dịch vụ** (lưới 3 cột × 2 hàng, Figma 2/9 · B6) · checkbox opt-in (**mặc định không tick**).
- ~~Ô free text "Bạn đang ở khu phố nào?"~~ và ~~dòng "Bạn sẽ xác thực số điện thoại một lần…"~~ **đã gỡ**.
- Bấm gửi khi chưa tick → báo lỗi ngay ở client, đồng thời server cũng từ chối (phòng thủ 2 lớp).
- SĐT nhập lệch với định danh phiên → server trả 409 kèm cờ; UI hiện hộp xác nhận "Tiếp tục với số mới" / "Để mình kiểm tra lại".
- Gửi thành công: form thay bằng thẻ cảm ơn 🧧 + toast.

### 3.6 `IssueBoard` — 3 tab, ba thực thể khác nhau

| Tab | Nhãn | Dòng là gì | Số dòng | Nút mỗi dòng | CTA đáy |
|---|---|---|---|---|---|
| 1 | Góc phố mới cần treo biển | **GÓC PHỐ** — chỉ góc `status !== 'signed'` **và `suggestion_count === 0`** (chốt 7/9) | 6, **có** phân trang | `Gửi lời nhắc` (viền cam 120×35) | **không có** (design không vẽ) |
| 2 | Lời nhắc chờ bạn bình chọn | **CÂU NHẮC** (`getVotingNotes`) — tiêu đề là nội dung câu, meta `phường · tác giả · N Bình chọn` | 5, **KHÔNG** phân trang | `Bình chọn` viền **xanh** + trái tim (119×35); đã bấm → `Đã bình chọn` | `+ Viết câu nhắc của riêng bạn` → `SpotPickerModal` |
| 3 | Cây bút của khu phố | **NGƯỜI** (`getAmbassadors(10)`) — huy hiệu TOP 1/2/3, meta `N câu đóng góp · N Bình chọn` | 5, có phân trang | `Xem lời nhắc` viền **cam** → `AmbassadorModal` | `+ Đề xuất góc phố mới` |

- Bộ đếm trên tab đếm **theo đúng bộ lọc** của tab đó.
- Tab 1 dòng meta **luôn** là "Chưa có câu đề xuất" (bỏ nhánh "N câu đề xuất"); rỗng thì hiện
  *"Góc phố nào cũng đã có lời nhắc rồi — bạn đề xuất góc mới nhé!"*.
- Nhãn tab có bản **rút gọn cho mobile**: `Góc phố mới` · `Chờ bình chọn` · `Cây bút`.
- Kẻ ngăn dòng là **nét đứt** `.kp-row-sep` (`[5,5]`), dòng đầu không có kẻ; tab 1 có kẻ cả sau dòng cuối.

### 3.7 Banner báo tin in-web là LỚP NỔI (sửa 7/9)

Khối thông báo `fixed` góc **trái dưới** (`sm:w-380`, `max-h-60vh` cuộn được, `z-40` để modal
`z-50` vẫn đè lên), đặt cạnh toast ở **CUỐI** `HomeShell`.

Vì sao: trước đó khối này nằm **trong luồng** giữa thanh nav và hero. Ba thông báo cao ~430px đẩy
hero tụt xuống, mà nền hero là lớp `absolute` cao **đúng 900px tính từ mép trang** (số đo `.fig`)
⇒ tiêu đề hero chữ trắng rơi ra khỏi dải gradient, nằm trên nền kem; nền cam đặc của khối banner
còn cắt gradient thành hai mảng lệch màu.

Trên mobile đặt `bottom-[96px]` để không đè nút nổi "Lên đầu trang" (`BackToTop` —
`fixed bottom-6 right-4`, cũng `z-40`).

> **Bẫy áp cho MỌI khối mới đặt trong `<div className="relative">` bọc hero**: nền hero là
> `absolute` nên con `static` cùng stacking context bị vẽ đè — phải thêm `relative`.

## 4. Khối "Khu phố tiêu biểu" (`NeighborhoodSlider`)

- Bản đồ khu phố đã bị bỏ từ 1/8. ~~Từ 18/8 khối này chỉ hiện khu đã đạt chuẩn 4N (`certified_4n`);
  `is_featured` chỉ còn dùng xếp thứ tự~~ → **(chốt 7/9)** slider lấy khu **`is_featured`** rồi
  `.slice(0, FEATURED_SLOTS)` với `FEATURED_SLOTS = 10` (`src/lib/featured.ts`). Trước đó cả cờ
  tiêu biểu lẫn `featured_position` đều **vô nghĩa** vì slider lọc theo `certified_4n`.
- Thứ tự do server sắp sẵn `ORDER BY featured_position NULLS LAST, name` — admin xếp **slot 1–10**
  ở `/admin/khu-pho`; xếp trùng slot ⇒ hoán đổi hai khu.
- Không còn hàng chip chọn phường, không còn bộ đếm ảnh, không còn nút đề xuất trong khối.
- Badge "KHU PHỐ TIÊU BIỂU" **nghiêng -2°** (hộp 213×55); khung ảnh là **trắng 50% + viền trắng 1.5px**
  (không phải trắng đặc, không bóng); pill địa chỉ 1 dòng nổi góc phải; mũi tên 40×40 nền trắng 50%,
  chevron cam, tâm (260/1180, 522) — trên mobile mũi tên nằm **trong** khung.
- Mỗi khu hiện **đúng 1 ảnh** — `neighborhood_photos` vị trí #1 (admin vẫn upload được 4 ảnh);
  chưa có ảnh nào thì dùng `map_stylized_key`.
- Chưa có khu nào ⇒ giữ khung, hiện lời mời.
- Trượt ngang bằng `translateX` trên track có **kẹp bản sao** khu cuối ở đầu và khu đầu ở cuối;
  tới clone thì tắt transition, nhảy về slide thật rồi bật lại (double rAF). Cú nhảy hẹn bằng
  **`setTimeout`, không nghe `transitionend`** — tab ẩn hoặc máy bật "giảm chuyển động" thì
  transition không chạy, sự kiện không bắn, index trôi ra ngoài dãy và khung ảnh trắng trơn.
- Auto-slide 4s **tắt hẳn** khi `prefers-reduced-motion: reduce` (QC 2/9 · C3): CSS
  `motion-reduce:transition-none` chỉ tắt hiệu ứng trượt, ảnh vẫn nhảy.

## 4b. Ô tra cứu 4N (`HeroLookup`) — `Frame 261`

Thanh tra cứu (`Frame 135`): 816×45 r=97.5 nền trắng viền cam, autolayout ngang lề trong **16**,
gap 8, chỉ gồm **kính lúp 18px + placeholder 16px Light `#969696`**.

> **KHÔNG có nút tròn cam "+" bên phải.** Component `Searchbox` (`7458:39736`) trong `.fig` có node
> `Button` 30×30 fill `#FF8206`, nhưng instance dùng ở frame landing (`7458:39755`) override
> `visible: false`. Test khoá: thanh tra cứu không chứa `<button>` nào (`tests/ui/hero-lookup.test.tsx`).

Dropdown là lớp **NỔI** (`.kp-lookup-panel`, `position:absolute`) nên nội dung dưới **không bị đẩy** —
đo trên Chrome: nhãn "Biển đã treo" giữ y=1234 dù dropdown mở hay đóng. Khung chung: x=312 y=1193
w=816 r=16 **nền trắng**, cách ô nhập 8px. Ba trạng thái:

| Trạng thái | Frame | Khung |
|---|---|---|
| (a) nhiều kết quả | `7745:2107` | h=231, lề trong 24, dòng 45 gap 24, mỗi dòng có **pill xanh "Đạt chuẩn 4N"** |
| (b) đúng 1 kết quả | `7458:38738` | h=184: card `Frame 274` 768×77 r=16 nền `#FFF7EA` → gap 24 → hàng 35: câu mời **CAM Bold 16** + nút `Xem khu phố` 140×35 viền cam |
| (c) rỗng | `7745:1345` | h=72: pin + chữ 16 Light `#969696` (lề trái 32) + nút đề xuất 212.3×40 |

Câu mời ở trạng thái (b) tách theo `notes_count` (chốt 7/9 — trả lời cho việc design chỉ vẽ MỘT dòng):

| `notes_count` | Câu |
|---|---|
| = 0 | *Khu phố mình chưa có lời nhắc, bạn viết câu đầu tiên nhé?* |
| > 0 | *Hãy cùng góp thêm lời nhắc cho khu phố nhé!* |

Bấm "Xem khu phố" / pill địa chỉ trên slider / deep-link `/?khu-pho=<slug>` đều mở **popup**
`NeighborhoodModal`, **không rời trang**.

## 5. Hệ thống thiết kế

Token khai báo bằng `@theme` trong `src/app/globals.css` (Tailwind 4) — sửa màu ở đây là đổi toàn hệ thống.
**Giữ nguyên TÊN token cũ** (`brick`, `cream`, `olive`…) và chỉ đổi **GIÁ TRỊ** khi đổi da (quyết định F7),
nhờ vậy trang admin + trang share dùng chung không phải sửa.

| Nhóm | Token | Giá trị (skin cam FPT) |
|---|---|---|
| Nền | `--color-cream` / `-panel` / `-dark` | `#FFF7F2` / `#FFFBF8` / `#DEDEDE` (kẻ ngang) |
| Chủ đạo | `--color-brick` / `-dark` / `-light` | **`#FF8206`** / `#E86305` / `#FFF0E2` |
| Hero | `--kp-hero-from` / `--kp-hero-to` | `#FF7B00` / `#FFEFE6` |
| Viền nav | `--kp-nav-border` | `#FFEBB8` |
| Chữ | `--color-ink` / `-soft` | `#3D3D3D` / `#969696` |
| Nhấn | `--color-accent-blue` (+`-light`) | **`#2323FF`** (nút "Bình chọn", badge "Khu phố tiêu biểu", TOP 1) |
| Phụ | `--color-olive`, `--color-fpt`, `--color-teal` | `#7C8A5A`, `#FF8206`, `#2F6B4F` |
| Trạng thái | `--color-status-waiting/voting/signed` (+ `-bg`) | đỏ gạch / cam / xanh lá |
| Bóng | `--shadow-kp`, `--shadow-kp-s` | bóng mềm nâu |

### Font — **FPT SongVui**

`--font-sans` và `--font-display` đều là `"FPT SongVui"` (fallback Be Vietnam Pro / Baloo 2 cho
trang admin và lúc font chưa tải). 6 face woff2 ở `public/fonts/`: Light **300** / Regular **400** /
Bold **700** (+ 3 bản nghiêng), nguồn `docs/lp/font_FPT_songvui.zip`.

> ⚠️ **KHÔNG dùng `font-extrabold` / `font-semibold` ở trang chủ** — SongVui không có 600/800 nên
> trình duyệt giả đậm, nét bệt và sai mặt chữ. Body / hint / meta trong design là **Light**.

### Lớp tiện ích tự định nghĩa

`.kp-btn` + biến thể **`-primary`** (viền cam nền trắng — CTA chính) · `-solid` (khối cam đặc) ·
`-vote` (viền xanh dương) · `-outline` · `-ghost` · `-row` (cỡ chữ 14 + nowrap cho nút trong dòng);
`.kp-input` (cao 44 mobile → 40 từ `sm`, chữ 14 — khối ưu đãi) và **`.kp-input-lg`** (cao 50 /
textarea 90, chữ 16 — trong popup); `.kp-h2` + `.kp-hero-title` / `.kp-sec-title` / `.kp-lead-title`;
`.kp-stripe` / `.kp-stripe-b`; `.kp-lookup-panel`; `.kp-row-sep` (+ `-b`); `.kp-nav-cut` / `.kp-nav-line`;
`.kp-n4chip` / `.kp-n4note`; `.kp-sign`; `.tap` (chiều cao chạm ≥44px); `.kp-scroll-x`; `.kp-safe-b`.

Đã xoá (2/9, 0 tham chiếu): ~~`.kp-drawer`, `.kp-scrim`, `.kp-quote`, `.kp-pin`, `.kp-pin-sign`,
`.kp-kicker`, `.kp-card`, `.kp-card-3`, `.kp-sway`, `.floaty`~~.

### ⚠️ Họ bẫy CSS đã cắn 3 lần (C1 / C2 / 7/9)

Các lớp `.kp-*` và `.tap` khai báo **NGOÀI `@layer`** nên **utility của Tailwind KHÔNG đè được**:

| Lần | Triệu chứng | Cách chốt |
|---|---|---|
| C1 | `.kp-h2 { letter-spacing }` thắng `tracking-[-0.03em]` | thêm `.kp-hero-title` / `.kp-sec-title` / `.kp-lead-title` khai báo **SAU** `.kp-h2` |
| C2 | `.tap { min-height: 44px }` đè `.kp-input` ở `sm` | `.kp-input` chốt `height` **và phải nhả `min-height: 0`** ở `sm` |
| 7/9 | Nút dropdown ra h=44 thay vì 35 | chốt `h-11 sm:h-[35px]` (bỏ `.tap`), mượn `.kp-btn-row` cho cỡ chữ 14 |
| 7/9 | Ô popup ra 40px và textarea 95.4px thay vì 50/90 | `.kp-input-lg` + `textarea.kp-input-lg` phải đứng **CUỐI cụm** (cùng specificity → rule sau thắng) |

Test khoá thứ tự khai báo: `tests/globals-css.test.ts` (đọc thẳng `globals.css`).

### Quy chuẩn mobile (design KHÔNG có frame mobile — team dev tự đặt, 2/9)

Breakpoint `sm = 640` · lề ngang 16px, **không phần tử nào chạm mép** · ô nhập 16px (chống iOS
auto-zoom) · vùng chạm ≥44px · modal = bottom sheet bo trên 24 có tay nắm, ẩn dải sọc · mũi tên
slider nằm trong khung · dải con số 1 hàng 3 cột (số trên, nhãn dưới) · top bar rút gọn nhãn CTA
còn "Ưu đãi" và thu nhỏ pill logo để không đè nhau · hai link nav chỉ bật từ `xl` (1280) ⇒
**nav mobile KHÔNG còn lối vào đề xuất** (vào từ CTA đáy tab 3 hoặc dropdown tra cứu rỗng).

### Asset thương hiệu (`public/brand/`)

`kv-khu-pho.webp` (+ `-sm`), `skyline.webp`, `plaza.webp` (sàn gạch), `hero-arc.webp` (cung nét đứt),
`signpost.webp`, `sweepers.webp`, `cart.webp`, `sign-logos.webp`, `logo-khu-pho.svg`
(tách riêng phần hình từ `docs/lp/logo.svg`, viewBox `29.5 11.7 133 71.2` — **một file dùng cho cả
top bar lẫn chỗ khác**, pill trắng dựng bằng CSS).
`sign-fptplay.webp` hiện **mồ côi** (dải khuyến mãi trên biển đã bỏ 3/9) — giữ phòng Design khôi phục.

### Bẫy cuộn (phát hiện khi đo trên Chrome)

- `html { scroll-behavior: smooth }` toàn cục ⇒ `window.scrollTo(0, y)` dạng 2 tham số bị cuộn
  **mượt** và bị cắt ngang giữa đường. Mọi lệnh cuộn "phải tới nơi" bắt buộc dùng
  `scrollTo({ top, behavior: "instant" })`.
- Đo bằng iframe thì **cộng thêm 17px** cho thanh cuộn: `width: 1457px` mới ra `clientWidth` 1440.

Animation: `heart-pop`, `slide-up`, `kp-fade-in`. **Toàn bộ animation tắt trong
`@media (prefers-reduced-motion: reduce)`** — và với slider phải tắt bằng **JS**, không chỉ CSS.

### Khả năng tiếp cận

- `html { font-size: 16px }` — chữ tối thiểu 16px.
- Vùng chạm ≥44px qua lớp `.tap`.
- Modal có `role="dialog"`, `aria-modal="true"`, đóng bằng Esc, nút đóng có `aria-label`; banner báo tin có `aria-live="polite"`.
- SVG trang trí gắn `aria-hidden`; ảnh nội dung luôn có `alt` mô tả.
- Bố cục grid co giãn, kiểm ở 360px không vỡ.

## 6. Trang share & OG image

Ba trang share đều: truy vấn 1 lần → `generateMetadata()` (title, description, `og:image`) → render thẻ trắng bo tròn trên nền kem + nút "Viết câu nhắc cho xóm mình" về trang chủ.

| Trang | Điều kiện hiển thị | OG badge | Copy nguồn |
|---|---|---|---|
| `/bien/{id}` | Chỉ câu `status='installed'`; id phải đúng dạng UUID, sai → 404 | "🎉 Biển đã treo tại đây" | `COPY.shareSign` |
| `/dai-su/{slug}` | User theo `share_slug`, **loại tài khoản shadow-ban** | "Cây bút của khu phố" | `COPY.shareAmbassador` |
| `/khu-pho/{slug}` | Mọi khu phố **chưa xoá mềm** (đã xoá → 404); đã chứng nhận thì hiện huy hiệu | tên khu phố | `COPY.shareCertified` |

Ruột `/khu-pho/{slug}` là **`NeighborhoodView`** dùng chung với popup, bật prop `hero` để giữ ảnh +
badge 4N (quyết định Q5). Nút "Viết lời nhắc cho xóm mình" ở đó trỏ `/?viet-loi-nhac=<tên khu phố>`
(§3.3b) — ~~`href="/"`~~ mất ngữ cảnh.

OG image sinh bằng `next/og` (satori), 1200×630, nền kem `#FBF5EC`, chữ đỏ gạch `#B23A2E`, font Be Vietnam Pro nạp từ `public/fonts/*.ttf`. Layout dùng chung ở `src/lib/og.tsx` (`ogCard({badge, title, subtitle, footer, emoji})`).

URL share **không chứa SĐT và không dùng id đoán được** cho hồ sơ người dùng (`share_slug` ngẫu nhiên 10 ký tự).

## 7. Giao diện admin

`AdminShell` = sidebar **7 mục** (desktop, thu gọn được — nhớ localStorage `kp_admin_sidebar`) /
dãy chip cuộn ngang (mobile), hiển thị email admin, nút đăng xuất. Guard UX: gọi `/api/admin/me`
khi mount, lỗi thì đẩy về `/admin/login`.

Sidebar: `📊 Dashboard` · `🏘️ Khu phố` · `✍️ Lời nhắc` · `💛 Theo dõi thương` · `🧧 Leads` ·
`📝 Nội dung` · `🛡️ Chống gian lận`.

Component dùng chung: `Card`, `Btn` (4 biến thể), `ImportModal`, và **`table-tools.tsx`**
(`useUrlState`, `SearchBox`, `Tabs`, `Th`, `Pager`, `clampPage`).

> `useUrlState` đọc URL **sau khi mount** rồi ghi bằng `history.replaceState` — cố tình **KHÔNG dùng
> `useSearchParams`** để không phải bọc `Suspense`. Nhờ vậy mọi bộ lọc/tìm kiếm/phân trang của admin
> nằm trên query string (`?tab=…&status=…&q=…&page=…&per=…`), chia sẻ link là ra đúng màn đang xem.

| Màn | Điểm nhấn |
|---|---|
| `/admin/khu-pho` | Bảng khu phố: 3 công tắc **bật/tắt không điều kiện** (hiển thị website · khu phố tiêu biểu · đạt chuẩn 4N), ô **slot slide 1–10**, 4 ảnh tổng quan + 1 ảnh chứng nhận, nút **🗑 Xoá** (mềm) và tab **🗑 Đã xoá** để khôi phục |
| `/admin/khu-pho?tab=de-xuat` | Duyệt đề xuất, xem được **mọi trạng thái** chứ không chỉ hàng chờ; popup từ chối có ô lý do |
| `/admin/loi-nhac` | 4 checkbox 4N kèm **gợi ý tiêu chí ngay trên UI**; nút "Duyệt hiển thị" **disabled** đến khi đủ 4 ô (server vẫn kiểm lại) |
| `/admin/loi-nhac?tab=bien` | Nhóm câu theo góc phố, xếp theo số thương; câu đầu bấm chọn thẳng, câu khác bắt buộc nhập lý do. Ô "ngày treo" là `Record<id, string>` — **riêng cho từng dòng** (B2) |
| `/admin/voting` | Sửa số thương của câu / của người; ô số phải bắn `input` **và `focusout`** mới lưu |
| `/admin/noi-dung` | Sửa 13 khoá text + ghi đè 3 con số hero (8/9); để trống hoặc trùng mặc định = xoá ghi đè |
| `/admin/leads` | SĐT dạng `090***567`, bấm mới hiện (kèm cảnh báo có log); thêm 2 cột **Tỉnh/thành** + **Địa chỉ**, lọc theo tỉnh |
| Mọi màn | Cờ `loaded` → hiện "Đang tải…" thay vì **loé thông báo rỗng** ở khung hình đầu (B3) |

### Ba ca thông báo sau khi xếp slot slide (đừng gộp)

| Ca | Câu |
|---|---|
| Slot còn trống | `Đã xếp vào slot slide số N ✓` |
| Khu vừa xếp **đang giữ slot khác** | *đổi chỗ với "X" (giờ ở slot cũ)* |
| Khu vừa xếp **chưa có slot** | *"X" bị đẩy ra khỏi 10 slot* |

Hàm `slotMessage(rows, n, pos)` tra khu đang giữ slot đích ngay trong `rows` của client.

### Mẹo QC màn admin bằng trình duyệt

Thanh thông báo tự ẩn sau 6s làm **trôi cả bảng ~52px** — click theo toạ độ chụp trước đó là bấm
nhầm hàng khác. Thao tác chắc ăn: tìm hàng bằng JS (`tbody tr` chứa tên) rồi `.click()`. Riêng ô số
phải bắn `nativeInputValueSetter` + `input` + **`focusout`** (`inp.blur()` không ăn vì element chưa
thực sự được focus).

## 8. Quy tắc khi sửa giao diện

1. **Không sửa lời** trong `src/lib/copy.ts` — đó là bản đã duyệt của khách hàng. Cần đổi thì xin duyệt rồi cập nhật cả `06-CONTENT-COPY.md`.
2. Thêm màu mới thì thêm **token** trong `@theme`, đừng viết mã hex rải rác trong component.
3. Mọi link/asset qua `BASE` / `withBase()` / `absoluteUrl()`.
4. Gọi API qua `client-api.ts` để không quên CSRF.
5. Ảnh dùng `<img>` thường (đã tắt eslint rule tại chỗ) vì ảnh đi qua route stream, không dùng Next Image optimizer.
6. Giữ nguyên bảng màu trạng thái 3 màu — admin đang đọc danh sách theo quy ước này.
7. Thêm animation thì nhớ bổ sung vào khối `prefers-reduced-motion` — và nếu animation do JS
   điều khiển (auto-slide, đếm giờ) thì phải đọc `matchMedia("(prefers-reduced-motion: reduce)")`
   trong code, CSS không đủ.
8. **Đừng đo px bằng jsdom.** `pnpm test` chạy `tests/ui/*.test.tsx` trong jsdom — jsdom KHÔNG tính
   layout và KHÔNG hiểu media query. Số đo mobile/popup phải đo bằng DOM thật trong Chrome
   (mẹo: dựng `<iframe src="/" width=…>` rồi đo trong `contentDocument`; vá `matchMedia`/`fetch`
   của `contentWindow` **trước khi** trang hydrate để giả lập giảm chuyển động / mạng chậm).
9. Thêm class `.kp-*` mới thì kiểm lại **thứ tự khai báo** trong `globals.css` — xem họ bẫy ở §5.
10. `pnpm build` khi `pnpm dev` đang chạy sẽ ghi đè `.next` của dev server ⇒ dev server trả 500 cho
    mọi route và không tự hồi. Tắt dev server trước khi build thử.
