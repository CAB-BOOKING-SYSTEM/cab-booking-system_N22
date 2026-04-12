/**
 * @file notificationCore.service.js
 * @description Business Logic layer cho Notification Service.
 *
 * Tầng Service chịu trách nhiệm:
 *   1. Build nội dung thông báo từ event payload
 *   2. Kiểm tra idempotency (tránh duplicate)
 *   3. Lưu Notification vào MongoDB
 *   4. Quyết định kênh gửi: Socket.IO (online) → FCM (offline) → failed
 *   5. Cung cấp các hàm query cho Controller (REST API)
 *
 * Controller và Consumer Service chỉ được gọi vào tầng này,
 * KHÔNG được tương tác trực tiếp với Model hay 3rd-party SDK.
 */

"use strict";

const Notification = require("../models/notification.model");
const { sendNotificationToUser } = require("../socket/socketHandler");
const { sendPushNotification } = require("./fcm.service");
const {
  brokerMessagesProcessedTotal,
  notificationsSentTotal,
  notificationProcessingDuration,
  duplicateEventsTotal,
} = require("../metrics/prometheus");

// ─── Hằng số ──────────────────────────────────────────────────────────────────

/** Map từ topic → Notification.type lưu trong DB */
const TOPIC_TO_TYPE = {
  "ride.assigned": "RideAssigned",
  "payment.completed": "PaymentCompleted",
  "payment.failed": "PaymentFailed",
};

// ─── Build nội dung thông báo theo từng topic ─────────────────────────────────

/**
 * Map event payload → { userId, userRole, title, body } để lưu DB và hiển thị.
 *
 * @param {string} topic   - Topic/routing-key name
 * @param {Object} payload - Parsed payload từ message broker
 * @returns {{ userId: string, userRole: string, title: string, body: string }}
 * @throws {Error} Nếu topic không được hỗ trợ
 */
function buildNotificationContent(topic, payload) {
  switch (topic) {
    case "ride.assigned":
      return {
        userId: payload.customerId,
        userRole: "customer",
        title: "Tài xế đang đến!",
        body: `Tài xế ${payload.driverInfo.name} đang đến đón bạn bằng xe ${payload.driverInfo.vehicle} — BKS: ${payload.driverInfo.plateNumber}. ETA: ${payload.etaMinutes} phút.`,
      };

    case "payment.completed":
      return {
        userId: payload.userId,
        userRole: payload.userRole || "customer",
        title: "Thanh toán thành công ✅",
        body: `Chuyến đi ${
          payload.rideId
        } đã được thanh toán ${payload.amount.toLocaleString("vi-VN")} ${
          payload.currency
        } qua ${payload.paymentMethod}. Mã GD: ${payload.transactionId}.`,
      };

    case "payment.failed":
      return {
        userId: payload.userId,
        userRole: "customer",
        title: "Thanh toán thất bại ❌",
        body: `Không thể thanh toán chuyến đi ${
          payload.rideId
        } (${payload.amount.toLocaleString("vi-VN")} ${
          payload.currency
        }). Lý do: ${
          payload.reason
        }. Vui lòng thử lại hoặc đổi phương thức thanh toán.`,
      };

    default:
      throw new Error(`[NotificationCore] Topic không được hỗ trợ: ${topic}`);
  }
}

// ─── Core: Xử lý & phân phối thông báo ───────────────────────────────────────

/**
 * Luồng xử lý chính khi nhận một event:
 *   validate → idempotency → save DB → Socket.IO → FCM (fallback)
 *
 * Được gọi bởi consumer sau khi validate schema.
 *
 * @param {string} topic   - Topic hoặc routing key
 * @param {Object} payload - Parsed & validated JSON payload
 * @returns {Promise<void>}
 */
