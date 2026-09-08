# Nội dung, copy chuẩn & bộ lọc 4N
Phiên bản 1.1 — cập nhật wording 28/7/2026 theo `khupho_dieuchinh_28_7.xlsx` (bản khách duyệt)

> Cập nhật: 8/9/2026 — đồng bộ với code sau các đợt 18/8, 2–4/9, 7/9.
>
> **Quyết định 2/9: DESIGN THẮNG SPEC.** PM chốt "bám thiết kế đã duyệt 100%", nên một số khối chữ
> bắt buộc trong bản duyệt 28/7 **đã bị gỡ khỏi giao diện** — xem §2.3. Các chuỗi đó **vẫn nằm
> trong `src/lib/copy.ts`** để bật lại được nếu PM đổi ý; §2 dưới đây giữ nguyên bản duyệt.
>
> Ngoài `copy.ts`, một phần text trang chủ nay **admin sửa được** ở `/admin/noi-dung`
> (bảng `site_content`, **13 khoá**) — mặc định của chúng lấy từ `copy.ts` nên copy gốc
> vẫn là nguồn chuẩn. Xem §2.4.

---

## 1. Giọng điệu thương hiệu

- Ấm áp, gần gũi, "tình làng nghĩa xóm". Xưng hô: "xóm mình", "khu mình", "tụi mình" (FPT), "bạn".
- Động từ đặc trưng của chiến dịch: **"thương"** (thay cho like/vote).
- Không dùng ngôn ngữ chỉ trích, ra lệnh, doạ phạt. Không nêu đích danh người/nhà/số nhà cụ thể trong nội dung nhắc nhở.
- Emoji tiết chế: 💛 🧧 ✓, không lạm dụng.

## 2. Copy chuẩn (dùng nguyên văn — đã duyệt từ design, wording 28/7)

Nguồn: `khupho_dieuchinh_28_7.xlsx` (cột "TEXT MỚI"). Code tương ứng: `src/lib/copy.ts`.

