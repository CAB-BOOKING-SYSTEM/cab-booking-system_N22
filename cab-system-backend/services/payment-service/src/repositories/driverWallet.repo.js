//D:\bc_cki_new1\cab-booking-system_N22\cab-system-backend\services\payment-service\src\repositories\driverWallet.repo.js
const db = require("../config/db");

const DriverWalletRepo = {
  credit: async (driverId, amount, bookingId) => {
    await db.pool.query(
      `INSERT INTO driver_wallets (driver_id, balance)
       VALUES ($1, 0)
       ON CONFLICT (driver_id) DO NOTHING`,
      [driverId]
    );

    const res = await db.pool.query(
      `UPDATE driver_wallets
       SET balance = balance + $1, updated_at = NOW()
       WHERE driver_id = $2
       RETURNING *`,
      [amount, driverId]
    );

    await db.pool.query(
      `INSERT INTO driver_wallet_transactions (driver_id, booking_id, amount)
       VALUES ($1, $2, $3)`,
      [driverId, bookingId, amount]
    );

    return res.rows[0];
  },

  getBalance: async (driverId) => {
    const res = await db.pool.query(
      "SELECT * FROM driver_wallets WHERE driver_id=$1",
      [driverId]
    );
    return res.rows[0];
  },
};

module.exports = DriverWalletRepo;