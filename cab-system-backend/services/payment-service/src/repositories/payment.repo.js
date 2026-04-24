const db = require("../config/db");

const Payment = {
  create: async (data) => {
    const res = await db.pool.query(
      `INSERT INTO payments 
      (booking_id, user_id, amount, currency, status, event_id, created_at)
      VALUES ($1,$2,$3,$4,'PENDING',$5,NOW()) RETURNING *`,
      [
        data.bookingId,
        data.userId,
        data.amount,
        data.currency || "VND",
        data.eventId,
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

  update: async (id, status) => {
    await db.pool.query(
      "UPDATE payments SET status=$1, updated_at=NOW() WHERE id=$2",
      [status, id]
    );
  },
};

module.exports = Payment;