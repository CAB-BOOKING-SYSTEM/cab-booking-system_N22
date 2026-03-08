/**
 * @file reviewService.js
 * @description Lớp Service — chứa toàn bộ business logic của Review Service.
 * Đóng vai trò trung gian giữa Controller và Repository,
 * thực hiện validation nghiệp vụ và điều phối các side-effect (Kafka).
 */

const reviewRepository = require('../repositories/reviewRepository');
const { publishReviewEvent } = require('../kafka/producer');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Xử lý logic tạo mới đánh giá.
 *
 * Luồng xử lý:
 *   1. Validate các trường bắt buộc
 *   2. Validate rating trong khoảng 1-5
 *   3. Lưu vào DB qua Repository
 *   4. Phát sự kiện Kafka (fire-and-forget, không block response)
 *   5. Trả về kết quả
 *
 * @param {Object} payload - Dữ liệu đánh giá từ request body
 * @returns {Promise<Object>} Bản ghi review đã được tạo
 * @throws {AppError} Nếu thiếu trường bắt buộc hoặc rating không hợp lệ
 */
const submitReview = async (payload) => {
    const { ride_id, customer_id, driver_id, rating, comment } = payload;

    // --- Bước 1: Validate trường bắt buộc ---
    if (!ride_id || !customer_id || !driver_id || rating === undefined || rating === null) {
        throw new AppError('Các trường ride_id, customer_id, driver_id, rating là bắt buộc.', 400);
    }

    // --- Bước 2: Validate rating phải là số nguyên từ 1 đến 5 ---
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        throw new AppError('Rating phải là số nguyên từ 1 đến 5.', 400);
    }

    // --- Bước 3: Lưu review vào database ---
    const newReview = await reviewRepository.createReview({
        ride_id,
        customer_id,
        driver_id,
        rating: ratingNum,
        comment: comment || null,
    });

    // --- Bước 4: Phát sự kiện Kafka (không await để không block response) ---
    // Sử dụng .catch() để đảm bảo lỗi Kafka không ảnh hưởng đến response
    publishReviewEvent(newReview).catch((err) => {
        console.error('⚠️ [Service] Không thể phát sự kiện Kafka:', err.message);
    });

    return newReview;
};

/**
 * Lấy thống kê đánh giá của tài xế: điểm trung bình và tổng số đánh giá.
 * @param {string} driverId - Mã tài xế
 * @returns {Promise<Object>} { average_rating, total_reviews }
 * @throws {AppError} Nếu không truyền driverId
 */
const getDriverStats = async (driverId) => {
    if (!driverId) {
        throw new AppError('Driver ID là bắt buộc.', 400);
    }

    const stats = await reviewRepository.getDriverAverageRating(driverId);
    return stats;
};

module.exports = {
    submitReview,
    getDriverStats,
};
