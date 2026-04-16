const app = require('./app');
const connectDB = require('./database/dbConnection');
const { connectRedis } = require('./config/redisConfig');
const { connectRabbitMQ } = require('./rabbitmq/producer');
const { startSurgeAIJob } = require('./jobs/surgeAIJob');
const { PORT } = require('./config/env');

const startServer = async () => {
  try {
    // Kết nối PostgreSQL
    await connectDB();
    
    // Kết nối Redis
    await connectRedis();
    console.log('✅ Redis connected');
    
    // Kết nối RabbitMQ
    await connectRabbitMQ();
    
    // Khởi động Surge AI Job (chạy mỗi 5 phút)
    startSurgeAIJob();
    
    app.listen(PORT, () => {
      console.log(`🚀 Pricing Service running on port ${PORT}`);
      console.log(`📌 Surge AI: enabled (every 5 minutes)`);
      console.log(`📌 ETA Service: enabled (Google Maps + Redis cache)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();