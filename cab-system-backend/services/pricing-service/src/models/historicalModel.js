const { query } = require('../config/dbConfig');

class Historical {
  static async save(data) {
    const {
      requestId, vehicleType, distance, duration, zone,
      baseFare, perKmRate, perMinuteRate, surgeMultiplier,
      estimatedFare, promotionCode, finalFare, userId
    } = data;
    
    const result = await query(
      `INSERT INTO historical_estimates (
        request_id, vehicle_type, distance, duration, zone,
        base_fare, per_km_rate, per_minute_rate, surge_multiplier,
        estimated_fare, promotion_code, final_fare, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [requestId, vehicleType, distance, duration, zone,
       baseFare, perKmRate, perMinuteRate, surgeMultiplier,
       estimatedFare, promotionCode, finalFare, userId]
    );
    return result.rows[0];
  }

  static async getHistoryByDate(startDate, endDate) {
    const result = await query(
      `SELECT * FROM historical_estimates 
       WHERE timestamp >= $1 AND timestamp <= $2 
       ORDER BY timestamp DESC`,
      [startDate, endDate]
    );
    return result.rows;
  }

  static async getHistoryByZone(zone) {
    const result = await query(
      `SELECT * FROM historical_estimates 
       WHERE zone = $1 
       ORDER BY timestamp DESC`,
      [zone]
    );
    return result.rows;
  }

  static async getHistoryByUser(userId) {
    const result = await query(
      `SELECT * FROM historical_estimates 
       WHERE user_id = $1 
       ORDER BY timestamp DESC`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = Historical;