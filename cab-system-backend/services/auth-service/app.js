// app.js
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';

import apiRoutes from './api/api.js';        // ← Import từ file gom
import { apiLimiter } from './middleware/rateLimiter.js';
import redisClient from './core/redis.js';

const app = express();

// ====================== MIDDLEWARE ======================
app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      // Cho phép tất cả origin trong môi trường dev
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Rate limiting chung cho toàn bộ API
app.use(apiLimiter);

// ====================== ROUTES ======================
app.use('/api', apiRoutes);        // ← Dùng /api làm prefix chung

// ====================== ERROR HANDLING ======================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`🚀 Auth Service is running on http://localhost:${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  await redisClient.quit();
  process.exit(0);
});