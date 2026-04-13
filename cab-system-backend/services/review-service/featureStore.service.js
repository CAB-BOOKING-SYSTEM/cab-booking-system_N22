const { getRedisClient, connectRedis } = require("./src/config/redis");

class FeatureStoreService {
  async connect() {
    try {
      await connectRedis();
    } catch (error) {
      console.error("[FeatureStoreService] connect error:", error);
      throw error;
    }
  }

  /**
   * Data pipeline step 3:
   * Persist driver-level features into Redis Feature Store so AI can fetch in O(1).
   */
  async setDriverFeatures(driverId, featureObject) {
    try {
      await this.connect();

      const redisClient = getRedisClient();
      const key = `driver_features:${driverId}`;
      await redisClient.set(key, JSON.stringify(featureObject));

      return {
        key,
        value: featureObject,
      };
    } catch (error) {
      console.error("[FeatureStoreService] setDriverFeatures error:", error);
      throw error;
    }
  }

  /**
   * Data pipeline support:
   * Cache booking readiness (triggered by payment.completed consumer).
   */
  async markBookingReadyForReview({ bookingId, customerId, driverId }) {
    try {
      await this.connect();

      const redisClient = getRedisClient();
      const key = `booking_review_ready:${bookingId}`;
      const payload = {
        bookingId,
        customerId,
        driverId,
        status: "READY_FOR_REVIEW",
        updatedAt: new Date().toISOString(),
      };

      await redisClient.set(key, JSON.stringify(payload));
      return payload;
    } catch (error) {
      console.error("[FeatureStoreService] markBookingReadyForReview error:", error);
      throw error;
    }
  }

  async getBookingReadyState(bookingId) {
    try {
      await this.connect();

      const redisClient = getRedisClient();
      const key = `booking_review_ready:${bookingId}`;
      const cachedValue = await redisClient.get(key);

      if (!cachedValue) {
        return null;
      }

      return JSON.parse(cachedValue);
    } catch (error) {
      console.error("[FeatureStoreService] getBookingReadyState error:", error);
      throw error;
    }
  }
}

module.exports = FeatureStoreService;
