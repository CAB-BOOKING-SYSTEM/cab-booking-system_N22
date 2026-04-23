import { apiClient } from "@cab-booking/api-client";

export interface ReviewPayload {
  bookingId: string;
  rating: number; // 1-5
  comment: string;
  tags: string[];
}

export const reviewService = {
  submitReview: async (data: ReviewPayload) => {
    // Gọi đến API backend theo yêu cầu cấu trúc chung của team
    const response = await apiClient.post("/api/v1/reviews", data);
    return response.data;
  },
};
