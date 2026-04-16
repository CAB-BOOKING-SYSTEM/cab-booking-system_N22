const express = require("express");
const router = express.Router();
const rideController = require("../controllers/rideController");

router.post("/", (req, res) => rideController.createRide(req, res));
router.get("/", (req, res) => rideController.getAllRides(req, res));
router.get("/:id", (req, res) => rideController.getRideById(req, res));
router.patch("/:id/status", (req, res) => rideController.updateRideStatus(req, res));
router.delete("/:id", (req, res) => rideController.deleteRide(req, res));

module.exports = router;