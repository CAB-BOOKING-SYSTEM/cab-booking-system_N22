require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const database = require('./config/database');
const redisClient = require('./config/redis');
const eventPublisher = require('./services/eventPublisher');
const driverRoutes = require('./routes/driverRoutes');
const LocationSocket = require('./socket/locationSocket');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  path: '/socket.io',
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3003;

// ========== THÊM XỬ LÝ UNCAUGHT EXCEPTION ==========
process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  // Không process.exit, để service tiếp tục chạy
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection:', reason);
  // Không process.exit, để service tiếp tục chạy
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'driver-service',
    timestamp: new Date().toISOString(),
    websocket: { connections: io.engine.clientsCount }
  });
});

// Routes
app.use('/api/drivers', driverRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ========== HÀM RESTART SERVICE ==========
let isRestarting = false;
const restartService = async () => {
  if (isRestarting) return;
  isRestarting = true;
  
  logger.warn('🔄 Service is restarting...');
  
  try {
    // Đóng các kết nối hiện tại
    await database.closeConnections();
    await redisClient.close();
    await eventPublisher.close();
    io.close();
    
    // Đợi 2 giây
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Khởi động lại service
    process.exit(0);
  } catch (err) {
    logger.error('Restart failed:', err);
    process.exit(1);
  }
};

// Start server với retry logic
async function startServer(retryCount = 0) {
  const maxRetries = 5;
  
  try {
    await database.connectMongoDB();
    await redisClient.connect();
    await eventPublisher.connect();

    const locationSocket = new LocationSocket(io);
    locationSocket.initialize();
    global.locationSocket = locationSocket;

    server.listen(PORT, () => {
      logger.info(`🚗 Driver Service running on port ${PORT}`);
      logger.info(`   WebSocket: 🔌 enabled on /socket.io`);
      isRestarting = false;
    });
  } catch (error) {
    logger.error('Failed to start:', error);
    
    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000;
      logger.info(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
      setTimeout(() => startServer(retryCount + 1), delay);
    } else {
      logger.error('Max retries reached, service will keep trying...');
      // Không exit, chỉ retry sau 30 giây
      setTimeout(() => startServer(0), 30000);
    }
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing gracefully...');
  await database.closeConnections();
  await redisClient.close();
  await eventPublisher.close();
  io.close();
  process.exit(0);
});

// Theo dõi lỗi kết nối database và reconnect
const monitorConnections = () => {
  setInterval(async () => {
    try {
      // Kiểm tra kết nối MongoDB
      if (database.mongoConnection && database.mongoConnection.readyState !== 1) {
        logger.warn('MongoDB connection lost, attempting to reconnect...');
        await database.connectMongoDB();
      }
      
      // Kiểm tra kết nối Redis
      if (redisClient.client && !redisClient.client.status === 'ready') {
        logger.warn('Redis connection lost, attempting to reconnect...');
        await redisClient.connect();
      }
    } catch (err) {
      logger.error('Connection monitor error:', err);
    }
  }, 30000); // Kiểm tra mỗi 30 giây
};

startServer();
monitorConnections();

module.exports = { app, server, io };