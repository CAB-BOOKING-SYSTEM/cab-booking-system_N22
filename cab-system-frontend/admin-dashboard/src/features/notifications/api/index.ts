/**
 * @file api/index.ts
 * @description Re-export các hàm Notification API từ packages/api-client.
 */

export {
  getHistory,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  setNotificationAuthToken,
} from "@cab-booking/api-client";

export type {
  GetHistoryParams,
  GetHistoryResult,
} from "@cab-booking/api-client";
