const rideService = require("../services/rideService")

async function createRide(req, res) {

  const ride = await rideService.createRide(req.body)

  res.json(ride)
}

async function getAllRides(req, res) {

  const rides = await rideService.getAllRides()

  res.json(rides)
}

async function getRideById(req, res) {

  const ride = await rideService.getRideById(req.params.id)

  res.json(ride)
}

async function updateRide(req, res) {

  const ride = await rideService.updateRide(
    req.params.id,
    req.body
  )

  res.json(ride)
}

async function deleteRide(req, res) {

  await rideService.deleteRide(req.params.id)

  res.json({ message: "Ride deleted" })
}

module.exports = {
  createRide,
  getAllRides,
  getRideById,
  updateRide,
  deleteRide
}