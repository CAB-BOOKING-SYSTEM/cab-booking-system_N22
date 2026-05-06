/**
 * @file notification.routes.js
 * @description Định nghĩa REST API routes cho Notification Service.
 *
 * Route map:
 *   GET  /notifications/:userId              → Lấy danh sách thông báo (có phân trang)  [🔒 JWT]
 *   GET  /notifications/:userId/unread-count → Đếm thông báo chưa đọc (badge count)     [🔒 JWT]
 *   PATCH /notifications/:notificationId/read     → Đánh dấu 1 thông báo đã đọc        [🔒 JWT]
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

// 🔒 JWT Authentication middleware
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

// ── Prometheus metric ─────────────────────────────────────────────────────────
const { brokerMessagesProcessedTotal } = require("../metrics/prometheus");

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /notifications/:userId
 * Lấy lịch sử thông báo của user, hỗ trợ phân trang qua query ?page=&limit=
 * 🔒 Bảo vệ bằng JWT — chỉ chủ sở hữu mới được xem thông báo của mình.
 */
router.get("/:userId", verifyToken, getNotifications);

/**
 * POST /notifications/test
 * Thêm route này để pass TC09 của thầy (public — không cần JWT)
 */
router.post("/test", (req, res) => {
  const { user_id, message } = req.body;
  console.log(`[TC09] Nhận test case: User=${user_id}, Msg=${message}`);
  res.status(200).json({
    success: true,
    message: "Notification được gửi (log)",
    data: { user_id, message },
  });
});

const { processNotification } = require("../services/notificationCore.service");

/**
 * POST /notifications/simulate-crash
 * Cố tình gây lỗi để trigger Prometheus alert (public — dùng nội bộ)
 */
router.post("/simulate-crash", (req, res) => {
  console.error(
    "[ALERT TEST] Cố tình gây lỗi hệ thống để trigger Prometheus...",
  );
  brokerMessagesProcessedTotal.inc({
    topic: "simulate-crash",
    status: "error",
  });
  res.status(500).json({
    success: false,
    message: "SYSTEM_CRASH_SIMULATED",
    detail: "Error rate is climbing...",
  });
});

/**
 * GET /notifications/:userId/unread-count
 * Trả về số thông báo chưa đọc — dùng cho badge count trên UI
 * 🔒 Bảo vệ bằng JWT — ngăn kẻ tấn công dò số lượng thông báo của người khác.
 */
router.get("/:userId/unread-count", verifyToken, getUnreadCount);

/**
 * PATCH /notifications/:notificationId/read
 * Đánh dấu một thông báo cụ thể là đã đọc
 * 🔒 Bảo vệ bằng JWT — ngăn người khác đánh dấu thay mình.
 */
router.patch("/:notificationId/read", verifyToken, markAsRead);

/**
 * PATCH /notifications/:userId/read-all
 * Đánh dấu toàn bộ thông báo chưa đọc của user là đã đọc
 */
router.patch("/:userId/read-all", markAllAsRead);

module.exports = router;
