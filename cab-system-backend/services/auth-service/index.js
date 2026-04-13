require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");

// ====================== APP SETUP ======================
const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool({ connectionString: process.env.DB_URL });
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

// ====================== UTILS ======================
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            phone_number: user.phone_number,
            email: user.email,
            role: user.role,
            status: user.status,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );
};

const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId, type: "refresh" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
    );
};

const hashToken = async (token) => await bcrypt.hash(token, 12);

const logAudit = async (userId, eventType, ip, deviceInfo, metadata = {}) => {
    try {
        await pool.query(
            `INSERT INTO auth_audit_logs (user_id, event_type, ip_address, device_info, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, eventType, ip, deviceInfo, JSON.stringify(metadata)]
        );
    } catch (e) {
        console.error("Audit log error:", e.message);
    }
};

const isAccountBlocked = (status) => ["BANNED", "SUSPENDED"].includes(status);

// ====================== REGISTER ======================
app.post("/api/v1/auth/register", async (req, res) => {
    const client = await pool.connect();
    try {
        const { phone_number, email, password, role } = req.body;

        if (!phone_number || !password) {
            return res.status(400).json({
                success: false,
                message: "Phone number and password are required",
            });
        }

        await client.query("BEGIN");

        const existing = await client.query(
            "SELECT id FROM auth_users WHERE phone_number = $1 OR (email = $2 AND email IS NOT NULL)",
            [phone_number, email || null]
        );

        if (existing.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                success: false,
                message: "Phone or email already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await client.query(
            `INSERT INTO auth_users (phone_number, email, password_hash, role, status, provider)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, phone_number, email, role, status`,
            [phone_number, email || null, hashedPassword, role || "RIDER", "ACTIVE", "email"]
        );

        const user = result.rows[0];

        const accessToken = generateAccessToken(user);
        const refreshTokenRaw = generateRefreshToken(user.id);
        const refreshHash = await hashToken(refreshTokenRaw);

        await client.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info, ip_address)
             VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
            [user.id, refreshHash, req.headers["user-agent"], req.ip]
        );

        await client.query("COMMIT");
        await logAudit(user.id, "REGISTER_SUCCESS", req.ip, req.headers["user-agent"], { provider: "email" });

        return res.status(201).json({
            success: true,
            message: "Register successful",
            data: {
                user: { id: user.id, phone_number: user.phone_number, email: user.email, role: user.role },
                accessToken,
                refreshToken: refreshTokenRaw,
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Register error:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    } finally {
        client.release();
    }
});

// ====================== LOGIN ======================
app.post("/api/v1/auth/login", async (req, res) => {
    try {
        const { phone_number, email, password } = req.body;

        if (!password || (!phone_number && !email)) {
            return res.status(400).json({
                success: false,
                message: "Phone/Email and password are required",
            });
        }

        const result = await pool.query(
            "SELECT * FROM auth_users WHERE phone_number = $1 OR email = $2",
            [phone_number || null, email || null]
        );

        if (result.rows.length === 0) {
            await logAudit(null, "LOGIN_FAILED", req.ip, req.headers["user-agent"], { reason: "user_not_found" });
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const user = result.rows[0];

        if (isAccountBlocked(user.status)) {
            await logAudit(user.id, "LOGIN_FAILED", req.ip, req.headers["user-agent"], { reason: `account_${user.status.toLowerCase()}` });
            return res.status(403).json({ success: false, message: `Account is ${user.status.toLowerCase()}` });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash || "");
        if (!isMatch) {
            await logAudit(user.id, "LOGIN_FAILED", req.ip, req.headers["user-agent"], { reason: "wrong_password" });
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const accessToken = generateAccessToken(user);
        const refreshTokenRaw = generateRefreshToken(user.id);
        const refreshHash = await hashToken(refreshTokenRaw);

        await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info, ip_address)
             VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
            [user.id, refreshHash, req.headers["user-agent"], req.ip]
        );

        await logAudit(user.id, "LOGIN_SUCCESS", req.ip, req.headers["user-agent"], { provider: user.provider });

        return res.json({
            success: true,
            message: "Login successful",
            data: {
                user: { id: user.id, phone_number: user.phone_number, email: user.email, role: user.role, status: user.status },
                accessToken,
                refreshToken: refreshTokenRaw,
            },
        });
    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ====================== GOOGLE OAUTH ======================
app.post("/api/v1/auth/google", async (req, res) => {
    const { credential } = req.body;
    if (!credential) {
        return res.status(400).json({ success: false, message: "Google credential is required" });
    }

    const client = await pool.connect();
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { sub: googleId, email } = ticket.getPayload();

        await client.query("BEGIN");

        let result = await client.query(
            "SELECT * FROM auth_users WHERE google_id = $1 OR email = $2",
            [googleId, email]
        );

        let user;
        let eventType;

        if (result.rows.length === 0) {
            // New user — register via Google
            result = await client.query(
                `INSERT INTO auth_users (google_id, email, provider, status, role)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, status, provider`,
                [googleId, email, "google", "ACTIVE", "RIDER"]
            );
            user = result.rows[0];
            eventType = "REGISTER_SUCCESS";
        } else {
            user = result.rows[0];

            if (isAccountBlocked(user.status)) {
                await client.query("ROLLBACK");
                return res.status(403).json({ success: false, message: `Account is ${user.status.toLowerCase()}` });
            }

            // Link Google ID if not already linked
            if (!user.google_id) {
                await client.query(
                    "UPDATE auth_users SET google_id = $1, provider = 'google' WHERE id = $2",
                    [googleId, user.id]
                );
            }

            eventType = "LOGIN_SUCCESS";
        }

        const accessToken = generateAccessToken(user);
        const refreshTokenRaw = generateRefreshToken(user.id);
        const refreshHash = await hashToken(refreshTokenRaw);

        await client.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info, ip_address)
             VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
            [user.id, refreshHash, req.headers["user-agent"], req.ip]
        );

        await client.query("COMMIT");
        await logAudit(user.id, eventType, req.ip, req.headers["user-agent"], { provider: "google" });

        return res.json({
            success: true,
            message: "Google login successful",
            data: {
                user: { id: user.id, email: user.email, role: user.role, status: user.status, provider: user.provider },
                accessToken,
                refreshToken: refreshTokenRaw,
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Google auth error:", error.message);
        return res.status(401).json({ success: false, message: "Google authentication failed" });
    } finally {
        client.release();
    }
});

// ====================== REFRESH TOKEN ======================
app.post("/api/v1/auth/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Refresh token is required" });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const tokenResult = await pool.query(
            "SELECT * FROM refresh_tokens WHERE user_id = $1 AND is_revoked = FALSE AND expires_at > NOW()",
            [decoded.id]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
        }

        const tokenRow = tokenResult.rows[0];
        const isValid = await bcrypt.compare(refreshToken, tokenRow.token_hash);
        if (!isValid) {
            return res.status(403).json({ success: false, message: "Invalid refresh token" });
        }

        const userResult = await pool.query("SELECT * FROM auth_users WHERE id = $1", [decoded.id]);
        if (userResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: "User not found" });
        }

        const user = userResult.rows[0];

        if (isAccountBlocked(user.status)) {
            return res.status(403).json({ success: false, message: `Account is ${user.status.toLowerCase()}` });
        }

        // Token rotation: revoke old, issue new
        await pool.query("UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1", [tokenRow.id]);

        const newAccessToken = generateAccessToken(user);
        const newRefreshRaw = generateRefreshToken(user.id);
        const newHash = await hashToken(newRefreshRaw);

        await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info, ip_address)
             VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
            [user.id, newHash, req.headers["user-agent"], req.ip]
        );

        await logAudit(user.id, "TOKEN_REFRESHED", req.ip, req.headers["user-agent"]);

        return res.json({
            success: true,
            data: { accessToken: newAccessToken, refreshToken: newRefreshRaw },
        });
    } catch (error) {
        console.error("Refresh token error:", error.message);
        return res.status(403).json({ success: false, message: "Invalid refresh token" });
    }
});

// ====================== LOGOUT ======================
app.post("/api/v1/auth/logout", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Refresh token is required" });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Revoke all sessions of this user (or revoke only matching token for single-device logout)
        await pool.query(
            "UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1 AND is_revoked = FALSE",
            [decoded.id]
        );

        await logAudit(decoded.id, "TOKEN_REVOKED", req.ip, req.headers["user-agent"]);

        return res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error.message);
        return res.status(403).json({ success: false, message: "Invalid token" });
    }
});

// ====================== FORGOT PASSWORD ======================
app.post("/api/v1/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Always return the same response to prevent user enumeration
    const genericResponse = { success: true, message: "If this email exists, reset instructions have been sent" };

    try {
        const userResult = await pool.query("SELECT id FROM auth_users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) {
            return res.json(genericResponse);
        }

        const userId = userResult.rows[0].id;
        const resetTokenRaw = crypto.randomBytes(32).toString("hex");
        const resetHash = await bcrypt.hash(resetTokenRaw, 12);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Invalidate any existing unused tokens for this user
        await pool.query(
            "UPDATE password_reset_tokens SET is_used = TRUE WHERE user_id = $1 AND is_used = FALSE",
            [userId]
        );

        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [userId, resetHash, expiresAt]
        );

        await logAudit(userId, "PASSWORD_RESET_REQUESTED", req.ip, req.headers["user-agent"]);

        // TODO: Send email with reset link containing resetTokenRaw
        console.log(`[DEV] Reset token for ${email}: ${resetTokenRaw}`);

        return res.json(genericResponse);
    } catch (error) {
        console.error("Forgot password error:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ====================== RESET PASSWORD ======================
app.post("/api/v1/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: "Token and new password are required" });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    try {
        // Fetch only valid (not used, not expired) tokens — avoid full table scan in production
        const results = await pool.query(
            "SELECT * FROM password_reset_tokens WHERE expires_at > NOW() AND is_used = FALSE"
        );

        let validRow = null;
        for (const row of results.rows) {
            if (await bcrypt.compare(token, row.token_hash)) {
                validRow = row;
                break;
            }
        }

        if (!validRow) {
            return res.status(400).json({ success: false, message: "Invalid or expired token" });
        }

        const hashed = await bcrypt.hash(newPassword, 12);

        await pool.query("UPDATE auth_users SET password_hash = $1 WHERE id = $2", [hashed, validRow.user_id]);
        await pool.query(
            "UPDATE password_reset_tokens SET is_used = TRUE, used_at = NOW() WHERE id = $1",
            [validRow.id]
        );

        // Revoke all refresh tokens for security
        await pool.query(
            "UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1 AND is_revoked = FALSE",
            [validRow.user_id]
        );

        await logAudit(validRow.user_id, "PASSWORD_RESET_SUCCESS", req.ip, req.headers["user-agent"]);

        return res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        console.error("Reset password error:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ====================== VERIFY TOKEN (internal use) ======================
app.post("/api/v1/auth/verify", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.json({ success: true, data: decoded });
    } catch (error) {
        return res.status(403).json({ success: false, message: "Invalid or expired token" });
    }
});

// ====================== SERVER ======================
app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});

module.exports = app;
