/**
 * @file context/NotificationContext.tsx
 * @description React Context bọc useWebNotification để share state notification
 * cho toàn bộ Admin Dashboard mà không cần prop-drilling.
 *
 * Cách dùng:
 *   1. Bọc <WebNotificationProvider userId={...} accessToken={...}> ở App.tsx
 *   2. Gọi useNotificationContext() ở bất kỳ component nào cần dữ liệu
 */

import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useWebNotification, type UseWebNotificationReturn } from "../hooks";

// ─── Context ─────────────────────────────────────────────────────────────────

const NotificationContext = createContext<UseWebNotificationReturn | null>(null);

// ─── Provider Props ───────────────────────────────────────────────────────────

export interface WebNotificationProviderProps {
  children: ReactNode;
  /** userId của admin đang đăng nhập. Truyền chuỗi rỗng "" khi chưa login. */
  userId: string;
  /** JWT access token để xác thực Socket.IO */
  accessToken: string;
  /** URL Notification Service (tuỳ chọn, mặc định http://localhost:3004) */
  socketUrl?: string;
}

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * Bọc toàn bộ Admin App với Provider này để mọi component đều có thể
 * truy cập notification state qua useNotificationContext().
 *
 * @example
 * ```tsx
 * <WebNotificationProvider userId={user.id} accessToken={token}>
 *   <AppRouter />
 *   <WebNotificationToast />
 * </WebNotificationProvider>
 * ```
 */
export function WebNotificationProvider({
  children,
  userId,
  accessToken,
  socketUrl,
}: WebNotificationProviderProps): React.ReactElement {
  const value = useWebNotification({ userId, accessToken, socketUrl });

  // Memoize để tránh re-render không cần thiết
  const memoValue = useMemo(() => value, [
    value.notifications,
    value.unreadCount,
    value.latestToast,
    value.isLoading,
    value.error,
  ]);

  return (
    <NotificationContext.Provider value={memoValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Consumer Hook ────────────────────────────────────────────────────────────

/**
 * Hook để truy cập notification context.
 * Phải dùng bên trong <WebNotificationProvider>.
 *
 * @throws Error nếu gọi ngoài Provider
 */
export function useNotificationContext(): UseWebNotificationReturn {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "[useNotificationContext] Phải dùng bên trong <WebNotificationProvider>",
    );
  }
  return ctx;
}
