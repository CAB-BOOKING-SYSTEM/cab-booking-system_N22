/**
 * @file MobileNotificationContext.tsx
 * @description React Context bọc useMobileNotification cho Customer App.
 *
 * Dùng trong NavigationContainer hoặc SafeAreaProvider để Toast
 * có thể hiển thị đè lên toàn bộ navigation stack.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useMobileNotification } from "../hooks";
import type { UseMobileNotificationReturn } from "../hooks";

// ─── Context ─────────────────────────────────────────────────────────────────

const MobileNotificationContext =
  createContext<UseMobileNotificationReturn | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export interface MobileNotificationProviderProps {
  children: ReactNode;
  /** userId của customer đang đăng nhập. Truyền "" khi chưa login. */
  userId: string;
  /** JWT access token */
  accessToken: string;
  socketUrl?: string;
}

export function MobileNotificationProvider({
  children,
  userId,
  accessToken,
  socketUrl,
}: MobileNotificationProviderProps): React.ReactElement {
  const value = useMobileNotification({ userId, accessToken, socketUrl });

  const memoValue = useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value.notifications, value.unreadCount, value.latestToast, value.isLoading, value.error],
  );

  return (
    <MobileNotificationContext.Provider value={memoValue}>
      {children}
    </MobileNotificationContext.Provider>
  );
}

// ─── Consumer Hook ────────────────────────────────────────────────────────────

export function useMobileNotificationContext(): UseMobileNotificationReturn {
  const ctx = useContext(MobileNotificationContext);
  if (!ctx) {
    throw new Error(
      "[useMobileNotificationContext] Phải dùng bên trong <MobileNotificationProvider>",
    );
  }
  return ctx;
}
