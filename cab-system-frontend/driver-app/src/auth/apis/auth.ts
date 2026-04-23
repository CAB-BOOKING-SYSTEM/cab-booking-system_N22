import axios, { AxiosError } from 'axios';

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

const readError = (error: unknown, fallback: string): Error => {
  const axiosError = error as AxiosError<{ message?: string }>;
  const message = axiosError?.response?.data?.message || fallback;
  return new Error(message);
};

const API_BASE_URL = 'http://localhost:3000/auth';

export const registerDriver = async (email: string, password: string): Promise<DriverAuthResponse> => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/register`, {
      email,
      password,
      role: 'driver',
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    return data;
  } catch (error) {
    throw readError(error, 'Dang ky that bai');
  }
};

export const login = async (email: string, password: string): Promise<DriverAuthResponse> => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/login`, {
      email,
      password,
      appType: 'DRIVER_APP',
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    return data;
  } catch (error) {
    throw readError(error, 'Dang nhap that bai');
  }
};

export const refreshToken = async (refreshToken?: string): Promise<DriverAuthResponse> => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/refresh`, refreshToken ? { refreshToken } : {}, {
      headers: { 'Content-Type': 'application/json' }
    });
    return data;
  } catch (error) {
    throw readError(error, 'Lam moi token that bai');
  }
};

export const logout = async (params: { accessToken?: string; refreshToken?: string } = {}): Promise<DriverAuthResponse> => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/logout`,
      params.refreshToken ? { refreshToken: params.refreshToken } : {},
      {
        headers: {
          'Content-Type': 'application/json',
          ...(params.accessToken ? { Authorization: `Bearer ${params.accessToken}` } : {})
        },
      }
    );
    return data;
  } catch (error) {
    throw readError(error, 'Dang xuat that bai');
  }
};