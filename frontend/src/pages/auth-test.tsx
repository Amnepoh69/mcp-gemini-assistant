/**
 * Authentication test page
 */

import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth';

export default function AuthTestPage() {
  const { user, isAuthenticated, login, logout, clearError, error } = useAuthStore();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('TestPassword123!');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login({ email, password });
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const checkTokens = () => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const userData = localStorage.getItem('user_data');
    
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
    console.log('User Data:', userData);
    
    // Check cookies too
    const cookieAccessToken = document.cookie.split('; ').find(row => row.startsWith('access_token='));
    const cookieRefreshToken = document.cookie.split('; ').find(row => row.startsWith('refresh_token='));
    
    console.log('Cookie Access Token:', cookieAccessToken);
    console.log('Cookie Refresh Token:', cookieRefreshToken);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Auth Test</h1>
        
        {/* Auth Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Auth Status:</h2>
          <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          <p>User: {user ? user.email : 'None'}</p>
          {error && <p className="text-red-600">Error: {error}</p>}
        </div>

        {/* Login Form */}
        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-semibold text-green-800">Logged in as:</h3>
              <p className="text-green-700">{user?.email}</p>
              <p className="text-green-700">Role: {user?.role}</p>
              <p className="text-green-700">Name: {user?.first_name} {user?.last_name}</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        )}

        {/* Debug Buttons */}
        <div className="mt-6 space-y-2">
          <button
            onClick={checkTokens}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
          >
            Check Tokens (Console)
          </button>
          
          <button
            onClick={clearError}
            className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700"
          >
            Clear Error
          </button>
          
          <button
            onClick={() => {
              localStorage.clear();
              document.cookie.split(";").forEach(c => {
                const eqPos = c.indexOf("=");
                const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
              });
              window.location.reload();
            }}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
          >
            Clear All Data & Reload
          </button>
        </div>
      </div>
    </div>
  );
}