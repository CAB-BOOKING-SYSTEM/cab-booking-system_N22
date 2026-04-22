// driver-app/src/utils/config.ts
const GATEWAY_URL = process.env.EXPO_PUBLIC_GATEWAY_URL || "http://localhost:3000";

export const API_URLS = {
  AUTH: `${GATEWAY_URL}/auth`,
  DRIVER: `${GATEWAY_URL}/drivers`,
  RIDE: `${GATEWAY_URL}/rides`,
  BOOKING: `${GATEWAY_URL}/bookings`,
  USER: `${GATEWAY_URL}/api/v1/users`,
  PRICING: `${GATEWAY_URL}/pricing`,
  PAYMENT: `${GATEWAY_URL}/payments`,
  NOTIFICATION: `${GATEWAY_URL}/notifications`,
  REVIEW: `${GATEWAY_URL}/reviews`,
  MATCHING: `${GATEWAY_URL}/matching`,
};
