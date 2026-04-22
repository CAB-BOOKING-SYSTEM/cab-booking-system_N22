const Ride = require("../models/rideModel");
const { publishEvent } = require("../events/rabbitmq");
const RideStateMachine = require("../utils/rideStateMachine");

class RideService {
  async createRide(rideData) {
    try {
      rideData.status = "CREATED";
      const ride = await Ride.create(rideData);

      // Publish event to RabbitMQ
      await publishEvent("ride.created", {
        rideId: ride.id,
        userId: ride.userId,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
      });

      return ride;
    } catch (error) {
      console.error("Error creating ride:", error);
      throw error;
    }
  }

  async getAllRides() {
    try {
      return await Ride.findAll();
    } catch (error) {
      console.error("Error fetching rides:", error);
      throw error;
    }
  }

  async getRideById(id) {
    try {
      const ride = await Ride.findByPk(id);
      if (!ride) throw new Error("Ride not found");
      return ride;
    } catch (error) {
      console.error("Error fetching ride by ID:", error);
      throw error;
    }
  }

  async updateRideStatus(id, { status, driverId, fare }) {
    try {
      const ride = await Ride.findByPk(id);
      if (!ride) throw new Error("Ride not found");

      if (status && !RideStateMachine.canTransition(ride.status, status)) {
        throw new Error(`Invalid state transition from ${ride.status} to ${status}`);
      }

      const updateData = {};
      if (status) updateData.status = status;
      if (driverId) updateData.driverId = driverId;
      if (fare) updateData.fare = fare;

      if (status === "IN_PROGRESS") {
        updateData.startTime = new Date();
      } else if (status === "COMPLETED") {
        updateData.endTime = new Date();
      }

      await ride.update(updateData);


      // Nếu trạng thái là COMPLETED, ta publish thêm một event riêng
      if (status === "COMPLETED") {
        await publishEvent("ride.completed", {
          rideId: ride.id,
          driverId: ride.driverId,
          userId: ride.userId,
          fare: ride.fare,
          endTime: updateData.endTime,
        });
      }

      return ride;
    } catch (error) {
      console.error("Error updating ride status:", error);
      throw error;
    }
  }

  async cancelRide(id, { reason, cancelledBy }) {
    try {
      const ride = await Ride.findByPk(id);
      if (!ride) throw new Error("Ride not found");

      if (!RideStateMachine.canTransition(ride.status, "CANCELLED")) {
        throw new Error(`Invalid state transition from ${ride.status} to CANCELLED`);
      }

      await ride.update({
        status: "CANCELLED",
        cancelReason: reason || null,
        endTime: new Date(),
      });

      // Publish event to RabbitMQ
      await publishEvent("ride.cancelled", {
        rideId: ride.id,
        userId: ride.userId,
        driverId: ride.driverId,
        reason,
        cancelledBy,
      });

      return ride;
    } catch (error) {
      console.error("Error cancelling ride:", error);
      throw error;
    }
  }

  async deleteRide(id) {
    try {
      const ride = await Ride.findByPk(id);
      if (!ride) throw new Error("Ride not found");
      await ride.destroy();
      return { message: "Ride deleted successfully" };
    } catch (error) {
      console.error("Error deleting ride:", error);
      throw error;
    }
  }
}

module.exports = new RideService();