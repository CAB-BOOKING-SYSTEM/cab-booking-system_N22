const { io } = require("socket.io-client");
const https = require("https");

console.log("⏳ Bỏ qua HTTP Polling, ép dùng 100% WebSocket để xuyên Gateway...");

const socket = io("https://localhost:3000", {
  path: "/socket.io", 
  
  agent: new https.Agent({ rejectUnauthorized: false }),
  
  // 🚀 CHÌA KHÓA VÀNG: Cấm Polling, dùng thẳng WebSocket
  transports: ["websocket"], 
  
  secure: true,
  rejectUnauthorized: false
});

socket.on("connect", () => {
  console.log("✅ [SUCCESS] ĐÃ KẾT NỐI WEBSOCKET THÀNH CÔNG!");
  
  socket.emit("register", "1");
  console.log("✅ Đã gia nhập phòng nhận thông báo (userId = 1).");
  console.log("👉 BÂY GIỜ HÃY QUA POSTMAN BẮN API TẠO BOOKING ĐI HIỀN!");
});

socket.on("connect_error", (err) => {
  console.error("❌ Lỗi kết nối:", err.message);
});

socket.on("new_notification", (data) => {
  console.log("\n🔔 [TING TING] NHẬN ĐƯỢC THÔNG BÁO TỪ HỆ THỐNG:");
  console.log(JSON.stringify(data, null, 2));
});
