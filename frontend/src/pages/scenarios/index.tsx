/**
 * Scenarios management page
 */

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ScenarioList } from '@/components/scenarios/ScenarioList';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { scenarioApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function ScenariosManagementPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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

  const handleRunScenario = async (scenarioId: number) => {
    try {
      toast.loading('Running scenario...');
      const response = await scenarioApi.executeScenario(scenarioId);
      toast.dismiss();
      toast.success('Scenario executed successfully');
      router.push(`/scenarios/${scenarioId}/results`);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to run scenario');
      console.error('Error running scenario:', error);
    }
  };

  const handleEditScenario = (scenarioId: number) => {
    router.push(`/scenarios/edit/${scenarioId}`);
  };

  const handleDeleteScenario = async (scenarioId: number) => {
    if (confirm('Are you sure you want to delete this scenario?')) {
      try {
        await scenarioApi.deleteScenario(scenarioId);
        toast.success('Scenario deleted successfully');
        // Refresh the scenarios list
        window.location.reload();
      } catch (error) {
        toast.error('Failed to delete scenario');
        console.error('Error deleting scenario:', error);
      }
    }
  };

  const handleDuplicateScenario = async (scenarioId: number) => {
    try {
      const scenario = await scenarioApi.getScenario(scenarioId);
      const duplicatedScenario = {
        ...scenario.data,
        name: `${scenario.data.name} (Copy)`,
        id: undefined,
      };
      await scenarioApi.createScenario(duplicatedScenario);
      toast.success('Scenario duplicated successfully');
      window.location.reload();
    } catch (error) {
      toast.error('Failed to duplicate scenario');
      console.error('Error duplicating scenario:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Scenarios</h1>
            <p className="text-gray-600">
              Manage and run your financial modeling scenarios
            </p>
          </div>
          <Button
            onClick={() => router.push('/scenarios/create')}
            icon={Plus}
          >
            Create Scenario
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search scenarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border-gray-300 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
            </select>
            
            <Button variant="outline" icon={Filter} size="sm">
              More Filters
            </Button>
          </div>
        </div>

        {/* Scenarios List */}
        <ScenarioList
          onRunScenario={handleRunScenario}
          onEditScenario={handleEditScenario}
          onDeleteScenario={handleDeleteScenario}
          onDuplicateScenario={handleDuplicateScenario}
        />
      </div>
    </DashboardLayout>
  );
}