# 22 — QC 2/9 đối chiếu Figma BẢN MỚI + danh sách việc cần sửa

> Phiên QC ngày **2/9/2026**. Nguồn design: `docs/lp/LandingpageFCM.fig` **bản upload 2/9**
> (file 18/8 đã bị xoá), page `7217:1989` "Khu phố biết thương" → section **Design**.
> Đã parse lại: `rm scripts/figma/nodes.pkl && python3 scripts/figma/parse.py` (~40s),
> đọc bằng `python3 scripts/figma/dump.py <node-id> [depth]`.
> Ảnh export kèm theo: `docs/lp/Landing page.png` … `Landing page-4.png` (2880×7560 = **1440×3780** @2x).

## 0. Bản đồ frame ↔ ảnh export

| Node | Khổ | Trạng thái | Ảnh |
|---|---|---|---|
| `7217:1990` | 1440×3780 | **Frame chuẩn**, tab 1 "Góc phố mới cần treo biển" | `Landing page.png` |
| `7651:1537` | 1440×3780 | tab 2 "Lời nhắc chờ bạn bình chọn" | `Landing page-1.png` |
| `7458:38738` | 1440×3780 | tab 3 + dropdown tra cứu **1 kết quả** | `Landing page-2.png` |
| `7745:2107` | 1440×3780 | tab 3 + dropdown **nhiều kết quả** | `Landing page-3.png` |
| `7745:1345` | 1440×3780 | tab 3 + dropdown **rỗng** | `Landing page-4.png` |
| `7458:40650` / `7458:41331` | 1440×1024 | popup Đề xuất góc phố 1/2 · 2/2 | — |
| `7458:41901` | 1440×1024 | popup **Gửi câu nhắc** | — |
| `7502:831` | 1440×1024 | popup **Để FPT gửi ưu đãi đến bạn** | — |
| `7727:1743` | 1440×1024 | popup **Cây bút khu phố** (MỚI) | — |
| `7756:2954` | 1440×1024 | popup **Thông tin khu phố** (MỚI) | — |

### ⚠️ Cảnh báo: design chưa đồng bộ giữa các frame

Trước khi code cần **hỏi lại team Design**:

1. **Nhãn nav**: chỉ `7217:1990` dùng nhãn mới (`Đóng góp lời nhắc` / `Đề xuất khu phố cần treo biển` / CTA `Ưu đãi dành cho cư dân`). **Cả 6 frame popup vẫn giữ nhãn cũ** (`Góc phố đang chờ` / `Quà dành cho cư dân`).
2. **Nhãn 3 con số**: `7217:1990` + `7651:1537` dùng nhãn mới (`Biển đã treo` / `Khu phố` / `Câu đóng góp`); `7458:38738`, `7745:2107`, `7745:1345` vẫn nhãn cũ (`Biển đã treo` / `Góc phố đang chờ` / `Khu phố tham gia`).

Tài liệu này lấy **`7217:1990` làm chuẩn** (frame đầu tiên của section, mới nhất).

### Bẫy khi đọc `.fig`

- `dump.py` **không lọc `visible=false`** → node ẩn vẫn in ra. Muốn biết node có hiện không, so chiều cao frame cha auto-layout với tổng con (ví dụ `Frame 221` h=84 nhưng con `Frame 202` h=609 → con bị ẩn).
- `dump.py` **không resolve text override của INSTANCE** → nhãn nút/tab đọc ra là text mặc định của symbol, **phải lấy nhãn từ ảnh PNG**. Toạ độ/màu/kích thước thì tin `.fig`.

---

## A. LỖI CHÍNH — chân trang thừa khối KV (đúng chỗ team báo)

**Hiện trạng**: web ở khổ 1440 cao **4667px**, Figma **3780px** → thừa **887px**, toàn bộ nằm ở footer.

**Figma nói gì**
```
Frame 223 (khối ưu đãi + footer)  x=0 y=2914 w=1440 h=1451   ← h này TÍNH CẢ node ẩn
  Rectangle 47   x=0 y=2914 w=1440 h=756  r=40/40/0/0  fill=GRADIENT(#FFFFFF→#FFFFFF 80%→#FFFFFF 0%)
  Frame 222      x=102 y=2961 w=1244 h=748  autolayout VERTICAL gap=64
    Frame 220 (form ưu đãi)  y=2961 h=600
    Frame 221 (footer)       y=3625 h=84        ← CHỈ CÒN KHỐI CHỮ
      Frame 202  h=609.2  ← ẨN (visible=false)
        Khu phố 2 2   1244×570   ← ảnh KV chân trang
        Logo Khu phố biết thương  286.5×153.2
      <khối chữ footer>  x=375.5 w=697 h=84  · 16px Regular · CENTER · #000000
```

