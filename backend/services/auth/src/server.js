// backend/services/auth/src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Register endpoint (stub)
app.post('/api/auth/register', (req, res) => {
  // TODO: Implement actual registration logic
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
  
  res.status(201).json({
    success: true,
    message: 'User registration endpoint',
    data: {
      userId: 'user_' + Date.now(),
      email: email,
      role: 'customer'
    }
  });
});

// Login endpoint (stub)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
  
  // Mock authentication
  const mockToken = 'mock_jwt_token_' + Date.now();
  
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      token: mockToken,
      user: {
        id: 'user_123',
        email: email,
        role: 'customer'
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
});