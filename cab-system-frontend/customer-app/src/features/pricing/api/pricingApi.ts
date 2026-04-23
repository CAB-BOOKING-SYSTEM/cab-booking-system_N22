import { apiClient } from "@cab/api-client";
import type {
  EstimateRequest,
  EstimateResponse,
  PricingConfig,
} from "../types";

const PRICING_SERVICE_URL =
  process.env.EXPO_PUBLIC_PRICING_SERVICE_URL ||
  "http://localhost:3000/api/pricing";

// Lấy danh sách loại xe
export async function getVehicleTypes(): Promise<PricingConfig[]> {
  const response = await apiClient.get(`${PRICING_SERVICE_URL}/pricing`);
  return response.data.data;
}

// Tính giá cho 1 loại xe
export async function calculateEstimate(
  request: EstimateRequest,
): Promise<EstimateResponse> {
  const response = await apiClient.post(
    `${PRICING_SERVICE_URL}/estimate`,
    request,
  );
  return response.data.data;
}

// Lấy ETA
export async function getETA(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
): Promise<{
  eta_minutes: number;
  distance_km: number;
  traffic_level: number;
}> {
  const response = await apiClient.post(`${PRICING_SERVICE_URL}/eta`, {
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
  });
  return response.data.data;
}
