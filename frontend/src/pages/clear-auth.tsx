import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/router';

export default function ClearAuthPage() {
  const { clearAllAuthData } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Clear all auth data
    clearAllAuthData();
    
    // Redirect to home after clearing
    setTimeout(() => {
      router.push('/');
    }, 2000);
  }, [clearAllAuthData, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Clearing Authentication Data</h2>
        <p className="text-gray-600">All stored authentication data has been cleared.</p>
        <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
      </div>
    </div>
  );
}