| Vị trí | Copy |
|--------|------|
| Hero title | Muốn gửi một lời thương cho xóm mình? **Hãy viết một câu nhắc nhỏ nhẹ nhé!** |
| Hero body | Chọn một góc xóm, cùng mọi người gửi những câu nhắc dễ thương theo tinh thần 4N và bấm "Thương" để bình chọn. Câu được nhiều lượt "Thương" nhất sẽ được FPT đưa lên biển thật, nối tiếp hơn **10.000 lời nhắc** đã hiện diện khắp ngõ hẻm Việt Nam. |
| ~~CTA chính~~ | ~~+ Gửi lời nhắc cho xóm mình~~ → `COPY.ctaMain` đổi thành **`+ Đề xuất góc phố mới`** (1/8, `dieuchinh.1.8` #4) |
| ~~CTA phụ~~ | ~~Xem góc phố đang chờ · 🧧 Quà dành cho cư dân~~ → 3 nút hero **gỡ hẳn** 18/8, gom về top bar (nhãn mới ở §2.2) |
| CTA toàn chiến dịch | Gửi một lời nhắc, thêm một chút thương cho xóm mình. |
| ~~4 counter labels~~ | ~~biển đã treo · góc phố đang chờ · người đóng góp · khu phố tham gia~~ → **3 nhãn** (Figma 2/9 · B2): **`Biển đã treo` · `Khu phố` · `Câu đóng góp`** (`COPY.counterLabels`) — hai ô cuối đổi cả nhãn lẫn ý nghĩa |
| Placeholder câu nhắc | VD: Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi... |
| Ghi chú 4N khi viết | Câu nhắc của bạn sẽ được FPT chúng tớ duyệt theo chuẩn 4N trước khi hiển thị lên website |
| Ghi chú đạo đức | 💛 Giữ cho dễ thương: gọi tên một việc tốt cụ thể, không nêu đích danh người/nhà nào. Câu được chọn sẽ qua bộ lọc 4N và đội ngũ chiến dịch duyệt trước khi lên biển. |
| Banner báo tin vui (in-web) | 🎉 Câu của bạn đã được treo tại {vị trí}! Cảm ơn bạn đã thương xóm mình. |
| Share text — biển treo | Câu nhắc của xóm mình đã lên biển thật 🎉 "{câu nhắc}" — {vị trí}. Cùng viết câu thương cho xóm bạn tại Khu Phố Của Tôi nhé! |
| Share text — Đại sứ | Mình vừa được vinh danh trên bảng "Cây bút của khu phố" 🏆 Lên Khu Phố Của Tôi, viết câu nhắc cho xóm mình nha! |
| Share text — chứng nhận khu | {Tên khu phố} đã đạt "Khu phố biết thương" chuẩn 4N 💛 100% biển đã treo! |
| Checkbox opt-in | Tôi đồng ý để FPT liên hệ tư vấn ưu đãi dành riêng cho cư dân "Khu phố biết thương". |
| Chú thích checkbox (tầng 1) | Tuỳ chọn riêng, không ảnh hưởng đến câu nhắc của bạn. |
| Chú thích checkbox (tầng 2) | *(bỏ — 28/7: không hiển thị chú thích dưới checkbox ở form ưu đãi)* |
| Section lead — badge | 🧧 Món quà nhỏ gửi người góp lời thương |
| Section lead — title | FPT muốn gửi lại xóm mình một điều dễ thương |
| Section lead — body | FPT dành riêng cho cư dân "Khu phố biết thương" những ưu đãi khi đăng ký Internet, Truyền hình và FPT Play. Khi muốn tìm hiểu thêm, bạn chỉ cần để lại thông tin để FPT liên hệ tư vấn. |
| Section lead — privacy | 🔒 Số điện thoại chỉ được sử dụng để tư vấn ưu đãi này khi có sự đồng ý của bạn, không dùng cho mục đích khác và không tự động gọi mời. |
| Nút lead | Nhận ưu đãi của xóm mình |
| Footer support | Đã là khách hàng của FPT và cần hỗ trợ kỹ thuật? Gọi **1900 6600**, không cần điền biểu mẫu này. |
| Footer chiến dịch | Một hoạt động thuộc chiến dịch "Khu phố biết thương" của FPT Telecom · *(xuống dòng)* Nhắc · Nhở · Nhỏ · Nhẹ *(nay là 2 khoá `site_content`: `footer_line1` + `footer_line2`)* |
| Panel biển đã treo | Biển đã treo tại đây · Cảm ơn cả khu phố đã cùng viết nên câu nhắc này 💛 |
| Cảnh báo form đề xuất | ⚠️ Khu Phố Của Tôi tiếp nhận những góp ý về an toàn và nếp sống khu phố. Mỗi đề xuất sẽ được xem xét trước khi hiển thị để lời nhắc luôn phù hợp và văn minh. |
| Leaderboard title | 🏆 Cây bút của khu phố — Những cây bút nhận được nhiều lượt "Thương" nhất từ bà con *(nay là **nhãn tab 3**, không còn tiêu đề khối riêng)* |
| Toast gửi câu thành công | Câu của bạn đã vào hàng chờ duyệt — cảm ơn bạn đã thương xóm mình 💛 |
| Empty state câu nhắc | Chưa có câu nào. Bạn viết câu đầu tiên cho điểm này nhé! |

### 2.1 Copy đặt trực tiếp trong component (bản duyệt 28/7 — **phần lớn ĐÃ THAY**)

⚠️ Bảng này là **bản 28/7 lưu trữ**. Copy đang chạy ở §2.2. Các file `IssueList.tsx`,
`Leaderboard.tsx`, `IssueDrawer.tsx` trong cột "File" **đã bị xoá** khỏi repo.

<details>
<summary>Bảng copy 28/7 (lưu trữ)</summary>

| Vị trí | Copy | File |
|--------|------|------|
| Nav top bar | Góc phố đang chờ · Quà dành cho cư dân | `HomeShell.tsx` |
| Section ví dụ biển — title/hint | Lời nhắc khi lên biển trông như thế nào? · Cùng ngắm qua vài mẫu minh họa với những câu nhắc chuẩn tinh thần 4N | `HomeShell.tsx` |
| Caption biển nổi bật | Được "Thương" nhiều nhất tuần này 🧡 · {vị trí} | `HomeShell.tsx` |
| Section danh sách — title/hint | Cùng đóng góp một câu cho khu phố của mình! · chọn một góc phố, để lại lời nhắn dễ thương và bình chọn cho lời thương ấm áp nhất | `HomeShell.tsx` |
| Nút đề xuất điểm mới | + Đề xuất khu phố mới | `HomeShell.tsx`, `IssueList.tsx` |
| Dòng khu phố của tháng | Khu phố dễ thương nhất tháng này: {tên} — {n} biển mới, {m} lượt thương. | `Leaderboard.tsx` |
| Thẻ chứng nhận — mô tả | Khi 100% lời nhắc đã hiện diện khắp các ngõ ngách, khu phố sẽ được gắn chứng nhận "Khu phố biết thương" chuẩn 4N. | `Leaderboard.tsx` |
| Nút chia sẻ chứng nhận | Chia sẻ ngay 💛 | `Leaderboard.tsx` |
| Tra cứu chứng nhận — label | Tra cứu: Xóm mình đã đạt chuẩn 4N chưa? | `Leaderboard.tsx` |
| Tra cứu — kết quả đã đạt | {tên khu} đã chính thức trở thành "Khu phố biết thương" chuẩn 4N từ ngày {dd/mm/yyyy}. | `Leaderboard.tsx` |
| Tra cứu — kết quả chưa đạt | {tên khu} còn thiếu biển để đạt chuẩn 4N. Hãy cùng góp thêm câu nhắc cho xóm mình! | `Leaderboard.tsx` |
| Form ưu đãi — label khu phố | Bạn đang ở khu phố nào? | `LeadSection.tsx` |
| Form ưu đãi — label quan tâm | Nhà mình đang muốn tìm hiểu dịch vụ nào? | `LeadSection.tsx` |
| Form ưu đãi — note định danh | Bạn sẽ xác thực số điện thoại một lần trước khi gửi để bảo vệ thông tin của mình. | `LeadSection.tsx` |
| Modal định danh — title/body | Để FPT gửi ưu đãi đến bạn 💛 · Chỉ cần để lại một vài thông tin. FPT sẽ liên hệ khi bạn đồng ý; số điện thoại được bảo mật và không hiển thị công khai. | `IdentifyModal.tsx` |
| Modal định danh — nút | Bắt đầu thôi | `IdentifyModal.tsx` |
| Drawer đề xuất — title/sub | Góp một điều xóm mình nên để ý · Chọn vấn đề bạn muốn viết lời nhắc | `ProposeModal.tsx` |
| Drawer đề xuất — label mô tả | Viết lời nhắc "thương" bạn muốn gửi cho góc phố này | `ProposeModal.tsx` |
| Drawer đề xuất — nút gửi | Gửi góp ý cho xóm mình | `ProposeModal.tsx` |

</details>

### 2.2 Copy ĐANG CHẠY — đọc từ Figma (18/8 → 7/9)

| Vị trí | Copy đang chạy | Đổi khi | File |
|---|---|---|---|
| Nav — link 1 | **Đóng góp lời nhắc** (cuộn `#goc-xom`) | 2/9 | `HomeShell.tsx` |
| Nav — link 2 | **Đề xuất khu phố cần treo biển** (mở popup đề xuất) | 2/9 | `HomeShell.tsx` |
| Nav — CTA phải | **Ưu đãi dành cho cư dân** (mobile rút gọn **Ưu đãi**) | 2/9 | `HomeShell.tsx` |
| Hero — tiêu đề | **Hãy gửi một lời thương cho xóm mình nhé!** | 18/8 | `site_content.hero_title` |
| Hero — ô tra cứu | **Tìm kiếm khu phố của bạn tại đây** | 18/8 | `site_content.hero_search_placeholder` |
| 3 con số | **Biển đã treo · Khu phố · Câu đóng góp** | 2/9 | `COPY.counterLabels` |
| Khối đóng góp — tiêu đề | **Đóng góp một câu cho khu phố mình nhé** | 18/8 | `site_content.board_title` |
| Khối đóng góp — mô tả (2 dòng) | *Chọn một góc phố, để lại lời nhắn dễ thương và bình chọn cho lời thương ấm áp nhất. Câu được nhiều lượt "Thương" nhất sẽ được đưa lên biển treo tại khu phố* | 2/9 | `site_content.board_hint` |
| Tab 1 | **Góc phố mới cần treo biển** (mobile: *Góc phố mới*) | 2/9 | `IssueBoard.tsx` |
| Tab 2 | **Lời nhắc chờ bạn bình chọn** (mobile: *Chờ bình chọn*) | 2/9 | `IssueBoard.tsx` |
| Tab 3 | **Cây bút của khu phố** (mobile: *Cây bút*) | 2/9 | `IssueBoard.tsx` |
| Nút dòng tab 1 | **Gửi lời nhắc** (viền cam) | 2/9 | `IssueBoard.tsx` |
| Nút dòng tab 2 | **Bình chọn** (viền **xanh**, có trái tim) → sau khi bấm: **Đã bình chọn** | 4/9 + 7/9 | `IssueBoard.tsx` |
| Nút dòng tab 3 | **Xem lời nhắc** (viền **cam**) | 4/9 | `IssueBoard.tsx` |
| Meta tab 1 | **Chưa có câu đề xuất** (luôn — bỏ nhánh "N câu đề xuất") | 7/9 | `IssueBoard.tsx` |
| CTA đáy tab 2 | **+ Viết câu nhắc của riêng bạn** | 2/9 | `IssueBoard.tsx` |
| CTA đáy tab 3 | **+ Đề xuất góc phố mới** | 2/9 | `IssueBoard.tsx` |
| Rỗng tab 1 | *Góc phố nào cũng đã có lời nhắc rồi — bạn đề xuất góc mới nhé!* | 7/9 | `IssueBoard.tsx` |
| Rỗng tab 2 | *Chưa có lời nhắc nào đang chờ bình chọn — bạn viết câu mở hàng nhé!* | 2/9 | `IssueBoard.tsx` |
| Rỗng tab 3 | *Chưa có cây bút nào được vinh danh — viết câu đầu tiên cho xóm mình nhé!* | 2/9 | `IssueBoard.tsx` |
| Khối biển — tiêu đề | **Lời nhắc khi lên biển trông như thế nào?** | 18/8 | `site_content.signs_title` |
| Popup đề xuất — tiêu đề | **Đề xuất khu phố mới** *(≠ nhãn nav và ≠ CTA đáy tab 3 — xem §6)* | 7/9 | `ProposeModal.tsx` |
| Popup đề xuất — nút bước 1 / 2 | **Tiếp tục đề xuất** / **Gửi đề xuất** | 7/9 | `ProposeModal.tsx` |
| Popup đề xuất — 4 nhãn ô | **Tỉnh/thành phố** · **Phường /Xã** · **Tên khu phố/hẻm/ngõ muốn treo biển** · **Điều dễ thương bạn muốn chia sẻ ở khu phố này** | 7/9 | `ProposeModal.tsx` |
| Popup đề xuất — placeholder | *Lựa chọn* (2 select) · *Nhập tên hẻm ngõ nơi bạn sinh sống* · *Nhập đoạn mô tả* | 7/9 | `ProposeModal.tsx` |
| Popup viết câu — chú thích 4 chip | Nhắc *"Không cấm, không phạt"* · Nhở *"Như nói với người nhà"* · Nhỏ *"Quan tâm từ những chuyện nhỏ"* · Nhẹ *"Đọc xong thấy nhẹ lòng"* | 2/9 | `SuggestModal.tsx` |
| Popup khu phố — pill trạng thái câu | **Đang chờ bạn bình chọn** (`approved`) · **Chờ treo biển** (`selected`/`produced`) · **Đã lên biển** (`installed`) | 2/9 | `NeighborhoodView.tsx` |
| Nút nổi | **Lên đầu trang** | 2/9 | `BackToTop.tsx` |

#### Hai câu mời ở dropdown tra cứu 1 kết quả (chốt 7/9)

Design chỉ vẽ **một** dòng nên khu đã có lời nhắc đọc thấy câu "viết câu đầu tiên". QC duyệt lời,
tách theo `notes_count`:

| `notes_count` | Câu |
|---|---|
| = 0 | **Khu phố mình chưa có lời nhắc, bạn viết câu đầu tiên nhé?** *(bỏ chữ "nhiều")* |
| > 0 | **Hãy cùng góp thêm lời nhắc cho khu phố nhé!** *(cũ: "Bạn viết lời nhắc cho khu phố nhé!")* |

Test khoá: `tests/ui/hero-lookup.test.tsx`.

#### 6 nhãn dịch vụ ở khối ưu đãi (Figma 2/9 · B6, quyết định Q3)

`FPT Internet` · `FPT Camera` · `Truyền hình FPT Play` · `Internet + truyền hình` ·
`Internet + Camera` · `Internet + Truyền hình + Camera`.

**Giữ nguyên 4 MÃ cũ**, chỉ đổi nhãn và thêm `camera` + `internet_tv_camera` ⇒ không migration.
Nhãn `fpt_play` đổi thành "Truyền hình FPT Play" nên **lead cũ hiện theo nhãn mới**.

### 2.3 Bốn khối chữ bị GỠ theo design (2/9 — "DESIGN THẮNG SPEC")

| Khối chữ | Đặc tả bắt buộc | Nơi từng hiển thị |
|---|---|---|
| ⚠️ *"Khu Phố Của Tôi tiếp nhận những góp ý về an toàn và nếp sống khu phố…"* (`COPY.proposeWarning`) | `02` §2.1 · `06` §2 | `ProposeModal` bước 2/2 |
| 💛 *"Giữ cho dễ thương: gọi tên một việc tốt cụ thể…"* (`COPY.noteEthics`) | `02` §3 · `06` §2 | `SuggestModal` |
| Chip 4N + bộ đếm ký tự ở popup **Đề xuất** | `02` §3 | `ProposeModal` bước 2/2 |
| *"Bạn sẽ xác thực số điện thoại một lần trước khi gửi…"* | `06` §2.1 | `LeadSection` |

Vẫn **giữ** (design có vẽ): ghi chú 4N `COPY.note4N`, 4 chip 4N trong `SuggestModal`,
checkbox đồng ý + ghi chú tuỳ chọn, ô SĐT hiện khi tick nhận ưu đãi.
**Cả 4 chuỗi trên vẫn còn trong `src/lib/copy.ts`** — bật lại chỉ là render lại.

Ngoài ra, ô **"Viết câu nhắc thương của bạn (nếu có)"** trong popup đề xuất (thêm 1/8 theo
`dieuchinh.1.8` #5) cũng đã **bỏ** ngày 7/9 vì `.fig` bản 2/9 không vẽ — xem câu hỏi §6.

### 2.4 Text admin sửa được (`/admin/noi-dung` — bảng `site_content`, **13 khoá**)

`hero_title` · `hero_body` · `hero_search_placeholder` · `board_title` · `board_hint` ·
`signs_title` · `lead_title` · `lead_body` · `lead_privacy` · `footer_line1` · `footer_line2` ·
`footer_support` · `footer_tagline`.

Mặc định lấy từ `copy.ts` (`src/lib/site-content-defaults.ts`) ⇒ **copy gốc vẫn là nguồn chuẩn**;
xoá ghi đè là quay về bản duyệt.

Đã **gỡ khỏi bộ khoá** (hàng cũ trong bảng chỉ bị lơ đi, không migration):
`campaign_title` · `campaign_hint` · `campaign_youtube_ids` · `campaign_kv_url` (khối TVC/KV, 4/9) ·
`sign_promo_line1` · `sign_promo_line2` · `sign_sale_phone` · `sign_hotline` (dải khuyến mãi trên
biển, 3/9).

**Ghi chú biên tập khi áp bản 28/7** (đã sửa so với nguyên văn file Excel):
sửa lỗi chính tả "webiste" → "website" (ghi chú 4N); chuẩn hoá dấu nháy lệch `'thương"` → `"thương"` (label mô tả đề xuất);
giữ emoji 💛 ở nút "Chia sẻ ngay" theo ảnh đính kèm; nút đề xuất ở empty-state danh sách đồng bộ theo nút chính.

## 3. Chuẩn 4N — Nhắc · Nhở · Nhỏ · Nhẹ (checklist duyệt thủ công)

**Đã chốt Q2: không có chấm tự động.** Chuẩn 4N là **checklist mà admin tick thủ công khi duyệt câu** (04-ADMIN-SPEC §3 — đủ 4 ô mới duyệt hiển thị). Phía người viết, 4 chip hiển thị tĩnh như gợi ý tự soát. Bảng dưới là **định nghĩa chuẩn để huấn luyện người duyệt**, đảm bảo các admin duyệt nhất quán.

### 3.1 Định nghĩa 4 tiêu chí (hướng dẫn người duyệt)

| Tiêu chí | Ý nghĩa | Luật kiểm tra gợi ý (MVP) |
|----------|---------|---------------------------|
| **Nhắc** | Có nội dung nhắc một hành vi cụ thể, tích cực | Chứa động từ hành vi (đi chậm, bỏ rác, khoá cửa, tắt bếp, chào, nhường...) + gắn với bối cảnh |
| **Nhở** | Giọng gợi nhớ nhẹ nhàng, không ra lệnh | Không chứa từ mệnh lệnh/cấm đoán gắt: "cấm", "phạt", "nghiêm cấm", "bắt buộc", "không được" |
| **Nhỏ** | Ngắn gọn, vừa một tấm biển | ≤ 120 ký tự, ≤ 2 mệnh đề |
| **Nhẹ** | Không công kích, không đích danh, không tiêu cực | Không tên riêng người/số nhà cụ thể ("nhà số 7", "ông X"); không từ xúc phạm; không đại từ chỉ trích ("mấy người", "cái bọn") |

Duyệt hiển thị = tick đủ cả 4. Phía client chỉ áp **ràng buộc kỹ thuật tối thiểu**: giới hạn 120 ký tự (tiêu chí Nhỏ) và chặn gửi rỗng — mọi đánh giá nội dung là của người duyệt.

### 3.2 Ví dụ chuẩn (huấn luyện người duyệt + demo)
Đạt: *"Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày."* · *"Đi chậm chút nha, trong hẻm có đứa nhỏ đang chơi."* · *"Ông bà đi chậm, mình chờ chút một — ngõ mình đâu có vội."* · *"Hẻm nhỏ, lòng người thì rộng — chạy chậm giùm nhau."*
Không đạt: *"Cấm đổ rác, phạt 500k"* (fail Nhở/Nhẹ) · *"Nhà số 7 đừng để xe chắn hẻm"* (fail Nhẹ — đích danh).

## 4. Taxonomy chủ đề
Xem 02-FUNCTIONAL-SPEC §2.1 — ~~8 loại~~ → **ĐÚNG 6 chủ đề** (đổi 1/8, migration 002 remap dữ liệu):
Khoẻ mỗi ngày · Trẻ con trong xóm · Lối sống văn minh, tử tế · Giúp đỡ, san sẻ ·
Xóm xanh, xóm sạch · Sống vui, sống có ích.

## 5. Seed data demo (khớp design)
- Khu phố: Phường Bàn Cờ (certified 09/2026, 100%), Phường Lê Lợi, Hẻm chợ Xóm Mới.
- Issues: Tốc độ · Hẻm 42 Lê Lợi (voting, 2 câu, 34 thương) · Trộm cắp · Ngõ 7 Trần Phú (voting, 2 câu, 41 thương) · Phòng cháy · Khu trọ 88 Hai Bà Trưng (voting) · Vệ sinh · Cuối hẻm chợ Xóm Mới (signed — biển: "Bỏ rác đúng chỗ một chút, khu mình thơm cả ngày.") · Giúp nhau, san sẻ · Ngách 12/3 Nguyễn Du (waiting, 0 câu) · Ông bà, người già · Đầu ngõ 7 Trần Phú (voting — câu "Ông bà đi chậm, mình chờ chút một — ngõ mình đâu có vội." — Hương, 18 thương).
- Leaderboard: Bà Liên 82đ (1 treo · 52 thương) · Anh Dũng 77đ (1 treo · 47 thương) · Chú Ba xe ôm 41đ · Cô Tám tạp hoá 34đ · Minh (lớp 11) 21đ. Khu phố dễ thương nhất tháng này: Phường Lê Lợi — 3 biển mới, 76 lượt thương.
- Counters khởi điểm demo: 2 · 5 · 7 · 5.

---

## 6. CÒN TREO — cần Design/BA chốt lời

| # | Câu hỏi |
|---|---|
| 1 | **"Góc phố" hay "khu phố"?** Cùng một luồng đang có ba cách gọi: `.fig` ghi tiêu đề popup **Đề xuất khu phố mới**, nav link là **Đề xuất khu phố cần treo biển**, CTA đáy tab 3 vẫn là **+ Đề xuất góc phố mới**. |
| 2 | **Bỏ ô "câu nhắc gửi kèm" trong popup đề xuất có chủ ý không?** Nếu Design chỉ quên vẽ thì phải bật lại (code cũ còn trong git, route vẫn nhận `suggested_content`). |
| 3 | Ô **`Phường /Xã`** khi chưa chọn tỉnh: design chỉ vẽ `Lựa chọn`, web đang khoá xám và cũng hiện `Lựa chọn` — có cần câu gợi ý riêng cho trạng thái khoá không? |
| 4 | Nhãn **`Phường /Xã`** trong `.fig` có dấu cách lạc chỗ (`Phường` + space + `/Xã`) — giữ nguyên văn hay sửa thành `Phường/Xã`? |
| 5 | Sáu frame popup trong `.fig` vẫn còn **nhãn nav CŨ**, chưa đồng bộ với frame chuẩn `7217:1990`. |

Danh sách đầy đủ + câu hỏi mới phát hiện: [`25-DONG-BO-TAI-LIEU-08-09.md`](25-DONG-BO-TAI-LIEU-08-09.md).
