const Ride = require("../models/rideModel");
const { publishEvent } = require("../events/rabbitmq");
const RideStateMachine = require("../utils/rideStateMachine");

class RideService {
  async createRide(rideData) {
    try {
      rideData.status = "CREATED";
      const ride = await Ride.create(rideData);
      
      // Publish event to RabbitMQ
      await publishEvent("ride_created", {
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

      // Publish status update event
      await publishEvent("ride_status_updated", {
        rideId: ride.id,
        status,
        driverId: ride.driverId,
        userId: ride.userId,
      });

      return ride;
    } catch (error) {
      console.error("Error updating ride status:", error);
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