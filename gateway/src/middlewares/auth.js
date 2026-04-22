// middleware/auth.js
import jwt from 'jsonwebtoken';
import redisClient from '../../../cab-system-backend/services/auth-service/core/redis.js';
import UserModel from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (await (await redisClient.exists(`blacklist:${token}`)) === 1) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;   // { sub, email, role, ... }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};