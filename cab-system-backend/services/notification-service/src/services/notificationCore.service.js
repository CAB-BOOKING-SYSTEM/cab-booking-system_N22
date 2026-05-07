// "use strict";

// const Notification = require("../models/notification.model");
// const { sendNotificationToUser } = require("../socket/socketHandler");
// // const { sendPushNotification } = require("./fcm.service");
// const { sendPushNotification } = require("../firebase/fcmService");
// const {
//   brokerMessagesProcessedTotal,
//   notificationsSentTotal,
//   notificationProcessingDuration,
//   duplicateEventsTotal,
// } = require("../metrics/prometheus");

// const DEFAULT_USER_ROLE = "customer";

// // ---------------------------------------------------------------------------
// // Helper: chuyển routing key dạng "driver.matched" → "DriverMatched"
// // ---------------------------------------------------------------------------
// function toPascalCase(routingKey) {
//   return String(routingKey || "notification.event")
//     .split(".")
//     .filter(Boolean)
//     .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
//     .join("");
// }

// function getNotificationType(routingKey) {
//   return toPascalCase(routingKey);
// }

// // ---------------------------------------------------------------------------
// // Defensive extraction: bóc tách object chứa dữ liệu thực sự của chuyến xe
// // từ notificationPayload có thể bị lồng nhiều tầng do lỗi thiết kế của booking-service.
// //
// // Thứ tự ưu tiên:
// //   1. notificationPayload.bookingData  — Consumer đã chuẩn hoá
// //   2. notificationPayload.data         — cấu trúc chuẩn từ RabbitMQ
// //   3. notificationPayload.payload.data — bị wrap thêm một lớp ngoài
// //   4. rest of notificationPayload      — raw flat object, loại bỏ các key envelope
// // ---------------------------------------------------------------------------
// function getEventData(notificationPayload = {}) {
//   // 1. Dữ liệu đã được bọc chuẩn bởi Consumer
//   if (
//     notificationPayload.bookingData &&
//     typeof notificationPayload.bookingData === "object"
//   ) {
//     return notificationPayload.bookingData;
//   }
//   // 2. Cấu trúc chuẩn từ RabbitMQ
//   if (
//     notificationPayload.data &&
//     typeof notificationPayload.data === "object"
//   ) {
//     return notificationPayload.data;
//   }
//   // 3. Bị bọc 2 lớp
//   if (notificationPayload.payload?.data) {
//     return notificationPayload.payload.data;
//   }

//   // Fallback
//   const {
//     metaData,
//     payload,
//     bookingData,
//     eventId,
//     eventType,
//     routingKey,
//     timestamp,
//     source,
//     ...rest
//   } = notificationPayload;
//   return rest;
// }

// function formatCurrency(value, currency) {
//   if (value === undefined || value === null) {
//     return null;
//   }

//   const numericValue = Number(value);
//   if (Number.isNaN(numericValue)) {
//     return `${value}${currency ? ` ${currency}` : ""}`.trim();
//   }

//   const formatted = new Intl.NumberFormat("vi-VN").format(numericValue);
//   return currency ? `${formatted} ${currency}` : formatted;
// }

// function extractRecipientId(notificationPayload = {}) {
//   const eventData = getEventData(notificationPayload);

//   return (
//     eventData.userId ||
//     eventData.customerId ||
//     eventData.driverId ||
//     notificationPayload.userId ||
//     notificationPayload.customerId ||
//     notificationPayload.driverId ||
//     null
//   );
// }

// function inferUserRole(routingKey, notificationPayload = {}, recipientId) {
//   const eventData = getEventData(notificationPayload);

//   if (eventData.userRole) {
//     return eventData.userRole;
//   }

//   if (routingKey.startsWith("driver.") || recipientId === eventData.driverId) {
//     return "driver";
//   }

//   if (recipientId === eventData.customerId) {
//     return "customer";
//   }

//   return DEFAULT_USER_ROLE;
// }

// function buildNotificationContent(routingKey, notificationPayload = {}) {
//   const eventData = getEventData(notificationPayload);
//   const recipientId = extractRecipientId(notificationPayload);
//   const userRole = inferUserRole(routingKey, notificationPayload, recipientId);
//   const bookingRef =
//     eventData.bookingId || eventData.rideId || eventData.requestId || "";
//   const moneyText = formatCurrency(eventData.amount, eventData.currency);

