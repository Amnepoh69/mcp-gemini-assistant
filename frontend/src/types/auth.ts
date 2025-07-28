/**
 * Authentication types for frontend
 */

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  company?: string;
  phone?: string;
  status: UserStatus;
  auth_provider: AuthProvider;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_onboarded: boolean;
}

export enum UserRole {
  ADMIN = 'admin',
  CFO = 'cfo',
  CTO = 'cto',
  ANALYST = 'analyst',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  LINKEDIN = 'linkedin',
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  company?: string;
  phone?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirm {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface OnboardingData {
  company: string;
  role: UserRole;
  phone?: string;
  data_sources: string[];
  notifications_enabled: boolean;
}

export interface SSOAuthRequest {
  provider: AuthProvider;
  code: string;
  redirect_uri: string;
  state?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    message: string;
    code: number;
    type: string;
    correlation_id: string;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface AuthStore extends AuthState {
  init: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateUser: (user: User) => void;
  clearError: () => void;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  loginWithSSO: (provider: AuthProvider, code: string, redirectUri: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearAllAuthData: () => void;
}