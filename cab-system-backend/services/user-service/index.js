require("dotenv").config();

const app = require("./src/app");
const messageBroker = require("./src/utils/messageBroker");
const PaymentService = require("./src/services/paymentsService");

const RETRY_INTERVAL = 5000;

async function waitForRabbitMQ(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      await messageBroker.connect();
      console.log("RabbitMQ connected");
      return; // thành công → thoát
    } catch (error) {
      console.error(`RabbitMQ not ready (attempt ${i}/${retries}), retrying in ${RETRY_INTERVAL / 1000}s...`);
      await new Promise((res) => setTimeout(res, RETRY_INTERVAL));
    }
  }
  throw new Error("Cannot connect to RabbitMQ after max retries");
}

async function start() {
  try {
    console.log("Connecting to RabbitMQ...");
    await waitForRabbitMQ();

    // Đợi kết nối ổn định rồi mới start consumer
    const paymentService = new PaymentService();
    await paymentService.startConsumer();
    console.log("Consumer started");

    const PORT = process.env.PORT || 3005;
    app.listen(PORT, () => {
      console.log(`Payment service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Service start failed:", error.message);
    process.exit(1);
  }
}

start();