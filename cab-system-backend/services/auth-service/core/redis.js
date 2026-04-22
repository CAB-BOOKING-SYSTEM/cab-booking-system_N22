// core/redis.js
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully!');
});

redisClient.on('ready', () => {
  console.log('🚀 Redis is ready to use');
});

// Top-level await vẫn OK trong ESM, nhưng ta wrap để dễ debug hơn
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err);
  }
})();

export default redisClient;