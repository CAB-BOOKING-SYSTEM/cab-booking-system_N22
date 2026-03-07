const Ride = require("../models/rideModel")

async function createRide(data) {

  const ride = new Ride(data)

  return await ride.save()
}

async function getAllRides() {

  return await Ride.find()
}

async function getRideById(id) {

  return await Ride.findById(id)
}

async function updateRide(id, data) {

  return await Ride.findByIdAndUpdate(
    id,
    data,
    { new: true }
  )
}

async function deleteRide(id) {

  return await Ride.findByIdAndDelete(id)
}

module.exports = {
  createRide,
  getAllRides,
  getRideById,
  updateRide,
  deleteRide
}