export enum UserRole {
  Customer = "customer",
  Driver = "driver",
  Admin = "admin",
}

export enum RideStatus {
  Requested = "requested",
  Matching = "matching",
  Assigned = "assigned",
  Arriving = "arriving",
  InProgress = "in_progress",
  Completed = "completed",
  Cancelled = "cancelled",
}

export enum PaymentStatus {
  Pending = "pending",
  Authorized = "authorized",
  Paid = "paid",
  Failed = "failed",
  Refunded = "refunded",
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface UserProfile {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface RideSummary {
  id: string;
  status: RideStatus;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  estimatedFare: number;
  currency: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}
