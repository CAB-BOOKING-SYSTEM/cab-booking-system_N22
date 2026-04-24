// controllers/auth.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import redisClient from "../core/redis.js";
import User from "../models/userModel.js";
import UserOtp from "../models/userOTP.js";
import axios from "axios";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

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
  await redisClient.set(`blacklist:${token}`, "1", { EX: expiresInSeconds });
};

// Helper: Kiểm tra token có bị blacklist không
const isBlacklisted = async (token) => {
  const exists = await redisClient.exists(`blacklist:${token}`);
  return exists === 1;
};

// ====================== REGISTER ======================
export const register = async (req, res) => {
  try {
    const { email, username, password, role = "customer" } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Kiểm tra email tồn tại
    const existingUser = await User.findByEmail(email); // bạn cần implement method này
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo user (implement trong model)
    const newUser = await User.create({
      email,
      username,
      password: hashedPassword,
      role: ["customer", "driver", "admin"].includes(role) ? role : "customer",
    });
    // 🔥 THÊM ĐOẠN NÀY: Tạo driver tự động nếu role = driver
    if (role === "driver") {
      try {
        const driverServiceUrl = process.env.DRIVER_SERVICE_URL || "http://cab_driver:3003";
        
        await axios.post(`${driverServiceUrl}/api/drivers/internal/create`, {
          driverId: String(newUser.id),
          email: email,
          phone: "",
          fullName: username,
          vehicleType: "4_seat",
          licensePlate: `TEMP${String(newUser.id).padStart(5, "0")}`
        });
        
        console.log(`✅ Auto-created driver for user ${newUser.id} (${email})`);
      } catch (driverError) {
        console.error(`❌ Failed to auto-create driver:`, driverError.message);
      }
    }

    res.status(201).json({
      message:
        "User registered successfully. Please verify your email if needed.",
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
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Tạo tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    // Lưu refresh token vào Redis (để dễ quản lý rotation & revocation)
    await redisClient.set(
      `refresh:${user.id}`,
      refreshToken,
      { EX: 7 * 24 * 60 * 60 }, // 7 ngày
    );

    // Set Refresh Token vào HttpOnly Cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    res.json({
      message: "Login successful",
      accessToken,
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
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    // Kiểm tra blacklist
    if (await isBlacklisted(oldRefreshToken)) {
      return res
        .status(401)
        .json({ message: "Refresh token has been revoked" });
    }

    // Verify refresh token
    const decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET);
    const userId = decoded.sub;

    // Lấy refresh token hiện tại từ Redis
    const currentRefreshInRedis = await redisClient.get(`refresh:${userId}`);
    if (!currentRefreshInRedis || currentRefreshInRedis !== oldRefreshToken) {
      return res
        .status(401)
        .json({ message: "Invalid or reused refresh token" });
    }

    // Lấy thông tin user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // === TOKEN ROTATION ===
    // Blacklist refresh token cũ ngay lập tức
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
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
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
    const refreshToken = req.cookies.refreshToken;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(" ")[1];

    // Blacklist Access Token (nếu có)
    if (accessToken) {
      try {
        const decodedAccess = jwt.decode(accessToken);
        const ttl = Math.floor((decodedAccess.exp * 1000 - Date.now()) / 1000);
        if (ttl > 0) {
          await blacklistToken(accessToken, ttl);
        }
      } catch (e) {}
    }

    // Blacklist & xóa Refresh Token
    if (refreshToken) {
      try {
        const decodedRefresh = jwt.decode(refreshToken);
        const ttl = Math.floor((decodedRefresh.exp * 1000 - Date.now()) / 1000);
        if (ttl > 0) {
          await blacklistToken(refreshToken, ttl);
        }
      } catch (e) {}

      // Xóa khỏi Redis
      const userId = jwt.decode(refreshToken)?.sub;
      if (userId) {
        await redisClient.del(`refresh:${userId}`);
      }
    }

    // Xóa cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Logout failed" });
  }
};
