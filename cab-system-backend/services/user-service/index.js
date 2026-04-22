require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ========== BẮT LỖI TOÀN CỤC ==========
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

// ========== CẤU HÌNH DATABASE ==========
const dbUrl = process.env.DB_URL;
console.log(
  "🔍 DB_URL from env:",
  dbUrl ? "✅ Loaded" : "❌ NOT FOUND, using default",
);

const pool = new Pool({
  connectionString:
    dbUrl || "postgresql://admin:password123@postgres:5432/user_db",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ========== KIỂM TRA KẾT NỐI DATABASE (VỚI RETRY) ==========
const testConnection = async (maxRetries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      console.log("✅ Database connected successfully");
      client.release();
      return true;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(
          "❌ Database connection failed after",
          maxRetries,
          "attempts",
        );
        return false;
      }
      console.warn(
        `⏳ Attempt ${attempt}/${maxRetries} failed, retrying in ${delay / 1000}s...`,
      );
      console.warn(`   Error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// ========== KHỞI TẠO DATABASE & BẢNG (VỚI RETRY) ==========
const initDatabase = async (maxRetries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await pool.connect();

      // Tạo bảng users
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          phone_number VARCHAR(20) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE,
          role VARCHAR(20) DEFAULT 'RIDER',
          status VARCHAR(20) DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Table "users" created/verified');

      // Tạo bảng saved_locations
      await client.query(`
        CREATE TABLE IF NOT EXISTS saved_locations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          label VARCHAR(50) NOT NULL,
          address TEXT NOT NULL,
          lat DECIMAL(10,8),
          lng DECIMAL(11,8),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Table "saved_locations" created/verified');

      // Tạo indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_locations_user_id ON saved_locations(user_id);
      `);
      console.log("✅ Indexes created/verified");
      return true;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error("❌ Init database failed after", maxRetries, "attempts");
        return false;
      }
      console.warn(
        `⏳ DB Init attempt ${attempt}/${maxRetries} failed, retrying in ${delay / 1000}s...`,
      );
      console.warn(`   Error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } finally {
      if (client) client.release();
    }
  }
};

// Khởi tạo database
(async () => {
  await testConnection();
  await initDatabase();
})();

// ========== HEALTH CHECK ==========
app.get("/health", (req, res) => {
  res.json({
    service: "user-service",
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

// ========== UTILS: MASKING DỮ LIỆU NHẠY CẢM ==========
const maskPhoneNumber = (phone) => {
  if (!phone) return null;
  return phone.slice(0, 3) + "****" + phone.slice(-3);
};

const maskEmail = (email) => {
  if (!email) return null;
  const [name, domain] = email.split("@");
  return name[0] + "***@" + domain;
};

// --- API 1: TẠO MỚI USER (Đăng ký cơ bản) ---
app.post("/api/v1/users", async (req, res) => {
  try {
    const { full_name, phone_number, email, role } = req.body;
    const result = await pool.query(
      "INSERT INTO users (full_name, phone_number, email, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, status",
      [full_name, phone_number, email, role || "CUSTOMER"],
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 2: XEM PROFILE (Có Masking) ==========
app.get("/api/v1/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let user = result.rows[0];
    user.phone_number = maskPhoneNumber(user.phone_number);
    user.email = maskEmail(user.email);

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Get user error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 2B: CẬP NHẬT PROFILE USER ==========
app.patch("/api/v1/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email } = req.body;

    const oldResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    if (oldResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const oldUser = oldResult.rows[0];
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${paramIndex}`);
      updateValues.push(full_name);
      paramIndex++;
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(email);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    updateValues.push(id);
    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, updateValues);
    const newUser = result.rows[0];

    res.json({
      success: true,
      data: newUser,
      audit: {
        previousValues: { full_name: oldUser.full_name, email: oldUser.email },
        newValues: { full_name: newUser.full_name, email: newUser.email },
      },
    });
  } catch (error) {
    console.error("Update user error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 3: QUẢN LÝ ĐỊA ĐIỂM ==========
app.post("/api/v1/users/:id/locations", async (req, res) => {
  try {
    const { id } = req.params;
    const { label, address, lat, lng } = req.body;
    const result = await pool.query(
      "INSERT INTO saved_locations (user_id, label, address, lat, lng) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [id, label, address, lat, lng],
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Create location error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 3B: LẤY DANH SÁCH ĐỊA ĐIỂM ==========
app.get("/api/v1/users/:id/locations", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM saved_locations WHERE user_id = $1 ORDER BY created_at DESC",
      [id],
    );
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error("Get locations error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 3C: XÓA ĐỊA ĐIỂM ==========
app.delete("/api/v1/users/:id/locations/:locationId", async (req, res) => {
  try {
    const { id, locationId } = req.params;
    const result = await pool.query(
      "DELETE FROM saved_locations WHERE id = $1 AND user_id = $2 RETURNING *",
      [locationId, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    res.json({
      success: true,
      message: "Location deleted",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Delete location error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 4: BAN/UNBAN USER ==========
app.patch("/api/v1/users/:id/ban", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, reasonDescription } = req.body;

    if (!["BANNED", "ACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Only BANNED or ACTIVE allowed",
      });
    }

    const oldResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    if (oldResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const oldUser = oldResult.rows[0];
    const result = await pool.query(
      "UPDATE users SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );
    const newUser = result.rows[0];

    if (status === "BANNED") {
      const event = {
        eventId: `evt_${Date.now()}_${Math.random()}`,
        eventName: "user.account_banned",
        timestamp: new Date().toISOString(),
        sourceService: "user-service",
        userId: id,
        data: {
          userId: id,
          phoneNumber: newUser.phone_number,
          fullName: newUser.full_name,
          email: newUser.email,
          role: newUser.role,
          banReason: reason || "ADMIN_ACTION",
          banReasonDescription:
            reasonDescription || "Tài khoản đã bị khóa bởi quản trị viên",
          bannedAt: new Date().toISOString(),
          previousStatus: oldUser.status,
          newStatus: status,
        },
      };
      console.log("Event user.account_banned:", event);
    }

    res.json({
      success: true,
      data: newUser,
      message:
        status === "BANNED" ? "User account banned" : "User account restored",
    });
  } catch (error) {
    console.error("Ban user error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 5: ADMIN LẤY DANH SÁCH USER ==========
app.get("/api/v1/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const role = req.query.role;

    const offset = (page - 1) * limit;
    let query =
      "SELECT id, full_name, phone_number, email, role, status, created_at FROM users WHERE 1=1";
    let countQuery = "SELECT COUNT(*) FROM users WHERE 1=1";
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      countQuery += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (role) {
      query += ` AND role = $${paramIndex}`;
      countQuery += ` AND role = $${paramIndex}`;
      queryParams.push(role);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const [usersResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)),
    ]);

    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: usersResult.rows,
      pagination: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: page,
        limit: limit,
      },
    });
  } catch (error) {
    console.error("Get users error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`✅ User Service is running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api/v1`);
});
