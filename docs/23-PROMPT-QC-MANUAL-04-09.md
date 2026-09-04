# PROMPT — QC MANUAL TEST TOÀN DIỆN (web + admin) · phiên 4/9/2026

> Dán nguyên khối dưới đây cho agent. Mọi thứ trong `---` là nội dung prompt.

---

## 0. VAI TRÒ

Bạn là **QC manual tester kiêm dev sửa lỗi** của dự án "Khu phố biết thương" (repo
`khu_pho_yeu_thuong`). Bạn không phải người đọc lướt rồi kết luận "khớp" — bạn phải **mở
trình duyệt thật, bấm từng nút, đo từng số đo, đối chiếu từng pixel** với file design, rồi
mới được viết một dòng nhận xét.

Nguyên tắc bất di bất dịch:

1. **Không kết luận bằng mắt.** Mọi khẳng định về khoảng cách/kích thước/màu phải kèm số đo
   lấy từ DOM thật trong Chrome (`getBoundingClientRect`, `getComputedStyle`) và số đối chiếu
   lấy từ `.fig` (node-id + toạ độ).
2. **Không tin test suông.** `pnpm test` chạy jsdom, jsdom KHÔNG tính layout và media query.
   Test xanh ≠ giao diện đúng.
3. **Không tự chế nội dung/luật nghiệp vụ.** Chữ tiếng Việt lấy từ `src/lib/copy.ts` /
   `site_content` / ảnh export Figma. Khác biệt không giải thích được → ghi vào mục "CÂU HỎI
   CHẶN" và hỏi lại, không đoán.
4. **Sửa xong phải test lại thực tế trên browser**, không phải "đã sửa, chắc là được".

## 1. NGUỒN SỰ THẬT (thứ tự ưu tiên khi mâu thuẫn)

> ⚠️ **CẬP NHẬT 4/9 — bản `.fig` trong repo ĐÃ CŨ.** Mở link design thật thấy section
> Design có **12 frame Landing page** (bản 2/9 chỉ 5) và nội dung đã đổi (tab 2, tab 3 —
> xem §3.4/§3.5). Vì vậy **link figma.com là nguồn số 1**, `.fig` local chỉ dùng để đo
> toạ độ những khối chưa đổi. Việc đầu tiên: xin Design export `.fig` mới vào `docs/lp/`.
> Cách đọc file live bằng Claude-in-Chrome (prototype mode + bắn wheel vào canvas) đã ghi
> trong `CLAUDE.md` mục "Figma LIVE 4/9".

1. **Link Figma LIVE**:
   `https://www.figma.com/design/FMiW4tzQvKgi8qomzYFlff/Landingpage-FCM?node-id=7217-1989`
2. **File Figma bản 2/9 (CŨ)**: `docs/lp/LandingpageFCM.fig` — page `7217:1989`, section "Design".
   Frame chuẩn `7217:1990` (1440×3780). Link online:
   `https://www.figma.com/design/FMiW4tzQvKgi8qomzYFlff/Landingpage-FCM?node-id=7217-1989`
3. **Ảnh export (theo bản 2/9)**: `docs/lp/Landing page.png` … `Landing page-4.png` (2880×7560 = 1440×3780 @2x),
   `Group 4.png`, `Frame 151.png`, `06 1.png`, `Khu phố 2 1.png`, `123123 1.png`, thư mục
   `docs/lp/vuesax/` (bộ icon) và `docs/lp/FONT v3 SONGVUI/`.
4. **`docs/22-QC-FIGMA-MOI-02-09.md`** — bản QC phiên trước, đã fix xong A + B1–B10 + C1–C5.
   Dùng làm tham chiếu, **không dùng làm bằng chứng "đã đúng"**: phải đo lại.
5. **Ảnh chú thích của team** (ảnh `k4.png` đính kèm yêu cầu này) và checklist §3 dưới đây.
6. Spec `docs/01`…`docs/19` — chỉ dùng cho **luật nghiệp vụ**. Về giao diện: **DESIGN THẮNG
   SPEC** (quyết định đã chốt, `docs/20` §2.1).

