/**
 * @file reviewRoutes.js
 * @description Định nghĩa các endpoint cho Review API.
 *
 * Endpoints:
 *   POST   /              → Tạo mới đánh giá
 *   GET    /driver/:driverId       → Lấy danh sách đánh giá của tài xế
 *   GET    /driver/:driverId/stats → Lấy thống kê đánh giá của tài xế
 */

const { Router } = require('express');
const reviewController = require('../controllers/reviewController');

const router = Router();

// Tạo đánh giá mới
router.post('/', reviewController.createReview);

// Lấy danh sách đánh giá theo tài xế (hỗ trợ phân trang qua query params)
router.get('/driver/:driverId', reviewController.getDriverReviews);

// Lấy thống kê (trung bình sao, tổng lượt đánh giá) của tài xế
router.get('/driver/:driverId/stats', reviewController.getDriverStats);

module.exports = router;
