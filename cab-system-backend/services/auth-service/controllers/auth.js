import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import redisClient from '../core/redis.js';
import User from '../models/userModel.js';
import pool from '../core/db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const RESET_TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);

const VALID_ROLES = ['CUSTOMER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN'];
const ROLE_ALIAS = {
  CUSTOMER: 'CUSTOMER',
  USER: 'RIDER',
};

const generateAccessToken = (user) => jwt.sign(
  { sub: user.id, email: user.email, role: user.role },
  JWT_SECRET,
  { expiresIn: ACCESS_EXPIRES }
);

const generateRefreshToken = (userId) => jwt.sign(
  { sub: userId },
  JWT_REFRESH_SECRET,
  { expiresIn: REFRESH_EXPIRES }
);

const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

const getTokenExpiryDate = (token) => {
  const decoded = jwt.decode(token);
  if (!decoded?.exp) return null;
  return new Date(decoded.exp * 1000);
};

const safeRedisSet = async (key, value, options) => {
  try {
    await redisClient.set(key, value, options);
    return true;
  } catch {
    return false;
  }
};

const safeRedisGet = async (key) => {
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
};

const safeRedisDel = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch {
    return false;
  }
};

const safeRedisExists = async (key) => {
  try {
    const exists = await redisClient.exists(key);
    return exists === 1;
  } catch {
    return false;
  }
};

const blacklistToken = async (token, expiresInSeconds) => {
  if (!token || !expiresInSeconds || expiresInSeconds <= 0) return;
  await safeRedisSet(`blacklist:${token}`, '1', { EX: expiresInSeconds });
};

const isBlacklisted = async (token) => safeRedisExists(`blacklist:${token}`);

const splitFullName = (fullName = '') => {
  const cleaned = String(fullName || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return { firstName: null, lastName: null };
  const parts = cleaned.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  const lastName = parts.pop();
  return { firstName: parts.join(' '), lastName };
};

const normalizeRole = (role = 'RIDER') => {
  const upperRole = String(role).toUpperCase();
  const mapped = ROLE_ALIAS[upperRole] || upperRole;
  return VALID_ROLES.includes(mapped) ? mapped : 'RIDER';
};

const normalizeAppType = (appType = '') => String(appType || '').toUpperCase().trim();

const isRoleAllowedForApp = (role, appType) => {
  const normalizedRole = String(role || '').toUpperCase();
  if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN') return true;

  if (appType === 'CUSTOMER_APP') {
    return normalizedRole === 'CUSTOMER';
  }

  if (appType === 'DRIVER_APP') {
    return normalizedRole === 'DRIVER';
  }

  return true;
};

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
      [userId || null, ipAddress || null, userAgent || null, loginStatus, failureReason || null]
    );
  } catch (err) {
    console.error('[LoginHistory] Failed to write login history:', err.message);
  }
};

