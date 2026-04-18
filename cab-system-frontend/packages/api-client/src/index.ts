import axios, { type AxiosInstance } from "axios";

export interface CreateApiClientOptions {
  baseURL?: string;
  getAccessToken?: () => string | undefined;
}

export function createApiClient(
  options: CreateApiClientOptions = {},
): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL ?? "http://localhost:3000/api",
    timeout: 15_000,
  });

  client.interceptors.request.use((config) => {
    const accessToken = options.getAccessToken?.();

    if (accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
      };
    }

    return config;
  });

  return client;
}

export const apiClient = createApiClient();
