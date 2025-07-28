/**
 * Data upload page
 */

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataUpload } from '@/components/upload/DataUpload';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function UploadPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleUploadComplete = (uploadId: string) => {
    console.log('Upload completed:', uploadId);
    // Could show success message or redirect
  };

  return (
    <DashboardLayout>
      <DataUpload onUploadComplete={handleUploadComplete} />
    </DashboardLayout>
  );
}