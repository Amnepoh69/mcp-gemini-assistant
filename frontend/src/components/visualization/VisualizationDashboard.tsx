/**
 * Visualization dashboard component
 */

import React, { useState, useEffect } from 'react';
import { ChartContainer, ChartData } from '@/components/charts/ChartContainer';
import { VisualizationService, ScenarioResult } from '@/services/visualizationService';
import { Download, RefreshCw, Filter, Grid, List } from 'lucide-react';

interface VisualizationDashboardProps {
  scenarioResults: ScenarioResult[];
  onExport?: (chartData: ChartData[]) => void;
  onRefresh?: () => void;
}

export const VisualizationDashboard: React.FC<VisualizationDashboardProps> = ({
  scenarioResults,
  onExport,
  onRefresh,
}) => {
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (scenarioResults.length > 0) {
      const allCharts: ChartData[] = [];
      
      scenarioResults.forEach(result => {
        const resultCharts = VisualizationService.convertToChart(result);
        allCharts.push(...resultCharts);
      });

      // Add comparison chart if multiple scenarios
      if (scenarioResults.length > 1 && showComparison) {
        const comparisonChart = VisualizationService.createComparisonChart(scenarioResults);
        allCharts.unshift(comparisonChart);
      }

      setCharts(allCharts);
    }
  }, [scenarioResults, showComparison]);

  const handleExport = () => {
    if (onExport) {
      onExport(charts);
    }
  };

  const handleScenarioToggle = (scenarioId: string) => {
    setSelectedScenarios(prev => 
      prev.includes(scenarioId) 
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const filteredCharts = selectedScenarios.length > 0 
    ? charts.filter(chart => 
        selectedScenarios.some(id => 
          scenarioResults.find(result => result.scenario_id === id)?.scenario_name
        )
      )
    : charts;

  if (scenarioResults.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="text-gray-400 mb-4">
          <Grid className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Analysis Results
        </h3>
        <p className="text-gray-500">
          Run a scenario analysis to see visualizations here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Analysis Visualizations
            </h2>
            <p className="text-gray-500 mt-1">
              {filteredCharts.length} charts from {scenarioResults.length} scenarios
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Comparison Toggle */}
            {scenarioResults.length > 1 && (
              <button
                onClick={() => setShowComparison(!showComparison)}
                className={`px-3 py-2 rounded-md border transition-colors ${
                  showComparison
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4 inline mr-2" />
                Compare
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Refresh
            </button>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Scenario Filter */}
        {scenarioResults.length > 1 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Filter by scenarios:</p>
            <div className="flex flex-wrap gap-2">
              {scenarioResults.map(result => (
                <button
                  key={result.scenario_id}
                  onClick={() => handleScenarioToggle(result.scenario_id)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    selectedScenarios.includes(result.scenario_id)
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {result.scenario_name}
                </button>
              ))}
              {selectedScenarios.length > 0 && (
                <button
                  onClick={() => setSelectedScenarios([])}
                  className="px-3 py-1 rounded-full text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className={`${
        viewMode === 'grid' 
          ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' 
          : 'space-y-6'
      }`}>
        {filteredCharts.map((chart, index) => (
          <ChartContainer
            key={`${chart.title}-${index}`}
            chartData={chart}
            className="transition-all duration-200 hover:shadow-md"
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredCharts.length === 0 && selectedScenarios.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Filter className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Charts Match Filter
          </h3>
          <p className="text-gray-500">
            Try adjusting your scenario filters or clearing all filters.
          </p>
        </div>
      )}
    </div>
  );
};