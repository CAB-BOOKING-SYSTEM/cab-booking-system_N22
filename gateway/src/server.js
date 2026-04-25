require("dotenv").config();
const app = require("./app");
const mtls = require("/shared/mtls.cjs");

const PORT = process.env.PORT || 3000;

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Gateway does NOT require client certificates from browsers
const server = mtls.createServer(app, { requestCert: false, rejectUnauthorized: false });
const protocol = mtls.getProtocol();

server.listen(PORT, () => {
  console.log(`API Gateway is running on ${protocol}://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