### Cách đọc `.fig`

```bash
rm -f scripts/figma/nodes.pkl && python3 scripts/figma/parse.py   # ~40s, sinh nodes.pkl
python3 scripts/figma/dump.py 7217:1990 6                          # cây node + x/y/w/h/màu/font
```

**Ba cái bẫy bắt buộc nhớ:**
- `dump.py` **không lọc `visible=false`** → node ẩn vẫn in ra (ví dụ "+300 Người đóng góp",
  `Frame 202` khối KV chân trang). Muốn biết node có hiện không: so chiều cao frame cha
  auto-layout với tổng chiều cao các con.
- `dump.py` **không resolve text override của INSTANCE** → nhãn nút/tab đọc ra là text mặc
  định của symbol. **Nhãn phải đọc từ ảnh PNG**; chỉ tin `.fig` ở toạ độ/màu/kích thước.
- 6 frame popup trong `.fig` vẫn còn **nhãn nav CŨ**, 3 frame landing còn **nhãn 3 con số CŨ**.
  Lấy `7217:1990` làm chuẩn.

## 2. MÔI TRƯỜNG & QUY TẮC KỸ THUẬT

- Dev server: `pnpm dev` (cổng 3001). **TUYỆT ĐỐI KHÔNG chạy `pnpm build` khi dev server đang
  chạy** — build đè `.next` của dev, trang mất CSS. Muốn verify: `pnpm test` + `tsc --noEmit`.
- DB: Postgres qua docker (`docker exec khu_pho_yeu_thuong-db-1 psql -U khupho -d khupho`).
- E2E: `pnpm test:e2e` gọi thẳng server đang chạy (`E2E_BASE_URL`, mặc định
  `http://localhost:3001`), tự SKIP nếu không thấy server.
- Đo số đo px: dựng `<iframe src="/" style="width:1457px">` (1440 + 17px scrollbar macOS) rồi
  đo trong `contentDocument`. Ảnh `loading="lazy"` trong iframe ngoài viewport sẽ không tải →
  đổi `loading='eager'` và gán lại `src` trước khi đo.
- `scroll-behavior: smooth` là **toàn cục** → mọi lệnh cuộn "phải tới nơi" dùng
  `scrollTo({ top, behavior: "instant" })`. Dạng 2 tham số bị cuộn mượt và cắt ngang.
- Extension Claude-in-Chrome có thể **chưa có quyền `figma.com`** → nếu không mở được link
  design, dùng `.fig` local + ảnh PNG (đủ dùng, đã chứng minh ở phiên 2/9).
- Font FPT SongVui **không có weight 600/800** → cấm `font-semibold` / `font-extrabold` ở mọi
  màn công khai (trình duyệt giả đậm, sai mặt chữ).
- Chuẩn mobile (design không có frame mobile, team dev tự đặt): breakpoint `sm=640`, lề ngang
  16px, **không phần tử nào chạm mép**, ô nhập ≥16px (chống iOS auto-zoom), vùng chạm ≥44px,
  modal = bottom sheet bo trên 24 có tay nắm.
- Đọc `CLAUDE.md` (gốc repo) + `docs/CLAUDE.md` trước khi sửa: 4N thủ công, không OTP/SMS, mã
  hoá SĐT, CSRF double-submit, mọi ghi điểm qua `score-service.ts`.

## 3. LỖI TEAM ĐÃ BÁO — BẮT BUỘC XỬ LÝ TRƯỚC, KHÔNG ĐƯỢC BỎ SÓT

Với **mỗi** mục: đo hiện trạng → trích số đo Figma (node-id) → nêu nguyên nhân trong code
(file:dòng) → sửa → chụp lại màn hình đối chiếu.

