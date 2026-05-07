const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    driverId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      required: false,
      unique: false,
      sparse: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    licensePlate: {
      type: String,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: ['4_seat', '7_seat', 'luxury'],
      default: '4_seat',
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'busy'],
      default: 'offline',
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    totalTrips: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    avatar: String,
    currentLocation: {
      lat: { type: Number, default: 10.7626 },      // 🔥 Thêm default
      lng: { type: Number, default: 106.6823 },     // 🔥 Thêm default
      updatedAt: { type: Date, default: Date.now }, // 🔥 Thêm default
    },
  },
  {
    timestamps: true,
  }
);

driverSchema.index({ 'currentLocation.lat': 1, 'currentLocation.lng': 1 });

module.exports = mongoose.model('Driver', driverSchema);