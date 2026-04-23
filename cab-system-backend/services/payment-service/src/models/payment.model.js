//D:\bc_bigdata\cab-booking-system_N22\cab-system-backend\services\payment-service\src\models\payment.model.js
const db = require("../config/db");

const Payment = {

  create: async (data) => {
    const res = await db.pool.query(
      `INSERT INTO payments 
      (ride_id, user_id, booking_id, amount, status, created_at)
      VALUES ($1,$2,$3,$4,'PENDING',NOW()) RETURNING *`,
      [data.rideId, data.userId, data.bookingId, data.amount]
    );
    return res.rows[0];
  },

  findByRideId: async (rideId) => {
    const res = await db.pool.query(
      "SELECT * FROM payments WHERE ride_id=$1",
      [rideId]
    );
    return res.rows[0];
  },

  update: async (id, status) => {
    await db.pool.query(
      "UPDATE payments SET status=$1 WHERE id=$2",
      [status, id]
    );
  },

  increaseRetry: async (id) => {
    await db.pool.query(
      "UPDATE payments SET retry_count = retry_count + 1 WHERE id=$1",
      [id]
    );
  }
};

module.exports = Payment;