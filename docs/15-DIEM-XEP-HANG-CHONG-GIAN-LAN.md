# 15 — Điểm, bảng xếp hạng & chống gian lận

> Công thức gốc: `05-SCORING-RULES.md` (KHÔNG tự chế trọng số). Cài đặt: `src/lib/scoring.ts`, `src/lib/score-service.ts`, `src/lib/leaderboard.ts`.

## 1. Công thức điểm

```
ĐIỂM = 2 × (đề xuất được duyệt)
     + 5 × (câu nhắc đạt 4N được duyệt)
     + 1 × (lượt thương nhận được)
     + 30 × (câu của mình được treo lên biển)
```

```ts
// src/lib/scoring.ts — nguồn sự thật duy nhất về trọng số
export const POINTS = {
  issue_approved:      2,
  suggestion_approved: 5,
  vote_received:       1,
  sign_installed:     30,
} as const;
export const WEEKLY_ISSUE_CAP = 3;
```

Điểm là **tổng các event hợp lệ**, tính lại mỗi lần đọc:

```sql
SELECT COALESCE(SUM(points), 0) FROM score_events WHERE user_id = $1 AND is_valid;
```

Không có cột "tổng điểm" ở bất cứ đâu — cố tình như vậy để không bao giờ lệch sổ.

## 2. Sổ cái append-only

| Nguyên tắc | Cài đặt |
|---|---|
| Chỉ thêm, không sửa/xoá | Không có code nào `UPDATE score_events SET points=…` hay `DELETE` |
| Thu hồi = vô hiệu | `invalidateScoreEvent()` đặt `is_valid=false` cho **đúng 1 event mới nhất** khớp `(user, type, ref_id)` |
| Điểm đóng băng tại thời điểm phát sinh | `points` lưu giá trị đã tính, kể cả `0` khi vượt trần tuần |
| Ghi tập trung | Mọi ghi điểm đi qua `recordScoreEvent(client, userId, type, refId)`, nhận `PoolClient` để nằm chung transaction với thay đổi trạng thái |

Ai được cộng điểm, khi nào:

| Sự kiện | Người nhận | Loại event | Nơi gọi |
|---|---|---|---|
| Admin duyệt đề xuất | `issues.proposed_by` | `issue_approved` (+2, có trần) | `PATCH /api/admin/issues/{id}` |
| Admin tick đủ 4N và duyệt câu | `suggestions.author_id` | `suggestion_approved` (+5) | `PATCH /api/admin/suggestions/{id}` action `approve` |
| Ai đó bấm "Thương" | **tác giả câu**, không phải người bấm | `vote_received` (+1) | `POST /api/v1/suggestions/{id}/vote` |
| Admin xác nhận đã treo biển | `suggestions.author_id` | `sign_installed` (+30) | `applyInstalledSideEffects()` |

Khi nào điểm bị vô hiệu:

| Sự kiện | Hiệu ứng |
|---|---|
| Người bấm thương **bỏ thương** | Xoá hàng `votes` + vô hiệu 1 event `vote_received` của tác giả |
| Admin bấm "Vô hiệu phiếu" của một tài khoản | Vô hiệu toàn bộ phiếu hợp lệ của tài khoản đó **và** đúng 1 event `vote_received` tương ứng mỗi phiếu |
| Người nhận điểm đang bị shadow-ban | Event mới ghi thẳng với `is_valid = false` (điểm cũ giữ nguyên) |
| Người bấm thương bị shadow-ban | Phiếu ghi `is_valid=false` và **không sinh event** nào |

Issue/câu bị **từ chối sau khi đã duyệt** hiện **không** tự thu hồi điểm — xem [`20`](20-QUYET-DINH-GIA-DINH-NO-KY-THUAT.md) §3.

## 3. Trần 3 đề xuất mỗi tuần

Chỉ áp cho `issue_approved` (chống spam đề xuất để cày điểm):

```sql
-- đếm số đề xuất ĐÃ TÍNH ĐIỂM trong tuần hiện tại
SELECT count(*) FROM score_events
WHERE user_id = $1 AND type = 'issue_approved' AND points > 0 AND is_valid
  AND date_trunc('week', created_at) = date_trunc('week', now());
```

- `date_trunc('week', …)` của Postgres = **tuần ISO, bắt đầu thứ Hai** — khớp yêu cầu "ISO week".
- Đạt 3 rồi thì đề xuất thứ 4 trở đi vẫn **được duyệt và hiện công khai bình thường**, chỉ ghi event `points = 0`.
- Mốc tính là **thời điểm admin duyệt**, không phải thời điểm người dân gửi.
- Các loại điểm khác **không có trần**.

## 4. Test bắt buộc pass (`tests/scoring.test.ts`)

Lấy nguyên từ `05-SCORING-RULES.md` §4:

| Nhân vật | Dữ liệu | Kỳ vọng |
|---|---|---|
| Cô Tám tạp hoá | 1 đề xuất + 3 câu + 34 thương + 1 biển | **81đ** |
| Anh Dũng | 0 đề xuất + 2 câu + 47 thương + 1 biển | **87đ** |
| Minh (lớp 11) | 2 đề xuất + 4 câu + 21 thương + 0 biển | **45đ** |

Cộng thêm: event `is_valid=false` không được tính; đề xuất 1–3 trong tuần được +2; đề xuất thứ 4 trở đi được 0; các loại khác không trần.

`pnpm test` phải xanh trước khi merge. Đổi trọng số mà không có duyệt của PM = vi phạm quy tắc cứng 4.

## 5. Bảng xếp hạng

### 5.1 "Cây bút của khu phố" (Đại sứ)

`getAmbassadors(10)` — điều kiện và thứ tự:

- Loại tài khoản `is_shadow_banned`.
- Loại người có tổng điểm ≤ 0.
- Sắp xếp `score DESC`, hoà thì **người tham gia sớm hơn xếp trên** (`users.created_at ASC`).
- Kèm `signs_installed` (số câu đã lên biển) và `votes_received` (tổng phiếu hợp lệ nhận được).
- API trả 10 dòng; giao diện trang chủ hiển thị **5** dòng đầu, mỗi dòng có link share `/dai-su/{share_slug}`.

### 5.2 "Khu phố dễ thương nhất tháng này"

```
month_score(khu phố) = Σ điểm hợp lệ của cư dân thuộc khu phố phát sinh TRONG THÁNG
                     + số biển mới treo trong khu phố TRONG THÁNG
```

Sắp xếp giảm dần theo `month_score`, hoà thì so số biển mới; lấy 1 khu phố. Tháng tính theo `date_trunc('month', now())` (giờ máy chủ). Hiển thị kèm số biển mới và số lượt thương trong tháng.

Bảng `month_snapshots` dùng để chốt kỳ đã có sẵn trong schema nhưng **chưa được code sử dụng** — hiện mọi thứ tính động.

### 5.3 Tiến độ chứng nhận khu phố

```
progress_pct = signed_issues / total_issues × 100
   total_issues  = issues status ∈ (waiting, voting, signed)   ← chỉ đếm vấn đề đã công khai
   signed_issues = issues status = signed
```

Cấp chứng nhận yêu cầu `total > 0` và `signed == total`. Vì mẫu số chỉ đếm vấn đề **đã duyệt**, một đề xuất mới được duyệt sẽ kéo tỉ lệ xuống — đúng ý đồ "hành trình chưa kết thúc".

## 6. Chống gian lận

### 6.1 Ba heuristic đang chạy (`GET /api/admin/fraud`)

| Cảnh báo | Truy vấn | Ngưỡng |
|---|---|---|
| **Cụm tài khoản cùng IP** | Nhóm `sessions.ip_hash` tạo trong 24h | ≥ 3 tài khoản khác nhau |
| **Nhận thương hàng loạt từ tài khoản mới** | Phiếu hợp lệ trong 48h từ người dùng tạo tài khoản < 48h | ≥ 10 phiếu về cùng một tác giả |
| **Tốc độ vote bất thường** | Phiếu của 1 tài khoản trong 1 giờ | ≥ 20 phiếu |

Mỗi nhóm trả tối đa 20 dòng, sắp xếp giảm dần theo mức nghiêm trọng. Đây là **gắn cờ để người xem xét**, không tự động phạt.

### 6.2 Ba hành động của admin (`POST /api/admin/fraud`)

| Hành động | Hiệu ứng kỹ thuật | Người dùng thấy gì |
|---|---|---|
| `shadow_ban` | `users.is_shadow_banned = true` | **Không gì cả.** Vẫn viết được, vẫn bấm thương được, UI y hệt. Nhưng phiếu mới `is_valid=false`, điểm mới `is_valid=false`, biến mất khỏi bảng xếp hạng và khỏi trang `/dai-su/{slug}` (404) |
| `unban` | Đặt lại `false` | Không gì cả |
| `invalidate_votes` | Vô hiệu mọi phiếu hợp lệ của tài khoản + đúng 1 event `vote_received` mỗi phiếu | Số lượt thương của các câu liên quan giảm |

**Nguyên tắc im lặng** (quy tắc cứng 3): không thông báo, không banner, không chặn thao tác, không đổi thông điệp lỗi. Người gian lận không được biết mình đã bị phát hiện.

### 6.3 Chốt chặn cứng ở tầng dữ liệu

Không phụ thuộc heuristic — luôn đúng:

| Ràng buộc | Nơi ép |
|---|---|
| 1 tài khoản = 1 phiếu / câu | `UNIQUE (suggestion_id, user_id)` trong DB |
| Không tự thương | Kiểm `author_id === user.id` trong transaction → 409 |
| Chỉ bình chọn câu đã duyệt | `WHERE status IN ('approved','selected','produced','installed') FOR UPDATE` |
| Câu ≤ 120 ký tự | `CHECK (char_length(content) <= 120)` + kiểm ở API + giới hạn ở textarea |
| 1 SĐT = 1 tài khoản | `UNIQUE users.phone_hash` |
| 30 hành động ghi / giờ | `requireUserWrite` |
| 3 định danh mới / (IP+UA) / giờ | `POST /api/v1/auth/identify` |

### 6.4 Đối soát khi trao giải

Màn **Sổ cái điểm** (`/admin/diem`) là công cụ giải trình:

1. Danh sách xếp theo điểm, **bao gồm cả tài khoản đã shadow-ban** (đánh dấu rõ).
2. Bấm vào một người → 500 event gần nhất, ghi rõ loại, số điểm, ngày; event bị vô hiệu hiển thị **gạch ngang**.
3. Đối chiếu với `GET /api/admin/fraud` trước khi chốt danh sách trao giải.

Quy trình đề xuất trước mỗi kỳ trao giải:

- [ ] Xem `/admin/gian-lan`, xử lý các cảnh báo còn tồn.
- [ ] Mở `/admin/diem`, kiểm tra top 10: điểm có đến từ nhiều nguồn khác nhau không, hay chỉ toàn `vote_received` trong vài giờ?
- [ ] Với trường hợp nghi ngờ: xem thời gian các phiếu (`created_at` sát nhau bất thường?) và tuổi tài khoản người bấm.
- [ ] Chốt xong mới công bố; nếu phải xử lý, dùng `invalidate_votes` **trước** khi chụp bảng xếp hạng.
