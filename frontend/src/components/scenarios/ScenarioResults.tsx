/**
 * Scenario results component with integrated visualizations
 */

import React, { useState } from 'react';
import { VisualizationDashboard } from '@/components/visualization/VisualizationDashboard';
import { ScenarioResult } from '@/services/visualizationService';
import { ChartData } from '@/components/charts/ChartContainer';
import { BarChart3, TrendingUp, AlertCircle, Download } from 'lucide-react';

interface ScenarioResultsProps {
  results: ScenarioResult[];
  isLoading?: boolean;
  onExport?: (chartData: ChartData[]) => void;
  onRefresh?: () => void;
}

export const ScenarioResults: React.FC<ScenarioResultsProps> = ({
  results,
  isLoading = false,
  onExport,
  onRefresh,
}) => {
  const [selectedResult, setSelectedResult] = useState<ScenarioResult | null>(
    results.length > 0 ? results[0] : null
  );

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(0)}`;
  };

  const getScenarioTypeIcon = (type: string) => {
    switch (type) {
      case 'revenue_forecast':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'cost_analysis':
        return <BarChart3 className="w-5 h-5 text-red-600" />;
      case 'cash_flow':
        return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case 'risk_assessment':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'market_scenario':
        return <BarChart3 className="w-5 h-5 text-purple-600" />;
      default:
        return <BarChart3 className="w-5 h-5 text-gray-600" />;
    }
  };

  const getScenarioTypeColor = (type: string) => {
    switch (type) {
      case 'revenue_forecast':
        return 'bg-green-100 text-green-800';
      case 'cost_analysis':
        return 'bg-red-100 text-red-800';
      case 'cash_flow':
        return 'bg-blue-100 text-blue-800';
      case 'risk_assessment':
        return 'bg-yellow-100 text-yellow-800';
      case 'market_scenario':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Analyzing scenarios...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="text-gray-400 mb-4">
          <BarChart3 className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Analysis Results
        </h3>
        <p className="text-gray-500">
          Run a scenario analysis to see results and visualizations here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Analysis Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.map((result) => (
            <div
              key={result.scenario_id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedResult?.scenario_id === result.scenario_id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedResult(result)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getScenarioTypeIcon(result.scenario_type)}
                  <span className="font-medium text-gray-900">
                    {result.scenario_name}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScenarioTypeColor(result.scenario_type)}`}>
                  {result.scenario_type.replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-1">
                {result.results.summary.total_impact && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Impact:</span>
                    <span className="text-sm font-medium">
                      {formatNumber(result.results.summary.total_impact)}
                    </span>
                  </div>
                )}
                
                {result.results.summary.growth_rate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Growth:</span>
                    <span className="text-sm font-medium">
                      {(result.results.summary.growth_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                
                {result.results.summary.confidence_score && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Confidence:</span>
                    <span className="text-sm font-medium">
                      {(result.results.summary.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Result Details */}
      {selectedResult && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedResult.scenario_name} - Details
            </h3>
            <div className="flex items-center space-x-2">
              {getScenarioTypeIcon(selectedResult.scenario_type)}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScenarioTypeColor(selectedResult.scenario_type)}`}>
                {selectedResult.scenario_type.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Recommendations */}
          {selectedResult.results.summary.recommendations && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Recommendations:
              </h4>
              <ul className="space-y-1">
                {selectedResult.results.summary.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {selectedResult.results.summary.total_impact && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  Total Impact
                </h4>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(selectedResult.results.summary.total_impact)}
                </p>
              </div>
            )}
            
            {selectedResult.results.summary.growth_rate && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  Growth Rate
                </h4>
                <p className="text-2xl font-bold text-green-600">
                  {(selectedResult.results.summary.growth_rate * 100).toFixed(1)}%
                </p>
              </div>
            )}
            
            {selectedResult.results.summary.confidence_score && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  Confidence Score
                </h4>
                <p className="text-2xl font-bold text-purple-600">
                  {(selectedResult.results.summary.confidence_score * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visualization Dashboard */}
      <VisualizationDashboard
        scenarioResults={results}
        onExport={onExport}
        onRefresh={onRefresh}
      />
    </div>
  );
};