### 3.1 Lệch padding (xem ảnh chú thích)
Rà **toàn bộ** lề/padding trang chủ ở khổ 1440 so với `7217:1990`: khối nội dung rộng **1276**,
lề ngoài **82**; thanh nav lề trong; card `IssueBoard` `x=82 y=1570 w=1276 h=550 r=40` viền
`#FF8206 1.9px`, nội dung trong card `x=166 w=1108`; lưới biển `y=2278 h=556` gap 32; panel ưu
đãi full-bleed bo 40px hai góc trên. Lập **bảng: khối · Figma (x/y/w/h) · web đo được · lệch**.
Lệch >2px là lỗi phải sửa.

### 3.2 Ảnh nền hero chưa chính xác / bị lệch — **so lại với hình gốc**
Ảnh chú thích khoanh đỏ 2 chi tiết trong hero:
- **Gánh hàng rong** (`/brand/cart.webp`, node "01 1", Figma `x=10 y=739 w=236 h=171`):
  đang bị đặt **cao hơn** thiết kế → phải hạ xuống, chân người/xe đứng trên sàn gạch.
- **Ông cháu quét sân** (`/brand/sweepers.webp`, node "02 2", Figma `x=1238.2 y=708 w=160.5
  h=187.5`): đang **lơ lửng**, phải hạ xuống nằm trên sàn.
- Kiểm luôn **biển "Ngõ Xóm"** (`/brand/signpost.webp`, "06 2", `x=1135.2 y=646 w=176.8 h=308.6`),
  KV (`x=203 y=580 w=1034 h=558`), `skyline` (y=201), sàn gạch `plaza` (y=704), cung nét đứt
  `hero-arc` (y=689), gradient hero `#FF7B00 → #FFEFE6` cao **900**.

**Nghi vấn nguyên nhân** (phải xác minh, không chép nguyên): trong
`src/components/home/HomeShell.tsx` (~dòng 355–385) ba hình rời được đặt `absolute` bằng **%**
so với div bọc, mà chiều cao div bọc lại phụ thuộc tỉ lệ ảnh KV chứ không phải khổ 1440 của
`.fig` → `top-%` sai. Cân nhắc quy đổi lại theo cùng một hệ quy chiếu (ví dụ container có
`aspect-ratio` cố định theo .fig) rồi đo lại cả 3 hình ở 1440 / 1280 / 1024 / 768 / 375.
Đồng thời kiểm **ảnh gốc có bị cắt sai** không: đối chiếu `public/brand/*.webp` với ảnh trong
`.fig` (`images/` trong file zip) và `docs/lp/*.png`.

### 3.3 Tab 1 "Góc phố mới cần treo biển"
Yêu cầu team: mỗi dòng hiển thị **tên góc phố**, **"chưa có biển mới"** (trạng thái), nút
**"Gửi lời nhắc"**.
- Đối chiếu với `7217:1990` (`Frame 177`, dòng cao 50, bước lặp 82, kẻ ngăn **nét đứt
  [5,5] `#DEDEDE`**, có kẻ cả sau dòng cuối) và ảnh `Landing page.png`.
- Xác định chính xác chuỗi trạng thái phải hiện (hiện code đang `Chưa có câu đề xuất` /
  `N câu đề xuất`) — nếu design/team muốn "chưa có biển mới" thì đổi và ghi rõ chuỗi mới vào
  `copy.ts`.
- Nút: `x=1154 w=120 h=35 r=70` viền `#FF8206 1px`, nhãn **Gửi lời nhắc**.

### 3.4 Tab 2 "Lời nhắc cho bạn bình chọn" — ✅ ĐÃ SỬA 4/9, phải VERIFY lại

**Chốt (đã đối chiếu Figma live, frame `7651:1537`)**: mỗi dòng là **MỘT CÂU NHẮC** —
tiêu đề là nội dung câu, meta `pin phường · user tác giả · heart N Bình chọn`, nút
**`Bình chọn`** viền xanh dương bấm thẳng tại dòng, đã bấm thì đổi **`Đã bình chọn`** và
khoá (Q6 — không rút phiếu). CTA đáy `+ Viết câu nhắc của riêng bạn`.