const persistRefreshToken = async ({ userId, refreshToken, ipAddress, userAgent }) => {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getTokenExpiryDate(refreshToken);

  if (!expiresAt) return;

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, device_info)
     VALUES ($1, $2, $3, $4::inet, $5)`,
    [
      userId,
      tokenHash,
      expiresAt,
      ipAddress || null,
      JSON.stringify({ userAgent: userAgent || null }),
    ]
  );
};

const revokeRefreshToken = async ({ refreshToken, userId }) => {
  const tokenHash = hashToken(refreshToken);
  if (userId) {
    await pool.query(
      `UPDATE refresh_tokens
       SET is_revoked = TRUE, revoked_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND token_hash = $2 AND is_revoked = FALSE`,
      [userId, tokenHash]
    );
    return;
  }

  await pool.query(
    `UPDATE refresh_tokens
     SET is_revoked = TRUE, revoked_at = NOW(), updated_at = NOW()
     WHERE token_hash = $1 AND is_revoked = FALSE`,
    [tokenHash]
  );
};

const hasValidRefreshTokenInDb = async ({ userId, refreshToken }) => {
  const tokenHash = hashToken(refreshToken);
  const result = await pool.query(
    `SELECT 1
     FROM refresh_tokens
     WHERE user_id = $1
       AND token_hash = $2
       AND is_revoked = FALSE
       AND expires_at > NOW()
     LIMIT 1`,
    [userId, tokenHash]
  );
  return result.rows.length > 0;
};

export const register = async (req, res) => {
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  try {
    const { email, password, role = 'RIDER', fullName, phone } = req.body;

    if (!email || !password) {
      await writeAuditLog({
        userId: null,
        eventType: 'REGISTER_SUCCESS',
        status: 'FAILED',
        reason: 'Missing required fields',
        ipAddress: ip,
        userAgent: ua,
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (String(password).length < 6) {
      await writeAuditLog({
        userId: null,
        eventType: 'REGISTER_SUCCESS',
        status: 'FAILED',
        reason: 'Password too short',
        ipAddress: ip,
        userAgent: ua,
      });
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = phone ? String(phone).trim() : null;
    const { firstName, lastName } = splitFullName(fullName);

    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      await writeAuditLog({
        userId: existingUser.id,
        eventType: 'REGISTER_SUCCESS',
        status: 'FAILED',
        reason: 'Email already exists',
        ipAddress: ip,
        userAgent: ua,
        metadata: { email: normalizedEmail },
      });
      return res.status(409).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    const normalizedRole = normalizeRole(role);

    const newUser = await User.create({
      email: normalizedEmail,
      password_hash,
      role: normalizedRole,
      first_name: firstName,
      last_name: lastName,
      phone_number: normalizedPhone,
    });

    await writeAuditLog({
      userId: newUser.id,
      eventType: 'REGISTER_SUCCESS',
      status: 'SUCCESS',
      ipAddress: ip,
      userAgent: ua,
      metadata: { email: newUser.email, role: newUser.role },
    });

    return res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        phone: newUser.phone_number,
      },
    });
  } catch (error) {
    console.error(error);
    await writeAuditLog({
      userId: null,
      eventType: 'REGISTER_SUCCESS',
      status: 'FAILED',
      reason: 'Server error',
      ipAddress: ip,
      userAgent: ua,
    });
    return res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  try {
    const { email, password, appType } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const normalizedAppType = normalizeAppType(appType);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findByEmail(normalizedEmail);
    if (!user || !user.password_hash) {
      await writeAuditLog({
        userId: null,
        eventType: 'LOGIN_FAILED',
        status: 'FAILED',
        reason: 'User not found',
        ipAddress: ip,
        userAgent: ua,
        metadata: { email: normalizedEmail },
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

    if (!isRoleAllowedForApp(user.role, normalizedAppType)) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'PERMISSION_DENIED',
        status: 'BLOCKED',
        reason: `Role ${user.role} denied for app ${normalizedAppType || 'UNKNOWN'}`,
        ipAddress: ip,
        userAgent: ua,
      });
      return res.status(403).json({
        message: 'Bạn không có quyền đăng nhập vào ứng dụng này',
      });
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

    await safeRedisSet(`refresh:${user.id}`, refreshToken, { EX: 7 * 24 * 60 * 60 });
    await persistRefreshToken({ userId: user.id, refreshToken, ipAddress: ip, userAgent: ua });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

    return res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const refresh = async (req, res) => {
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  try {
    const oldRefreshToken = req.cookies.refreshToken || req.body?.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    if (await isBlacklisted(oldRefreshToken)) {
      return res.status(401).json({ message: 'Refresh token has been revoked' });
    }

    const decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET);
    const userId = decoded.sub;

    const currentRefreshInRedis = await safeRedisGet(`refresh:${userId}`);
    const validInDb = await hasValidRefreshTokenInDb({ userId, refreshToken: oldRefreshToken });
    const validByRedis = currentRefreshInRedis ? currentRefreshInRedis === oldRefreshToken : false;

    if (!validByRedis && !validInDb) {
      await writeAuditLog({
        userId,
        eventType: 'TOKEN_REVOKED',
        status: 'FAILED',
        reason: 'Refresh token reuse detected',
        ipAddress: ip,
        userAgent: ua,
      });
      return res.status(401).json({ message: 'Invalid or reused refresh token' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const decodedOld = jwt.decode(oldRefreshToken);
    const oldTtl = Math.floor((decodedOld.exp * 1000 - Date.now()) / 1000);
    await blacklistToken(oldRefreshToken, oldTtl);
    await revokeRefreshToken({ refreshToken: oldRefreshToken, userId });

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user.id);

    await safeRedisSet(`refresh:${user.id}`, newRefreshToken, { EX: 7 * 24 * 60 * 60 });
    await persistRefreshToken({ userId: user.id, refreshToken: newRefreshToken, ipAddress: ip, userAgent: ua });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await writeAuditLog({
      userId: user.id,
      eventType: 'TOKEN_REFRESHED',
      status: 'SUCCESS',
      ipAddress: ip,
      userAgent: ua,
    });

    return res.json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired' });
    }
    console.error(error);
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req, res) => {
  const ip = req.ip;
  const ua = req.headers['user-agent'];
  let userId = null;

  try {
    const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];

    if (accessToken) {
      const decodedAccess = jwt.decode(accessToken);
      userId = decodedAccess?.sub || null;
      const accessTtl = Math.floor((decodedAccess?.exp * 1000 - Date.now()) / 1000);
      await blacklistToken(accessToken, accessTtl);
    }

    if (refreshToken) {
      const decodedRefresh = jwt.decode(refreshToken);
      if (!userId) userId = decodedRefresh?.sub || null;
      const refreshTtl = Math.floor((decodedRefresh?.exp * 1000 - Date.now()) / 1000);
      await blacklistToken(refreshToken, refreshTtl);
      const refreshUserId = decodedRefresh?.sub;
      if (refreshUserId) await safeRedisDel(`refresh:${refreshUserId}`);
      await revokeRefreshToken({ refreshToken, userId: refreshUserId || userId });
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
      sameSite: 'lax',
    });

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    await writeAuditLog({
      userId,
      eventType: 'LOGOUT_SUCCESS',
      status: 'FAILED',
      reason: 'Logout failed',
      ipAddress: ip,
      userAgent: ua,
    });
    return res.status(500).json({ message: 'Logout failed' });
  }
};

export const requestPasswordReset = async (req, res) => {
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  try {
    const normalizedEmail = String(req.body?.email || '').toLowerCase().trim();
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findByEmail(normalizedEmail);
    if (!user) {
      await writeAuditLog({
        userId: null,
        eventType: 'PASSWORD_RESET_REQUESTED',
        status: 'FAILED',
        reason: 'User not found',
        ipAddress: ip,
        userAgent: ua,
        metadata: { email: normalizedEmail },
      });
      return res.json({ message: 'Nếu email tồn tại, chúng tôi đã tạo reset token.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3 || ' minutes')::INTERVAL)`,
      [user.id, tokenHash, RESET_TOKEN_TTL_MINUTES]
    );

    await writeAuditLog({
      userId: user.id,
      eventType: 'PASSWORD_RESET_REQUESTED',
      status: 'SUCCESS',
      ipAddress: ip,
      userAgent: ua,
    });

    const response = { message: 'Reset token đã được tạo. Vui lòng kiểm tra email.' };
    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = rawToken;
    }
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Không thể tạo reset token' });
  }
};

export const resetPassword = async (req, res) => {
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token và mật khẩu mới là bắt buộc' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const tokenHash = hashToken(String(token));
    const tokenResult = await pool.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND is_used = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      await writeAuditLog({
        userId: null,
        eventType: 'PASSWORD_RESET_SUCCESS',
        status: 'FAILED',
        reason: 'Invalid or expired token',
        ipAddress: ip,
        userAgent: ua,
      });
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    const resetRow = tokenResult.rows[0];
    const user = await User.findById(resetRow.user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query(`UPDATE auth_users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
      passwordHash,
      user.id,
    ]);
    await pool.query(`UPDATE password_reset_tokens SET is_used = TRUE, used_at = NOW() WHERE id = $1`, [resetRow.id]);

    await safeRedisDel(`refresh:${user.id}`);
    await pool.query(
      `UPDATE refresh_tokens
       SET is_revoked = TRUE, revoked_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND is_revoked = FALSE`,
      [user.id]
    );

    await writeAuditLog({
      userId: user.id,
      eventType: 'PASSWORD_RESET_SUCCESS',
      status: 'SUCCESS',
      ipAddress: ip,
      userAgent: ua,
    });

    return res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Đặt lại mật khẩu thất bại' });
  }
};
