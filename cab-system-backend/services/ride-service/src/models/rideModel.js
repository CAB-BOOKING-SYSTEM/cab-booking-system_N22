const mongoose = require("mongoose")

const RideSchema = new mongoose.Schema({
  passengerId: {
    type: String,
    required: true
  },

  driverId: {
    type: String
  },

  pickup: {
    lat: Number,
    lng: Number
  },

  destination: {
    lat: Number,
    lng: Number
  },

  status: {
    type: String,
    enum: [
      "SEARCHING_DRIVER",
      "DRIVER_ASSIGNED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED"
    ],
    default: "SEARCHING_DRIVER"
  }

}, { timestamps: true })

module.exports = mongoose.model("Ride", RideSchema)