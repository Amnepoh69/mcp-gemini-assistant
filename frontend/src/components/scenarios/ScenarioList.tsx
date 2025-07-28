/**
 * Scenario list component
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Scenario, ScenarioStatus, RiskLevel } from '@/types/scenario';
import { scenarioApi } from '@/lib/api';

interface ScenarioListProps {
  scenarios?: Scenario[];
  onRunScenario?: (scenarioId: number) => void;
  onEditScenario?: (scenarioId: number) => void;
  onDeleteScenario?: (scenarioId: number) => void;
  onDuplicateScenario?: (scenarioId: number) => void;
}

export const ScenarioList: React.FC<ScenarioListProps> = ({
  scenarios: propScenarios = [],
  onRunScenario,
  onEditScenario,
  onDeleteScenario,
  onDuplicateScenario
}) => {
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [scenarios, setScenarios] = useState<any[]>(propScenarios);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchScenarios = async () => {
      if (propScenarios.length === 0) {
        setLoading(true);
        try {
          const response = await scenarioApi.getScenarios();
          setScenarios(response.data);
        } catch (error) {
          console.error('Error fetching scenarios:', error);
        }
        setLoading(false);
      }
    };

    fetchScenarios();
  }, [propScenarios]);

  const displayScenarios = propScenarios.length > 0 ? propScenarios : scenarios;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Edit className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading scenarios...</p>
      </div>
    );
  }

  if (displayScenarios.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No scenarios yet
        </h3>
        <p className="text-gray-500 mb-6">
          Create your first financial scenario to start analyzing market impacts
        </p>
        <Button onClick={() => window.location.href = '/scenarios/create'}>
          Create Scenario
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayScenarios.map((scenario) => (
        <div
          key={scenario.id}
          className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {scenario.name}
                </h3>
                {scenario.is_admin_created && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(scenario.status)}`}>
                  {getStatusIcon(scenario.status)}
                  <span className="ml-1 capitalize">{scenario.status}</span>
                </span>
              </div>
              
              {scenario.description && (
                <p className="text-gray-600 mb-3">{scenario.description}</p>
              )}
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created {formatDate(scenario.created_at)}</span>
                </div>
                
                {scenario.last_run && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Last run {formatDate(scenario.last_run)}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>{scenario.data_upload_ids?.length || 0} data sources</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {scenario.status === 'completed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRunScenario?.(scenario.id)}
                  icon={Play}
                >
                  Run Again
                </Button>
              )}
              
              {scenario.status === 'created' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onRunScenario?.(scenario.id)}
                  icon={Play}
                >
                  Run Scenario
                </Button>
              )}
              
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedScenario(
                    selectedScenario === scenario.id ? null : scenario.id
                  )}
                  icon={MoreHorizontal}
                >
                  Options
                </Button>
                
                {selectedScenario === scenario.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onEditScenario?.(scenario.id);
                          setSelectedScenario(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Scenario
                      </button>
                      
                      <button
                        onClick={() => {
                          onDuplicateScenario?.(scenario.id);
                          setSelectedScenario(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </button>
                      
                      {scenario.can_delete === true && (
                        <button
                          onClick={() => {
                            onDeleteScenario?.(scenario.id);
                            setSelectedScenario(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};