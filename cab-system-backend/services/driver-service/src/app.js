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
  path: '/socket.io', // Đường dẫn WebSocket mặc định
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3003;

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

// Start server
async function startServer() {
  try {
    await database.connectMongoDB();
    await redisClient.connect();
    await eventPublisher.connect();

    // Khởi tạo WebSocket handler
    const locationSocket = new LocationSocket(io);
    locationSocket.initialize();
    global.locationSocket = locationSocket;

    server.listen(PORT, () => {
      logger.info(`🚗 Driver Service running on port ${PORT}`);
      logger.info(`   WebSocket: 🔌 enabled on /socket.io`);
    });
  } catch (error) {
    logger.error('Failed to start:', error);
    server.listen(PORT, () => {
      logger.info(`🚗 Driver Service running on port ${PORT} (with warnings)`);
    });
  }
}

process.on('SIGTERM', async () => {
  await database.closeConnections();
  await redisClient.close();
  await eventPublisher.close();
  io.close();
  process.exit(0);
});

startServer();

module.exports = { app, server, io };