require("dotenv").config();

const { connectDB } = require("./src/config/db");
const { connectRabbitMQ } = require("./src/config/rabbitMQ");
const paymentService = require("./src/services/payment.service");
const app = require("./src/app");
const mtls = require("../../../shared/mtls.cjs");

const PORT = process.env.PORT || 3005;
const server = mtls.createServer(app);
const protocol = mtls.getProtocol();

// 🚀 START SERVER TRƯỚC
server.listen(PORT, () => {
  console.log(`🚀 Payment Service running on ${protocol}://localhost:${PORT}`);
});

// 🔥 chạy async phía sau (KHÔNG await)
connectDB();
connectRabbitMQ().then(() => {
  paymentService.startConsumer();
});