//   switch (routingKey) {
//     case "user.registered":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Chào mừng bạn đến với Cab Booking",
//         body: `Tài khoản của bạn đã được tạo thành công${eventData.fullName ? `, ${eventData.fullName}` : ""}.`,
//       };
//     case "user.profile_updated":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Hồ sơ đã được cập nhật",
//         body: `Thông tin hồ sơ của bạn vừa được cập nhật${eventData.updatedFields ? `: ${Array.isArray(eventData.updatedFields) ? eventData.updatedFields.join(", ") : eventData.updatedFields}` : ""}.`,
//       };
//     case "user.account_banned":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Tài khoản đã bị tạm khóa",
//         body: `Tài khoản của bạn đã bị tạm khóa${eventData.reason ? ` vì: ${eventData.reason}` : ""}.`,
//       };
//     case "booking.created":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Đơn đặt xe đã được tạo",
//         body: `Đơn đặt xe${bookingRef ? ` #${bookingRef}` : ""} của bạn đã được ghi nhận thành công.`,
//       };
//     case "booking.accepted":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Đơn đặt xe đã được xác nhận",
//         body: `Đơn đặt xe${bookingRef ? ` #${bookingRef}` : ""} đã được tài xế xác nhận${eventData.driverName ? ` bởi ${eventData.driverName}` : ""}.`,
//       };
//     case "booking.cancelled":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Đơn đặt xe đã bị hủy",
//         body: `Đơn đặt xe${bookingRef ? ` #${bookingRef}` : ""} đã bị hủy${eventData.reason ? ` vì: ${eventData.reason}` : ""}.`,
//       };
//     case "driver.matched":
//       // recipientId được xác định linh động từ payload (có thể là customerId hoặc driverId)
//       // Matching Service cần publish 2 message riêng — một có userId=customerId, một có userId=driverId
//       return {
//         userId: recipientId,
//         userRole: inferUserRole(routingKey, notificationPayload, recipientId),
//         title:
//           recipientId === eventData.driverId
//             ? "Bạn có cuốc xe mới! 🚗"
//             : "Đã tìm thấy tài xế!",
//         body:
//           recipientId === eventData.driverId
//             ? `Bạn đã được gán cho chuyến xe${bookingRef ? ` #${bookingRef}` : ""}. ETA đến điểm đón: ${eventData.etaMinutes || "?"} phút.`
//             : `Tài xế ${eventData.driverName || ""} (${eventData.vehiclePlate || ""}) đang đến đón bạn. ETA: ${eventData.etaMinutes || "?"} phút.`,
//       };
//     case "ride.arrived":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Tài xế đã đến điểm đón",
//         body: `Tài xế${eventData.driverName ? ` ${eventData.driverName}` : ""} đã đến điểm đón${eventData.rideId ? ` cho chuyến #${eventData.rideId}` : ""}.`,
//       };
//     case "ride.started":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Chuyến đi đã bắt đầu",
//         body: `Chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""} đã bắt đầu.`,
//       };
//     case "ride.completed":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Chuyến đi đã hoàn thành",
//         body: `Chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""} đã hoàn thành. Cảm ơn bạn đã đồng hành cùng Cab Booking.`,
//       };
//     case "driver.ride.completed":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Chuyến đi đã hoàn thành",
//         body: `Cảm ơn bạn đã hoàn thành chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""}.`,
//       };
//     case "payment.created":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Khởi tạo thanh toán thành công 💳",
//         body: `Hóa đơn cho chuyến đi${bookingRef ? ` #${bookingRef}` : ""} đã sẵn sàng. Vui lòng thanh toán số tiền ${moneyText}${eventData.paymentMethod ? ` qua ${eventData.paymentMethod}` : ""}.`,
//       };
//     case "payment.completed":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Thanh toán thành công ✅",
//         body: `Chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""} đã được thanh toán thành công${moneyText ? ` với số tiền ${moneyText}` : ""}${eventData.paymentMethod ? ` qua ${eventData.paymentMethod}` : ""}.`,
//       };
//     case "payment.failed":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Thanh toán thất bại ❌",
//         body: `Không thể thanh toán cho chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""}${moneyText ? ` (${moneyText})` : ""}${eventData.reason ? `: ${eventData.reason}` : ""}.`,
//       };
//     case "pricing.estimate.calculated":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Đã có ước tính giá cước",
//         body: `Giá ước tính cho hành trình${eventData.rideId ? ` #${eventData.rideId}` : ""}${formatCurrency(eventData.estimatedPrice, eventData.currency) ? ` là ${formatCurrency(eventData.estimatedPrice, eventData.currency)}` : ""}.`,
//       };
//     case "pricing.promotion.applied":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Khuyến mãi đã được áp dụng",
//         body: `Ưu đãi${eventData.promotionCode ? ` ${eventData.promotionCode}` : ""} đã được áp dụng${formatCurrency(eventData.discountAmount, eventData.currency) ? `, giảm ${formatCurrency(eventData.discountAmount, eventData.currency)}` : ""}.`,
//       };
//     case "review.created":
//       return {
//         userId: recipientId,
//         userRole,
//         title: "Bạn vừa có một đánh giá mới",
//         body: `Có một đánh giá mới liên quan đến chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""}${eventData.rating ? ` với số sao ${eventData.rating}` : ""}.`,
//       };
//     default:
//       return {
//         userId: recipientId,
//         userRole,
//         title: notificationPayload.title || "Thông báo mới",
//         body:
//           notificationPayload.body ||
//           `Bạn vừa có một thông báo mới (${routingKey}).`,
//       };
//   }
// }

