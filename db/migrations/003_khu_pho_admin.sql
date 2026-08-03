-- Điều chỉnh quản lý khu phố (yêu cầu 3/8):
-- * Địa lý hành chính MỚI (sau sáp nhập 7/2025): chỉ còn 2 cấp Tỉnh/Thành phố (cột city)
--   và Phường/Xã (cột ward) — BỎ cấp quận/huyện (cột district).
-- * Ảnh tổng quan khu phố: tối đa 4 ảnh, kích thước đồng nhất (server chuẩn hoá 1280×720)
--   → bảng riêng neighborhood_photos; neighborhoods.photo_key cũ chuyển thành ảnh vị trí 1.
-- * is_featured: hiện ở block "Khu phố tiêu biểu" đầu trang chủ — chỉ có hiệu lực khi
--   khu phố đang hiển thị trên website (NOT hidden); API chịu trách nhiệm ràng buộc.
-- * certificate_photo_key: ảnh chứng nhận đạt chuẩn 4N (tối đa 1) — chỉ khi certified_4n.

-- ===== Bỏ cấp quận/huyện =====
ALTER TABLE neighborhoods DROP COLUMN district;

-- ===== Trạng thái "Khu phố tiêu biểu" (block đầu trang chủ) =====
ALTER TABLE neighborhoods ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
-- Dữ liệu cũ: khu đang hiển thị coi như tiêu biểu để trang chủ không trống sau nâng cấp
UPDATE neighborhoods SET is_featured = true WHERE NOT hidden;

-- ===== Ảnh chứng nhận 4N (tối đa 1, phụ thuộc trạng thái chứng nhận) =====
ALTER TABLE neighborhoods ADD COLUMN certificate_photo_key varchar(500);
ALTER TABLE neighborhoods ADD CONSTRAINT neighborhoods_certificate_requires_4n
  CHECK (certificate_photo_key IS NULL OR certified_4n);

-- ===== Ảnh tổng quan khu phố (tối đa 4, kích thước đồng nhất) =====
CREATE TABLE neighborhood_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood_id uuid NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
  photo_key varchar(500) NOT NULL,
  position int NOT NULL CHECK (position BETWEEN 1 AND 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (neighborhood_id, position)
);
CREATE INDEX idx_neighborhood_photos_nb ON neighborhood_photos(neighborhood_id);

-- Ảnh khu phố cũ (photo_key) → ảnh tổng quan vị trí 1
INSERT INTO neighborhood_photos (neighborhood_id, photo_key, position)
SELECT id, photo_key, 1 FROM neighborhoods WHERE photo_key IS NOT NULL;
ALTER TABLE neighborhoods DROP COLUMN photo_key;
