# Tài liệu dự án "Khu Phố Của Tôi"

Website hub chiến dịch **"Khu phố biết thương"** — FPT Telecom.

> **Cập nhật 8/9/2026**: toàn bộ bộ tài liệu đã được đồng bộ lại với code sau các đợt 18/8 (skin cam
> FPT), 2–4/9 (bám Figma mới) và 7/9 (QC + admin khu phố). Nhật ký "file nào sửa gì" + danh sách câu
> hỏi còn treo cho BA/Design: [`25-DONG-BO-TAI-LIEU-08-09.md`](25-DONG-BO-TAI-LIEU-08-09.md).

Thư mục này chứa **hai bộ tài liệu**, đọc theo đúng vai trò:

| Bộ | File | Là gì | Ai sửa |
|---|---|---|---|
| **A. Đặc tả gốc (00–07)** | `00-…` → `07-…` | Yêu cầu đã ký duyệt của khách hàng/PM. Là **nguồn sự thật về "phải làm gì"**. | Chỉ PM/khách hàng |
| **B. Tài liệu hệ thống (10–20)** | `10-…` → `20-…` | Mô tả hệ thống **như đã triển khai thực tế** trong repo. Là nguồn sự thật về "đang làm thế nào". | Đội kỹ thuật, cập nhật cùng code |

Nếu A và B mâu thuẫn → hệ thống đang lệch đặc tả: sửa code hoặc xin PM duyệt thay đổi, **không** âm thầm sửa tài liệu A.

---

## A. Đặc tả gốc (do khách hàng/PM duyệt)

| File | Nội dung |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | **Đọc trước tiên** — 11 quy tắc cứng không được vi phạm + Definition of Done |
| [`00-REVIEW-SUMMARY.md`](00-REVIEW-SUMMARY.md) | Tóm tắt kiểm duyệt, nhật ký quyết định |
| [`01-PRD.md`](01-PRD.md) | Bối cảnh, mục tiêu kinh doanh, personas, scope, KPI |
| [`02-FUNCTIONAL-SPEC.md`](02-FUNCTIONAL-SPEC.md) | Từng màn hình & flow — nguồn sự thật về **hành vi** |
| [`03-DATA-MODEL.md`](03-DATA-MODEL.md) | Schema, state machine, API — nguồn sự thật về **dữ liệu** |
| [`04-ADMIN-SPEC.md`](04-ADMIN-SPEC.md) | Đặc tả trang quản trị |
| [`05-SCORING-RULES.md`](05-SCORING-RULES.md) | Công thức điểm + 3 test case bắt buộc pass |
| [`06-CONTENT-COPY.md`](06-CONTENT-COPY.md) | Copy tiếng Việt nguyên văn, chuẩn 4N, seed data |
| [`07-NFR-TECH.md`](07-NFR-TECH.md) | NFR, tech stack, kiến trúc bảo mật & Docker, quyết định đã chốt |
| `lp/LandingpageFCM.fig` | **Nguồn design CHUẨN của trang chủ** (chốt 4/9) — đọc bằng `scripts/figma/` |
| `KhuPhoCuaToi-prototype-v4.html` | Design tham chiếu cũ (chỉ còn giá trị lịch sử) |
| ~~`import-template.xlsx`~~ | Template 2 sheet của đặc tả gốc — **không dùng**; mỗi màn admin tự sinh template riêng |
| `khupho_dieuchinh_28_7.xlsx` | Bản duyệt wording 28/7 (đã áp vào `src/lib/copy.ts`) |
| `TONG-HOP-KIEM-DUYET.md` | Biên bản tổng hợp kiểm duyệt |

## B. Tài liệu hệ thống (mô tả code hiện tại)

