-- 008: bảng site_content — module admin "Nội dung" (/admin/noi-dung) cho phép sửa
-- nội dung hiển thị trang chủ: hero (2 dòng tiêu đề + mô tả), khu "Câu chuyện chiến
-- dịch" (tiêu đề, mô tả, video YouTube, ảnh KV) và khối ưu đãi (tiêu đề, mô tả, dòng
-- cam kết bảo mật SĐT). CHỈ lưu giá trị GHI ĐÈ — key vắng mặt → dùng mặc định trong
-- src/lib/site-content.ts (đồng bộ copy.ts), nên xoá row = quay về nội dung gốc.
CREATE TABLE site_content (
  key        varchar(50) PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
