const { createClient } = require("redis")

const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379"
})

redis.on('error', (err) => console.log('Redis Client Error', err));

redis.connect().catch((error) => {
  console.error("Failed to connect to Redis:", error);
});

module.exports = redis