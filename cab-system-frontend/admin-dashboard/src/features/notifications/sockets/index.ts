/**
 * @file sockets/index.ts
 * @description Re-export NotificationSocketClient từ packages/realtime.
 */

export {
  NotificationSocketClient,
  NOTIFICATION_EVENT,
} from "@cab-booking/realtime";

export type {
  NotificationCallback,
  NotificationSocketClientOptions,
} from "@cab-booking/realtime";
