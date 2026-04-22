require("dotenv").config();

const { connectDB } = require("./src/config/db");
const { connectRabbitMQ } = require("./src/config/rabbitMQ");
const paymentService = require("./src/services/payment.service");
const app = require("./src/app");

const PORT = process.env.PORT || 3005;

// 🚀 START SERVER TRƯỚC
app.listen(PORT, () => {
  console.log(`🚀 Payment Service running on http://localhost:${PORT}`);
});

// 🔥 chạy async phía sau (KHÔNG await)
connectDB();
connectRabbitMQ().then(() => {
  paymentService.startConsumer();
});
