/**
 * Storage utilities for tokens and user data
 */

import Cookies from 'js-cookie';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

// Cookie options
const cookieOptions = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // Changed from 'strict' to 'lax' for better compatibility
  // Remove domain restriction to use current domain automatically
};

export const storage = {
  // Token management
  setTokens: (accessToken: string, refreshToken: string) => {
    // Store in both localStorage and cookies for reliability
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    
    Cookies.set(TOKEN_KEY, accessToken, {
      ...cookieOptions,
      expires: 7, // 7 days - same as refresh token to prevent premature logout
    });
    
    Cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
      ...cookieOptions,
      expires: 7, // 7 days
    });
  },
  
  getAccessToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY) || Cookies.get(TOKEN_KEY) || null;
    }
    return Cookies.get(TOKEN_KEY) || null;
  },
  
  getRefreshToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY) || Cookies.get(REFRESH_TOKEN_KEY) || null;
    }
    return Cookies.get(REFRESH_TOKEN_KEY) || null;
  },
  
  clearTokens: () => {
    // Clear from both localStorage and cookies
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
  },
  
  // User data management
  setUser: (user: any) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user data:', error);
    }
  },
  
  getUser: (): any | null => {
    try {
      const userData = localStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to load user data:', error);
      return null;
    }
  },
  
  clearUser: () => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  },
  
  // Clear all auth data
  clearAll: () => {
    storage.clearTokens();
    storage.clearUser();
  },
  
  // Session management
  setSessionData: (key: string, value: any) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save session data:', error);
    }
  },
  
  getSessionData: (key: string): any | null => {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load session data:', error);
      return null;
    }
  },
  
  clearSessionData: (key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  },
  
  // Utility functions
  hasValidTokens: (): boolean => {
    return !!(storage.getAccessToken() && storage.getRefreshToken());
  },
  
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  },
};