| File | Nội dung | Đọc khi |
|---|---|---|
| [`10-TONG-QUAN-DU-AN.md`](10-TONG-QUAN-DU-AN.md) | Bức tranh toàn cảnh: sản phẩm, vai trò, vòng đời nội dung end-to-end, từ điển thuật ngữ, bản đồ repo | Người mới vào dự án — **bắt đầu ở đây** |
| [`11-KIEN-TRUC-HE-THONG.md`](11-KIEN-TRUC-HE-THONG.md) | Kiến trúc: 4 service Docker, vòng đời request, render SSR + island, module `src/lib`, pipeline ảnh, basePath | Trước khi sửa code lõi |
| [`12-DATA-DICTIONARY.md`](12-DATA-DICTIONARY.md) | Từ điển dữ liệu: từng bảng/cột/ràng buộc/index, quan hệ, state machine, quy tắc bất biến, migration | Khi đụng DB hoặc viết query |
| [`13-API-REFERENCE.md`](13-API-REFERENCE.md) | Tham chiếu API đầy đủ: **43 route** public + admin, request/response/lỗi, ví dụ curl, bảng tra nhanh | Khi tích hợp hoặc debug API |
| [`14-BAO-MAT-VA-QUYEN-RIENG-TU.md`](14-BAO-MAT-VA-QUYEN-RIENG-TU.md) | Định danh không OTP, HMAC/AES, phiên, CSRF, rate limit, admin auth, audit log, PDPD, mô hình đe doạ | Trước mọi thay đổi chạm SĐT/auth |
| [`15-DIEM-XEP-HANG-CHONG-GIAN-LAN.md`](15-DIEM-XEP-HANG-CHONG-GIAN-LAN.md) | Sổ cái điểm, trần tuần, bảng xếp hạng, heuristics gian lận & xử lý im lặng | Khi sửa logic điểm/bình chọn |
| [`16-FRONTEND-UI.md`](16-FRONTEND-UI.md) | Bản đồ route, cây component, design token, luồng tương tác, trang share + OG image | Khi làm giao diện |
| [`17-VAN-HANH-ADMIN.md`](17-VAN-HANH-ADMIN.md) | Cẩm nang vận hành admin: SOP duyệt 4N, chọn câu, treo biển, leads, import, chứng nhận | Đội vận hành chiến dịch |
| [`18-TRIEN-KHAI-VAN-HANH.md`](18-TRIEN-KHAI-VAN-HANH.md) | **Runbook deploy production từng bước** (mode A/B), env & secrets, CI/CD, rollback, backup/restore, sự cố | Khi deploy/vận hành hạ tầng |
| [`19-KIEM-THU-VA-NGHIEM-THU.md`](19-KIEM-THU-VA-NGHIEM-THU.md) | Test tự động, kịch bản E2E thủ công, checklist nghiệm thu theo 11 quy tắc cứng | Trước mỗi lần release |
| [`20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md`](20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md) | Nhật ký quyết định kiến trúc (gồm Q1–Q7 của 2/9 và các chốt 4/9, 7/9), ASSUMPTION trong code, giới hạn đã biết, backlog kỹ thuật | Khi lên kế hoạch giai đoạn sau |

### Tài liệu đợt điều chỉnh (21–25) — nhật ký từng phiên

| File | Nội dung |
|---|---|
| [`21-KE-HOACH-DIEU-CHINH-18-8.md`](21-KE-HOACH-DIEU-CHINH-18-8.md) | Kế hoạch skin cam FPT + email review 18/8, 14 quyết định đã chốt |
| [`22-QC-FIGMA-MOI-02-09.md`](22-QC-FIGMA-MOI-02-09.md) | QC đối chiếu bản Figma mới 2/9 (mục A, B1–B10, C1–C5) |
| [`23-PROMPT-QC-MANUAL-04-09.md`](23-PROMPT-QC-MANUAL-04-09.md) · [`24-QC-04-09.md`](24-QC-04-09.md) | Quy trình + kết quả QC thủ công 4/9 |
| [`25-DONG-BO-TAI-LIEU-08-09.md`](25-DONG-BO-TAI-LIEU-08-09.md) | **Nhật ký đồng bộ tài liệu 8/9** + câu hỏi còn treo cho BA/Design |
| [`QC-02-09-2026.md`](QC-02-09-2026.md) · [`TONG-HOP-KIEM-DUYET.md`](TONG-HOP-KIEM-DUYET.md) | Biên bản QC/kiểm duyệt |

