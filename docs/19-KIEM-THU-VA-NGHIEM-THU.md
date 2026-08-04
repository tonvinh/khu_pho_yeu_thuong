# 19 — Kiểm thử & nghiệm thu

> Definition of Done chính thức nằm ở cuối `CLAUDE.md`. Tài liệu này biến nó thành checklist thực thi được.

## 1. Kiểm thử tự động

```bash
pnpm test          # vitest run — phải xanh trước khi merge
pnpm build         # build + typecheck (TypeScript strict)
```

| File | Phủ gì | Vì sao bắt buộc |
|---|---|---|
| `tests/scoring.test.ts` | 3 test case điểm của `05-SCORING-RULES` §4 (81 / 87 / 45), event bị vô hiệu không tính, trần 3 đề xuất/tuần | Quy tắc cứng 4 — sai điểm là sai kết quả trao giải |
| `tests/four-n.test.ts` | `passes4N()`: đủ 4 ô mới true; thiếu bất kỳ ô nào, null, undefined đều false. Fixtures câu chuẩn ≤120 ký tự | Quy tắc cứng 2 — chốt chặn duyệt nội dung |
| `tests/phone.test.ts` | `normalizePhone` (5 dạng nhập), từ chối đầu số sai, `looksFake`, `maskPhone`, `redactPhonesInText` | Quy tắc cứng 3b — bảo vệ SĐT |

**Khoảng trống đã biết:** chưa có test tích hợp cho route handler (cần DB thật) và chưa có E2E tự động. Toàn bộ luồng nghiệp vụ hiện được nghiệm thu **thủ công** theo §2. Xem [`20`](20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md) §3.

Khi thêm test mới: `tests/**/*.test.ts`, alias `@` → `src` đã cấu hình trong `vitest.config.ts`. Ưu tiên test cho module thuần (`scoring`, `phone`, `taxonomy`) vì không cần DB.

---

## 2. Kịch bản E2E thủ công (chạy trước mỗi release)

Chuẩn bị: DB sạch → `pnpm migrate && pnpm seed`, hoặc môi trường staging.

### E2E-1 · Luồng xương sống (bắt buộc)

| # | Thao tác | Kỳ vọng |
|---|---|---|
| 1 | Mở trang chủ ẩn danh | Thấy bản đồ, pin, danh sách góc xóm, bảng xếp hạng. **Không** bị hỏi SĐT |
| 2 | Bấm "Gửi lời nhắc cho xóm mình" | Hiện modal định danh (chưa có phiên) |
| 3 | Nhập SĐT + tên + khu phố | Vào thẳng form đề xuất đang chờ; góc trên hiện "Chào {tên} 👋" |
| 4 | Gửi đề xuất | Toast "…đã vào danh sách chờ duyệt"; **trang chủ chưa hiện đề xuất này** |
| 5 | Admin `/admin/khu-pho?tab=de-xuat` → Duyệt | Góc xóm hiện công khai, pill "Đang chờ"; `/admin/diem` có event +2 cho người đề xuất |
| 6 | Cư dân mở drawer góc xóm, viết câu ≤120 ký tự, gửi | Toast "vào hàng chờ duyệt"; **câu chưa hiện trong danh sách** |
| 7 | Admin `/admin/loi-nhac`: tick 3/4 ô | Nút "Duyệt hiển thị" **vẫn disabled** |
| 8 | Tick đủ 4 ô → Duyệt | Câu hiện công khai, mở bình chọn; pill góc xóm đổi "Đang bình chọn"; tác giả +5đ |
| 9 | Cư dân **khác** bấm "Thương" | Số tăng ngay (optimistic), tác giả +1đ |
| 10 | Chính tác giả bấm "Thương" câu mình | Ô hiển thị "câu của bạn", **không bấm được** (gọi API trực tiếp → 409) |
| 11 | Admin `/admin/loi-nhac?tab=bien`: chọn câu cao phiếu nhất | Chuyển "Đã chọn", không cần lý do |
| 12 | Admin chọn câu **không** cao phiếu nhất | Bắt buộc nhập lý do mới cho chọn |
| 13 | Đưa sản xuất → upload ảnh biển → "Đã treo biển" | Pin **xanh**, counter "biển đã treo" +1, tác giả +30đ |
| 14 | Cư dân tác giả tải lại trang chủ | Hiện **banner báo tin vui in-web** kèm nút Chia sẻ. **Không có SMS nào được gửi** |
| 15 | Bấm Chia sẻ → `/bien/{id}` | Hiện câu, tác giả, địa điểm, ảnh biển; OG preview đúng |
| 16 | Treo đủ 100% biển của khu → admin cấp chứng nhận | Nút "Cấp chứng nhận 4N" xuất hiện; cấp xong khu phố có 🏅, trang `/khu-pho/{slug}` hiện huy hiệu |

