# 25 — Đồng bộ tài liệu với code (8/9/2026)

> Phiên rà soát toàn bộ `docs/*.md` đưa tài liệu về đúng trạng thái code ngày 8/9/2026, sau các đợt
> **18/8** (skin cam FPT), **2–3/9** (bám Figma mới), **4/9** (Figma live + dọn QC), **5/9**
> (`SpotPickerModal`) và **7/9** (QC + admin khu phố).
>
> **Không sửa code trong phiên này.** Mọi con số / tên route / tên cột / tên component ghi vào tài
> liệu đều đã grep thấy trong `src/`, `db/migrations/`, `tests/`, `scripts/`. Chỗ không xác minh
> được thì ghi rõ ở §4 chứ không đoán.

---

## 1. Cách đọc tài liệu sau phiên này

| Ký hiệu | Nghĩa |
|---|---|
| `~~gạch ngang~~` | Nội dung **đặc tả gốc đã bị thay** — giữ lại để biết vì sao từng làm vậy |
| `→ **in đậm**` sau dấu gạch | Hành vi **đang chạy trong code** |
| `<details>` khối gập | Đặc tả gốc lưu trữ nguyên văn (bản đồ, drawer, form đề xuất cũ, sổ cái điểm…) |
| ⚠️ | Chỗ code và tài liệu gốc **cố tình lệch nhau** — đừng "sửa" ngược lại |

Nguyên tắc giữ nguyên từ `docs/README.md`: **không xoá lịch sử quyết định**. Không dòng nào bị xoá
trắng; tất cả chuyển thành ghi chú có ngày hoặc gom vào khối lưu trữ.

---

## 2. Đã sửa những gì

