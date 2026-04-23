// models/userModel.js
import pool from "../core/db.js";

class UserModel {
  static async create({
    email,
    username,
    password,
    role = "customer",
    image = null,
  }) {
    const query = `
      INSERT INTO auth_users (
        email,
        password_hash,
        provider,
        first_name,
        avatar_url,
        role,
        status
      )
      VALUES ($1, $2, 'email', $3, $4, $5, 'ACTIVE')
      RETURNING
        id,
        email,
        first_name AS username,
        role,
        avatar_url AS image,
        email_verified_at AS verified_at,
        (status = 'ACTIVE') AS is_active,
        created_at;
    `;

    const result = await pool.query(query, [
      email.toLowerCase().trim(),
      password,
      username.trim(),
      image,
      role,
    ]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT
        id,
        email,
        password_hash AS password,
        first_name AS username,
        role,
        avatar_url AS image,
        email_verified_at AS verified_at,
        (status = 'ACTIVE') AS is_active,
        last_login
      FROM auth_users
      WHERE email = $1
    `;
    const result = await pool.query(query, [email.toLowerCase().trim()]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT
        id,
        email,
        first_name AS username,
        role,
        avatar_url AS image,
        email_verified_at AS verified_at,
        (status = 'ACTIVE') AS is_active,
        last_login
      FROM auth_users
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateLastLogin(userId) {
    await pool.query(`UPDATE auth_users SET last_login = NOW() WHERE id = $1`, [
      userId,
    ]);
  }

  static async hasRole(userId, requiredRole) {
    const result = await pool.query(
      `SELECT role FROM auth_users WHERE id = $1`,
      [userId],
    );
    if (result.rows.length === 0) return false;
    const role = result.rows[0].role;
    if (requiredRole === "admin") return role === "admin";
    if (requiredRole === "driver") return role === "driver" || role === "admin";
    return true;
  }
}

export default UserModel;
