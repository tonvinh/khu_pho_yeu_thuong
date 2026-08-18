# 16 — Giao diện & frontend

> **Design tham chiếu (từ 18/8/2026): `docs/lp/lp1.png` → `lp6.png` — skin cam FPT.**
> Bản prototype kem `KhuPhoCuaToi-prototype-v4.html` chỉ còn giá trị lịch sử.
> Danh sách việc đã làm theo skin mới + email review: `docs/21-KE-HOACH-DIEU-CHINH-18-8.md`.
> Copy tiếng Việt: `src/lib/copy.ts` (nguyên văn từ `06-CONTENT-COPY.md` §2); text hiển thị
> trang chủ sửa được ở `/admin/noi-dung` (mặc định trong `src/lib/site-content.ts`).

## 1. Bản đồ route

| Route | Kiểu | Mô tả |
|---|---|---|
| `/` | Server + client island | Trang chủ một trang: hero cam (slider khu phố tiêu biểu + KV + ô tra cứu 4N), 3 con số, khối đóng góp 3 tab, 6 biển mới, khối ưu đãi, footer |
| `/bien/{suggestionId}` | Server | Trang share "biển đã treo" + OG image động |
| `/dai-su/{share_slug}` | Server | Trang share thành tích Đại sứ + OG image động |
| `/khu-pho/{slug}` | Server | Trang share chứng nhận / tiến độ khu phố + OG image động |
| `/chinh-sach-du-lieu` | Static | Chính sách dữ liệu (PDPD) |
| `/admin/login` | Client | Đăng nhập admin (2 bước nếu bật TOTP) |
| `/admin` | Client | Dashboard |
| `/admin/khu-pho` | Client | Khu phố & chứng nhận · tab **Đề xuất góc phố** (duyệt đề xuất — gộp `/admin/de-xuat` cũ, 4/8) |
| `/admin/loi-nhac` | Client | Duyệt lời nhắc với checklist 4N (đổi tên từ `/admin/cau-nhac`) · tab **Chọn câu & vòng đời biển** (gộp `/admin/bien` cũ, 4/8) |
| `/admin/khu-pho/{id}/ban-do` | Client | Trình quản lý bản đồ & pin |
| `/admin/leads` | Client | Quản lý leads |
| `/admin/gian-lan` | Client | Chống gian lận |
| `/admin/diem` | Client | Sổ cái điểm |
| `/admin/import` | Client | Bulk import khu phố |

Mọi link nội bộ trong client dùng hằng `BASE` (từ `client-api.ts`); trong server dùng `withBase()`. **Không hard-code `/`**.

## 2. Cây component trang chủ

```
app/page.tsx  (Server — 7 truy vấn song song, force-dynamic)
└── HomeShell  "use client"   ← orchestrator: state, polling 20s, modal, toast
    ├── Top bar cam (2 anchor link · logo tròn ở giữa · nút Đề xuất + avatar)
    ├── Banner báo tin vui in-web  ← /api/v1/me/notifications (thay SMS)
    ├── <header> hero nền cam
    │   ├── h1 IN HOA + mô tả
    │   ├── NeighborhoodSlider   CHỈ khu đạt chuẩn 4N (badge + pill địa chỉ, mũi tên ngoài ảnh)
    │   ├── KV khu phố 3D trên nền sàn gạch (public/brand/*.webp)
    │   └── HeroLookup           ô tra cứu "Xóm mình đã đạt chuẩn 4N chưa?"
    ├── Counters                 3 con số: biển · khu phố · câu đóng góp
    ├── IssueBoard  #goc-xom     1 card sọc cam, 3 tab, 5 dòng/trang
    │   ├── tab "Khu phố chờ bạn viết lời nhắc"   (góc chưa có câu → nút Gửi lời nhắc)
    │   ├── tab "Khu phố chờ bạn bình chọn"       (góc có câu → nút Bình chọn)
    │   └── tab "Cây bút của khu phố"             (bảng xếp hạng, badge TOP 1/2/3)
    ├── SignGallery              6 biển mới nhất — SignCard (template thương hiệu)
    ├── Section "Ưu đãi cư dân"
    │   └── LeadSection          họ tên · SĐT · TỈNH THÀNH (bắt buộc) · địa chỉ · 4 chip · opt-in
    ├── <footer>                 KV + logo + 4 dòng (có hotline 1900 6600)
    ├── IdentifyModal            định danh (có select Tỉnh/thành)
    ├── ProposeModal             wizard 2 bước (chủ đề → thông tin khu phố)
    ├── SuggestModal             viết câu nhắc (có ô SĐT khi tick nhận ưu đãi)
    ├── VoteModal                danh sách câu của góc phố để bình chọn
    ├── LeadPromptModal
    └── Toast

CampaignMedia (TVC + KV) — TẠM ẨN khỏi trang chủ theo email 18/8, giữ nguyên component;
danh sách video quản lý ở /admin/noi-dung, phát lần lượt bằng tham số playlist.
```

