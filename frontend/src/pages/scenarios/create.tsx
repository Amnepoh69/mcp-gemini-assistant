/**
 * Create scenario page
 */

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ScenarioBuilder } from '@/components/scenarios/ScenarioBuilder';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { scenarioApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function CreateScenarioPage() {
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

  const handleScenarioCreate = async (scenario: any) => {
    try {
      const response = await scenarioApi.createScenario(scenario);
      toast.success('Scenario created successfully');
      router.push('/scenarios');
    } catch (error) {
      console.error('Error creating scenario:', error);
      toast.error('Failed to create scenario');
    }
  };

  return (
    <DashboardLayout>
      <ScenarioBuilder onScenarioCreate={handleScenarioCreate} />
    </DashboardLayout>
  );
}