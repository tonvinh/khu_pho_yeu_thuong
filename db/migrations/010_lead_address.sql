-- 010 — Điều chỉnh 18/8 (docs/21-KE-HOACH-DIEU-CHINH-18-8.md)
-- Khối ưu đãi trên trang chủ đổi ô free text "Bạn đang ở khu phố nào?" thành
-- TỈNH THÀNH (chọn từ danh mục chính quy) + ĐỊA CHỈ, nên leads cần 2 cột riêng.
-- Giữ nguyên neighborhood_text của các bản ghi cũ (không migrate ngược để khỏi đoán sai).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS province varchar(120);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address varchar(300);

-- Sale chia vùng → lọc theo tỉnh là truy vấn thường dùng nhất ở /admin/leads
CREATE INDEX IF NOT EXISTS idx_leads_province ON leads (province) WHERE opted_in;
