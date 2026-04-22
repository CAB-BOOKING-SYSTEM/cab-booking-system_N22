import { io, type Socket } from "socket.io-client";
import { DriverLocationUpdate, RideStatusUpdate, RideStatus } from "../types/ride.types";

const DEFAULT_RIDE_GATEWAY_URL = "http://localhost:3000"; // Adjust to Gateway port

export type DriverLocationCallback = (update: DriverLocationUpdate) => void;
export type RideStatusCallback = (update: RideStatusUpdate) => void;

export class RideSocketClient {
  private socket: Socket | null = null;
  private locationListeners: DriverLocationCallback[] = [];
  private statusListeners: RideStatusCallback[] = [];

  connect(url: string = DEFAULT_RIDE_GATEWAY_URL, token?: string): void {
    if (this.socket?.connected) return;

    this.socket = io(url, {
      transports: ["websocket"],
      auth: token ? { token } : undefined,
    });

    this.socket.on("connect", () => {
      console.log("[RideSocketClient] Connected", this.socket?.id);
    });

    this.socket.on("driver_location_updated", (payload: DriverLocationUpdate) => {
      this.locationListeners.forEach(cb => cb(payload));
    });

    this.socket.on("ride_status_updated", (payload: RideStatusUpdate) => {
      this.statusListeners.forEach(cb => cb(payload));
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[RideSocketClient] Disconnected", reason);
    });
  }

  joinRide(rideId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("join_ride", { rideId });
    }
  }

  onDriverLocation(callback: DriverLocationCallback): () => void {
    this.locationListeners.push(callback);
    return () => {
      this.locationListeners = this.locationListeners.filter(cb => cb !== callback);
    };
  }

  onRideStatus(callback: RideStatusCallback): () => void {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.locationListeners = [];
    this.statusListeners = [];
  }
}

export const rideSocketClient = new RideSocketClient();
