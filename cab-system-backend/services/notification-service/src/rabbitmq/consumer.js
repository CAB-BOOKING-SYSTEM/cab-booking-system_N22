"use strict";

const amqplib = require("amqplib");
const { processNotification } = require("../services/notificationCore.service");

const QUEUE_NAME = "notification_queue";

const EXCHANGES = [
  {
    name: "user.events",
    routingKeys: [
      "user.registered",
      "user.profile_updated",
      "user.account_banned",
    ],
  },
  {
    name: "booking.events",
    routingKeys: ["booking.created", "booking.accepted", "booking.cancelled"],
  },
  {
    name: "ride.events",
    routingKeys: ["ride.arrived", "ride.started", "ride.completed"],
  },
  {
    name: "driver.events",
    routingKeys: ["driver.ride.completed"],
  },
  {
    name: "payment.events",
    routingKeys: ["payment.completed", "payment.failed"],
  },
  {
    name: "pricing.events",
    routingKeys: ["pricing.estimate.calculated", "pricing.promotion.applied"],
  },
  {
    name: "review.events",
    routingKeys: ["review.created"],
  },
];

let connection = null;
let channel = null;
let consumerTag = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMessageContent(message) {
  const rawContent = message.content.toString("utf8");
  return JSON.parse(rawContent);
}

function getEventData(payload = {}) {
  if (payload && typeof payload.data === "object") {
    return payload.data || {};
  }

  return payload || {};
}

function extractRecipientId(payload = {}) {
  const eventData = getEventData(payload);

  return (
    eventData.userId ||
    eventData.customerId ||
    eventData.driverId ||
    payload.userId ||
    payload.customerId ||
    payload.driverId ||
    null
  );
}