**Việc cần làm** — `src/components/home/HomeShell.tsx` (khối `<footer>`, ~dòng 419–452):

- [ ] **Gỡ `<img src="/brand/kv-khu-pho-sm.webp">` và `<img src="/brand/logo-khu-pho.svg">` ở footer.** Giữ nguyên logo ở top bar.
- [ ] Footer chỉ còn khối chữ: rộng **697**, canh giữa, `16px Regular`, `text-align: center`, màu `#000000` (hiện đang `text-ink` = `#3D3D3D` → đổi).
- [ ] Khoảng cách: form ưu đãi → footer = **gap 64px**; đáy trang chừa **71px** (3709 → 3780).
- [ ] Nếu team Design muốn giữ KV: **phải** bọc khung `1244×570` + `object-fit: cover; object-position: 50% 67%` (asset gốc 1600×865 = tỉ lệ 1.85, khung design 2.18 — Figma cắt 68px trên, 34px dưới).

---

## B. LỆCH DESIGN — theo từng khối

### B1. Thanh nav — `HomeShell.tsx` ~dòng 163–230

| | Figma `7217:1990` | Web hiện tại |
|---|---|---|
| Link 1 | `Đóng góp lời nhắc` — x=159 y=61 w=136, 16px Regular | `Góc phố đang chờ` — x=189 |
| Link 2 | `Đề xuất khu phố cần treo biển` — x=348 y=61 w=223 | `Quà dành cho cư dân` — x=381 |
| Nhóm CTA | `Frame 171` x=1071.6 y=51.5 **w=273** h=35, nhãn `Ưu đãi dành cho cư dân` | x=1091.6 w=252, nhãn `+ Đề xuất góc phố mới` |
| Avatar | luôn có ở cuối nhóm CTA | chỉ hiện khi đã định danh |

- [ ] Đổi 2 nhãn link + toạ độ (x=159 / x=348 → lề trái thanh 1276 bắt đầu x=82 ⇒ padding-left **77px**, không phải 107px như hiện tại).
- [ ] Đổi nhãn CTA thành `Ưu đãi dành cho cư dân`, nhóm rộng 273, lề phải 1440−1344.6 = **95.4** (thanh kết thúc x=1358 ⇒ padding-right **14px** giữ nguyên).
- [ ] **Hỏi lại Design**: đổi CTA sang "ưu đãi" thì nút mở form đề xuất đi đâu? (link 2 "Đề xuất khu phố cần treo biển" chắc thay thế) — quyết định xong mới sửa handler `openPropose`.

### B2. Ba con số — `Counters.tsx` + `copy.ts:15`

| Vị trí | Figma | Web |
|---|---|---|
| 1 | `65` **Biển đã treo** | Biển đã treo ✅ |
| 2 | `25` **Khu phố** | Góc phố đang chờ ❌ |
| 3 | `08` **Câu đóng góp** | Khu phố tham gia ❌ |

- [ ] `COPY.counterLabels = ["Biển đã treo", "Khu phố", "Câu đóng góp"]`.
- [ ] **Đổi luôn số liệu**: ô 2 = tổng khu phố tham gia, ô 3 = tổng câu đóng góp (đang là `issues_open` / `neighborhoods_joined`). Sửa `CounterData` + query đếm.
- [ ] Node ẩn `+300 Người đóng góp` (`Frame 161`) — **không dựng**.
- Số đo giữ nguyên (đúng rồi): khối 800 canh giữa `x=320 y=1209`, số 60px Bold #FF8206, nhãn 20px Light #3D3D3D, gap 16 trong nhóm / 24 giữa nhóm.

### B3. Ô tra cứu + dropdown — `HeroLookup.tsx`

Ô nhập: `x=312 y=1140 w=816 h=45`, nút tròn cam `30×30` ở `x=976`. **Đúng rồi.**

Dropdown `Frame 261` bắt đầu `x=312 y=1193 w=816`, `r=16`, nền `#FFFFFF`. Ba trạng thái:

**(a) Có kết quả** (`7745:2107`, ảnh `Landing page-3.png`) — panel h=231, gap 24
- Mỗi dòng: tên `18px Bold #3D3D3D` (x=336) + dòng dưới `pin 16px` + `Phường Bàn Cờ - TP. Hồ Chí Minh` `14px Light #969696` (x=360)
- Bên phải: **pill xanh** `w≈140 h=35 r=88.9 fill #2323FF`, icon `vuesax/linear/tick-circle` (có sẵn ở `docs/lp/vuesax/linear/*.svg`) + chữ `Đạt chuẩn 4N` 14.2px trắng
- [ ] Web đang dùng emoji 🥇 cạnh tên → **thay bằng pill này**; bỏ emoji.

**(b) Đúng 1 kết quả** (`7458:38738`, ảnh `Landing page-2.png`) — panel h=184
- Card kết quả `Frame 274` `x=336 y=1217 w=768 h=77 r=16` nền **`#FFF7EA`**, tên `18px Bold #000000`
- Dòng dưới `Frame 263 y=1318 h=35`: chữ `Khu phố mình chưa có nhiều lời nhắc, bạn viết câu đầu tiên nhé?` + nút `Xem khu phố`
- [ ] Web **chưa có** trạng thái này.

**(c) Rỗng** (`7745:1345`, ảnh `Landing page-4.png`) — panel h=72
- `pin` + `Chưa tìm thấy khu phố này` `16px Light #969696` (x=370)
- Nút `x=891.7 y=1209 w=212.3 h=40 r=100` viền `#FF8206 1.5px` → `+ Đề xuất góc phố mới`
- [ ] Web đang ghi `Chưa tìm thấy “…” — khu phố này chưa tham gia.` → đổi thành `Chưa tìm thấy khu phố này`, thêm icon pin.

### B4. Khối "Đóng góp một câu" — `IssueBoard.tsx`

**Tiêu đề + mô tả** (`Frame 158` x=191 y=1358 w=1058 h=107)
- Tiêu đề y=1357, 40px Bold, ls −2%, UPPER, #3D3D3D ✅
- Mô tả `x=296 y=1417 w=848 h=48` — **2 dòng**:
  `Chọn một góc phố, để lại lời nhắn dễ thương và bình chọn cho lời thương ấm áp nhất. Câu được nhiều lượt 'Thương' nhất sẽ được đưa lên biển treo tại khu phố`
- [ ] Web mới có vế đầu → **bổ sung vế sau**.

**Tab** (`Frame 180` x=317.5 y=1490 w=804 h=39, gap 16, r=80)

| # | Nhãn Figma | w | Web hiện tại |
|---|---|---|---|
| 1 | `Góc phố mới cần treo biển` + badge `80` | 270 | `Mới nhất` |
| 2 | `Lời nhắc chờ bạn bình chọn` + badge `25` | 277 | `Chờ bạn bình chọn` |
| 3 | `Cây bút của khu phố` + badge `10` | 223 | `Cây bút của khu phố` ✅ |

- Tab đang chọn: `fill #FF8206`, `stroke #E86305 1.5px`. Tab thường: `stroke #3D3D3D 1.5px`, nền trong suốt.
- [ ] Đổi 2 nhãn đầu (`IssueBoard.tsx:97-99`).

**Card** (`Frame 153` x=82 **y=1570** w=1276 h=550 r=40, `stroke #FF8206 1.9px`)
- Sọc trên `y=1570 h=8`, sọc dưới `y=2112 h=8` — web đã đúng 8px ✅
- Web hiện tại: `x=77 y=1634 w=1272 h=553`, viền `1.5px`
- [ ] Viền **1.9px** (đang 1.5).
- [ ] Card lệch **+64px** so với design vì thiếu dòng mô tả thứ 2 → sửa B4 mô tả sẽ tự khớp lại; đo lại sau khi sửa.

**Danh sách** (`Frame 177` x=166 y=1612 w=1108, gap 16)
- Mỗi dòng cao **50**, bước lặp **82px** (50 + kẻ + gap)
- **Kẻ ngăn: `LINE` 1px `#DEDEDE` NÉT ĐỨT `dashPattern [5, 5]`** — web đang kẻ **liền** ❌
  → CSS: `border-top: 1px dashed #DEDEDE` hoặc `repeating-linear-gradient(90deg, #DEDEDE 0 5px, transparent 5px 10px)`.
