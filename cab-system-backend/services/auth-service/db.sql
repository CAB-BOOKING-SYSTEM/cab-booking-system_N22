CREATE DATABASE auth_db;

CREATE TABLE IF NOT EXISTS auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    phone_number VARCHAR(15) UNIQUE,              -- ✅ Bỏ NOT NULL (Google user không có phone)
    email VARCHAR(255) UNIQUE,

    password_hash TEXT,

    google_id VARCHAR(255) UNIQUE,                -- ✅ Thêm mới
    provider VARCHAR(20) NOT NULL DEFAULT 'email' -- ✅ Thêm mới
        CHECK (provider IN ('email', 'google')),

    role VARCHAR(20) NOT NULL DEFAULT 'RIDER'
        CHECK (role IN ('RIDER', 'DRIVER', 'ADMIN')),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'BANNED', 'UNVERIFIED', 'SUSPENDED')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- ✅ Đảm bảo user luôn có ít nhất 1 cách định danh
    CONSTRAINT chk_identity CHECK (
        phone_number IS NOT NULL OR google_id IS NOT NULL
    )
);

-- Giữ nguyên các bảng còn lại...
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    device_info TEXT,
    ip_address INET,
    is_revoked BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL
        CHECK (event_type IN (
            'REGISTER_SUCCESS', 'LOGIN_SUCCESS', 'LOGIN_FAILED',
            'TOKEN_REFRESHED', 'TOKEN_REVOKED',
            'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_SUCCESS',
            'ACCOUNT_BANNED', 'ACCOUNT_UNBANNED'
        )),
    ip_address INET,
    device_info TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_auth_users_phone ON auth_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_google_id ON auth_users(google_id);      -- ✅ Thêm mới
CREATE INDEX IF NOT EXISTS idx_auth_users_role_status ON auth_users(role, status);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event ON auth_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON auth_audit_logs(created_at DESC);

-- ============================================================
-- TRIGGER: Auto update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auth_users_updated_at
    BEFORE UPDATE ON auth_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE auth_users IS 'Bảng chính lưu thông tin xác thực. Profile chi tiết nằm ở user-service.';
COMMENT ON COLUMN auth_users.provider IS 'Phương thức đăng ký: email hoặc google.';
COMMENT ON COLUMN auth_users.google_id IS 'Google sub ID, dùng để link tài khoản Google OAuth.';
COMMENT ON TABLE password_reset_tokens IS 'Lưu token reset mật khẩu (hashed, single-use, ngắn hạn).';
COMMENT ON TABLE auth_audit_logs IS 'Audit log cho các sự kiện xác thực quan trọng.';