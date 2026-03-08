/**
 * @file reviewRepository.js
 * @description Lớp Repository — chịu trách nhiệm tương tác trực tiếp với database.
 * Tất cả các truy vấn đều sử dụng parameterized query để phòng chống SQL Injection.
 */

const { query } = require('../config/dbConfig');

/**
 * Tạo mới một đánh giá trong database.
 * @param {Object} data - Dữ liệu đánh giá
 * @param {string} data.ride_id - Mã chuyến đi
 * @param {string} data.customer_id - Mã khách hàng
 * @param {string} data.driver_id - Mã tài xế
 * @param {number} data.rating - Điểm đánh giá (1-5)
 * @param {string} [data.comment] - Bình luận (tùy chọn)
 * @returns {Promise<Object>} Bản ghi review vừa được tạo
 */
const createReview = async (data) => {
    const { ride_id, customer_id, driver_id, rating, comment } = data;

    const sql = `
    INSERT INTO reviews (ride_id, customer_id, driver_id, rating, comment)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

    try {
        const result = await query(sql, [ride_id, customer_id, driver_id, rating, comment]);
        return result.rows[0];
    } catch (error) {
        // Bắt lỗi UNIQUE constraint khi ride_id đã tồn tại (code 23505)
        if (error.code === '23505') {
            throw new Error(`Chuyến đi "${ride_id}" đã được đánh giá trước đó.`);
        }
        console.error('❌ [Repository] Lỗi khi tạo review:', error.message);
        throw error;
    }
};

/**
 * Lấy danh sách đánh giá của một tài xế (có phân trang).
 * @param {string} driverId - Mã tài xế
 * @param {number} [limit=10] - Số lượng bản ghi tối đa trên mỗi trang
 * @param {number} [offset=0] - Vị trí bắt đầu lấy dữ liệu
 * @returns {Promise<Array<Object>>} Mảng các bản ghi review
 */
const getReviewsByDriverId = async (driverId, limit = 10, offset = 0) => {
    const sql = `
    SELECT id, ride_id, customer_id, driver_id, rating, comment, created_at
    FROM reviews
    WHERE driver_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3;
  `;

    try {
        const result = await query(sql, [driverId, limit, offset]);
        return result.rows;
    } catch (error) {
        console.error('❌ [Repository] Lỗi khi lấy reviews theo driver:', error.message);
        throw error;
    }
};

/**
 * Tính điểm trung bình và tổng số đánh giá của một tài xế.
 * @param {string} driverId - Mã tài xế
 * @returns {Promise<Object>} Object chứa average_rating và total_reviews
 */
const getDriverAverageRating = async (driverId) => {
    const sql = `
    SELECT
      COALESCE(ROUND(AVG(rating), 2), 0) AS average_rating,
      COUNT(*)::INT AS total_reviews
    FROM reviews
    WHERE driver_id = $1;
  `;

    try {
        const result = await query(sql, [driverId]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ [Repository] Lỗi khi tính rating trung bình:', error.message);
        throw error;
    }
};

module.exports = {
    createReview,
    getReviewsByDriverId,
    getDriverAverageRating,
};