// /**
//  * Chuẩn hóa payload đầu vào thành một object gọn gàng, sẵn sàng để lưu DB.
//  *
//  * Object trả về CHỈ chứa:
//  *  - các trường điều phối   : eventId, eventType, routingKey, timestamp, source
//  *  - các trường người dùng  : userId, userRole
//  *  - nội dung thông báo     : title, body
//  *  - dữ liệu chuyến xe      : bookingData — object thuần, đã bóc tách khỏi các wrapper lồng nhau
//  *
//  * KHÔNG bao gồm trường `metaData` chứa thông tin chuyến xe bị dội lại.
//  */
// function normalizeNotificationPayload(routingKey, notificationPayload = {}) {
//   // Bóc tách bookingData sạch khỏi message có thể bị lồng nhiều tầng
//   const bookingData = getEventData(notificationPayload);

//   const content =
//     notificationPayload.title && notificationPayload.body
//       ? {
//           userId:
//             notificationPayload.userId ||
//             extractRecipientId(notificationPayload),
//           userRole:
//             notificationPayload.userRole ||
//             inferUserRole(
//               routingKey,
//               notificationPayload,
//               extractRecipientId(notificationPayload),
//             ),
//           title: notificationPayload.title,
//           body: notificationPayload.body,
//         }
//       : buildNotificationContent(routingKey, notificationPayload);

//   const eventId =
//     notificationPayload.eventId ||
//     notificationPayload.traceId ||
//     notificationPayload.id ||
//     `AUTO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//   const eventType =
//     notificationPayload.eventType ||
//     notificationPayload.eventName ||
//     notificationPayload.type ||
//     routingKey;

//   const timestamp =
//     notificationPayload.timestamp ||
//     bookingData.timestamp ||
//     new Date().toISOString();

//   const source =
//     notificationPayload.source ||
//     notificationPayload.sourceService ||
//     bookingData.source ||
//     bookingData.sourceService ||
//     null;

//   return {
//     // --- Envelope (dùng để map vào sourceEventId, không lưu raw metaData) ---
//     eventId,
//     eventType,
//     routingKey,
//     timestamp,
//     source,
//     // --- Người dùng nhận thông báo ---
//     userId: content.userId,
//     userRole: content.userRole,
//     // --- Nội dung thông báo ---
//     title: content.title,
//     body: content.body,
//     // --- Dữ liệu chuyến xe đã bóc tách sạch — đây là THỨ DUY NHẤT được lưu xuống DB ---
//     bookingData,
//     // metaData đã bị loại bỏ cố tình — không dump raw message vào DB
//   };
// }

// /**
//  * Lưu thông báo vào DB và gửi qua Socket.IO (hoặc FCM fallback).
//  * Hàm dùng chung để tránh lặp code khi gửi cho nhiều người nhận.
//  */
// async function saveAndDeliver(notificationType, routingKey, normalizedPayload) {
//   const notification = new Notification({
//     userId: normalizedPayload.userId,
//     userRole: normalizedPayload.userRole || DEFAULT_USER_ROLE,
//     type: notificationType,
//     title: normalizedPayload.title,
//     body: normalizedPayload.body,
//     payload: normalizedPayload.bookingData || {},
//     metaData: {
//       eventType: normalizedPayload.eventType,
//       routingKey: normalizedPayload.routingKey,
//       timestamp: normalizedPayload.timestamp,
//       source: normalizedPayload.source,
//     },
//     sourceEventId: normalizedPayload.eventId,
//     status: "pending",
//   });

//   await notification.save();
//   console.log(
//     `💾 [NotificationCore] Đã lưu — type=${notificationType}, userId=${normalizedPayload.userId}`,
//   );

//   const isOnline = sendNotificationToUser(
//     normalizedPayload.userId,
//     "new_notification",
//     {
//       notificationId: notification._id,
//       type: notificationType,
//       title: normalizedPayload.title,
//       body: normalizedPayload.body,
//       routingKey: normalizedPayload.routingKey,
//       data: normalizedPayload.bookingData || {},
//     },
//   );

//   if (isOnline) {
//     await notification.markAsSent("in_app_socket");
//     notificationsSentTotal.inc({ type: notificationType, delivery_method: "in_app_socket" });
//     brokerMessagesProcessedTotal.inc({ topic: routingKey, status: "success" });
//     console.log(
//       `✅ [NotificationCore] Socket.IO thành công — userId=${normalizedPayload.userId}, status=sent`,
//     );
//     return;
//   }

//   console.log(
//     `[NotificationCore] User offline, thử FCM fallback — userId=${normalizedPayload.userId}`,
//   );

