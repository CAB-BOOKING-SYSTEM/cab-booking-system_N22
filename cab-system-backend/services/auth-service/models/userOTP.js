// core/models/userOtp.js
import pool from '../core/db.js';

class UserOtp {
  
  /**
   * Tạo OTP mới
   */
  static async create(userId, otp, expiresAt) {
    const query = `
      INSERT INTO user_otps (user_id, otp, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    
    const result = await _query(query, [userId, otp, expiresAt]);
    return result.rows[0];
  }

  /**
   * Tìm OTP theo user_id và otp
   */
  static async findByUserAndOtp(userId, otp) {
    const query = `
      SELECT * FROM user_otps 
      WHERE user_id = $1 
        AND otp = $2 
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    
    const result = await _query(query, [userId, otp]);
    return result.rows[0];
  }

  /**
   * Xóa OTP đã dùng hoặc hết hạn
   */
  static async deleteByUserId(userId) {
    const query = `DELETE FROM user_otps WHERE user_id = $1`;
    await _query(query, [userId]);
  }

  /**
   * Xóa tất cả OTP hết hạn (dọn dẹp)
   */
  static async deleteExpired() {
    const query = `DELETE FROM user_otps WHERE expires_at < NOW()`;
    await _query(query);
  }
}

export default UserOtp;