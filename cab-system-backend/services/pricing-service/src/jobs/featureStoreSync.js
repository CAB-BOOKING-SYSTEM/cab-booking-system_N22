// src/jobs/featureStoreSync.js
const cron = require('node-cron');
const { redisClient } = require('../config/redisConfig');
const { query } = require('../config/dbConfig');

function startFeatureStoreSyncJob() {
  // Chạy mỗi 15 phút
  cron.schedule('*/15 * * * *', async () => {
    console.log('🔄 Running ETA Feature Store Sync Job...');

    try {
      // Tìm tất cả các key do etaService tạo ra
      const keys = await redisClient.keys('feature:eta:*');
      if (keys.length === 0) {
        console.log('ℹ️  Không có dữ liệu ETA mới cần đồng bộ.');
        return;
      }

      console.log(`📦 Tiến hành đồng bộ ${keys.length} records từ Redis sang PostgreSQL...`);

      let syncedCount = 0;

      for (const key of keys) {
        const rawData = await redisClient.get(key);
        if (rawData) {
          const data = JSON.parse(rawData);

          // Insert vào Database
          await query(
            `INSERT INTO historical_eta (
              feature_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
              distance_km, eta_minutes, eta_seconds, traffic_level, recorded_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (feature_id) DO NOTHING`,
            [
              data.feature_id,
              data.pickup.lat, data.pickup.lng,
              data.dropoff.lat, data.dropoff.lng,
              data.distance_km, data.eta_minutes, data.eta_seconds,
              data.traffic_level, data.timestamp
            ]
          );

          // Xóa key khỏi Redis sau khi đã lưu DB thành công
          await redisClient.del(key);
          syncedCount++;
        }
      }

      console.log(`✅ Đã đồng bộ thành công ${syncedCount} records.`);

    } catch (error) {
      console.error('❌ Feature Store Sync Job failed:', error.message);
    }
  });

  console.log('✅ Feature Store Sync Job scheduled (every 15 minutes)');
}

module.exports = { startFeatureStoreSyncJob };
