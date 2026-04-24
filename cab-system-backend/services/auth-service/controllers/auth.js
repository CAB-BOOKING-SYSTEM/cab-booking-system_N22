import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import redisClient from "../core/redis.js";
import User from "../models/userModel.js";
import axios from "axios";
import mtls from "../../../../shared/mtls.cjs";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const serviceAgent = mtls.createClientAgent();

// URLs for other services
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://cab_user:3009";
const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || "http://cab_driver:3003";
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || "cab-internal-2024";

const generateAccessToken = (user) =>
  jwt.sign(
    {
      sub: String(user.id),
      driver_id: user.driver_id || null,
      email: user.email,
      role: user.role,
      username: user.username,
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_EXPIRES,
      issuer: "auth-service",
      audience: "cab-booking-clients",
      jwtid: randomUUID(),
    },
  );

const generateRefreshToken = (userId) =>
  jwt.sign({ sub: String(userId) }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
    issuer: "auth-service",
    audience: "cab-booking-refresh",
    jwtid: randomUUID(),
  });

const blacklistToken = async (token, expiresInSeconds) => {
  if (!token) return;
  await redisClient.set(`blacklist:${token}`, "1", { EX: expiresInSeconds });
};

const isBlacklisted = async (token) => {
  const exists = await redisClient.exists(`blacklist:${token}`);
  return exists === 1;
};

// ============================================================
// HÀM SYNC USER VÀO USER SERVICE (CHO MỌI ROLE)
// ============================================================
async function syncUserToUserService(user) {
  try {
    // Map role từ Auth Service sang User Service
    let userServiceRole = "RIDER";
    if (user.role === "admin") userServiceRole = "ADMIN";
    if (user.role === "driver") userServiceRole = "DRIVER";
    
    const response = await axios.post(
      `${USER_SERVICE_URL}/internal/users`,
      {
        full_name: user.username,
        phone_number: user.phone_number || `090000000${user.id}`,
        email: user.email,
        role: userServiceRole,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": INTERNAL_SECRET,
        },
        timeout: 5000,
        ...(serviceAgent ? { httpsAgent: serviceAgent } : {})
      }
    );
    console.log(`✅ User synced to User Service: ${user.email} (role: ${user.role})`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to sync user to User Service:`, error.message);
    // Không throw lỗi để không ảnh hưởng đến việc tạo user trong Auth DB
    return null;
  }
}

// ============================================================
// HÀM TẠO DRIVER TRONG DRIVER SERVICE (CHỈ CHO ROLE DRIVER)
// ============================================================
async function createDriverInDriverService(user) {
  try {
    const response = await axios.post(
      `${DRIVER_SERVICE_URL}/api/drivers/internal/create`,
      {
        driverId: String(user.id),
        email: user.email,
        phone: user.phone_number || "",
        fullName: user.username,
        vehicleType: "4_seat",
        licensePlate: `TEMP${String(user.id).padStart(5, "0")}`,
      },
      {
        timeout: 5000,
        ...(serviceAgent ? { httpsAgent: serviceAgent } : {})
      }
    );
    console.log(`✅ Auto-created driver for user ${user.id} (${user.email})`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to auto-create driver:`, error.message);
    return null;
  }
}

