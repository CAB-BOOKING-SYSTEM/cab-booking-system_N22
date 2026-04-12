 require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const database = require('./config/database');
const redisClient = require('./config/redis');
const matchingRoutes = require('./routes/matchingRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'matching-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/matching', matchingRoutes);

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
    // Connect to databases
    await database.connectPostgreSQL();
    await redisClient.connect();

    app.listen(PORT, () => {
      logger.info(`🎯 Matching Service running on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   AI Scoring: ENABLED`);
      logger.info(`   Fallback: nearest-driver (auto on AI error)`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...');
  await database.closeConnections();
  await redisClient.close();
  process.exit(0);
});

startServer();

module.exports = app;
