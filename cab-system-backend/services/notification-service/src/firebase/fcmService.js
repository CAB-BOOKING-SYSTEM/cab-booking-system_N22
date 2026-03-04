/**
 * @file fcmService.js
 * @description Module gửi Push Notification qua Firebase Cloud Messaging (FCM).
 *
 * Được kích hoạt khi user OFFLINE (không có kết nối Socket.IO),
 * đảm bảo thông báo vẫn đến tay người dùng qua màn hình khóa điện thoại.
 *
 * ⚠️  YÊU CẦU SETUP:
 *   1. Tạo project trên Firebase Console → Project Settings → Service Accounts
 *   2. Nhấn "Generate new private key" → tải file JSON về
 *   3. Đặt file vào: src/config/cab-booking-firebase-adminsdk.json
 *   4. KHÔNG commit file này lên Git (đã có trong .gitignore)
 *
 * ⚠️  LƯU Ý FCM TOKEN:
 *   Mỗi thiết bị có một FCM Token (Device Token) riêng.
 *   Khi user mở app, Frontend gửi token lên và lưu vào User Profile DB.
 *   Trong production, hàm getUserDeviceToken() phải query DB thực để lấy token đó.
 */

"use strict";

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// ─── Khởi tạo Firebase Admin SDK (chỉ 1 lần duy nhất) ───────────────────────

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  "../config/cab-booking-firebase-adminsdk.json"
);

/**
 * Khởi tạo Firebase Admin SDK.
 * Dùng biến môi trường FIREBASE_SERVICE_ACCOUNT_PATH nếu có,
 * fallback về file JSON tĩnh trong thư mục config.
 *
 * Kiểm tra admin.apps.length để tránh khởi tạo lại khi module bị require nhiều lần.
 */
if (admin.apps.length === 0) {
  try {
    const accountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || SERVICE_ACCOUNT_PATH;

    if (!fs.existsSync(accountPath)) {
      // Chưa có file service account — chạy được nhưng FCM sẽ không hoạt động
      console.warn(
        `⚠️  [FCM] Không tìm thấy Firebase service account tại: ${accountPath}`
      );
      console.warn(
        "⚠️  [FCM] Push Notification sẽ bị vô hiệu hoá cho đến khi cấu hình đúng file."
      );
    } else {
      const serviceAccount = require(accountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ [FCM] Firebase Admin SDK đã khởi tạo thành công");
    }
  } catch (err) {
    console.error("❌ [FCM] Lỗi khởi tạo Firebase Admin SDK:", err.message);
  }
}

// ─── Lấy FCM Device Token của User ──────────────────────────────────────────

/**
 * Lấy FCM Device Token từ User Profile Database.
 *
 * TODO (Production): Thay thế bằng query thực tế tới User Service hoặc DB:
 *   const user = await User.findOne({ userId }).select('fcmToken').lean();
 *   return user?.fcmToken || null;
 *
 * @param {string} userId - Business ID của user (VD: "cust_556677")
 * @returns {Promise<string|null>} FCM token hoặc null nếu không tìm thấy
 */
const getUserDeviceToken = async (userId) => {
  // Stub cho môi trường dev/test
  // Trong production, query tới User Profile DB để lấy token thực
  console.log(`🔍 [FCM] Đang lấy device token cho userId=${userId}`);

  // Trả về null để simulate user chưa đăng ký token (app chưa cài / chưa login)
  // Thay bằng giá trị token thật khi test với thiết bị thực
  return process.env.FCM_DEV_TEST_TOKEN || null;
};

// ─── Gửi Push Notification ───────────────────────────────────────────────────

/**
 * Gửi Push Notification tới thiết bị của user qua FCM.
 *
 * Được gọi từ kafka/consumer.js khi user không có kết nối Socket.IO (offline).
 *
 * @param {string} userId      - Business ID người nhận
 * @param {string} title       - Tiêu đề thông báo (hiển thị trên thanh thông báo)
 * @param {string} body        - Nội dung thông báo
 * @param {Object} payloadData - Metadata từ Kafka event (eventId, type, rideId,...)
 * @returns {Promise<boolean>} true nếu gửi thành công, false nếu thất bại
 */
const sendPushNotification = async (userId, title, body, payloadData = {}) => {
  // Kiểm tra Firebase đã được khởi tạo chưa
  if (admin.apps.length === 0) {
    console.warn(
      `⚠️  [FCM] Firebase chưa khởi tạo — bỏ qua push cho userId=${userId}`
    );
    return false;
  }

  try {
    // ── 1. Lấy Device Token ───────────────────────────────────────────────────
    const deviceToken = await getUserDeviceToken(userId);

    if (!deviceToken) {
      console.warn(
        `⚠️  [FCM] Không tìm thấy device token của userId=${userId}. Không thể gửi Push.`
      );
      return false;
    }

    // ── 2. Xây dựng FCM Message ───────────────────────────────────────────────
    /**
     * FCM yêu cầu tất cả giá trị trong data payload phải là string.
     * notification block → hiển thị trên notification tray (tự động bởi OS)
     * data block         → gửi thêm metadata để app xử lý (deep link, điều hướng màn hình)
     */
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        eventId: String(payloadData.eventId || ""),
        type: String(payloadData.type || ""),
        rideId: String(payloadData.rideId || ""),
        // Flutter / React Native dùng click_action để điều hướng màn hình
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      // Tuỳ chỉnh hiển thị riêng theo nền tảng
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "cab_booking_notifications", // Khai báo channel trong Android app
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
      token: deviceToken,
    };

    // ── 3. Gửi qua Firebase ──────────────────────────────────────────────────
    const messageId = await admin.messaging().send(message);
    console.log(
      `📲 [FCM] Đã gửi Push thành công — userId=${userId}, messageId=${messageId}`
    );
    return true;
  } catch (error) {
    // Phân loại lỗi FCM phổ biến để log rõ ràng hơn
    const fcmErrorCode = error?.errorInfo?.code || error?.code || "unknown";
    console.error(
      `❌ [FCM] Gửi Push thất bại — userId=${userId}, errorCode=${fcmErrorCode}:`,
      error.message
    );
    return false;
  }
};

module.exports = { sendPushNotification };
