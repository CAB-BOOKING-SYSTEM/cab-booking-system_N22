export enum RideStatus {
  IDLE = "IDLE",
  SEARCHING = "SEARCHING",
  ACCEPTED = "ACCEPTED",
  ARRIVING = "ARRIVING",
  PICKED_UP = "PICKED_UP",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface Location {
  latitude: number;
  longitude: number;
  heading?: number;
}

export interface DriverInfo {
  driverId: string;
  driverName: string;
  phoneNumber?: string;
  vehiclePlate: string;
  vehicleType: string;
  rating?: number;
  location?: Location;
  estimatedArrivalSec?: number;
}

export interface RideTrackingData {
  rideId: string;
  status: RideStatus;
  pickupLocation: Location & { address: string };
  dropoffLocation: Location & { address: string };
  driver?: DriverInfo;
  currentLocation?: Location;
}

export interface DriverLocationUpdate {
  driverId: string;
  rideId: string;
  location: Location;
}

export interface RideStatusUpdate {
  rideId: string;
  status: RideStatus;
  timestamp: string;
}
