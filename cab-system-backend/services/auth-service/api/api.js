// api/index.js
import express from 'express';

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
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;