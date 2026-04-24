-- ============================================
-- ZERO TRUST AUTHENTICATION DATABASE SCHEMA
-- PostgreSQL
-- ============================================

-- ============================================
-- 1. USERS TABLE (Core)
-- ============================================
CREATE TABLE auth_users (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  
  -- OAuth
  google_id VARCHAR(255) UNIQUE,
  facebook_id VARCHAR(255) UNIQUE,
  provider VARCHAR(50), -- 'email', 'google', 'facebook'
  
  -- User Details
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  
  -- Status & Role
  role VARCHAR(50) NOT NULL DEFAULT 'RIDER',
    -- RIDER, DRIVER, ADMIN, SUPER_ADMIN
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    -- ACTIVE, INACTIVE, BANNED, SUSPENDED, PENDING_VERIFICATION
  
  -- Verification
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  phone_verified_at TIMESTAMP,
  
  -- Metadata
  last_login TIMESTAMP,
  last_activity TIMESTAMP,
  login_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP  -- Soft delete
);

CREATE INDEX idx_auth_users_phone ON auth_users(phone_number);
CREATE INDEX idx_auth_users_email ON auth_users(email);
CREATE INDEX idx_auth_users_google_id ON auth_users(google_id);
CREATE INDEX idx_auth_users_status ON auth_users(status);
CREATE INDEX idx_auth_users_role ON auth_users(role);

---

-- ============================================
-- 2. REFRESH TOKENS TABLE
-- ============================================
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Token storage
  token_hash VARCHAR(255) NOT NULL,
  
  -- Device & Session tracking
  session_id VARCHAR(255) UNIQUE,
  device_info JSONB, -- Contains fingerprint, UA, etc
  device_fingerprint VARCHAR(255),
  ip_address INET,
  
  -- Lifecycle
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_user_revoked ON refresh_tokens(user_id, is_revoked);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_session ON refresh_tokens(session_id);

---

-- ============================================
-- 3. PASSWORD RESET TOKENS TABLE
-- ============================================
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Token storage (hashed)
  token_hash VARCHAR(255) NOT NULL,
  
  -- Lifecycle
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_used ON password_reset_tokens(is_used);

---

-- ============================================
-- 4. MFA (MULTI-FACTOR AUTHENTICATION) TABLE
-- ============================================
CREATE TABLE mfa_settings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- MFA Type
  mfa_type VARCHAR(50), -- 'totp', 'sms', 'email', 'webauthn'
  is_enabled BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  
  -- TOTP (Time-based OTP)
  totp_secret VARCHAR(255),
  totp_backup_codes TEXT[], -- Encrypted backup codes
  
  -- SMS
  phone_number_mfa VARCHAR(20),
  sms_verified BOOLEAN DEFAULT FALSE,
  
  -- WebAuthn
  webauthn_credential JSONB,
  
  -- Recovery codes
  recovery_codes_generated_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mfa_settings_user_id ON mfa_settings(user_id);
CREATE INDEX idx_mfa_settings_enabled ON mfa_settings(is_enabled);

---

-- ============================================
-- 5. LOGIN ANOMALIES TABLE
-- ============================================
CREATE TABLE login_anomalies (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Risk Assessment
  risk_score INT CHECK (risk_score >= 0 AND risk_score <= 100),
  is_high_risk BOOLEAN,
  requires_mfa BOOLEAN DEFAULT FALSE,
  
  -- Anomaly Details
  factors JSONB, -- Contains detailed anomaly factors
  device_info JSONB,
  ip_address INET,
  location JSONB, -- GeoIP data
  
  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolution_action VARCHAR(50), -- 'mfa_passed', 'blocked', 'flagged'
  
  detected_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_login_anomalies_user_id ON login_anomalies(user_id);
CREATE INDEX idx_login_anomalies_risk_score ON login_anomalies(risk_score);
CREATE INDEX idx_login_anomalies_detected ON login_anomalies(detected_at);

---

-- ============================================
-- 6. AUTHENTICATION AUDIT LOGS TABLE
-- ============================================
CREATE TABLE auth_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES auth_users(id) ON DELETE SET NULL,
  
  -- Event Details
  event_type VARCHAR(50) NOT NULL,
    -- LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT_SUCCESS,
    -- REGISTER_SUCCESS, TOKEN_REFRESHED, TOKEN_REVOKED,
    -- PASSWORD_RESET_REQUESTED, PASSWORD_RESET_SUCCESS,
    -- MFA_ENABLED, MFA_VERIFIED, MFA_FAILED,
    -- PERMISSION_DENIED, ACCOUNT_LOCKED
  
  -- Request Details
  ip_address INET,
  user_agent VARCHAR(500),
  device_info JSONB,
  
  -- Status & Reason
  status VARCHAR(50), -- 'SUCCESS', 'FAILED', 'BLOCKED'
  reason VARCHAR(100), -- 'invalid_credentials', 'account_locked', etc
  metadata JSONB, -- Additional context
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_logs_event_type ON auth_audit_logs(event_type);
CREATE INDEX idx_auth_audit_logs_ip ON auth_audit_logs(ip_address);
CREATE INDEX idx_auth_audit_logs_created ON auth_audit_logs(created_at);
CREATE INDEX idx_auth_audit_logs_status ON auth_audit_logs(status);

---

-- ============================================
-- 7. PERMISSION MANAGEMENT TABLE (For Custom RBAC)
-- ============================================
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role, permission)
);

