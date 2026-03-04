/**
 * @file prometheus.js
 * @description Module tập trung quản lý toàn bộ Prometheus metrics.
 *
 * Thiết kế theo mô hình Singleton Registry:
 *   - Một Registry duy nhất cho toàn service
 *   - Định nghĩa tất cả custom metrics tại đây
 *   - Các module khác chỉ import hàm tương ứng, không tạo metric trùng lặp
 *
 * Metrics được expose tại endpoint GET /metrics để Prometheus scrape.
 */

"use strict";

const promClient = require("prom-client");

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Dùng Registry riêng thay vì globalRegistry để tránh xung đột
 * khi chạy test hoặc khi nhiều module cùng require file này.
 */
const register = new promClient.Registry();

// Thu thập các metric mặc định của Node.js:
// process_cpu_seconds_total, process_resident_memory_bytes,
// nodejs_event_loop_lag_seconds, nodejs_heap_size_total_bytes, v.v.
promClient.collectDefaultMetrics({
  register,
  prefix: "cab_notification_", // Prefix thống nhất cho toàn service
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ─── Custom Metrics ───────────────────────────────────────────────────────────

/**
 * Counter: Tổng số thông báo đã được xử lý từ Kafka.
 * Labels:
 *   - topic: "ride.assigned" | "payment.completed" | "payment.failed"
 */
const kafkaMessagesProcessedTotal = new promClient.Counter({
  name: "cab_notification_kafka_messages_processed_total",
  help: "Tổng số Kafka message đã được consumer xử lý",
  labelNames: ["topic", "status"], // status: success | duplicate | error
  registers: [register],
});

/**
 * Counter: Tổng số thông báo đã gửi thành công theo kênh phân phối.
 * Labels:
 *   - type            : "RideAssigned" | "PaymentCompleted" | "PaymentFailed"
 *   - delivery_method : "in_app_socket" | "push_fcm" | "failed"
 */
const notificationsSentTotal = new promClient.Counter({
  name: "cab_notification_sent_total",
  help: "Tổng số thông báo đã được phân phối (theo loại và kênh gửi)",
  labelNames: ["type", "delivery_method"],
  registers: [register],
});

/**
 * Gauge: Số lượng user đang kết nối Socket.IO tại thời điểm scrape.
 * Giá trị được set từ getOnlineCount() mỗi khi Prometheus scrape /metrics.
 */
const socketOnlineUsersGauge = new promClient.Gauge({
  name: "cab_notification_socket_online_users",
  help: "Số lượng user đang kết nối Socket.IO real-time",
  registers: [register],
});

/**
 * Histogram: Thời gian xử lý một Kafka message (từ lúc nhận đến khi lưu DB xong).
 * Cho phép tính P50 / P95 / P99 latency trong Grafana.
 */
const notificationProcessingDuration = new promClient.Histogram({
  name: "cab_notification_processing_duration_seconds",
  help: "Thời gian xử lý một thông báo từ Kafka đến khi lưu DB (giây)",
  labelNames: ["topic"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

/**
 * Counter: Số lần duplicate event bị phát hiện và bỏ qua (idempotency check).
 */
const duplicateEventsTotal = new promClient.Counter({
  name: "cab_notification_duplicate_events_total",
  help: "Số lần Kafka message bị bỏ qua do trùng eventId (idempotency)",
  labelNames: ["topic"],
  registers: [register],
});

// ─── Express Route Handler ────────────────────────────────────────────────────

/**
 * Middleware Express để Prometheus scrape metrics.
 * Mount tại: app.get('/metrics', metricsHandler)
 *
 * @param {import('express').Request}  _req
 * @param {import('express').Response} res
 */
const metricsHandler = async (_req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  register,
  metricsHandler,
  // Các metric để các service khác gọi .inc() / .set() / .observe()
  kafkaMessagesProcessedTotal,
  notificationsSentTotal,
  socketOnlineUsersGauge,
  notificationProcessingDuration,
  duplicateEventsTotal,
};
