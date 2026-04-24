"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const { runConsumer, disconnectConsumer } = require("./src/rabbitmq/consumer");
const { initSocket, getOnlineCount } = require("./src/socket/socketHandler");
const notificationRoutes = require("./src/routes/notification.routes");
const {
  metricsHandler,
  socketOnlineUsersGauge,
} = require("./src/metrics/prometheus");
const mtls = require("../../../shared/mtls.cjs");

const app = express();
const server = mtls.createServer(app);
const PORT = process.env.PORT || 3004;
const DB_URL = process.env.DB_URL;
const NODE_ENV = process.env.NODE_ENV || "development";
const RABBITMQ_ENABLED = ["true", "1", "yes", "on"].includes(
  String(process.env.RABBITMQ_ENABLED || "true").toLowerCase(),
);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Service is running smoothly!",
    timestamp: new Date().toISOString(),
    service: "Notification Service",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/health", (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? "healthy" : "unhealthy",
    db: dbReady ? "connected" : "disconnected",
    socketOnlineUsers: getOnlineCount(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Prometheus Metrics Endpoint ──────────────────────────────────────────────
// Cập nhật gauge số user online ngay trước khi Prometheus kéo dữ liệu
app.get("/metrics", (req, res) => {
  socketOnlineUsersGauge.set(getOnlineCount());
  return metricsHandler(req, res);
});

// REST API — Notification CRUD (Frontend gọi để lấy lịch sử, đánh dấu đã đọc)
app.use("/notifications", notificationRoutes);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const start = async () => {
  // 1. Kết nối MongoDB
  if (!DB_URL) {
    console.error(
      "❌ Biến môi trường DB_URL chưa được cấu hình. Dừng service.",
    );
    process.exit(1);
  }

  console.log("⏳ [MongoDB] Đang kết nối tới database..."); // Thêm dòng này để biết nó đang chạy
  await mongoose.connect(DB_URL, {
    serverSelectionTimeoutMS: 5000, // Nếu sau 5 giây không kết nối được thì báo lỗi ngay, không treo máy
  });
  console.log("✅ [MongoDB] Kết nối thành công tới database");
  // 2. Khởi tạo Socket.IO (phải trước runConsumer vì consumer gọi sendNotificationToUser)
  initSocket(server);

  // 3. Khởi động RabbitMQ Consumer
  if (RABBITMQ_ENABLED) {
    await runConsumer().catch((err) => {
      console.error(
        "❌ [RabbitMQ] Consumer gặp lỗi nghiêm trọng:",
        err.message,
      );
    });
  } else {
    console.warn(
      "⚠️  [RabbitMQ] Bị tắt (RABBITMQ_ENABLED=false) — chỉ chạy REST + Socket.IO",
    );
  }

  // 4. Khởi động HTTP server (Socket.IO dùng chung server này)
  const protocol = mtls.getProtocol();
  server.listen(PORT, () => {
    console.log(
      `🚀 Notification Service đang chạy tại ${protocol}://localhost:${PORT} [${NODE_ENV}]`,
    );
    console.log(
      `🔌 Socket.IO đang lắng nghe tại ${protocol === "https" ? "wss" : "ws"}://localhost:${PORT}`,
    );
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n⚠️  Nhận tín hiệu ${signal}. Đang tắt service an toàn...`);

    server.close(async () => {
      try {
        await disconnectConsumer(); // Ngắt RabbitMQ consumer
        await mongoose.connection.close(); // Đóng kết nối MongoDB
        console.log("✅ Service đã tắt hoàn toàn. Goodbye!");
        process.exit(0);
      } catch (err) {
        console.error("❌ Lỗi trong quá trình tắt service:", err.message);
        process.exit(1);
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM")); // Docker / K8s stop
  process.on("SIGINT", () => shutdown("SIGINT")); // Ctrl+C khi dev local
};

start().catch((err) => {
  console.error("❌ Không thể khởi động service:", err.message);
  process.exit(1);
});
