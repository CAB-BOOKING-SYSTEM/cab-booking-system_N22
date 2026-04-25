require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const mtls = require("../../../../shared/mtls.cjs");

const app = express();
app.use(express.json());

// ========== CẤU HÌNH DATABASE ==========
const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "password123",
  database: process.env.DB_NAME || "user_db",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL successfully");
    client.release();
    return true;
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
    return false;
  }
};

const initDatabase = async () => {
  try {
    const initSqlPath = path.join(__dirname, "init.sql");
    if (!fs.existsSync(initSqlPath)) {
      console.warn("⚠️ init.sql not found, skipping initialization");
      return true;
    }
    const sql = fs.readFileSync(initSqlPath, "utf8");
    await pool.query(sql);
    console.log("✅ Database schema initialized");
    return true;
  } catch (err) {
    console.error("❌ Database initialization error:", err.message);
    return false;
  }
};

// ========== HEALTH CHECK ==========
app.get("/health", (req, res) => {
  res.json({
    status: "UP",
    service: "user-service",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1/health", (req, res) => {
  res.json({
    service: "user-service",
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

// ========== UTILS ==========
const maskPhoneNumber = (phone) => {
  if (!phone) return null;
  return phone.slice(0, 3) + "****" + phone.slice(-3);
};

const maskEmail = (email) => {
  if (!email) return null;
  const [name, domain] = email.split("@");
  return name[0] + "***@" + domain;
};

// ========== INTERNAL ENDPOINT ==========
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || "cab-internal-2024";

app.post("/internal/users", async (req, res) => {
  try {
    const { full_name, phone_number, email, role } = req.body;
    const internalSecret = req.headers["x-internal-secret"];
    if (internalSecret !== INTERNAL_SECRET) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(200).json({ success: true, message: "User already exists", data: existingUser.rows[0] });
    }

    const result = await pool.query(
      "INSERT INTO users (full_name, phone_number, email, role, status) VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING id, full_name, phone_number, email, role",
      [full_name, phone_number || `090000000${Date.now() % 100000}`, email, role || "RIDER"]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 1: TẠO MỚI USER ==========
app.post("/api/v1/users", async (req, res) => {
  try {
    const { full_name, phone_number, email, role } = req.body;
    if (!full_name || !phone_number) {
      return res.status(400).json({ success: false, error: "full_name and phone_number are required" });
    }
    const result = await pool.query(
      "INSERT INTO users (full_name, phone_number, email, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [full_name, phone_number, email, role || "RIDER"]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(error.code === "23505" ? 409 : 500).json({ success: false, error: error.message });
  }
});

// ========== API 2: XEM PROFILE (CÓ RBAC & OWNERSHIP) ==========
app.get("/api/v1/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.headers['x-user-id'];
    const requesterRole = req.headers['x-user-role'];

    if (requesterRole !== 'admin' && String(requesterId) !== String(id)) {
      return res.status(403).json({ success: false, message: "Access denied. You can only access your own profile." });
    }

    if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid user ID" });

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });

    let user = result.rows[0];
    user.phone_number = maskPhoneNumber(user.phone_number);
    user.email = maskEmail(user.email);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 2B: CẬP NHẬT PROFILE (CÓ RBAC & OWNERSHIP) ==========
app.patch("/api/v1/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email } = req.body;
    const requesterId = req.headers['x-user-id'];
    const requesterRole = req.headers['x-user-role'];

    if (requesterRole !== 'admin' && String(requesterId) !== String(id)) {
      return res.status(403).json({ success: false, message: "Access denied. Cannot update other user's profile." });
    }

    const oldResult = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (oldResult.rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });

    const oldUser = oldResult.rows[0];
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (full_name) { updateFields.push(`full_name = $${paramIndex}`); updateValues.push(full_name); paramIndex++; }
    if (email) { updateFields.push(`email = $${paramIndex}`); updateValues.push(email); paramIndex++; }

    if (updateFields.length === 0) return res.status(400).json({ success: false, message: "No fields to update" });

    updateValues.push(id);
    const query = `UPDATE users SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, updateValues);
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 3: QUẢN LÝ ĐỊA ĐIỂM (CÓ OWNERSHIP) ==========
app.post("/api/v1/users/:id/locations", async (req, res) => {
  try {
    const { id } = req.params;
    const { label, address, lat, lng } = req.body;
    const requesterId = req.headers['x-user-id'];

    if (String(requesterId) !== String(id)) {
      return res.status(403).json({ success: false, message: "Access denied. Cannot manage locations for other users." });
    }

    const result = await pool.query(
      "INSERT INTO saved_locations (user_id, label, address, lat, lng) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [id, label, address, lat, lng]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/v1/users/:id/locations", async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.headers['x-user-id'];

    if (String(requesterId) !== String(id)) {
      return res.status(403).json({ success: false, message: "Access denied. Cannot manage locations for other users." });
    }

    const result = await pool.query("SELECT * FROM saved_locations WHERE user_id = $1", [id]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 4: BAN/UNBAN (ADMIN ONLY) ==========
app.patch("/api/v1/users/:id/ban", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const requesterRole = req.headers['x-user-role'];

    if (requesterRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied. Admin role required." });
    }

    const result = await pool.query("UPDATE users SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
    res.status(200).json({ success: true, data: result.rows[0], message: "Status updated" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API 5: DANH SÁCH USER (ADMIN ONLY) ==========
app.get("/api/v1/users", async (req, res) => {
  try {
    const requesterRole = req.headers['x-user-role'];
    if (requesterRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied. Admin role required." });
    }

    const result = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3009;
const startServer = async () => {
  if (await testConnection() && await initDatabase()) {
    const server = mtls.createServer(app);
    server.listen(PORT, () => console.log(`✅ User Service running on port ${PORT}`));
  }
};
startServer();

// Error handlers
app.use((req, res) => res.status(404).json({ success: false, error: "Endpoint not found" }));
app.use((err, req, res, next) => res.status(500).json({ success: false, error: err.message }));