//   const isPushSent = await sendPushNotification(
//     normalizedPayload.userId,
//     normalizedPayload.title,
//     normalizedPayload.body,
//     normalizedPayload,
//   );

//   if (isPushSent) {
//     await notification.markAsSent("push_fcm");
//     notificationsSentTotal.inc({ type: notificationType, delivery_method: "push_fcm" });
//     brokerMessagesProcessedTotal.inc({ topic: routingKey, status: "success" });
//     console.log(
//       `✅ [NotificationCore] FCM thành công — userId=${normalizedPayload.userId}, status=sent`,
//     );
//   } else {
//     await notification.recordFailure("Socket offline and FCM delivery failed");
//     notificationsSentTotal.inc({ type: notificationType, delivery_method: "failed" });
//     brokerMessagesProcessedTotal.inc({ topic: routingKey, status: "error" });
//     console.error(
//       `❌ [NotificationCore] Cả 2 kênh thất bại — userId=${normalizedPayload.userId}, status=failed`,
//     );
//   }
// }

// async function processNotification(routingKey, payload = {}) {
//   const normalizedPayload = normalizeNotificationPayload(routingKey, payload);

//   if (normalizedPayload.eventId) {
//     const existing = await Notification.findOne({
//       sourceEventId: normalizedPayload.eventId,
//     }).lean();

//     if (existing) {
//       console.warn(
//         `⚠️  [NotificationCore] Duplicate event bị bỏ qua — eventId=${normalizedPayload.eventId}, routingKey=${routingKey}`,
//       );
//       duplicateEventsTotal.inc({ topic: routingKey });
//       brokerMessagesProcessedTotal.inc({
//         topic: routingKey,
//         status: "duplicate",
//       });
//       return;
//     }
//   }

//   const stopTimer = notificationProcessingDuration.startTimer({
//     topic: routingKey,
//   });

//   try {
//     const notificationType = getNotificationType(routingKey);

//     if (!normalizedPayload.userId) {
//       throw new Error(
//         `[NotificationCore] Không xác định được userId cho routingKey=${routingKey}`,
//       );
//     }

//     // --- Gửi thông báo cho người nhận chính (customer) ---
//     await saveAndDeliver(notificationType, routingKey, normalizedPayload);
//     stopTimer();

//     // --- Với sự kiện driver.matched: gửi thêm thông báo riêng cho tài xế ---
//     if (routingKey === "driver.matched") {
//       const eventData = getEventData(payload);
//       const driverId = eventData.driverId;

//       if (driverId && driverId !== normalizedPayload.userId) {
//         console.log(
//           `🚗 [NotificationCore] Gửi thêm thông báo cho tài xế — driverId=${driverId}`,
//         );

//         // Tạo bản sao payload với userId = driverId để buildNotificationContent
//         // trả về nội dung phù hợp với tài xế (title: "Bạn có cuốc xe mới!")
//         const driverPayload = { ...payload, userId: driverId };
//         const driverNormalized = normalizeNotificationPayload(routingKey, driverPayload);

//         // Gán thủ công để chắc chắn gửi đúng người
//         driverNormalized.userId = driverId;
//         driverNormalized.userRole = "driver";
//         driverNormalized.title = `Bạn có cuốc xe mới! 🚗`;
//         driverNormalized.body = `Bạn đã được gán cho chuyến xe${eventData.rideId ? ` #${eventData.rideId}` : ""}. ETA đến điểm đón: ${eventData.etaMinutes || "?"} phút.`;
//         // Dùng eventId khác để tránh bị lọc trùng
//         driverNormalized.eventId = `${driverNormalized.eventId}_driver`;

//         await saveAndDeliver(notificationType, routingKey, driverNormalized).catch((err) => {
//           console.error(
//             `❌ [NotificationCore] Gửi thông báo cho tài xế thất bại — driverId=${driverId}:`,
//             err.message,
//           );
//         });
//       } else if (!driverId) {
//         console.warn(
//           `⚠️  [NotificationCore] driver.matched nhưng không tìm thấy driverId trong payload`,
//         );
//       }
//     }
//   } catch (error) {
//     stopTimer();
//     brokerMessagesProcessedTotal.inc({ topic: routingKey, status: "error" });
//     throw error;
//   }
// }

// async function getNotificationsByUser(userId, page = 1, limit = 20) {
//   const skip = (page - 1) * limit;

//   const [data, total] = await Promise.all([
//     Notification.find({ userId })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean(),
//     Notification.countDocuments({ userId }),
//   ]);

//   return {
//     data,
//     total,
//     page,
//     totalPages: Math.ceil(total / limit),
//   };
// }

// async function countUnread(userId) {
//   return Notification.countUnread(userId);
// }

// async function markOneAsRead(notificationId, userId) {
//   const notification = await Notification.findOne({
//     _id: notificationId,
//     userId,
//   });