INSERT INTO role_permissions (role, permission) VALUES
-- RIDER permissions
('RIDER', 'profile:view:own'),
('RIDER', 'profile:edit:own'),
('RIDER', 'ride:create'),
('RIDER', 'ride:view:own'),
('RIDER', 'ride:cancel:own'),
('RIDER', 'payment:view:own'),

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
('ADMIN', 'system:manage');

CREATE INDEX idx_role_permissions_role ON role_permissions(role);

---

-- ============================================
-- 8. SERVICE-TO-SERVICE AUTH TABLE
-- ============================================
CREATE TABLE service_credentials (
  id SERIAL PRIMARY KEY,
  
  -- Service Identity
  service_name VARCHAR(100) NOT NULL UNIQUE,
  service_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Credentials
  api_key VARCHAR(255) UNIQUE,
  api_secret_hash VARCHAR(255),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_revoked BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP
);

CREATE INDEX idx_service_credentials_name ON service_credentials(service_name);
CREATE INDEX idx_service_credentials_api_key ON service_credentials(api_key);

---

-- ============================================
-- 9. SESSION MANAGEMENT TABLE
-- ============================================
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Session tracking
  session_id VARCHAR(255) NOT NULL UNIQUE,
  device_fingerprint VARCHAR(255),
  device_name VARCHAR(255),
  
  -- Security
  ip_address INET,
  user_agent VARCHAR(500),
  location JSONB,
  
  -- Activity
  last_activity TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Lifecycle
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

---

-- ============================================
-- 10. BLOCKED IPS/USERS TABLE
-- ============================================
CREATE TABLE blocked_identities (
  id SERIAL PRIMARY KEY,
  
  -- What to block
  block_type VARCHAR(50) NOT NULL, -- 'IP', 'EMAIL', 'PHONE', 'USER_ID'
  block_value VARCHAR(255) NOT NULL,
  
  -- Reason
  reason VARCHAR(255),
  blocked_by INT REFERENCES auth_users(id),
  
  -- Lifecycle
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  UNIQUE(block_type, block_value)
);

CREATE INDEX idx_blocked_identities_value ON blocked_identities(block_value);
CREATE INDEX idx_blocked_identities_active ON blocked_identities(is_active);

---

