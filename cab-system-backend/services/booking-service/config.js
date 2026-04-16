// config.js
require('dotenv').config();

module.exports = {
  // Server
  port: process.env.PORT || 3001,
  env: process.env.NODE_ENV || 'development',
  
  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'booking',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  
  // RabbitMQ
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    exchange: 'booking.events',
    queue: 'booking-service-queue'
  },
  
  // Pricing Service
  pricingService: {
    url: process.env.PRICING_SERVICE_URL || 'http://localhost:3004',
    timeout: 5000,
    retries: 3
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'test-secret-key',
    expiresIn: '1h'
  }
};