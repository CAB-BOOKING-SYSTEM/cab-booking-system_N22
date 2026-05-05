// src/services/booking.service.js
const { BookingStatus, Booking } = require('../models/Booking');
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
    let eventPublished = false;
    let compensationNeeded = false;
    
    try {
      // 1. Get price from Pricing Service
      console.log(`💰 Getting price estimate...`);
      const estimatedPrice = await this.pricingClient.estimatePrice({
        distance: data.distance,
        duration: data.duration || 0,
        vehicleType: data.vehicleType,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation
      });
      
      // 2. Create booking với status REQUESTED + metadata PENDING
      console.log(`📦 Creating booking record...`);
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
        status: BookingStatus.REQUESTED,
        trackingPath: [],
        metadata: {
          compensationStatus: 'PENDING',
          createdAt: new Date()
        }
      });
      
      console.log(`✅ Booking created: ${booking._id}`);
      compensationNeeded = true;
      
      // 3. Publish event - CRITICAL STEP
      console.log(`📤 Publishing booking.created event...`);
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
      
      if (!published) {
        throw new Error('Failed to publish booking.created event');
      }
      
      eventPublished = true;
      
      // ========== FIX: Dùng findByIdAndUpdate (ATOMIC) ==========
      console.log(`🔄 Updating metadata atomically...`);
      const updatedBooking = await Booking.findByIdAndUpdate(
        booking._id,
        {
          $set: {
            'metadata.compensationStatus': 'COMPLETED',
            'metadata.eventPublished': true,
            'metadata.eventPublishedAt': new Date()
          }
        },
        { new: true }
      );
      
      console.log(`🔍 Metadata after update:`, JSON.stringify(updatedBooking.metadata));
      console.log(`✅ Booking completed successfully: ${booking._id}`);
      
      return this.mapToResponse(updatedBooking);
      
    } catch (error) {
      console.error(`❌ Error creating booking:`, error.message);
      
      if (compensationNeeded && !eventPublished && booking) {
        console.log(`🔄 Running compensation for booking: ${booking._id}`);
        await this.compensateCreateBooking(booking._id);
      }
      
      throw error;
    }
  }
  
  async compensateCreateBooking(bookingId) {
    try {
      console.log(`🗑️ Compensating: Deleting booking ${bookingId}`);
      
      const booking = await this.bookingRepository.findById(bookingId);
      
      if (!booking.driverId) {
        await this.bookingRepository.delete(bookingId);
        console.log(`✅ Compensation successful: Booking ${bookingId} deleted`);
      } else {
        await Booking.findByIdAndUpdate(bookingId, {
          $set: {
            'metadata.compensationStatus': 'FAILED',
            'metadata.compensationError': 'Event publish failed',
            'metadata.compensationAt': new Date()
          }
        });
        console.log(`⚠️ Cannot delete booking ${bookingId}, marked as FAILED`);
      }
      
    } catch (error) {
      console.error(`❌ Compensation failed:`, error.message);
    }
  }
  
  async getBooking(bookingId, userId, role) {
    const booking = await this.bookingRepository.findById(bookingId);
    
    if (role === 'customer' && booking.customerId !== userId) {
      throw new ForbiddenError('You do not have permission to view this booking');
    }
    if (role === 'driver' && booking.driverId !== userId) {
      throw new ForbiddenError('You do not have permission to view this booking');
    }
    
    return this.mapToResponse(booking);
  }
  
  async getCustomerBookings(customerId, page, limit) {
    const result = await this.bookingRepository.findByCustomerId(customerId, page, limit);
    
    if (result.data) {
      result.data = result.data.map(booking => this.mapToResponse(booking));
    }
    
    return result;
  }
  
  async getDriverBookings(driverId, page, limit) {
    const result = await this.bookingRepository.findByDriverId(driverId, page, limit);
    
    if (result.data) {
      result.data = result.data.map(booking => this.mapToResponse(booking));
    }
    
    return result;
  }
  
  async cancelBooking(bookingId, userId, role, reason) {
    const booking = await this.bookingRepository.findById(bookingId);
    
    if (role === 'customer' && booking.customerId !== userId) {
      throw new ForbiddenError('You do not have permission to cancel this booking');
    }
    if (role === 'driver' && booking.driverId !== userId) {
      throw new ForbiddenError('You do not have permission to cancel this booking');
    }
    
    if (!booking.canCancel()) {
      throw new ConflictError(`Cannot cancel booking with status: ${booking.status}`);
    }
    
    const cancelledBooking = await this.bookingRepository.cancelBooking(
      bookingId, 
      role, 
      reason
    );
    
    await this.rabbitMQService.publish('booking.cancelled', {
      bookingId: booking._id.toString(),
      customerId: booking.customerId,
      cancelledBy: role,
      reason,
      cancelledAt: new Date().toISOString()
    });
    
    return this.mapToResponse(cancelledBooking);
  }
  
  async handleBookingAccepted(data) {
    console.log(`📥 Handling booking.accepted for: ${data.bookingId}`);
    
    const booking = await this.bookingRepository.assignDriver(
      data.bookingId,
      data.driverId,
      data.eta || 5
    );
    
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