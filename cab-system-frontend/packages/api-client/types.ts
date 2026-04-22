import type { AxiosError } from "axios";

export type AccessTokenProvider = () =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>;

export type UnauthorizedErrorHandler = (
  error: AxiosError,
) => void | Promise<void>;

export interface ApiClientConfig {
  baseURL?: string;
  timeoutMs?: number;
  accessTokenProvider?: AccessTokenProvider;
  onUnauthorized?: UnauthorizedErrorHandler;
}
