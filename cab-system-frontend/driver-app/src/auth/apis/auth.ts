import axios, { AxiosError } from 'axios';

const AUTH_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000') + '/auth';

export interface DriverAuthResponse {
  message: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: number;
    email: string;
    role: 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';
  };
}

const authHttp = axios.create({
  baseURL: AUTH_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const readError = (error: unknown, fallback: string): Error => {
  const axiosError = error as AxiosError<{ message?: string }>;
  const message = axiosError?.response?.data?.message || fallback;
  return new Error(message);
};

export const login = async (email: string, password: string): Promise<DriverAuthResponse> => {
  try {
    const { data } = await authHttp.post<DriverAuthResponse>('/login', {
      email,
      password,
      appType: 'DRIVER_APP',
    });
    return data;
  } catch (error) {
    throw readError(error, 'Đăng nhập thất bại');
  }
};

export const registerDriver = async (email: string, password: string): Promise<DriverAuthResponse> => {
  try {
    const { data } = await authHttp.post<DriverAuthResponse>('/register', {
      email,
      password,
      role: 'DRIVER',
    });
    return data;
  } catch (error) {
    throw readError(error, 'Đăng ký thất bại');
  }
};
