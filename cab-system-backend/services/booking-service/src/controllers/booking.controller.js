<<<<<<< Updated upstream
const bookingService = require("../services/booking.service");

async function createBooking(req, res) {
  try {
    const booking = await bookingService.createBooking(req.body);
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createBooking
};
=======
// src/controllers/booking.controller.js
const { validate, createBookingSchema, cancelBookingSchema, paginationSchema } = require('../utils/validation');

class BookingController {
  constructor(bookingService) {
    this.bookingService = bookingService;
  }
  
  createBooking = async (req, res, next) => {
    try {
      // req.user comes from JWT auth middleware
      const customerId = req.user?.sub || req.body.customerId || 'test-customer-123';
      
      const validatedData = validate(createBookingSchema, req.body);
      const booking = await this.bookingService.createBooking(customerId, validatedData);
      
      res.status(201).json({
        success: true,
        data: booking
      });
    } catch (error) {
      next(error);
    }
  };
  
  getBooking = async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user?.sub || 'test-customer-123';
      const role = req.user?.role || 'customer';
      
      const booking = await this.bookingService.getBooking(id, userId, role);
      
      res.status(200).json({
        success: true,
        data: booking
      });
    } catch (error) {
      next(error);
    }
  };
  
  getMyBookings = async (req, res, next) => {
    try {
      const { page, limit } = validate(paginationSchema, req.query);
      const userId = req.user?.sub || 'test-customer-123';
      const role = req.user?.role || 'customer';
      
      let result;
      if (role === 'driver') {
        result = await this.bookingService.getDriverBookings(userId, page, limit);
      } else {
        result = await this.bookingService.getCustomerBookings(userId, page, limit);
      }
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  };
  
  cancelBooking = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = validate(cancelBookingSchema, req.body);
      const userId = req.user?.sub || 'test-customer-123';
      const role = req.user?.role || 'customer';
      
      const booking = await this.bookingService.cancelBooking(id, userId, role, reason);
      
      res.status(200).json({
        success: true,
        data: booking
      });
    } catch (error) {
      next(error);
    }
  };
  
  // Internal endpoints (for other services)
  internalAssignDriver = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { driverId, eta } = req.body;
      
      const booking = await this.bookingService.handleBookingAccepted({
        bookingId: id,
        driverId,
        eta
      });
      
      res.status(200).json({
        success: true,
        data: booking
      });
    } catch (error) {
      next(error);
    }
  };
  
  health = async (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'booking-service',
      timestamp: new Date().toISOString()
    });
  };
}

module.exports = BookingController;
>>>>>>> Stashed changes
