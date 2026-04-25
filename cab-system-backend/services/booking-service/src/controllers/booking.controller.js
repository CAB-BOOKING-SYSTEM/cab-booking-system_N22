// src/controllers/booking.controller.js
const {
  validate,
  createBookingSchema,
  cancelBookingSchema,
  paginationSchema,
} = require("../utils/validation");

class BookingController {
  constructor(bookingService) {
    this.bookingService = bookingService;
  }

  // Lấy user id từ header (được API Gateway truyền sang)
  getUserIdFromToken(req) {
    return req.headers['x-user-id'] || null;
  }

  createBooking = async (req, res, next) => {
    try {
      const userId = this.getUserIdFromToken(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Cannot identify user",
        });
      }

      const customerId = String(userId);
      console.log("Creating booking for customer ID:", customerId);

      const validatedData = validate(createBookingSchema, req.body);
      const booking = await this.bookingService.createBooking(
        customerId,
        validatedData,
      );

      res.status(201).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };

  getBooking = async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = this.getUserIdFromToken(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const role = req.headers['x-user-role'] || "customer";
      const booking = await this.bookingService.getBooking(
        id,
        String(userId),
        role,
      );

      res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };

  getMyBookings = async (req, res, next) => {
    try {
      const { page, limit } = validate(paginationSchema, req.query);
      const userId = this.getUserIdFromToken(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const role = req.headers['x-user-role'] || "customer";

      let result;
      if (role === "driver") {
        result = await this.bookingService.getDriverBookings(
          String(userId),
          page,
          limit,
        );
      } else {
        result = await this.bookingService.getCustomerBookings(
          String(userId),
          page,
          limit,
        );
      }

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelBooking = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = validate(cancelBookingSchema, req.body);
      const userId = this.getUserIdFromToken(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const role = req.headers['x-user-role'] || "customer";
      const booking = await this.bookingService.cancelBooking(
        id,
        String(userId),
        role,
        reason,
      );

      res.status(200).json({
        success: true,
        data: booking,
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
        eta,
      });

      res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };

  health = async (req, res) => {
    res.status(200).json({
      status: "ok",
      service: "booking-service",
      timestamp: new Date().toISOString(),
    });
  };
}

module.exports = BookingController;