### E2E-2 · Bảo mật & quyền riêng tư

| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | Mở DevTools → Application → Cookies | Chỉ có `kp_session` (HttpOnly), `kp_csrf` (đọc được). **Không có SĐT ở đâu** |
| 2 | Xem toàn bộ response mạng của trang chủ | Không có `phone`, `phone_hash`, `phone_encrypted` |
| 3 | Gọi POST bất kỳ **không** kèm header `x-csrf-token` | 403 |
| 4 | Gọi API ghi khi chưa định danh | 401 |
| 5 | Truy cập `/api/img/private/maps/…/original.webp` | **404** |
| 6 | Truy cập `/admin/…` khi chưa đăng nhập | Chuyển hướng `/admin/login`; gọi thẳng API admin → 401 |
| 7 | Đăng nhập admin bằng email không phải `@fpt.com` (kể cả nếu tồn tại trong DB) | 401, thông báo chung chung |
| 8 | Sai mật khẩu 5 lần | Lần thứ 6 trả **423** (khoá 15 phút) |
| 9 | `curl -s https://…/robots.txt` | Disallow `/admin` và `/api` |
| 10 | `curl -I https://…` | Có HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy |
| 11 | Bấm hiện SĐT ở `/admin/leads`, rồi query `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5` | Có dòng `lead_phone_reveal` |
| 12 | Export CSV leads → kiểm audit_logs | Có dòng `leads_export_csv` kèm `{"count": n}` |

### E2E-3 · Lead & opt-in

| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | Mở khối "Ưu đãi cư dân" | Checkbox opt-in **mặc định KHÔNG tick** |
| 2 | Điền form, không tick, bấm gửi | Bị chặn ở client; gọi thẳng API → 400. **Không có bản ghi lead nào** |
| 3 | Tick rồi gửi | Thẻ cảm ơn 🧧; `/admin/leads` có bản ghi `Tầng 2`, SĐT hiển thị `090***567` |
| 4 | Trong drawer viết câu: tick opt-in tầng 1 | Lead `Tầng 1 (drawer)` được tạo mà **không hỏi lại SĐT** |
| 5 | Gửi lead với SĐT **khác** số đã định danh | 409 + hộp xác nhận "Tiếp tục với số mới"; xác nhận → cấp phiên mới, dữ liệu 2 tài khoản không gộp |

### E2E-4 · Chống gian lận

| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | Cùng tài khoản bấm "Thương" 2 lần cho một câu | Lần 2 là **bỏ thương** (toggle), không tạo phiếu thứ hai |
| 2 | Shadow-ban một tài khoản rồi để tài khoản đó bấm thương | UI người đó **không đổi gì**; số lượt thương công khai **không tăng**; không sinh điểm |
| 3 | `/admin/gian-lan` sau khi chạy `pnpm seed:admin-demo` | Đủ 3 nhóm cảnh báo có dữ liệu |
| 4 | Bấm "Vô hiệu phiếu" | Số thương của các câu liên quan giảm; `/admin/diem` hiện event gạch ngang |
| 5 | Đề xuất và duyệt 4 đề xuất trong cùng tuần cho một người | Đề xuất thứ 4 vẫn hiện công khai nhưng event ghi **+0đ** |

### E2E-5 · Bản đồ, ảnh, import

| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | Upload ảnh bản đồ ở `/admin/khu-pho/{id}/ban-do` | Hiện **bản cách điệu** (duotone kem–đỏ gạch), không phải ảnh gốc |
| 2 | Public xem bản đồ | Chỉ thấy bản cách điệu |
| 3 | Đặt pin bằng click | Toạ độ báo theo % ; tải lại trang pin vẫn đúng chỗ |
| 4 | Upload file >10MB hoặc định dạng lạ | Bị từ chối với thông báo rõ ràng |
| 5 | Import `import-template.xlsx` có 1 dòng lỗi, bấm Commit | **422**, không bản ghi nào được ghi |
| 6 | Sửa hết lỗi → Validate → Commit | Ghi đủ khu phố + vấn đề trong một lần; vấn đề ở trạng thái "Đang chờ" |

### E2E-6 · Giao diện & hiệu năng