- Kẻ có cả **sau dòng cuối** ở tab 1.

**Cấu trúc dòng theo tab** (icon đều `vuesax/linear`, 16×16, chữ meta `14px Light #969696`, meta gap **32**)

| | Tab 1 `Góc phố mới cần treo biển` | Tab 2 `Lời nhắc chờ bạn bình chọn` | Tab 3 `Cây bút của khu phố` |
|---|---|---|---|
| Số dòng | **6** | **5** | **5** |
| Huy hiệu | không | không | `40×50` bên trái (x=166); TOP1 `#2323FF` · TOP2 `#FF8206` · TOP3 `#3EAF3F` · hạng ≥4 `#EEEEEE`; chữ `TOP` 14px + số 30px, ls −8%, trắng |
| Tiêu đề | x=166 w=972 | x=166 w=955 | x=222 w=916 |
| Meta | **chỉ** `edit` + `Chưa có câu đề xuất` (node pin+phường bị ẩn) | `pin`+phường · `user`+tên · `heart`+`150 Bình chọn` | `edit`+`10 câu đóng góp` · `heart`+`150 Bình chọn` |
| Nút phải | `x=1154 w=120 h=35 r=70` viền `#FF8206 1px` → **Gửi lời nhắc** | `x=1137 w=137 h=35.9 r=100` viền `#FF8206 1.5px` → **Xem câu nhắc** | `x=1154 w=119 h=35 r=70` viền **`#2323FF` 1px** → **Bình chọn** |
| CTA cuối card | **KHÔNG có** | `x=560.8 y=2030 w=318 h=50 r=100` viền cam → **+ Viết câu nhắc của riêng bạn** | `x=576 y=2030 w=288.6 h=50` viền cam → **+ Đề xuất góc phố mới** |

- [ ] Tab 1: bỏ phường + "lượt thương" khỏi meta, chỉ còn `Chưa có câu đề xuất` / `N câu đề xuất`; nút đổi thành `Gửi lời nhắc` (viền cam) — web đang là `Bình chọn` xanh.
- [ ] Tab 2: meta 3 mục đúng thứ tự phường · người · bình chọn; nút `Xem câu nhắc` viền cam.
- [ ] Tab 3: bỏ nút `Chia sẻ`, dùng `Bình chọn` viền xanh; meta đổi thành `N câu đóng góp` + `N Bình chọn` (bỏ điểm & câu trích đang hiển thị).
- [ ] CTA đáy card đổi theo tab (tab 1 không có).

### B5. Khối biển — `SignGallery.tsx`

`Frame 232 x=82 y=2186 w=1276 h=648`, tiêu đề y=2186 (40px Bold UPPER), lưới `Frame 230 y=2278 h=556` gap 32, 3 cột × 2 hàng. **Web đo được y=2189 → khớp.** Không có việc cần sửa.

### B6. Khối ưu đãi — `LeadSection.tsx`

| | Figma | Web |
|---|---|---|
| Panel `Rectangle 47` | y=**2914** h=756 r=40/40/0/0, gradient `#FFF → #FFF 80% → #FFF 0%` | y=3021 h=713 |
| Tiêu đề | y=**2961**, 40px Bold, **canh TRÁI** (`x=167 w=910`) | y=3101 |
| Mô tả | y=3036 w=907, 16px Light, CENTER | ✅ |
| Hàng 1 | Họ và tên · Số điện thoại — mỗi ô `445.5×40 r=80` viền `#3D3D3D 1.5px`, nhãn 16px Bold | ✅ |
| Hàng 2 | Tỉnh thành · Địa chỉ | ✅ |
| Dịch vụ | **6 lựa chọn, 2 hàng × 3**, mỗi ô `294.3×40 r=80`, gap 12 ngang / 16 dọc | **4 lựa chọn 1 hàng** ❌ |
| Checkbox | `18×18 r=6` viền `#3D3D3D 1.5px` | ✅ |
| Nút | `906×50 r=100` viền `#FF8206 1.5px` | ✅ |

Nhãn 6 dịch vụ (đọc từ `Landing page.png`):
`FPT Internet` · `FPT Camera` · `Truyền hình FPT Play` · `Internet + truyền hình` · `Internet + Camera` · `Internet + Truyền hình + Camera`

