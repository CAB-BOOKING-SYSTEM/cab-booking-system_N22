import { AxiosError } from 'axios';
import { authHttp } from '../../utils/http';

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

export const registerDriver = async (email: string, password: string): Promise<DriverAuthResponse> => {
  try {
    const { data } = await authHttp.post<DriverAuthResponse>('/register', {
      email,
      password,
      role: 'DRIVER', // ✅ viết hoa
    });
    return data;
  } catch (error) {
    throw readError(error, 'Dang ky that bai');
  }
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
    throw readError(error, 'Dang nhap that bai');
  }
};

export const refreshToken = async (refreshToken?: string): Promise<DriverAuthResponse> => {
  try {
    const { data } = await authHttp.post<DriverAuthResponse>('/refresh', refreshToken ? { refreshToken } : {});
    return data;
  } catch (error) {
    throw readError(error, 'Lam moi token that bai');
  }
};

export const logout = async (params: { accessToken?: string; refreshToken?: string } = {}): Promise<DriverAuthResponse> => {
  try {
    const { data } = await authHttp.post<DriverAuthResponse>(
      '/logout',
      params.refreshToken ? { refreshToken: params.refreshToken } : {},
      {
        headers: params.accessToken ? { Authorization: `Bearer ${params.accessToken}` } : undefined,
      }
    );
    return data;
  } catch (error) {
    throw readError(error, 'Dang xuat that bai');
  }
};