Component dùng chung ở `components/home/ui.tsx`: `SectionHead` (IN HOA, căn giữa, tuỳ chọn
cột biển bên trái), `FilterTabs` (pill, tab đang chọn là khối cam), `Field`, `Modal` (giữa màn
hình, Esc để đóng, `role="dialog"`, bottom-sheet trên mobile), `Stripe` (dải sọc chéo cam).
`SignCard` (`components/home/SignCard.tsx`) render biển thương hiệu — dùng chung cho trang chủ
và preview khi admin duyệt câu.

> Drawer trượt phải, `HangSign`, `IssueList`, `Leaderboard`, `IssueDrawer`, `Eyebrow` đã bị gỡ
> ngày 18/8 khi đổi skin (drawer tách thành `SuggestModal` + `VoteModal`).

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

### 3.2 Bấm "Thương" (optimistic)

Cập nhật số ngay trên UI + hiệu ứng `heart-pop`, gọi API nền. Lỗi → rollback đúng trạng thái cũ và hiện toast lỗi (ví dụ 409 tự thương). Câu của chính mình hiển thị ô "câu của bạn" mờ, **không bấm được**.

### 3.3 Viết câu nhắc

- Textarea cắt cứng **120 ký tự**, đếm `n/120` cạnh 4 chip tĩnh `Nhắc · Nhở · Nhỏ · Nhẹ`.
- 4 chip này chỉ để **tự soát** — không có chấm điểm tự động (quy tắc cứng 2).
- Có gợi ý ví dụ theo danh mục (`EXAMPLE_SUGGESTIONS`), bấm để điền rồi sửa; ví dụ trùng câu đã có sẽ bị ẩn.
- Ghi chú đạo đức (`COPY.noteEthics`) + ghi chú duyệt 4N (`COPY.note4N`) luôn hiển thị.
- Checkbox opt-in lead tầng 1 nằm cuối form, **mặc định không tick**, kèm dòng "Tuỳ chọn riêng, không ảnh hưởng đến câu nhắc của bạn."
- Gửi xong: toast "Câu của bạn đã vào hàng chờ duyệt…" — nói rõ là **chờ duyệt**, không giả vờ đã đăng.

### 3.4 Góc xóm đã có biển

Drawer đổi hoàn toàn: khung `donebox` xanh lá hiển thị câu đã treo, ảnh biển thật (nếu có), lời cảm ơn cả khu phố, nút **Chia sẻ** dẫn `/bien/{id}`. Không còn ô viết câu.

### 3.5 Lead tầng 2 (khối "Ưu đãi cư dân")

- Form: tên · SĐT · khu phố tự gõ · 4 pill dịch vụ quan tâm · checkbox opt-in (**mặc định không tick**).
- Bấm gửi khi chưa tick → báo lỗi ngay ở client, đồng thời server cũng từ chối (phòng thủ 2 lớp).
- SĐT nhập lệch với định danh phiên → server trả 409 kèm cờ; UI hiện hộp xác nhận "Tiếp tục với số mới" / "Để mình kiểm tra lại".
- Gửi thành công: form thay bằng thẻ cảm ơn 🧧 + toast.

## 4. Khối "Khu phố tiêu biểu" (`NeighborhoodSlider`)

