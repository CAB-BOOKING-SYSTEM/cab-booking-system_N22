// api/index.js
import express from 'express';
import pool from '../core/db.js';
import redisClient from '../core/redis.js';

// Import tất cả route groups
import authRoutes from './endpoints/auth.js';
// import userRoutes from './endpoints/user.js';     // sau này thêm

const router = express.Router();

// ====================== GOM CÁC ROUTES ======================

// Auth routes
router.use('/auth', authRoutes);

// User routes (nếu có sau này)
// router.use('/users', userRoutes);

// ====================== HEALTH CHECK ======================
router.get('/health', async (req, res) => {
  const checks = { postgres: 'unknown', redis: 'unknown' };
  let allHealthy = true;

  try {
    await pool.query('SELECT 1');
    checks.postgres = 'healthy';
  } catch {
    checks.postgres = 'unhealthy';
    allHealthy = false;
  }

  try {
    const pong = await redisClient.ping();
    checks.redis = pong === 'PONG' ? 'healthy' : 'unhealthy';
    if (checks.redis !== 'healthy') allHealthy = false;
  } catch {
    checks.redis = 'unhealthy';
    allHealthy = false;
  }

  const status = allHealthy ? 'healthy' : 'degraded';
  res.status(allHealthy ? 200 : 503).json({
    status,
    service: 'auth-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;