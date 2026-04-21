/**
 * @file NotificationSocketClient.ts
 * @description Client Socket.IO dùng chung cho Web (Admin) và Mobile (Customer/Driver).
 *
 * Luồng hoạt động:
 *  1. Gọi connect(url, token) → mở kết nối tới Notification Service (port 3004)
 *  2. Gọi register(userId)    → server lưu ánh xạ userId ↔ socketId
 *  3. Gọi onNotification(cb)  → lắng nghe sự kiện "new_notification"
 *  4. Gọi disconnect()        → đóng kết nối sạch sẽ
 */

import { io, type Socket } from "socket.io-client";
import type { Notification } from "@cab-booking/shared-types";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Socket event name mà server emit khi có thông báo mới */
export const NOTIFICATION_EVENT = "new_notification" as const;

/** URL mặc định tới Notification Service */
const DEFAULT_NOTIFICATION_URL = "http://localhost:3004";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationCallback = (notification: Notification) => void;

export interface NotificationSocketClientOptions {
  /** URL của Notification Service, mặc định http://localhost:3004 */
  url?: string;
  /** JWT access token để xác thực kết nối */
  token?: string;
}

// ─── Class ────────────────────────────────────────────────────────────────────

/**
 * Client quản lý kết nối Socket.IO tới Notification Service.
 *
 * @example
 * ```ts
 * const client = new NotificationSocketClient();
 * client.connect({ url: "http://localhost:3004", token: accessToken });
 * client.register("user-123");
 * client.onNotification((n) => console.log(n));
 * // ...khi logout:
 * client.disconnect();
 * ```
 */
export class NotificationSocketClient {
  private socket: Socket | null = null;
  private listeners: NotificationCallback[] = [];

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Mở kết nối Socket.IO tới Notification Service.
   * Nếu đã có kết nối cũ, tự động disconnect trước khi tạo mới.
   */
  connect(options: NotificationSocketClientOptions = {}): void {
    if (this.socket?.connected) {
      this.disconnect();
    }

    this.socket = io(options.url ?? DEFAULT_NOTIFICATION_URL, {
      autoConnect: true,
      transports: ["websocket"],
      auth: options.token ? { token: options.token } : undefined,
    });

    this.socket.on("connect", () => {
      console.log(
        `[NotificationSocketClient] Kết nối thành công — socketId=${this.socket?.id}`,
      );
    });

    this.socket.on("connect_error", (err) => {
      console.error(`[NotificationSocketClient] Lỗi kết nối:`, err.message);
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`[NotificationSocketClient] Ngắt kết nối — reason=${reason}`);
    });

    // Lắng nghe sự kiện "new_notification" từ server
    this.socket.on(NOTIFICATION_EVENT, (payload: Notification) => {
      this.listeners.forEach((cb) => cb(payload));
    });
  }

  /**
   * Gửi sự kiện "register" lên server để liên kết userId với socketId hiện tại.
   * Phải gọi sau khi connect() và sau khi user đã đăng nhập thành công.
   *
   * @param userId - Business ID của user (VD: "cust_556677")
   */
  register(userId: string): void {
    if (!this.socket?.connected) {
      console.warn(
        "[NotificationSocketClient] Chưa có kết nối — bỏ qua register()",
      );
      return;
    }
    this.socket.emit("register", userId);
    console.log(`[NotificationSocketClient] Đã gửi register — userId=${userId}`);
  }

  /**
   * Đăng ký callback được gọi mỗi khi nhận được thông báo mới.
   * Có thể đăng ký nhiều callback.
   *
   * @returns Hàm huỷ đăng ký (unsubscribe)
   */
  onNotification(callback: NotificationCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Đóng kết nối Socket.IO và dọn sạch toàn bộ listeners.
   * Nên gọi khi user logout hoặc component unmount.
   */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners = [];
    console.log("[NotificationSocketClient] Đã disconnect và dọn sạch");
  }

  /** Trả về trạng thái kết nối hiện tại */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
