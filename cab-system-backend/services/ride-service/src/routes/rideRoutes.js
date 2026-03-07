const express = require("express")

const router = express.Router()

const rideController = require("../controllers/rideController")

router.post("/", rideController.createRide)

router.get("/", rideController.getAllRides)

router.get("/:id", rideController.getRideById)

router.put("/:id", rideController.updateRide)

router.delete("/:id", rideController.deleteRide)

module.exports = router