// src/rabbitmq/consumer.js
//
// Consumer lắng nghe sự kiện tọa độ GPS từ tài xế (driver.location.updated).
// Khi nhận được message, tọa độ được lưu vào Redis với TTL 300 giây (5 phút)
// làm "Hot-store" — getDriverToPickupETA sẽ tra cứu từ đây.
//
// Exchange : driver.events  (topic, durable)
// Routing  : driver.location.updated
// Redis key: driver:{driverId}:location  → { lat, lng, timestamp }

const amqp = require('amqplib');
const { redisClient } = require('../config/redisConfig');

const RABBITMQ_URL    = process.env.RABBITMQ_URL || 'amqp://admin:password123@rabbitmq:5672';
const EXCHANGE        = 'driver.events';
const EXCHANGE_TYPE   = 'topic';
const ROUTING_KEY     = 'driver.location.updated';
const QUEUE_NAME      = 'pricing.driver.location'; // tên rõ ràng, dễ debug
const LOCATION_TTL_S  = 300; // 5 phút — đủ để biết tài xế còn "online"

let consumerChannel = null;

/**
 * Khởi động Consumer.
 * Hàm này tự động retry kết nối khi RabbitMQ chưa sẵn sàng
 * (thường xảy ra lúc Docker Compose khởi động).
 */
async function startDriverLocationConsumer() {
  const RETRY_DELAY_MS = 5000;

  const tryConnect = async () => {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      consumerChannel  = await connection.createChannel();

      // Prefetch 1: xử lý tuần tự, tránh quá tải Redis khi burst
      consumerChannel.prefetch(1);

      // Assert Exchange (idempotent — an toàn nếu đã tồn tại)
      await consumerChannel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });

      // Assert Queue (exclusive: false để có thể restart service mà không mất queue)
      const { queue } = await consumerChannel.assertQueue(QUEUE_NAME, {
        durable: true,               // Queue tồn tại qua restart RabbitMQ
        arguments: {
          'x-message-ttl': 60000,   // Message trong queue hết hạn sau 60s nếu chưa được xử lý
        },
      });

      // Bind queue vào Exchange theo routing key
      await consumerChannel.bindQueue(queue, EXCHANGE, ROUTING_KEY);

      console.log(`✅ Driver Location Consumer ready — listening on [${EXCHANGE}] → [${ROUTING_KEY}]`);

      // Bắt đầu consume
      consumerChannel.consume(queue, async (msg) => {
        if (!msg) return; // Consumer bị cancel phía broker

        try {
          const raw     = msg.content.toString();
          const payload = JSON.parse(raw);

          // Hỗ trợ 2 cấu trúc message:
          // - Từ producer của pricing-service: { data: { driverId, lat, lng, timestamp } }
          // - Từ driver-service gửi thẳng:    { driverId, lat, lng, timestamp }
          const data = payload.data || payload;

          const { driverId, lat, lng, timestamp } = data;

          if (!driverId || lat === undefined || lng === undefined) {
            console.warn('⚠️  Driver location message thiếu trường bắt buộc, bỏ qua:', raw);
            consumerChannel.ack(msg); // Ack để không bị requeue vô tận
            return;
          }

          // Lưu vào Redis Hot-store
          const locationKey  = `driver:${driverId}:location`;
          const locationData = JSON.stringify({
            lat:       parseFloat(lat),
            lng:       parseFloat(lng),
            timestamp: timestamp || new Date().toISOString(),
          });

          await redisClient.setEx(locationKey, LOCATION_TTL_S, locationData);

          console.log(
            `📍 [Consumer] Driver ${driverId} → (${lat}, ${lng}) lưu Redis [TTL ${LOCATION_TTL_S}s]`
          );

          // Ack sau khi xử lý thành công
          consumerChannel.ack(msg);

        } catch (processErr) {
          console.error('❌ [Consumer] Lỗi khi xử lý message:', processErr.message);
          // Nack + không requeue để tránh poison message làm loop
          consumerChannel.nack(msg, false, false);
        }
      });

      // Xử lý khi connection đóng bất ngờ → tự reconnect
      connection.on('close', () => {
        console.warn('⚠️  RabbitMQ connection closed. Reconnecting in 5s...');
        consumerChannel = null;
        setTimeout(tryConnect, RETRY_DELAY_MS);
      });

      connection.on('error', (err) => {
        console.error('❌ RabbitMQ connection error:', err.message);
      });

    } catch (connectErr) {
      console.error(`❌ [Consumer] Không thể kết nối RabbitMQ: ${connectErr.message}. Thử lại sau ${RETRY_DELAY_MS / 1000}s...`);
      setTimeout(tryConnect, RETRY_DELAY_MS);
    }
  };

  await tryConnect();
}

module.exports = { startDriverLocationConsumer };
