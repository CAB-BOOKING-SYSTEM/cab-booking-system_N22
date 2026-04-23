export const API_URLS = {
  AUTH: process.env.AUTH_URL || 'http://localhost:3001',
  BOOKING: process.env.BOOKING_URL || 'http://localhost:3002',
  PRICING: process.env.PRICING_URL || 'http://localhost:3006',
  NOTIFICATION: process.env.NOTIFICATION_URL || 'http://localhost:3004',
  GATEWAY: process.env.GATEWAY_URL || 'http://localhost:3000',
};

export const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3004';