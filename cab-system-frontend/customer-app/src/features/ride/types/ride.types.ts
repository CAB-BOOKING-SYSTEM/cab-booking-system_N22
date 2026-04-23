export enum RideStatus {
  IDLE = "IDLE",
  SEARCHING = "SEARCHING",
  CREATED = "CREATED",
  MATCHING = "MATCHING",
  ASSIGNED = "ASSIGNED",
  PICKUP = "PICKUP",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
  // Legacy mappings for UI compatibility if needed
  ACCEPTED = "ASSIGNED",
  ARRIVING = "PICKUP",
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
