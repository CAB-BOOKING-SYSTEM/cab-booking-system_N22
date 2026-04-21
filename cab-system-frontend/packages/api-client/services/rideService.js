import axios from 'axios';

// Mock API base URL - Replace with actual API endpoint
const API_BASE_URL = 'https://api.cab-booking.local';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

/**
 * Fetch customer ride history
 * @param {string} customerId - Customer ID
 * @param {string} status - Filter by status: 'all', 'completed', 'cancelled'
 * @returns {Promise<Array>} Array of rides
 */
export const fetchCustomerRideHistory = async (customerId, status = 'all') => {
  try {
    const response = await apiClient.get(`/rides/customer/${customerId}`, {
      params: { status },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching customer ride history:', error);
    throw error;
  }
};

/**
 * Fetch driver ride history
 * @param {string} driverId - Driver ID
 * @param {string} status - Filter by status: 'all', 'completed', 'cancelled'
 * @returns {Promise<Array>} Array of rides
 */
export const fetchDriverRideHistory = async (driverId, status = 'all') => {
  try {
    const response = await apiClient.get(`/rides/driver/${driverId}`, {
      params: { status },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching driver ride history:', error);
    throw error;
  }
};

/**
 * Fetch ride details
 * @param {string} rideId - Ride ID
 * @returns {Promise<Object>} Ride details
 */
export const fetchRideDetails = async (rideId) => {
  try {
    const response = await apiClient.get(`/rides/${rideId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching ride details:', error);
    throw error;
  }
};

/**
 * Fetch driver earnings summary
 * @param {string} driverId - Driver ID
 * @param {string} period - Period: 'today', 'week', 'month'
 * @returns {Promise<Object>} Earnings summary
 */
export const fetchDriverEarnings = async (driverId, period = 'today') => {
  try {
    const response = await apiClient.get(`/earnings/${driverId}`, {
      params: { period },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching driver earnings:', error);
    throw error;
  }
};

/**
 * Fetch customer profile
 * @param {string} customerId - Customer ID
 * @returns {Promise<Object>} Customer profile
 */
export const fetchCustomerProfile = async (customerId) => {
  try {
    const response = await apiClient.get(`/customers/${customerId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    throw error;
  }
};

/**
 * Fetch saved locations for customer
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} Array of saved locations
 */
export const fetchSavedLocations = async (customerId) => {
  try {
    const response = await apiClient.get(`/locations/${customerId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching saved locations:', error);
    throw error;
  }
};

/**
 * Add new saved location
 * @param {string} customerId - Customer ID
 * @param {Object} location - Location data
 * @returns {Promise<Object>} Created location
 */
export const addSavedLocation = async (customerId, location) => {
  try {
    const response = await apiClient.post(`/locations/${customerId}`, location);
    return response.data;
  } catch (error) {
    console.error('Error adding saved location:', error);
    throw error;
  }
};

/**
 * Update saved location
 * @param {string} customerId - Customer ID
 * @param {string} locationId - Location ID
 * @param {Object} location - Updated location data
 * @returns {Promise<Object>} Updated location
 */
export const updateSavedLocation = async (customerId, locationId, location) => {
  try {
    const response = await apiClient.put(
      `/locations/${customerId}/${locationId}`,
      location
    );
    return response.data;
  } catch (error) {
    console.error('Error updating saved location:', error);
    throw error;
  }
};

/**
 * Delete saved location
 * @param {string} customerId - Customer ID
 * @param {string} locationId - Location ID
 * @returns {Promise<void>}
 */
export const deleteSavedLocation = async (customerId, locationId) => {
  try {
    await apiClient.delete(`/locations/${customerId}/${locationId}`);
  } catch (error) {
    console.error('Error deleting saved location:', error);
    throw error;
  }
};

export default apiClient;
