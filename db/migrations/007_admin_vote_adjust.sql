-- 007: trang admin "Theo dõi thương" — cho phép admin điều chỉnh số lượt thương.
-- Phiếu điều chỉnh là bản ghi votes thật: user_id NULL, source='admin' — nhờ vậy mọi
-- query đếm votes hiện có (trang chủ, leaderboard, OG image, dashboard) không phải sửa.
-- UNIQUE (suggestion_id, user_id) không chặn nhiều phiếu admin vì NULL ≠ NULL trong Postgres.
ALTER TABLE votes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE votes ADD COLUMN source varchar(10) NOT NULL DEFAULT 'user'
  CHECK (source IN ('user','admin'));
ALTER TABLE votes ADD CONSTRAINT votes_user_id_required
  CHECK (source = 'admin' OR user_id IS NOT NULL);
