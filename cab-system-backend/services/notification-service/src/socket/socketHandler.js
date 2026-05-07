/**
 * @file socketHandler.js
 * @description Module quản lý kết nối Socket.IO cho Notification Service.
 *
 * Chịu trách nhiệm:
 *   - Khởi tạo Socket.IO server gắn vào HTTP server của Express
 *   - Duy trì Map ánh xạ userId → socket.id của những user đang online
 *   - Cung cấp hàm sendNotificationToUser() để RabbitMQ consumer gọi khi có event mới
 *
 * 🔒 Bảo mật:
 *   - Dùng io.use() middleware để xác thực JWT trước khi chấp nhận kết nối WebSocket.
 *   - userId được lấy từ Token đã giải mã, không tin vào sự kiện "register" do client tự gửi.
 *
 * ⚠️  LƯU Ý SCALE-OUT:
 *   Hiện tại userSockets dùng in-memory Map — phù hợp cho 1 instance (dev/staging).
 *   Khi deploy Docker Swarm / Kubernetes với nhiều Replica, cần thay Map này
 *   bằng Redis Adapter (socket.io-redis) để đồng bộ trạng thái giữa các node.
 */

"use strict";

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

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
  //  path: "/api/notifications/socket.io",
    cors: {
      origin: process.env.CORS_ORIGIN || "*", // Tuỳ chỉnh domain khi lên production
      methods: ["GET", "POST"],
    },
  });

  // ── 🔒 JWT Middleware cho Socket.IO ────────────────────────────────────────
  /**
   * io.use() chạy TRƯỚC khi sự kiện "connection" được xử lý.
   * Client phải truyền token qua handshake auth: { token: "Bearer <jwt>" }
   * hoặc query: ?token=<jwt>
   *
   * Nếu token không hợp lệ → từ chối kết nối với lỗi 401/403.
   */
  io.use((socket, next) => {
    // Ưu tiên lấy từ auth object (socket.io client v3+), fallback sang query
    const rawToken =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization ||
      (socket.handshake.query?.token
        ? `Bearer ${socket.handshake.query.token}`
        : null);

    if (!rawToken) {
      console.warn(
        `⛔ [Socket.IO] Từ chối kết nối — không có token: socketId=${socket.id}`,
      );
      return next(new Error("UNAUTHORIZED: Token xác thực không được cung cấp."));
    }

    // Tách "Bearer " nếu có
    const token = rawToken.startsWith("Bearer ")
      ? rawToken.split(" ")[1]
      : rawToken;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Gắn thông tin user vào socket để dùng trong connection handler
      socket.user = decoded;
      next();
    } catch (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "FORBIDDEN: Token đã hết hạn."
          : "FORBIDDEN: Token không hợp lệ.";
      console.warn(
        `⛔ [Socket.IO] Từ chối kết nối — ${message}: socketId=${socket.id}`,
      );
      return next(new Error(message));
    }
  });

  io.on("connection", (socket) => {
    // socket.user đã được gán từ middleware JWT ở trên
    const userId = socket.user?.id;

    console.log(
      `🔌 [Socket.IO] Client kết nối mới: socketId=${socket.id}, userId=${userId}`,
    );

    if (userId) {
      // Nếu user đã có socket cũ (tab khác / reconnect), ghi đè bằng socket mới
      userSockets.set(userId, socket.id);
      console.log(
        `✅ [Socket.IO] Đã đăng ký từ Token — userId=${userId}, socketId=${socket.id} | Tổng online: ${userSockets.size}`,
      );
    }

    // ── Backward-compatible: vẫn hỗ trợ sự kiện "register" (legacy) ─────────
    // Tuy nhiên userId từ token sẽ được ưu tiên hơn.
    socket.on("register", (clientUserId) => {
      if (!clientUserId || typeof clientUserId !== "string") {
        console.warn(
          `⚠️  [Socket.IO] Nhận "register" với userId không hợp lệ từ socketId=${socket.id}`,
        );
        return;
      }

      // 🔒 Chỉ cho phép register đúng userId từ token
      if (userId && clientUserId !== userId) {
        console.warn(
          `⛔ [Socket.IO] Register bị từ chối — clientUserId=${clientUserId} không khớp token userId=${userId}`,
        );
        socket.emit("register_error", { message: "userId không khớp với token." });
        return;
      }

      userSockets.set(clientUserId, socket.id);
      console.log(
        `✅ [Socket.IO] Register (legacy) — userId=${clientUserId}, socketId=${socket.id} | Tổng online: ${userSockets.size}`,
      );
    });

    // ── Xử lý ngắt kết nối ──────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      // Tìm và xóa userId tương ứng với socket vừa ngắt kết nối
      for (const [uid, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(uid);
          console.log(
            `❌ [Socket.IO] User offline — userId=${uid}, reason=${reason} | Còn online: ${userSockets.size}`,
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
      "❌ [Socket.IO] io chưa được khởi tạo. Hãy gọi initSocket() trước.",
    );
    return false;
  }

  const socketId = userSockets.get(userId);

  if (socketId) {
    io.to(socketId).emit(eventType, payload);
    console.log(
      `🚀 [Socket.IO] Đã đẩy real-time — event=${eventType}, userId=${userId}, socketId=${socketId}`,
    );
    return true; // User online — gửi thành công
  }

  console.log(
    `⚠️  [Socket.IO] User offline — event=${eventType} không gửi được tới userId=${userId}`,
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
