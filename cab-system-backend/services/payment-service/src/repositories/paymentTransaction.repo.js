const db = require("../config/db");

module.exports = {
  create: async ({ payment_id, provider, amount, status }) => {
    const res = await db.pool.query(
      `INSERT INTO payment_transactions 
       (payment_id, provider, amount, status, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [payment_id, provider, amount, status]
    );
    return res.rows[0];
  },

  update: async ({ id, status, provider_txn_id, error_code }) => {
    await db.pool.query(
      `UPDATE payment_transactions
       SET status = $1,
           provider_txn_id = $2,
           error_code = $3
       WHERE id = $4`,
      [status, provider_txn_id, error_code, id]
    );
  },

  findLatestByPaymentId: async (paymentId) => {
    const res = await db.pool.query(
      `SELECT * FROM payment_transactions 
       WHERE payment_id = $1 
       ORDER BY created_at DESC LIMIT 1`,
      [paymentId]
    );
    return res.rows[0];
  }
};