function inferUserRole(routingKey, payload = {}, recipientId) {
  const eventData = getEventData(payload);

  if (eventData.userRole) {
    return eventData.userRole;
  }

  if (routingKey.startsWith("driver.") || recipientId === eventData.driverId) {
    return "driver";
  }

  if (recipientId === eventData.customerId) {
    return "customer";
  }

  return "customer";
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

function buildNotificationPayload(routingKey, payload = {}) {
  const eventData = getEventData(payload);
  const recipientId = extractRecipientId(payload);
  const userRole = inferUserRole(routingKey, payload, recipientId);
  const bookingRef =
    eventData.bookingId || eventData.rideId || eventData.requestId || "";
  const eventId = payload.eventId || eventData.eventId || null;
  const eventType =
    payload.eventType || payload.eventName || payload.type || routingKey;
  const timestamp =
    payload.timestamp || eventData.timestamp || new Date().toISOString();
  const source =
    payload.source ||
    payload.sourceService ||
    eventData.source ||
    eventData.sourceService ||
    null;
  const moneyText = formatCurrency(eventData.amount, eventData.currency);

  switch (routingKey) {
    case "user.registered":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Chào mừng bạn đến với Cab Booking",
        body: `Tài khoản của bạn đã được tạo thành công${eventData.fullName ? `, ${eventData.fullName}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    case "user.profile_updated":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Hồ sơ đã được cập nhật",
        body: `Thông tin hồ sơ của bạn vừa được cập nhật${eventData.updatedFields ? `: ${Array.isArray(eventData.updatedFields) ? eventData.updatedFields.join(", ") : eventData.updatedFields}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    case "user.account_banned":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Tài khoản đã bị tạm khóa",
        body: `Tài khoản của bạn đã bị tạm khóa${eventData.reason ? ` vì: ${eventData.reason}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    case "booking.created":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Đơn đặt xe đã được tạo",
        body: `Đơn đặt xe${bookingRef ? ` #${bookingRef}` : ""} của bạn đã được ghi nhận thành công.`,
        data: eventData,
        metaData: payload,
      };
    case "booking.accepted":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Đơn đặt xe đã được xác nhận",
        body: `Đơn đặt xe${bookingRef ? ` #${bookingRef}` : ""} đã được tài xế xác nhận${eventData.driverName ? ` bởi ${eventData.driverName}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    case "booking.cancelled":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Đơn đặt xe đã bị hủy",
        body: `Đơn đặt xe${bookingRef ? ` #${bookingRef}` : ""} đã bị hủy${eventData.reason ? ` vì: ${eventData.reason}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    case "ride.arrived":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Tài xế đã đến điểm đón",
        body: `Tài xế${eventData.driverName ? ` ${eventData.driverName}` : ""} đã đến điểm đón${eventData.rideId ? ` cho chuyến #${eventData.rideId}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    case "ride.started":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Chuyến đi đã bắt đầu",
        body: `Chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""} đã bắt đầu.`,
        data: eventData,
        metaData: payload,
      };
    case "ride.completed":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Chuyến đi đã hoàn thành",
        body: `Chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""} đã hoàn thành. Cảm ơn bạn đã đồng hành cùng Cab Booking.`,
        data: eventData,
        metaData: payload,
      };
    case "driver.ride.completed":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Chuyến đi đã hoàn thành",
        body: `Cảm ơn bạn đã hoàn thành chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    case "payment.completed":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Thanh toán thành công ✅",
        body: `Chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""} đã được thanh toán thành công${moneyText ? ` với số tiền ${moneyText}` : ""}${eventData.paymentMethod ? ` qua ${eventData.paymentMethod}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    case "payment.failed":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Thanh toán thất bại ❌",
        body: `Không thể thanh toán cho chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""}${moneyText ? ` (${moneyText})` : ""}${eventData.reason ? `: ${eventData.reason}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    case "pricing.estimate.calculated":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Đã có ước tính giá cước",
        body: `Giá ước tính cho hành trình${eventData.rideId ? ` #${eventData.rideId}` : ""}${formatCurrency(eventData.estimatedPrice, eventData.currency) ? ` là ${formatCurrency(eventData.estimatedPrice, eventData.currency)}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    case "pricing.promotion.applied":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Khuyến mãi đã được áp dụng",
        body: `Ưu đãi${eventData.promotionCode ? ` ${eventData.promotionCode}` : ""} đã được áp dụng${formatCurrency(eventData.discountAmount, eventData.currency) ? `, giảm ${formatCurrency(eventData.discountAmount, eventData.currency)}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    case "review.created":
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: "Bạn vừa có một đánh giá mới",
        body: `Có một đánh giá mới liên quan đến chuyến đi${eventData.rideId ? ` #${eventData.rideId}` : ""}${eventData.rating ? ` với số sao ${eventData.rating}` : ""}.`,
        data: eventData,
        metaData: payload,
      };
    default:
      return {
        eventId,
        eventType,
        timestamp,
        source,
        routingKey,
        userId: recipientId,
        userRole,
        title: payload.title || "Thông báo mới",
        body: payload.body || `Bạn vừa có một thông báo mới (${routingKey}).`,
        data: eventData,
        metaData: payload,
      };
  }
}

async function ensureTopology(channel) {
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  for (const exchange of EXCHANGES) {
    await channel.assertExchange(exchange.name, "topic", { durable: true });
    for (const routingKey of exchange.routingKeys) {
      await channel.bindQueue(QUEUE_NAME, exchange.name, routingKey);
    }
  }
}

async function runConsumer() {
  if (connection && channel) {
    return { connection, channel };
  }

  const rabbitUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";

  const maxRetries = Math.max(
    1,
    Number.parseInt(process.env.RABBITMQ_MAX_RETRIES || "8", 10),
  );
  const retryDelayMs = Math.max(
    500,
    Number.parseInt(process.env.RABBITMQ_RETRY_DELAY_MS || "3000", 10),
  );

  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      connection = await amqplib.connect(rabbitUrl);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      console.error(
        `❌ [RabbitMQ] Kết nối thất bại (${attempt}/${maxRetries}):`,
        error.message,
      );

      if (attempt < maxRetries) {
        console.log(
          `⏳ [RabbitMQ] Sẽ thử kết nối lại sau ${retryDelayMs}ms...`,
        );
        await sleep(retryDelayMs);
      }
    }
  }

  if (!connection) {
    throw lastError || new Error("RabbitMQ connection failed after retries");
  }

  connection.on("error", (error) => {
    console.error("❌ [RabbitMQ] Connection error:", error.message);
  });

  connection.on("close", () => {
    console.warn("⚠️  [RabbitMQ] Connection closed");
    connection = null;
    channel = null;
    consumerTag = null;
  });

  channel = await connection.createChannel();

  channel.on("error", (error) => {
    console.error("❌ [RabbitMQ] Channel error:", error.message);
  });

  channel.on("close", () => {
    console.warn("⚠️  [RabbitMQ] Channel closed");
    channel = null;
    consumerTag = null;
  });

  await ensureTopology(channel);
  await channel.prefetch(10);

  const consumeResult = await channel.consume(
    QUEUE_NAME,
    async (message) => {
      if (!message) {
        return;
      }

      const routingKey = message.fields.routingKey;

      try {
        const parsedPayload = parseMessageContent(message);
        const notificationPayload = buildNotificationPayload(
          routingKey,
          parsedPayload,
        );

        await processNotification(routingKey, notificationPayload);
        channel.ack(message);
      } catch (error) {
        console.error(
          `❌ [RabbitMQ] Xử lý message thất bại — routingKey=${routingKey}:`,
          error.message,
        );
        if (channel) {
          channel.nack(message, false, false);
        }
      }
    },
    { noAck: false },
  );

  consumerTag = consumeResult.consumerTag;
  console.log(
    `✅ [RabbitMQ] Consumer đã sẵn sàng trên queue ${QUEUE_NAME} với ${EXCHANGES.length} exchanges`,
  );

  return { connection, channel };
}

async function disconnectConsumer() {
  try {
    if (channel && consumerTag) {
      await channel.cancel(consumerTag);
    }
    if (channel) {
      await channel.close();
    }
  } finally {
    channel = null;
    consumerTag = null;
  }

  try {
    if (connection) {
      await connection.close();
    }
  } finally {
    connection = null;
  }
}

module.exports = {
  runConsumer,
  disconnectConsumer,
  QUEUE_NAME,
  EXCHANGES,
};
