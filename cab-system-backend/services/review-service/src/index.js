/**
 * @file index.js
 * @description Entry point của Review Service.
 *
 * Luồng khởi động:
 *   1. Load biến môi trường từ .env
 *   2. Khởi tạo bảng trong database (nếu chưa tồn tại)
 *   3. Kết nối Kafka Producer
 *   4. Start HTTP server
 *
 * Graceful Shutdown:
 *   Khi nhận tín hiệu SIGINT/SIGTERM, service sẽ:
 *   - Ngắt kết nối Kafka Producer
 *   - Đóng PostgreSQL Pool
 *   - Thoát process
 */

require('dotenv').config();

const app = require('./app');
const { pool } = require('./config/dbConfig');
const { initializeTable } = require('./models/reviewModel');
const { connectProducer, disconnectProducer } = require('./kafka/producer');

const PORT = process.env.PORT || 3007;

/**
 * Hàm khởi động ứng dụng.
 * Thực hiện tuần tự: init DB → connect Kafka → start server.
 */
const startServer = async () => {
    try {
        // Bước 1: Khởi tạo bảng trong PostgreSQL
        console.log('🔄 [Startup] Đang khởi tạo database...');
        await initializeTable();

        // Bước 2: Kết nối Kafka Producer
        console.log('🔄 [Startup] Đang kết nối Kafka Producer...');
        await connectProducer();

        // Bước 3: Khởi động HTTP server
        app.listen(PORT, () => {
            console.log(`🚀 [Startup] Review Service đang chạy trên port ${PORT}`);
            console.log(`📋 [Startup] Health Check: http://localhost:${PORT}/`);
            console.log(`📋 [Startup] API Base URL: http://localhost:${PORT}/api/reviews`);
        });
    } catch (error) {
        console.error('💥 [Startup] Không thể khởi động Review Service:', error.message);
        process.exit(1);
    }
};

// --- Graceful Shutdown ---
// Bắt tín hiệu tắt để giải phóng tài nguyên một cách an toàn
const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 [Shutdown] Nhận tín hiệu ${signal}. Đang tắt service...`);

    try {
        await disconnectProducer();
        await pool.end();
        console.log('✅ [Shutdown] Đã giải phóng toàn bộ tài nguyên.');
        process.exit(0);
    } catch (error) {
        console.error('❌ [Shutdown] Lỗi khi tắt service:', error.message);
        process.exit(1);
    }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Khởi chạy ứng dụng
startServer();
