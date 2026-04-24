import pool from "../core/db.js";

class UserModel {
  static normalizeRole(role) {
    const normalizedRole = String(role || "customer").trim().toLowerCase();
    if (normalizedRole === "rider") return "customer";
    if (["customer", "driver", "admin"].includes(normalizedRole)) {
      return normalizedRole;
    }
    return "customer";
  }

  static async create({
    email,
    username,
    phone_number = null,
    password,
    role = "customer",
    image = null,
    driver_id = null,
    driver_status = null,
  }) {
    const normalizedDriverStatus = driver_status
      ? driver_status.toUpperCase()
      : null;

    const query = `
      INSERT INTO auth_users (
        full_name,
        phone_number,
        email,
        password_hash,
        role,
        status,
        avatar_url,
        provider,
        driver_id,
        driver_status,
        email_verified,
        failed_login_count
      )
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, 'email', $7, $8, FALSE, 0)
      RETURNING
        id,
        full_name AS username,
        phone_number,
        email,
        role,
        status,
        avatar_url AS image,
        driver_id,
        driver_status,
        email_verified,
        failed_login_count,
        locked_until,
        created_at;
    `;

    const result = await pool.query(query, [
      username.trim(),
      phone_number,
      email.toLowerCase().trim(),
      password,
      role,
      image,
      driver_id,
      normalizedDriverStatus,
    ]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT
        id,
        full_name AS username,
        phone_number,
        email,
        password_hash AS password,
        role,
        status,
        avatar_url AS image,
        driver_id,
        driver_status,
        email_verified,
        failed_login_count,
        locked_until,
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
        full_name AS username,
        phone_number,
        email,
        role,
        status,
        avatar_url AS image,
        driver_id,
        driver_status,
        email_verified,
        failed_login_count,
        locked_until,
        (status = 'ACTIVE') AS is_active,
        last_login
      FROM auth_users
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByDriverId(driverId) {
    const query = `
      SELECT
        id,
        full_name AS username,
        phone_number,
        email,
        role,
        status,
        driver_id,
        driver_status
      FROM auth_users
      WHERE driver_id = $1
    `;
    const result = await pool.query(query, [driverId]);
    return result.rows[0];
  }

  static async updateSuccessfulLogin(userId) {
    await pool.query(
      `
        UPDATE auth_users
        SET
          last_login = NOW(),
          last_activity = NOW(),
          login_count = login_count + 1,
          failed_login_count = 0,
          locked_until = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [userId],
    );
  }

  static async registerFailedLogin(userId) {
    await pool.query(
      `
        UPDATE auth_users
        SET
          failed_login_count = failed_login_count + 1,
          locked_until = CASE
            WHEN failed_login_count + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
            ELSE locked_until
          END,
          status = CASE
            WHEN failed_login_count + 1 >= 5 THEN 'LOCKED'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = $1
      `,
      [userId],
    );
  }

  static async unlockIfExpired(userId) {
    await pool.query(
      `
        UPDATE auth_users
        SET
          locked_until = NULL,
          failed_login_count = 0,
          status = 'ACTIVE',
          updated_at = NOW()
        WHERE id = $1
          AND locked_until IS NOT NULL
          AND locked_until <= NOW()
      `,
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
    if (requiredRole === "admin") return role === "admin";
    if (requiredRole === "driver") return role === "driver" || role === "admin";
    return true;
  }
}

export default UserModel;
