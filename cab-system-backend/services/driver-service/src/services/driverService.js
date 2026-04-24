const Driver = require("../models/Driver");
const DriverEarning = require("../models/DriverEarning");
const LocationHistory = require("../models/LocationHistory");
const redisGeoService = require("./redisGeoService");
const logger = require("../utils/logger");
const axios = require("axios");
const eventPublisher = require("./eventPublisher");
const pricingClient = require("./pricingClient");
const mtls = require("../../../../../shared/mtls.cjs");

const httpsAgent = mtls.createClientAgent();

class DriverService {
  async createDriver(driverData) {
    try {
      const driver = new Driver(driverData);
      await driver.save();
      logger.info(`Driver created: ${driver.driverId}`);

      await eventPublisher.publishEvent("driver.created", {
        driverId: driver.driverId,
        email: driver.email,
        phone: driver.phone,
        timestamp: new Date().toISOString(),
      });

      return driver;
    } catch (error) {
      logger.error("Error creating driver:", error);
      throw error;
    }
  }

  async getDriverById(driverId) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) {
        return null;
      }
      return driver;
    } catch (error) {
      logger.error("Error getting driver:", error);
      return null;
    }
  }

  async getDriverByEmail(email) {
    try {
      return await Driver.findOne({ email });
    } catch (error) {
      logger.error("Error getting driver by email:", error);
      return null;
    }
  }

  async getDriverByPhoneOrEmail(phone, email) {
    try {
      return await Driver.findOne({
        $or: [{ phone }, { email: email || null }],
      });
    } catch (error) {
      logger.error("Error checking existing driver:", error);
      return null;
    }
  }

  async updateDriverProfile(driverId, updateData) {
    try {
      const allowedFields = [
        "fullName",
        "phone",
        "avatar",
        "licensePlate",
        "vehicleType",
      ];
      const filteredData = {};

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      }

      const driver = await Driver.findOneAndUpdate({ driverId }, filteredData, {
        new: true,
      });

      if (!driver) {
        throw new Error("Driver not found");
      }

      logger.info(`Driver ${driverId} profile updated`);
      return driver;
    } catch (error) {
      logger.error("Error updating driver profile:", error);
      throw error;
    }
  }

  async updateDriverStatus(driverId, newStatus) {
    try {
      const driver = await Driver.findOneAndUpdate(
        { driverId },
        { status: newStatus },
        { new: true },
      );

      if (!driver) {
        throw new Error("Driver not found");
      }

      let lat = null;
      let lng = null;

      if (newStatus === "online") {
        lat = driver.currentLocation?.lat;
        lng = driver.currentLocation?.lng;

        if (!lat || !lng) {
          lat = 21.0285;
          lng = 105.8542;
          logger.warn(
            `⚠️ Driver ${driverId} has no location, using default (${lat}, ${lng})`,
          );
        }

        await redisGeoService.updateDriverLocation(
          driverId,
          lat,
          lng,
          "online",
        );

        const zone = pricingClient.determineZone(lat, lng);
        const onlineCount = await this.getOnlineDriversCountInZone(zone);
        await pricingClient.updateDriverCount(zone, onlineCount);
      } else if (newStatus === "offline") {
        await redisGeoService.updateDriverLocation(
          driverId,
          null,
          null,
          "offline",
        );

        const zone = pricingClient.determineZone(
          driver.currentLocation?.lat,
          driver.currentLocation?.lng,
        );
        const onlineCount = await this.getOnlineDriversCountInZone(zone);
        await pricingClient.updateDriverCount(zone, onlineCount);
      }

      await eventPublisher.publishEvent("driver.status.changed", {
        driverId,
        oldStatus: driver.status,
        newStatus,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Driver ${driverId} status updated to ${newStatus}`);
      return driver;
    } catch (error) {
      logger.error("Error updating driver status:", error);
      throw error;
    }
  }

  async getOnlineDriversCountInZone(zone) {
    try {
      const drivers = await Driver.find({ status: "online" });
      let count = 0;
      for (const driver of drivers) {
        const driverZone = pricingClient.determineZone(
          driver.currentLocation?.lat,
          driver.currentLocation?.lng,
        );
        if (driverZone === zone) {
          count++;
        }
      }
      return count;
    } catch (error) {
      logger.error("Error counting online drivers in zone:", error);
      return 0;
    }
  }

  async updateDriverLocation(
    driverId,
    lat,
    lng,
    speed = 0,
    heading = 0,
    accuracy = 0,
    rideId = null,
  ) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) {
        throw new Error("Driver not found");
      }

      driver.currentLocation = {
        lat,
        lng,
        updatedAt: new Date(),
      };
      await driver.save();

      const history = new LocationHistory({
        driverId,
        lat,
        lng,
        status: driver.status,
        speed,
        heading,
        accuracy,
      });
      await history.save();

      if (driver.status === "online") {
        await redisGeoService.updateDriverLocation(
          driverId,
          lat,
          lng,
          "online",
        );
      }

      logger.debug(`Location updated for driver ${driverId}`);
      return driver;
    } catch (error) {
      logger.error("Error updating driver location:", error);
      throw error;
    }
  }

  async getDriverLocationHistory(driverId, startDate, endDate, limit = 100) {
    try {
      const query = { driverId };
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
      }

      const history = await LocationHistory.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);
      return history;
    } catch (error) {
      logger.error("Error getting location history:", error);
      throw error;
    }
  }

  async getNearbyDrivers(lat, lng, radiusKm = 5, vehicleType = null) {
    try {
      const nearby = await redisGeoService.getNearbyDrivers(
        lat,
        lng,
        radiusKm,
        vehicleType,
      );

      const drivers = await Promise.all(
        nearby.map(async (item) => {
          const driver = await Driver.findOne({ driverId: item.driverId });
          if (driver) {
            return {
              ...driver.toObject(),
              distanceKm: item.distanceKm,
            };
          }
          return null;
        }),
      );

      return drivers.filter((d) => d !== null);
    } catch (error) {
      logger.error("Error getting nearby drivers:", error);
      return [];
    }
  }

  async updateDriverRating(driverId, newRating) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) {
        throw new Error("Driver not found");
      }

      const totalRating = driver.rating * driver.totalTrips + newRating;
      driver.totalTrips += 1;
      driver.rating = totalRating / driver.totalTrips;

      await driver.save();
      logger.info(`Driver ${driverId} rating updated to ${driver.rating}`);
      return driver;
    } catch (error) {
      logger.error("Error updating driver rating:", error);
      throw error;
    }
  }

  async getDriverEarnings(driverId, startDate, endDate) {
    try {
      const query = { driverId };
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }

      const earnings = await DriverEarning.find(query).sort({ createdAt: -1 });
      return earnings;
    } catch (error) {
      logger.error("Error getting driver earnings:", error);
      throw error;
    }
  }

  async acceptRide(driverId, rideId) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) throw new Error("Driver not found");
      if (driver.status !== "online") throw new Error("Driver is not online");

      const rideServiceUrl =
        process.env.RIDE_SERVICE_URL || "http://cab_ride:3008";

      const response = await axios.post(
        `${rideServiceUrl}/api/rides/${rideId}/assign`,
        {
          driverId,
          status: "accepted",
        },
        httpsAgent ? { httpsAgent } : undefined,
      );

      driver.status = "busy";
      await driver.save();

      await eventPublisher.publishEvent("driver.ride.accepted", {
        driverId,
        rideId,
        acceptedAt: new Date().toISOString(),
      });

      return response.data;
    } catch (error) {
      logger.error("Error accepting ride:", error);
      throw error;
    }
  }

  async rejectRide(driverId, rideId) {
    try {
      const rideServiceUrl =
        process.env.RIDE_SERVICE_URL || "http://cab_ride:3008";

      const response = await axios.post(
        `${rideServiceUrl}/api/rides/${rideId}/reject`,
        {
          driverId,
        },
        httpsAgent ? { httpsAgent } : undefined,
      );

      await eventPublisher.publishEvent("driver.ride.rejected", {
        driverId,
        rideId,
        rejectedAt: new Date().toISOString(),
      });

      return response.data;
    } catch (error) {
      logger.error("Error rejecting ride:", error);
      throw error;
    }
  }

  async startRide(driverId, rideId) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) throw new Error("Driver not found");
      if (driver.status !== "busy") throw new Error("Driver is not in a ride");

      const rideServiceUrl =
        process.env.RIDE_SERVICE_URL || "http://cab_ride:3008";

      const response = await axios.post(
        `${rideServiceUrl}/api/rides/${rideId}/start`,
        {
          driverId,
          startedAt: new Date().toISOString(),
        },
        httpsAgent ? { httpsAgent } : undefined,
      );

      logger.info(`Driver ${driverId} started ride ${rideId}`);
      return response.data;
    } catch (error) {
      logger.error("Error starting ride:", error);
      throw error;
    }
  }

  async completeRide(driverId, rideId, distance, duration) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) throw new Error("Driver not found");

      const rideServiceUrl =
        process.env.RIDE_SERVICE_URL || "http://cab_ride:3008";

      const response = await axios.post(
        `${rideServiceUrl}/api/rides/${rideId}/complete`,
        {
          driverId,
          distance,
          duration,
          completedAt: new Date().toISOString(),
        },
        httpsAgent ? { httpsAgent } : undefined,
      );

      driver.status = "online";
      driver.totalTrips += 1;
      await driver.save();

      await eventPublisher.publishEvent("driver.ride.completed", {
        driverId,
        rideId,
        distance,
        duration,
        completedAt: new Date().toISOString(),
      });

      return driver;
    } catch (error) {
      logger.error("Error completing ride:", error);
      throw error;
    }
  }

  async getRideHistory(driverId, options = {}) {
    try {
      const { page = 1, limit = 20, status } = options;
      const skip = (page - 1) * limit;

      const rideServiceUrl =
        process.env.RIDE_SERVICE_URL || "http://cab_ride:3008";

      const response = await axios.get(`${rideServiceUrl}/api/rides/history`, {
        params: { driverId, status, skip, limit },
        ...(httpsAgent ? { httpsAgent } : {}),
      });

      return response.data;
    } catch (error) {
      logger.error("Error getting ride history:", error);
      throw error;
    }
  }

  async getCurrentRide(driverId) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) throw new Error("Driver not found");

      if (driver.status !== "busy") {
        return { hasCurrentRide: false };
      }

      const rideServiceUrl =
        process.env.RIDE_SERVICE_URL || "http://cab_ride:3008";

      const response = await axios.get(
        `${rideServiceUrl}/api/rides/driver/${driverId}/current`,
        {
          ...(httpsAgent ? { httpsAgent } : {}),
        },
      );

      return response.data;
    } catch (error) {
      logger.error("Error getting current ride:", error);
      throw error;
    }
  }
}

module.exports = new DriverService();
