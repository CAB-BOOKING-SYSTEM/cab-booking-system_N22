/**
 * @file hooks/useWebNotification.ts
 * @description Hook quản lý toàn bộ notification state cho Admin Web.
 *
 * Tích hợp:
 *  - packages/realtime  → NotificationSocketClient (real-time push)
 *  - packages/api-client → REST calls (history, unread count, mark read)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationSocketClient } from "../sockets";
import {
  getHistory,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../api";
import type { Notification } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseWebNotificationOptions {
  userId: string;
  accessToken: string;
  /** URL Notification Service, mặc định http://localhost:3004 */
  socketUrl?: string;
}

export interface UseWebNotificationReturn {
  /** Danh sách thông báo đã tải */
  notifications: Notification[];
  /** Số lượng thông báo chưa đọc (badge count) */
  unreadCount: number;
  /** Thông báo mới nhất nhận qua socket (dùng cho Toast) */
  latestToast: Notification | null;
  /** Đang tải dữ liệu ban đầu */
  isLoading: boolean;
  /** Thông báo lỗi (nếu có) */
  error: string | null;
  /** Đánh dấu 1 thông báo là đã đọc */
  handleMarkAsRead: (notificationId: string) => Promise<void>;
  /** Đánh dấu tất cả là đã đọc */
  handleMarkAllAsRead: () => Promise<void>;
  /** Xoá toast hiện tại */
  dismissToast: () => void;
  /** Kết nối socket thủ công (thường gọi sau khi login) */
  connectSocket: (userId: string, token: string) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebNotification({
  userId: initialUserId,
  accessToken: initialToken,
  socketUrl,
}: UseWebNotificationOptions): UseWebNotificationReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestToast, setLatestToast] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State nội bộ để track user hiện tại
  const [currentUserId, setCurrentUserId] = useState(initialUserId);
  const [currentToken, setCurrentToken] = useState(initialToken);

  const clientRef = useRef<NotificationSocketClient | null>(null);

  // ── Hàm kết nối ──────────────────────────────────────────────────────────
  const connectSocket = useCallback((uid: string, token: string) => {
    setCurrentUserId(uid);
    setCurrentToken(token);
  }, []);

  // ── Tải dữ liệu ban đầu ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    const bootstrap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [historyResult, count] = await Promise.all([
          getHistory(currentUserId, { page: 1, limit: 20 }),
          getUnreadCount(currentUserId),
        ]);

        if (!cancelled) {
          setNotifications(historyResult.notifications);
          setUnreadCount(count);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Không thể tải thông báo. Vui lòng thử lại.");
          console.error("[useWebNotification] bootstrap error:", err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    bootstrap();
    return () => { cancelled = true; };
  }, [currentUserId]);

  // ── Kết nối Socket.IO ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId || !currentToken) return;

    const client = new NotificationSocketClient();
    clientRef.current = client;

    client.connect({ url: socketUrl, token: currentToken });
    client.register(currentUserId);

    const unsubscribe = client.onNotification((notification) => {
      // Prepend thông báo mới lên đầu danh sách
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      setLatestToast(notification);
    });

    return () => {
      unsubscribe();
      client.disconnect();
      clientRef.current = null;
    };
  }, [currentUserId, currentToken, socketUrl]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markAsRead(notificationId, currentUserId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("[useWebNotification] markAsRead error:", err);
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
      console.error("[useWebNotification] markAllAsRead error:", err);
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
