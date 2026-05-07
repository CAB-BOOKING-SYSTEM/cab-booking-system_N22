// src/services/booking.service.js
const { BookingStatus, Booking } = require('../models/Booking');
const { ForbiddenError, ConflictError } = require('../utils/error.handler');
const { determineZone } = require('../utils/zone');
const axios = require('axios');
const https = require('https');
const fs = require('fs');

const isSurgeFeatureEnabled = () =>
  process.env.SURGE_FEATURE_ENABLED === 'true';

// 🔥 Tạo agent mTLS để gọi Ride Service
let rideHttpsAgent;
try {
  rideHttpsAgent = new https.Agent({
    ca: fs.readFileSync('/shared-certs/ca-root.pem'),
    cert: fs.readFileSync('/shared-certs/booking-service-cert.pem'),
    key: fs.readFileSync('/shared-certs/booking-service-key.pem'),
    rejectUnauthorized: false
  });
  console.log('✅ mTLS agent for Ride Service initialized');
} catch (err) {
  console.warn('⚠️ Cannot load certificates, using fallback HTTP:', err.message);
  rideHttpsAgent = new https.Agent({ rejectUnauthorized: false });
}

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
    let demandTracked = false;
    const surgeEnabled = isSurgeFeatureEnabled();
    const zone = surgeEnabled
      ? determineZone(data.pickupLocation.lat, data.pickupLocation.lng)
      : null;
    
    try {
      // 1. Get price from Pricing Service
      // Gửi tọa độ để Pricing Service tự tính distance & duration qua Map API
      console.log(`💰 Getting price estimate...`);
      const estimatedPrice = await this.pricingClient.estimatePrice({
        distance: data.distance,
        duration: data.duration || 0,
        vehicleType: data.vehicleType,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        zone,
      });
      
      // Lấy distance & duration từ Pricing Service (đã được tính chính xác qua Map API)
      const finalDistance = estimatedPrice.distance || data.distance;
      const finalDuration = estimatedPrice.duration || data.duration;
      
      console.log(`📍 Final distance: ${finalDistance}km, duration: ${finalDuration}min (source: ${estimatedPrice.etaSource || 'client'})`);
      
      // 2. Create booking với distance/duration từ Pricing
      console.log(`📦 Creating booking record...`);
      booking = await this.bookingRepository.create({
        customerId,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        waypoints: data.waypoints || [],
        vehicleType: data.vehicleType,
        paymentMethod: data.paymentMethod || 'cash',
        distance: finalDistance,
        duration: finalDuration,
        estimatedPrice,
        status: BookingStatus.REQUESTED,
        trackingPath: [],
        metadata: {
          compensationStatus: 'PENDING',
          createdAt: new Date(),
          ...(surgeEnabled
            ? {
                surgeZone: zone,
                surgeDemandTracked: false,
              }
            : {}),
        }
      });
      
      console.log(`✅ Booking created: ${booking._id}`);
      compensationNeeded = true;

      if (surgeEnabled) {
        demandTracked = await this.trackDemandDelta(booking, +1, 'booking.created');
      }
      
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
        distance: finalDistance,
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
      
      if (demandTracked && booking) {
        await this.trackDemandDelta(booking, -1, 'booking.create.rollback');
      }

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
      if (isSurgeFeatureEnabled() && booking?.metadata?.surgeDemandTracked) {
        await this.trackDemandDelta(booking, -1, 'booking.compensation');
      }
      
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

    if (isSurgeFeatureEnabled() && booking.metadata?.surgeDemandTracked && booking.status === BookingStatus.REQUESTED) {
      await this.trackDemandDelta(booking, -1, 'booking.cancelled');
    }
    
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
    const originalBooking = await this.bookingRepository.findById(data.bookingId);
    
    const booking = await this.bookingRepository.assignDriver(
      data.bookingId,
      data.driverId,
      data.eta || 5
    );

    if (isSurgeFeatureEnabled() && originalBooking.metadata?.surgeDemandTracked && originalBooking.status === BookingStatus.REQUESTED) {
      await this.trackDemandDelta(originalBooking, -1, 'booking.accepted');
    }
    
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
      BookingStatus.COMPLETED,
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
    const originalBooking = await this.bookingRepository.findById(data.bookingId);
    
    const booking = await this.bookingRepository.cancelBooking(
      data.bookingId,
      'system',
      data.reason || 'Ride cancelled by system'
    );

    if (isSurgeFeatureEnabled() && originalBooking.metadata?.surgeDemandTracked && originalBooking.status === BookingStatus.REQUESTED) {
      await this.trackDemandDelta(originalBooking, -1, 'ride.cancelled');
    }
    
    console.log(`✅ Booking cancelled: ${data.bookingId}`);
    return booking;
  }

  async trackDemandDelta(booking, delta, reason) {
    try {
      if (!isSurgeFeatureEnabled()) {
        return false;
      }

      const zone =
        booking?.metadata?.surgeZone ||
        determineZone(booking.pickupLocation?.lat, booking.pickupLocation?.lng);

      if (!zone) {
        return false;
      }

      const result = await this.pricingClient.adjustRequestCount(zone, delta);
      if (!result) {
        return false;
      }

      await Booking.findByIdAndUpdate(booking._id, {
        $set: {
          'metadata.surgeZone': zone,
          'metadata.surgeDemandTracked': delta > 0,
          'metadata.surgeDemandUpdatedAt': new Date(),
          'metadata.surgeDemandLastReason': reason,
        },
      });

      return true;
    } catch (error) {
      console.warn(`⚠️ Demand tracking skipped for booking ${booking?._id}:`, error.message);
      return false;
    }
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

  // 🔥🔥🔥 HANDLER DRIVER MATCHED + TỰ ĐỘNG TẠO RIDE 🔥🔥🔥
  async handleDriverMatched(data) {
    console.log(`📥 Handling driver.matched for booking: ${data.rideId}`);
    
    // 1. Assign driver cho booking
    const booking = await this.bookingRepository.assignDriver(
      data.rideId,
      data.driverId,
      data.etaMinutes || 5
    );
    
    // 2. 🔥 TỰ ĐỘNG TẠO RIDE TRONG RIDE SERVICE
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || "http://cab_ride:3008";
      const internalSecret = process.env.INTERNAL_SECRET || "cab-internal-2024";
      
      const rideResponse = await axios.post(
        `${rideServiceUrl}/api/rides`,
        {
          bookingId: booking._id.toString(),
          userId: booking.customerId,
          driverId: data.driverId,
          pickupLocation: booking.pickupLocation.address,
          dropoffLocation: booking.dropoffLocation.address,
          fare: booking.estimatedPrice.total,
          status: "ASSIGNED",
          estimatedPrice: booking.estimatedPrice
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret
          },
          timeout: 5000,
          httpsAgent: rideHttpsAgent
        }
      );
      
      console.log(`✅ Ride auto-created for booking ${data.rideId}, rideId: ${rideResponse.data.id || rideResponse.data.data?.id}`);
    } catch (error) {
      console.error(`❌ Failed to auto-create ride: ${error.message}`);
      // Không throw lỗi để không ảnh hưởng đến việc assign driver
    }
    
    // 3. Publish event để notification service gửi thông báo
    await this.rabbitMQService.publish('booking.accepted', {
      bookingId: booking._id.toString(),
      customerId: booking.customerId,
      driverId: data.driverId,
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
      estimatedPrice: booking.estimatedPrice,
      eta: data.etaMinutes || 5,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Driver ${data.driverId} assigned to booking ${data.rideId}`);
    return booking;
  }
}

module.exports = BookingService;