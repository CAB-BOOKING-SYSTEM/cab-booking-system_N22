const { query } = require('../config/dbConfig');

class Pricing {
  static async findAll() {
    const result = await query('SELECT * FROM pricings ORDER BY id');
    return result.rows;
  }

  static async findByVehicleType(vehicleType) {
    const result = await query(
      'SELECT * FROM pricings WHERE vehicle_type = $1',
      [vehicleType]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { vehicleType, baseFare, perKmRate, perMinuteRate } = data;
    const result = await query(
      `INSERT INTO pricings (vehicle_type, base_fare, per_km_rate, per_minute_rate) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [vehicleType, baseFare, perKmRate, perMinuteRate]
    );
    return result.rows[0];
  }

  static async update(vehicleType, data) {
    const { baseFare, perKmRate, perMinuteRate } = data;
    const result = await query(
      `UPDATE pricings 
       SET base_fare = $1, per_km_rate = $2, per_minute_rate = $3, updated_at = CURRENT_TIMESTAMP
       WHERE vehicle_type = $4 RETURNING *`,
      [baseFare, perKmRate, perMinuteRate, vehicleType]
    );
    return result.rows[0];
  }

  static async delete(vehicleType) {
    const result = await query(
      'DELETE FROM pricings WHERE vehicle_type = $1 RETURNING *',
      [vehicleType]
    );
    return result.rows[0];
  }
}

module.exports = Pricing;