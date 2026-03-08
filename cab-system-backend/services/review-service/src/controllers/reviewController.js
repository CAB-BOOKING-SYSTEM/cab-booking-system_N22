/**
 * @file reviewController.js
 * @description Lớp Controller — điều phối request/response cho Review API.
 * Mỗi hàm controller nhận (req, res, next), gọi service tương ứng,
 * và trả về response chuẩn hóa dạng { success, data, message }.
 */

const reviewService = require('../services/reviewService');
const reviewRepository = require('../repositories/reviewRepository');

/**
 * POST /api/reviews
 * Tạo mới một đánh giá cho chuyến đi.
 */
const createReview = async (req, res, next) => {
    try {
        const review = await reviewService.submitReview(req.body);

        res.status(201).json({
            success: true,
            data: review,
            message: 'Đánh giá đã được tạo thành công.',
        });
    } catch (error) {
        next(error); // Chuyển lỗi đến Error Handler middleware
    }
};

/**
 * GET /api/reviews/driver/:driverId
 * Lấy danh sách đánh giá của một tài xế (có phân trang).
 * Query params: ?limit=10&offset=0
 */
const getDriverReviews = async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = parseInt(req.query.offset, 10) || 0;

        const reviews = await reviewRepository.getReviewsByDriverId(driverId, limit, offset);

        res.status(200).json({
            success: true,
            data: reviews,
            message: `Đã lấy ${reviews.length} đánh giá cho tài xế ${driverId}.`,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/reviews/driver/:driverId/stats
 * Lấy thống kê đánh giá của tài xế (trung bình sao, tổng lượt).
 */
const getDriverStats = async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const stats = await reviewService.getDriverStats(driverId);

        res.status(200).json({
            success: true,
            data: {
                driver_id: driverId,
                average_rating: parseFloat(stats.average_rating),
                total_reviews: stats.total_reviews,
            },
            message: `Thống kê đánh giá của tài xế ${driverId}.`,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createReview,
    getDriverReviews,
    getDriverStats,
};
