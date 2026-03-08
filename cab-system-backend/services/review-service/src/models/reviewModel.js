/**
 * @file reviewModel.js
 * @description Định nghĩa cấu trúc bảng `reviews` và hàm khởi tạo bảng trong PostgreSQL.
 */

const { query } = require('../config/dbConfig');

/**
 * Câu lệnh DDL tạo bảng `reviews`.
 * - id: UUID làm khóa chính, tự động sinh bằng gen_random_uuid()
 * - ride_id: Mã chuyến đi, UNIQUE đảm bảo mỗi chuyến chỉ có 1 đánh giá
 * - customer_id: Mã khách hàng đánh giá
 * - driver_id: Mã tài xế được đánh giá
 * - rating: Điểm đánh giá từ 1 đến 5 (CHECK constraint)
 * - comment: Bình luận tùy chọn
 * - created_at: Thời gian tạo, mặc định là thời điểm hiện tại
 */
const CREATE_REVIEWS_TABLE = `
  CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id VARCHAR(255) NOT NULL UNIQUE,
    customer_id VARCHAR(255) NOT NULL,
    driver_id VARCHAR(255) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
`;

/**
 * Khởi tạo bảng `reviews` trong database.
 * Gọi hàm này khi khởi động ứng dụng để đảm bảo bảng tồn tại.
 */
const initializeTable = async () => {
    try {
        await query(CREATE_REVIEWS_TABLE);
        console.log('✅ [Model] Bảng "reviews" đã sẵn sàng.');
    } catch (error) {
        console.error('❌ [Model] Lỗi khi tạo bảng "reviews":', error.message);
        throw error;
    }
};

module.exports = { initializeTable, CREATE_REVIEWS_TABLE };
