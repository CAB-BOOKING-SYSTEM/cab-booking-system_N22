/**
 * @file notification.model.js
 * @description Mongoose Schema & Model cho collection "notifications" trong MongoDB.
 *
 * Collection này lưu trữ toàn bộ lịch sử thông báo được sinh ra từ các events:
 *   - ride.assigned    → RideAssigned
 *   - payment.completed → PaymentCompleted
 *   - payment.failed   → PaymentFailed
 *
 * Thiết kế tối ưu cho:
 *   1. Truy vấn lịch sử thông báo của một user (index: userId + createdAt)
 *   2. Tracking vòng đời thông báo: pending → sent → read / failed
 *   3. Retry mechanism: quét bản ghi "failed" để thử gửi lại
 *   4. Lưu trữ linh hoạt metadata gốc từ broker (payload: Mixed)
 */

const mongoose = require("mongoose");

// ─── Sub-schema: Retry Attempt ────────────────────────────────────────────────
/**
 * @typedef {Object} RetryAttempt
 * @property {Date}   attemptedAt - Thời điểm thử gửi lại
 * @property {string} error       - Nội dung lỗi trong lần thử đó
 */
const retryAttemptSchema = new mongoose.Schema(
  {
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
    error: {
      type: String,
      required: true,
    },
  },
  { _id: false }, // Không cần _id riêng cho từng phần tử trong mảng
);

// ─── Main Schema: Notification ────────────────────────────────────────────────
/**
 * @typedef {'customer' | 'driver' | 'admin'} UserRole
 * @typedef {'RideAssigned' | 'PaymentCompleted' | 'PaymentFailed' | 'RefundSuccess' | 'SystemAlert'} NotificationType
 * @typedef {'pending' | 'sent' | 'failed' | 'read'} NotificationStatus
 * @typedef {'in_app_socket' | 'push_fcm' | 'sms' | 'email'} DeliveryMethod
 */

/**
 * @typedef {Object} NotificationDocument
 * @property {string}           userId          - ID người nhận thông báo
 * @property {UserRole}         userRole        - Vai trò của người nhận
 * @property {NotificationType} type            - Loại sự kiện sinh ra thông báo
 * @property {string}           title           - Tiêu đề thông báo (hiển thị trên UI / push)
 * @property {string}           body            - Nội dung chi tiết của thông báo
 * @property {Object}           payload         - Metadata gốc từ event (rideId, amount,...)
 * @property {string}           sourceEventId   - eventId gốc để tránh xử lý trùng (idempotency)
 * @property {NotificationStatus} status        - Trạng thái vòng đời của thông báo
 * @property {DeliveryMethod[]} deliveryMethod  - Các kênh đã gửi thông báo
 * @property {string|null}      errorMessage    - Lỗi cuối cùng nếu gửi thất bại
 * @property {RetryAttempt[]}   retryHistory    - Lịch sử các lần retry
 * @property {number}           retryCount      - Số lần đã thử gửi lại
 * @property {Date|null}        readAt          - Thời điểm user đọc thông báo
 * @property {Date}             createdAt       - Tự sinh bởi timestamps
 * @property {Date}             updatedAt       - Tự sinh bởi timestamps
 */
