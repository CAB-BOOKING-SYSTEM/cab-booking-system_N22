import { io, type Socket } from "socket.io-client";

export interface CreateRealtimeClientOptions {
  url?: string;
  token?: string;
}

export function createRealtimeClient(
  options: CreateRealtimeClientOptions = {},
): Socket {
  return io(options.url ?? "http://localhost:3000", {
    autoConnect: false,
    transports: ["websocket"],
    auth: options.token ? { token: options.token } : undefined,
  });
}
