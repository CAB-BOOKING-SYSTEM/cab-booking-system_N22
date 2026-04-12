require("dotenv").config();

const { connectDB } = require("./src/config/db");
const { connectRabbitMQ } = require("./src/config/rabbitMQ");
const paymentService = require("./src/services/payment.service");
const app = require("./src/app");

async function start() {
  await connectDB();
  await connectRabbitMQ(); // 🔥 thêm dòng này
  await paymentService.startConsumer();

  const PORT = process.env.PORT || 3005;
  app.listen(PORT, () => {
    console.log(`🚀 Payment Service running on http://localhost:${PORT}`);
  });
}

start();