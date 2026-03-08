/**
 * @file producer.js
 * @description Kafka Producer — phát sự kiện review ra hệ thống Message Broker.
 * Sử dụng thư viện kafkajs để kết nối và gửi message đến Kafka cluster.
 */

const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

// Khởi tạo Kafka Client
const kafka = new Kafka({
    clientId: 'review-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    // Cấu hình retry để tăng độ ổn định kết nối
    retry: {
        initialRetryTime: 300,
        retries: 5,
    },
});

// Khởi tạo Producer instance
const producer = kafka.producer();

/**
 * Kết nối Producer đến Kafka cluster.
 * Gọi hàm này khi khởi động ứng dụng.
 */
const connectProducer = async () => {
    try {
        await producer.connect();
        console.log('✅ [Kafka] Producer đã kết nối thành công.');
    } catch (error) {
        console.error('❌ [Kafka] Lỗi kết nối Producer:', error.message);
        throw error;
    }
};

/**
 * Ngắt kết nối Producer khỏi Kafka cluster.
 * Gọi khi ứng dụng shutdown để giải phóng tài nguyên.
 */
const disconnectProducer = async () => {
    try {
        await producer.disconnect();
        console.log('🔌 [Kafka] Producer đã ngắt kết nối.');
    } catch (error) {
        console.error('❌ [Kafka] Lỗi khi ngắt kết nối Producer:', error.message);
    }
};

/**
 * Phát sự kiện "ReviewCreated" vào topic `review-events`.
 * Payload tuân theo chuẩn Event-Driven Architecture:
 *   { eventId, type, timestamp, data }
 *
 * @param {Object} reviewData - Dữ liệu review đã được lưu vào DB
 */
const publishReviewEvent = async (reviewData) => {
    const event = {
        eventId: uuidv4(),
        type: 'ReviewCreated',
        timestamp: new Date().toISOString(),
        data: reviewData,
    };

    try {
        await producer.send({
            topic: 'review-events',
            messages: [
                {
                    // Dùng driver_id làm key để đảm bảo các event của cùng 1 driver
                    // luôn được gửi vào cùng partition → đảm bảo thứ tự xử lý
                    key: reviewData.driver_id,
                    value: JSON.stringify(event),
                },
            ],
        });
        console.log(`📤 [Kafka] Đã phát sự kiện ReviewCreated: ${event.eventId}`);
    } catch (error) {
        // Ghi log lỗi nhưng KHÔNG throw — tránh rollback giao dịch DB đã thành công
        console.error('❌ [Kafka] Lỗi khi phát sự kiện:', error.message);
    }
};

module.exports = {
    connectProducer,
    disconnectProducer,
    publishReviewEvent,
};
