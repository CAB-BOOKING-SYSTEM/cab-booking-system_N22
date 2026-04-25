// src/repositories/booking.repository.js
const { Booking } = require('../models/Booking');
const { NotFoundError } = require('../utils/error.handler');

class BookingRepository {
  async create(bookingData) {
    const booking = new Booking(bookingData);
    return await booking.save();
  }
  
  async findById(id) {
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking', id);
    }
    return booking;
  }
  
  // 🔥 THÊM METHOD NÀY
  async delete(id) {
    const booking = await Booking.findByIdAndDelete(id);
    if (!booking) {
      throw new NotFoundError('Booking', id);
    }
    console.log(`🗑️ Booking deleted: ${id}`);
    return booking;
  }
  
  async findByCustomerId(customerId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      Booking.find({ customerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments({ customerId })
    ]);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
  
  async findByDriverId(driverId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      Booking.find({ driverId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments({ driverId })
    ]);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
  
  async updateStatus(id, status, additionalData = {}) {
    const booking = await this.findById(id);
    
    this.validateStatusTransition(booking.status, status);
    
    booking.status = status;
    
    if (status === 'in_progress') {
      booking.startTime = new Date();
    } else if (status === 'completed') {
      booking.endTime = new Date();
    }
    
    Object.assign(booking, additionalData);
    
    await booking.save();
    return booking;
  }
  
  async assignDriver(id, driverId, eta) {
    const booking = await this.findById(id);
    
    if (!booking.canAccept()) {
      throw new Error(`Cannot assign driver to booking with status: ${booking.status}`);
    }
    
    booking.driverId = driverId;
    booking.status = 'confirmed';
    booking.pickupTime = new Date(Date.now() + (eta || 5) * 60000);
    
    await booking.save();
    return booking;
  }
  
  async cancelBooking(id, cancelledBy, reason) {
    const booking = await this.findById(id);
    
    if (!booking.canCancel()) {
      throw new Error(`Cannot cancel booking with status: ${booking.status}`);
    }
    
    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy,
      reason,
      cancelledAt: new Date()
    };
    
    await booking.save();
    return booking;
  }
  
  async updatePrice(id, priceData) {
    const booking = await this.findById(id);
    booking.price = priceData;
    await booking.save();
    return booking;
  }
  
  async updateTrackingPath(id, location) {
    const booking = await this.findById(id);
    booking.trackingPath.push({
      ...location,
      timestamp: new Date()
    });
    
    if (booking.trackingPath.length > 100) {
      booking.trackingPath = booking.trackingPath.slice(-100);
    }
    
    await booking.save();
    return booking;
  }
  
  validateStatusTransition(oldStatus, newStatus) {
    const validTransitions = {
      'pending': ['confirmed', 'cancelled', 'no_driver'],
      'confirmed': ['picking_up', 'cancelled'],
      'picking_up': ['in_progress', 'cancelled'],
      'in_progress': ['completed'],
      'completed': [],
      'cancelled': [],
      'no_driver': ['pending']
    };
    
    const allowed = validTransitions[oldStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
    }
  }
}

module.exports = BookingRepository;