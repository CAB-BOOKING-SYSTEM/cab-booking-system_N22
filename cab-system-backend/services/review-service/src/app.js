/**
 * @file app.js
 * @description Khởi tạo và cấu hình Express application.
 *
 * Thứ tự middleware quan trọng:
 *   1. CORS & Body parser (express.json)
 *   2. HTTP Logger (morgan)
 *   3. Health check route
 *   4. Application routes
 *   5. Error handler (PHẢI ở cuối cùng)
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const reviewRoutes = require('./routes/reviewRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// --- Middleware cơ bản ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// --- Health Check ---
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Review Service is running smoothly!',
        timestamp: new Date().toISOString(),
        service: 'Review Service',
    });
});

// --- Mount Routes ---
app.use('/api/reviews', reviewRoutes);

// --- Error Handler (middleware cuối cùng) ---
app.use(errorHandler);

module.exports = app;
