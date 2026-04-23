//D:\bc_bigdata\cab-booking-system_N22\cab-system-backend\services\payment-service\src\config\db.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DB_URL,
});

const connectDB = async (retries = 5) => {
  while (retries) {
    try {
      const client = await pool.connect();
      console.log("✅ PostgreSQL connected");
      client.release();
      return;
    } catch (err) {
      console.log("⏳ DB not ready, retrying...");
      retries--;
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  console.error("❌ Cannot connect to DB, continue without DB");
};
module.exports = { pool, connectDB };
