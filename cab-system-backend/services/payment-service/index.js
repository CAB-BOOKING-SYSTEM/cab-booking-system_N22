require("dotenv").config();

const app = require("./src/app");
const messageBroker = require("./src/utils/messageBroker");
const paymentService = require("./src/services/payment.service");
const { createQueues } = require("./src/services/payment.consumer");

const PORT = process.env.PORT || 3005;

// 🔥 START SERVER + RETRY
async function start() {
  while (true) {
    try {
      await messageBroker.connect();
      console.log("✅ RabbitMQ connected");

      // tạo debug queue
      await createQueues();

      // start consumer
      await paymentService.startConsumer();

      break;
    } catch (err) {
      console.log("❌ Start fail → retry 3s...");
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 Payment running at ${PORT}`);
  });
}

start();