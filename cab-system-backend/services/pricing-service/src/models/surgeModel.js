const { query } = require('../config/dbConfig');

class Surge {
  static async findAll() {
    const result = await query('SELECT * FROM surges ORDER BY id');
    return result.rows;
  }

  static async findByZone(zone) {
    const result = await query(
      'SELECT * FROM surges WHERE zone = $1',
      [zone]
    );
    return result.rows[0];
  }

  static async create(zone, multiplier) {
    const result = await query(
      `INSERT INTO surges (zone, multiplier) 
       VALUES ($1, $2) 
       ON CONFLICT (zone) DO UPDATE SET multiplier = EXCLUDED.multiplier
       RETURNING *`,
      [zone, multiplier]
    );
    return result.rows[0];
  }

  static async update(zone, multiplier) {
    const result = await query(
      `UPDATE surges 
       SET multiplier = $1, updated_at = CURRENT_TIMESTAMP
       WHERE zone = $2 RETURNING *`,
      [multiplier, zone]
    );
    return result.rows[0];
  }

  static async delete(zone) {
    const result = await query(
      'DELETE FROM surges WHERE zone = $1 RETURNING *',
      [zone]
    );
    return result.rows[0];
  }

  static async getMultiplier(zone) {
    const result = await query(
      'SELECT multiplier FROM surges WHERE zone = $1',
      [zone]
    );
    return result.rows[0] ? result.rows[0].multiplier : 1;
  }
}

module.exports = Surge;