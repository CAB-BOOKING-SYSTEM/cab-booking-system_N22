// middleware/auth.js
import jwt from 'jsonwebtoken';
import redisClient from '../core/redis.js';
import User from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Kiểm tra blacklist
    let isBlacklisted = false;
    try {
      const exists = await redisClient.exists(`blacklist:${token}`);
      isBlacklisted = exists === 1;
    } catch {
      isBlacklisted = false;
    }

    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.sub);

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};