Đã làm:
- `src/lib/notes.ts` `getVotingNotes()` + route `GET /api/v1/notes`; SSR `page.tsx` và
  `refresh()` của `HomeShell` cùng gọi một nguồn. **Không phải đổi DB** — bảng hiện có đã đủ.
- `IssueBoard` tách hẳn nhánh tab 2; `VoteModal.tsx` đã xoá (mất lối vào theo design).
- Test: `tests/ui/issue-board.test.tsx` (8 ca tab 2) + 2 ca e2e `GET /api/v1/notes`.

Việc của QC:
- [ ] Đo lại dòng/kẻ/nút ở 1440 và 375 sau khi có `.fig` mới.
- [ ] Kiểm luồng: chưa định danh → bấm Bình chọn phải mở modal định danh, xong **tự bình
      chọn tiếp**; bấm lại phải bị khoá; API trả 409.
- [ ] Câu của chính mình phải khoá nút (cấm tự thương).
- [ ] **Hỏi Design**: dòng đầu tiên trong frame có chữ **màu cam** — trạng thái gì?
- [ ] **Hỏi BA**: CTA `+ Viết câu nhắc của riêng bạn` đang mở form cho góc phố mở đầu
      tiên (`open[0]`) vì dòng không còn là góc phố — đúng ý chưa, hay cần bước chọn góc?

### 3.5 Tab 3 "Cây bút của khu phố" — ✅ ĐÃ SỬA 4/9

**Chốt**: nút là **`Xem lời nhắc`** viền **cam** (Figma live; bản `.fig` 2/9 còn vẽ
`Bình chọn` viền xanh — đây là chỗ design đã đổi sau khi export). Hành vi giữ nguyên: mở
popup "Cây bút khu phố". Hàng vẫn là NGƯỜI, xếp hạng 1→5, meta `N câu đóng góp` +
`N Bình chọn`, huy hiệu TOP1 `#2323FF` · TOP2 `#FF8206` · TOP3 `#3EAF3F` · ≥4 `#EEEEEE`.

Việc của QC: [ ] đo lại bề rộng nút và khoảng cách sau khi có `.fig` mới.

### 3.6 Bình chọn là CHỐT — ✅ đã đúng, chỉ cần giữ

Đã bình chọn thì **không rút lại được**: cả hai route vote trả 409 `ALREADY_VOTED`, UI khoá
nút. Đã verify trên browser 4/9 (28 → 29 phiếu, bấm lại nhận 409). Mọi thay đổi sau này
KHÔNG được nới luật này.

## 4. PHẠM VI KIỂM THỬ (không được cắt bớt)

### A. Trang chủ `/` — từng khối, đo ở 1440 · 1280 · 1024 · 768 · 375
1. Thanh nav: 2 link (`Đóng góp lời nhắc` cuộn `#goc-xom` · `Đề xuất khu phố cần treo biển`
   mở popup đề xuất), CTA `Ưu đãi dành cho cư dân` cuộn `#uu-dai`, pill logo khoét cung
   `r=60`, viền `#FFEBB8` mờ dần hai đầu, avatar (Q2: chỉ hiện khi đã định danh — lệch Figma
   có chủ ý). **Dưới 1280px hai link ẩn ⇒ mobile không còn lối vào đề xuất từ nav** — kiểm
   xem lối vào thay thế (nút đáy IssueBoard / dropdown tra cứu rỗng) có thật sự hoạt động.
2. Hero: tiêu đề, mô tả, slider khu phố (chỉ khu đạt chuẩn 4N, badge nghiêng −2°, mũi tên
   40×40 nền trắng 50%), 4 ảnh rời (§3.2), auto-slide + `prefers-reduced-motion`.
3. Ô tra cứu 4N + dropdown **3 trạng thái**: nhiều kết quả (pill xanh `Đạt chuẩn 4N`, icon
   `vuesax/linear/tick-circle`), đúng 1 kết quả (card `#FFF7EA` + dòng mời + nút `Xem khu phố`),
   rỗng (pin + `Chưa tìm thấy khu phố này` + nút `+ Đề xuất góc phố mới`).
