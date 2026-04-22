// ============================================================
// Notifications Feature — Public API (Admin Web)
// ============================================================

// Types
export type { Notification, NotificationType, ToastPosition, ToastOptions } from "./types";

// API
export {
  getHistory,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  setNotificationAuthToken,
} from "./api";
export type { GetHistoryParams, GetHistoryResult } from "./api";

// Socket
export { NotificationSocketClient, NOTIFICATION_EVENT } from "./sockets";
export type { NotificationCallback, NotificationSocketClientOptions } from "./sockets";

// Hooks
export { useWebNotification } from "./hooks";
export type { UseWebNotificationOptions, UseWebNotificationReturn } from "./hooks";

// Context / Provider
export { WebNotificationProvider, useNotificationContext } from "./context";
export type { WebNotificationProviderProps } from "./context";

// Components
export { WebNotificationBadge, WebNotificationToast, WebNotificationList } from "./components";
export type {
  WebNotificationBadgeProps,
  WebNotificationToastProps,
  WebNotificationListProps,
} from "./components";
