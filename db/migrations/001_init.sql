-- Khu Phố Của Tôi — schema khởi tạo (03-DATA-MODEL)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== neighborhoods (khu phố) =====
CREATE TABLE neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL UNIQUE,
  ward varchar(120),
  district varchar(120),
  city varchar(120),
  slug varchar(120) NOT NULL UNIQUE,
  map_image_key varchar(500),          -- ảnh bản đồ GỐC (chỉ admin thấy — Q3)
  map_stylized_key varchar(500),       -- bản cách điệu render sẵn (public)
  certified_4n boolean NOT NULL DEFAULT false,
  certified_at date,
  photo_key varchar(500),              -- ảnh chứng nhận khu phố
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== users (chỉ cư dân — admin ở bảng riêng) =====
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash char(64) NOT NULL UNIQUE,      -- HMAC-SHA256(SĐT chuẩn hoá, PEPPER)
  phone_encrypted bytea,                    -- AES-256-GCM, chỉ khi lead opt-in
  phone_purpose text[] NOT NULL DEFAULT '{}',
  display_name varchar(120) NOT NULL,
  share_slug varchar(32) NOT NULL UNIQUE,   -- slug ngẫu nhiên cho URL share /dai-su/{slug}
  neighborhood_id uuid REFERENCES neighborhoods(id),
  role varchar(20) NOT NULL DEFAULT 'resident',
  is_shadow_banned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

-- ===== issues (vấn đề / điểm nóng) =====
CREATE TABLE issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood_id uuid NOT NULL REFERENCES neighborhoods(id),
  category varchar(30) NOT NULL CHECK (category IN
    ('toc_do','trom_cap','an_toan_tre_em','chieu_sang','ve_sinh','phong_chay','giup_nhau','nguoi_gia')),
  location_text varchar(300) NOT NULL,
  description text,
  pin_x real CHECK (pin_x >= 0 AND pin_x <= 100),
  pin_y real CHECK (pin_y >= 0 AND pin_y <= 100),
  photo_key varchar(500),              -- ảnh thật của địa điểm (hiện khi bấm pin)
  status varchar(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN
    ('pending_review','waiting','voting','signed','rejected')),
  proposed_by uuid REFERENCES users(id),
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  signed_at timestamptz
);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_neighborhood ON issues(neighborhood_id);

-- ===== suggestions (câu nhắc) =====
CREATE TABLE suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES issues(id),
  author_id uuid NOT NULL REFERENCES users(id),
  content text NOT NULL CHECK (char_length(content) <= 120),
  review_4n jsonb,                     -- {nhac,nho,nho2,nhe} — admin tick thủ công (Q2)
  sign_photo_key varchar(500),         -- ảnh biển thật sau khi treo
  installed_date date,
  status varchar(20) NOT NULL DEFAULT 'submitted' CHECK (status IN
    ('submitted','approved','rejected','selected','produced','installed')),
  review_note text,
  select_note text,                    -- lý do khi admin chọn câu không cao phiếu nhất
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  installed_at timestamptz
);
CREATE INDEX idx_suggestions_issue ON suggestions(issue_id);
CREATE INDEX idx_suggestions_status ON suggestions(status);

-- ===== votes (lượt thương) =====
CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES suggestions(id),
  user_id uuid NOT NULL REFERENCES users(id),
  is_valid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, user_id)
);
CREATE INDEX idx_votes_suggestion ON votes(suggestion_id) WHERE is_valid;

-- ===== leads =====
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200),
  phone_encrypted bytea NOT NULL,      -- SĐT mã hoá AES-256-GCM (không lưu bản rõ)
  phone_masked varchar(20) NOT NULL,   -- dạng che 090***123 hiển thị mặc định
  phone_hash char(64) NOT NULL,
  neighborhood_text varchar(300),
  interests text[] NOT NULL DEFAULT '{}',
  source varchar(20) NOT NULL CHECK (source IN ('soft_drawer','active_section')),
  opted_in boolean NOT NULL DEFAULT false,
  user_id uuid REFERENCES users(id),
  status varchar(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted','closed')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== score_events (sổ cái điểm — append-only) =====
CREATE TABLE score_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  type varchar(30) NOT NULL CHECK (type IN
    ('issue_approved','suggestion_approved','vote_received','sign_installed')),
  points int NOT NULL,
  ref_id uuid,
  is_valid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_score_events_user ON score_events(user_id) WHERE is_valid;
CREATE INDEX idx_score_events_ref ON score_events(ref_id);

-- ===== sessions (cookie định danh public) =====
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  token_hash char(64) NOT NULL UNIQUE,  -- SHA-256(token 256-bit); bản rõ chỉ trong cookie
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  ip_hash char(64),
  ua_hash char(64),
  -- ASSUMPTION (đã báo PM): SĐT mã hoá AES-GCM gắn với phiên, CHỈ để tạo lead tầng 1
  -- khi user tick opt-in mà "không hỏi lại SĐT" (02 §7.1) — hash một chiều không khôi
  -- phục được SĐT. Không bao giờ trả về client; users.phone_encrypted vẫn NULL tới khi opt-in.
  phone_encrypted bytea
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ===== admin_users (tách hẳn khỏi users) =====
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(200) NOT NULL UNIQUE CHECK (email ~* '@fpt\.com$'),
  password_hash varchar(300) NOT NULL,  -- Argon2id
  totp_secret varchar(300),             -- null = chưa bật 2FA
  backup_codes_hash text[] NOT NULL DEFAULT '{}',
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id),
  token_hash char(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,      -- TTL 8h, không gia hạn
  revoked boolean NOT NULL DEFAULT false,
  ip_hash char(64)
);

-- ===== notifications (báo tin vui in-web — thay SMS, Q1) =====
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  type varchar(30) NOT NULL DEFAULT 'sign_installed',
  ref_id uuid,
  payload jsonb NOT NULL DEFAULT '{}',  -- {location_text, content, sign_id}
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unseen ON notifications(user_id) WHERE NOT seen;

-- ===== audit log (xem SĐT lead, export CSV — PDPD) =====
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES admin_users(id),
  action varchar(50) NOT NULL,          -- lead_phone_reveal | leads_export_csv | ...
  ref_id uuid,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== monthly snapshots (chốt kỳ "Khu phố tử tế nhất tháng") =====
CREATE TABLE month_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month varchar(7) NOT NULL UNIQUE,     -- '2026-09'
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