-- ============================================
-- 11. LOGIN HISTORY TABLE
-- ============================================
CREATE TABLE login_history (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Login Details
  ip_address INET,
  device_fingerprint VARCHAR(255),
  user_agent VARCHAR(500),
  location JSONB,
  
  -- Status
  login_success BOOLEAN,
  failure_reason VARCHAR(100),
  
  -- Risk Assessment
  anomaly_detected BOOLEAN DEFAULT FALSE,
  risk_score INT,
  mfa_required BOOLEAN DEFAULT FALSE,
  mfa_passed BOOLEAN,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_success ON login_history(login_success);
CREATE INDEX idx_login_history_created ON login_history(created_at);

---

-- ============================================
-- 12. SECURITY POLICIES TABLE
-- ============================================
CREATE TABLE security_policies (
  id SERIAL PRIMARY KEY,
  
  -- Policy name
  policy_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  
  -- Enforcement
  is_active BOOLEAN DEFAULT TRUE,
  applies_to_role VARCHAR(50), -- NULL means all roles
  
  -- Rules (JSON)
  -- Examples:
  -- { "require_mfa": true, "min_password_length": 12 }
  -- { "max_failed_logins": 5, "lockout_duration_minutes": 30 }
  -- { "require_strong_password": true, "auto_logout_minutes": 30 }
  policy_rules JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO security_policies (policy_name, description, policy_rules) VALUES
('mfa_enforcement', 'Require MFA for all users', 
 '{"require_mfa": true, "grace_period_days": 7}'),
('password_policy', 'Strong password requirements',
 '{"min_length": 12, "require_uppercase": true, "require_numbers": true, "require_special": true, "expiration_days": 90}'),
('login_security', 'Login attempt limits',
 '{"max_failed_attempts": 5, "lockout_duration_minutes": 30, "require_anomaly_check": true}'),
('session_security', 'Session management',
 '{"max_sessions_per_user": 5, "auto_logout_minutes": 30, "require_device_verification": true}');

---

-- ============================================
-- 13. ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  
  -- Activity
  activity_type VARCHAR(100) NOT NULL,
  activity_description TEXT,
  
  -- Context
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  
  ip_address INET,
  user_agent VARCHAR(500),
  
  -- Status
  status VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

---

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View for user login statistics
CREATE VIEW user_login_stats AS
SELECT
  u.id,
  u.email,
  u.role,
  COUNT(CASE WHEN aal.event_type = 'LOGIN_SUCCESS' THEN 1 END) as successful_logins,
  COUNT(CASE WHEN aal.event_type = 'LOGIN_FAILED' THEN 1 END) as failed_logins,
  MAX(aal.created_at) as last_login,
  COUNT(DISTINCT aal.ip_address) as unique_ips
FROM auth_users u
LEFT JOIN auth_audit_logs aal ON u.id = aal.user_id
GROUP BY u.id, u.email, u.role;

-- View for anomaly statistics
CREATE VIEW anomaly_stats AS
SELECT
  DATE(detected_at) as date,
  COUNT(*) as total_anomalies,
  COUNT(CASE WHEN is_high_risk THEN 1 END) as high_risk_count,
  AVG(risk_score) as avg_risk_score,
  MAX(risk_score) as max_risk_score
FROM login_anomalies
GROUP BY DATE(detected_at)
ORDER BY date DESC;

-- View for security event summary
CREATE VIEW security_summary AS
SELECT
  DATE(created_at) as date,
  event_type,
  status,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT ip_address) as unique_ips
FROM auth_audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), event_type, status
ORDER BY date DESC, event_type;

---

-- ============================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ============================================

-- Function to update user last activity
CREATE OR REPLACE FUNCTION update_user_activity(user_id INT)
RETURNS void AS $$
BEGIN
  UPDATE auth_users
  SET last_activity = NOW(), updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to lock user account
CREATE OR REPLACE FUNCTION lock_user_account(user_id INT, reason VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE auth_users
  SET status = 'SUSPENDED', updated_at = NOW()
  WHERE id = user_id;
  
  INSERT INTO auth_audit_logs (user_id, event_type, status, reason)
  VALUES (user_id, 'ACCOUNT_LOCKED', 'SUCCESS', reason);
END;
$$ LANGUAGE plpgsql;

-- Function to increment failed login count
CREATE OR REPLACE FUNCTION increment_failed_logins(user_id INT)
RETURNS INT AS $$
DECLARE
  failed_count INT;
BEGIN
  SELECT COUNT(*) INTO failed_count
  FROM auth_audit_logs
  WHERE user_id = user_id
    AND event_type = 'LOGIN_FAILED'
    AND created_at > NOW() - INTERVAL '30 minutes';
  
  RETURN failed_count + 1;
END;
$$ LANGUAGE plpgsql;

---

-- ============================================
-- GRANTS FOR APPLICATION USER
-- ============================================

-- Create application user
CREATE USER auth_app WITH PASSWORD 'secure_password_here';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON auth_users TO auth_app;
GRANT SELECT, INSERT, UPDATE ON refresh_tokens TO auth_app;
GRANT SELECT, INSERT, UPDATE ON password_reset_tokens TO auth_app;
GRANT SELECT, INSERT, UPDATE ON mfa_settings TO auth_app;
GRANT SELECT, INSERT ON auth_audit_logs TO auth_app;
GRANT SELECT, INSERT ON login_anomalies TO auth_app;
GRANT SELECT ON role_permissions TO auth_app;
GRANT SELECT, INSERT, UPDATE ON user_sessions TO auth_app;
GRANT SELECT ON blocked_identities TO auth_app;
GRANT SELECT, INSERT ON login_history TO auth_app;
GRANT SELECT ON security_policies TO auth_app;
GRANT SELECT, INSERT ON activity_logs TO auth_app;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO auth_app;