/**
 * @file errorHandler.js
 * @description Middleware xử lý lỗi tập trung và class AppError tùy chỉnh.
 * Mọi lỗi throw ra trong controller/service đều được bắt tại đây,
 * đảm bảo response trả về client luôn nhất quán.
 */

/**
 * Class AppError — lỗi tùy chỉnh cho ứng dụng.
 * Kế thừa từ Error, bổ sung thêm statusCode và isOperational.
 * isOperational: true = lỗi dự kiến (validation, not found, ...)
 *                false = lỗi hệ thống (bug, crash, ...)
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        // Giữ stack trace chính xác, bỏ qua constructor của AppError
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Middleware xử lý lỗi tập trung.
 * Express nhận diện đây là error middleware nhờ có đủ 4 tham số (err, req, res, next).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    // Gán mã lỗi mặc định nếu chưa có
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Đã xảy ra lỗi máy chủ nội bộ.';

    // Log chi tiết lỗi ra console để debug (chỉ log stack cho lỗi không mong muốn)
    if (!err.isOperational) {
        console.error('🔥 [Error] Lỗi không mong muốn:', err);
    } else {
        console.warn(`⚠️ [Error] ${statusCode} - ${message}`);
    }

    // Trả về response chuẩn hóa cho client
    res.status(statusCode).json({
        success: false,
        message: message,
    });
};

module.exports = { AppError, errorHandler };
