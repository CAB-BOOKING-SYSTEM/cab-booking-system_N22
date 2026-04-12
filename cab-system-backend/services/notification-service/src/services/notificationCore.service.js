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

const DEFAULT_USER_ROLE = "customer";

function getEventData(notificationPayload = {}) {
  if (notificationPayload && typeof notificationPayload.data === "object") {
    return notificationPayload.data || {};
  }

  return notificationPayload || {};
}

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

function normalizeNotificationPayload(routingKey, notificationPayload = {}) {
  const eventData = getEventData(notificationPayload);
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

  return {
    eventId:
      notificationPayload.eventId ||
      notificationPayload.id ||
      eventData.eventId ||
      null,
    eventType:
      notificationPayload.eventType ||
      notificationPayload.eventName ||
      notificationPayload.type ||
      routingKey,
    routingKey,
    timestamp:
      notificationPayload.timestamp ||
      eventData.timestamp ||
      new Date().toISOString(),
    source:
      notificationPayload.source ||
      notificationPayload.sourceService ||
      eventData.source ||
      eventData.sourceService ||
      null,
    userId: content.userId,
    userRole: content.userRole,
    title: content.title,
    body: content.body,
    data: eventData,
    metaData: notificationPayload.metaData || notificationPayload,
  };
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

    const notification = new Notification({
      userId: normalizedPayload.userId,
      userRole: normalizedPayload.userRole || DEFAULT_USER_ROLE,
      type: notificationType,
      title: normalizedPayload.title,
      body: normalizedPayload.body,
      payload: normalizedPayload,
      metaData: normalizedPayload.metaData,
      sourceEventId: normalizedPayload.eventId,
      status: "pending",
    });

    await notification.save();
    stopTimer();

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
        routingKey,
        data: normalizedPayload.data,
        metaData: normalizedPayload.metaData,
      },
    );

    if (isOnline) {
      await notification.markAsSent("in_app_socket");
      notificationsSentTotal.inc({
        type: notificationType,
        delivery_method: "in_app_socket",
      });
      brokerMessagesProcessedTotal.inc({
        topic: routingKey,
        status: "success",
      });
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
      brokerMessagesProcessedTotal.inc({
        topic: routingKey,
        status: "success",
      });
      console.log(
        `✅ [NotificationCore] FCM thành công — userId=${normalizedPayload.userId}, status=sent`,
      );
    } else {
      await notification.recordFailure(
        "Socket offline and FCM delivery failed",
      );
      notificationsSentTotal.inc({
        type: notificationType,
        delivery_method: "failed",
      });
      brokerMessagesProcessedTotal.inc({ topic: routingKey, status: "error" });
      console.error(
        `❌ [NotificationCore] Cả 2 kênh thất bại — userId=${normalizedPayload.userId}, status=failed`,
      );
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
