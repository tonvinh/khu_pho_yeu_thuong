# 16 — Giao diện & frontend

> Design tham chiếu: `KhuPhoCuaToi-prototype-v4.html`. Copy tiếng Việt: `src/lib/copy.ts` (nguyên văn từ `06-CONTENT-COPY.md` §2, wording bản duyệt 28/7).

## 1. Bản đồ route

| Route | Kiểu | Mô tả |
|---|---|---|
| `/` | Server + client island | Trang chủ một trang: hero + bản đồ, biển mẫu, danh sách góc xóm, bảng xếp hạng, khối ưu đãi, footer |
| `/bien/{suggestionId}` | Server | Trang share "biển đã treo" + OG image động |
| `/dai-su/{share_slug}` | Server | Trang share thành tích Đại sứ + OG image động |
| `/khu-pho/{slug}` | Server | Trang share chứng nhận / tiến độ khu phố + OG image động |
| `/chinh-sach-du-lieu` | Static | Chính sách dữ liệu (PDPD) |
| `/admin/login` | Client | Đăng nhập admin (2 bước nếu bật TOTP) |
| `/admin` | Client | Dashboard |
| `/admin/de-xuat` | Client | Duyệt đề xuất vấn đề |
| `/admin/cau-nhac` | Client | Duyệt câu nhắc với checklist 4N |
| `/admin/bien` | Client | Chọn câu & vòng đời biển |
| `/admin/khu-pho` | Client | Khu phố & chứng nhận |
| `/admin/khu-pho/{id}/ban-do` | Client | Trình quản lý bản đồ & pin |
| `/admin/leads` | Client | Quản lý leads |
| `/admin/gian-lan` | Client | Chống gian lận |
| `/admin/diem` | Client | Sổ cái điểm |
| `/admin/import` | Client | Bulk import khu phố |

Mọi link nội bộ trong client dùng hằng `BASE` (từ `client-api.ts`); trong server dùng `withBase()`. **Không hard-code `/`**.

## 2. Cây component trang chủ

```
app/page.tsx  (Server — 6 truy vấn song song, force-dynamic)
└── HomeShell  "use client"   ← orchestrator: state, polling 20s, modal, toast
    ├── Top bar sticky (logo, 2 anchor link, lời chào "Chào {tên} 👋")
    ├── Banner báo tin vui in-web  ← /api/v1/me/notifications (thay SMS)
    ├── <header> hero
    │   ├── Eyebrow + h1 + mô tả + 3 CTA
    │   ├── Counters          4 ô số liệu
    │   └── MapSection        bản đồ cách điệu + pin biển treo đung đưa
    ├── Section "Lời nhắc khi lên biển trông như thế nào?"
    │   └── HangSign × 6      câu được thương nhiều nhất tuần + EXAMPLE_SIGNS
    ├── Section "Cùng đóng góp một câu…"
    │   ├── IssueList         card từng góc xóm
    │   └── Leaderboard       bảng Cây bút + biển chứng nhận 4N + ô tra cứu
    ├── Section "Ưu đãi cư dân"
    │   └── LeadSection       form lead tầng 2 (opt-in mặc định KHÔNG tick)
    ├── <footer>
    ├── IdentifyModal         khi cần định danh
    ├── ProposeModal          drawer đề xuất góc xóm
    ├── IssueDrawer           drawer xem/viết/bình chọn câu nhắc
    └── Toast
```

Component dùng chung ở `components/home/ui.tsx`: `Eyebrow`, `SectionHead`, `Field`, `Drawer` (trượt phải, đóng bằng Esc, `role="dialog"`), `HangSign` (biển treo nghiêng có móc).

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

## 4. Bản đồ (`MapSection`)

- Chuyển khu phố bằng dãy chip (khu đã chứng nhận có 🏅).
- Nền = **ảnh cách điệu** (`map_url`); chưa có ảnh thì dùng SVG placeholder cụm nhà + ngõ hẻm.
- Pin = biển treo nhỏ có móc, `left/top` theo **%**, `translate(-50%, -100%)`, animation `kp-sway`; hover thì lắc nhanh hơn.
- Màu pin theo trạng thái: đỏ gạch `waiting` · cam FPT `voting` · xanh lá `signed`. Chú giải 3 màu ngay đầu card.
- Bấm pin → mở `IssueDrawer` của góc xóm đó.
- Khu phố chưa có pin → dòng mời "bạn đề xuất điểm đầu tiên nhé!".

## 5. Hệ thống thiết kế

Token khai báo bằng `@theme` trong `src/app/globals.css` (Tailwind 4) — sửa màu ở đây là đổi toàn hệ thống.

| Nhóm | Token | Giá trị |
|---|---|---|
| Nền | `--color-cream` / `-panel` / `-dark` | `#F4EEE3` / `#FBF7EF` / `#E4D9C7` |
| Chủ đạo | `--color-brick` / `-dark` / `-light` | `#C0573B` / `#A8482F` / `#FBEAE3` |
| Chữ | `--color-ink` / `-soft` | `#2B2620` / `#6E665A` |
| Phụ | `--color-olive`, `--color-fpt`, `--color-teal`, `--color-accent-blue` | `#7C8A5A`, `#EF7B27`, `#2F6B4F`, `#2D6CB5` |
| Trạng thái | `--color-status-waiting/voting/signed` (+ `-bg`) | đỏ gạch / cam / xanh lá |
| Bóng | `--shadow-kp`, `--shadow-kp-s` | bóng mềm nâu |
| Font | `--font-sans` Be Vietnam Pro · `--font-display` Baloo 2 · `--font-mono` IBM Plex Mono | self-host qua `@fontsource` |

Lớp tiện ích tự định nghĩa: `.kp-card`, `.kp-card-3`, `.kp-kicker`, `.kp-btn` (+`-primary`/`-outline`), `.kp-input`, `.kp-quote`, `.kp-n4chip`, `.kp-pin`, `.kp-pin-sign`, `.tap` (chiều cao chạm ≥44px).

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
| `/admin/cau-nhac` | 4 checkbox 4N kèm **gợi ý tiêu chí ngay trên UI**; nút "Duyệt hiển thị" **disabled** đến khi đủ 4 ô (server vẫn kiểm lại) |
| `/admin/bien` | Nhóm câu theo từng góc xóm, xếp theo số thương; câu đầu bấm chọn thẳng, câu khác bắt buộc nhập lý do |
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
