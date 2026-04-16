require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const database = require('./config/database');
const redisClient = require('./config/redis');
const eventPublisher = require('./services/eventPublisher');
const driverRoutes = require('./routes/driverRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    service: 'driver-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      mongodb: database.mongoConnection ? 'connected' : 'disconnected',
      redis: redisClient.client ? 'connected' : 'disconnected',
      rabbitmq: eventPublisher.channel ? 'connected' : 'disconnected'
    }
  };
  res.json(health);
});

// Routes
app.use('/api/drivers', driverRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function startServer() {
  try {
    // Kết nối đến các services
    await database.connectMongoDB();
    await redisClient.connect();
    await eventPublisher.connect();
    
    // Optional: PostgreSQL (nếu cần)
    if (process.env.USE_POSTGRES === 'true') {
      await database.connectPostgreSQL();
    }

    app.listen(PORT, () => {
      logger.info(`🚗 Driver Service running on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   MongoDB: ${database.mongoConnection ? '✅' : '❌'}`);
      logger.info(`   Redis: ${redisClient.client ? '✅' : '❌'}`);
      logger.info(`   RabbitMQ: ${eventPublisher.channel ? '✅' : '❌'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    // Vẫn start server dù có lỗi
    app.listen(PORT, () => {
      logger.info(`🚗 Driver Service running on port ${PORT} (with warnings)`);
    });
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...');
  await database.closeConnections();
  await redisClient.close();
  await eventPublisher.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server...');
  await database.closeConnections();
  await redisClient.close();
  await eventPublisher.close();
  process.exit(0);
});

startServer();

module.exports = app;