// Định nghĩa kiểu dữ liệu cho Pricing Service
export interface PricingConfig {
  id: number;
  vehicle_type: string;
  base_fare: number;
  per_km_rate: number;
  per_minute_rate: number;
}

export interface EstimateRequest {
  pickupLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  dropoffLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  vehicleType: string;
  distance: number;
  duration: number;
}

export interface EstimateResponse {
  requestId: string;
  vehicleType: string;
  distance: number;
  duration: number;
  zone: string;
  surgeMultiplier: number;
  estimatedFare: number;
  currency: string;
}

export interface RideOption {
  id: string;
  name: string;
  icon: string;
  capacity: number;
  fare: number;
  originalFare: number;
  surgeMultiplier: number;
  etaMinutes: number;
  distance: number;
  isSurge: boolean;
}
