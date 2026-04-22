const Redis = require('redis');

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('connect', () => console.log('✅ Redis connected'));
redisClient.on('error', (err) => console.log('❌ Redis error:', err.message));

const connectRedis = async () => {
  await redisClient.connect();
};

module.exports = { redisClient, connectRedis };