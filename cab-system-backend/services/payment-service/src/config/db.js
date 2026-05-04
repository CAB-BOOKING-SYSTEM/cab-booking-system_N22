//D:\bc_cki_new3\cab-booking-system_N22\cab-system-backend\services\payment-service\src\config\db.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DB_URL,
});

const connectDB = async () => {
  try {
    await pool.connect();
    console.log("✅ PostgreSQL connected");
  } catch (err) {
    console.error("❌ DB error:", err.message);
  }
};

module.exports = { pool, connectDB };