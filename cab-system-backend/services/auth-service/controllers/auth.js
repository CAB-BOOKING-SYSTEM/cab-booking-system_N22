// controllers/auth.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import redisClient from "../core/redis.js";
import User from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const VALID_ROLES = ["CUSTOMER", "DRIVER", "ADMIN", "SUPER_ADMIN"];

const normalizeRole = (role) => {
  if (!role) return "CUSTOMER";
  const r = String(role).toUpperCase().trim();
  if (r === "USER") return "CUSTOMER";
  return VALID_ROLES.includes(r) ? r : "CUSTOMER";
};

// Helper: Tạo Access Token
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES },
  );
};

// Helper: Tạo Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign({ sub: userId }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
};

// Helper: Blacklist token
const blacklistToken = async (token, expiresInSeconds) => {
  if (!token) return;
  await redisClient.set(`blacklist:${token}`, "1", { EX: Math.max(1, expiresInSeconds) });
};

// Helper: Kiểm tra token có bị blacklist không
const isBlacklisted = async (token) => {
  const exists = await redisClient.exists(`blacklist:${token}`);
  return exists === 1;
};

// ====================== REGISTER ======================
export const register = async (req, res) => {
  try {
    const { email, username, password, role } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Kiểm tra email tồn tại
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo user
    const newUser = await User.create({
      email,
      username,
      password: hashedPassword,
      role: normalizeRole(role),
    });

    res.status(201).json({
      message: "User registered successfully.",
      user: { id: newUser.id, email: newUser.email, role: newUser.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ====================== LOGIN ======================
export const login = async (req, res) => {
  try {
    const { email, password, appType } = req.body;
    const normalizedEmail = String(email || "").toLowerCase().trim();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findByEmail(normalizedEmail);
    // Lưu ý: User.findByEmail trả về password trong field 'password' theo model hiện tại
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Account is not active" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Tạo tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    // Lưu refresh token vào Redis
    await redisClient.set(
      `refresh:${user.id}`,
      refreshToken,
      { EX: 7 * 24 * 60 * 60 }, // 7 ngày
    );

    // Set Refresh Token vào HttpOnly Cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await User.updateLastLogin(user.id).catch(() => { });

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken, // Để mobile app dễ lấy nếu không dùng cookie
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ====================== REFRESH TOKEN (với Rotation) ======================
export const refresh = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    // Kiểm tra blacklist
    if (await isBlacklisted(oldRefreshToken)) {
      return res.status(401).json({ message: "Refresh token has been revoked" });
    }

    // Verify refresh token
    const decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET);
    const userId = decoded.sub;

    // Lấy refresh token hiện tại từ Redis
    const currentRefreshInRedis = await redisClient.get(`refresh:${userId}`);
    if (!currentRefreshInRedis || currentRefreshInRedis !== oldRefreshToken) {
      return res.status(401).json({ message: "Invalid or reused refresh token" });
    }

    // Lấy thông tin user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // === TOKEN ROTATION ===
    const decodedOld = jwt.decode(oldRefreshToken);
    const ttl = Math.floor((decodedOld.exp * 1000 - Date.now()) / 1000);
    if (ttl > 0) {
      await blacklistToken(oldRefreshToken, ttl);
    }

    // Tạo token mới
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user.id);

    // Cập nhật refresh token mới vào Redis
    await redisClient.set(`refresh:${user.id}`, newRefreshToken, {
      EX: 7 * 24 * 60 * 60,
    });

    // Set cookie mới
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Refresh token expired" });
    }
    console.error(error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

// ====================== LOGOUT ======================
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(" ")[1];

    if (accessToken) {
      try {
        const decodedAccess = jwt.decode(accessToken);
        const ttl = Math.floor((decodedAccess.exp * 1000 - Date.now()) / 1000);
        if (ttl > 0) {
          await blacklistToken(accessToken, ttl);
        }
      } catch (e) {}
    }

    if (refreshToken) {
      try {
        const decodedRefresh = jwt.decode(refreshToken);
        const ttl = Math.floor((decodedRefresh.exp * 1000 - Date.now()) / 1000);
        if (ttl > 0) {
          await blacklistToken(refreshToken, ttl);
        }
      } catch (e) {}

      const decoded = jwt.decode(refreshToken);
      const userId = decoded?.sub;
      if (userId) {
        await redisClient.del(`refresh:${userId}`);
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Logout failed" });
  }
};
