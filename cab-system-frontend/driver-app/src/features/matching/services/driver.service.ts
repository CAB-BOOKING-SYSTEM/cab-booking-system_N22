// @ts-nocheck
// @ts-ignore
// driver-app/src/features/matching/services/driver.service.ts
import { apiClient } from "@cab/api-client";
import io, { Socket } from "socket.io-client";

export interface IncomingRequest {
  requestId: string;
  rideId: string;
  pickupLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  dropoffLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  distance: number;
  estimatedPrice: number;
  estimatedDuration: number;
  customerInfo: {
    customerId: string;
    customerName: string;
    customerRating: number;
  };
}

export interface AcceptRideRequest {
  driverId: string;
  rideId: string;
}

class DriverService {
  private baseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api";
  private wsUrl = process.env.EXPO_PUBLIC_WS_URL || "ws://localhost:3000";
  private socket: Socket | null = null;
  private onIncomingRequestCallback:
    | ((request: IncomingRequest) => void)
    | null = null;

  // ========== HTTP API ==========

  // Cập nhật trạng thái online/offline
  async toggleStatus(
    driverId: string,
    status: "online" | "offline",
  ): Promise<boolean> {
    try {
      await apiClient.post(
        `${this.baseUrl}/drivers/${driverId}/toggle-status`,
        { status },
      );
      return true;
    } catch (error) {
      console.error("Toggle status error:", error);
      return false;
    }
  }

  // Nhận chuyến (Accept)
  async acceptRide(driverId: string, rideId: string): Promise<boolean> {
    try {
      await apiClient.post(`${this.baseUrl}/drivers/${driverId}/accept-ride`, {
        rideId,
      });
      return true;
    } catch (error) {
      console.error("Accept ride error:", error);
      return false;
    }
  }

  // Từ chối chuyến (Reject)
  async rejectRide(driverId: string, rideId: string): Promise<boolean> {
    try {
      await apiClient.post(`${this.baseUrl}/drivers/${driverId}/reject-ride`, {
        rideId,
      });
      return true;
    } catch (error) {
      console.error("Reject ride error:", error);
      return false;
    }
  }

  // Cập nhật trạng thái chuyến đi (ARRIVED, IN_PROGRESS, COMPLETED)
  async updateRideStatus(rideId: string, status: string): Promise<boolean> {
    try {
      await apiClient.patch(`${process.env.EXPO_PUBLIC_RIDE_URL || "http://localhost:3008"}/rides/${rideId}/status`, { status });
      return true;
    } catch (error) {
      console.error("Update ride status error:", error);
      return false;
    }
  }

  // Lấy thông tin tài xế
  async getDriverInfo(driverId: string): Promise<any> {
    try {
      const response = await apiClient.get(
        `${this.baseUrl}/drivers/${driverId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Get driver info error:", error);
      return null;
    }
  }

  // ========== WebSocket ==========

  connectWebSocket(
    driverId: string,
    token: string,
    onIncomingRequest: (request: IncomingRequest) => void,
  ) {
    this.onIncomingRequestCallback = onIncomingRequest;

    this.socket = io(this.wsUrl, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token, driverId }, // Gửi token để Gateway/Service xác thực
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("✅ WebSocket connected");
      this.socket?.emit("driver:register", { driverId });
    });

    this.socket.on("driver:incoming-request", (data: IncomingRequest) => {
      console.log("📱 Incoming request:", data);
      this.onIncomingRequestCallback?.(data);
    });

    this.socket.on("driver:ride-assigned", (data) => {
      console.log("✅ Ride assigned:", data);
    });

    this.socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    this.socket.on("disconnect", () => {
      console.log("🔌 WebSocket disconnected");
    });

    return this.socket;
  }

  disconnectWebSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  updateLocation(driverId: string, location: { lat: number; lng: number }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("driver:location-update", {
        driverId,
        location,
        timestamp: new Date().toISOString(),
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const driverService = new DriverService();
