const app = require("./app");
const connectDB = require("./database/dbConnection");
const { connectRedis } = require("./config/redisConfig");
const { connectRabbitMQ } = require("./rabbitmq/producer");
const { startSurgeAIJob } = require("./jobs/surgeAIJob");
const { startFeatureStoreSyncJob } = require("./jobs/featureStoreSync");
const { startDriverLocationConsumer } = require("./rabbitmq/consumer");
const { PORT } = require("./config/env");
const mtls = require("../../../../shared/mtls.cjs");

const startServer = async () => {
  try {
    // Kết nối PostgreSQL
    await connectDB();

    // Kết nối Redis
    await connectRedis();
    console.log("✅ Redis connected");

    // Kết nối RabbitMQ
    await connectRabbitMQ();

    // Khởi động Consumer lắng nghe GPS tài xế
    await startDriverLocationConsumer();
    console.log("✅ RabbitMQ Consumer started");

    // Khởi động Surge AI Job (chạy mỗi 5 phút)
    startSurgeAIJob();

    // Khởi động Feature Store Sync Job (chạy mỗi 15 phút)
    startFeatureStoreSyncJob();

    const server = mtls.createServer(app);

    server.listen(PORT, () => {
      console.log(`🚀 Pricing Service running on port ${PORT}`);
      console.log(`📌 Surge AI: enabled (every 5 minutes)`);
      console.log(`📌 ETA Feature Store Sync: enabled (every 15 minutes)`);
      console.log(`📌 ETA Service: enabled (Google Maps + Redis cache)`);
      console.log(`📌 Driver Location Consumer: listening on driver.location.updated`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
