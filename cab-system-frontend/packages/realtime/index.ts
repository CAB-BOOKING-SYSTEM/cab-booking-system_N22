export interface CreateRealtimeClientOptions {
  url?: string;
  token?: string;
}

export interface RealtimeClient {
  connected: boolean;
  disconnect: () => void;
  emit: (_event: string, _payload?: unknown) => void;
  on: (_event: string, _listener: (...args: unknown[]) => void) => void;
}

export function createRealtimeClient(
  options: CreateRealtimeClientOptions = {},
): RealtimeClient {
  void options;

  return {
    connected: false,
    disconnect: () => undefined,
    emit: () => undefined,
    on: () => undefined,
  };
}

// ─── Notifications ────────────────────────────────────────────────────────────
export {
  NotificationSocketClient,
  NOTIFICATION_EVENT,
} from "./notifications/NotificationSocketClient";
export type {
  NotificationCallback,
  NotificationSocketClientOptions,
} from "./notifications/NotificationSocketClient";