| # | Kiểm tra | Kỳ vọng |
|---|---|---|
| 1 | Thu trình duyệt còn **360px** | Không vỡ layout, không tràn ngang, mọi nút bấm được |
| 2 | Lighthouse trang chủ (mobile) | **LCP < 2.5s** |
| 3 | Bật "Reduce motion" trong OS | Biển ngừng đung đưa, drawer không animate |
| 4 | Mở drawer, nhấn Esc | Drawer đóng |
| 5 | Ngắt mạng rồi chờ 20s (chu kỳ polling) | Dữ liệu cũ giữ nguyên, không màn hình trắng, không toast lỗi liên tục |
| 6 | Kiểm 3 link share bằng Facebook Sharing Debugger + Zalo debugger | Ảnh OG 1200×630 hiện đúng, tiêu đề/mô tả tiếng Việt đúng dấu |

---

## 3. Nghiệm thu theo 11 quy tắc cứng

| # | Quy tắc | Cách chứng minh |
|---|---|---|
| 1 | Không công khai trước duyệt | E2E-1 bước 4, 6 |
| 2 | Không chấm 4N tự động | E2E-1 bước 7–8 + `tests/four-n.test.ts` |
| 3 | Định danh không OTP, 1 phiếu/câu, cấm tự thương, lọc im lặng | E2E-1 bước 3, 10 · E2E-4 bước 1, 2 |
| 3b | Bảo mật SĐT | Toàn bộ E2E-2 |
| 4 | Sổ cái append-only + trần tuần | `tests/scoring.test.ts` · E2E-4 bước 5 · màn `/admin/diem` |
| 5 | Lead chỉ khi opt-in | E2E-3 bước 1–3 |
| 6 | Copy nguyên văn | So `src/lib/copy.ts` với `06-CONTENT-COPY.md` §2 (và bản duyệt 28/7) |
| 7 | `/admin` chặn index + đăng nhập chuẩn | E2E-2 bước 6–9 |
| 8 | Không SMS | Rà toàn repo: không có SDK/nhà cung cấp SMS nào. E2E-1 bước 14 |
| 9 | `basePath` bằng env | Build thử với `BASE_PATH=/khu-pho-de-thuong` → mọi link/asset/OG vẫn đúng |
| 10 | Bản đồ gốc chỉ admin, pin theo % | E2E-5 bước 1–3 · E2E-2 bước 5 |
| 11 | Toàn bộ infra Docker, chỉ proxy mở port | `docker compose up -d` từ máy sạch chỉ với Docker + `.env`; `docker compose ps` xác nhận chỉ `proxy` publish port |

## 4. Definition of Done (bản checklist)

- [ ] Chạy được end-to-end: đề xuất → duyệt → viết câu → thương → duyệt 4N → chọn câu → installed → pin xanh + counter + +30đ + banner in-web.
- [ ] Bulk import 20 khu phố từ `import-template.xlsx` trọn trong 1 lần (validate → preview → commit all-or-nothing).
- [ ] Upload ảnh bản đồ → bản cách điệu + đặt pin bằng click hoạt động; bấm pin hiện ảnh thật địa điểm.
- [ ] Share URL + OG image đúng cho Đại sứ / biển đã treo / chứng nhận khu phố (test Facebook & Zalo debugger).
- [ ] `docker compose up -d` từ máy sạch (chỉ Docker + `.env`) dựng được toàn hệ thống; không service nào ngoài `proxy` mở port.
- [ ] Seed data tái hiện đúng các màn hình trong design.
- [ ] 3 test case điểm pass. Test 4N pass.
- [ ] Mobile 360px không vỡ layout; LCP trang chủ < 2.5s.

## 5. Quy trình trước khi merge / release

```bash
pnpm test          # bắt buộc xanh
pnpm build         # bắt buộc xanh (typecheck)
```

- [ ] Đã chạy đủ E2E-1 (luồng xương sống) trên môi trường dev/staging.
- [ ] Nếu chạm auth/SĐT/điểm → chạy thêm E2E-2 và/hoặc E2E-4, và soát checklist review ở [`14`](14-BAO-MAT-VA-QUYEN-RIENG-TU.md) §11.
- [ ] Nếu đổi schema → có file migration mới (không sửa `001_init.sql`), đã cập nhật [`12-DATA-DICTIONARY.md`](12-DATA-DICTIONARY.md).
- [ ] Nếu đổi API → đã cập nhật [`13-API-REFERENCE.md`](13-API-REFERENCE.md).
- [ ] Nếu đổi copy → đã có duyệt của PM và cập nhật `06-CONTENT-COPY.md`.
