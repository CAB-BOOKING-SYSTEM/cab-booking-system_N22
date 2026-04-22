export type UserRole = 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

export interface AuthResponse {
  message: string;
  accessToken?: string;
  refreshToken?: string;
  resetToken?: string;
  user?: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  appType?: 'CUSTOMER_APP' | 'DRIVER_APP' | 'ADMIN_APP';
}
