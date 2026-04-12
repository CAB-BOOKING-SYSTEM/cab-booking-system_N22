/**
 * @file src/rabbitmq/consumer.js
 * @description RabbitMQ Consumer cho Notification Service
 */

"use strict";

const amqp = require("amqplib");
const Notification = require("../models/notification.model");
const { sendNotificationToUser } = require("../socket/socketHandler");
const { sendPushNotification } = require("../services/fcm.service");

let connection;
let channel;
let consumerTag;
let reconnectTimer;
let isShuttingDown = false;

// Khai báo Exchange cho User Service
const USER_EXCHANGE = "user.events";
const QUEUE_NAME = "notification_user_queue";
const RECONNECT_DELAY_MS = 5000;

// Danh sách các sự kiện cần lắng nghe từ User Service JSON
const ROUTING_KEYS = [
  "user.registered",
  "user.profile_updated",
  "user.account_banned",
];

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const scheduleReconnect = () => {
  if (isShuttingDown || reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    runConsumer().catch((err) => {
      console.error("❌ [RabbitMQ] Reconnect thất bại:", err.message);
      scheduleReconnect();
    });
  }, RECONNECT_DELAY_MS);

  console.warn(
    `⚠️  [RabbitMQ] Mất kết nối broker. Sẽ thử kết nối lại sau ${RECONNECT_DELAY_MS}ms`,
  );
};

const parseMessage = (msg) => {
  try {
    return JSON.parse(msg.content.toString("utf-8"));
  } catch (error) {
    console.error(
      "❌ [RabbitMQ] Message không phải JSON hợp lệ:",
      error.message,
    );
    return null;
  }
};

const pickUserId = (payload) => {
  const data = payload?.data || {};
  return payload?.userId || data.userId || data.id || null;
};

const buildUserNotificationContent = (routingKey, payload) => {
  const data = payload?.data || {};

  switch (routingKey) {
    case "user.registered": {
      const fullName = data.fullName || data.name || "bạn";
      return {
        title: "Chào mừng đến với Cab Booking",
        body: `Xin chào ${fullName}, tài khoản của bạn đã được tạo thành công.`,
      };
    }

    case "user.profile_updated": {
      const updatedFields = Array.isArray(data.updatedFields)
        ? data.updatedFields
        : Object.keys(data).filter((key) => key !== "userId");
      const fieldsText = updatedFields.length
        ? updatedFields.join(", ")
        : "thông tin hồ sơ";
      return {
        title: "Hồ sơ đã được cập nhật",
        body: `Bạn vừa cập nhật thành công: ${fieldsText}.`,
      };
    }

    case "user.account_banned": {
      const reason =
        data.banReasonDescription ||
        data.reason ||
        "vi phạm chính sách hệ thống";
      return {
        title: "Tài khoản bị tạm khóa",
        body: `Tài khoản của bạn đã bị khóa. Lý do: ${reason}.`,
      };
    }

    default:
      return {
        title: "Thông báo hệ thống",
        body: "Bạn có một thông báo mới từ hệ thống.",
      };
  }
};

/**
 * Xử lý từng User event: build nội dung, lưu DB và phát qua Socket/FCM.
 */
const handleUserEvent = async (routingKey, payload) => {
  const userId = pickUserId(payload);
  if (!userId) {
    throw new Error(
      `Không tìm thấy userId trong payload của event ${routingKey}`,
    );
  }

  const data = payload?.data || {};
  const { title, body } = buildUserNotificationContent(routingKey, payload);

  const notification = new Notification({
    userId,
    userRole: payload?.userRole || data?.userRole || "customer",
    type: "SystemAlert",
    title,
    body,
    payload,
    sourceEventId: payload?.eventId,
    status: "pending",
  });

  await notification.save();

  const socketPayload = {
    notificationId: notification._id,
    type: notification.type,
    title,
    body,
    data: payload,
  };

  const isOnline = sendNotificationToUser(
    userId,
    "new_notification",
    socketPayload,
  );
  if (isOnline) {
    await notification.markAsSent("in_app_socket");
    return;
  }

  const isPushSent = await sendPushNotification(userId, title, body, payload);
  if (isPushSent) {
    await notification.markAsSent("push_fcm");
    return;
  }

  await notification.recordFailure("Socket offline and FCM delivery failed");
};

const runConsumer = async () => {
  if (isShuttingDown) return;
  if (connection && channel) return;

  const rabbitMqUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";

  try {
    connection = await amqp.connect(rabbitMqUrl);
    connection.on("error", (err) => {
      console.error("❌ [RabbitMQ] Connection error:", err.message);
    });

    connection.on("close", () => {
      console.warn("⚠️  [RabbitMQ] Connection closed");
      connection = null;
      channel = null;
      consumerTag = null;
      scheduleReconnect();
    });

    channel = await connection.createChannel();
    await channel.prefetch(10);

    await channel.assertExchange(USER_EXCHANGE, "topic", { durable: true });
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    for (const routingKey of ROUTING_KEYS) {
      await channel.bindQueue(QUEUE_NAME, USER_EXCHANGE, routingKey);
      console.log(`📡 [RabbitMQ] Bound queue with routing key: ${routingKey}`);
    }

    const consumeResult = await channel.consume(
      QUEUE_NAME,
      async (msg) => {
        if (!msg) return;

        const routingKey = msg.fields.routingKey;
        const payload = parseMessage(msg);

        if (!payload) {
          channel.ack(msg);
          return;
        }

        try {
          await handleUserEvent(routingKey, payload);
          channel.ack(msg);
          console.log(`✅ [RabbitMQ] Đã xử lý event: ${routingKey}`);
        } catch (err) {
          console.error(
            `❌ [RabbitMQ] Xử lý event thất bại (${routingKey}):`,
            err.message,
          );
          channel.nack(msg, false, true);
        }
      },
      { noAck: false },
    );

    consumerTag = consumeResult.consumerTag;
    clearReconnectTimer();
    console.log(
      `✅ [RabbitMQ] Consumer đã sẵn sàng tại exchange=${USER_EXCHANGE}, queue=${QUEUE_NAME}`,
    );
  } catch (error) {
    console.error("❌ [RabbitMQ] Lỗi khởi tạo Consumer:", error.message);
    connection = null;
    channel = null;
    consumerTag = null;
    scheduleReconnect();
    throw error;
  }
};

const disconnectConsumer = async () => {
  isShuttingDown = true;
  clearReconnectTimer();

  try {
    if (channel && consumerTag) {
      await channel.cancel(consumerTag);
    }
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }

    consumerTag = null;
    channel = null;
    connection = null;
    console.log("🔌 [RabbitMQ] Đã ngắt kết nối an toàn");
  } catch (err) {
    console.error("❌ [RabbitMQ] Lỗi khi ngắt kết nối:", err.message);
  }
};

module.exports = { runConsumer, disconnectConsumer };
