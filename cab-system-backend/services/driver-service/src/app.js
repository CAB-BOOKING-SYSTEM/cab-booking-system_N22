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
  res.json({
    status: 'healthy',
    service: 'driver-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/drivers', driverRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// Start server
async function startServer() {
  try {
    await database.connectPostgreSQL();
    await database.connectMongoDB();
    await redisClient.connect();
    await eventPublisher.connect();

    app.listen(PORT, () => {
      logger.info(`🚗 Driver Service running on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    // Vẫn start server dù DB lỗi
    app.listen(PORT, () => {
      logger.info(`🚗 Driver Service running on port ${PORT} (with errors)`);
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

startServer();

module.exports = app;