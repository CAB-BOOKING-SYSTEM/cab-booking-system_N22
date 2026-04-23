import { AxiosError } from 'axios';
import { authHttp } from '../../../utils/http';
import { AuthResponse, LoginPayload, RegisterPayload } from '../types';

const readError = (error: unknown, fallback: string): Error => {
  const axiosError = error as AxiosError<{ message?: string }>;
  const message = axiosError?.response?.data?.message || fallback;
  return new Error(message);
};

export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
  try {
    const { data } = await authHttp.post<AuthResponse>('/register', {
      ...payload,
      role: 'customer',
    });
    return data;
  } catch (error) {
    throw readError(error, 'Dang ky that bai');
  }
};

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  try {
    const { data } = await authHttp.post<AuthResponse>('/login', {
      ...payload,
      appType: payload.appType || 'CUSTOMER_APP',
    });
    return data;
  } catch (error) {
    throw readError(error, 'Dang nhap that bai');
  }
};

export const refreshToken = async (refreshToken?: string): Promise<AuthResponse> => {
  try {
    const { data } = await authHttp.post<AuthResponse>('/refresh', refreshToken ? { refreshToken } : {});
    return data;
  } catch (error) {
    throw readError(error, 'Lam moi token that bai');
  }
};

export const logout = async (params: { accessToken?: string; refreshToken?: string } = {}): Promise<AuthResponse> => {
  try {
    const { data } = await authHttp.post<AuthResponse>('/logout',
      params.refreshToken ? { refreshToken: params.refreshToken } : {},
      {
        headers: params.accessToken
          ? { Authorization: `Bearer ${params.accessToken}` }
          : undefined,
      }
    );
    return data;
  } catch (error) {
    throw readError(error, 'Dang xuat that bai');
  }
};

export const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
  try {
    const { data } = await authHttp.post<AuthResponse>('/forgot-password', { email });
    return data;
  } catch (error) {
    throw readError(error, 'Khong the tao reset token');
  }
};

export const resetPassword = async (token: string, newPassword: string): Promise<AuthResponse> => {
  try {
    const { data } = await authHttp.post<AuthResponse>('/reset-password', { token, newPassword });
    return data;
  } catch (error) {
    throw readError(error, 'Dat lai mat khau that bai');
  }
};
