"use strict";

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  "../config/cab-booking-firebase-adminsdk.json",
);

if (admin.apps.length === 0) {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const accountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || SERVICE_ACCOUNT_PATH;
  let initialized = false;

  if (serviceAccountBase64) {
    try {
      const serviceAccountBuffer = Buffer.from(serviceAccountBase64, "base64");
      const serviceAccount = JSON.parse(serviceAccountBuffer.toString("utf-8"));

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
      });

      initialized = true;
      console.log(
        "✅ [FCM] Firebase Admin SDK đã khởi tạo thành công qua Base64",
      );
    } catch (error) {
      console.warn(
        `⚠️  [FCM] Không thể khởi tạo Firebase qua FIREBASE_SERVICE_ACCOUNT_BASE64: ${error.message}`,
      );
    }
  }

  if (!initialized) {
    if (!fs.existsSync(accountPath)) {
      console.warn(
        `⚠️  [FCM] Không tìm thấy Firebase service account tại: ${accountPath}`,
      );
      console.warn(
        "⚠️  [FCM] Push Notification sẽ bị vô hiệu hoá cho đến khi cấu hình đúng file hoặc FIREBASE_SERVICE_ACCOUNT_BASE64.",
      );
    } else {
      try {
        const serviceAccount = require(accountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId:
            process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
        });
        console.log(
          "✅ [FCM] Firebase Admin SDK đã khởi tạo thành công qua file JSON",
        );
      } catch (error) {
        console.warn(
          `⚠️  [FCM] Không thể khởi tạo Firebase Admin SDK: ${error.message}`,
        );
      }
    }
  }
}

const getUserDeviceToken = async (userId) => {
  console.log(`🔍 [FCM] Đang lấy device token cho userId=${userId}`);
  return process.env.FCM_DEV_TEST_TOKEN || null;
};

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
      console.warn(
        `⚠️  [FCM] Không tìm thấy device token của userId=${userId}. Không thể gửi Push.`,
      );
      return false;
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        eventId: String(payloadData.eventId || ""),
        eventType: String(payloadData.eventType || payloadData.type || ""),
        routingKey: String(payloadData.routingKey || ""),
        rideId: String(payloadData.data?.rideId || payloadData.rideId || ""),
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
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
      token: deviceToken,
    };

    const messageId = await admin.messaging().send(message);
    console.log(
      `📲 [FCM] Đã gửi Push thành công — userId=${userId}, messageId=${messageId}`,
    );
    return true;
  } catch (error) {
    const fcmErrorCode = error?.errorInfo?.code || error?.code || "unknown";
    console.error(
      `❌ [FCM] Gửi Push thất bại — userId=${userId}, errorCode=${fcmErrorCode}:`,
      error.message,
    );
    return false;
  }
};

module.exports = { sendPushNotification };
