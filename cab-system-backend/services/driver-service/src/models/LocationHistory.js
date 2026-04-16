 const mongoose = require('mongoose');

const locationHistorySchema = new mongoose.Schema(
  {
    driverId: {
      type: String,
      required: true,
      index: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'busy'],
      required: true,
    },
    speed: {
      type: Number,
      default: 0,
    },
    heading: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto delete after 30 days
locationHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Compound index for querying history
locationHistorySchema.index({ driverId: 1, timestamp: -1 });

module.exports = mongoose.model('LocationHistory', locationHistorySchema);
