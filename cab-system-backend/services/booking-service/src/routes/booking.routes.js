<<<<<<< Updated upstream
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");

router.post("/bookings", bookingController.createBooking);

module.exports = router;
=======
// src/routes/booking.routes.js
const express = require('express');

function createBookingRoutes(bookingController) {
  const router = express.Router();
  
  // Public routes
  router.get('/health', bookingController.health);
  
  // Booking CRUD
  router.post('/bookings', bookingController.createBooking);
  router.get('/bookings', bookingController.getMyBookings);
  router.get('/bookings/:id', bookingController.getBooking);
  router.patch('/bookings/:id/cancel', bookingController.cancelBooking);
  
  // Internal routes (for other services)
  router.patch('/internal/bookings/:id/assign-driver', bookingController.internalAssignDriver);
  
  return router;
}

module.exports = createBookingRoutes;
>>>>>>> Stashed changes
