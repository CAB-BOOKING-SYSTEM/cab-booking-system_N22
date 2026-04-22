const socketIo = require("socket.io");
const locationTrackingService = require("../services/locationTrackingService");

let io;

const initWebSocket = (server) => {
  io = socketIo(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected to tracking gateway: ${socket.id}`);

    // Receive GPS coordinates continuously
    socket.on("driver_location_update", async (data) => {
      const { driverId, longitude, latitude } = data;
      if (driverId && longitude !== undefined && latitude !== undefined) {
        await locationTrackingService.updateLocation(driverId, longitude, latitude);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = { initWebSocket };
