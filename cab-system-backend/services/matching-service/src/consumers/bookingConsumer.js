const amqp = require('amqplib');
const matchingService = require('../services/matchingService');
const logger = require('../utils/logger');

let channel = null;
let connection = null;

async function connectRabbitMQ() {
    const maxRetries = 10;
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:password123@rabbitmq:5672';
            connection = await amqp.connect(rabbitmqUrl);
            channel = await connection.createChannel();
            
            await channel.assertExchange('booking.events', 'topic', { durable: true });
            
            const queue = 'matching_booking_queue';
            await channel.assertQueue(queue, { durable: true });
            await channel.bindQueue(queue, 'booking.events', 'booking.created');
            
            logger.info('✅ Matching Service connected to RabbitMQ');
            return true;
        } catch (error) {
            retries++;
            logger.error(`❌ RabbitMQ connection failed (${retries}/${maxRetries}):`, error.message);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    return false;
}

async function startBookingConsumer() {
    if (!channel) {
        const connected = await connectRabbitMQ();
        if (!connected) {
            logger.error('❌ Failed to connect to RabbitMQ, consumer not started');
            return;
        }
    }
    
    const queue = 'matching_booking_queue';
    
    await channel.consume(queue, async (msg) => {
        if (!msg) return;
        
        try {
            const content = JSON.parse(msg.content.toString());
            const eventData = content.data || content;
            
            logger.info(`📥 Received booking.created event: ${eventData.bookingId}`);
            
            let pickupLat = eventData.pickupLocation?.lat || eventData.pickupLat;
            let pickupLng = eventData.pickupLocation?.lng || eventData.pickupLng;
            let dropoffLat = eventData.dropoffLocation?.lat || eventData.dropoffLat;
            let dropoffLng = eventData.dropoffLocation?.lng || eventData.dropoffLng;
            
            let vehicleType = eventData.vehicleType;
            if (vehicleType === 'car_4') vehicleType = '4_seat';
            if (vehicleType === 'car_7') vehicleType = '7_seat';
            if (vehicleType === 'motorbike') vehicleType = 'bike';
            
            const result = await matchingService.findDriverForRide(
                eventData.bookingId,
                eventData.customerId,
                pickupLat,
                pickupLng,
                dropoffLat,
                dropoffLng,
                vehicleType
            );
            
            if (result.success) {
                logger.info(`✅ Driver ${result.data.driverId} assigned to booking ${eventData.bookingId}`);
            } else {
                logger.warn(`⚠️ No driver found for booking ${eventData.bookingId}: ${result.error}`);
            }
            
            channel.ack(msg);
        } catch (error) {
            logger.error('❌ Error processing booking event:', error.message);
            channel.nack(msg, false, false);
        }
    });
    
    logger.info('🎧 Listening for booking.created events on exchange "booking.events"...');
}

module.exports = { startBookingConsumer, connectRabbitMQ };