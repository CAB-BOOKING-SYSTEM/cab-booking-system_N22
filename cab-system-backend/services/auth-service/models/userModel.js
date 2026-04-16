// models/userModel.js
import pool from '../core/db.js';

class UserModel {

  static async create({ email, username, password, role = 'customer', image = null }) {
    const query = `
      INSERT INTO users (email, username, password, role, image)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, username, role, image, verified_at, is_active, created_at;
    `;

    const result = await pool.query(query, [
      email.toLowerCase().trim(),
      username.trim(),
      password,
      role,
      image
    ]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await pool.query(query, [email.toLowerCase().trim()]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `SELECT id, email, username, role, image, verified_at, is_active, last_login FROM users WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateLastLogin(userId) {
    await pool.query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [userId]);
  }

  static async hasRole(userId, requiredRole) {
    const result = await pool.query(`SELECT role FROM users WHERE id = $1`, [userId]);
    if (result.rows.length === 0) return false;
    const role = result.rows[0].role;
    if (requiredRole === 'admin') return role === 'admin';
    if (requiredRole === 'driver') return role === 'driver' || role === 'admin';
    return true;
  }
}

export default UserModel;