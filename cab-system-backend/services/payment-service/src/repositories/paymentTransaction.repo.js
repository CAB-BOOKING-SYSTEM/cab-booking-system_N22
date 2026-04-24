const db = require("../config/db");

const Transaction = {
  create: async (data) => {
    const res = await db.pool.query(
      `INSERT INTO payment_transactions
      (payment_id, provider, amount, status, created_at)
      VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [data.payment_id, data.provider, data.amount, data.status]
    );
    return res.rows[0];
  },

  update: async (data) => {
    await db.pool.query(
      `UPDATE payment_transactions
       SET status=$1, provider_txn_id=$2, error_code=$3
       WHERE id=$4`,
      [data.status, data.provider_txn_id, data.error_code, data.id]
    );
  },

  findLatestByPaymentId: async (paymentId) => {
    const res = await db.pool.query(
      `SELECT * FROM payment_transactions 
       WHERE payment_id=$1 ORDER BY id DESC LIMIT 1`,
      [paymentId]
    );
    return res.rows[0];
  },
};

module.exports = Transaction;