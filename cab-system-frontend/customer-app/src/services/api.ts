// API Configuration
const USER_SERVICE_URL = 'http://localhost:3009/api/v1'; // User service (port 3009)
const BOOKING_SERVICE_URL = 'http://localhost:3002/api/v1'; // Booking service
const GATEWAY_URL = 'http://localhost:8000/api/v1'; // Alternative gateway URL

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  data?: any
): Promise<T> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${USER_SERVICE_URL}${endpoint}`, options);

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
}

// User Service APIs
export const userService = {
  // Get user profile by ID
  getUserProfile: async (userId: number) => {
    return apiCall(`/users/${userId}`, 'GET');
  },

  // Get user saved locations
  getSavedLocations: async (userId: number) => {
    return apiCall(`/users/${userId}/locations`, 'GET');
  },

  // Add new saved location
  addLocation: async (userId: number, location: {
    label: string;
    address: string;
    lat?: number;
    lng?: number;
  }) => {
    return apiCall(`/users/${userId}/locations`, 'POST', location);
  },

  // Delete saved location
  deleteLocation: async (userId: number, locationId: number) => {
    return apiCall(`/users/${userId}/locations/${locationId}`, 'DELETE');
  },

  // Update user profile
  updateProfile: async (userId: number, data: {
    full_name?: string;
    email?: string;
  }) => {
    return apiCall(`/users/${userId}`, 'PATCH', data);
  },
};

// Booking Service APIs
export const bookingService = {
  // Get user's bookings/rides
  getMyBookings: async () => {
    try {
      const response = await fetch(`${BOOKING_SERVICE_URL}/bookings`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Get Bookings Error:', error);
      throw error;
    }
  },

  // Get booking details
  getBooking: async (bookingId: string) => {
    try {
      const response = await fetch(`${BOOKING_SERVICE_URL}/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Get Booking Error:', error);
      throw error;
    }
  },

  // Cancel booking
  cancelBooking: async (bookingId: string) => {
    try {
      const response = await fetch(`${BOOKING_SERVICE_URL}/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Cancel Booking Error:', error);
      throw error;
    }
  },
};
