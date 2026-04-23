/**
 * @file hooks/useMobileNotification.ts
 * @description Hook quản lý notification state cho Mobile (Driver App).
 */

import { useCallback, useEffect, useState } from "react";
import {
  getHistory,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  setNotificationAuthToken,
} from "@cab/api-client";
import type { Notification } from "@cab/shared-types";

export interface UseMobileNotificationOptions {
  userId: string;
  accessToken: string;
  socketUrl?: string;
}

export interface UseMobileNotificationReturn {
  notifications: Notification[];
  unreadCount: number;
  latestToast: Notification | null;
  isLoading: boolean;
  error: string | null;
  handleMarkAsRead: (notificationId: string) => Promise<void>;
  handleMarkAllAsRead: () => Promise<void>;
  dismissToast: () => void;
  /** Kết nối socket thủ công (thường gọi sau khi login) */
  connectSocket: (userId: string, token: string) => void;
}

export function useMobileNotification({
  userId: initialUserId,
  accessToken: initialToken,
  socketUrl,
}: UseMobileNotificationOptions): UseMobileNotificationReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestToast, setLatestToast] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState(initialUserId);
  const [currentToken, setCurrentToken] = useState(initialToken);

  const connectSocket = useCallback((uid: string, token: string) => {
    setCurrentUserId(uid);
    setCurrentToken(token);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [result, count] = await Promise.all([
          getHistory(currentUserId, { page: 1, limit: 20 }),
          getUnreadCount(currentUserId),
        ]);
        if (!cancelled) {
          setNotifications(result.notifications);
          setUnreadCount(count);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Không thể tải thông báo.");
          console.error("[useMobileNotification/driver] bootstrap:", err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentToken) return;
    setNotificationAuthToken(currentToken);
  }, [currentToken]);

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markAsRead(notificationId, currentUserId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
          ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error("[useMobileNotification/driver] markAsRead:", err);
      }
    },
    [currentUserId],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead(currentUserId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("[useMobileNotification/driver] markAllAsRead:", err);
    }
  }, [currentUserId]);

  const dismissToast = useCallback(() => setLatestToast(null), []);

  return {
    notifications,
    unreadCount,
    latestToast,
    isLoading,
    error,
    handleMarkAsRead,
    handleMarkAllAsRead,
    dismissToast,
    connectSocket,
  };
}
