import pool from "../core/db.js";

class UserModel {
  static async create({
    email,
    password_hash,
    role = "CUSTOMER",
    first_name = null,
    last_name = null,
    phone_number = null,
  }) {
    const query = `
      INSERT INTO auth_users (email, password_hash, role, status, provider, first_name, last_name, phone_number)
      VALUES ($1, $2, $3, 'ACTIVE', 'email', $4, $5, $6)
      RETURNING id, email, role, status, email_verified, first_name, last_name, phone_number, created_at;
    `;
    const result = await pool.query(query, [
      email.toLowerCase().trim(),
      password_hash,
      role.toUpperCase(),
      first_name,
      last_name,
      phone_number,
    ]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT id, email, password_hash, role, status, email_verified, last_login
      FROM auth_users
      WHERE email = $1 AND deleted_at IS NULL
    `;
    const result = await pool.query(query, [email.toLowerCase().trim()]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT id, email, role, status, email_verified, last_login
      FROM auth_users
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateLastLogin(userId) {
    await pool.query(
      `UPDATE auth_users SET last_login = NOW(), login_count = login_count + 1 WHERE id = $1`,
      [userId],
    );
  }

  static async hasRole(userId, requiredRole) {
    const result = await pool.query(
      `SELECT role FROM auth_users WHERE id = $1`,
      [userId],
    );
    if (result.rows.length === 0) return false;
    const role = result.rows[0].role;
    if (requiredRole === "ADMIN")
      return role === "ADMIN" || role === "SUPER_ADMIN";
    if (requiredRole === "DRIVER")
      return role === "DRIVER" || role === "ADMIN" || role === "SUPER_ADMIN";
    return true;
  }
}

export default UserModel;