// ============================================================
// REGISTER CONTROLLER
// ============================================================
export const register = async (req, res) => {
  try {
    const {
      email,
      username,
      password,
      role = "customer",
      phone_number = null,
      driver_status = null,
    } = req.body;
    let driver_id = req.body.driver_id || null;

    if (!email || !username || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedRole = User.normalizeRole(role);
    if (normalizedRole === "driver" && !driver_id) {
      driver_id = `DRV_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    if (driver_id) {
      const existingDriver = await User.findByDriverId(driver_id);
      if (existingDriver) {
        return res.status(409).json({ message: "driver_id already exists" });
      }
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email,
      username,
      phone_number,
      password: hashedPassword,
      role: normalizedRole,
      driver_id,
      driver_status,
    });

    // ============================================================
    // 🔥 QUAN TRỌNG: Sync user vào User Service (CHO MỌI ROLE)
    // ============================================================
    await syncUserToUserService(newUser);

    // ============================================================
    // Nếu là driver, tạo thêm trong Driver Service
    // ============================================================
    if (normalizedRole === "driver") {
      await createDriverInDriverService(newUser);
    }

    // ============================================================
    // Trả về response
    // ============================================================
    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        phone_number: newUser.phone_number,
        username: newUser.username,
        role: newUser.role,
        status: newUser.status,
        ...(newUser.role === 'driver' && {
          driver_id: newUser.driver_id,
          driver_status: newUser.driver_status
        })
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// LOGIN CONTROLLER
// ============================================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await User.unlockIfExpired(user.id);
    const refreshedUser = await User.findById(user.id);

    if (refreshedUser?.status === "LOCKED" && refreshedUser.locked_until) {
      return res.status(423).json({
        message: "Account temporarily locked due to failed login attempts",
        locked_until: refreshedUser.locked_until,
      });
    }

    if (refreshedUser && !refreshedUser.is_active) {
      return res.status(403).json({ message: "Account is not active" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await User.registerFailedLogin(user.id);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const loginUser = refreshedUser || user;
    const accessToken = generateAccessToken(loginUser);
    const refreshToken = generateRefreshToken(loginUser.id);
    const decodedAccessToken = jwt.decode(accessToken);

    await redisClient.set(`refresh:${loginUser.id}`, refreshToken, {
      EX: 7 * 24 * 60 * 60,
    });

    await User.updateSuccessfulLogin(loginUser.id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      token_payload: decodedAccessToken,
      user: {
        id: loginUser.id,
        email: loginUser.email,
        phone_number: loginUser.phone_number,
        username: loginUser.username,
        role: loginUser.role,
        status: loginUser.status,
        driver_id: loginUser.driver_id,
        driver_status: loginUser.driver_status,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// REFRESH CONTROLLER
// ============================================================
export const refresh = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    if (await isBlacklisted(oldRefreshToken)) {
      return res
        .status(401)
        .json({ message: "Refresh token has been revoked" });
    }

    const decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET, {
      issuer: "auth-service",
      audience: "cab-booking-refresh",
    });
    const userId = decoded.sub;

    const currentRefreshInRedis = await redisClient.get(`refresh:${userId}`);
    if (!currentRefreshInRedis || currentRefreshInRedis !== oldRefreshToken) {
      return res
        .status(401)
        .json({ message: "Invalid or reused refresh token" });
    }

    const user = await User.findById(userId);
    if (!user || !user.is_active) {
      return res.status(404).json({ message: "User not found or inactive" });
    }

    const decodedOld = jwt.decode(oldRefreshToken);
    const ttl = Math.floor((decodedOld.exp * 1000 - Date.now()) / 1000);
    if (ttl > 0) {
      await blacklistToken(oldRefreshToken, ttl);
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user.id);
    const decodedAccessToken = jwt.decode(newAccessToken);

    await redisClient.set(`refresh:${user.id}`, newRefreshToken, {
      EX: 7 * 24 * 60 * 60,
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Token refreshed successfully",
      access_token: newAccessToken,
      token_type: "Bearer",
      token_payload: decodedAccessToken,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Refresh token expired" });
    }
    console.error(error);
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

// ============================================================
// LOGOUT CONTROLLER
// ============================================================
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(" ")[1];

    if (accessToken) {
      try {
        const decodedAccess = jwt.decode(accessToken);
        const ttl = Math.floor((decodedAccess.exp * 1000 - Date.now()) / 1000);
        if (ttl > 0) {
          await blacklistToken(accessToken, ttl);
        }
      } catch {}
    }

    if (refreshToken) {
      try {
        const decodedRefresh = jwt.decode(refreshToken);
        const ttl = Math.floor((decodedRefresh.exp * 1000 - Date.now()) / 1000);
        if (ttl > 0) {
          await blacklistToken(refreshToken, ttl);
        }
      } catch {}

      const userId = jwt.decode(refreshToken)?.sub;
      if (userId) {
        await redisClient.del(`refresh:${userId}`);
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Logout failed" });
  }
};