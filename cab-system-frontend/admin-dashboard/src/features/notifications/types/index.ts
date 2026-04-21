/**
 * @file types/index.ts
 * @description Re-export shared Notification types và bổ sung types chỉ dùng ở Web.
 */

export type {
  Notification,
  NotificationType,
} from "@cab-booking/shared-types";

// ─── Web-specific types ───────────────────────────────────────────────────────

/** Trạng thái của WebNotificationToast */
export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export interface ToastOptions {
  duration?: number; // ms, mặc định 4000
  position?: ToastPosition;
}
