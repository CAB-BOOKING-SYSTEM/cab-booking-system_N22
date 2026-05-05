//D:\bc_cki_new3\cab-booking-system_N22\cab-system-backend\services\payment-service\index.js
require("dotenv").config();
const app            = require("./src/app");
const messageBroker  = require("./src/utils/messageBroker");
const paymentService = require("./src/services/payment.service");
const { createQueues } = require("./src/services/payment.consumer");

const PORT = process.env.PORT || 3005;

async function start() {
  while (true) {
    try {
      await messageBroker.connect();
      console.log("✅ RabbitMQ connected");

      await createQueues();
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