import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { DEFAULT_API_BASE_URL, DEFAULT_API_TIMEOUT_MS } from "./constants";
import type { ApiClientConfig } from "./types";

function applyAuthHeader(
  config: InternalAxiosRequestConfig,
  accessToken: string,
): void {
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
    return;
  }

  // Ensure headers are an AxiosHeaders instance so we can set safely
  const headers = new AxiosHeaders(config.headers as any);
  headers.set("Authorization", `Bearer ${accessToken}`);
  config.headers = headers;
}

function buildApiClient(config: ApiClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL ?? DEFAULT_API_BASE_URL,
    timeout: config.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
  });

  client.interceptors.request.use(async (requestConfig) => {
    const token = await config.accessTokenProvider?.();

    if (token) {
      applyAuthHeader(requestConfig, token);
    }

    return requestConfig;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        await config.onUnauthorized?.(error);
      }

      return Promise.reject(error);
    },
  );

  return client;
}

let currentApiClientConfig: ApiClientConfig = {};

export let apiClient: AxiosInstance = buildApiClient(currentApiClientConfig);

export function createApiClient(config: ApiClientConfig = {}): AxiosInstance {
  return buildApiClient(config);
}

export function setApiClientConfig(config: ApiClientConfig): AxiosInstance {
  currentApiClientConfig = {
    ...currentApiClientConfig,
    ...config,
  };
  apiClient = buildApiClient(currentApiClientConfig);
  return apiClient;
}

// Backward-compatible alias for previous API
export const configureApiClient = setApiClientConfig;
