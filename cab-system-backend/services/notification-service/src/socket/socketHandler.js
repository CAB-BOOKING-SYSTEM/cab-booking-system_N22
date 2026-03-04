/**
 * @file socketHandler.js
 * @description Module quản lý kết nối Socket.IO cho Notification Service.
 *
 * Chịu trách nhiệm:
 *   - Khởi tạo Socket.IO server gắn vào HTTP server của Express
 *   - Duy trì Map ánh xạ userId → socket.id của những user đang online
 *   - Cung cấp hàm sendNotificationToUser() để Kafka consumer gọi khi có event mới
 *
 * ⚠️  LƯU Ý SCALE-OUT:
 *   Hiện tại userSockets dùng in-memory Map — phù hợp cho 1 instance (dev/staging).
 *   Khi deploy Docker Swarm / Kubernetes với nhiều Replica, cần thay Map này
 *   bằng Redis Adapter (socket.io-redis) để đồng bộ trạng thái giữa các node.
 */

"use strict";

const { Server } = require("socket.io");

// ─── In-memory store: userId → socket.id ─────────────────────────────────────
/**
 * Map lưu trữ ánh xạ giữa userId (business ID) và socket.id (connection ID).
 * Key   : userId  — VD: "cust_556677"
 * Value : socket.id — VD: "xK2mP9qR..."
 *
 * @type {Map<string, string>}
 */
const userSockets = new Map();

/** Instance Socket.IO Server (được gán trong initSocket) */
let io;

// ─── Khởi tạo Socket.IO ───────────────────────────────────────────────────────

/**
 * Gắn Socket.IO vào HTTP server đã tạo sẵn bởi Express.
 * Phải được gọi 1 lần trước khi runConsumer() trong index.js.
 *
 * @param {import('http').Server} server - HTTP server từ http.createServer(app)
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*", // Tuỳ chỉnh domain khi lên production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 [Socket.IO] Client kết nối mới: socketId=${socket.id}`);

    // ── Đăng ký userId sau khi client login thành công ───────────────────────
    /**
     * Client gửi sự kiện "register" ngay sau khi nhận được token đăng nhập.
     * Payload: userId (string) — VD: "cust_556677"
     */
    socket.on("register", (userId) => {
      if (!userId || typeof userId !== "string") {
        console.warn(
          `⚠️  [Socket.IO] Nhận "register" với userId không hợp lệ từ socketId=${socket.id}`
        );
        return;
      }

      // Nếu user đã có socket cũ (tab khác / reconnect), ghi đè bằng socket mới
      userSockets.set(userId, socket.id);
      console.log(
        `✅ [Socket.IO] Đã đăng ký — userId=${userId}, socketId=${socket.id} | Tổng online: ${userSockets.size}`
      );
    });

    // ── Xử lý ngắt kết nối ──────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      // Tìm và xóa userId tương ứng với socket vừa ngắt kết nối
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          console.log(
            `❌ [Socket.IO] User offline — userId=${userId}, reason=${reason} | Còn online: ${userSockets.size}`
          );
          break;
        }
      }
    });
  });

  console.log("✅ [Socket.IO] Server đã khởi tạo và sẵn sàng nhận kết nối");
};

// ─── Gửi thông báo tới một User cụ thể ───────────────────────────────────────

/**
 * Bắn một Socket.IO event tới client của userId đang online.
 *
 * @param {string} userId    - Business ID của người nhận (VD: "cust_556677")
 * @param {string} eventType - Tên event mà client lắng nghe (VD: "new_notification")
 * @param {Object} payload   - Dữ liệu gửi kèm theo event
 * @returns {boolean}        - true nếu user đang online & đã gửi, false nếu offline
 */
const sendNotificationToUser = (userId, eventType, payload) => {
  if (!io) {
    console.error(
      "❌ [Socket.IO] io chưa được khởi tạo. Hãy gọi initSocket() trước."
    );
    return false;
  }

  const socketId = userSockets.get(userId);

  if (socketId) {
    io.to(socketId).emit(eventType, payload);
    console.log(
      `🚀 [Socket.IO] Đã đẩy real-time — event=${eventType}, userId=${userId}, socketId=${socketId}`
    );
    return true; // User online — gửi thành công
  }

  console.log(
    `⚠️  [Socket.IO] User offline — event=${eventType} không gửi được tới userId=${userId}`
  );
  return false; // User offline — cần fallback (FCM/APNs)
};

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Trả về số lượng user đang online (dùng cho health check / metrics).
 * @returns {number}
 */
const getOnlineCount = () => userSockets.size;

module.exports = { initSocket, sendNotificationToUser, getOnlineCount };
