/**
 * @file consumer.js
 * @description Kafka Infrastructure layer cho Notification Service.
 *
 * Tầng này chỉ chịu trách nhiệm:
 *   - Kết nối Kafka broker
 *   - Subscribe các topics
 *   - Parse & validate JSON message
 *   - Uỷ thác xử lý sang notificationCore.service.js
 *
 * KHÔNG chứa business logic — mọi quyết định lưu DB / gửi socket / FCM
 * đều nằm ở tầng Service.
 */

"use strict";

const { Kafka, logLevel } = require("kafkajs");
const {
  processNotification,
  TOPIC_TO_TYPE,
} = require("../services/notificationCore.service");
const {
  validateRideAssignedPayload,
} = require("../schemas/events/rideAssigned.schema");
const {
  validatePaymentCompletedPayload,
} = require("../schemas/events/paymentCompleted.schema");
const {
  validatePaymentFailedPayload,
} = require("../schemas/events/paymentFailed.schema");

// ─── Validator map ────────────────────────────────────────────────────────────

const TOPIC_VALIDATORS = {
  "ride.assigned": validateRideAssignedPayload,
  "payment.completed": validatePaymentCompletedPayload,
  "payment.failed": validatePaymentFailedPayload,
};

// ─── Khởi tạo Kafka Client ────────────────────────────────────────────────────

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: (process.env.KAFKA_BROKER || "localhost:9092").split(","),
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 300, retries: 10 },
});

/**
 * Consumer groupId = "notification-group".
 * Khi scale nhiều pods, Kafka tự rebalance partition trong cùng group
 * → load balancing & không duplicate event.
 */
const consumer = kafka.consumer({
  groupId: "notification-group",
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

// ─── Khởi chạy Consumer ───────────────────────────────────────────────────────

/**
 * Kết nối broker, subscribe tất cả topics và bắt đầu consume.
 * Được gọi 1 lần từ index.js khi service khởi động.
 *
 * @returns {Promise<void>}
 */
const runConsumer = async () => {
  await consumer.connect();
  console.log("✅ [Kafka] Consumer đã kết nối tới broker thành công");

  for (const topic of Object.keys(TOPIC_TO_TYPE)) {
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`📡 [Kafka] Subscribed to topic: ${topic}`);
  }

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const offset = message.offset;

      // ── 1. Parse JSON ───────────────────────────────────────────────────────
      let payload;
      try {
        payload = JSON.parse(message.value.toString());
      } catch (parseErr) {
        console.error(
          `❌ [Kafka] Không thể parse JSON — topic=${topic}, offset=${offset}:`,
          parseErr.message
        );
        return;
      }

      console.log(
        `📨 [Kafka] Nhận event — topic=${topic}, partition=${partition}, offset=${offset}, eventId=${payload.eventId}`
      );

      // ── 2. Validate schema ──────────────────────────────────────────────────
      const validator = TOPIC_VALIDATORS[topic];
      if (validator) {
        const { isValid, errors } = validator(payload);
        if (!isValid) {
          console.warn(
            `⚠️  [Kafka] Payload không hợp lệ — topic=${topic}, offset=${offset}:`,
            errors
          );
          return; // Bỏ qua message lỗi schema, không block consumer
        }
      }

      // ── 3. Uỷ thác xử lý cho Business Logic layer ──────────────────────────
      try {
        await processNotification(topic, payload);
      } catch (err) {
        // Không re-throw — tránh crash consumer
        // Production nên chuyển message này sang Dead Letter Queue (DLQ)
        console.error(
          `❌ [Kafka] Lỗi xử lý message — topic=${topic}, offset=${offset}:`,
          err.message
        );
      }
    },
  });
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

/**
 * Ngắt kết nối an toàn khi service shutdown.
 * @returns {Promise<void>}
 */
const disconnectConsumer = async () => {
  await consumer.disconnect();
  console.log("🔌 [Kafka] Consumer đã ngắt kết nối");
};

module.exports = { runConsumer, disconnectConsumer };
