const path = require("path");
const dotenv = require("dotenv");

// Load env in this order: local service .env, repo root .env.
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const app = require("./src/app");
const { connectDatabase } = require("./src/config/database");
const { connectRedis } = require("./src/config/redis");
const { connectRabbitMQ } = require("./src/config/rabbitmq");
const PaymentConsumer = require("./payment.consumer");
const mtls = require("../../../shared/mtls.cjs");

const PORT = process.env.PORT || process.env.REVIEW_PORT || 3007;

const bootstrap = async () => {
  try {
    console.log(
      `[Bootstrap] Review Service is starting in ${process.env.NODE_ENV || "development"} mode`,
    );

    await connectDatabase();
    await connectRedis();
    await connectRabbitMQ();

    const paymentConsumer = new PaymentConsumer();
    await paymentConsumer.start();

    const server = mtls.createServer(app);
    const protocol = mtls.getProtocol();

    server.listen(PORT, () => {
      console.log(`[Bootstrap] Review Service is running on ${protocol}://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("[Bootstrap] Failed to start Review Service:", error);
    process.exit(1);
  }
};

bootstrap();