| File | Sửa gì |
|---|---|
| **`00-REVIEW-SUMMARY.md`** | Thêm dòng cập nhật + trỏ sang file này. Đánh dấu quyết định **D5 (bản đồ Q3) đã hết hiệu lực từ 1/8**. Sửa mô tả nội dung của `02` và `04` trong bảng bộ tài liệu. |
| **`01-PRD.md`** | Ghi chú: mục tiêu/personas/KPI **giữ nguyên**; chỉ sửa 3 chỗ còn mô tả bản đồ (giá trị #3 cho chính quyền, persona "người xem thụ động", phạm vi MVP #1 → bố cục trang chủ mới). |
| **`02-FUNCTIONAL-SPEC.md`** | Viết lại §0 (bố cục trang chủ đang chạy + bảng "đã bỏ khỏi trang chủ"). §1 bản đồ → gập vào lưu trữ, đầu mục ghi rõ trạng thái còn lại trong code. §2 → `IssueBoard` 3 tab + bảng 6 chủ đề (thay 8 mã cũ, kèm bảng remap). §3 → tách viết câu / bình chọn + **luật cấm rút phiếu (Q6)** + nút bình chọn chỉ ở câu `approved`. §4 → popup đề xuất **2 bước, ô gộp, bỏ ô câu nhắc kèm, bắt buộc tỉnh/thành**. §5 → bảng xếp hạng thành tab 3, gỡ "khu phố của tháng". §6 → **chứng nhận 4N không điều kiện** + 3 mục mới (6b slider 10 slot · 6c ô tra cứu · 6d hồ sơ khu phố là popup). §7.2 → 6 lựa chọn dịch vụ + tỉnh/thành bắt buộc. §8.1 → tỉnh/thành + `topmost`. §9 → state machine sửa lại + thêm khu phố. §11 → vị trí nút chia sẻ hiện tại. |
| **`03-DATA-MODEL.md`** | Cập nhật `neighborhoods` (bỏ `district`, thêm `certificate_photo_key` / `hidden` / `is_featured` / `featured_position` / `deleted_at`), thêm 4 bảng mới (`neighborhood_photos`, `provinces`, `wards`, `site_content`), `issues.category` **6 chủ đề**, `suggestions` thêm `neighborhood_id`/`category` và đổi tên `image_key`, `votes` thêm `source` + `user_id` nullable + **luật cấm rút phiếu**, `leads` thêm `province`/`address` + 6 mã `interests`, `notifications` 5 loại, `counters` còn **3 chỉ số**. Thêm state machine **Neighborhood (xoá mềm)**. §4 API gắn cảnh báo "đã lệch code, xem `13`". Thêm **§6 — lịch sử migration 002 → 011**. |
| **`04-ADMIN-SPEC.md`** | Đầu file: **bản đồ 7 màn hình hiện tại** + danh sách route admin đã xoá. §1 dashboard 3 KPI + `/api/admin/analytics`. §2 duyệt đề xuất trong tab của Khu phố (+ từ chối kéo theo câu kèm, gỡ khối "💬 Câu nhắc gửi kèm"). §3/§4 đổi đường dẫn `/admin/loi-nhac`. §5 viết lại hẳn: **3 công tắc không điều kiện · 10 slot slide · xoá mềm + tab 🗑**. §6 leads thêm 2 cột. §8 đánh dấu **chưa triển khai** + thêm **§8b Theo dõi thương** và **§8c Nội dung**. §10 bản đồ → gập lưu trữ. §11 import → 2 route riêng. |
| **`05-SCORING-RULES.md`** | Đối chiếu `scoring.ts` / `score-service.ts`: **công thức và 4 trọng số không đổi**, 3 test case §4 vẫn pass. §5 sửa: bỏ dòng "bỏ thương (toggle off)", thêm đường ghi/thu hồi điểm khi **admin chỉnh phiếu**, ghi rõ import không cộng điểm và xoá mềm không đụng điểm. |
| **`06-CONTENT-COPY.md`** | §2 sửa 4 dòng copy đã đổi (counter labels, CTA chính/phụ, leaderboard, footer). §2.1 → gập bảng 28/7 vào lưu trữ. **§2.2 MỚI — bảng copy đang chạy** (nav, hero, 3 tab, 3 nút dòng, CTA đáy, empty state, popup đề xuất, chú thích chip 4N, pill trạng thái…) + hai câu mời dropdown theo `notes_count` + 6 nhãn dịch vụ. **§2.3 MỚI — 4 khối chữ bị gỡ** theo "DESIGN THẮNG SPEC". **§2.4 MỚI — 13 khoá `site_content`** và 8 khoá đã gỡ. §4 taxonomy 8 → 6. **§6 MỚI — câu hỏi còn treo về lời**. |
| **`07-NFR-TECH.md`** | Ghi chú đầu §2 + sửa 3 dòng trong bảng stack: Next.js **15**/Tailwind 4, **bản đồ đã gỡ**, **font/màu là skin cam FPT + FPT SongVui** với nguồn design là `.fig`. |
| **`10-TONG-QUAN-DU-AN.md`** | Bảng vai trò (khách vãng lai, admin, hệ thống), quy tắc cứng 10, dòng "xử lý ảnh" trong stack, và từ điển thuật ngữ (pin/bản cách điệu thành mồ côi; thêm **slot slide**, **xoá mềm**, **lời nhắc chờ bình chọn**). |
| **`11-KIEN-TRUC-HE-THONG.md`** | §5 bổ sung 2 thao tác phải nằm trong transaction (`/api/admin/votes`, xếp slot 3 bước). **§6 pipeline ảnh viết lại**: ảnh khu phố `toCover` 1280×720, ảnh chứng nhận, ảnh biển; pipeline bản đồ → đánh dấu không còn route nào chạy, `stylizeMap` mồ côi. |
| **`12-DATA-DICTIONARY.md`** | Sơ đồ quan hệ (+ `neighborhood_photos` CASCADE, `provinces`/`wards`, `site_content`) và ghi chú 2 ngoại lệ xoá hàng thật. `neighborhoods` viết lại + **§2.1b slot slide**, **§2.1c ảnh**, **§2.1d geo**, **§2.1e site_content**. `issues`/`suggestions`/`votes`/`leads`/`notifications`/`audit_logs` cập nhật cột và ràng buộc. **§4.1b state machine xoá mềm** + `resolveNeighborhoodId`. §4.3 "hiện công khai" thêm `deleted_at IS NULL` **kèm danh sách 10 nơi bộ lọc đang nằm**. §5 truy vấn phái sinh: 3 counter mới + `getVotingNotes`. |
| **`13-API-REFERENCE.md`** | Counters 4 → 3 ô. `/map` mô tả lại. `/leaderboard` bỏ `type` + `neighborhood_of_month`, thêm `suggestions_count` / `viewer_rank`. `/issues` thêm `top_author_name` + cảnh báo trùng lặp SSR. POST `/issues` payload mới. **Vote: bỏ toggle, 409 `ALREADY_VOTED`**. 4 mục MỚI: `/issues/{id}/vote`, **`/notes`**, **`/ambassadors/{slug}`**, **`/geo`**. `/neighborhoods/{id}` đổi `signs` → `notes`. §3.3 admin issues (filter/`q`/phân trang/`counts`, bỏ `attached_suggestion`); §3.4 suggestions + `/photo` + import; **§3.5 viết lại** (PATCH/DELETE/restore/certify/photos/certificate/import) + **§3.5b votes**, **§3.5c site-content**, **§3.5d analytics**; §3.6 leads (province, 9 cột CSV, 404 id sai). §3.8 `/admin/scores` và §3.9 `/admin/import` → **đánh dấu KHÔNG TỒN TẠI**, đặc tả gốc gập lưu trữ. **§5 bảng tra nhanh dựng lại từ 43 route thật** + danh sách đường dẫn từng có trong tài liệu nhưng không có trong code. |
| **`14-BAO-MAT-VA-QUYEN-RIENG-TU.md`** | Ghi chú: **không thay đổi nào nới lỏng bảo mật SĐT**. Cập nhật bảng vị trí ảnh (route bản đồ gốc đã xoá; thêm ảnh khu phố + ảnh chứng nhận) và 3 điểm mới (2 cột lead, CSV 9 cột, 4 action audit mới). |
| **`15-DIEM-XEP-HANG-CHONG-GIAN-LAN.md`** | Bảng "ai được cộng điểm" thêm **admin tăng thương**; bảng "khi nào điểm bị vô hiệu" bỏ "bỏ thương", thêm **admin giảm thương**. Màn `/admin/diem` → đánh dấu **không có trong code**, đặc tả gập lưu trữ. Thêm bảng cuối: **thay đổi ảnh hưởng điểm/xếp hạng 18/8 → 7/9**. |
| **`16-FRONTEND-UI.md`** | Đầu file: **nguồn design chuẩn là `.fig` trong repo** + cách đọc + **bẫy `visible=false` / `symbolOverrides`**. §1 bản đồ route viết lại (7 màn admin + 6 route đã xoá + quy tắc `layout.tsx`). §2 cây component viết lại + **bảng component đã xoá / mới** + `ui.tsx` + **khung Modal 700** + khoá cuộn. §3.2 bình chọn không rút lại. §3.3 chip 4N + **§3.3b các đường vào form viết câu**. §3.4 popup đề xuất 2 bước. §3.5 lead 6 lựa chọn. **§3.6 `IssueBoard` 3 tab**, **§3.7 banner là lớp nổi**. §4 slider 10 slot + bẫy clone/`setTimeout`. **§4b ô tra cứu 4N** (3 trạng thái, không có nút "+"). §5 hệ thống thiết kế viết lại: token cam FPT, **font FPT SongVui (không 600/800)**, danh sách class, **họ bẫy CSS C1/C2/7-9**, quy chuẩn mobile, asset, bẫy cuộn. §6 trang share + `NeighborhoodView` dùng chung. **§7 giao diện admin viết lại** + 3 ca thông báo slot + mẹo QC. §8 thêm 3 quy tắc (jsdom, thứ tự CSS, không build khi dev chạy). |
| **`17-VAN-HANH-ADMIN.md`** | Đầu file: **menu 7 mục** + 3 màn đã gộp/xoá. §1 dashboard 3 KPI + bộ lọc 7/30/90 ngày. §2 bỏ bước "đặt pin", thêm ghi chú từ chối kéo theo câu kèm và tab xem mọi trạng thái. §4.3 ô ngày riêng từng dòng. **§5 viết lại** (thêm khu phố có tỉnh/phường, import, ảnh, **5.1 ba công tắc tự do**, **5.2 slot slide + 3 ca thông báo**, **5.3 xoá mềm**). §6 bản đồ → không còn; thêm **§6b Nội dung**, **§6c Theo dõi thương**. §7 leads thêm cột tỉnh/địa chỉ. §9 sổ cái điểm → không có màn hình. **§10 import viết lại** (2 nút, 2 template). §11 nhịp vận hành. |
| **`18-TRIEN-KHAI-VAN-HANH.md`** | Ghi chú đầu file: **khối TVC đã gỡ** ⇒ mọi mục về iframe YouTube chỉ còn giá trị lịch sử, nhưng **giữ `frame-src`** trong CSP. Ghi chú B5.5 gập lưu trữ. 2 dòng sự cố TVC đánh dấu *(lịch sử)*; dòng "ảnh bản đồ 404" viết lại + thêm 2 dòng sự cố mới (**slider trống**, **khu phố biến mất vì xoá mềm**). Checklist nghiệm thu: luồng end-to-end mới + **mục C4 đo LCP production chưa làm**. |
| **`19-KIEM-THU-VA-NGHIEM-THU.md`** | §1 viết lại thành 3 phần: **1.1 unit (7 file)**, **1.2 UI jsdom (21 file, có mô tả từng file)**, **1.3 E2E (`pnpm test:e2e`, 33 ca, tự SKIP)**; kèm cảnh báo **jsdom không tính layout/media query** và mẹo đo bằng iframe (+17px). E2E-1 cập nhật theo luồng mới (popup đề xuất mở thẳng, tab 1/tab 2, cấm rút phiếu, `SpotPickerModal`, chứng nhận không điều kiện, **slot slide**, **xoá mềm/khôi phục**). E2E-3 thêm ca tỉnh/thành bắt buộc. E2E-4 sửa ca toggle → 409 + ca admin chỉnh thương. **E2E-5 viết lại thành "Ảnh & import"**. E2E-6 reduce-motion + khoá cuộn. §3 quy tắc 10. §4 DoD + **C4 chưa làm**. §5 thêm 4 gạch đầu dòng trước khi merge. |
| **`20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md`** | §1: Q3 và Q6 gắn trạng thái thực tế. §2: **thêm 9 quyết định** (cấm rút phiếu, xoá mềm, chứng nhận là quyết định vận hành, slot slide, lọc tab 1, bỏ ô câu nhắc kèm, `SpotPickerModal` tự thiết kế, nguồn design là `.fig` local, chân trang giữ 4 dòng). **§2.2 MỚI — Q1–Q7 của phiên 2–3/9**. **§2.3 MỚI — 3 khác biệt LIVE vs `.fig`** + cách đọc Figma live bằng trình duyệt. §3 nợ kỹ thuật: cập nhật `month_snapshots`, cột mồ côi, notification 5 loại, **thiếu màn sổ cái điểm**, phân trang, lối vào đề xuất mobile; §3.4 thêm jsdom + **C4**; §3.5 thêm 8 mục (docs/CLAUDE.md lệch, asset/hằng/hàm mồ côi, `/dai-su` không lối vào, ảnh hero lệch, dư 73px). §4 phạm vi. |
| **`README.md`** (trong `docs/`) | Dòng cập nhật + trỏ file này; bảng A thêm `.fig` là nguồn design chuẩn và đánh dấu `import-template.xlsx` không dùng; **thêm bảng "Tài liệu đợt điều chỉnh 21–25"**; `13` sửa "30 endpoint" → **43 route**; Tra nhanh thêm 4 câu hỏi mới. |
| **`25-DONG-BO-TAI-LIEU-08-09.md`** | File này (mới). |

**Không sửa**: `docs/CLAUDE.md` (quy tắc cứng do PM giữ — xem §4 câu hỏi 6, 7), `21`, `22`, `23`,
`24`, `QC-02-09-2026.md`, `TONG-HOP-KIEM-DUYET.md` (đều là nhật ký phiên, đúng với thời điểm viết).

### 2b. Bổ sung CUỐI NGÀY 8/9 (sau khi §2 đã chốt)

Hai việc xảy ra **sau** lượt rà ở §2, đã đồng bộ vào tài liệu trong cùng ngày:

**(a) Tính năng mới — admin ghi đè dải 3 con số ở hero** (commit `feat(admin/noi-dung)`).
Đây là thứ duy nhất trong phiên này **code đi trước tài liệu**; đã bổ sung vào:

| File | Bổ sung |
|---|---|
| `03-DATA-MODEL.md` | Khối ghi chú dưới §counters (2 đường `getCounters` / `getRealCounters`) + sửa bảng route `/counters` từ "4 bộ đếm" → 3 |
| `04-ADMIN-SPEC.md` | §8c-bis mới + sửa bảng màn admin thành "13 khoá text + 3 con số hero" |
| `12-DATA-DICTIONARY.md` | §2.1e: 3 khoá `counter_*` nằm cùng bảng `site_content` nhưng **ngoài** `SITE_TEXT_KEYS` |
| `13-API-REFERENCE.md` | §2.2 (trả số đã ghi đè) · §3.2 (**dashboard dùng `getRealCounters()`** — dòng cũ nói dùng chung `getCounters()` đã SAI) · §3.5c (nhóm `counters` trong body PATCH) |
| `17-VAN-HANH-ADMIN.md` | §6b thêm hướng dẫn vận hành cho người dùng admin |
| `19-KIEM-THU…md` | 2 test mới: `tests/counters.test.ts`, `tests/ui/admin-site-counters.test.tsx` |
| `16-FRONTEND-UI.md` | Chú thích ở cây component `Counters` |

**(b) Dọn repo** — gỡ toàn bộ nguồn thô/ảnh design khỏi git (30MB, kể cả lịch sử: `.git` 68MB →
2.7MB, clone 7MB). Hệ quả với tài liệu: `docs/README.md` §C là **bảng tra "file nào ở Drive"**;
`22`, `23` không còn trỏ vào ảnh export nữa; quy trình QC bằng ảnh nay phải xin `.fig` ở Drive
hoặc dump lại bằng `scripts/figma/`. Chi tiết trong `CLAUDE.md` §"Dọn repo 8/9".

---

## 3. Bảng đối chiếu nhanh — thứ tài liệu cũ nói vs code hôm nay

| Tài liệu cũ nói | Code hôm nay | Nguồn xác minh |
|---|---|---|
| 8 chủ đề (`toc_do`, `trom_cap`…) | **6 chủ đề** | `src/lib/taxonomy.ts` · `db/migrations/002_dieuchinh_1_8.sql` |
| Trang chủ có bản đồ + pin | Không có bản đồ; `pin_x/pin_y` mồ côi | `src/app/page.tsx` · `src/components/home/` |
| 4 bộ đếm | **3** (`signs_installed`, `neighborhoods_joined`, `suggestions_total`), **admin ghi đè được** (8/9) | `src/lib/counters.ts` |
| Bấm "Thương" là toggle | **409 `ALREADY_VOTED`**, không rút phiếu | `src/app/api/v1/suggestions/[id]/vote/route.ts` |
| `POST /api/admin/import` | **Không tồn tại** → 2 route import riêng | `find src/app/api -name route.ts` |
| `GET /api/admin/scores` + `/admin/diem` | **Không tồn tại** | idem |
| `/api/admin/neighborhoods/{id}/map-image` | **Không tồn tại** | idem |
| `/api/admin/suggestions/{id}/sign-photo` | Tên đúng là **`/photo`** | `src/app/api/admin/suggestions/[id]/photo/route.ts` |
| `/api/admin/site-content/kv` | **Đã xoá 4/9** | idem |
| `neighborhoods.district` | **Đã DROP** | `003_khu_pho_admin.sql` |
| `suggestions.sign_photo_key` | Đổi tên **`image_key`** | `006_suggestion_sign_fields.sql` |
| `neighborhoods.photo_key` | **Đã DROP** → bảng `neighborhood_photos` | `003_khu_pho_admin.sql` |
| `featured_position` là thứ tự tự do | **Slot slide 1–10, unique** | `011_soft_delete_featured_slots.sql` · `src/lib/featured.ts` |
| Chứng nhận 4N cần 100% biển | **Không điều kiện** | `src/app/api/admin/neighborhoods/[id]/certify/route.ts` |
| `leaderboard?type=neighborhood` | Không có tham số; không còn `neighborhood_of_month` | `src/app/api/v1/leaderboard/route.ts` |
| `interests` 4 mã | **6 mã** (4 mã cũ giữ nguyên) | `src/lib/taxonomy.ts` → `INTERESTS` |
| Next.js 14 | **Next.js 15 / React 19 / Tailwind 4** | `package.json` |
| Font Be Vietnam Pro + Baloo 2 | **FPT SongVui** (fallback là 2 font cũ) | `src/app/globals.css` |

---

## 4. CÒN TREO — câu hỏi cho BA / Design / PM

### 4.1 Về lời & thiết kế (gom từ `CLAUDE.md` §"CÒN TREO")

| # | Câu hỏi | Vì sao cần trả lời |
|---|---|---|
| **1** | **Thống nhất "góc phố" hay "khu phố"?** Cùng một luồng đang có ba cách gọi: `.fig` ghi tiêu đề popup **"Đề xuất khu phố mới"**, nav link là **"Đề xuất khu phố cần treo biển"**, CTA đáy tab 3 vẫn là **"+ Đề xuất góc phố mới"** — và tab 1 tên là "Góc phố mới cần treo biển". | Người dùng đọc thấy 2 khái niệm cho 1 thứ. Đổi lời là đổi cả `copy.ts`, `site_content` và 3 component. |
| **2** | **Bỏ ô "câu nhắc gửi kèm" ở popup đề xuất có chủ ý không?** `.fig` 2/9 không vẽ ô này nên code đã gỡ 7/9, nhưng ô đó vốn là yêu cầu `dieuchinh.1.8` #5. | Nếu Design chỉ **quên vẽ** thì phải bật lại — route `POST /api/v1/issues` vẫn nhận `suggested_content`, code cũ còn trong git, chi phí bật lại thấp. Để lâu thì admin cũng đã gỡ khối "💬 Câu nhắc gửi kèm" khỏi màn duyệt. |
| **3** | Ô **`Phường /Xã`** khi **chưa chọn tỉnh**: design chỉ vẽ `Lựa chọn`; web đang khoá xám và cũng hiện `Lựa chọn`. Có cần câu gợi ý riêng cho trạng thái khoá (VD *"Chọn tỉnh/thành trước"*) không? | Trải nghiệm lần đầu: người dùng bấm vào ô bị khoá mà không biết vì sao. |
| **4** | Nhãn **`Phường /Xã`** trong `.fig` có dấu cách lạc chỗ (`Phường` + space + `/Xã`). Giữ nguyên văn hay sửa thành `Phường/Xã`? | Đang render **nguyên văn** theo `.fig`. |
| **5** | **Sáu frame popup trong `.fig` vẫn còn nhãn nav CŨ**, chưa đồng bộ với frame chuẩn `7217:1990`. | Người đọc design dễ dựng lại nhãn cũ. Cần Design đồng bộ hoặc xác nhận lấy `7217:1990` làm chuẩn. |
| **6** | **Xin export `.fig` mới.** File local (lưu 2/9 22:34) đã lệch bản trên figma.com ở ít nhất 3 điểm (xem `20` §2.3); ảnh export `docs/lp/Landing page*.png` (2/9 22:17) còn cũ hơn cả `.fig`. | **Toàn bộ số đo px của bản live chưa đo được** — mới đối chiếu được nhãn/cấu trúc qua chế độ prototype. |
| **7** | **Design có vẽ frame cho popup "Chọn góc phố" (`SpotPickerModal`) không?** Hiện team dev tự thiết kế (chốt 5/9) theo khung `Modal` chung. | Nếu Design vẽ sau thì phải đối chiếu lại toàn bộ popup. |
| **8** | Ở frame tab 2 của Figma, **dòng đầu tiên có chữ màu cam** còn 4 dòng sau màu đậm. Chốt 4/9 coi là "khung render dở lúc prototype tải" và web render tất cả màu đậm — **cần Design xác nhận** đó không phải một trạng thái thiết kế (hover? câu dẫn đầu? đã bình chọn?). | Nếu là trạng thái thật thì thiếu một quy tắc hiển thị. |
| **9** | **Menu avatar có gì?** (câu hỏi F5 của `docs/21` vẫn treo). Bản đang chạy là tối giản: tên · điểm · Đăng xuất. | Thêm mục mới chỉ là chèn vào `<ul>` của `UserMenu.tsx`, nhưng cần PM chốt danh sách. |
| **10** | **Dải khuyến mãi ở đáy biển bỏ hẳn hay tạm?** Chốt 3/9 là bỏ, đã gỡ 4 khoá `site_content` và asset `public/brand/sign-fptplay.webp` thành mồ côi. | Nếu bỏ hẳn thì xoá asset; nếu tạm thì giữ nguyên và ghi rõ để không ai dọn nhầm. |

### 4.2 Về quy tắc cứng — cần PM duyệt trước khi sửa `docs/CLAUDE.md`

`docs/CLAUDE.md` là **nguồn quy tắc cứng do PM giữ**; phiên này **không sửa**, chỉ nêu 3 chỗ đã lệch:

| # | Chỗ lệch | Thực tế |
|---|---|---|
| **11** | **Quy tắc cứng 10** — *"Bản đồ (Q3): ảnh gốc chỉ admin thấy; public luôn là bản cách điệu; pin dùng toạ độ %"* | Bản đồ **đã gỡ khỏi sản phẩm từ 1/8**. Vế "ảnh gốc chỉ admin thấy" vẫn đúng cho mọi ảnh prefix `private/` và vẫn được ép ở `/api/img`; hai vế còn lại **không còn đối tượng áp dụng**. |
| **12** | **§"Nguồn sự thật về UI"** trỏ tới `Khu Pho Yeu Thuong.dc.html` và `Admin Khu Pho.dc.html` | Hai file này **không có trong `docs/`**. Nguồn design chuẩn hiện nay là **`docs/lp/LandingpageFCM.fig`** (chốt 4/9). |
| **13** | **Definition of Done** còn hạng mục *"Upload ảnh bản đồ → hiển thị bản cách điệu + đặt pin bằng click; bấm pin hiện ảnh thật địa điểm"* | Hạng mục này đã rút khỏi phạm vi. Đề nghị thay bằng: *"Upload 4 ảnh tổng quan + 1 ảnh chứng nhận cho khu phố; slider hero hiển thị đúng 10 slot theo thứ tự admin xếp."* |

### 4.3 Việc kỹ thuật còn nợ (không cần BA trả lời)

| # | Việc | Ghi ở |
|---|---|---|
| **C4** | **Đo LCP trang chủ trên bản production** — phải dừng dev server để `pnpm build && pnpm start`. Chưa làm từ QC 2/9. DoD yêu cầu < 2.5s | `19` §4 · `20` §3.4 |
| — | Ảnh hero `cart.webp` / `sweepers.webp` nằm **cao hơn** design (nghi do `top-%` tính theo chiều cao div bọc thay vì khổ 1440 của `.fig`) | `20` §3.5 |
| — | Trang cao **3853** vs `.fig` **3780** — dư 73px (phần lớn ở chân trang, đã chốt là có chủ ý) | `20` §3.5 |
| — | Chưa có màn hình đọc `audit_logs`; chưa có màn sổ cái điểm | `20` §3.2, §3.3 |
| — | Chưa có E2E trình duyệt (Playwright) và CI chạy `pnpm test` | `20` §3.4 |

---

## 5. Nghi vấn code (ghi lại, KHÔNG tự sửa)

Những chỗ code có vẻ đi trước/khác tài liệu theo hướng **cần người quyết định**, không phải lỗi rõ ràng:

| # | Quan sát | Xác minh | Đề xuất |
|---|---|---|---|
| **N1** | `POST /api/v1/issues` **vẫn nhận** `suggested_content` và vẫn INSERT vào `suggestions`, dù không client nào gửi nữa. | `src/app/api/v1/issues/route.ts` | Cố ý (ghi trong comment) để bật lại được. **Giữ**, nhưng nếu câu hỏi §4.1-2 chốt là "bỏ hẳn" thì nên gỡ để tránh đường ghi dữ liệu không ai theo dõi. |
| **N2** | `POST /api/v1/issues/{id}/vote` **không còn client nào gọi** từ bản Figma 2/9. | `grep -rn "issues/.*vote" src/components` → 0 kết quả | Cố ý giữ vì là API công khai. Luật đã đồng bộ với route theo câu (409 `ALREADY_VOTED`). |
| **N3** | `stylizeMap()`, `neighborhoods.map_image_key`, `issues.pin_x/pin_y/photo_key`, bảng `month_snapshots` đều **mồ côi**. | `grep -rn` trong `src/` | Giữ (khôi phục được). Nếu chốt bỏ hẳn bản đồ thì nên dọn trong một đợt riêng, kèm migration. |
| **N4** | `/api/v1/map` vẫn trả mảng `pins` mà không giao diện nào dùng. | `src/app/api/v1/map/route.ts` | Chi phí truy vấn nhỏ; có thể gỡ khi dọn N3. |
| **N5** | Bộ lọc "tab 1 chỉ hiện góc phố chưa có câu" đặt ở **client**, không ở API. | `src/components/home/IssueBoard.tsx` | **Đúng ý đồ** (chốt 7/9): `SpotPickerModal` cần thấy mọi góc phố chưa treo biển. Đã ghi rõ ở `13` §2.5 để không ai "tối ưu" nhầm xuống server. |
| **N6** | Truy vấn danh sách góc phố bị **nhân đôi** giữa `src/app/page.tsx` (SSR) và `/api/v1/issues`. | Hai file, cùng câu SQL | Đã có cảnh báo ở `13` §2.5. Nên tách thành một hàm dùng chung như `getVotingNotes()` đã làm — **việc refactor, không phải lỗi**. |
| **N7** | `tests/stylize.test.ts` vẫn chạy và pass cho một hàm đã mồ côi. | `tests/stylize.test.ts` | Vô hại; xoá cùng lúc với N3 nếu chốt bỏ. |

---

## 6. Nhắc lại 5 cái bẫy dễ tái phạm

1. **Sửa route mà quên SSR** (`src/app/page.tsx`) — hoặc ngược lại. Triệu chứng: dòng **nhảy chữ**
   sau 20 giây polling. Áp cho `/api/v1/issues`, `/api/v1/notes`, `/api/v1/leaderboard`.
2. **Quên `deleted_at IS NULL`** khi thêm truy vấn công khai đụng `neighborhoods` — khu đã xoá sẽ
   "sống lại" ở đúng chỗ đó. Danh sách 10 nơi bộ lọc đang nằm: `12` §4.3.
3. **Họ bẫy CSS**: `.kp-*` và `.tap` khai ngoài `@layer` nên utility Tailwind **không đè được**;
   cùng specificity thì **rule sau thắng** ⇒ thứ tự khai báo là một phần của hành vi.
   Test khoá: `tests/globals-css.test.ts`.
4. **jsdom không tính layout, không hiểu media query** — mọi số đo px phải đo bằng Chrome
   (iframe **+17px** cho thanh cuộn).
5. **`dump.py` của bộ đọc `.fig` không lọc `visible=false` và không áp `symbolOverrides`** — một node
   in ra trong dump vẫn có thể bị TẮT hoặc đổi nhãn ở frame đang xem. Luôn đối chiếu chéo với ảnh
   export trước khi dựng.
