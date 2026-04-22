import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import redisClient from '../core/redis.js';
import User from '../models/userModel.js';

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

// ====================== REGISTER ======================
export const register = async (req, res) => {
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
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    await redisClient.set(
      `refresh:${user.id}`,
      refreshToken,
      { EX: 7 * 24 * 60 * 60 }
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await User.updateLastLogin(user.id).catch(() => {});

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

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user.id);

    await redisClient.set(
      `refresh:${user.id}`,
      newRefreshToken,
      { EX: 7 * 24 * 60 * 60 }
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
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
  try {
    const refreshToken = req.cookies.refreshToken;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];

    if (accessToken) {
      try {
        const decodedAccess = jwt.decode(accessToken);
        const ttl = Math.floor((decodedAccess.exp * 1000 - Date.now()) / 1000);
        if (ttl > 0) await blacklistToken(accessToken, ttl);
      } catch (_) {}
    }

    if (refreshToken) {
      try {
        const decodedRefresh = jwt.decode(refreshToken);
        const ttl = Math.floor((decodedRefresh.exp * 1000 - Date.now()) / 1000);
        if (ttl > 0) await blacklistToken(refreshToken, ttl);
        const userId = jwt.decode(refreshToken)?.sub;
        if (userId) await redisClient.del(`refresh:${userId}`);
      } catch (_) {}
    }

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
