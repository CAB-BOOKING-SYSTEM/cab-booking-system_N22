 const Driver = require('../models/Driver');
const DriverEarning = require('../models/DriverEarning');
const LocationHistory = require('../models/LocationHistory');
const redisGeoService = require('./redisGeoService');
const logger = require('../utils/logger');

class DriverService {
  async createDriver(driverData) {
    try {
      const driver = new Driver(driverData);
      await driver.save();
      logger.info(`Driver created: ${driver.driverId}`);
      return driver;
    } catch (error) {
      logger.error('Error creating driver:', error);
      throw error;
    }
  }

  async getDriverById(driverId) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) {
        throw new Error('Driver not found');
      }
      return driver;
    } catch (error) {
      logger.error('Error getting driver:', error);
      throw error;
    }
  }

  async updateDriverStatus(driverId, newStatus) {
    try {
      const driver = await Driver.findOneAndUpdate(
        { driverId },
        { status: newStatus },
        { new: true }
      );

      if (!driver) {
        throw new Error('Driver not found');
      }

      // Update Redis geo index
      if (newStatus === 'online' && driver.currentLocation) {
        await redisGeoService.updateDriverLocation(
          driverId,
          driver.currentLocation.lat,
          driver.currentLocation.lng,
          'online'
        );
      } else if (newStatus === 'offline') {
        await redisGeoService.updateDriverLocation(driverId, null, null, 'offline');
      }

      logger.info(`Driver ${driverId} status updated to ${newStatus}`);
      return driver;
    } catch (error) {
      logger.error('Error updating driver status:', error);
      throw error;
    }
  }

  async updateDriverLocation(driverId, lat, lng, speed = 0, heading = 0, accuracy = 0) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) {
        throw new Error('Driver not found');
      }

      // Update current location in MongoDB
      driver.currentLocation = {
        lat,
        lng,
        updatedAt: new Date(),
      };
      await driver.save();

      // Save to location history
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

      // Update Redis geo index if online
      if (driver.status === 'online') {
        await redisGeoService.updateDriverLocation(driverId, lat, lng, 'online');
      }

      logger.debug(`Location updated for driver ${driverId}`);
      return driver;
    } catch (error) {
      logger.error('Error updating driver location:', error);
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
      logger.error('Error getting location history:', error);
      throw error;
    }
  }

  async getNearbyDrivers(lat, lng, radiusKm = 5, vehicleType = null) {
    try {
      const nearby = await redisGeoService.getNearbyDrivers(lat, lng, radiusKm, vehicleType);
      
      // Fetch full driver details
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
        })
      );

      return drivers.filter(d => d !== null);
    } catch (error) {
      logger.error('Error getting nearby drivers:', error);
      return [];
    }
  }

  async updateDriverRating(driverId, newRating) {
    try {
      const driver = await Driver.findOne({ driverId });
      if (!driver) {
        throw new Error('Driver not found');
      }

      // Calculate new average rating
      const totalRating = driver.rating * driver.totalTrips + newRating;
      driver.totalTrips += 1;
      driver.rating = totalRating / driver.totalTrips;
      
      await driver.save();
      logger.info(`Driver ${driverId} rating updated to ${driver.rating}`);
      return driver;
    } catch (error) {
      logger.error('Error updating driver rating:', error);
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
      logger.error('Error getting driver earnings:', error);
      throw error;
    }
  }
  // Thêm các method mới vào DriverService class

async updateDriverProfile(driverId, updateData) {
  try {
    // Không cho phép cập nhật các field nhạy cảm
    const allowedFields = ['fullName', 'phone', 'avatar', 'licensePlate', 'vehicleType'];
    const filteredData = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }
    
    const driver = await Driver.findOneAndUpdate(
      { driverId },
      filteredData,
      { new: true }
    );
    
    if (!driver) {
      throw new Error('Driver not found');
    }
    
    logger.info(`Driver ${driverId} profile updated`);
    return driver;
  } catch (error) {
    logger.error('Error updating driver profile:', error);
    throw error;
  }
}

async acceptRide(driverId, rideId) {
  try {
    // Kiểm tra driver có đang online không
    const driver = await Driver.findOne({ driverId });
    if (!driver) throw new Error('Driver not found');
    if (driver.status !== 'online') throw new Error('Driver is not online');
    
    // Gọi sang ride service để cập nhật
    const response = await axios.post(`${process.env.RIDE_SERVICE_URL}/api/rides/${rideId}/assign`, {
      driverId,
      status: 'accepted'
    });
    
    // Cập nhật trạng thái driver thành busy
    driver.status = 'busy';
    await driver.save();
    
    // Publish event
    await eventPublisher.publishEvent('driver.ride.accepted', {
      driverId,
      rideId,
      acceptedAt: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    logger.error('Error accepting ride:', error);
    throw error;
  }
}

async rejectRide(driverId, rideId) {
  try {
    // Gọi sang ride service để từ chối
    const response = await axios.post(`${process.env.RIDE_SERVICE_URL}/api/rides/${rideId}/reject`, {
      driverId
    });
    
    // Publish event để tìm tài xế khác
    await eventPublisher.publishEvent('driver.ride.rejected', {
      driverId,
      rideId,
      rejectedAt: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    logger.error('Error rejecting ride:', error);
    throw error;
  }
}

async startRide(driverId, rideId) {
  try {
    const driver = await Driver.findOne({ driverId });
    if (!driver) throw new Error('Driver not found');
    if (driver.status !== 'busy') throw new Error('Driver is not in a ride');
    
    // Gọi sang ride service để bắt đầu chuyến
    const response = await axios.post(`${process.env.RIDE_SERVICE_URL}/api/rides/${rideId}/start`, {
      driverId,
      startedAt: new Date().toISOString()
    });
    
    logger.info(`Driver ${driverId} started ride ${rideId}`);
    return response.data;
  } catch (error) {
    logger.error('Error starting ride:', error);
    throw error;
  }
}

async getRideHistory(driverId, options = {}) {
  try {
    const { page = 1, limit = 20, status } = options;
    const skip = (page - 1) * limit;
    
    // Gọi sang ride service để lấy lịch sử
    const query = { driverId };
    if (status) query.status = status;
    
    const response = await axios.get(`${process.env.RIDE_SERVICE_URL}/api/rides/history`, {
      params: { ...query, skip, limit }
    });
    
    return response.data;
  } catch (error) {
    logger.error('Error getting ride history:', error);
    throw error;
  }
}

async getCurrentRide(driverId) {
  try {
    const driver = await Driver.findOne({ driverId });
    if (!driver) throw new Error('Driver not found');
    
    if (driver.status !== 'busy') {
      return { hasCurrentRide: false };
    }
    
    // Gọi sang ride service để lấy chuyến hiện tại
    const response = await axios.get(`${process.env.RIDE_SERVICE_URL}/api/rides/driver/${driverId}/current`);
    
    return response.data;
  } catch (error) {
    logger.error('Error getting current ride:', error);
    throw error;
  }
}
}

module.exports = new DriverService();
