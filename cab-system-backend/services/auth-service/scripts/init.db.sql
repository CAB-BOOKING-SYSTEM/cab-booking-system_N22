-- Execute:
-- psql -h <host> -U <user> -d <database> -f scripts/init.db.sql

CREATE TABLE IF NOT EXISTS auth_users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) UNIQUE,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'customer',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  provider VARCHAR(50) DEFAULT 'email',
  avatar_url TEXT,
  driver_id VARCHAR(50) UNIQUE,
  driver_status VARCHAR(20),
  email_verified BOOLEAN DEFAULT FALSE,
  failed_login_count INT DEFAULT 0,
  locked_until TIMESTAMP,
  last_login TIMESTAMP,
  last_activity TIMESTAMP,
  login_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT auth_users_role_ck
    CHECK (role IN ('customer', 'driver', 'admin')),
  CONSTRAINT auth_users_status_ck
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED', 'LOCKED', 'PENDING_VERIFICATION')),
  CONSTRAINT auth_users_driver_status_ck
    CHECK (driver_status IS NULL OR driver_status IN ('ONLINE', 'OFFLINE', 'BUSY')),
  CONSTRAINT auth_users_driver_role_ck
    CHECK ((role = 'driver' AND driver_id IS NOT NULL) OR role <> 'driver')
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) UNIQUE,
  device_info JSONB,
  device_fingerprint VARCHAR(255),
  ip_address INET,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER,
  event_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  reason VARCHAR(255),
  ip_address INET,
  user_agent VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  refresh_token_hash VARCHAR(255),
  ip_address INET,
  user_agent VARCHAR(500),
  device_fingerprint VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  ended_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS token_blacklist (
  id BIGSERIAL PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  token_type VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_users_phone ON auth_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_status ON auth_users(status);
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role);
CREATE INDEX IF NOT EXISTS idx_auth_users_driver_id ON auth_users(driver_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id ON refresh_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type ON auth_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);

INSERT INTO auth_users (
  full_name,
  phone_number,
  email,
  password_hash,
  role,
  status,
  driver_id,
  driver_status,
  email_verified
) VALUES
('Admin System', '0900000000', 'admin@cab.com', '$2a$12$MU7n4P5j76iA4rBLMTE7vOgM2Rjznh8A1G2M4us7l9j0xF0PBnTTe', 'admin', 'ACTIVE', NULL, NULL, TRUE),
('Driver Test', '0900000001', 'driver@cab.com', '$2a$12$MU7n4P5j76iA4rBLMTE7vOgM2Rjznh8A1G2M4us7l9j0xF0PBnTTe', 'driver', 'ACTIVE', 'DRV001', 'ONLINE', TRUE),
('Customer Test', '0900000002', 'customer@cab.com', '$2a$12$MU7n4P5j76iA4rBLMTE7vOgM2Rjznh8A1G2M4us7l9j0xF0PBnTTe', 'customer', 'ACTIVE', NULL, NULL, TRUE)
ON CONFLICT (email) DO NOTHING;
