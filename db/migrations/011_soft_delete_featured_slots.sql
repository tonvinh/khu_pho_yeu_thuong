-- 011 (7/9): xoá mềm khu phố + chốt 10 slot slider hero
--
-- * deleted_at: admin xoá khu phố ở /admin/khu-pho → chỉ đánh dấu, KHÔNG xoá dòng
--   (issues/suggestions/votes/điểm của khu đó vẫn nguyên vẹn để khôi phục được).
--   Mọi truy vấn công khai lọc `deleted_at IS NULL` — cả cụm khu phố + góc phố +
--   câu nhắc biến mất khỏi web, trang share /khu-pho/<slug> trả 404.
-- * featured_position giờ là VỊ TRÍ SLIDE ở hero, chỉ còn 10 slot (1..10) và
--   KHÔNG được trùng nhau. Dữ liệu cũ tự do (screenshot QC có 2 khu cùng vị trí 1)
--   nên đánh số lại theo thứ tự đang hiển thị; khu thứ 11 trở đi bỏ vị trí.

ALTER TABLE neighborhoods ADD COLUMN deleted_at timestamptz;

-- Đánh số lại 1..10 cho khu đang tiêu biểu, giữ nguyên thứ tự đang thấy ở trang chủ
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY featured_position NULLS LAST, name) AS rn
  FROM neighborhoods WHERE is_featured
)
UPDATE neighborhoods n SET featured_position = CASE WHEN r.rn <= 10 THEN r.rn::int ELSE NULL END
FROM ranked r WHERE r.id = n.id;

UPDATE neighborhoods SET featured_position = NULL WHERE NOT is_featured;

ALTER TABLE neighborhoods DROP CONSTRAINT IF EXISTS neighborhoods_featured_position_check;
ALTER TABLE neighborhoods ADD CONSTRAINT neighborhoods_featured_position_check
  CHECK (featured_position IS NULL OR (featured_position >= 1 AND featured_position <= 10));

-- Một slot chỉ chứa một khu phố (khu đã xoá mềm không giữ chỗ)
CREATE UNIQUE INDEX neighborhoods_featured_position_uniq
  ON neighborhoods (featured_position)
  WHERE featured_position IS NOT NULL AND deleted_at IS NULL;