4. Ba con số: nhãn `Biển đã treo` · `Khu phố` · `Câu đóng góp` — **kiểm cả con số có đúng
   nguồn dữ liệu không**, không chỉ nhãn.
5. `IssueBoard` — §3.3–3.5 + phân trang, trạng thái rỗng, polling 20s không nhảy chữ.
6. Khối 6 biển (`SignGallery` + `SignCard`): biển 404×199, **không còn dải khuyến mãi**
   (quyết định 3/9), cỡ chữ câu nhắc co theo độ dài (`fontSizeFor`, 3 bậc 9.6/7.4/6.2 cqw) —
   test câu 20 / 60 / 120 ký tự, không được tràn/cắt đáy.
7. Khối ưu đãi `#uu-dai`: 6 lựa chọn dịch vụ 2 hàng × 3, ô nhập `.kp-input` cao 40 (44 mobile),
   validate tỉnh/thành bắt buộc, gửi lead thành công + ghi DB.
8. Chân trang: chỉ còn khối chữ 697 canh giữa, 16px Regular `#000000`. **Đang treo**: khối chữ
   cao 134 (5 dòng) vs `.fig` 84 (~3 dòng) vì dòng `footer_support`. Đo lại và đưa vào câu hỏi.
9. Nút **Lên đầu trang** (`x=1313`, icon 55×55 nền cam + nhãn 12px): hiện/ẩn đúng ngưỡng,
   cuộn về đỉnh thật sự tới nơi.
10. **Tổng chiều cao trang ở 1440 phải tiến về 3780** (lần đo gần nhất 3853 — dư 73px). Tìm
    và chỉ đích danh khối nào dư.

### B. Popup (đo trong DOM thật, không tin jsdom)
Khung chung: rộng **700**, viền **2px `#FF8206`**, lề trong 32, tiêu đề **25px Regular** (KHÔNG
bold), nút ‹/× 35×35, sọc `.kp-stripe-b` cao 12 nằm TRONG khung; mobile = bottom sheet.
- `ProposeModal` (đề xuất góc phố 1/2 + 2/2 — `7458:40650` / `7458:41331`): 5 bước, chọn
  phường qua `NeighborhoodPicker` (search + tự nhập), free text → `neighborhoods.hidden=true`.
- `SuggestModal` (gửi câu nhắc — `7458:41901`): 4 chip 4N **chỉ trang trí + chú thích, KHÔNG
  cho chọn** (Q4 — test khoá: chip không được là `<button>`); không loé "Đang tải…".
- `IdentifyModal` (`7502:831`): bắt buộc tỉnh/thành, z-50 trên mọi lớp.
- `VoteModal`, `NeighborhoodModal` (`7756:2954`), `AmbassadorModal` (`7727:1743`),
  `LeadPromptModal` (1 lần/thiết bị).
- **Khoá cuộn nền**: mở popup → `scrollTo` không được làm nền trôi; mở chồng popup (đề xuất →
  định danh) → đóng lớp trong, nền vẫn khoá; đóng hết → trả đúng `scrollY` cũ.

### C. Trang phụ
`/khu-pho/[slug]` (dùng chung `NeighborhoodView`, bật `hero` — Q5), `/dai-su/[slug]` (còn sống
nhưng không còn lối vào từ trang chủ — xác nhận không 404), `/bien/[id]`,
`/chinh-sach-du-lieu`. Kiểm OG image + title khi chia sẻ.

### D. Admin — **kiểm đủ, đây là phần hay bị bỏ quên**
Đăng nhập `/admin/login` (+ TOTP nếu bật), rồi từng màn:
- `/admin/khu-pho` (gồm tab "Đề xuất góc phố" — `IssuesPanel`): duyệt/từ chối issue, unhide
  khu phố tự nhập, bộ lọc + `q` + phân trang giữ trên query string (`useUrlState`), `counts`.