- [ ] Thay 4 lựa chọn hiện tại (`Internet cho cả nhà` / `Internet + Truyền hình` / `Gói FPT Play` / `Internet + Camera`) bằng 6 lựa chọn trên, lưới `grid-cols-3` 2 hàng.
- [ ] Kiểm tra enum/giá trị lưu vào `leads.service` — có thể phải thêm migration hoặc map lại.
- [ ] Tiêu đề khối canh **trái**, không canh giữa.

### B7. Nút "Lên đầu trang" (MỚI) — chưa có trên web

```
Frame 259  x=1313 y=642  w=89 h=75  autolayout VERTICAL gap=4
  vuesax/linear/arrow-up   x=1330 y=642  w=55 h=55     ← nền tròn cam
  "Lên đầu trang"          x=1313 y=701  w=89 h=16  12px Regular ls -2% CENTER #3D3D3D
Frame 260  x=1313 y=3556   ← cùng component, vị trí ở cuối trang
```
- [ ] Dựng nút nổi bên phải (lề phải **38px**), icon 55×55 nền cam + nhãn 12px bên dưới, `scrollTo(0,0)` mượt, ẩn khi `scrollY < 1 màn hình`.

### B8. Popup "Gửi câu nhắc" (`7458:41901`) — `SuggestModal.tsx`

Khung: rộng **700** (`x=370`), lề trong **32** (nội dung `x=402 w=636`), tiêu đề `Gửi câu nhắc` 25px Regular, nút × `35×35` ở `x=1011`, sọc `Frame 155` `700×12` ở đáy. Web đã khớp.

