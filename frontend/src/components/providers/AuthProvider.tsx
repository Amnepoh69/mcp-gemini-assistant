/**
 * Auth provider component to handle client-side initialization
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { init, isAuthenticated, refreshToken, refreshAuth } = useAuthStore();

  useEffect(() => {
    // Initialize auth store on client side only
    const initializeAuth = async () => {
      try {
        await init();
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [init]);

  useEffect(() => {
    // Проверяем и обновляем токен каждые 4 часа (половина от 8 часов)
    if (isAuthenticated && refreshToken) {
      const tokenRefreshInterval = setInterval(async () => {
        try {
          console.log('Auto-refreshing token...');
          await refreshAuth();
        } catch (error) {
          console.error('Auto token refresh failed:', error);
        }
      }, 4 * 60 * 60 * 1000); // 4 часа
      
      return () => clearInterval(tokenRefreshInterval);
    }
  }, [isAuthenticated, refreshToken, refreshAuth]);

  // Show loading until auth is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};