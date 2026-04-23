//D:\bc_bigdata\cab-booking-system_N22\cab-system-backend\services\payment-service\src\utils\audit.jsconst db = require("../config/db");

// src/utils/audit.js
const db = require("../config/db");

const logAudit = async (action, data) => {
  try {
    await db.pool.query(
      "INSERT INTO audit_logs(action, data, created_at) VALUES($1,$2,NOW())",
      [action, JSON.stringify(data)]
    );
  } catch (err) {
    // Audit không được làm crash main flow
    console.error("⚠️ Audit log failed:", err.message);
  }
};

module.exports = logAudit;