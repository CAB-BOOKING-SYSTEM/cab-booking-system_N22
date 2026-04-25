// src/services/booking.service.js
const { v4: uuidv4 } = require('uuid');
const { BookingStatus } = require('../models/Booking');
const { ForbiddenError, ConflictError } = require('../utils/error.handler');

class BookingService {
  constructor(bookingRepository, rabbitMQService, pricingClient) {
    this.bookingRepository = bookingRepository;
    this.rabbitMQService = rabbitMQService;
    this.pricingClient = pricingClient;
  }
  
  async createBooking(customerId, data) {
    console.log(`📝 Creating booking for customer: ${customerId}`);
    
    let booking = null;
    
    try {
      // 1. Get price from Pricing Service
      const estimatedPrice = await this.pricingClient.estimatePrice({
        distance: data.distance,
        duration: data.duration || 0,
        vehicleType: data.vehicleType,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation
      });
      
      // 2. Create booking
      booking = await this.bookingRepository.create({
        customerId,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        waypoints: data.waypoints || [],
        vehicleType: data.vehicleType,
        paymentMethod: data.paymentMethod || 'cash',
        distance: data.distance,
        duration: data.duration,
        estimatedPrice,
        status: BookingStatus.PENDING,
        trackingPath: []
      });
      
      console.log(`✅ Booking created: ${booking._id}`);
      
      // 3. Publish event for Matching Service
      const published = await this.rabbitMQService.publish('booking.created', {
        bookingId: booking._id.toString(),
        customerId,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        vehicleType: data.vehicleType,
        estimatedPrice,
        paymentMethod: data.paymentMethod || 'cash',
        distance: data.distance,
        timestamp: new Date().toISOString()
      });
      
      // 🔥 Nếu publish event thất bại → ROLLBACK: xóa booking vừa tạo
      if (!published) {
        console.error(`❌ Failed to publish event, rolling back booking ${booking._id}`);
        await this.bookingRepository.delete(booking._id);
        throw new Error("Failed to publish booking event, transaction rolled back");
      }
      
      console.log(`✅ Booking created and event published: ${booking._id}`);
      return this.mapToResponse(booking);
      
    } catch (error) {
      // 🔥 Nếu có lỗi và booking đã được tạo → ROLLBACK: xóa booking
      if (booking && booking._id) {
        console.error(`❌ Error occurred, rolling back booking ${booking._id}`);
        try {
          await this.bookingRepository.delete(booking._id);
          console.log(`🗑️ Booking ${booking._id} deleted during rollback`);
        } catch (deleteError) {
          console.error(`❌ Failed to delete booking during rollback:`, deleteError.message);
        }
      }
      throw error;
    }
  }
  
  async getBooking(bookingId, userId, role) {
    const booking = await this.bookingRepository.findById(bookingId);
    
    // Check permission
    if (role === 'customer' && booking.customerId !== userId) {
      throw new ForbiddenError('You do not have permission to view this booking');
    }
    if (role === 'driver' && booking.driverId !== userId) {
      throw new ForbiddenError('You do not have permission to view this booking');
    }
    
    return this.mapToResponse(booking);
  }
  
  async getCustomerBookings(customerId, page, limit) {
    return await this.bookingRepository.findByCustomerId(customerId, page, limit);
  }
  
  async getDriverBookings(driverId, page, limit) {
    return await this.bookingRepository.findByDriverId(driverId, page, limit);
  }
  
  async cancelBooking(bookingId, userId, role, reason) {
    const booking = await this.bookingRepository.findById(bookingId);
    
    // Check permission
    if (role === 'customer' && booking.customerId !== userId) {
      throw new ForbiddenError('You do not have permission to cancel this booking');
    }
    if (role === 'driver' && booking.driverId !== userId) {
      throw new ForbiddenError('You do not have permission to cancel this booking');
    }
    
    // Check if cancellable
    if (!booking.canCancel()) {
      throw new ConflictError(`Cannot cancel booking with status: ${booking.status}`);
    }
    
    const cancelledBooking = await this.bookingRepository.cancelBooking(
      bookingId, 
      role, 
      reason
    );
    
    // Publish cancellation event
    await this.rabbitMQService.publish('booking.cancelled', {
      bookingId: booking._id.toString(),
      customerId: booking.customerId,
      cancelledBy: role,
      reason,
      cancelledAt: new Date().toISOString()
    });
    
    return this.mapToResponse(cancelledBooking);
  }
  
  // Internal methods (called via RabbitMQ events)
  async handleBookingAccepted(data) {
    console.log(`📥 Handling booking.accepted for: ${data.bookingId}`);
    
    const booking = await this.bookingRepository.assignDriver(
      data.bookingId,
      data.driverId,
      data.eta || 5
    );
    
    // Forward event to Ride Service
    await this.rabbitMQService.publish('booking.accepted', {
      bookingId: booking._id.toString(),
      customerId: booking.customerId,
      driverId: data.driverId,
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
      estimatedPrice: booking.estimatedPrice,
      paymentMethod: booking.paymentMethod,
      distance: booking.distance,
      eta: data.eta || 5,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Booking confirmed: ${data.bookingId}, driver: ${data.driverId}`);
    return booking;
  }
  
  async handleRideCompleted(data) {
    console.log(`📥 Handling ride.completed for: ${data.bookingId}`);
    
    const booking = await this.bookingRepository.updateStatus(
      data.bookingId,
      'completed',
      { endTime: new Date(data.endTime || Date.now()) }
    );
    
    if (data.finalPrice) {
      await this.bookingRepository.updatePrice(data.bookingId, data.finalPrice);
    }
    
    console.log(`✅ Booking completed: ${data.bookingId}`);
    return booking;
  }
  
  async handleRideCancelled(data) {
    console.log(`📥 Handling ride.cancelled for: ${data.bookingId}`);
    
    const booking = await this.bookingRepository.cancelBooking(
      data.bookingId,
      'system',
      data.reason || 'Ride cancelled by system'
    );
    
    console.log(`✅ Booking cancelled: ${data.bookingId}`);
    return booking;
  }
  
  mapToResponse(booking) {
    const obj = booking.toObject ? booking.toObject() : booking;
    return {
      id: obj._id.toString(),
      customerId: obj.customerId,
      driverId: obj.driverId,
      pickupLocation: obj.pickupLocation,
      dropoffLocation: obj.dropoffLocation,
      waypoints: obj.waypoints,
      status: obj.status,
      vehicleType: obj.vehicleType,
      distance: obj.distance,
      duration: obj.duration,
      paymentMethod: obj.paymentMethod,
      estimatedPrice: obj.estimatedPrice,
      price: obj.price,
      isPaid: obj.isPaid,
      pickupTime: obj.pickupTime,
      startTime: obj.startTime,
      endTime: obj.endTime,
      cancellation: obj.cancellation,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt
    };
  }
}

module.exports = BookingService;