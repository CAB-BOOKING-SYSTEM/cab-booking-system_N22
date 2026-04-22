import { apiClient } from "@cab/api-client";

export interface FindDriverRequest {
  rideId: string;
  userId: string;
  pickupLat: number;
  pickupLng: number;
  vehicleType?: "4_seat" | "7_seat" | "luxury";
}

export interface MatchResult {
  rideId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  distanceKm: number;
  vehicleType: string;
  vehiclePlate: string;
  driverRating: number;
  estimatedArrivalSec: number;
  usedFallback: boolean;
  aiScore?: number;
  matchedAt: string;
}

class MatchingService {
    // @ts-ignore
  private baseUrl = process.env.EXPO_PUBLIC_MATCHING_URL || "http://localhost:3010";

  async findDriver(request: FindDriverRequest): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/api/matching/find-driver`, request);
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || "Lỗi kết nối" };
    }
  }
}

export const matchingService = new MatchingService();