- Bản đồ khu phố đã bị bỏ từ 1/8; từ 18/8 khối này **chỉ hiện khu đã đạt chuẩn 4N**
  (`certified_4n`) — "đây chỉ là chỗ vinh danh". `is_featured` chỉ còn dùng xếp thứ tự.
- Không còn hàng chip chọn phường, không còn bộ đếm ảnh, không còn nút đề xuất trong khối.
- Badge "KHU PHỐ TIÊU BIỂU" (xanh dương) nhô góc trái trên; pill địa chỉ 1 dòng
  (tên khu phố + `Phường – Tỉnh`) nổi góc phải trên ảnh; mũi tên ‹ › nằm **ngoài** ảnh.
- Mỗi khu hiện **đúng 1 ảnh** — `neighborhood_photos` vị trí #1 (admin vẫn upload được 4 ảnh,
  trang chủ chỉ lấy ảnh đầu); chưa có ảnh nào thì dùng `map_stylized_key`.
- Chưa có khu nào đạt chuẩn → giữ khung, hiện lời mời "Khu phố đạt chuẩn 4N đầu tiên sắp lộ diện".
- Mũi tên và auto-slide 4s chuyển thẳng sang **khu kế**; dừng khi tab ẩn.

## 5. Hệ thống thiết kế

Token khai báo bằng `@theme` trong `src/app/globals.css` (Tailwind 4) — sửa màu ở đây là đổi toàn hệ thống.

| Nhóm | Token | Giá trị |
|---|---|---|
| Nền | `--color-cream` / `-panel` / `-dark` | `#FFF6F0` / `#FFFBF8` / `#F0E2D8` |
| Chủ đạo | `--color-brick` / `-dark` / `-light` | `#F58220` / `#D96A12` / `#FFF0E2` |
| Hero | `--kp-hero-from` / `--kp-hero-to` | `#F07E12` / `#F79A3C` |
| Chữ | `--color-ink` / `-soft` | `#231F20` / `#7A7370` |
| Phụ | `--color-olive`, `--color-fpt`, `--color-teal`, `--color-accent-blue` (+`-light`) | `#7C8A5A`, `#F58220`, `#2F6B4F`, `#2B3FD9` (`#ECEEFC`) |
| Trạng thái | `--color-status-waiting/voting/signed` (+ `-bg`) | đỏ gạch / cam / xanh lá |
| Bóng | `--shadow-kp`, `--shadow-kp-s` | bóng mềm nâu |
| Font | `--font-sans` Be Vietnam Pro · `--font-display` Baloo 2 · `--font-mono` IBM Plex Mono | self-host qua `@fontsource` — **chờ Design cấp font chính thức của skin mới** |

Lớp tiện ích tự định nghĩa: `.kp-card`, `.kp-card-3`, `.kp-h2` (tiêu đề IN HOA),
`.kp-btn` + biến thể **`-primary` (viền cam nền trắng — CTA chính của skin mới)**,
`-solid` (khối cam đặc), `-vote` (viền xanh dương), `-ghost`, `-outline`;
`.kp-input` (bo pill, textarea bo 18px), `.kp-stripe` (dải sọc chéo cam),
`.kp-quote`, `.kp-n4chip`, `.kp-pin`, `.kp-pin-sign`, `.tap` (chiều cao chạm ≥44px).

Asset thương hiệu: `public/brand/kv-khu-pho.webp` (+ bản `-sm` cho footer/mobile),
`signpost.webp`, `plaza.webp` — nén từ `docs/lp/*.png` bằng sharp (KV 15MB → 400KB).

Animation: `kp-sway` (biển đung đưa), `kp-drawer-in`, `kp-fade-in`, `kp-floaty`, `kp-pop` (tim), `kp-slide-up`.
**Toàn bộ animation tắt trong `@media (prefers-reduced-motion: reduce)`.**

### Khả năng tiếp cận

- `html { font-size: 16px }` — chữ tối thiểu 16px.
- Vùng chạm ≥44px qua lớp `.tap`.
- Drawer có `role="dialog"`, `aria-modal="true"`, đóng bằng Esc, nút đóng có `aria-label`.
- SVG trang trí gắn `aria-hidden`; ảnh nội dung luôn có `alt` mô tả.
- Bố cục grid co giãn, kiểm ở 360px không vỡ.

