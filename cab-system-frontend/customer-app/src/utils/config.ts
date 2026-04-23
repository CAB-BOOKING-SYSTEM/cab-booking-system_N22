const localhost = "http://localhost";

function withDefaultPort(envValue: string | undefined, port: number): string {
  return envValue ?? `${localhost}:${port}`;
}

export const API_URLS = {
  GATEWAY: withDefaultPort(process.env.EXPO_PUBLIC_GATEWAY_URL, 3000),
  AUTH: withDefaultPort(process.env.EXPO_PUBLIC_AUTH_URL, 3001),
  BOOKING: withDefaultPort(process.env.EXPO_PUBLIC_BOOKING_URL, 3002),
  DRIVER: withDefaultPort(process.env.EXPO_PUBLIC_DRIVER_URL, 3003),
  NOTIFICATION: withDefaultPort(process.env.EXPO_PUBLIC_NOTIFICATION_URL, 3004),
  PAYMENT: withDefaultPort(process.env.EXPO_PUBLIC_PAYMENT_URL, 3005),
  PRICING: withDefaultPort(process.env.EXPO_PUBLIC_PRICING_URL, 3006),
  REVIEW: withDefaultPort(process.env.EXPO_PUBLIC_REVIEW_URL, 3007),
  RIDE: withDefaultPort(process.env.EXPO_PUBLIC_RIDE_URL, 3008),
  USER: withDefaultPort(process.env.EXPO_PUBLIC_USER_URL, 3009),
  MATCHING: withDefaultPort(process.env.EXPO_PUBLIC_MATCHING_URL, 3010),
} as const;
