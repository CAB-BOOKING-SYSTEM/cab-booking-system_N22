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

export enum NotificationType {
  RideRequested = "ride_requested",
  RideAssigned = "ride_assigned",
  RideArriving = "ride_arriving",
  RideStarted = "ride_started",
  RideCompleted = "ride_completed",
  RideCancelled = "ride_cancelled",
  PaymentReceived = "payment_received",
  PaymentFailed = "payment_failed",
  SystemAlert = "system_alert",
  Promotion = "promotion",
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  routingKey: string;
  isRead: boolean;
  createdAt: string; // ISO 8601
}
