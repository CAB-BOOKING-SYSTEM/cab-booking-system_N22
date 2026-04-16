// src/models/Booking.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
  name: { type: String, default: null }
}, { _id: false });

const priceDetailSchema = new mongoose.Schema({
  basePrice: { type: Number, required: true },
  distancePrice: { type: Number, required: true },
  timePrice: { type: Number, required: true },
  surgeMultiplier: { type: Number, required: true, default: 1.0 },
  total: { type: Number, required: true },
  currency: { type: String, default: 'VND' }
}, { _id: false });

const cancellationSchema = new mongoose.Schema({
  cancelledBy: { type: String, enum: ['customer', 'driver', 'system'] },
  reason: { type: String },
  cancelledAt: { type: Date }
}, { _id: false });

const BookingStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PICKING_UP: 'picking_up',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_DRIVER: 'no_driver'
};

const VehicleType = {
  CAR_4: 'car_4',
  CAR_7: 'car_7',
  MOTORBIKE: 'motorbike'
};

const PaymentMethod = {
  CASH: 'cash',
  CARD: 'card',
  WALLET: 'wallet'
};

const bookingSchema = new mongoose.Schema({
  customerId: { type: String, required: true, index: true },
  driverId: { type: String, index: true, default: null },
  pickupLocation: { type: locationSchema, required: true },
  dropoffLocation: { type: locationSchema, required: true },
  waypoints: { type: [locationSchema], default: [] },
  status: { 
    type: String, 
    enum: Object.values(BookingStatus),
    default: BookingStatus.PENDING,
    index: true
  },
  vehicleType: { type: String, enum: Object.values(VehicleType), required: true },
  distance: { type: Number, required: true },
  duration: { type: Number },
  paymentMethod: { type: String, enum: Object.values(PaymentMethod), default: PaymentMethod.CASH },
  estimatedPrice: { type: priceDetailSchema, required: true },
  price: { type: priceDetailSchema },
  isPaid: { type: Boolean, default: false },
  pickupTime: { type: Date },
  startTime: { type: Date },
  endTime: { type: Date },
  trackingPath: { type: Array, default: [] },
  cancellation: { type: cancellationSchema },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ driverId: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: 1 });

// Virtual for formatted price
bookingSchema.virtual('formattedPrice').get(function() {
  const price = this.price || this.estimatedPrice;
  if (!price) return null;
  return `${price.total.toLocaleString()} ${price.currency}`;
});

// Methods
bookingSchema.methods.canCancel = function() {
  return [BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(this.status);
};

bookingSchema.methods.canAccept = function() {
  return this.status === BookingStatus.PENDING;
};

bookingSchema.methods.canStart = function() {
  return this.status === BookingStatus.CONFIRMED;
};

bookingSchema.methods.canComplete = function() {
  return this.status === BookingStatus.IN_PROGRESS;
};

module.exports = {
  Booking: mongoose.model('Booking', bookingSchema),
  BookingStatus,
  VehicleType,
  PaymentMethod
};