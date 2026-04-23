import bcrypt from "bcryptjs";
import crypto from "node:crypto";

import pool from "../core/db.js";
import redisClient from "../core/redis.js";
import User from "../models/userModel.js";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const safeRedisDel = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch {
    return false;
  }
};

const writeAuditLog = async ({
  userId,
  eventType,
  status,
  reason,
  ipAddress,
  userAgent,
  metadata,
}) => {
  try {
    await pool.query(
      `INSERT INTO auth_audit_logs (user_id, event_type, status, reason, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5::inet, $6, $7)`,
      [
        userId || null,
        eventType,
        status,
        reason || null,
        ipAddress || null,
        userAgent || null,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );
  } catch (error) {
    console.error("[AuditLog] Failed to write audit log:", error.message);
  }
};

export const resetPassword = async (req, res) => {
  const ip = req.ip;
  const ua = req.headers["user-agent"];
  const client = await pool.connect();

  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Mã OTP và mật khẩu mới là bắt buộc",
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      });
    }

    await client.query("BEGIN");

    const tokenHash = hashToken(String(token).trim());
    const tokenResult = await client.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND is_used = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [tokenHash],
    );

    if (tokenResult.rows.length === 0) {
      await client.query("ROLLBACK");
      await writeAuditLog({
        userId: null,
        eventType: "PASSWORD_RESET_SUCCESS",
        status: "FAILED",
        reason: "Invalid or expired token",
        ipAddress: ip,
        userAgent: ua,
      });
      return res.status(400).json({
        message: "Mã OTP không hợp lệ hoặc đã hết hạn",
      });
    }

    const resetRow = tokenResult.rows[0];
    const user = await User.findById(resetRow.user_id);

    if (!user) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const updateUserResult = await client.query(
      `UPDATE auth_users
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id`,
      [passwordHash, user.id],
    );

    if (updateUserResult.rowCount === 0) {
      throw new Error("Password update did not affect any user row");
    }

    const markTokenResult = await client.query(
      `UPDATE password_reset_tokens
       SET is_used = TRUE, used_at = NOW()
       WHERE id = $1 AND is_used = FALSE
       RETURNING id`,
      [resetRow.id],
    );

    if (markTokenResult.rowCount === 0) {
      throw new Error("Password reset token was not marked as used");
    }

    await client.query("COMMIT");

    await safeRedisDel(`refresh:${user.id}`);
    await pool.query(
      `UPDATE refresh_tokens
       SET is_revoked = TRUE, revoked_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND is_revoked = FALSE`,
      [user.id],
    );

    await writeAuditLog({
      userId: user.id,
      eventType: "PASSWORD_RESET_SUCCESS",
      status: "SUCCESS",
      ipAddress: ip,
      userAgent: ua,
    });

    return res.json({ message: "Đặt lại mật khẩu thành công" });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("[ResetPassword]", error);
    return res.status(500).json({
      message: "Đặt lại mật khẩu thất bại",
    });
  } finally {
    client.release();
  }
};
