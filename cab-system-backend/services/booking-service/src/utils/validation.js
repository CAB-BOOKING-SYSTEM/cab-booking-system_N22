// src/utils/validation.js
const Joi = require('joi');

// Định nghĩa ValidationError class
class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.statusCode = 400;
  }
}

// Location validation schema
const locationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  address: Joi.string().required().min(5).max(500),
  name: Joi.string().max(100).allow(null).optional()
});

// Create booking validation
const createBookingSchema = Joi.object({
  pickupLocation: locationSchema.required(),
  dropoffLocation: locationSchema.required(),
  waypoints: Joi.array().items(locationSchema).optional().default([]),
  vehicleType: Joi.string().valid('car_4', 'car_7', 'motorbike').required(),
  paymentMethod: Joi.string().valid('cash', 'card', 'wallet').default('cash'),
  distance: Joi.number().min(0.1).max(1000).required(),
  duration: Joi.number().min(1).max(1440).optional()
});

// Cancel booking validation
const cancelBookingSchema = Joi.object({
  reason: Joi.string().min(3).max(500).required()
});

// Update status validation
const updateStatusSchema = Joi.object({
  status: Joi.string().valid('picking_up', 'in_progress', 'completed', 'cancelled').required(),
  reason: Joi.string().when('status', {
    is: 'cancelled',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

// Query params validation
const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10)
});

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw new ValidationError('Validation failed', errors);
  }
  return value;
};

module.exports = {
  createBookingSchema,
  cancelBookingSchema,
  updateStatusSchema,
  paginationSchema,
  validate,
  locationSchema
};