require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const mtls = require("../../../shared/mtls.cjs");

const app = express();

// Middleware - CORS Configuration for Gateway
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://gateway:3000",
    "https://gateway:3000",
    "http://localhost:3009",
    "http://user-service:3009",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
const testConnection = async (maxRetries = 20, delay = 3000) => {
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
const initDatabase = async (maxRetries = 20, delay = 3000) => {
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

// ========== HEALTH CHECK ==========
app.get("/health", (req, res) => {
  res.json({
    service: "user-service",
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

// ========== GATEWAY HEALTH CHECK ==========
app.get("/api/v1/health", (req, res) => {
  res.json({
    service: "user-service",
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

// ========== UTILS: SANITIZE XSS & MASKING ==========
const escapeHtml = (text) => {
  if (!text) return text;
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
};

const validateInput = (input) => {
  // Kiểm tra XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /on\w+\s*=/gi,  // onclick=, onerror=, etc
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  for (let pattern of xssPatterns) {
    if (pattern.test(input)) {
      return false; // Contains XSS attempt
    }
  }
  return true;
};

const maskPhoneNumber = (phone) => {
  if (!phone) return null;
  return phone.slice(0, 3) + "****" + phone.slice(-3);
};

const maskEmail = (email) => {
  if (!email) return null;
  const [name, domain] = email.split("@");
  return name[0] + "***@" + domain;
};

// ========== MIDDLEWARE: REQUIRE ADMIN ROLE ==========
const requireAdmin = (req, res, next) => {
  try {
    // Check if user is authenticated via x-user-role header (from gateway)
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];

    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required. User ID or role header missing."
      });
    }

    // Check if user has ADMIN role
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message: "Admin access required. Your role does not have permission to access this resource."
      });
    }

    // Attach user info to request for logging
    req.adminUser = { id: userId, role: userRole };
    next();
  } catch (error) {
    console.error("Admin middleware error:", error.message);
    res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Internal server error during authorization check"
    });
  }
};

// ============================================================
// 🔥 INTERNAL ENDPOINT CHO AUTH SERVICE SYNC USER
// ============================================================
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || "cab-internal-2024";

app.post("/internal/users", async (req, res) => {
  try {
    const { full_name, phone_number, email, role } = req.body;
    
    // Kiểm tra secret key (bảo mật)
    const internalSecret = req.headers["x-internal-secret"];
    if (internalSecret !== INTERNAL_SECRET) {
      console.warn(`❌ Internal auth failed: invalid secret`);
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    // Validate required fields
    if (!full_name || !email) {
      return res.status(400).json({ 
        success: false, 
        error: "full_name and email are required" 
      });
    }

    // Kiểm tra user đã tồn tại chưa
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log(`📝 User already exists in User Service: ${email}`);
      return res.status(200).json({ 
        success: true, 
        message: "User already exists", 
        data: existingUser.rows[0] 
      });
    }

    // Tạo user mới
    const result = await pool.query(
      `INSERT INTO users (full_name, phone_number, email, role, status) 
       VALUES ($1, $2, $3, $4, 'ACTIVE') 
       RETURNING id, full_name, phone_number, email, role`,
      [full_name, phone_number || `090000000${Date.now() % 100000}`, email, role || "RIDER"]
    );
    
    console.log(`✅ Internal: User created in User Service: ${email} (${role})`);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Internal create user error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 1: TẠO MỚI USER ==========
app.post("/api/v1/users", async (req, res) => {
  try {
    const { full_name, phone_number, email, role } = req.body;

    // Validation
    if (!full_name || !phone_number) {
      return res.status(400).json({
        success: false,
        error: "full_name and phone_number are required",
      });
    }

    // XSS Protection: Validate input
    if (!validateInput(full_name)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid characters detected in full_name (XSS attempt blocked)" 
      });
    }

    if (!validateInput(phone_number)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid characters detected in phone_number" 
      });
    }

    if (email && !validateInput(email)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid characters detected in email" 
      });
    }

    // Sanitize input
    const sanitizedName = escapeHtml(full_name.trim());
    const sanitizedPhone = phone_number.trim();
    const sanitizedEmail = email ? email.trim() : null;

    const result = await pool.query(
      "INSERT INTO users (full_name, phone_number, email, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, phone_number, email, role, status, created_at",
      [sanitizedName, sanitizedPhone, sanitizedEmail, role || "RIDER"],
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create user error:", error.message);
    const statusCode = error.code === "23505" ? 409 : 500;
    const message =
      error.code === "23505"
        ? "Phone number or email already exists"
        : error.message;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

// ========== API 2: XEM PROFILE (Có Masking) ==========
app.get("/api/v1/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validation
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let user = result.rows[0];
    user.phone_number = maskPhoneNumber(user.phone_number);
    user.email = maskEmail(user.email);

    res.status(200).json({ success: true, data: user });
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

    // Validation
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
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
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (full_name !== undefined && full_name !== null) {
      updateFields.push(`full_name = $${paramIndex}`);
      updateValues.push(full_name);
      paramIndex++;
    }

    if (email !== undefined && email !== null) {
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
    const query = `UPDATE users SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, updateValues);
    const newUser = result.rows[0];

    res.status(200).json({
      success: true,
      data: newUser,
      audit: {
        previousValues: { full_name: oldUser.full_name, email: oldUser.email },
        newValues: { full_name: newUser.full_name, email: newUser.email },
      },
    });
  } catch (error) {
    console.error("Update user error:", error.message);
    const statusCode = error.code === "23505" ? 409 : 500;
    const message =
      error.code === "23505" ? "Email already exists" : error.message;
    res.status(statusCode).json({ success: false, error: message });
  }
});

// ========== API 3: QUẢN LÝ ĐỊA ĐIỂM ==========
app.post("/api/v1/users/:id/locations", async (req, res) => {
  try {
    const { id } = req.params;
    const { label, address, lat, lng } = req.body;

    // Validation
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    if (!label || !address) {
      return res.status(400).json({
        success: false,
        error: "label and address are required",
      });
    }

    // Check if user exists
    const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [
      id,
    ]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

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

    // Validation
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    const result = await pool.query(
      "SELECT * FROM saved_locations WHERE user_id = $1 ORDER BY created_at DESC",
      [id],
    );
    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Get locations error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 3C: XÓA ĐỊA ĐIỂM ==========
app.delete("/api/v1/users/:id/locations/:locationId", async (req, res) => {
  try {
    const { id, locationId } = req.params;

    // Validation
    if (isNaN(id) || isNaN(locationId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID or location ID",
      });
    }

    const result = await pool.query(
      "DELETE FROM saved_locations WHERE id = $1 AND user_id = $2 RETURNING *",
      [locationId, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    res.status(200).json({
      success: true,
      message: "Location deleted",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Delete location error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 4: BAN/UNBAN USER (ADMIN ONLY) ==========
app.patch("/api/v1/users/:id/ban", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, reasonDescription } = req.body;

    // Validation
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    if (!status || !["BANNED", "ACTIVE"].includes(status)) {
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
      "UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
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
          bannedByAdmin: req.adminUser.id,
        },
      };
      console.log("Event user.account_banned:", event);
    }

    res.status(200).json({
      success: true,
      data: newUser,
      message:
        status === "BANNED" ? "User account banned" : "User account restored",
      auditLog: {
        action: status === "BANNED" ? "USER_BANNED" : "USER_RESTORED",
        adminId: req.adminUser.id,
        targetUserId: id,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Ban user error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 5: ADMIN LẤY DANH SÁCH USER (ADMIN ONLY) ==========
app.get("/api/v1/users", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const role = req.query.role;

    // Validation
    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        error: "Page and limit must be positive integers",
      });
    }

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

    res.status(200).json({
      success: true,
      data: usersResult.rows,
      pagination: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: page,
        limit: limit,
      },
      auditLog: {
        action: "ADMIN_LIST_USERS",
        adminId: req.adminUser.id,
        filters: { status, role },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Get users error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3009;

const startServer = async () => {
  try {
    const connected = await testConnection();
    if (!connected) {
      console.error("❌ Failed to connect to database, exiting...");
      process.exit(1);
    }

    const initialized = await initDatabase();
    if (!initialized) {
      console.error("❌ Failed to initialize database, exiting...");
      process.exit(1);
    }

    console.log("✅ Database fully initialized, starting server...");

    const server = mtls.createServer(app);
    const protocol = mtls.getProtocol();

    server.listen(PORT, () => {
      console.log(`✅ User Service is running on ${protocol}://localhost:${PORT}`);
      console.log(`📡 API Base URL: ${protocol}://localhost:${PORT}/api/v1`);
      console.log(`🔗 Gateway Proxy: ${protocol}://gateway:3000/api/v1/users`);
      console.log(`🏥 Health Check: ${protocol}://localhost:${PORT}/health`);
      console.log(`🔐 Internal endpoint: ${protocol}://localhost:${PORT}/internal/users`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

// ========== ERROR HANDLING MIDDLEWARE ==========
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
    method: req.method,
  });
});