Lệch:
- **4 chip 4N có chú thích** (`Frame 243` x=402 y=466 w=636 h=84, gap 16):
  | Chip | Chú thích (12px Light #969696, w=147) |
  |---|---|
  | Nhắc | Không cấm, không phạt |
  | Nhở | Như nói với người nhà |
  | Nhỏ | Quan tâm từ những chuyện nhỏ |
  | Nhẹ | Đọc xong thấy nhẹ lòng |
- Chip `147×40 r=80`; **chưa chọn** = nền `#FFFFFF` viền `#3D3D3D 1.5px`; **đã chọn** = nền `#3D3D3D`.
- [ ] `SuggestModal.tsx:104` — chip đang là `<span>` tĩnh, không chú thích. Thêm chú thích + trạng thái chọn.
- [ ] **Hỏi Design**: chọn chip 4N để làm gì (lọc/gắn nhãn câu?) — hiện code ghi chú "chip tĩnh, KHÔNG chấm tự động (Q2)". Nếu chỉ trang trí thì bỏ trạng thái chọn.
- [ ] Bỏ loé **"Đang tải…"** ở chỗ tên góc phố: truyền `title`/`ward` sẵn từ `IssueBoard` thay vì đợi fetch (xem C4).

### B9. Popup MỚI "Thông tin khu phố" (`7756:2954`) — sửa `NeighborhoodModal.tsx`

```
Tiêu đề "Thông tin khu phố"  25px Regular  x=625.5 y=187.5
Frame 242  x=370 y=245 w=700 h=555  gap 16          ← thân popup
  "Phường Bàn Cờ"                     30px Bold ls -2%  x=402 y=245
  pin + "Phường Bàn Cờ, TP. Hồ Chí Minh"  14px Light #969696  y=294
  "Cùng tham gia viết bình chọn câu nhắc cho khu phố bạn nhé!"  16px Bold  y=328
  Frame 272  x=402 y=365 w=636  gap 12   ← danh sách câu nhắc
    mỗi thẻ: 636×73  r=16  viền #3D3D3D 1.5px
      tên câu       18px Regular ls -2% #3D3D3D   x=426
      pill trạng thái  h=25 r=6, 14px Regular, x=524:
        "Đang chờ bạn bình chọn"  nền #D7F3FF  chữ #2323FF   (w=168)
        "Đã lên biển"             nền #F0FFC8  chữ #5ED400   (w=88)
        "Chờ treo biển"           nền #FFF5E4  chữ #FF8206   (w=103)
      user icon + tên người viết  14px Light #969696  (dòng dưới)
      nút phải: 119×35 r=70 viền #2323FF 1px   (Bình chọn)
  Button 02  x=402 y=766 w=636 h=50 r=100 viền #FF8206 1.5px   ← CTA đáy
```
- [ ] Đối chiếu `NeighborhoodModal.tsx` / `NeighborhoodView.tsx` với cấu trúc trên; hiện đang hiển thị tiến độ 4N + 4 biển mới nhất, design mới đổi thành **danh sách câu nhắc kèm pill trạng thái**.
- [ ] **Hỏi Design**: khối tiến độ 4N còn giữ không? (design mới không thấy). Trang share `/khu-pho/[slug]` dùng chung `NeighborhoodView` → quyết định xong mới sửa.

### B10. Popup MỚI "Cây bút khu phố" (`7727:1743`) — CHƯA CÓ

Mở từ tab 3 khi bấm `Bình chọn` ở một cây bút.
```
Tiêu đề "Cây bút khu phố"  25px Regular  x=632.5 y=187.5
Frame 242  x=370 y=245 w=700 h=603
  "Chị Dậu - P. Bàn Cờ, TP. Hồ Chí Minh"   30px Bold ls -2%  x=402 y=245
  "Cùng bình chọn cho cây bút khu phố bạn nhé"  18px Regular  y=305
  Frame 272  x=402 y=305 w=636  gap 12    ← danh sách câu của người đó
    mỗi thẻ: 636×81  r=16  nền #E8F8FF (KHÔNG viền)
      nội dung câu   18px Regular ls -2% #333333   x=426
      pin + "Phường Bàn Cờ, TP. Hồ Chí Minh"  14px Light #969696
      pill "Đạt chuẩn 4N"  125×25 r=28 nền #2323FF, icon vuesax/linear/verify + 14px Light trắng
      nút thương: 156×43 r=80 nền #FF8206, icon vuesax/bulk/heart-circle 23px + "160 lượt thương" 16px trắng
                  (biến thể rút gọn 82×35 chỉ hiện số)
```
- [ ] Dựng mới component `AmbassadorModal.tsx`; API cần endpoint trả danh sách suggestions của 1 user + số lượt thương + cờ đạt chuẩn 4N.

---

## C. LỖI CHỨC NĂNG

### C1. Ảnh KV chân trang gây nhảy layout ~670px (CLS)
`HomeShell.tsx:~424` — `<img src="/brand/kv-khu-pho-sm.webp" loading="lazy" className="block w-full">` **không có `width`/`height`** → cao 0 trước khi tải xong, tải xong đẩy toàn trang xuống 673px. (Ảnh chị em ngay dưới có `width={287} height={153}` nên đúng.)
- [ ] Nếu làm mục A (gỡ KV) thì hết. Nếu còn dùng ảnh này ở màn khác → thêm `width={1600} height={865}` hoặc `aspect-ratio`.

### C2. Popup không khoá cuộn nền
Đã kiểm: mở `ProposeModal`, chạy `window.scrollTo(0,1600)` → **trang nền cuộn theo**, popup trôi. `getComputedStyle(document.body).overflow` = `clip visible` (chỉ chặn ngang).
- [ ] Trong `Modal` (`ui.tsx`): khi mở thì khoá `document.body` (`position: fixed; top: -scrollY` hoặc `overflow: hidden` + bù `padding-right` bằng bề rộng scrollbar), khi đóng trả lại đúng `scrollY`.

### C3. Sau chuỗi popup, trang không cuộn về đỉnh được
Sau luồng **Đề xuất → Định danh → popup ưu đãi**, `window.scrollTo(0,0)` dừng lại ở `y = 88` (lần khác `172.5`); `scrollTo(0,1500)` vẫn chạy bình thường. Reload là hết. Quan sát **2 lần**, chưa tái hiện ổn định.
- [ ] Nghi phần khôi phục scroll khi đóng modal (hoặc `scroll-behavior: smooth` + một `focus()` kéo trang). Sửa cùng C2 nhiều khả năng hết; sau khi sửa phải test lại đúng luồng này.

### C4. `SuggestModal` loé "Đang tải…" ~4s
Popup mở ra hiện chữ `Đang tải…` ở đúng vị trí tên góc phố rồi mới đổi thành `Giúp đỡ, san sẻ` + phường.
- [ ] Truyền sẵn `title` + `ward` từ dòng trong `IssueBoard` xuống `SuggestModal` (dữ liệu đã có sẵn ở client), fetch chỉ để lấy danh sách ví dụ.

### C5. Nút "Thương" là toggle — cần xác nhận spec
Bấm lần 1: `28 → 29`, nút đổi sang `đã thương` (nền xanh đặc). Bấm lần 2: `29 → 28`, trở về trạng thái chưa thương.
- [ ] Xác nhận với BA: luật là "1 phiếu/câu" — **rút phiếu có được phép không**? Nếu có, kiểm tra `score-service` có **thu hồi điểm** của người viết khi rút phiếu không (`invalidateVoteReceived*`). Nếu không được phép → khoá nút sau khi đã bình chọn.

---

## D. ĐÃ KIỂM — CHẠY ĐÚNG

- Luồng đề xuất 2 bước → định danh → ghi DB: tạo `users`, `neighborhoods` (`hidden=true`), `suggestions` (`submitted`). Kiểm tra trực tiếp bằng `docker exec khu_pho_yeu_thuong-db-1 psql -U khupho -d khupho`.
- Geo: 34 tỉnh/thành đúng danh mục 2025; chọn tỉnh → phường lọc theo tỉnh (TP.HCM có cả phường Bình Dương / Bà Rịa sau sáp nhập).
- Free-text tên khu phố → hiện gợi ý `Sẽ dùng tên phường bạn tự nhập` + dòng địa chỉ preview.
- Gửi câu nhắc → toast `Câu của bạn đã vào hàng chờ duyệt — cảm ơn bạn đã thương xóm mình 💛`.
- Bình chọn +1 và ghi DB.
- Tra cứu: có kết quả / không kết quả đều hoạt động.
- Mobile 375: `scrollWidth == clientWidth`, không tràn ngang; top bar rút gọn `+ Đề xuất` + avatar; 3 con số 1 hàng 3 cột.
- **Toạ độ hero khớp Figma tuyệt đối** (không cần sửa):
  `h1` 257/149/929×56 · mô tả 257/213/929×48 · slider `Frame 143` 300/293/840×430 ·
  KV 203/580/1034×558 · biển "Ngõ Xóm" 1135.2/646/176.8×308.6 · ông cháu quét sân 1238.2/708/160.5×187.5 ·
  gánh hàng rong 10/739/236×171 · biển góc khối đóng góp 66/1368.5/216×378 · logo pill 653.5/28.7/132.9×71.2.

---

## E. THỨ TỰ ĐỀ XUẤT LÀM

1. **Nhóm nhanh, không cần hỏi ai** — A (gỡ KV footer), B4 kẻ nét đứt + viền card 1.9px, B4 mô tả 2 dòng, B2 nhãn 3 con số, B3(c) copy trạng thái rỗng, C1.
2. **Nhóm cần chốt số liệu** — B2 đổi ý nghĩa 2 chỉ số, B6 6 lựa chọn dịch vụ (ảnh hưởng `leads`).
3. **Nhóm cần Design trả lời** — B1 nhãn nav & vị trí nút đề xuất, B8 chip 4N chọn để làm gì, B9 popup khu phố có bỏ tiến độ 4N không.
4. **Nhóm dựng mới** — B7 nút Lên đầu trang, B3(a)(b) 2 trạng thái dropdown, B4 phân hoá dòng theo tab, B10 popup Cây bút khu phố.
5. **Sửa hạ tầng UI** — C2 khoá cuộn nền (kéo theo C3), C4, C5.

## F. Dữ liệu QC cần dọn trong DB

```sql
DELETE FROM suggestions WHERE content LIKE 'QC%02/09%' OR content LIKE 'QC 2/9%' OR content LIKE 'QC: Đi chậm%';
DELETE FROM neighborhoods WHERE name = 'Khu phố QC 0209';
DELETE FROM users WHERE display_name = 'QC Tester 0209';
```
(một phiếu "thương" đã bấm rồi bấm lại nên net = 0)

## G. Ghi chú môi trường

- Extension Claude-in-Chrome **chưa có quyền `figma.com`** → không mở link design trực tiếp được; mọi số đo trong tài liệu này lấy từ `.fig` local.
- Đo số đo px phải dùng **DOM thật trong Chrome** (jsdom không tính layout). Mẹo dùng lại được: nhét `<iframe src="/" style="width:1440px">` vào trang rồi đo trong `contentDocument` — cho đúng `clientWidth = 1440` bất kể cửa sổ Chrome rộng bao nhiêu (scrollbar macOS ăn mất 17px nếu đo thẳng trên `window`).
- Ảnh trong iframe có `loading="lazy"` sẽ **không tải** nếu nằm ngoài viewport của trang cha → đo chiều cao bị sai; đổi `loading='eager'` rồi gán lại `src` trước khi đo.
