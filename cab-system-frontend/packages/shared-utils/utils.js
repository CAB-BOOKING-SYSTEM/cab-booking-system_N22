/**
 * Shared Utilities for Cab Booking System
 */

/**
 * Format currency in Vietnamese Dong
 */
export const formatCurrency = (amount) => {
  return `₫${amount.toLocaleString('vi-VN')}`;
};

/**
 * Format date and time in Vietnamese locale
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format time only
 */
export const formatTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date only
 */
export const formatDate = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Mask phone number: 0901234567 -> 090****567
 */
export const maskPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || phoneNumber.length < 6) return phoneNumber;
  const start = phoneNumber.slice(0, 3);
  const end = phoneNumber.slice(-3);
  return `${start}**${end}`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 30) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate ride duration in minutes
 */
export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  return Math.round((end - start) / 60000); // Convert ms to minutes
};

/**
 * Calculate estimated fare based on distance and rate
 */
export const calculateEstimatedFare = (distance, ratePerKm = 15000, baseFare = 10000) => {
  return Math.round(baseFare + distance * ratePerKm);
};

/**
 * Check if phone number is valid Vietnamese format
 */
export const isValidPhoneNumber = (phoneNumber) => {
  const vietnamesePhoneRegex = /^(0|\+84)[1-9]\d{8}$/;
  return vietnamesePhoneRegex.test(phoneNumber);
};

/**
 * Check if email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Generate mock avatar URL
 */
export const generateAvatarUrl = (seed) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

/**
 * Sleep function for simulating delays
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async (
  fn,
  maxRetries = 3,
  initialDelay = 1000
) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }
  throw lastError;
};

/**
 * Format ride status with human-readable text
 */
export const formatRideStatus = (status) => {
  const statusMap = {
    completed: 'Completed',
    cancelled: 'Cancelled',
    ongoing: 'Ongoing',
    pending: 'Pending',
    assigned: 'Assigned',
    arrived: 'Driver Arrived',
  };
  return statusMap[status?.toLowerCase()] || status;
};

/**
 * Get time elapsed since a given time
 */
export const getTimeElapsed = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now - dateObj) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default {
  formatCurrency,
  formatDateTime,
  formatTime,
  formatDate,
  maskPhoneNumber,
  truncateText,
  calculateDistance,
  calculateDuration,
  calculateEstimatedFare,
  isValidPhoneNumber,
  isValidEmail,
  getInitials,
  generateAvatarUrl,
  sleep,
  retryWithBackoff,
  formatRideStatus,
  getTimeElapsed,
};