Ngoài `docs/`: [`../README.md`](../README.md) là hướng dẫn cài đặt/deploy nhanh, [`../CLAUDE.md`](../CLAUDE.md) là ghi chú cho AI/dev khi sửa code.

---

## C. Nguồn thô KHÔNG nằm trong git (ở Drive của team)

Repo chỉ track **bản đã xử lý**. Sáu file dưới đây là nguồn gốc nặng 28MB, đã gỡ khỏi git
(kể cả lịch sử) ngày 8/9 và `.gitignore` chặn không cho lọt lại — xin ở Drive của team
Design/BA khi cần đối chiếu.

| File nguồn | Nặng | Bản thay thế đang có trong repo |
|---|---|---|
| `lp/LandingpageFCM.fig` | 730MB | `lp/figma-frame-7217-1990.txt` (dump) + `scripts/figma/` để đọc lại |
| `lp/Landing page*.png` | 8.7MB/tấm | `lp/export-02-09/*.webp` (1440px, ~430KB) |
| `lp/Khu phố 2 1.png` | 14MB | `public/brand/kv-khu-pho.webp` (372KB) |
| `lp/123123 1.png` | 2.4MB | `public/brand/plaza.webp` (232KB) |
| `lp/06 1.png` | 1.1MB | `public/brand/signpost.webp` (44KB) |
| `lp/font_FPT_songvui.zip` | — | `public/fonts/FPTSongVui-*.woff2` (6 face) |
| `dieuchinh.1.8.xlsx` | 4.8MB | Đã áp vào `src/lib/copy.ts`, `db/migrations/002_*.sql`, CLAUDE.md §"Điều chỉnh 1/8" |
| `khupho_dieuchinh_28_7.xlsx` | 1.0MB | Đã áp vào `src/lib/copy.ts` + [`06-CONTENT-COPY.md`](06-CONTENT-COPY.md) |
| `admin/admin_v1.pdf` | 4.2MB | Đã áp vào [`21-KE-HOACH-DIEU-CHINH-18-8.md`](21-KE-HOACH-DIEU-CHINH-18-8.md) |

Còn track (nhỏ, cần để đối chiếu số đo): `lp/Frame 151.png`, `lp/Group 4.png`,
`lp/vuesax/`, `lp/export-02-09/`, `lp/figma-frame-7217-1990.txt`, `import-template.xlsx`.

---

## Tra nhanh

| Câu hỏi | Xem |
|---|---|
| Điểm tính thế nào? | [15](15-DIEM-XEP-HANG-CHONG-GIAN-LAN.md) §1 · [`src/lib/scoring.ts`](../src/lib/scoring.ts) |
| SĐT được lưu ở đâu, dạng gì? | [14](14-BAO-MAT-VA-QUYEN-RIENG-TU.md) §2 |
| Vì sao câu nhắc chưa hiện công khai? | [12](12-DATA-DICTIONARY.md) §4 (state machine) |
| API nào cần CSRF? | [13](13-API-REFERENCE.md) §1 |
| Deploy production ra sao? | [18](18-TRIEN-KHAI-VAN-HANH.md) §3 (mode B — đang chạy thật) · §4 (mode A) |
| Duyệt 4N thế nào cho đúng? | [17](17-VAN-HANH-ADMIN.md) §3 |
| Vì sao khu phố biến mất khỏi web? | [12](12-DATA-DICTIONARY.md) §4.1b (xoá mềm) · [17](17-VAN-HANH-ADMIN.md) §5.3 |
| Slider hero lấy khu nào, xếp thế nào? | [12](12-DATA-DICTIONARY.md) §2.1b (10 slot) · [16](16-FRONTEND-UI.md) §4 |
| Bình chọn có rút lại được không? | **Không** — [13](13-API-REFERENCE.md) §2.9 (quyết định Q6) |
| Nguồn design chuẩn ở đâu, đọc bằng gì? | [16](16-FRONTEND-UI.md) đầu file (`docs/lp/LandingpageFCM.fig` + `scripts/figma/`) |
| Mất `PHONE_PEPPER` thì sao? | [14](14-BAO-MAT-VA-QUYEN-RIENG-TU.md) §7 (**không khôi phục được**) |
