const { io } = require("socket.io-client");

// ══════════════════════════════════════════════════════════════════════════════
// TEST CLIENT — Kết nối TRỰC TIẾP vào Notification Service (port 3004)
//
// ⚠️  LÝ DO bypass Gateway:
//   Gateway dùng express-http-proxy → KHÔNG hỗ trợ WebSocket upgrade.
//   Socket.IO cần kết nối trực tiếp vào service đang chạy socket.io Server.
//
// Cách chạy:
//   node test-client.js              → HTTPS (mTLS, production-like)
//   node test-client.js --no-mtls   → HTTP  (nếu chạy local không có cert)
// ══════════════════════════════════════════════════════════════════════════════

const useMtls = !process.argv.includes("--no-mtls");
const protocol = useMtls ? "https" : "http";
const PORT = 3004;
const USER_ID = "6"; // <-- Thay bằng userId của khách hàng bạn muốn test

const socket = io(`${protocol}://localhost:${PORT}`, {
  // Socket.IO dùng path mặc định "/socket.io" (không cần chỉnh)
  transports: ["polling", "websocket"],
  secure: useMtls,
  rejectUnauthorized: false, // Bỏ qua lỗi self-signed cert khi dev local
});

console.log(`⏳ Đang kết nối TRỰC TIẾP tới Notification Service...`);
console.log(`   URL  : ${protocol}://localhost:${PORT}`);
console.log(`   User : ${USER_ID}`);
console.log(`   mTLS : ${useMtls ? "BẬT" : "TẮT (--no-mtls)"}`);
console.log("─".repeat(60));

// ── Kết nối thành công ────────────────────────────────────────────────────────
socket.on("connect", () => {
  console.log("✅ KẾT NỐI THÀNH CÔNG!");
  console.log("📡 Socket ID:", socket.id);

  // Đăng ký userId để server biết socket này thuộc về ai
  socket.emit("register", USER_ID);
  console.log(`\n✅ Đã gửi 'register' với userId='${USER_ID}'`);
  console.log("🔔 Đang chờ thông báo... Hãy tạo Booking qua Postman/API.\n");
});

// ── Nhận thông báo real-time ──────────────────────────────────────────────────
socket.on("new_notification", (data) => {
  console.log("\n🔔 ═══ NHẬN ĐƯỢC THÔNG BÁO MỚI ═══");
  console.log(JSON.stringify(data, null, 2));
  console.log("════════════════════════════════════\n");
});

// ── Lỗi kết nối ──────────────────────────────────────────────────────────────
socket.on("connect_error", (err) => {
  console.error("\n❌ Lỗi kết nối:", err.message);
  if (useMtls) {
    console.log("💡 Nếu bị lỗi SSL/cert, thử chạy:  node test-client.js --no-mtls");
  } else {
    console.log("💡 Kiểm tra notification-service đã chạy chưa (port 3004)?");
    console.log("   docker ps | grep notification");
  }
});

// ── Ngắt kết nối ─────────────────────────────────────────────────────────────
socket.on("disconnect", (reason) => {
  console.log(`\n🔌 Mất kết nối. Lý do: ${reason}`);
});