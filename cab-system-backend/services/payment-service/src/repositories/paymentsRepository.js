const pool = require("../config/db");
const Payment = require("../models/payment");

class PaymentsRepository {
  // Tạo payment mới với status PENDING
  async create({ ride_id, user_id, amount, provider }) {
    const result = await pool.query(
      `INSERT INTO payments (ride_id, user_id, amount, status, retry_count, provider)
       VALUES ($1::integer, $2::integer, $3, $4, $5, $6)
       RETURNING *`,
      [ride_id, user_id, amount, "PENDING", 0, provider]
    );
    return new Payment(result.rows[0]);
  }

  async update(payment) {
    const result = await pool.query(
      `UPDATE payments
       SET status = $1,
           retry_count = $2,
           transaction_id = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [payment.status, payment.retry_count, payment.transaction_id, payment.id]
    );
    return new Payment(result.rows[0]);
  }

  async findByRideId(rideId) {
    const result = await pool.query(
      `SELECT * FROM payments WHERE ride_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [rideId]
    );
    if (!result.rows[0]) return null;
    return new Payment(result.rows[0]);
  }

  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM payments WHERE id = $1`,
      [id]
    );
    if (!result.rows[0]) return null;
    return new Payment(result.rows[0]);
  }
}

module.exports = new PaymentsRepository();