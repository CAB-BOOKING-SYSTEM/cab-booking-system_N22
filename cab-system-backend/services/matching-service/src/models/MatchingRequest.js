// PostgreSQL model for matching_requests table
class MatchingRequest {
  static async create(pool, data) {
    const query = `
      INSERT INTO matching_requests (ride_id, user_id, pickup_lat, pickup_lng, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (ride_id) 
      DO UPDATE SET 
        pickup_lat = EXCLUDED.pickup_lat,
        pickup_lng = EXCLUDED.pickup_lng,
        status = 'pending',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [data.rideId, data.userId, data.pickupLat, data.pickupLng, 'pending'];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateStatus(pool, rideId, status) {
    const query = `
      UPDATE matching_requests 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE ride_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, rideId]);
    return result.rows[0];
  }

  static async findById(pool, rideId) {
    const query = 'SELECT * FROM matching_requests WHERE ride_id = $1';
    const result = await pool.query(query, [rideId]);
    return result.rows[0];
  }

  static async findByIdAndDriver(pool, rideId, driverId) {
    const query = `
      SELECT mr.* FROM matching_requests mr
      JOIN matching_results mres ON mr.id = mres.request_id
      WHERE mr.ride_id = $1 AND mres.driver_id = $2
    `;
    const result = await pool.query(query, [rideId, driverId]);
    return result.rows[0];
  }

  static async getPendingRequests(pool, limit = 10) {
    const query = `
      SELECT * FROM matching_requests 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async getRequestsByUser(pool, userId, limit = 50) {
    const query = `
      SELECT * FROM matching_requests 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }
}

module.exports = MatchingRequest;