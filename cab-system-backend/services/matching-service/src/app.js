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

// ========== BẮT LỖI TOÀN CỤC ==========
process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  // Không exit, để service tiếp tục chạy
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection:', reason);
  // Không exit, để service tiếp tục chạy
});

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

// ========== HÀM START VỚI RETRY ==========
let isStarting = false;
let retryCount = 0;
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000;

async function startServer() {
  if (isStarting) return;
  isStarting = true;
  
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
      retryCount = 0; // Reset retry count khi thành công
      isStarting = false;
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      logger.info(`Retrying in ${RETRY_DELAY / 1000}s... (attempt ${retryCount}/${MAX_RETRIES})`);
      setTimeout(() => {
        isStarting = false;
        startServer();
      }, RETRY_DELAY);
    } else {
      logger.error(`Max retries (${MAX_RETRIES}) reached. Service will keep trying every 30s...`);
      setTimeout(() => {
        retryCount = 0;
        isStarting = false;
        startServer();
      }, 30000);
    }
  }
}

// ========== MONITOR KẾT NỐI ==========
async function monitorConnections() {
  setInterval(async () => {
    try {
      // Kiểm tra PostgreSQL
      if (database.pgPool) {
        await database.pgPool.query('SELECT 1');
      } else {
        logger.warn('PostgreSQL pool is null, attempting to reconnect...');
        await database.connectPostgreSQL();
      }
      
      // Kiểm tra Redis
      if (redisClient.client) {
        await redisClient.client.ping();
      } else {
        logger.warn('Redis client is null, attempting to reconnect...');
        await redisClient.connect();
      }
    } catch (err) {
      logger.error('Connection monitor error:', err.message);
      
      // Thử reconnect
      try {
        if (!database.pgPool) {
          await database.connectPostgreSQL();
        }
        if (!redisClient.client) {
          await redisClient.connect();
        }
      } catch (reconnectErr) {
        logger.error('Reconnect failed:', reconnectErr.message);
      }
    }
  }, 30000); // Kiểm tra mỗi 30 giây
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

// Khởi động service
startServer();
monitorConnections();

module.exports = app;