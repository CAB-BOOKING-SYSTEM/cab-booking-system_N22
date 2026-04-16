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
  const health = {
    status: 'healthy',
    service: 'matching-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      postgres: database.pgPool ? 'connected' : 'disconnected',
      redis: redisClient.client ? 'connected' : 'disconnected',
    },
  };
  res.json(health);
});

// Readiness probe
app.get('/ready', async (req, res) => {
  const isReady = database.pgPool && redisClient.client;
  if (isReady) {
    res.json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

// Routes
app.use('/api/matching', matchingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
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
      logger.info(`   PostgreSQL: ${database.pgPool ? '✅' : '❌'}`);
      logger.info(`   Redis: ${redisClient.client ? '✅' : '❌'}`);
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

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server...');
  await database.closeConnections();
  await redisClient.close();
  process.exit(0);
});

startServer();

module.exports = app;