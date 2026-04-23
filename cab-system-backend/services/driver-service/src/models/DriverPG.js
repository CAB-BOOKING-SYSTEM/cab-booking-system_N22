const { getPGPool } = require('../config/database');

class DriverPG {
  static async create(driverData) {
    const pool = getPGPool();
    const query = `
      INSERT INTO drivers (driver_id, auth_user_id, phone, email, full_name, license_plate, vehicle_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      driverData.driver_id,
      driverData.auth_user_id,
      driverData.phone,
      driverData.email,
      driverData.full_name,
      driverData.license_plate,
      driverData.vehicle_type,
      'offline'
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByAuthUserId(authUserId) {
    const pool = getPGPool();
    const query = `SELECT * FROM drivers WHERE auth_user_id = $1`;
    const result = await pool.query(query, [authUserId]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const pool = getPGPool();
    const query = `SELECT * FROM drivers WHERE email = $1`;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async updateStatus(driverId, status) {
    const pool = getPGPool();
    const query = `
      UPDATE drivers 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE driver_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, driverId]);
    return result.rows[0];
  }
}

module.exports = DriverPG;