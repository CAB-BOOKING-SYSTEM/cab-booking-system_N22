//D:\bc_cki_new1\cab-booking-system_N22\cab-system-backend\services\payment-service\src\repositories\payment.repo.js
const db = require("../config/db");

const PaymentRepo = {
  create: async (data) => {
    const res = await db.pool.query(
      `INSERT INTO payments
        (booking_id, user_id, driver_id, amount, driver_amount,
         currency, payment_method, status, event_id, idempotency_key, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
       RETURNING *`,
      [
        data.bookingId,
        data.userId,
        data.driverId || null,
        data.amount,
        data.driverAmount,
        data.currency || "VND",
        data.paymentMethod,
        data.status || "PENDING",
        data.eventId || null,
        data.idempotencyKey || null,
      ]
    );
    return res.rows[0];
  },

  findByBookingId: async (bookingId) => {
    const res = await db.pool.query(
      "SELECT * FROM payments WHERE booking_id=$1",
      [bookingId]
    );
    return res.rows[0];
  },

  updateStatus: async (id, status) => {
    const res = await db.pool.query(
      `UPDATE payments SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, id]
    );
    return res.rows[0];
  },

  updateDriver: async (bookingId, driverId) => {
    const res = await db.pool.query(
      `UPDATE payments SET driver_id=$1 WHERE booking_id=$2 RETURNING *`,
      [driverId, bookingId]
    );
    return res.rows[0];
  },
};

module.exports = PaymentRepo;