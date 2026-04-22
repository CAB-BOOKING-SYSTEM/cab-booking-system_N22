-- ============================================
-- ZERO TRUST AUTHENTICATION DATABASE SCHEMA
-- PostgreSQL
-- Version: 2.0 (Fixed & Complete)
-- ============================================

-- ============================================
-- 1. USERS TABLE (Core)
-- ============================================
CREATE TABLE auth_users (
  id                    SERIAL PRIMARY KEY,
  phone_number          VARCHAR(20)  UNIQUE,
  email                 VARCHAR(255) UNIQUE,
  password_hash         VARCHAR(255),

  -- OAuth
  google_id             VARCHAR(255) UNIQUE,
  facebook_id           VARCHAR(255) UNIQUE,
  provider              VARCHAR(50)  DEFAULT 'email'
    CHECK (provider IN ('email', 'google', 'facebook')),

  -- User Details
  first_name            VARCHAR(100),
  last_name             VARCHAR(100),
  avatar_url            TEXT,

  -- Status & Role
  role                  VARCHAR(50)  NOT NULL DEFAULT 'CUSTOMER'
    CHECK (role IN ('CUSTOMER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN')),
  status                VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'BANNED', 'SUSPENDED', 'PENDING_VERIFICATION')),

  -- Verification
  email_verified        BOOLEAN      DEFAULT FALSE,
  phone_verified        BOOLEAN      DEFAULT FALSE,
  email_verified_at     TIMESTAMP,
  phone_verified_at     TIMESTAMP,

  -- Metadata
  last_login            TIMESTAMP,
  last_activity         TIMESTAMP,
  login_count           INT          DEFAULT 0 CHECK (login_count >= 0),

  created_at            TIMESTAMP    DEFAULT NOW(),
  updated_at            TIMESTAMP    DEFAULT NOW(),
  deleted_at            TIMESTAMP    -- Soft delete
);

CREATE INDEX idx_auth_users_phone      ON auth_users(phone_number);
CREATE INDEX idx_auth_users_email      ON auth_users(email);
CREATE INDEX idx_auth_users_google_id  ON auth_users(google_id);
CREATE INDEX idx_auth_users_status     ON auth_users(status);
CREATE INDEX idx_auth_users_role       ON auth_users(role);
-- Partial index: active users only (most common query path)
CREATE INDEX idx_auth_users_active     ON auth_users(email)
  WHERE deleted_at IS NULL AND status = 'ACTIVE';

---

