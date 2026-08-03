-- Ảnh chứng nhận không còn phụ thuộc trạng thái đạt chuẩn 4N (yêu cầu 3/8):
-- admin được upload ảnh chứng nhận bất kỳ lúc nào (chuẩn bị trước khi cấp chuẩn),
-- thu hồi chứng nhận cũng KHÔNG xoá ảnh nữa.
ALTER TABLE neighborhoods DROP CONSTRAINT neighborhoods_certificate_requires_4n;
