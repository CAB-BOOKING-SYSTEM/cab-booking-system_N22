// /**
//  * @file notification.controller.js
//  * @description Controller layer cho Notification REST API.
//  *
//  * Tầng này chỉ chịu trách nhiệm:
//  *   - Nhận HTTP Request, đọc params / query / body
//  *   - Gọi Service để xử lý
//  *   - Trả về HTTP Response (status code + JSON)
//  *   - Xử lý lỗi thống nhất
//  *
//  * KHÔNG chứa business logic hay tương tác trực tiếp với DB/Model.
//  *
//  * 🔒 Bảo mật IDOR (Insecure Direct Object Reference):
//  *   Các hàm xử lý userId từ URL phải kiểm tra req.user.id để đảm bảo
//  *   người dùng chỉ truy cập được dữ liệu của chính mình.
//  */

// "use strict";

// const notificationCoreService = require("../services/notificationCore.service");

// // ─── GET /notifications/:userId ──────────────────────────────────────────────

// /**
//  * Lấy danh sách thông báo của một user, có phân trang.
//  *
//  * Query params:
//  *   - page  (number, default=1)
//  *   - limit (number, default=20, max=100)
//  *
//  * 🔒 IDOR Check: req.params.userId phải trùng với req.user.id từ JWT.
//  *
//  * @example GET /notifications/cust_556677?page=1&limit=10
//  */
// const getNotifications = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const tokenId = String(req.user.sub || req.user.id);
//     // ── Kiểm tra IDOR: chỉ chủ sở hữu mới được xem thông báo của mình ────
//     if (req.user.id !== userId) {
//       return res.status(403).json({
//         success: false,
//         message: "Bạn không có quyền xem thông báo của người dùng khác.",
//       });
//     }

//     const page = Math.max(1, parseInt(req.query.page) || 1);
//     const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

//     const result = await notificationCoreService.getNotificationsByUser(
//       userId,
//       page,
//       limit,
//     );

//     return res.status(200).json({
//       success: true,
//       ...result, // { data, total, page, totalPages }
//     });
//   } catch (err) {
//     console.error("[Controller] getNotifications lỗi:", err.message);
//     return res
//       .status(500)
//       .json({ success: false, message: "Lỗi server nội bộ." });
//   }
// };

// // ─── GET /notifications/:userId/unread-count ─────────────────────────────────

// /**
//  * Đếm số thông báo chưa đọc của user.
//  * Dùng cho badge count (chấm đỏ) trên icon thông báo của app.
//  *
//  * 🔒 IDOR Check: req.params.userId phải trùng với req.user.id từ JWT.
//  *
//  * @example GET /notifications/cust_556677/unread-count
//  */
// const getUnreadCount = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const tokenId = String(req.user.sub || req.user.id);

//     // ── Kiểm tra IDOR ─────────────────────────────────────────────────────
//     if (req.user.id !== userId) {
//       return res.status(403).json({
//         success: false,
//         message: "Bạn không có quyền xem dữ liệu của người dùng khác.",
//       });
//     }

//     const count = await notificationCoreService.countUnread(userId);

//     return res.status(200).json({ success: true, userId, unreadCount: count });
//   } catch (err) {
//     console.error("[Controller] getUnreadCount lỗi:", err.message);
//     return res
//       .status(500)
//       .json({ success: false, message: "Lỗi server nội bộ." });
//   }
// };

// // ─── PATCH /notifications/:notificationId/read ───────────────────────────────

// /**
//  * Đánh dấu MỘT thông báo cụ thể là đã đọc.
//  *
//  * 🔒 userId được lấy từ JWT (req.user.id) thay vì tin vào body do client gửi.
//  *    Điều này ngăn chặn lỗi IDOR — client không thể giả mạo userId.
//  *
//  * @example PATCH /notifications/64abc.../read
//  */
// const markAsRead = async (req, res) => {
//   try {
//     const { notificationId } = req.params;
//     const tokenId = String(req.user.sub || req.user.id);

//     // Lấy userId trực tiếp từ JWT đã giải mã — không tin vào body
//     const userId = req.user.id;