- `/admin/loi-nhac` (gồm tab "Chọn câu & vòng đời biển" — `SignsPanel`): duyệt câu, chọn câu
  lên biển, ô "ngày treo" theo từng dòng (không dùng chung 1 biến), side-effect `installed`
  (issue→signed, +30đ, notification in-web) chạy trong transaction.
- `/admin/voting`: tăng/giảm số thương, audit_logs `votes_adjust`, điểm ghi/thu hồi đúng.
- `/admin/leads`: cột `province` + `address`, lọc theo tỉnh, xuất CSV đủ cột, **nhãn dịch vụ
  mới hiển thị đúng cho lead cũ** (Q3: giữ 4 mã cũ, đổi nhãn, thêm `camera`,
  `internet_tv_camera`).
- `/admin/noi-dung`: sửa hero/board/signs/footer, upload ảnh KV; **4 khoá `sign_promo_*` /
  `sign_sale_phone` / `sign_hotline` đã gỡ — xác nhận không còn trường chết trên UI**.
- Import Excel/CSV (`ImportModal`): CSV UTF-8 không BOM phải đọc đúng tiếng Việt.
- Analytics, users/shadow-ban, trần 3 đề xuất/tuần, `is_valid=false` khi shadow-ban.
- Bảo mật: CSRF double-submit (`kp_csrf` + `x-csrf-token`), ảnh `private/...` chỉ admin xem
  được, SĐT không lộ ra API công khai.

### E. Luật nghiệp vụ (test bằng HTTP thật, không mock)
1 phiếu/câu · cấm tự thương · **cấm rút phiếu (409 `ALREADY_VOTED`)** · trần 3 đề xuất/tuần ·
trần 3 SĐT mới/thiết bị/giờ (tính theo IP+UA) · điểm theo `docs/05` §4 (3 test case bắt buộc
pass) · notification in-web 4 type issue/suggestion × approved/rejected.

### F. Responsive & chất lượng
375 / 414 / 768 / 1024 / 1280 / 1440: `scrollWidth == clientWidth` ở mọi khổ, không phần tử
chạm mép, không nút xuống 2 dòng, vùng chạm ≥44px. Kiểm `prefers-reduced-motion`, focus
visible, alt cho ảnh có nghĩa, thứ tự heading. Console **không lỗi**, network **không 4xx/5xx**
ngoài dự kiến (dùng `read_console_messages` + `read_network_requests`).
**C4 phiên trước còn treo: đo LCP bản production** — chỉ làm khi đã tắt dev server.

## 5. ĐỀ XUẤT THÊM / BỎ TÍNH NĂNG

Ngoài lỗi, lập 2 bảng:
- **THÊM**: tính năng có trong design/ảnh export nhưng web chưa dựng (nêu node-id + ảnh).
- **BỎ**: tính năng web đang có nhưng design bản 2/9 không còn, hoặc mâu thuẫn luật nghiệp vụ
  (nêu rõ file/route sẽ xoá, ai còn tham chiếu, có cần migration không).
Mỗi dòng: mô tả · bằng chứng · tác động (DB/API/UI) · ước lượng · **mức độ tin cậy**. Việc
nào chưa chắc → không tự làm, đẩy sang §7.

## 6. ĐỊNH DẠNG BÁO CÁO (viết ra file `docs/24-QC-04-09.md`)

Mỗi phát hiện là một mục theo đúng khuôn:

```
### [ID] Tiêu đề ngắn
- Mức độ: Chặn | Cao | Trung bình | Thấp
- Màn/khối: ... (URL + khổ màn hình)
- Hiện trạng ĐO ĐƯỢC: ... (số đo/ảnh/console log)
- Kỳ vọng theo design: ... (node-id + toạ độ/màu/nhãn, hoặc ảnh PNG nào)
- Nguyên nhân trong code: file.tsx:dòng — giải thích
- CÁCH SỬA: (đủ chi tiết để code ngay, kể cả migration/API nếu có)
- CÁCH VERIFY: bước bấm cụ thể + số đo phải ra
```

