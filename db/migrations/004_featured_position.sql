-- Làm lại trang quản lý khu phố dạng bảng (3/8):
-- thêm "vị trí hiển thị" trong block "Khu phố tiêu biểu" — số nhỏ đứng trước,
-- NULL = chưa xếp (đứng cuối, xếp theo tên). API chịu trách nhiệm ràng buộc
-- (chỉ khu đang tiêu biểu mới có vị trí; bỏ tiêu biểu → xoá vị trí).
ALTER TABLE neighborhoods ADD COLUMN featured_position int
  CHECK (featured_position IS NULL OR featured_position >= 1);

-- Khu đang tiêu biểu: gán vị trí ban đầu theo thứ tự tên để giữ đúng thứ tự hiện tại
UPDATE neighborhoods n SET featured_position = s.rn
FROM (SELECT id, row_number() OVER (ORDER BY name) AS rn
      FROM neighborhoods WHERE is_featured) s
WHERE n.id = s.id;
