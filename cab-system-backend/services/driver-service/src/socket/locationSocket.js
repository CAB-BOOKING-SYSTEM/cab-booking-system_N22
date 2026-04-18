const logger = require('../utils/logger');
const redisClient = require('../config/redis');
const Driver = require('../models/Driver');
const LocationHistory = require('../models/LocationHistory');

class LocationSocket {
  constructor(io) {
    this.io = io;
    this.drivers = new Map();
    this.lastUpdate = new Map();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      logger.info(`🔌 New WebSocket connection: ${socket.id}`);

      // ========== DRIVER REGISTER ==========
      socket.on('driver:register', async (data) => {
        try {
          const { driverId, token, lat, lng } = data;
          
          // Lấy user từ token (đã được Gateway xác thực)
          const user = socket.handshake.auth.user;
          if (!user || user.driverId !== driverId) {
            socket.emit('error', { message: 'Authentication failed' });
            return;
          }

          this.drivers.set(driverId, socket.id);
          socket.driverId = driverId;
          socket.join(`driver:${driverId}`);

          // Cập nhật Redis Geo
          if (lat && lng) {
            const redis = redisClient.getClient();
            await redis.geoadd('drivers:location', lng, lat, driverId);
            await redis.hset(`driver:${driverId}`, {
              lat: lat.toString(),
              lng: lng.toString(),
              status: 'online',
              lastUpdate: Date.now().toString()
            });
            await redis.expire(`driver:${driverId}`, 300);
          }

          logger.info(`✅ Driver ${driverId} registered`);
          socket.emit('driver:registered', { success: true });

        } catch (error) {
          logger.error('Register error:', error);
          socket.emit('error', { message: error.message });
        }
      });

      // ========== LOCATION UPDATE (PING < 2s) ==========
      socket.on('driver:location', async (data) => {
        try {
          const { driverId, lat, lng, speed, heading, accuracy } = data;
          
          if (!driverId || !lat || !lng) return;

          // Rate limiting: 500ms
          const now = Date.now();
          const lastTime = this.lastUpdate.get(driverId) || 0;
          if (now - lastTime < 500) return;
          this.lastUpdate.set(driverId, now);

          // Update Redis Geo
          const redis = redisClient.getClient();
          await redis.geoadd('drivers:location', lng, lat, driverId);
          await redis.hset(`driver:${driverId}`, {
            lat: lat.toString(),
            lng: lng.toString(),
            speed: speed || 0,
            heading: heading || 0,
            lastUpdate: now.toString()
          });
          await redis.expire(`driver:${driverId}`, 300);

          // Async MongoDB update
          setImmediate(async () => {
            try {
              await Driver.findOneAndUpdate(
                { driverId },
                {
                  'currentLocation.lat': lat,
                  'currentLocation.lng': lng,
                  'currentLocation.updatedAt': new Date()
                }
              );
            } catch (err) {
              logger.error('MongoDB update error:', err);
            }
          });

          // Broadcast cho matching service
          this.io.emit('driver:location:broadcast', {
            driverId, lat, lng, speed, heading, timestamp: now
          });

          socket.emit('location:ack', { success: true, timestamp: now });

        } catch (error) {
          logger.error('Location update error:', error);
        }
      });

      // ========== DRIVER OFFLINE ==========
      socket.on('driver:offline', async (data) => {
        const { driverId } = data;
        if (driverId) {
          const redis = redisClient.getClient();
          await redis.zrem('drivers:location', driverId);
          await redis.del(`driver:${driverId}`);
          await Driver.findOneAndUpdate({ driverId }, { status: 'offline' });
          this.drivers.delete(driverId);
          logger.info(`🔴 Driver ${driverId} offline`);
          this.io.emit('driver:offline:broadcast', { driverId });
        }
      });

      // ========== DISCONNECT ==========
      socket.on('disconnect', () => {
        if (socket.driverId) {
          logger.info(`🔌 Driver ${socket.driverId} disconnected`);
          this.drivers.delete(socket.driverId);
        }
      });
    });
  }
}

module.exports = LocationSocket;