//D:\bc_bigdata\cab-booking-system_N22\cab-system-backend\services\payment-service\src\utils\idempotency.js
const db = require("../config/db");

const checkDuplicate = async (key) => {
  const result = await db.pool.query(
    "SELECT * FROM payments WHERE idempotency_key = $1",
    [key]
  );

  return result.rows[0] || null;
};

module.exports = { checkDuplicate };