// api/endpoints/auth.js
import express from 'express';
import {
  register,
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
} from '../../controllers/auth.js';
import { loginLimiter, refreshLimiter } from '../../middleware/rateLimiter.js';
import { protect } from '../../middleware/auth.js';

const router = express.Router();

// Public routes với rate limiting
router.post('/register', register);
router.post('/login', /*loginLimiter,*/ login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.post('/forgot-password', loginLimiter, requestPasswordReset);
router.post('/reset-password', loginLimiter, resetPassword);

// Test protected route
router.get('/profile', protect, (req, res) => {
  res.json({
    message: 'Protected route accessed successfully',
    user: req.user
  });
});
export default router;