const notificationSchema = new mongoose.Schema(
  {
    // ── Người nhận ──────────────────────────────────────────────────────────
    userId: {
      type: String,
      required: [true, "userId là bắt buộc"],
      index: true, // Index đơn để hỗ trợ query nhanh theo userId
      trim: true,
    },
    userRole: {
      type: String,
      enum: {
        values: ["customer", "driver", "admin"],
        message: 'userRole phải là "customer", "driver" hoặc "admin"',
      },
      required: [true, "userRole là bắt buộc"],
    },

    // ── Nội dung thông báo ───────────────────────────────────────────────────
    type: {
      type: String,
      enum: {
        values: [
          "RideAssigned",
          "PaymentCompleted",
          "PaymentFailed",
          "RefundSuccess",
          "SystemAlert",
        ],
        message: "type không hợp lệ: {VALUE}",
      },
      required: [true, "type là bắt buộc"],
    },
    title: {
      type: String,
      required: [true, "title là bắt buộc"],
      trim: true,
      maxlength: [255, "title không được vượt quá 255 ký tự"],
    },
    body: {
      type: String,
      required: [true, "body là bắt buộc"],
      trim: true,
      maxlength: [2000, "body không được vượt quá 2000 ký tự"],
    },

    // ── Metadata gốc từ event broker ─────────────────────────────────────────
    /**
     * Lưu nguyên toàn bộ payload từ event broker (rideId, amount, driverInfo,...).
     * Dùng Mixed type vì mỗi event type có cấu trúc data khác nhau.
     * Client dùng data này để điều hướng màn hình (deep link).
     */
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    /**
     * eventId gốc từ broker — dùng để đảm bảo idempotency:
     * tránh tạo thông báo trùng nếu broker deliver message nhiều hơn 1 lần.
     */
    sourceEventId: {
      type: String,
      unique: true, // Mỗi event chỉ sinh ra đúng 1 bản ghi
      sparse: true, // Cho phép null (SystemAlert không có sourceEventId)
      trim: true,
    },

    // ── Trạng thái & Kênh gửi ───────────────────────────────────────────────
    /**
     * Vòng đời:
     *   pending → sent     (gửi thành công)
     *   pending → failed   (gửi thất bại)
     *   sent    → read     (user đã đọc)
     */
    status: {
      type: String,
      enum: {
        values: ["pending", "sent", "failed", "read"],
        message: 'status phải là "pending", "sent", "failed" hoặc "read"',
      },
      default: "pending",
    },
    deliveryMethod: [
      {
        type: String,
        enum: {
          values: ["in_app_socket", "push_fcm", "sms", "email"],
          message: "deliveryMethod không hợp lệ: {VALUE}",
        },
      },
    ],

    // ── Error tracking & Retry ───────────────────────────────────────────────
    /**
     * Lỗi cuối cùng khi gửi thất bại (Firebase FCM timeout, Twilio error,...).
     * Worker retry sẽ quét các document có status = "failed" để thử lại.
     */
    errorMessage: {
      type: String,
      default: null,
    },
    /**
     * Lịch sử chi tiết từng lần retry — dùng để debug và audit.
     */
    retryHistory: {
      type: [retryAttemptSchema],
      default: [],
    },
    /**
     * Số lần đã thử gửi lại — dùng để kiểm soát Max Retry (ví dụ: dừng sau 3 lần).
     */
    retryCount: {
      type: Number,
      default: 0,
      min: [0, "retryCount không được âm"],
    },

    // ── Read tracking ────────────────────────────────────────────────────────
    /**
     * Null = chưa đọc. Có giá trị = user đã đọc lúc này.
     * Kết hợp với status = "read" để đồng bộ trạng thái.
     */
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Tự động sinh createdAt và updatedAt
    versionKey: false, // Tắt __v vì không cần optimistic concurrency ở đây
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

/**
 * Compound Index chính:
 * Tối ưu cho query phổ biến nhất: "Lấy danh sách thông báo mới nhất của user X"
 *   db.notifications.find({ userId: "cust_556677" }).sort({ createdAt: -1 })
 */
notificationSchema.index({ userId: 1, createdAt: -1 });

/**
 * Index hỗ trợ Retry Worker:
 * Quét các thông báo thất bại cần thử gửi lại
 *   db.notifications.find({ status: "failed", retryCount: { $lt: 3 } })
 */
notificationSchema.index({ status: 1, retryCount: 1 });

/**
 * Index hỗ trợ đếm thông báo chưa đọc của một user (badge count trên UI):
 *   db.notifications.countDocuments({ userId: "cust_556677", status: "sent" })
 */
notificationSchema.index({ userId: 1, status: 1 });

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Đánh dấu thông báo là đã đọc.
 * Cập nhật đồng thời status = "read" và readAt = now.
 * @returns {Promise<NotificationDocument>}
 */
notificationSchema.methods.markAsRead = function () {
  this.status = "read";
  this.readAt = new Date();
  return this.save();
};

/**
 * Ghi nhận một lần gửi thất bại:
 * - Đẩy lỗi vào retryHistory
 * - Tăng retryCount
 * - Cập nhật errorMessage với lỗi mới nhất
 * - Nếu vượt maxRetry thì giữ nguyên status = "failed", ngược lại chờ retry
 * @param {string} errorMsg  - Nội dung lỗi
 * @param {number} [maxRetry=3] - Số lần retry tối đa
 * @returns {Promise<NotificationDocument>}
 */
notificationSchema.methods.recordFailure = function (errorMsg, maxRetry = 3) {
  this.retryHistory.push({ attemptedAt: new Date(), error: errorMsg });
  this.retryCount += 1;
  this.errorMessage = errorMsg;
  this.status = "failed";
  return this.save();
};

/**
 * Ghi nhận gửi thành công:
 * - Cập nhật status = "sent"
 * - Xóa errorMessage cũ
 * - Ghi nhận kênh đã dùng nếu chưa có trong deliveryMethod
 * @param {string} [channel] - Kênh gửi thành công (in_app_socket, push_fcm,...)
 * @returns {Promise<NotificationDocument>}
 */
notificationSchema.methods.markAsSent = function (channel) {
  this.status = "sent";
  this.errorMessage = null;
  if (channel && !this.deliveryMethod.includes(channel)) {
    this.deliveryMethod.push(channel);
  }
  return this.save();
};

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Lấy danh sách thông báo mới nhất của một user, có phân trang.
 * @param {string} userId   - ID người dùng
 * @param {number} [page=1] - Trang hiện tại
 * @param {number} [limit=20] - Số bản ghi mỗi trang
 * @returns {Promise<NotificationDocument[]>}
 */
notificationSchema.statics.findByUser = function (
  userId,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit;
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean(); // .lean() trả về plain object, nhanh hơn full Mongoose document
};

/**
 * Lấy các thông báo thất bại cần retry (chưa vượt quá maxRetry).
 * Dùng bởi Retry Worker chạy định kỳ (cron job).
 * @param {number} [maxRetry=3] - Ngưỡng retry tối đa
 * @returns {Promise<NotificationDocument[]>}
 */
notificationSchema.statics.findPendingRetries = function (maxRetry = 3) {
  return this.find({
    status: "failed",
    retryCount: { $lt: maxRetry },
  }).sort({ updatedAt: 1 }); // Ưu tiên bản ghi cũ nhất trước
};

/**
 * Đếm số thông báo chưa đọc của một user (dùng cho badge count).
 * @param {string} userId - ID người dùng
 * @returns {Promise<number>}
 */
notificationSchema.statics.countUnread = function (userId) {
  return this.countDocuments({ userId, status: "sent" });
};

// ─── Export ───────────────────────────────────────────────────────────────────
const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
