/**
 * Application Configuration
 * Environment variables and app-wide settings
 */

// Environment detection
export const ENV = {
  DEV: __DEV__ || process.env.NODE_ENV === 'development',
  PROD: !__DEV__ && process.env.NODE_ENV === 'production',
};

// API Configuration
export const API_CONFIG = {
  // API Base URL
  BASE_URL: ENV.DEV
    ? 'http://localhost:3000/api'
    : 'https://api.cab-booking.com/api',

  // API Timeout in milliseconds
  TIMEOUT: 10000,

  // Retry Configuration
  RETRY: {
    maxRetries: 3,
    initialDelay: 1000, // ms
    backoffMultiplier: 2,
  },

  // Polling intervals
  POLLING: {
    rideUpdates: 3000, // 3 seconds
    driverLocation: 5000, // 5 seconds
    earnings: 10000, // 10 seconds
  },
};

// Authentication
export const AUTH_CONFIG = {
  // Token storage key
  TOKEN_KEY: '@cab_booking_token',
  USER_KEY: '@cab_booking_user',
  DEVICE_ID_KEY: '@cab_booking_device_id',

  // Token expiration time (in hours)
  TOKEN_EXPIRY: 24,

  // Auth endpoints
  ENDPOINTS: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    register: '/auth/register',
  },
};

// App Features
export const FEATURES = {
  // Enable/disable features
  RIDE_SCHEDULING: true,
  RIDE_SHARING: false,
  BIKE_RENTAL: false,
  DRIVER_MODE: true,
  CUSTOMER_MODE: true,

  // Feature flags for beta testing
  BETA_FEATURES: {
    ADVANCED_ROUTING: false,
    AI_PRICE_SURGE: false,
    VOICE_BOOKING: false,
  },
};

// Map Configuration
export const MAP_CONFIG = {
  // Default center coordinates (Ho Chi Minh City)
  DEFAULT_LATITUDE: 10.8231,
  DEFAULT_LONGITUDE: 106.6797,
  DEFAULT_ZOOM: 15,

  // Map provider: 'google', 'mapbox', 'osm'
  PROVIDER: 'google',

  // Geolocation settings
  GEOLOCATION: {
    accuracy: 'high',
    timeout: 15000,
    maximumAge: 10000,
  },
};

// Ride Configuration
export const RIDE_CONFIG = {
  // Default ride options
  DEFAULT_PAYMENT_METHOD: 'cash', // 'cash', 'wallet', 'card'

  // Pricing
  BASE_FARE: 10000, // VND
  RATE_PER_KM: 15000, // VND per km
  RATE_PER_MINUTE: 3000, // VND per minute
  SURGE_MULTIPLIER: 1.5, // During peak hours

  // Driver settings
  DRIVER: {
    MIN_EARNINGS_PER_RIDE: 50000,
    COMMISSION_PERCENTAGE: 20, // Grab gets 20%
    ACCEPTANCE_TIMEOUT: 30, // seconds to accept ride
  },

  // Customer settings
  CUSTOMER: {
    MAX_RIDE_DISTANCE: 50, // km
    UPFRONT_PRICING: true, // Show price before booking
  },

  // Ride statuses
  STATUSES: ['pending', 'assigned', 'arrived', 'ongoing', 'completed', 'cancelled'],

  // Cancellation reasons
  CANCELLATION_REASONS: {
    CUSTOMER: [
      'Driver is too far',
      'Looking for different ride type',
      'Personal reasons',
      'Other',
    ],
    DRIVER: [
      'Rider not ready',
      'Wrong destination',
      'Too many stops',
      'Personal emergency',
      'Other',
    ],
  },
};

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  // Notification types
  TYPES: {
    RIDE_ACCEPTED: 'RIDE_ACCEPTED',
    DRIVER_ARRIVING: 'DRIVER_ARRIVING',
    RIDE_STARTED: 'RIDE_STARTED',
    RIDE_COMPLETED: 'RIDE_COMPLETED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    PROMOTION: 'PROMOTION',
    SYSTEM_UPDATE: 'SYSTEM_UPDATE',
  },

  // Sound settings
  SOUND_ENABLED: true,
  VIBRATION_ENABLED: true,
};

// Storage Configuration
export const STORAGE_CONFIG = {
  // AsyncStorage keys
  KEYS: {
    USER_DATA: '@user_data',
    RIDE_HISTORY: '@ride_history',
    SAVED_LOCATIONS: '@saved_locations',
    PAYMENT_METHODS: '@payment_methods',
    PREFERENCES: '@preferences',
    CACHE_DATA: '@cache_data',
  },

  // Cache expiration time (in hours)
  CACHE_EXPIRY: 24,
};

// Logger Configuration
export const LOGGER_CONFIG = {
  LEVEL: ENV.DEV ? 'debug' : 'error',
  ENABLE_CONSOLE: ENV.DEV,
  ENABLE_FILE: !ENV.DEV,
  FILE_NAME: 'cab-booking.log',
};

// Analytics Configuration
export const ANALYTICS_CONFIG = {
  ENABLED: !ENV.DEV,
  TRACK_SCREENS: true,
  TRACK_EVENTS: true,
  SESSION_TIMEOUT: 30, // minutes
};

// App Permissions
export const PERMISSIONS = {
  LOCATION: 'location',
  CAMERA: 'camera',
  CONTACTS: 'contacts',
  CALENDAR: 'calendar',
  PHOTOS: 'photos',
};

// Default User Preferences
export const DEFAULT_PREFERENCES = {
  LANGUAGE: 'vi', // Vietnamese
  CURRENCY: 'VND',
  THEME: 'light', // 'light', 'dark', 'auto'
  NOTIFICATIONS_ENABLED: true,
  SOUND_ENABLED: true,
  VIBRATION_ENABLED: true,
  LOCATION_SHARING: true,
  SHARE_RIDE_PREFERENCE: false,
  SHOW_ESTIMATED_TIME: true,
  SHOW_UPFRONT_PRICE: true,
};

// Error Codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  LOCATION_ERROR: 'LOCATION_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// Success Codes
export const SUCCESS_CODES = {
  RIDE_BOOKED: 'RIDE_BOOKED',
  PAYMENT_SUCCESSFUL: 'PAYMENT_SUCCESSFUL',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  LOCATION_SAVED: 'LOCATION_SAVED',
};

// Deep Linking Configuration
export const DEEP_LINKING = {
  PREFIX: ['cabbooking://', 'https://cabbooking.com/'],
  ROUTES: {
    RIDE_DETAILS: '/ride/:id',
    DRIVER_PROFILE: '/driver/:id',
    PAYMENT: '/payment',
    HELP: '/help',
  },
};

// Version Configuration
export const VERSION = {
  APP_VERSION: '1.0.0',
  MIN_SUPPORTED_VERSION: '0.9.0',
  API_VERSION: 'v1',
};

export default {
  ENV,
  API_CONFIG,
  AUTH_CONFIG,
  FEATURES,
  MAP_CONFIG,
  RIDE_CONFIG,
  NOTIFICATION_CONFIG,
  STORAGE_CONFIG,
  LOGGER_CONFIG,
  ANALYTICS_CONFIG,
  PERMISSIONS,
  DEFAULT_PREFERENCES,
  ERROR_CODES,
  SUCCESS_CODES,
  DEEP_LINKING,
  VERSION,
};
