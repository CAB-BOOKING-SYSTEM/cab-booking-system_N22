// src/routes/booking.routes.js
const express = require('express');
const idempotencyMiddleware = require('../middleware/idempotency');

function createBookingRoutes(bookingController) {
  const router = express.Router();
  
  // Public
  router.get('/health', bookingController.health);
  
  // Booking CRUD - THÊM prefix /api
  router.post(
    '/api/bookings',
    idempotencyMiddleware,
    bookingController.createBooking
  );

  router.get('/api/bookings', bookingController.getMyBookings);
  router.get('/api/bookings/:id', bookingController.getBooking);
  router.patch('/api/bookings/:id/cancel', bookingController.cancelBooking);
  
  // Internal routes (for other services)
  router.patch('/internal/bookings/:id/assign-driver', bookingController.internalAssignDriver);
  
  return router;
}

module.exports = createBookingRoutes;
