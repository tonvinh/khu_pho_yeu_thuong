-- Biển bảng câu (yêu cầu 3/8): mỗi câu duyệt là bản ghi tự đứng được —
-- thuộc TRỰC TIẾP khu phố (tỉnh/thành + phường/xã lấy qua neighborhoods) và có
-- chủ đề riêng, không phải lần ngược qua issues; 1 hình duy nhất cho mỗi câu
-- (đổi tên sign_photo_key → image_key cho đúng nghĩa "hình của câu").

ALTER TABLE suggestions
  ADD COLUMN neighborhood_id uuid REFERENCES neighborhoods(id),
  ADD COLUMN category varchar(30);

-- Backfill từ issue hiện có
UPDATE suggestions s SET neighborhood_id = i.neighborhood_id, category = i.category
FROM issues i WHERE i.id = s.issue_id;

ALTER TABLE suggestions
  ALTER COLUMN neighborhood_id SET NOT NULL,
  ALTER COLUMN category SET NOT NULL,
  ADD CONSTRAINT suggestions_category_check CHECK (category IN
    ('khoe_moi_ngay','tre_con_trong_xom','van_minh_tu_te','giup_do_san_se',
     'xom_xanh_sach','song_vui_co_ich'));

ALTER TABLE suggestions RENAME COLUMN sign_photo_key TO image_key;

CREATE INDEX idx_suggestions_neighborhood ON suggestions(neighborhood_id);
CREATE INDEX idx_suggestions_category ON suggestions(category);

-- Các điểm INSERT hiện tại (v1 issues, v1 suggestions, seed) chỉ truyền issue_id:
-- trigger tự điền neighborhood_id/category từ issue (BEFORE INSERT chạy trước
-- kiểm tra NOT NULL nên insert cũ vẫn hợp lệ, không phải sửa từng câu INSERT).
CREATE FUNCTION suggestions_fill_from_issue() RETURNS trigger AS $$
BEGIN
  IF NEW.neighborhood_id IS NULL OR NEW.category IS NULL THEN
    SELECT COALESCE(NEW.neighborhood_id, i.neighborhood_id),
           COALESCE(NEW.category, i.category)
      INTO NEW.neighborhood_id, NEW.category
      FROM issues i WHERE i.id = NEW.issue_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_suggestions_fill_from_issue
  BEFORE INSERT ON suggestions
  FOR EACH ROW EXECUTE FUNCTION suggestions_fill_from_issue();
