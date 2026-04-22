export {
  apiClient,
  configureApiClient,
  createApiClient,
  setApiClientConfig,
} from "./api-client";
export { DEFAULT_API_BASE_URL, DEFAULT_API_TIMEOUT_MS } from "./constants";
export type {
  AccessTokenProvider,
  ApiClientConfig,
  UnauthorizedErrorHandler,
} from "./types";

// ─── Notification Service ─────────────────────────────────────────────────────
export {
  notificationAxios,
  setNotificationAuthToken,
  getHistory,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "./services/notificationService";
export type {
  GetHistoryParams,
  GetHistoryResult,
  UnreadCountResult,
} from "./services/notificationService";
