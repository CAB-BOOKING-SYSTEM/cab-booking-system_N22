const redisClient = require("../config/redis");
const { publishKafkaEvent } = require("../events/kafka");

class LocationTrackingService {
  /**
   * Update the driver's location in Redis Geo cache and fire Kafka event.
   */
  async updateLocation(driverId, longitude, latitude) {
    try {
      // node-redis v4 format
      await redisClient.geoAdd("driver_locations", {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        member: driverId,
      });

      // Stream the location over event broker using Kafka
      await publishKafkaEvent("driver.location.updated", {
        driverId,
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error("Error updating driver location:", error);
    }
  }

  /**
   * Get nearby drivers within a certain radius.
   */
  async getNearbyDrivers(longitude, latitude, radiusInKm = 5) {
    try {
      // redis v4 format: geoSearch
      const results = await redisClient.geoSearch(
        "driver_locations",
        { longitude: parseFloat(longitude), latitude: parseFloat(latitude) },
        { radius: radiusInKm, unit: "km" }
      );
      return results; // array of driverIds
    } catch (error) {
      console.error("Error fetching nearby drivers:", error);
      return [];
    }
  }
}

module.exports = new LocationTrackingService();
