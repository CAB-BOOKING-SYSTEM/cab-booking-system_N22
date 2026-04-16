/**
 * @file notification.routes.js
 * @description Định nghĩa REST API routes cho Notification Service.
 *
 * Route map:
 *   GET  /notifications/:userId              → Lấy danh sách thông báo (có phân trang)
 *   GET  /notifications/:userId/unread-count → Đếm thông báo chưa đọc (badge count)
 *   PATCH /notifications/:notificationId/read     → Đánh dấu 1 thông báo đã đọc
 *   PATCH /notifications/:userId/read-all         → Đánh dấu tất cả đã đọc
 */

"use strict";

const { Router } = require("express");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notification.controller");

const router = Router();

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /notifications/:userId
 * Lấy lịch sử thông báo của user, hỗ trợ phân trang qua query ?page=&limit=
 */
router.get("/:userId", getNotifications);

/**
 * GET /notifications/:userId/unread-count
 * Trả về số thông báo chưa đọc — dùng cho badge count trên UI
 */
router.get("/:userId/unread-count", getUnreadCount);

/**
 * PATCH /notifications/:notificationId/read
 * Đánh dấu một thông báo cụ thể là đã đọc
 * Body: { userId: string }
 */
router.patch("/:notificationId/read", markAsRead);

/**
 * PATCH /notifications/:userId/read-all
 * Đánh dấu toàn bộ thông báo chưa đọc của user là đã đọc
 */
router.patch("/:userId/read-all", markAllAsRead);

module.exports = router;
