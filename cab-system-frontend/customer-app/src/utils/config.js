const HOST = process.env.EXPO_PUBLIC_API_HOST || "192.168.1.10";

const BASE_URL = `http://${HOST}`;

export const API_URLS = {
  AUTH: `${BASE_URL}:3001`,
  BOOKING: `${BASE_URL}:3002`,
  DRIVER: `${BASE_URL}:3003`,
  NOTI: `${BASE_URL}:3004`,
  PAYMENT: `${BASE_URL}:3005`,
  PRICING: `${BASE_URL}:3006`,
  REVIEW: `${BASE_URL}:3007`,
  RIDE: `${BASE_URL}:3008`,
  USER: `${BASE_URL}:3009`,
};
