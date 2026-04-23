export const DEFAULT_API_BASE_URL =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_BASE_URL) ||
  "http://localhost:3000/api";

export const DEFAULT_API_TIMEOUT_MS =
  (typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_API_TIMEOUT_MS &&
    parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT_MS, 10)) ||
  15_000;
