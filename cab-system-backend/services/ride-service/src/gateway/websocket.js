const socketIo = require("socket.io");
const locationTrackingService = require("../services/locationTrackingService");
const Ride = require("../models/rideModel");
const { Op } = require("sequelize");

let io;

const initWebSocket = (server) => {
  io = socketIo(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected to tracking gateway: ${socket.id}`);

    // Join a specific ride room to receive updates
    socket.on("join_ride", ({ rideId }) => {
      if (rideId) {
        socket.join(`ride:${rideId}`);
        console.log(`👤 Client ${socket.id} joined ride room: ride:${rideId}`);
      }
    });

    // Receive GPS coordinates continuously from driver
    socket.on("driver_location_update", async (data) => {
      const { driverId, longitude, latitude } = data;
      if (driverId && longitude !== undefined && latitude !== undefined) {
        // 1. Update location in Redis/Geo
        await locationTrackingService.updateLocation(driverId, longitude, latitude);

        // 2. Find active ride for this driver to broadcast to customer
        try {
          const activeRide = await Ride.findOne({
            where: {
              driverId,
              status: {
                [Op.in]: ["ASSIGNED", "PICKUP", "IN_PROGRESS"]
              }
            },
            attributes: ["id"]
          });

          if (activeRide) {
            // 3. Broadcast to the ride room
            io.to(`ride:${activeRide.id}`).emit("driver_location_updated", {
              rideId: activeRide.id,
              driverId,
              location: {
                latitude,
                longitude
              }
            });
          }
        } catch (err) {
          console.error("Error broadcasting driver location:", err);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("WebSocket not initialized!");
  }
  return io;
};

module.exports = { initWebSocket, getIO };
