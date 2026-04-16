// index.js
const config = require('./config');
const App = require('./app');
const createBookingRoutes = require('./src/routes/booking.routes');
const BookingRepository = require('./src/repositories/booking.repository');
const RabbitMQService = require('./src/services/rabbitmq.service');
const PricingClient = require('./src/services/pricing.client');
const BookingService = require('./src/services/booking.service');
const BookingController = require('./src/controllers/booking.controller');

async function bootstrap() {
  try {
    // Initialize dependencies
    const bookingRepository = new BookingRepository();
    const rabbitMQService = new RabbitMQService(config);
    const pricingClient = new PricingClient(config);
    const bookingService = new BookingService(
      bookingRepository, 
      rabbitMQService, 
      pricingClient
    );
    const bookingController = new BookingController(bookingService);
    const bookingRoutes = createBookingRoutes(bookingController);
    
    // Connect to RabbitMQ
    await rabbitMQService.connect();
    
    // Setup event handlers
    await rabbitMQService.consume({
      'booking.accepted': (data) => bookingService.handleBookingAccepted(data),
      'ride.completed': (data) => bookingService.handleRideCompleted(data),
      'ride.cancelled': (data) => bookingService.handleRideCancelled(data)
    });
    
    // Create Express app
    const appInstance = new App(bookingRoutes);
    await appInstance.connectDatabase();
    
    const app = appInstance.getApp();
    
    // Start server
    const server = app.listen(config.port, () => {
      console.log(`🚀 Booking Service running on port ${config.port}`);
      console.log(`📝 Environment: ${config.env}`);
      console.log(`🔗 API Base URL: http://localhost:${config.port}/api/v1`);
    });
    
    // Graceful shutdown
    const shutdown = async () => {
      console.log('🛑 Shutting down gracefully...');
      server.close(async () => {
        await rabbitMQService.close();
        await mongoose.disconnect();
        console.log('✅ Shutdown complete');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();