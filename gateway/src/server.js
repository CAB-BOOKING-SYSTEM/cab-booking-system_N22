require("dotenv").config();
const app = require("./app");
const http = require("http");
const { createProxyServer } = require("http-proxy");

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Tạo proxy server cho WebSocket
const wsProxy = createProxyServer({
  target: "http://ride-service:3008",
  ws: true
});

// Xử lý sự kiện nâng cấp (Upgrade) để hỗ trợ WebSocket
server.on('upgrade', (req, socket, head) => {
  console.log(`[Gateway] Upgrading to WebSocket for: ${req.url}`);
  
  // Mặc định chuyển tiếp WebSocket đến ride-service (nơi quản lý trạng thái chuyến xe)
  wsProxy.ws(req, socket, head, (err) => {
    console.error('[Gateway] WebSocket Proxy Error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT} with WebSocket support`);
});