//   if (!notification) {
//     return null;
//   }

//   return notification.markAsRead();
// }

// async function markAllAsRead(userId) {
//   const result = await Notification.updateMany(
//     { userId, status: "sent" },
//     { $set: { status: "read", readAt: new Date() } },
//   );

//   return result.modifiedCount;
// }

// module.exports = {
//   processNotification,
//   getNotificationsByUser,
//   countUnread,
//   markOneAsRead,
//   markAllAsRead,
//   getNotificationType,
//   buildNotificationContent,
//   normalizeNotificationPayload,
// };
"use strict";

const Notification = require("../models/notification.model");
const { sendNotificationToUser } = require("../socket/socketHandler");
// const { sendPushNotification } = require("./fcm.service");
const { sendPushNotification } = require("../firebase/fcmService");
const {
  brokerMessagesProcessedTotal,
  notificationsSentTotal,
  notificationProcessingDuration,
  duplicateEventsTotal,
} = require("../metrics/prometheus");

const DEFAULT_USER_ROLE = "customer";

// ---------------------------------------------------------------------------
// Helper: chuyển routing key dạng "driver.matched" → "DriverMatched"
// ---------------------------------------------------------------------------
function toPascalCase(routingKey) {
  return String(routingKey || "notification.event")
    .split(".")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

function getNotificationType(routingKey) {
  return toPascalCase(routingKey);
}

// ---------------------------------------------------------------------------
// Defensive extraction: bóc tách object chứa dữ liệu thực sự của chuyến xe
// từ notificationPayload có thể bị lồng nhiều tầng do lỗi thiết kế của booking-service.
//
// Thứ tự ưu tiên:
//   1. notificationPayload.bookingData  — Consumer đã chuẩn hoá
//   2. notificationPayload.data         — cấu trúc chuẩn từ RabbitMQ
//   3. notificationPayload.payload.data — bị wrap thêm một lớp ngoài
//   4. rest of notificationPayload      — raw flat object, loại bỏ các key envelope
// ---------------------------------------------------------------------------
function getEventData(notificationPayload = {}) {
  // 1. Dữ liệu đã được bọc chuẩn bởi Consumer
  if (
    notificationPayload.bookingData &&
    typeof notificationPayload.bookingData === "object"
  ) {
    return notificationPayload.bookingData;
  }
  // 2. Cấu trúc chuẩn từ RabbitMQ
  if (
    notificationPayload.data &&
    typeof notificationPayload.data === "object"
  ) {
    return notificationPayload.data;
  }
  // 3. Bị bọc 2 lớp
  if (notificationPayload.payload?.data) {
    return notificationPayload.payload.data;
  }

  // Fallback
  const {
    metaData,
    payload,
    bookingData,
    eventId,
    eventType,
    routingKey,
    timestamp,
    source,
    ...rest
  } = notificationPayload;
  return rest;
}

function formatCurrency(value, currency) {
  if (value === undefined || value === null) {
    return null;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return `${value}${currency ? ` ${currency}` : ""}`.trim();
  }

  const formatted = new Intl.NumberFormat("vi-VN").format(numericValue);
  return currency ? `${formatted} ${currency}` : formatted;
}

function extractRecipientId(notificationPayload = {}) {
  const eventData = getEventData(notificationPayload);

  return (
    eventData.userId ||
    eventData.customerId ||
    eventData.driverId ||
    notificationPayload.userId ||
    notificationPayload.customerId ||
    notificationPayload.driverId ||
    null
  );
}

function inferUserRole(routingKey, notificationPayload = {}, recipientId) {
  const eventData = getEventData(notificationPayload);

  if (eventData.userRole) {
    return eventData.userRole;
  }

  if (routingKey.startsWith("driver.") || recipientId === eventData.driverId) {
    return "driver";
  }

  if (recipientId === eventData.customerId) {
    return "customer";
  }

  return DEFAULT_USER_ROLE;
}

function buildNotificationContent(routingKey, notificationPayload = {}) {
  const eventData = getEventData(notificationPayload);
  const recipientId = extractRecipientId(notificationPayload);
  const userRole = inferUserRole(routingKey, notificationPayload, recipientId);
  const bookingRef =
    eventData.bookingId || eventData.rideId || eventData.requestId || "";
  const moneyText = formatCurrency(eventData.amount, eventData.currency);

  switch (routingKey) {
    case "user.registered":
      return {
        userId: recipientId,
        userRole,
        title: "Chào mừng bạn đến với Cab Booking",
        body: `Tài khoản của bạn đã được tạo thành công${eventData.fullName ? `, ${eventData.fullName}` : ""}.`,
      };
    case "user.profile_updated":
      return {
        userId: recipientId,
        userRole,
        title: "Hồ sơ đã được cập nhật",
        body: `Thông tin hồ sơ của bạn vừa được cập nhật${eventData.updatedFields ? `: ${Array.isArray(eventData.updatedFields) ? eventData.updatedFields.join(", ") : eventData.updatedFields}` : ""}.`,
      };
    case "user.account_banned":
      return {
        userId: recipientId,
        userRole,
        title: "Tài khoản đã bị tạm khóa",
        body: `Tài khoản của bạn đã bị tạm khóa${eventData.reason ? ` vì: ${eventData.reason}` : ""}.`,
      };
    case "booking.created":
      return {
        userId: recipientId,
        userRole,
        title: "Đơn đặt xe đã được tạo",
        body: `Đơn đặt xe${bookingRef ? ` #${bookingRef}` : ""} của bạn đã được ghi nhận thành công.`,
      };
    case "booking.accepted":
      return {
        userId: recipientId,
        userRole,
        title: "Đơn đặt xe đã được xác nhận",
        body: `Đơn đặt xe${bookingRef ? ` #${bookingRef}` : ""} đã được tài xế xác nhận${eventData.driverName ? ` bởi ${eventData.driverName}` : ""}.`,
      };
    case "booking.cancelled":
      return {
        userId: recipientId,
        userRole,
        title: "Đơn đặt xe đã bị hủy",
        body: `Đơn đặt xe${bookingRef ? ` #${bookingRef}` : ""} đã bị hủy${eventData.reason ? ` vì: ${eventData.reason}` : ""}.`,
      };
    case "driver.matched":
      // recipientId được xác định linh động từ payload (có thể là customerId hoặc driverId)
      // Matching Service cần publish 2 message riêng — một có userId=customerId, một có userId=driverId
      return {
        userId: recipientId,
        userRole: inferUserRole(routingKey, notificationPayload, recipientId),
        title:
          recipientId === eventData.driverId
            ? "Bạn có cuốc xe mới! 🚗"
            : "Đã tìm thấy tài xế!",
        body:
          recipientId === eventData.driverId
            ? `Bạn đã được gán cho chuyến xe${bookingRef ? ` #${bookingRef}` : ""}. ETA đến điểm đón: ${eventData.etaMinutes || "?"} phút.`
            : `Tài xế ${eventData.driverName || ""} (${eventData.vehiclePlate || ""}) đang đến đón bạn. ETA: ${eventData.etaMinutes || "?"} phút.`,
      };
    case "ride.arrived":
      return {
        userId: recipientId,
        userRole,
        title: "Tài xế đã đến điểm đón",
        body: `Tài xế${eventData.driverName ? ` ${eventData.driverName}` : ""} đã đến điểm đón${eventData.rideId ? ` cho chuyến #${eventData.rideId}` : ""}.`,
      };
    case "ride.started":
      return {
        userId: recipientId,
        userRole,
        title: "Chuyến đi đã bắt đầu",
        body: `Chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""} đã bắt đầu.`,
      };
    case "ride.completed":
      return {
        userId: recipientId,
        userRole,
        title: "Chuyến đi đã hoàn thành",
        body: `Chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""} đã hoàn thành. Cảm ơn bạn đã đồng hành cùng Cab Booking.`,
      };
    case "driver.ride.completed":
      return {
        userId: recipientId,
        userRole,
        title: "Chuyến đi đã hoàn thành",
        body: `Cảm ơn bạn đã hoàn thành chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""}.`,
      };
    case "payment.created":
      return {
        userId: recipientId,
        userRole,
        title: "Khởi tạo thanh toán thành công 💳",
        body: `Hóa đơn cho chuyến đi${bookingRef ? ` #${bookingRef}` : ""} đã sẵn sàng. Vui lòng thanh toán số tiền ${moneyText}${eventData.paymentMethod ? ` qua ${eventData.paymentMethod}` : ""}.`,
      };
    case "payment.completed":
      return {
        userId: recipientId,
        userRole,
        title: "Thanh toán thành công ✅",
        body: `Chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""} đã được thanh toán thành công${moneyText ? ` với số tiền ${moneyText}` : ""}${eventData.paymentMethod ? ` qua ${eventData.paymentMethod}` : ""}.`,
      };
    case "payment.failed":
      return {
        userId: recipientId,
        userRole,
        title: "Thanh toán thất bại ❌",
        body: `Không thể thanh toán cho chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""}${moneyText ? ` (${moneyText})` : ""}${eventData.reason ? `: ${eventData.reason}` : ""}.`,
      };
    case "pricing.estimate.calculated":
      return {
        userId: recipientId,
        userRole,
        title: "Đã có ước tính giá cước",
        body: `Giá ước tính cho hành trình${eventData.rideId ? ` #${eventData.rideId}` : ""}${formatCurrency(eventData.estimatedPrice, eventData.currency) ? ` là ${formatCurrency(eventData.estimatedPrice, eventData.currency)}` : ""}.`,
      };
    case "pricing.promotion.applied":
      return {
        userId: recipientId,
        userRole,
        title: "Khuyến mãi đã được áp dụng",
        body: `Ưu đãi${eventData.promotionCode ? ` ${eventData.promotionCode}` : ""} đã được áp dụng${formatCurrency(eventData.discountAmount, eventData.currency) ? `, giảm ${formatCurrency(eventData.discountAmount, eventData.currency)}` : ""}.`,
      };
    case "review.created":
      return {
        userId: recipientId,
        userRole,
        title: "Bạn vừa có một đánh giá mới",
        body: `Có một đánh giá mới liên quan đến chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""}${eventData.rating ? ` với số sao ${eventData.rating}` : ""}.`,
      };
    default:
      return {
        userId: recipientId,
        userRole,
        title: notificationPayload.title || "Thông báo mới",
        body:
          notificationPayload.body ||
          `Bạn vừa có một thông báo mới (${routingKey}).`,
      };
  }
}

/**
 * Chuẩn hóa payload đầu vào thành một object gọn gàng, sẵn sàng để lưu DB.
 *
 * Object trả về CHỈ chứa:
 *  - các trường điều phối   : eventId, eventType, routingKey, timestamp, source
 *  - các trường người dùng  : userId, userRole
 *  - nội dung thông báo     : title, body
 *  - dữ liệu chuyến xe      : bookingData — object thuần, đã bóc tách khỏi các wrapper lồng nhau
 *
 * KHÔNG bao gồm trường `metaData` chứa thông tin chuyến xe bị dội lại.
 */
function normalizeNotificationPayload(routingKey, notificationPayload = {}) {
  // Bóc tách bookingData sạch khỏi message có thể bị lồng nhiều tầng
  const bookingData = getEventData(notificationPayload);

  const content =
    notificationPayload.title && notificationPayload.body
      ? {
          userId:
            notificationPayload.userId ||
            extractRecipientId(notificationPayload),
          userRole:
            notificationPayload.userRole ||
            inferUserRole(
              routingKey,
              notificationPayload,
              extractRecipientId(notificationPayload),
            ),
          title: notificationPayload.title,
          body: notificationPayload.body,
        }
      : buildNotificationContent(routingKey, notificationPayload);

  const eventId =
    notificationPayload.eventId ||
    notificationPayload.traceId ||
    notificationPayload.id ||
    `AUTO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const eventType =
    notificationPayload.eventType ||
    notificationPayload.eventName ||
    notificationPayload.type ||
    routingKey;

  const timestamp =
    notificationPayload.timestamp ||
    bookingData.timestamp ||
    new Date().toISOString();

  const source =
    notificationPayload.source ||
    notificationPayload.sourceService ||
    bookingData.source ||
    bookingData.sourceService ||
    null;

  return {
    // --- Envelope (dùng để map vào sourceEventId, không lưu raw metaData) ---
    eventId,
    eventType,
    routingKey,
    timestamp,
    source,
    // --- Người dùng nhận thông báo ---
    userId: content.userId,
    userRole: content.userRole,
    // --- Nội dung thông báo ---
    title: content.title,
    body: content.body,
    // --- Dữ liệu chuyến xe đã bóc tách sạch — đây là THỨ DUY NHẤT được lưu xuống DB ---
    bookingData,
    // metaData đã bị loại bỏ cố tình — không dump raw message vào DB
  };
}

/**
 * Lưu thông báo vào DB và gửi qua Socket.IO (hoặc FCM fallback).
 * Hàm dùng chung để tránh lặp code khi gửi cho nhiều người nhận.
 */
async function saveAndDeliver(notificationType, routingKey, normalizedPayload) {
  const notification = new Notification({
    userId: normalizedPayload.userId,
    userRole: normalizedPayload.userRole || DEFAULT_USER_ROLE,
    type: notificationType,
    title: normalizedPayload.title,
    body: normalizedPayload.body,
    payload: normalizedPayload.bookingData || {},
    metaData: {
      eventType: normalizedPayload.eventType,
      routingKey: normalizedPayload.routingKey,
      timestamp: normalizedPayload.timestamp,
      source: normalizedPayload.source,
    },
    sourceEventId: normalizedPayload.eventId,
    status: "pending",
  });

  await notification.save();
  console.log(
    `💾 [NotificationCore] Đã lưu — type=${notificationType}, userId=${normalizedPayload.userId}`,
  );

  const isOnline = sendNotificationToUser(
    normalizedPayload.userId,
    "new_notification",
    {
      notificationId: notification._id,
      type: notificationType,
      title: normalizedPayload.title,
      body: normalizedPayload.body,
      routingKey: normalizedPayload.routingKey,
      data: normalizedPayload.bookingData || {},
    },
  );

  if (isOnline) {
    await notification.markAsSent("in_app_socket");
    notificationsSentTotal.inc({
      type: notificationType,
      delivery_method: "in_app_socket",
    });
    brokerMessagesProcessedTotal.inc({ topic: routingKey, status: "success" });
    console.log(
      `✅ [NotificationCore] Socket.IO thành công — userId=${normalizedPayload.userId}, status=sent`,
    );
    return;
  }

  console.log(
    `[NotificationCore] User offline, thử FCM fallback — userId=${normalizedPayload.userId}`,
  );

  const isPushSent = await sendPushNotification(
    normalizedPayload.userId,
    normalizedPayload.title,
    normalizedPayload.body,
    normalizedPayload,
  );

  if (isPushSent) {
    await notification.markAsSent("push_fcm");
    notificationsSentTotal.inc({
      type: notificationType,
      delivery_method: "push_fcm",
    });
    brokerMessagesProcessedTotal.inc({ topic: routingKey, status: "success" });
    console.log(
      `✅ [NotificationCore] FCM thành công — userId=${normalizedPayload.userId}, status=sent`,
    );
  } else {
    await notification.recordFailure("Socket offline and FCM delivery failed");
    notificationsSentTotal.inc({
      type: notificationType,
      delivery_method: "failed",
    });
    brokerMessagesProcessedTotal.inc({ topic: routingKey, status: "error" });
    console.error(
      `❌ [NotificationCore] Cả 2 kênh thất bại — userId=${normalizedPayload.userId}, status=failed`,
    );
  }
}

async function processNotification(routingKey, payload = {}) {
  const normalizedPayload = normalizeNotificationPayload(routingKey, payload);

  if (normalizedPayload.eventId) {
    const existing = await Notification.findOne({
      sourceEventId: normalizedPayload.eventId,
    }).lean();

    if (existing) {
      console.warn(
        `⚠️  [NotificationCore] Duplicate event bị bỏ qua — eventId=${normalizedPayload.eventId}, routingKey=${routingKey}`,
      );
      duplicateEventsTotal.inc({ topic: routingKey });
      brokerMessagesProcessedTotal.inc({
        topic: routingKey,
        status: "duplicate",
      });
      return;
    }
  }

  const stopTimer = notificationProcessingDuration.startTimer({
    topic: routingKey,
  });

  try {
    const notificationType = getNotificationType(routingKey);

    if (!normalizedPayload.userId) {
      throw new Error(
        `[NotificationCore] Không xác định được userId cho routingKey=${routingKey}`,
      );
    }

    // --- Gửi thông báo cho người nhận chính (customer) ---
    await saveAndDeliver(notificationType, routingKey, normalizedPayload);
    stopTimer();

    // --- Với sự kiện driver.matched: gửi thêm thông báo riêng cho tài xế ---
    if (routingKey === "driver.matched") {
      const eventData = getEventData(payload);
      const driverId = eventData.driverId;

      if (driverId && driverId !== normalizedPayload.userId) {
        console.log(
          `🚗 [NotificationCore] Gửi thêm thông báo cho tài xế — driverId=${driverId}`,
        );

        // Tạo bản sao payload với userId = driverId để buildNotificationContent
        // trả về nội dung phù hợp với tài xế (title: "Bạn có cuốc xe mới!")
        const driverPayload = { ...payload, userId: driverId };
        const driverNormalized = normalizeNotificationPayload(
          routingKey,
          driverPayload,
        );

        // Gán thủ công để chắc chắn gửi đúng người
        driverNormalized.userId = driverId;
        driverNormalized.userRole = "driver";
        driverNormalized.title = `Bạn có cuốc xe mới! 🚗`;
        driverNormalized.body = `Bạn đã được gán cho chuyến xe${eventData.rideId ? ` #${eventData.rideId}` : ""}. ETA đến điểm đón: ${eventData.etaMinutes || "?"} phút.`;
        // Dùng eventId khác để tránh bị lọc trùng
        driverNormalized.eventId = `${driverNormalized.eventId}_driver`;

        await saveAndDeliver(
          notificationType,
          routingKey,
          driverNormalized,
        ).catch((err) => {
          console.error(
            `❌ [NotificationCore] Gửi thông báo cho tài xế thất bại — driverId=${driverId}:`,
            err.message,
          );
        });
      } else if (!driverId) {
        console.warn(
          `⚠️  [NotificationCore] driver.matched nhưng không tìm thấy driverId trong payload`,
        );
      }
    }
  } catch (error) {
    stopTimer();
    brokerMessagesProcessedTotal.inc({ topic: routingKey, status: "error" });
    throw error;
  }
}

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

async function countUnread(userId) {
  return Notification.countUnread(userId);
}

async function markOneAsRead(notificationId, userId) {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
  });

  if (!notification) {
    return null;
  }

  return notification.markAsRead();
}

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
  getNotificationType,
  buildNotificationContent,
  normalizeNotificationPayload,
};
