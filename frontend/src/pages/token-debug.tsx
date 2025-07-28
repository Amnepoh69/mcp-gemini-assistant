/**
 * Token debugging page
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { storage } from '@/lib/storage';

export default function TokenDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const { user, isAuthenticated, accessToken, refreshToken, login, logout } = useAuthStore();

  useEffect(() => {
    checkAllTokens();
  }, []);

  const checkAllTokens = () => {
    const info = {
      zustandStore: {
        isAuthenticated,
        user: user?.email || 'null',
        accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : 'null',
        refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'null',
      },
      localStorage: {
        access_token: localStorage.getItem('access_token') ? `${localStorage.getItem('access_token')?.substring(0, 20)}...` : 'null',
        refresh_token: localStorage.getItem('refresh_token') ? `${localStorage.getItem('refresh_token')?.substring(0, 20)}...` : 'null',
        user_data: localStorage.getItem('user_data') ? 'present' : 'null',
      },
      cookies: {
        access_token: document.cookie.includes('access_token=') ? 'present' : 'null',
        refresh_token: document.cookie.includes('refresh_token=') ? 'present' : 'null',
      },
      storageService: {
        access_token: storage.getAccessToken() ? `${storage.getAccessToken()?.substring(0, 20)}...` : 'null',
        refresh_token: storage.getRefreshToken() ? `${storage.getRefreshToken()?.substring(0, 20)}...` : 'null',
        user: storage.getUser() ? 'present' : 'null',
      },
      zustandPersist: {
        stored: localStorage.getItem('auth-storage') ? 'present' : 'null',
        content: localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!) : null,
      },
      storeState: {
        hasTokens: !!(accessToken && refreshToken),
        accessTokenLength: accessToken?.length || 0,
        refreshTokenLength: refreshToken?.length || 0,
      }
    };
    
    setDebugInfo(info);
    console.log('Token Debug Info:', info);
  };

  const testManualLogin = async () => {
    try {
      await login({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
      
      // Wait a bit and check again
      setTimeout(() => {
        checkAllTokens();
      }, 1000);
    } catch (error) {
      console.error('Manual login failed:', error);
    }
  };

  const forceRehydrate = () => {
    // Force rehydrate the Zustand store
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      try {
        const parsedState = JSON.parse(stored);
        console.log('Forcing rehydration with:', parsedState);
        
        // This will trigger the store to reload
        window.location.reload();
      } catch (error) {
        console.error('Failed to rehydrate:', error);
      }
    }
  };

  const testDirectAPI = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'TestPassword123!'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Direct API response:', data);
        
        // Manually store tokens
        storage.setTokens(data.access_token, data.refresh_token);
        storage.setUser(data.user);
        
        // Check if they're stored
        checkAllTokens();
      } else {
        console.error('Direct API failed:', await response.json());
      }
    } catch (error) {
      console.error('Direct API error:', error);
    }
  };

  const clearEverything = () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Clear Zustand store
    logout();
    
    // Check result
    setTimeout(() => {
      checkAllTokens();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Token Debug Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={checkAllTokens}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Check All Tokens
          </button>
          
          <button
            onClick={testManualLogin}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Manual Login
          </button>
          
          <button
            onClick={testDirectAPI}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Test Direct API
          </button>
          
          <button
            onClick={clearEverything}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear Everything
          </button>
          
          <button
            onClick={forceRehydrate}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Force Rehydrate
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(debugInfo).map(([key, value]) => (
            <div key={key} className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4 capitalize">{key.replace(/([A-Z])/g, ' $1')}</h2>
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-yellow-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Click "Check All Tokens" to see current state</li>
            <li>Click "Test Manual Login" to test through Zustand store</li>
            <li>Click "Test Direct API" to test direct API call and manual storage</li>
            <li>Look at browser console for detailed logs</li>
            <li>Check if tokens persist after page refresh</li>
          </ol>
        </div>
      </div>
    </div>
  );
}