//D:\bc_cki_new1\cab-booking-system_N22\cab-system-backend\services\payment-service\src\repositories\paymentTransaction.repo.js
const db = require("../config/db");

const PaymentTransactionRepo = {
  create: async (data) => {
    const res = await db.pool.query(
      `INSERT INTO payment_transactions
        (payment_id, provider, amount, status, created_at)
       VALUES ($1,$2,$3,$4,NOW())
       RETURNING *`,
      [data.paymentId, data.provider, data.amount, data.status || "PENDING"]
    );
    return res.rows[0];
  },

  findLatestByPaymentId: async (paymentId) => {
    const res = await db.pool.query(
      `SELECT * FROM payment_transactions
       WHERE payment_id=$1
       ORDER BY id DESC LIMIT 1`,
      [paymentId]
    );
    return res.rows[0];
  },

  markSuccess: async (id, providerTxnId) => {
    const res = await db.pool.query(
      `UPDATE payment_transactions
       SET status='SUCCESS', provider_txn_id=$1
       WHERE id=$2 RETURNING *`,
      [providerTxnId, id]
    );
    return res.rows[0];
  },

  markFailed: async (id, errorCode) => {
    const res = await db.pool.query(
      `UPDATE payment_transactions
       SET status='FAILED', error_code=$1
       WHERE id=$2 RETURNING *`,
      [errorCode, id]
    );
    return res.rows[0];
  },
};

module.exports = PaymentTransactionRepo;