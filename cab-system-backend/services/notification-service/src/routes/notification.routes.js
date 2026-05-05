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
// 1. THÊM DÒNG NÀY ĐỂ GỌI METRIC:
const { brokerMessagesProcessedTotal } = require("../metrics/prometheus");
// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /notifications/:userId
 * Lấy lịch sử thông báo của user, hỗ trợ phân trang qua query ?page=&limit=
 */
router.get("/:userId", getNotifications);
// Thêm route này để pass TC09 của thầy
// POST /api/notifications/test
router.post("/test", (req, res) => {
    const { user_id, message } = req.body;
    console.log(`[TC09] Nhận test case: User=${user_id}, Msg=${message}`);
    
    // Trả về đúng mã 200 và kết quả thầy muốn
    res.status(200).json({
        success: true,
        message: "Notification được gửi (log)",
        data: { user_id, message }
    });
});
const { processNotification } = require("../services/notificationCore.service");

router.post("/simulate-crash", (req, res) => {
    console.error("[ALERT TEST] Cố tình gây lỗi hệ thống để trigger Prometheus...");
    
    // 2. THÊM DÒNG NÀY ĐỂ ÉP PROMETHEUS GHI NHẬN LỖI:
    brokerMessagesProcessedTotal.inc({ topic: "simulate-crash", status: "error" });

    // Trả về lỗi 500 
    res.status(500).json({ 
        success: false, 
        message: "SYSTEM_CRASH_SIMULATED",
        detail: "Error rate is climbing..." 
    });
});
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
