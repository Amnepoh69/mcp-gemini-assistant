/**
 * Authentication store using Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { toast } from 'react-hot-toast';
import { 
  AuthStore, 
  AuthState, 
  LoginCredentials, 
  RegisterData, 
  User, 
  AuthProvider,
  OnboardingData
} from '@/types/auth';
import { authApi } from '@/lib/api';
import { storage } from '@/lib/storage';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  accessToken: null,
  refreshToken: null,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Initialize auth state from storage
        init: async () => {
          // Only run on client side
          if (typeof window === 'undefined') {
            return;
          }
          
          set({ isLoading: true });
          
          try {
            // First check if we have persisted state
            const persistedData = localStorage.getItem('auth-storage');
            if (persistedData) {
              try {
                const parsedState = JSON.parse(persistedData);
                console.log('Found persisted auth state:', parsedState);
                
                // If we have persisted tokens, use them
                if (parsedState.accessToken && parsedState.refreshToken) {
                  set({
                    user: parsedState.user,
                    isAuthenticated: parsedState.isAuthenticated,
                    accessToken: parsedState.accessToken,
                    refreshToken: parsedState.refreshToken,
                    isLoading: false,
                  });
                  return;
                }
              } catch (error) {
                console.error('Failed to parse persisted auth state:', error);
              }
            }
            
            // Fallback to storage service
            const accessToken = storage.getAccessToken();
            const refreshToken = storage.getRefreshToken();
            const user = storage.getUser();
            
            if (accessToken && refreshToken && user) {
              // Verify token is still valid
              try {
                const response = await authApi.me();
                set({
                  user: response.data,
                  isAuthenticated: true,
                  accessToken,
                  refreshToken,
                  isLoading: false,
                });
              } catch (error) {
                // Token invalid, clear auth state
                storage.clearAll();
                set({
                  ...initialState,
                  isLoading: false,
                });
              }
            } else {
              // No stored auth data
              storage.clearAll();
              set({
                ...initialState,
                isLoading: false,
              });
            }
          } catch (error) {
            console.error('Auth initialization error:', error);
            set({
              ...initialState,
              isLoading: false,
            });
          }
        },
        
        // Login with email and password
        login: async (credentials: LoginCredentials) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authApi.login(credentials);
            const { access_token, refresh_token, user } = response.data;
            
            // Store tokens and user data
            storage.setTokens(access_token, refresh_token);
            storage.setUser(user);
            
            console.log('Login successful, setting auth state:', {
              user: user?.email,
              accessToken: access_token?.substring(0, 20) + '...',
              refreshToken: refresh_token?.substring(0, 20) + '...',
            });
            
            set({
              user,
              isAuthenticated: true,
              accessToken: access_token,
              refreshToken: refresh_token,
              isLoading: false,
              error: null,
            });
            
            toast.success('Login successful!');
            
            // Wait a moment for persist middleware to save state
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Debug: Check if state was persisted
            console.log('After login, persisted state:', localStorage.getItem('auth-storage'));
            
            // Redirect to credits page
            if (typeof window !== 'undefined') {
              window.location.href = '/credits';
            }
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Login failed';
            set({ 
              isLoading: false, 
              error: errorMessage,
              isAuthenticated: false,
              user: null,
              accessToken: null,
              refreshToken: null,
            });
            throw error;
          }
        },
        
        // Register new user
        register: async (data: RegisterData) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authApi.register(data);
            const { access_token, refresh_token, user } = response.data;
            
            // Store tokens and user data
            storage.setTokens(access_token, refresh_token);
            storage.setUser(user);
            
            set({
              user,
              isAuthenticated: true,
              accessToken: access_token,
              refreshToken: refresh_token,
              isLoading: false,
              error: null,
            });
            
            toast.success('Registration successful!');
            
            // Wait a moment for persist middleware to save state
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Redirect to credits page
            if (typeof window !== 'undefined') {
              window.location.href = '/credits';
            }
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Registration failed';
            set({ 
              isLoading: false, 
              error: errorMessage,
              isAuthenticated: false,
              user: null,
              accessToken: null,
              refreshToken: null,
            });
            throw error;
          }
        },
        
        // Logout user
        logout: async () => {
          const { refreshToken } = get();
          
          try {
            if (refreshToken) {
              await authApi.logout({ refresh_token: refreshToken });
            }
          } catch (error) {
            console.error('Logout API call failed:', error);
          }
          
          // Clear storage and state
          storage.clearAll();
          set({
            ...initialState,
          });
          
          toast.success('Logged out successfully');
          
          // Redirect to auth page
          if (typeof window !== 'undefined') {
            window.location.href = '/auth';
          }
        },
        
        // Refresh auth tokens
        refreshAuth: async () => {
          const { refreshToken } = get();
          
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          
          try {
            const response = await authApi.refresh({ refresh_token: refreshToken });
            const { access_token, refresh_token: newRefreshToken, user } = response.data;
            
            // Store new tokens and user data
            storage.setTokens(access_token, newRefreshToken);
            storage.setUser(user);
            
            set({
              user,
              accessToken: access_token,
              refreshToken: newRefreshToken,
              isAuthenticated: true,
            });
          } catch (error) {
            // Refresh failed, logout user
            get().logout();
            throw error;
          }
        },
        
        // Update user data
        updateUser: (user: User) => {
          storage.setUser(user);
          set({ user });
        },
        
        // Clear error state
        clearError: () => {
          set({ error: null });
        },
        
        // Complete onboarding
        completeOnboarding: async (data: OnboardingData) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authApi.onboard(data);
            const updatedUser = response.data;
            
            storage.setUser(updatedUser);
            set({
              user: updatedUser,
              isLoading: false,
              error: null,
            });
            
            toast.success('Onboarding completed successfully!');
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Onboarding failed';
            set({ 
              isLoading: false, 
              error: errorMessage,
            });
            throw error;
          }
        },
        
        // Login with SSO
        loginWithSSO: async (provider: AuthProvider, code: string, redirectUri: string) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authApi.ssoCallback({
              provider,
              code,
              redirect_uri: redirectUri,
            });
            
            const { access_token, refresh_token, user } = response.data;
            
            // Store tokens and user data
            storage.setTokens(access_token, refresh_token);
            storage.setUser(user);
            
            set({
              user,
              isAuthenticated: true,
              accessToken: access_token,
              refreshToken: refresh_token,
              isLoading: false,
              error: null,
            });
            
            toast.success('SSO login successful!');
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'SSO login failed';
            set({ 
              isLoading: false, 
              error: errorMessage,
              isAuthenticated: false,
              user: null,
              accessToken: null,
              refreshToken: null,
            });
            throw error;
          }
        },
        
        // Request password reset
        resetPassword: async (email: string) => {
          set({ isLoading: true, error: null });
          
          try {
            await authApi.resetPassword({ email });
            set({ isLoading: false, error: null });
            toast.success('Password reset email sent!');
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Password reset failed';
            set({ 
              isLoading: false, 
              error: errorMessage,
            });
            throw error;
          }
        },
        
        // Confirm password reset
        confirmResetPassword: async (token: string, newPassword: string) => {
          set({ isLoading: true, error: null });
          
          try {
            await authApi.confirmResetPassword({ token, new_password: newPassword });
            set({ isLoading: false, error: null });
            toast.success('Password reset successful!');
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Password reset failed';
            set({ 
              isLoading: false, 
              error: errorMessage,
            });
            throw error;
          }
        },
        
        // Change password
        changePassword: async (currentPassword: string, newPassword: string) => {
          set({ isLoading: true, error: null });
          
          try {
            await authApi.changePassword({
              current_password: currentPassword,
              new_password: newPassword,
            });
            set({ isLoading: false, error: null });
            toast.success('Password changed successfully!');
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Password change failed';
            set({ 
              isLoading: false, 
              error: errorMessage,
            });
            throw error;
          }
        },

        // Debug function to clear all auth data
        clearAllAuthData: () => {
          storage.clearAll();
          set({
            ...initialState,
          });
          toast.success('All auth data cleared');
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        }),
        skipHydration: true,
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Note: Auth store is now initialized through AuthProvider to avoid hydration issues