ID: `A#` giao diện trang chủ · `B#` popup · `C#` trang phụ · `D#` admin · `E#` nghiệp vụ/API ·
`F#` responsive/chất lượng · `N#` đề xuất thêm · `X#` đề xuất bỏ.

Cuối file: bảng tổng hợp (ID · mức độ · trạng thái) + mục **CÂU HỎI CHẶN**.

## 7. CÂU HỎI CHẶN — hỏi, không đoán

Gộp vào một danh sách ở cuối báo cáo. Câu **cần hỏi ngay**: xin Design **export lại `.fig`**
(bản trong repo là 2/9, file live đã đổi) — thiếu nó thì không đo được px, chỉ đối chiếu
được nhãn/cấu trúc. Ba câu treo từ phiên trước vẫn còn:
1. Chân trang: có bỏ dòng `footer_support` ("Đã là khách hàng của FPT…") để về 3 dòng như
   `.fig` không?
2. Dropdown tra cứu 1 kết quả: khu **đã đạt chuẩn 4N** có câu mời riêng không (design chỉ vẽ
   một câu "Khu phố mình chưa có nhiều lời nhắc…")?
3. Sáu frame popup trong `.fig` còn nhãn nav CŨ — Design đồng bộ lại khi nào?

Thêm các câu mới phát sinh, đặc biệt mọi chỗ **yêu cầu của team mâu thuẫn quyết định đã chốt**
(Q1–Q7 trong `CLAUDE.md`) — nêu rõ "đổi quyết định X vì lý do Y".

## 8. QUY TRÌNH BẮT BUỘC

1. **Pass 1 — QC thuần**: chưa sửa code. Mở browser, đi hết §3 và §4, ghi `docs/24-QC-04-09.md`.
   Báo cáo lại cho tôi số lỗi theo mức độ + danh sách câu hỏi chặn.
2. **Sửa theo nhóm**, mỗi nhóm 1 commit, message tiếng Việt kiểu `fix(<khối>): ... (ID)`:
   (a) sửa được ngay không cần hỏi ai → làm luôn;
   (b) cần đổi dữ liệu/API/migration → nêu rõ trong commit;
   (c) cần Design/BA trả lời → **để treo**, không tự chế.
3. **Pass 2 — retest thực tế trên browser**: đi lại đúng các bước ở "CÁCH VERIFY" của từng ID
   đã sửa, kèm số đo mới. Không được retest bằng cách đọc code.
4. Chạy `pnpm test` + `pnpm test:e2e` (server đang chạy) + `tsc --noEmit`. Bổ sung test cho
   mọi hành vi vừa sửa (số đo px thì test DOM thật, đừng viết test jsdom giả layout).
5. Cập nhật `CLAUDE.md` (mục quyết định + bẫy mới) và `docs/24`, đánh dấu trạng thái từng ID.
6. Báo cáo cuối: đã sửa gì · còn treo gì vì sao · rủi ro còn lại.

## 9. ĐỊNH NGHĨA HOÀN THÀNH

- [ ] Mọi mục §3 (5 lỗi team báo + 2 lỗi trong ảnh chú thích) có ID, có số đo trước/sau, đã sửa
      hoặc đã ghi lý do treo.
- [ ] Bảng đối chiếu toạ độ trang chủ khổ 1440 với `7217:1990`, mọi lệch >2px được giải thích.
- [ ] Trang chủ 1440 cao ≈3780 (chênh lệch còn lại được chỉ đích danh).
- [ ] Toàn bộ admin đã bấm thử, không lỗi console, không 4xx/5xx ngoài dự kiến.
- [ ] `pnpm test` + `pnpm test:e2e` + `tsc --noEmit` xanh.
- [ ] Đã retest **trên browser thật** sau khi code, kèm bằng chứng.
- [ ] Có danh sách câu hỏi chặn gửi Design/BA.

**Bắt đầu bằng pass 1. Không sửa code trước khi báo cáo QC.**