## 6. Trang share & OG image

Ba trang share đều: truy vấn 1 lần → `generateMetadata()` (title, description, `og:image`) → render thẻ trắng bo tròn trên nền kem + nút "Viết câu nhắc cho xóm mình" về trang chủ.

| Trang | Điều kiện hiển thị | OG badge | Copy nguồn |
|---|---|---|---|
| `/bien/{id}` | Chỉ câu `status='installed'`; id phải đúng dạng UUID, sai → 404 | "🎉 Biển đã treo tại đây" | `COPY.shareSign` |
| `/dai-su/{slug}` | User theo `share_slug`, **loại tài khoản shadow-ban** | "Cây bút của khu phố" | `COPY.shareAmbassador` |
| `/khu-pho/{slug}` | Mọi khu phố; đã chứng nhận thì hiện huy hiệu, chưa thì hiện thanh tiến độ % | tên khu phố | `COPY.shareCertified` |

OG image sinh bằng `next/og` (satori), 1200×630, nền kem `#FBF5EC`, chữ đỏ gạch `#B23A2E`, font Be Vietnam Pro nạp từ `public/fonts/*.ttf`. Layout dùng chung ở `src/lib/og.tsx` (`ogCard({badge, title, subtitle, footer, emoji})`).

URL share **không chứa SĐT và không dùng id đoán được** cho hồ sơ người dùng (`share_slug` ngẫu nhiên 10 ký tự).

## 7. Giao diện admin

`AdminShell` = sidebar 9 mục (desktop) / dãy chip cuộn ngang (mobile), hiển thị email admin, nút đăng xuất. Guard UX: gọi `/api/admin/me` khi mount, lỗi thì đẩy về `/admin/login`.

Component dùng chung: `Card` (tiêu đề + khối trắng bo tròn), `Btn` (4 biến thể `primary` / `outline` / `danger` / `ghost`).

Đặc điểm giao diện đáng chú ý:

| Màn | Điểm nhấn |
|---|---|
| `/admin/loi-nhac` | 4 checkbox 4N kèm **gợi ý tiêu chí ngay trên UI**; nút "Duyệt hiển thị" **disabled** đến khi đủ 4 ô (server vẫn kiểm lại) |
| `/admin/loi-nhac?tab=bien` | Nhóm câu theo từng góc xóm, xếp theo số thương; câu đầu bấm chọn thẳng, câu khác bắt buộc nhập lý do |
| Mọi màn admin | Bộ lọc / tìm kiếm / phân trang nằm trên query string (`?tab=…&status=…&q=…&page=…&per=…`) — chia sẻ link là ra đúng màn đang xem |
| `/admin/khu-pho/{id}/ban-do` | Bấm "Đặt pin" → con trỏ crosshair, click lên ảnh tính toạ độ % (1 chữ số thập phân); có link xem ảnh gốc (chỉ admin) |
| `/admin/leads` | SĐT hiển thị dạng `090***567`, bấm mới hiện (kèm cảnh báo có log) |
| `/admin/import` | 3 bước rõ ràng, nút Commit bị khoá khi preview còn lỗi |
| `/admin/diem` | Event bị vô hiệu hiển thị gạch ngang, mờ |

## 8. Quy tắc khi sửa giao diện

1. **Không sửa lời** trong `src/lib/copy.ts` — đó là bản đã duyệt của khách hàng. Cần đổi thì xin duyệt rồi cập nhật cả `06-CONTENT-COPY.md`.
2. Thêm màu mới thì thêm **token** trong `@theme`, đừng viết mã hex rải rác trong component.
3. Mọi link/asset qua `BASE` / `withBase()` / `absoluteUrl()`.
4. Gọi API qua `client-api.ts` để không quên CSRF.
5. Ảnh dùng `<img>` thường (đã tắt eslint rule tại chỗ) vì ảnh đi qua route stream, không dùng Next Image optimizer.
6. Giữ nguyên bảng màu trạng thái 3 màu — người dùng và admin đang đọc bản đồ theo quy ước này.
7. Thêm animation thì nhớ bổ sung vào khối `prefers-reduced-motion`.