async function processNotification(topic, payload) {
  // ── 1. Kiểm tra idempotency ────────────────────────────────────────────────
  if (payload.eventId) {
    const existing = await Notification.findOne({
      sourceEventId: payload.eventId,
    }).lean();

    if (existing) {
      console.warn(
        `⚠️  [NotificationCore] Duplicate event bị bỏ qua — eventId=${payload.eventId}, topic=${topic}`,
      );
      // ── Metric: đếm duplicate bị bỏ qua ──────────────────────────────────
      duplicateEventsTotal.inc({ topic });
      brokerMessagesProcessedTotal.inc({ topic, status: "duplicate" });
      return;
    }
  }

  // ── Bắt đầu đo latency xử lý ──────────────────────────────────────────────
  const stopTimer = notificationProcessingDuration.startTimer({ topic });

  try {
    // ── 2. Build nội dung thông báo ──────────────────────────────────────────
    const { userId, userRole, title, body } = buildNotificationContent(
      topic,
      payload,
    );

    // ── 3. Lưu vào MongoDB (status = pending) ────────────────────────────────
    const notification = new Notification({
      userId,
      userRole,
      type: TOPIC_TO_TYPE[topic],
      title,
      body,
      payload,
      sourceEventId: payload.eventId,
      status: "pending",
    });

    await notification.save();
    stopTimer(); // Ghi nhận thời gian đến sau khi save DB thành công
    console.log(
      `💾 [NotificationCore] Đã lưu — type=${TOPIC_TO_TYPE[topic]}, userId=${userId}`,
    );

    // ── 4. Thử gửi qua Socket.IO (user online) ──────────────────────────────
    const isOnline = sendNotificationToUser(userId, "new_notification", {
      notificationId: notification._id,
      type: TOPIC_TO_TYPE[topic],
      title,
      body,
      data: payload,
    });

    if (isOnline) {
      await notification.markAsSent("in_app_socket");
      // ── Metric: gửi thành công qua Socket ─────────────────────────────────
      notificationsSentTotal.inc({
        type: TOPIC_TO_TYPE[topic],
        delivery_method: "in_app_socket",
      });
      brokerMessagesProcessedTotal.inc({ topic, status: "success" });
      console.log(
        `✅ [NotificationCore] Socket.IO thành công — userId=${userId}, status=sent`,
      );
      return;
    }

    // ── 5. Fallback: gửi Push Notification qua FCM (user offline) ───────────
    console.log(
      `[NotificationCore] User offline, thử FCM fallback — userId=${userId}`,
    );

    const isPushSent = await sendPushNotification(userId, title, body, payload);

    if (isPushSent) {
      await notification.markAsSent("push_fcm");
      // ── Metric: gửi thành công qua FCM ────────────────────────────────────
      notificationsSentTotal.inc({
        type: TOPIC_TO_TYPE[topic],
        delivery_method: "push_fcm",
      });
      brokerMessagesProcessedTotal.inc({ topic, status: "success" });
      console.log(
        `✅ [NotificationCore] FCM thành công — userId=${userId}, status=sent`,
      );
    } else {
      await notification.recordFailure(
        "Socket offline and FCM delivery failed",
      );
      // ── Metric: cả 2 kênh đều thất bại ────────────────────────────────────
      notificationsSentTotal.inc({
        type: TOPIC_TO_TYPE[topic],
        delivery_method: "failed",
      });
      brokerMessagesProcessedTotal.inc({ topic, status: "error" });
      console.error(
        `❌ [NotificationCore] Cả 2 kênh thất bại — userId=${userId}, status=failed`,
      );
    }
  } catch (err) {
    stopTimer(); // Đảm bảo timer luôn được dừng dù có lỗi
    brokerMessagesProcessedTotal.inc({ topic, status: "error" });
    throw err; // Re-throw để consumer xử lý retry
  }
}

// ─── Query Methods (dùng cho REST API / Controller) ──────────────────────────

/**
 * Lấy danh sách thông báo của một user, có phân trang.
 *
 * @param {string} userId    - Business ID của user
 * @param {number} [page=1]  - Trang hiện tại
 * @param {number} [limit=20] - Số bản ghi mỗi trang
 * @returns {Promise<{ data: Object[], total: number, page: number, totalPages: number }>}
 */
async function getNotificationsByUser(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId }),
  ]);

  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Đếm số thông báo chưa đọc của user (dùng cho badge count trên UI).
 *
 * @param {string} userId - Business ID của user
 * @returns {Promise<number>}
 */
async function countUnread(userId) {
  return Notification.countUnread(userId);
}

/**
 * Đánh dấu một thông báo là đã đọc.
 * Chỉ cho phép đánh dấu nếu thông báo thuộc về đúng userId (tránh IDOR).
 *
 * @param {string} notificationId - MongoDB _id của thông báo
 * @param {string} userId         - Business ID của user thực hiện hành động
 * @returns {Promise<Object|null>} Document đã cập nhật, hoặc null nếu không tìm thấy
 */
async function markOneAsRead(notificationId, userId) {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId, // Đảm bảo user chỉ đọc thông báo của chính mình
  });

  if (!notification) return null;

  return notification.markAsRead();
}

/**
 * Đánh dấu TẤT CẢ thông báo chưa đọc của user là đã đọc.
 * Dùng khi user nhấn "Đánh dấu tất cả đã đọc".
 *
 * @param {string} userId - Business ID của user
 * @returns {Promise<number>} Số lượng bản ghi đã được cập nhật
 */
async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    { userId, status: "sent" },
    { $set: { status: "read", readAt: new Date() } },
  );

  return result.modifiedCount;
}

module.exports = {
  processNotification,
  getNotificationsByUser,
  countUnread,
  markOneAsRead,
  markAllAsRead,
  TOPIC_TO_TYPE, // Export để consumer service dùng khi subscribe topics
};
