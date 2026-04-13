class MatchingResult {
  static async create(pool, data) {
    const query = `
      INSERT INTO matching_results (request_id, driver_id, distance_km, ai_score, was_fallback)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [data.requestId, data.driverId, data.distanceKm, data.aiScore, data.wasFallback];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByRequestId(pool, requestId) {
    const query = 'SELECT * FROM matching_results WHERE request_id = $1';
    const result = await pool.query(query, [requestId]);
    return result.rows[0];
  }

  static async findByRideId(pool, rideId) {
    const query = `
      SELECT mr.*, mreq.ride_id, mreq.user_id, mreq.pickup_lat, mreq.pickup_lng
      FROM matching_results mr
      JOIN matching_requests mreq ON mr.request_id = mreq.id
      WHERE mreq.ride_id = $1
    `;
    const result = await pool.query(query, [rideId]);
    return result.rows[0];
  }

  static async getDriverMatchHistory(pool, driverId, limit = 50) {
    const query = `
      SELECT mr.*, mreq.pickup_lat, mreq.pickup_lng, mreq.created_at as request_created_at
      FROM matching_results mr
      JOIN matching_requests mreq ON mr.request_id = mreq.id
      WHERE mr.driver_id = $1
      ORDER BY mr.matched_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [driverId, limit]);
    return result.rows;
  }

  static async getRecentMatches(pool, hours = 24, limit = 100) {
    const query = `
      SELECT mr.*, mreq.ride_id, mreq.user_id
      FROM matching_results mr
      JOIN matching_requests mreq ON mr.request_id = mreq.id
      WHERE mr.matched_at > NOW() - INTERVAL '${hours} hours'
      ORDER BY mr.matched_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}

module.exports = MatchingResult;