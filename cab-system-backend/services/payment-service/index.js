require("dotenv").config();

const app = require("./src/app");
const mtls = require("../../../shared/mtls.cjs");
const messageBroker = require("./src/utils/messageBroker");
const paymentService = require("./src/services/payment.service");
const { createQueues } = require("./src/services/payment.consumer");

const PORT = process.env.PORT || 3005;
const server = mtls.createServer(app);
const protocol = mtls.getProtocol();

server.listen(PORT, () => {
  console.log(`🚀 Payment Service running on ${protocol}://localhost:${PORT}`);
});

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
}

start();
