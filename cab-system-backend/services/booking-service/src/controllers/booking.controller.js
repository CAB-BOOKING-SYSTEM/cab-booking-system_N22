// src/controllers/booking.controller.js
const jwt = require("jsonwebtoken");
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

  // Hàm giải mã token lấy user id (sub)
  getUserIdFromToken(req) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        console.log("No token provided");
        return null;
      }
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "supersecret",
      );
      console.log("Decoded token - sub:", decoded.sub);
      return decoded.sub;
    } catch (error) {
      console.error("Token decode error:", error.message);
      return null;
    }
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

      const role = req.user?.role || "customer";
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

      const role = req.user?.role || "customer";

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

      const role = req.user?.role || "customer";
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