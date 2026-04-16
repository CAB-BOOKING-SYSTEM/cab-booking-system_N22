 
const mongoose = require('mongoose');

const driverEarningSchema = new mongoose.Schema(
  {
    driverId: {
      type: String,
      required: true,
      index: true,
    },
    weekStart: {
      type: Date,
      required: true,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    tripsCount: {
      type: Number,
      default: 0,
    },
    completedTrips: {
      type: Number,
      default: 0,
    },
    cancelledTrips: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

driverEarningSchema.index({ driverId: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model('DriverEarning', driverEarningSchema);