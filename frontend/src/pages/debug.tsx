/**
 * Debug page to test API connectivity
 */

import React, { useState, useEffect } from 'react';

export default function DebugPage() {
  const [apiStatus, setApiStatus] = useState('checking...');
  const [loginTest, setLoginTest] = useState('not tested');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    testAPIConnection();
  }, []);

  const testAPIConnection = async () => {
    try {
      const response = await fetch('http://localhost:8000/health');
      if (response.ok) {
        const data = await response.json();
        setApiStatus(`✅ Connected - ${data.status}`);
      } else {
        setApiStatus(`❌ HTTP ${response.status}`);
      }
    } catch (error) {
      setApiStatus(`❌ Connection failed: ${error}`);
      setErrors(prev => [...prev, `API Connection: ${error}`]);
    }
  };

  const testLogin = async () => {
    try {
      setLoginTest('testing...');
      
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'TestPassword123!',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLoginTest(`✅ Login successful - Token: ${data.access_token.substring(0, 20)}...`);
      } else {
        const errorData = await response.json();
        setLoginTest(`❌ Login failed: ${JSON.stringify(errorData)}`);
        setErrors(prev => [...prev, `Login: ${JSON.stringify(errorData)}`]);
      }
    } catch (error) {
      setLoginTest(`❌ Login error: ${error}`);
      setErrors(prev => [...prev, `Login: ${error}`]);
    }
  };

  const testAuthStore = async () => {
    try {
      const { useAuthStore } = await import('@/store/auth');
      const store = useAuthStore.getState();
      console.log('Auth Store State:', store);
      
      setErrors(prev => [...prev, `Auth Store: ${JSON.stringify({
        isAuthenticated: store.isAuthenticated,
        user: store.user?.email,
        hasTokens: !!(store.accessToken && store.refreshToken),
      })}`]);
    } catch (error) {
      setErrors(prev => [...prev, `Auth Store Error: ${error}`]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* API Status */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">API Status</h2>
            <div className="space-y-2">
              <p><strong>Backend Health:</strong> {apiStatus}</p>
              <button
                onClick={testAPIConnection}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Test API Connection
              </button>
            </div>
          </div>

          {/* Login Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Login Test</h2>
            <div className="space-y-2">
              <p><strong>Login Result:</strong> {loginTest}</p>
              <button
                onClick={testLogin}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Test Login
              </button>
            </div>
          </div>

          {/* Auth Store */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Auth Store</h2>
            <div className="space-y-2">
              <button
                onClick={testAuthStore}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Check Auth Store
              </button>
            </div>
          </div>

          {/* Environment Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Environment</h2>
            <div className="text-sm space-y-1">
              <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'server'}</p>
              <p><strong>Local Storage:</strong> {typeof window !== 'undefined' ? 'Available' : 'Not available'}</p>
              <p><strong>Cookies:</strong> {typeof window !== 'undefined' ? 'Available' : 'Not available'}</p>
            </div>
          </div>
        </div>

        {/* Error Log */}
        {errors.length > 0 && (
          <div className="mt-8 bg-red-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-red-800">Error Log</h2>
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="p-2 bg-red-100 rounded text-sm">
                  {error}
                </div>
              ))}
            </div>
            <button
              onClick={() => setErrors([])}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Clear Errors
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Test API Connection first</li>
            <li>Test Login functionality</li>
            <li>Check Auth Store state</li>
            <li>Look at browser console for additional errors</li>
            <li>Visit <code className="bg-gray-200 px-1 rounded">/auth-test</code> page for full auth testing</li>
          </ol>
        </div>
      </div>
    </div>
  );
}