// api/endpoints/auth.js
import express from 'express';
import { register, login, refresh, logout } from '../../controllers/auth.js';
import { protect } from '../../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
// Protected routes
router.post('/logout', protect, logout);

// Test protected route
router.get('/profile', protect, (req, res) => {
  res.json({
    message: 'Protected route accessed successfully',
    user: req.user
  });
});

export default router;