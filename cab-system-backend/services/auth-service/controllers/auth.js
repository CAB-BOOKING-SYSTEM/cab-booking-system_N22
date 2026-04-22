import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import redisClient from '../core/redis.js';
import User from '../models/userModel.js';
import pool from '../core/db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const VALID_ROLES = ['RIDER', 'DRIVER', 'ADMIN'];

const generateAccessToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { sub: userId },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
};

const blacklistToken = async (token, expiresInSeconds) => {
  if (!token) return;
  await redisClient.set(`blacklist:${token}`, '1', { EX: expiresInSeconds });
};

const isBlacklisted = async (token) => {
  const exists = await redisClient.exists(`blacklist:${token}`);
  return exists === 1;
};

// ====================== DB LOGGING HELPERS ======================

const writeAuditLog = async ({ userId, eventType, status, reason, ipAddress, userAgent, metadata }) => {
  try {
    await pool.query(
      `INSERT INTO auth_audit_logs (user_id, event_type, status, reason, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5::inet, $6, $7)`,
      [
        userId || null,
        eventType,
        status,
        reason || null,
        ipAddress || null,
        userAgent || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log:', err.message);
  }
};

const writeLoginHistory = async ({ userId, ipAddress, userAgent, loginStatus, failureReason }) => {
  try {
    await pool.query(
      `INSERT INTO login_history (user_id, ip_address, user_agent, login_status, failure_reason)
       VALUES ($1, $2::inet, $3, $4, $5)`,
      [
        userId || null,
        ipAddress || null,
        userAgent || null,
        loginStatus,
        failureReason || null,
      ]
    );
  } catch (err) {
    console.error('[LoginHistory] Failed to write login history:', err.message);
  }
};

// Tables skipped (not yet needed — comment back in when implementing):
// - refresh_tokens   : refresh token persistence & multi-device session audit
// - mfa_settings     : TOTP / SMS / WebAuthn MFA
// - login_anomalies  : risk-score based anomaly detection
// - user_sessions    : active session tracking per device
// - blocked_identities: long-term IP / email / phone blocks
// - activity_logs    : generic non-auth user action tracking

// ====================== REGISTER ======================
export const register = async (req, res) => {
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  try {
    const { email, password, role = 'RIDER' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const normalizedRole = VALID_ROLES.includes(role.toUpperCase())
      ? role.toUpperCase()
      : 'RIDER';

    const newUser = await User.create({ email, password_hash, role: normalizedRole });

    await writeAuditLog({
      userId: newUser.id,
      eventType: 'REGISTER_SUCCESS',
      status: 'SUCCESS',
      ipAddress: ip,
      userAgent: ua,
      metadata: { email: newUser.email, role: newUser.role },
    });

    res.status(201).json({
      message: 'User registered successfully.',
      user: { id: newUser.id, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ====================== LOGIN ======================
export const login = async (req, res) => {
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findByEmail(email);
    if (!user || !user.password_hash) {
      await writeAuditLog({
        userId: null,
        eventType: 'LOGIN_FAILED',
        status: 'FAILED',
        reason: 'User not found',
        ipAddress: ip,
        userAgent: ua,
        metadata: { email },
      });
      await writeLoginHistory({
        userId: null,
        ipAddress: ip,
        userAgent: ua,
        loginStatus: 'FAILED',
        failureReason: 'User not found',
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      await writeAuditLog({
        userId: user.id,
        eventType: 'LOGIN_FAILED',
        status: 'BLOCKED',
        reason: `Account status: ${user.status}`,
        ipAddress: ip,
        userAgent: ua,
      });
      await writeLoginHistory({
        userId: user.id,
        ipAddress: ip,
        userAgent: ua,
        loginStatus: 'FAILED',
        failureReason: `Account not active: ${user.status}`,
      });
      return res.status(403).json({ message: 'Account is not active' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'LOGIN_FAILED',
        status: 'FAILED',
        reason: 'Wrong password',
        ipAddress: ip,
        userAgent: ua,
      });
      await writeLoginHistory({
        userId: user.id,
        ipAddress: ip,
        userAgent: ua,
        loginStatus: 'FAILED',
        failureReason: 'Wrong password',
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    await redisClient.set(
      `refresh:${user.id}`,
      refreshToken,
      { EX: 7 * 24 * 60 * 60 }
    );

    // TODO: also persist to refresh_tokens table for multi-device session audit
    // await pool.query(
    //   `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    //    VALUES ($1, digest($2, 'sha256'), NOW() + INTERVAL '7 days')`,
    //   [user.id, refreshToken]
    // );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await User.updateLastLogin(user.id).catch(() => {});

    await writeAuditLog({
      userId: user.id,
      eventType: 'LOGIN_SUCCESS',
      status: 'SUCCESS',
      ipAddress: ip,
      userAgent: ua,
      metadata: { email: user.email, role: user.role },
    });
    await writeLoginHistory({
      userId: user.id,
      ipAddress: ip,
      userAgent: ua,
      loginStatus: 'SUCCESS',
    });

    res.json({
      message: 'Login successful',
      accessToken,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ====================== REFRESH TOKEN (với Rotation) ======================
export const refresh = async (req, res) => {
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  try {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    if (await isBlacklisted(oldRefreshToken)) {
      return res.status(401).json({ message: 'Refresh token has been revoked' });
    }

    const decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET);
    const userId = decoded.sub;

    const currentRefreshInRedis = await redisClient.get(`refresh:${userId}`);
    if (!currentRefreshInRedis || currentRefreshInRedis !== oldRefreshToken) {
      return res.status(401).json({ message: 'Invalid or reused refresh token' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const decodedOld = jwt.decode(oldRefreshToken);
    const ttl = Math.floor((decodedOld.exp * 1000 - Date.now()) / 1000);
    if (ttl > 0) {
      await blacklistToken(oldRefreshToken, ttl);
    }

    // TODO: mark old token as revoked in refresh_tokens table
    // await pool.query(
    //   `UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW()
    //    WHERE user_id = $1 AND is_revoked = FALSE`,
    //   [userId]
    // );

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user.id);

    await redisClient.set(
      `refresh:${user.id}`,
      newRefreshToken,
      { EX: 7 * 24 * 60 * 60 }
    );

    // TODO: insert new token into refresh_tokens table
    // await pool.query(
    //   `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    //    VALUES ($1, digest($2, 'sha256'), NOW() + INTERVAL '7 days')`,
    //   [user.id, newRefreshToken]
    // );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await writeAuditLog({
      userId: user.id,
      eventType: 'TOKEN_REFRESHED',
      status: 'SUCCESS',
      ipAddress: ip,
      userAgent: ua,
    });

    res.json({ message: 'Token refreshed successfully', accessToken: newAccessToken });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired' });
    }
    console.error(error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// ====================== LOGOUT ======================
export const logout = async (req, res) => {
  const ip = req.ip;
  const ua = req.headers['user-agent'];
  let userId = null;

  try {
    const refreshToken = req.cookies.refreshToken;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];

    if (accessToken) {
      try {
        const decodedAccess = jwt.decode(accessToken);
        userId = decodedAccess?.sub || null;
        const ttl = Math.floor((decodedAccess.exp * 1000 - Date.now()) / 1000);
        if (ttl > 0) await blacklistToken(accessToken, ttl);
      } catch (_) {}
    }

    if (refreshToken) {
      try {
        const decodedRefresh = jwt.decode(refreshToken);
        if (!userId) userId = decodedRefresh?.sub || null;
        const ttl = Math.floor((decodedRefresh.exp * 1000 - Date.now()) / 1000);
        if (ttl > 0) await blacklistToken(refreshToken, ttl);
        const rUserId = decodedRefresh?.sub;
        if (rUserId) await redisClient.del(`refresh:${rUserId}`);

        // TODO: mark refresh token as revoked in refresh_tokens table
        // await pool.query(
        //   `UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW()
        //    WHERE user_id = $1 AND is_revoked = FALSE`,
        //   [rUserId]
        // );
      } catch (_) {}
    }

    await writeAuditLog({
      userId,
      eventType: 'LOGOUT_SUCCESS',
      status: 'SUCCESS',
      ipAddress: ip,
      userAgent: ua,
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Logout failed' });
  }
};