//     const updated = await notificationCoreService.markOneAsRead(
//       notificationId,
//       userId,
//     );

//     if (!updated) {
//       return res.status(404).json({
//         success: false,
//         message: "Không tìm thấy thông báo hoặc bạn không có quyền truy cập.",
//       });
//     }

//     return res.status(200).json({ success: true, data: updated });
//   } catch (err) {
//     console.error("[Controller] markAsRead lỗi:", err.message);
//     return res
//       .status(500)
//       .json({ success: false, message: "Lỗi server nội bộ." });
//   }
// };

// // ─── PATCH /notifications/:userId/read-all ───────────────────────────────────

// /**
//  * Đánh dấu TẤT CẢ thông báo chưa đọc của user là đã đọc.
//  * Trigger khi user nhấn "Đánh dấu tất cả đã đọc".
//  *
//  * @example PATCH /notifications/cust_556677/read-all
//  */
// const markAllAsRead = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const modifiedCount = await notificationCoreService.markAllAsRead(userId);

//     return res.status(200).json({
//       success: true,
//       message: `Đã đánh dấu đã đọc ${modifiedCount} thông báo.`,
//       modifiedCount,
//     });
//   } catch (err) {
//     console.error("[Controller] markAllAsRead lỗi:", err.message);
//     return res
//       .status(500)
//       .json({ success: false, message: "Lỗi server nội bộ." });
//   }
// };

// exports.sendManualNotification = async (req, res) => {
//   try {
//     const { userId, title, body, payload, userRole } = req.body;

//     if (!userId || !title || !body) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Thiếu userId, title hoặc body" });
//     }

//     // Tạo object payload chuẩn để core xử lý (giống như từ RabbitMQ về)
//     const notificationPayload = {
//       userId,
//       userRole: userRole || "driver", // Mặc định là driver nếu không truyền
//       title,
//       body,
//       payload: payload || {},
//       type: "manual_test",
//       eventId: `MANUAL_${Date.now()}`, // Tự sinh ID để tránh lỗi Duplicate Key E11000
//     };

//     // Gọi hàm core để lưu DB và đẩy Socket.IO
//     const result = await sendNotificationToUser(notificationPayload);

//     res.status(200).json({
//       success: true,
//       message: "Đã gửi thông báo thủ công",
//       data: result,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// module.exports = {
//   getNotifications,
//   getUnreadCount,
//   markAsRead,
//   markAllAsRead,
// };
"use strict";

const notificationCoreService = require("../services/notificationCore.service");

// --- HELPER FUNCTION KIỂM TRA QUYỀN (IDOR) ---
const checkPermission = (req, targetId) => {
  const tokenId = String(req.user.sub || req.user.id);
  const tokenDriverId = req.user.driver_id ? String(req.user.driver_id) : null;

  // Hợp lệ nếu ID trên URL khớp với user ID hoặc driver ID trong token
  return targetId === tokenId || targetId === tokenDriverId;
};

// ─── GET /notifications/:userId ──────────────────────────────────────────────
const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!checkPermission(req, userId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem thông báo của người dùng khác.",
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const result = await notificationCoreService.getNotificationsByUser(
      userId,
      page,
      limit,
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[Controller] getNotifications lỗi:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server nội bộ." });
  }
};

// ─── GET /notifications/:userId/unread-count ─────────────────────────────────
const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!checkPermission(req, userId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem dữ liệu của người dùng khác.",
      });
    }

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
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { targetUserId } = req.body; // Bắt buộc client gửi lên ID đang muốn mark as read (số 2 hoặc DRV_...)

    if (!targetUserId || !checkPermission(req, targetUserId)) {
      return res.status(403).json({
        success: false,
        message: "Thiếu targetUserId hợp lệ trong body.",
      });
    }

    const updated = await notificationCoreService.markOneAsRead(
      notificationId,
      targetUserId,
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
const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!checkPermission(req, userId)) {
      return res.status(403).json({
        success: false,
        message:
          "Bạn không có quyền thực hiện hành động này cho người dùng khác.",
      });
    }

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

exports.sendManualNotification = async (req, res) => {
  // ... (Giữ nguyên code sendManualNotification của bạn) ...
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
