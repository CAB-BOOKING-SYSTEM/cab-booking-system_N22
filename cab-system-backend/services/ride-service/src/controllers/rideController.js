const rideService = require("../services/rideService");

class RideController {
  async createRide(req, res) {
    try {
      // Automatic use userId from JWT if not in body
      const rideData = {
        ...req.body,
        userId: req.body.userId || req.user.sub
      };
      
      const ride = await rideService.createRide(rideData);
      res.status(201).json(ride);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAllRides(req, res) {
    try {
      const rides = await rideService.getAllRides();
      res.json(rides);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRideById(req, res) {
    try {
      const ride = await rideService.getRideById(req.params.id);
      res.json(ride);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async updateRideStatus(req, res) {
    try {
      const ride = await rideService.updateRideStatus(req.params.id, req.body);
      res.json(ride);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async cancelRide(req, res) {
    try {
      const { reason, cancelledBy } = req.body;
      const ride = await rideService.cancelRide(req.params.id, { reason, cancelledBy });
      res.json(ride);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteRide(req, res) {
    try {
      await rideService.deleteRide(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }
}

module.exports = new RideController();