/**
 * @file fcm.service.js
 * @description Service layer giao tiếp với Firebase Cloud Messaging (FCM).
 *
 * Thuộc tầng Service — chỉ chịu trách nhiệm giao tiếp với 3rd-party Firebase SDK.
 * Business logic quyết định "khi nào gọi FCM" nằm ở notificationCore.service.js.
 *
 * ⚠️  YÊU CẦU SETUP:
 *   1. Firebase Console → Project Settings → Service Accounts
 *   2. "Generate new private key" → lưu vào src/config/cab-booking-firebase-adminsdk.json
 *   3. KHÔNG commit file JSON này lên Git
 */

"use strict";

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const isTruthy = (value) =>
  ["true", "1", "yes", "on"].includes(String(value).toLowerCase());

// ─── Khởi tạo Firebase Admin SDK (singleton) ─────────────────────────────────

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  "../config/cab-booking-firebase-adminsdk.json",
);

if (admin.apps.length === 0) {
  try {
    const fcmEnabled = isTruthy(process.env.FCM_ENABLED ?? "true");

    if (!fcmEnabled) {
      console.warn("⚠️  [FCM] FCM đang tắt (FCM_ENABLED=false)");
    } else {
      const configuredPath =
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH || SERVICE_ACCOUNT_PATH;
      const accountPath = path.isAbsolute(configuredPath)
        ? configuredPath
        : path.resolve(process.cwd(), configuredPath);

      if (!fs.existsSync(accountPath)) {
        console.warn(
          `⚠️  [FCM] Không tìm thấy service account tại: ${accountPath}`,
        );
        console.warn(
          "⚠️  [FCM] Push Notification bị vô hiệu hoá đến khi cấu hình đúng file.",
        );
      } else {
        admin.initializeApp({
          credential: admin.credential.cert(require(accountPath)),
        });
        console.log("✅ [FCM] Firebase Admin SDK đã khởi tạo thành công");
      }
    }
  } catch (err) {
    console.error("❌ [FCM] Lỗi khởi tạo Firebase Admin SDK:", err.message);
  }
}

// ─── Lấy FCM Device Token của User ──────────────────────────────────────────

/**
 * Lấy FCM Device Token từ User Profile DB.
 * TODO (Production): query User Service hoặc DB thực:
 *   const user = await User.findOne({ userId }).select('fcmToken').lean();
 *   return user?.fcmToken || null;
 *
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
const getUserDeviceToken = async (userId) => {
  console.log(`🔍 [FCM] Đang lấy device token cho userId=${userId}`);
  return process.env.FCM_DEV_TEST_TOKEN || null;
};

// ─── Gửi Push Notification ───────────────────────────────────────────────────

/**
 * Gửi Push Notification tới thiết bị của user qua FCM.
 *
 * @param {string} userId
 * @param {string} title
 * @param {string} body
 * @param {Object} [payloadData={}]
 * @returns {Promise<boolean>}
 */
const sendPushNotification = async (userId, title, body, payloadData = {}) => {
  if (admin.apps.length === 0) {
    console.warn(
      `⚠️  [FCM] Firebase chưa khởi tạo — bỏ qua push cho userId=${userId}`,
    );
    return false;
  }

  try {
    const deviceToken = await getUserDeviceToken(userId);
    if (!deviceToken) {
      console.warn(`⚠️  [FCM] Không có device token — userId=${userId}`);
      return false;
    }

    const message = {
      notification: { title, body },
      data: {
        eventId: String(payloadData.eventId || ""),
        type: String(payloadData.type || ""),
        rideId: String(payloadData.rideId || ""),
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "cab_booking_notifications",
        },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
      token: deviceToken,
    };

    const messageId = await admin.messaging().send(message);
    console.log(
      `📲 [FCM] Gửi thành công — userId=${userId}, messageId=${messageId}`,
    );
    return true;
  } catch (error) {
    const code = error?.errorInfo?.code || error?.code || "unknown";
    console.error(
      `❌ [FCM] Gửi thất bại — userId=${userId}, code=${code}:`,
      error.message,
    );
    return false;
  }
};

module.exports = { sendPushNotification };
