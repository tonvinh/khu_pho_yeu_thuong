-- Điều chỉnh 1/8 (docs/dieuchinh.1.8.xlsx — sheet ACTION LIST)
-- #2: danh mục loại vấn đề → ĐÚNG 6 chủ đề
-- #11: cho phép TỰ NHẬP phường (free text) → khu phố do dân tạo ẩn tới khi admin duyệt

-- ===== Remap 8 loại cũ → 6 chủ đề mới =====
ALTER TABLE issues DROP CONSTRAINT issues_category_check;

UPDATE issues SET category = CASE category
  WHEN 'toc_do'         THEN 'tre_con_trong_xom'  -- nhắc chạy chậm vì trẻ nhỏ
  WHEN 'an_toan_tre_em' THEN 'tre_con_trong_xom'
  WHEN 'trom_cap'       THEN 'giup_do_san_se'     -- thấy lạ báo nhau
  WHEN 'phong_chay'     THEN 'giup_do_san_se'     -- hô hoán khi cháy
  WHEN 'giup_nhau'      THEN 'giup_do_san_se'
  WHEN 'chieu_sang'     THEN 'van_minh_tu_te'     -- treo đèn trước hiên tối
  WHEN 'nguoi_gia'      THEN 'van_minh_tu_te'     -- chào hỏi, giúp người lớn tuổi
  WHEN 've_sinh'        THEN 'xom_xanh_sach'
  ELSE category
END
WHERE category IN ('toc_do','an_toan_tre_em','trom_cap','phong_chay','giup_nhau',
                   'chieu_sang','nguoi_gia','ve_sinh');

ALTER TABLE issues ADD CONSTRAINT issues_category_check CHECK (category IN
  ('khoe_moi_ngay','tre_con_trong_xom','van_minh_tu_te','giup_do_san_se',
   'xom_xanh_sach','song_vui_co_ich'));

-- ===== Khu phố tự nhập (free text) =====
-- Dân gõ tên phường chưa có trong danh sách → tạo bản ghi ẩn; admin duyệt đề xuất
-- đầu tiên của khu phố đó thì khu phố hiện công khai.
ALTER TABLE neighborhoods ADD COLUMN hidden boolean NOT NULL DEFAULT false;
