const { createClient } = require("redis");

let redisClientInstance = null;

const getRedisConfig = () => {
  const redisUrl =
    process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`;

  return {
    url: redisUrl,
  };
};

const getRedisClient = () => {
  if (!redisClientInstance) {
    redisClientInstance = createClient(getRedisConfig());

    redisClientInstance.on("error", (error) => {
      console.error("[Redis] Redis client error:", error);
    });
  }

  return redisClientInstance;
};

const connectRedis = async () => {
  try {
    const redisClient = getRedisClient();

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    console.log("[Redis] Redis connected successfully");
    return redisClient;
  } catch (error) {
    console.error("[Redis] Redis connection failed:", error);
    throw error;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
};
