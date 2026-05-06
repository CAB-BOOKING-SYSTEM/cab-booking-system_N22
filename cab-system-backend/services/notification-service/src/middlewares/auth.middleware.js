/**
 * @file auth.middleware.js
 * @description Middleware xác thực JWT (JSON Web Token) cho Notification Service.
 *
 * Luồng hoạt động:
 *   1. Đọc header Authorization: Bearer <token>
 *   2. Nếu không có token  → 401 Unauthorized
 *   3. Dùng jwt.verify() kiểm tra chữ ký và thời hạn với JWT_SECRET
 *   4. Nếu token sai/hết hạn → 403 Forbidden
 *   5. Nếu hợp lệ → gắn payload đã giải mã vào req.user rồi gọi next()
 *
 * req.user sẽ chứa các trường mà Auth Service đã nhúng vào token, ví dụ:
 *   { id: "cust_556677", role: "customer", iat: ..., exp: ... }
 */

"use strict";

const jwt = require("jsonwebtoken");

/**
 * Middleware bảo vệ route bằng JWT.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verifyToken = (req, res, next) => {
  // ── 1. Trích xuất token từ header Authorization ──────────────────────────
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Không tìm thấy token xác thực. Vui lòng đăng nhập.",
    });
  }

  const token = authHeader.split(" ")[1]; // Lấy phần sau "Bearer "

  // ── 2. Xác thực token ────────────────────────────────────────────────────
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Gắn payload đã giải mã vào request để controller sử dụng
    req.user = decoded;

    next();
  } catch (err) {
    // Token sai chữ ký hoặc đã hết hạn
    const message =
      err.name === "TokenExpiredError"
        ? "Token đã hết hạn. Vui lòng đăng nhập lại."
        : "Token không hợp lệ.";

    return res.status(403).json({ success: false, message });
  }
};

module.exports = { verifyToken };
