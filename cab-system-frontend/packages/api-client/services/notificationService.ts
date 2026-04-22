/**
 * @file notificationService.ts
 * @description Các hàm Axios gọi về Notification Service (port 3004).
 *
 * Route map (khớp với notification.routes.js backend):
 *   GET   /notifications/:userId              → getHistory()
 *   GET   /notifications/:userId/unread-count → getUnreadCount()
 *   PATCH /notifications/:notificationId/read → markAsRead()
 *   PATCH /notifications/:userId/read-all     → markAllAsRead()
 */

import axios, { type AxiosInstance } from "axios";
import type { Notification, ApiResponse } from "@cab-booking/shared-types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GetHistoryParams {
  page?: number;
  limit?: number;
}

export interface GetHistoryResult {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface UnreadCountResult {
  count: number;
}

// ─── Base client ──────────────────────────────────────────────────────────────

const NOTIFICATION_BASE_URL =
  process.env.NOTIFICATION_SERVICE_URL ?? "http://localhost:3004";

/**
 * Axios instance riêng trỏ tới Notification Service.
 * Tách biệt với apiClient chính (port 3000) để không bị interceptor auth chung ghi đè.
 */
export const notificationAxios: AxiosInstance = axios.create({
  baseURL: `${NOTIFICATION_BASE_URL}/notifications`,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Gắn Bearer token vào mọi request của notificationAxios.
 * Gọi hàm này sau khi user đăng nhập thành công.
 *
 * @param token - JWT access token
 */
export function setNotificationAuthToken(token: string): void {
  notificationAxios.defaults.headers.common["Authorization"] =
    `Bearer ${token}`;
}

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * Lấy danh sách thông báo của user (có phân trang).
 *
 * @param userId - Business ID của user
 * @param params - { page, limit }
 */
export async function getHistory(
  userId: string,
  params: GetHistoryParams = {},
): Promise<GetHistoryResult> {
  const { data } = await notificationAxios.get<
    ApiResponse<GetHistoryResult>
  >(`/${userId}`, { params });
  return data.data;
}

/**
 * Lấy số lượng thông báo chưa đọc — dùng để render badge count.
 *
 * @param userId - Business ID của user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { data } = await notificationAxios.get<
    ApiResponse<UnreadCountResult>
  >(`/${userId}/unread-count`);
  return data.data.count;
}

/**
 * Đánh dấu một thông báo cụ thể là đã đọc.
 *
 * @param notificationId - ID của thông báo cần đánh dấu
 * @param userId         - Business ID của user (bắt buộc để backend validate quyền)
 */
export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  await notificationAxios.patch(`/${notificationId}/read`, { userId });
}

/**
 * Đánh dấu toàn bộ thông báo chưa đọc của user là đã đọc.
 *
 * @param userId - Business ID của user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await notificationAxios.patch(`/${userId}/read-all`);
}