-- ============================================
-- 2. REFRESH TOKENS TABLE
-- Stores hashed refresh tokens for persistence/audit.
-- Redis is used for fast lookup (key: refresh:<user_id>).
-- When /refresh is called:
--   1. Verify token against Redis
--   2. Mark old row here as revoked
--   3. Insert new row
-- This table enables multi-device session management.
-- ============================================
CREATE TABLE refresh_tokens (
  id                    SERIAL PRIMARY KEY,
  user_id               INT          NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,

  -- SHA-256 hash of the actual token (never store plaintext)
  token_hash            VARCHAR(64)  NOT NULL,

  -- Device & Session tracking
  session_id            VARCHAR(255) UNIQUE,
  device_info           JSONB,
  device_fingerprint    VARCHAR(255),
  ip_address            INET,

  -- Lifecycle
  expires_at            TIMESTAMP    NOT NULL,
  is_revoked            BOOLEAN      DEFAULT FALSE,
  revoked_at            TIMESTAMP,
  last_used_at          TIMESTAMP,   -- updated on each /refresh call

  created_at            TIMESTAMP    DEFAULT NOW(),
  updated_at            TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id      ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_user_revoked ON refresh_tokens(user_id, is_revoked);
CREATE INDEX idx_refresh_tokens_expires      ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_session      ON refresh_tokens(session_id);
CREATE INDEX idx_refresh_tokens_hash         ON refresh_tokens(token_hash);

---

-- ============================================
-- 3. PASSWORD RESET TOKENS TABLE
-- ============================================
CREATE TABLE password_reset_tokens (
  id                    SERIAL PRIMARY KEY,
  user_id               INT          NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,

  -- SHA-256 hash of the actual reset token
  token_hash            VARCHAR(64)  NOT NULL,

  -- Lifecycle
  expires_at            TIMESTAMP    NOT NULL,
  is_used               BOOLEAN      DEFAULT FALSE,
  used_at               TIMESTAMP,

  created_at            TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_used    ON password_reset_tokens(is_used);
CREATE INDEX idx_password_reset_tokens_hash    ON password_reset_tokens(token_hash);

---

-- ============================================
-- 4. MFA (MULTI-FACTOR AUTHENTICATION) TABLE
-- Not required by current spec (spec uses JWT/Refresh/Redis/Rate Limit).
-- Kept for future TOTP/WebAuthn expansion.
-- ============================================
/*
CREATE TABLE mfa_settings (
  id                            SERIAL PRIMARY KEY,
  user_id                       INT          NOT NULL UNIQUE REFERENCES auth_users(id) ON DELETE CASCADE,

  mfa_type                      VARCHAR(50)
    CHECK (mfa_type IN ('totp', 'sms', 'email', 'webauthn')),
  is_enabled                    BOOLEAN      DEFAULT FALSE,
  is_verified                   BOOLEAN      DEFAULT FALSE,

  -- TOTP
  totp_secret                   VARCHAR(255),  -- Must be encrypted at application level
  totp_backup_codes             TEXT[],        -- Encrypted backup codes

  -- SMS
  phone_number_mfa              VARCHAR(20),
  sms_verified                  BOOLEAN      DEFAULT FALSE,

  -- WebAuthn
  webauthn_credential           JSONB,

  recovery_codes_generated_at   TIMESTAMP,

  created_at                    TIMESTAMP    DEFAULT NOW(),
  updated_at                    TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_mfa_settings_user_id ON mfa_settings(user_id);
CREATE INDEX idx_mfa_settings_enabled ON mfa_settings(is_enabled);
*/

---

-- ============================================
-- 5. LOGIN ANOMALIES TABLE
-- Populated by anomaly detection logic when risk score > threshold.
-- ============================================
/*
CREATE TABLE login_anomalies (
  id                    SERIAL PRIMARY KEY,
  user_id               INT          NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,

  risk_score            INT          CHECK (risk_score >= 0 AND risk_score <= 100),
  is_high_risk          BOOLEAN      GENERATED ALWAYS AS (risk_score >= 70) STORED,
  requires_mfa          BOOLEAN      DEFAULT FALSE,

  factors               JSONB,
  device_info           JSONB,
  ip_address            INET,
  location              JSONB,

  resolved              BOOLEAN      DEFAULT FALSE,
  resolved_at           TIMESTAMP,
  resolution_action     VARCHAR(50)
    CHECK (resolution_action IN ('mfa_passed', 'blocked', 'flagged', 'cleared')),

  detected_at           TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_login_anomalies_user_id    ON login_anomalies(user_id);
CREATE INDEX idx_login_anomalies_risk_score ON login_anomalies(risk_score);
CREATE INDEX idx_login_anomalies_detected   ON login_anomalies(detected_at);
CREATE INDEX idx_login_anomalies_unresolved ON login_anomalies(user_id)
  WHERE resolved = FALSE;
*/

---

-- ============================================
-- 6. AUTHENTICATION AUDIT LOGS TABLE
-- Append-only log. Never UPDATE or DELETE rows here.
-- ============================================
CREATE TABLE auth_audit_logs (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               INT          REFERENCES auth_users(id) ON DELETE SET NULL,

  event_type            VARCHAR(50)  NOT NULL
    CHECK (event_type IN (
      'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT_SUCCESS',
      'REGISTER_SUCCESS', 'TOKEN_REFRESHED', 'TOKEN_REVOKED',
      'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_SUCCESS',
      'MFA_ENABLED', 'MFA_VERIFIED', 'MFA_FAILED',
      'PERMISSION_DENIED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED'
    )),

  ip_address            INET,
  user_agent            VARCHAR(500),
  device_info           JSONB,

  status                VARCHAR(50)  CHECK (status IN ('SUCCESS', 'FAILED', 'BLOCKED')),
  reason                VARCHAR(255),
  metadata              JSONB,

  created_at            TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_auth_audit_logs_user_id    ON auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_logs_event_type ON auth_audit_logs(event_type);
CREATE INDEX idx_auth_audit_logs_ip         ON auth_audit_logs(ip_address);
CREATE INDEX idx_auth_audit_logs_created    ON auth_audit_logs(created_at);
CREATE INDEX idx_auth_audit_logs_status     ON auth_audit_logs(status);
-- Composite: look up recent failures per user (used by rate limit / lock logic)
CREATE INDEX idx_auth_audit_logs_user_failed ON auth_audit_logs(user_id, created_at)
  WHERE event_type = 'LOGIN_FAILED';

---

-- ============================================
-- 7. PERMISSION MANAGEMENT TABLE (RBAC)
-- ============================================
/*
CREATE TABLE role_permissions (
  id            SERIAL PRIMARY KEY,
  role          VARCHAR(50)  NOT NULL
    CHECK (role IN ('CUSTOMER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN')),
  permission    VARCHAR(100) NOT NULL,

  created_at    TIMESTAMP    DEFAULT NOW(),
  UNIQUE(role, permission)
);

INSERT INTO role_permissions (role, permission) VALUES
-- CUSTOMER permissions
('CUSTOMER', 'profile:view:own'),
('CUSTOMER', 'profile:edit:own'),
('CUSTOMER', 'ride:create'),
('CUSTOMER', 'ride:view:own'),
('CUSTOMER', 'ride:cancel:own'),
('CUSTOMER', 'payment:view:own'),

-- DRIVER permissions
('DRIVER', 'profile:view:own'),
('DRIVER', 'profile:edit:own'),
('DRIVER', 'ride:accept'),
('DRIVER', 'ride:view:assigned'),
('DRIVER', 'ride:complete'),
('DRIVER', 'earnings:view:own'),

-- ADMIN permissions
('ADMIN', 'user:view:all'),
('ADMIN', 'user:edit:all'),
('ADMIN', 'ride:view:all'),
('ADMIN', 'payment:view:all'),
('ADMIN', 'system:manage'),

-- SUPER_ADMIN inherits all ADMIN permissions plus extras
('SUPER_ADMIN', 'user:view:all'),
('SUPER_ADMIN', 'user:edit:all'),
('SUPER_ADMIN', 'user:delete:all'),
('SUPER_ADMIN', 'ride:view:all'),
('SUPER_ADMIN', 'payment:view:all'),
('SUPER_ADMIN', 'system:manage'),
('SUPER_ADMIN', 'admin:manage');

CREATE INDEX idx_role_permissions_role ON role_permissions(role);
*/

---

-- ============================================
-- 8. SERVICE-TO-SERVICE AUTH TABLE
-- Used for external API keys (e.g., 3rd-party integrations).
-- Internal microservice communication uses Istio mTLS (SPIFFE identity),
-- NOT this table. This table is for services outside the mesh.
-- SECURITY: api_key_hash stores SHA-256(api_key). Never store plaintext.
-- api_key_prefix stores first 8 chars for display only.
-- ============================================
/*
CREATE TABLE service_credentials (
  id              SERIAL PRIMARY KEY,

  service_name    VARCHAR(100) NOT NULL UNIQUE,
  service_id      VARCHAR(255) NOT NULL UNIQUE,

  -- api_key_prefix: first 8 chars of raw key (for display, e.g. "sk_live_")
  api_key_prefix  VARCHAR(12),
  -- api_key_hash: SHA-256 of the full raw key (for verification)
  api_key_hash    VARCHAR(64)  UNIQUE,

  is_active       BOOLEAN      DEFAULT TRUE,
  is_revoked      BOOLEAN      DEFAULT FALSE,
  -- Constraint: revoked keys must be inactive
  CONSTRAINT chk_revoked_inactive CHECK (NOT (is_revoked = TRUE AND is_active = TRUE)),

  metadata        JSONB,

  created_at      TIMESTAMP    DEFAULT NOW(),
  expires_at      TIMESTAMP,
  revoked_at      TIMESTAMP
);

CREATE INDEX idx_service_credentials_name     ON service_credentials(service_name);
CREATE INDEX idx_service_credentials_key_hash ON service_credentials(api_key_hash);
*/

---

-- ============================================
-- 9. SESSION MANAGEMENT TABLE
-- Tracks active sessions per device.
-- Linked to refresh_tokens via session_id.
-- ============================================
/*
CREATE TABLE user_sessions (
  id                    SERIAL PRIMARY KEY,
  user_id               INT          NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,

  session_id            VARCHAR(255) NOT NULL UNIQUE,
  device_fingerprint    VARCHAR(255),
  device_name           VARCHAR(255),

  ip_address            INET,
  user_agent            VARCHAR(500),
  location              JSONB,

  last_activity         TIMESTAMP    DEFAULT NOW(),
  is_active             BOOLEAN      DEFAULT TRUE,

  created_at            TIMESTAMP    DEFAULT NOW(),
  expires_at            TIMESTAMP,
  ended_at              TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id    ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_active     ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, is_active)
  WHERE is_active = TRUE;
*/

---

-- ============================================
-- 10. BLOCKED IPS/USERS TABLE
-- Redis rate limiter handles request-level throttling.
-- This table handles longer-term / admin-enforced blocks.
-- ============================================
/*
CREATE TABLE blocked_identities (
  id            SERIAL PRIMARY KEY,

  block_type    VARCHAR(50)  NOT NULL
    CHECK (block_type IN ('IP', 'EMAIL', 'PHONE', 'USER_ID')),
  block_value   VARCHAR(255) NOT NULL,

  reason        VARCHAR(255),
  blocked_by    INT          REFERENCES auth_users(id),

  is_active     BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMP    DEFAULT NOW(),
  expires_at    TIMESTAMP,

  UNIQUE(block_type, block_value)
);

CREATE INDEX idx_blocked_identities_value  ON blocked_identities(block_value);
CREATE INDEX idx_blocked_identities_active ON blocked_identities(block_type, block_value)
  WHERE is_active = TRUE;
*/

---

-- ============================================
-- 11. LOGIN HISTORY TABLE
-- Lightweight record of each login attempt per user.
-- Complements auth_audit_logs with device-level detail.
-- ============================================
CREATE TABLE login_history (
  id              BIGSERIAL PRIMARY KEY,
  user_id         INT          REFERENCES auth_users(id) ON DELETE CASCADE,

  ip_address      INET,
  user_agent      VARCHAR(500),
  device_info     JSONB,

  login_status    VARCHAR(50)  CHECK (login_status IN ('SUCCESS', 'FAILED')),
  failure_reason  VARCHAR(255),

  login_time      TIMESTAMP    DEFAULT NOW(),
  created_at      TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_time    ON login_history(login_time);
CREATE INDEX idx_login_history_status  ON login_history(login_status);

---

-- ============================================
-- 12. ACTIVITY LOGS TABLE
-- Generic user action tracking (non-auth events).
-- ============================================
/*
CREATE TABLE activity_logs (
  id              BIGSERIAL PRIMARY KEY,
  user_id         INT          REFERENCES auth_users(id) ON DELETE SET NULL,

  activity_type   VARCHAR(100) NOT NULL,
  resource_type   VARCHAR(100),
  resource_id     VARCHAR(255),
  action          VARCHAR(50),
  details         JSONB,

  ip_address      INET,
  user_agent      VARCHAR(500),

  created_at      TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_type    ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
*/

---

-- ============================================
-- 13. SECURITY POLICIES TABLE
-- ============================================
/*
CREATE TABLE security_policies (
  id                  SERIAL PRIMARY KEY,

  policy_name         VARCHAR(100) NOT NULL UNIQUE,
  description         TEXT,

  is_active           BOOLEAN      DEFAULT TRUE,
  applies_to_role     VARCHAR(50)
    CHECK (applies_to_role IN ('CUSTOMER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN')),

  -- policy_rules examples:
  -- login_security:   {"max_failed_attempts": 5, "lockout_duration_minutes": 30}
  -- password_policy:  {"min_length": 12, "require_uppercase": true}
  -- session_security: {"max_sessions_per_user": 5, "auto_logout_minutes": 30}
  policy_rules        JSONB        NOT NULL,

  created_at          TIMESTAMP    DEFAULT NOW(),
  updated_at          TIMESTAMP    DEFAULT NOW()
);

INSERT INTO security_policies (policy_name, description, policy_rules) VALUES
('mfa_enforcement',
 'Require MFA for all users',
 '{"require_mfa": true, "grace_period_days": 7}'),

('password_policy',
 'Strong password requirements',
 '{"min_length": 12, "require_uppercase": true, "require_numbers": true, "require_special": true, "expiration_days": 90}'),

('login_security',
 'Login attempt limits (mirrors Redis rate limiter config)',
 '{"max_failed_attempts": 5, "lockout_duration_minutes": 30, "rate_limit_window_minutes": 15, "require_anomaly_check": true}'),

('session_security',
 'Session management',
 '{"max_sessions_per_user": 5, "auto_logout_minutes": 30, "require_device_verification": true}');
*/

---

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- Applied to tables with updated_at column
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auth_users_updated_at
  BEFORE UPDATE ON auth_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_refresh_tokens_updated_at
  BEFORE UPDATE ON refresh_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Deferred tables (currently commented out)
-- CREATE TRIGGER trg_mfa_settings_updated_at
--   BEFORE UPDATE ON mfa_settings
--   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--
-- CREATE TRIGGER trg_security_policies_updated_at
--   BEFORE UPDATE ON security_policies
--   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- NOTE: Parameters use p_ prefix to avoid shadowing column names.
-- ============================================

-- Drop existing functions first (avoid parameter name conflict on re-run)
DROP FUNCTION IF EXISTS update_user_activity(integer);
DROP FUNCTION IF EXISTS lock_user_account(integer, varchar);
DROP FUNCTION IF EXISTS count_recent_failed_logins(integer, integer);
DROP FUNCTION IF EXISTS cleanup_expired_tokens();

---

-- Auto-update user last activity timestamp
CREATE OR REPLACE FUNCTION update_user_activity(p_user_id INT)
RETURNS void AS $$
BEGIN
  UPDATE auth_users
  SET last_activity = NOW(),
      updated_at    = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

---

-- Lock (suspend) a user account and write audit log
CREATE OR REPLACE FUNCTION lock_user_account(p_user_id INT, p_reason VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE auth_users
  SET status     = 'SUSPENDED',
      updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO auth_audit_logs (user_id, event_type, status, reason)
  VALUES (p_user_id, 'ACCOUNT_LOCKED', 'SUCCESS', p_reason);
END;
$$ LANGUAGE plpgsql;

---

-- Count failed login attempts for a user in the last N minutes.
-- Returns the count directly.
CREATE OR REPLACE FUNCTION count_recent_failed_logins(
  p_user_id        INT,
  p_window_minutes INT DEFAULT 30
)
RETURNS INT AS $$
DECLARE
  v_failed_count INT;
BEGIN
  SELECT COUNT(*) INTO v_failed_count
  FROM auth_audit_logs
  WHERE user_id    = p_user_id
    AND event_type = 'LOGIN_FAILED'
    AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  RETURN v_failed_count;
END;
$$ LANGUAGE plpgsql;

---

-- Clean up expired tokens (run as a scheduled job / cron)
-- Returns number of refresh_tokens deleted.
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INT AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  -- Delete expired OR old revoked refresh tokens
  DELETE FROM refresh_tokens
  WHERE expires_at < NOW()
     OR (is_revoked = TRUE AND revoked_at < NOW() - INTERVAL '7 days');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Delete used/expired password reset tokens
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW();

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;
