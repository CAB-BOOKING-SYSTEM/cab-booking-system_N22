//D:\bc_bigdata\cab-booking-system_N22\cab-system-backend\services\payment-service\index.js
// index.js
require("dotenv").config();

const { connectDB } = require("./src/config/db");
const { connectRabbitMQ } = require("./src/config/rabbitMQ");
const paymentService = require("./src/services/payment.service");
const app = require("./src/app");

const PORT = process.env.PORT || 3005;

const start = async () => {
  try {
    // 1. Connect DB trước
    await connectDB();

    // 2. Connect RabbitMQ
    await connectRabbitMQ();

    // 3. Start Consumer (🔥 QUAN TRỌNG)
    await paymentService.startConsumer();
    console.log("✅ Consumer started");

    // 4. Start HTTP server SAU CÙNG
    app.listen(PORT, () => {
      console.log(`🚀 Payment Service running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("❌ Failed to start Payment Service:", err);
    process.exit(1);
  }
};

start();