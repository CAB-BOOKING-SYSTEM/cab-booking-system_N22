const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  pickupLocation: {
    type: String,
    required: true
  },
  dropoffLocation: {
    type: String,
    required: true
  },
  distance: Number,
  price: Number,
  status: {
    type: String,
    enum: ["REQUESTED", "DRIVER_ASSIGNED", "ONGOING", "COMPLETED", "CANCELLED"],
    default: "REQUESTED"
  }
}, { timestamps: true });

module.exports = mongoose.model("Booking", BookingSchema);