export const API_URLS = {
  // Thay vì gọi trực tiếp localhost:3001, gọi qua gateway port 3000
  AUTH: process.env.EXPO_PUBLIC_AUTH_URL || 'http://localhost:3000',
  BOOKING: process.env.EXPO_PUBLIC_BOOKING_URL || 'http://localhost:3000',
  DRIVER: process.env.EXPO_PUBLIC_DRIVER_URL || 'http://localhost:3000',
  PRICING: process.env.EXPO_PUBLIC_PRICING_URL || 'http://localhost:3000',
  GATEWAY: process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:3000',
};