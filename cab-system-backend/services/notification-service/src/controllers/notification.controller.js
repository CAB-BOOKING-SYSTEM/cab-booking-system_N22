/**
 * @file notification.controller.js
 * @description Controller layer cho Notification REST API.
 *
 * Tầng này chỉ chịu trách nhiệm:
 *   - Nhận HTTP Request, đọc params / query / body
 *   - Gọi Service để xử lý
 *   - Trả về HTTP Response (status code + JSON)
 *   - Xử lý lỗi thống nhất
 *
 * KHÔNG chứa business logic hay tương tác trực tiếp với DB/Model.
 */

"use strict";

const notificationCoreService = require("../services/notificationCore.service");

// ─── GET /notifications/:userId ──────────────────────────────────────────────

/**
 * Lấy danh sách thông báo của một user, có phân trang.
 *
 * Query params:
 *   - page  (number, default=1)
 *   - limit (number, default=20, max=100)
 *
 * @example GET /notifications/cust_556677?page=1&limit=10
 */
const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const result = await notificationCoreService.getNotificationsByUser(
      userId,
      page,
      limit
    );

    return res.status(200).json({
      success: true,
      ...result, // { data, total, page, totalPages }
    });
  } catch (err) {
    console.error("[Controller] getNotifications lỗi:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server nội bộ." });
  }
};

// ─── GET /notifications/:userId/unread-count ─────────────────────────────────

/**
 * Đếm số thông báo chưa đọc của user.
 * Dùng cho badge count (chấm đỏ) trên icon thông báo của app.
 *
 * @example GET /notifications/cust_556677/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await notificationCoreService.countUnread(userId);

    return res.status(200).json({ success: true, userId, unreadCount: count });
  } catch (err) {
    console.error("[Controller] getUnreadCount lỗi:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server nội bộ." });
  }
};

// ─── PATCH /notifications/:notificationId/read ───────────────────────────────

/**
 * Đánh dấu MỘT thông báo cụ thể là đã đọc.
 *
 * Body: { userId: string }  — dùng để verify ownership, tránh IDOR
 *
 * @example PATCH /notifications/64abc.../read  body: { "userId": "cust_556677" }
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "userId là bắt buộc trong body." });
    }

    const updated = await notificationCoreService.markOneAsRead(
      notificationId,
      userId
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông báo hoặc bạn không có quyền truy cập.",
      });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("[Controller] markAsRead lỗi:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server nội bộ." });
  }
};

// ─── PATCH /notifications/:userId/read-all ───────────────────────────────────

/**
 * Đánh dấu TẤT CẢ thông báo chưa đọc của user là đã đọc.
 * Trigger khi user nhấn "Đánh dấu tất cả đã đọc".
 *
 * @example PATCH /notifications/cust_556677/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const modifiedCount = await notificationCoreService.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: `Đã đánh dấu đã đọc ${modifiedCount} thông báo.`,
      modifiedCount,
    });
  } catch (err) {
    console.error("[Controller] markAllAsRead lỗi:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server nội bộ." });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
