/**
 * @file dbConfig.js
 * @description Cấu hình kết nối PostgreSQL sử dụng connection pool.
 * Pool giúp tái sử dụng connection, tối ưu hiệu suất truy vấn DB.
 */

const { Pool } = require('pg');

// Khởi tạo Pool với connection string từ biến môi trường
const pool = new Pool({
  connectionString: process.env.DB_URL,
});

// Log sự kiện kết nối để tiện debug
pool.on('connect', () => {
  console.log('📦 [DB] Kết nối mới đến PostgreSQL đã được tạo.');
});

// Log lỗi kết nối bất ngờ để phát hiện sớm vấn đề
pool.on('error', (err) => {
  console.error('❌ [DB] Lỗi kết nối PostgreSQL không mong muốn:', err.message);
});

/**
 * Thực thi một câu truy vấn SQL trên pool.
 * @param {string} text - Câu lệnh SQL (có thể chứa $1, $2, ... cho parameterized query)
 * @param {Array} params - Mảng giá trị tương ứng với các tham số
 * @returns {Promise<import('pg').QueryResult>} Kết quả truy vấn
 */
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
