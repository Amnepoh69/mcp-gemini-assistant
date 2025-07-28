/**
 * Data visualization component for uploaded files
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { LineChart as RechartsLineChart } from '@/components/charts/LineChart';
import { BarChart as RechartsBarChart } from '@/components/charts/BarChart';
import { PieChart as RechartsPieChart } from '@/components/charts/PieChart';
import { uploadApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface DataVisualizationProps {
  uploadId: string;
  onClose?: () => void;
}

interface UploadData {
  id: string;
  name: string;
  description: string;
  source_type: string;
  status: string;
  row_count: number;
  raw_data: any[];
  created_at: string;
}

interface ChartData {
  name: string;
  value: number;
  date?: string;
  category?: string;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({ 
  uploadId, 
  onClose 
}) => {
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [showRawData, setShowRawData] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>(null);

  useEffect(() => {
    if (uploadId) {
      loadUploadData();
    }
  }, [uploadId]);

  useEffect(() => {
    if (uploadData?.raw_data) {
      processDataForVisualization();
    }
  }, [uploadData, chartType]);

  const loadUploadData = async () => {
    try {
      setIsLoading(true);
      const response = await uploadApi.getUpload(parseInt(uploadId));
      setUploadData(response.data);
      
      // Calculate summary statistics
      calculateSummaryStats(response.data.raw_data);
    } catch (error: any) {
      toast.error(`Failed to load upload data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSummaryStats = (data: any[]) => {
    if (!data || data.length === 0) return;

    const amounts = data
      .map(row => parseFloat(row.amount || row.value || 0))
      .filter(amount => !isNaN(amount));

    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    const average = amounts.length > 0 ? total / amounts.length : 0;
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);

    setSummaryStats({
      total,
      average,
      max,
      min,
      count: data.length,
      positiveCount: amounts.filter(a => a > 0).length,
      negativeCount: amounts.filter(a => a < 0).length
    });
  };

  const processDataForVisualization = () => {
    if (!uploadData?.raw_data) return;

    const data = uploadData.raw_data;
    let processedData: ChartData[] = [];

    try {
      switch (chartType) {
        case 'line':
          // Time series data
          processedData = data.map((row, index) => ({
            name: row.date || row.period || `Entry ${index + 1}`,
            value: parseFloat(row.amount || row.value || 0),
            date: row.date || row.period,
            category: row.category || row.source || 'Default'
          })).filter(item => !isNaN(item.value));
          break;

        case 'bar':
          // Categorical data
          if (data.some(row => row.category || row.source)) {
            // Group by category
            const groupedData = data.reduce((acc, row) => {
              const category = row.category || row.source || 'Other';
              const value = parseFloat(row.amount || row.value || 0);
              
              if (!acc[category]) {
                acc[category] = 0;
              }
              acc[category] += value;
              return acc;
            }, {} as Record<string, number>);

            processedData = Object.entries(groupedData).map(([name, value]) => ({
              name,
              value: value as number,
              category: name
            }));
          } else {
            // Use raw data
            processedData = data.map((row, index) => ({
              name: row.description || `Entry ${index + 1}`,
              value: parseFloat(row.amount || row.value || 0),
              category: 'Data'
            })).filter(item => !isNaN(item.value));
          }
          break;

        case 'pie':
          // Pie chart for categorical breakdown
          if (data.some(row => row.category || row.source)) {
            const groupedData = data.reduce((acc, row) => {
              const category = row.category || row.source || 'Other';
              const value = Math.abs(parseFloat(row.amount || row.value || 0));
              
              if (!acc[category]) {
                acc[category] = 0;
              }
              acc[category] += value;
              return acc;
            }, {} as Record<string, number>);

            processedData = Object.entries(groupedData).map(([name, value]) => ({
              name,
              value: value as number,
              category: name
            }));
          } else {
            // Split positive vs negative
            const positive = data.filter(row => parseFloat(row.amount || row.value || 0) > 0);
            const negative = data.filter(row => parseFloat(row.amount || row.value || 0) < 0);
            
            processedData = [
              {
                name: 'Positive',
                value: positive.reduce((sum, row) => sum + parseFloat(row.amount || row.value || 0), 0),
                category: 'Positive'
              },
              {
                name: 'Negative',
                value: Math.abs(negative.reduce((sum, row) => sum + parseFloat(row.amount || row.value || 0), 0)),
                category: 'Negative'
              }
            ].filter(item => item.value > 0);
          }
          break;
      }

      setChartData(processedData);
    } catch (error) {
      console.error('Error processing data for visualization:', error);
      toast.error('Error processing data for visualization');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const chartOptions = [
    { value: 'line', label: 'Line Chart' },
    { value: 'bar', label: 'Bar Chart' },
    { value: 'pie', label: 'Pie Chart' }
  ];

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!uploadData) {
    return (
      <div className="bg-white rounded-lg p-6">
        <div className="text-center text-gray-500">
          <p>No data found for this upload.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {uploadData.name}
            </h2>
            <p className="text-sm text-gray-500">
              {uploadData.description || 'No description'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawData(!showRawData)}
              icon={showRawData ? EyeOff : Eye}
            >
              {showRawData ? 'Hide' : 'Show'} Raw Data
            </Button>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Upload Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Table className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Rows</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {uploadData.row_count}
            </p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Uploaded</span>
            </div>
            <p className="text-sm text-gray-900">
              {formatDate(uploadData.created_at)}
            </p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Type</span>
            </div>
            <p className="text-sm text-gray-900 capitalize">
              {uploadData.source_type}
            </p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Status</span>
            </div>
            <p className="text-sm text-gray-900 capitalize">
              {uploadData.status}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      {summaryStats && (
        <div className="bg-white rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Total</span>
              </div>
              <p className="text-lg font-semibold text-blue-900">
                {formatCurrency(summaryStats.total)}
              </p>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Average</span>
              </div>
              <p className="text-lg font-semibold text-green-900">
                {formatCurrency(summaryStats.average)}
              </p>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Max</span>
              </div>
              <p className="text-lg font-semibold text-purple-900">
                {formatCurrency(summaryStats.max)}
              </p>
            </div>
            
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Min</span>
              </div>
              <p className="text-lg font-semibold text-orange-900">
                {formatCurrency(summaryStats.min)}
              </p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Positive</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {summaryStats.positiveCount}
              </p>
            </div>
            
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">Negative</span>
              </div>
              <p className="text-lg font-semibold text-red-900">
                {summaryStats.negativeCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart Visualization */}
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Data Visualization</h3>
          <div className="flex items-center space-x-2">
            <Select
              options={chartOptions}
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              placeholder="Select chart type"
            />
          </div>
        </div>

        <div className="h-96">
          {chartData.length > 0 ? (
            <>
              {chartType === 'line' && (
                <RechartsLineChart
                  data={chartData}
                  xAxisKey="name"
                  yAxisKey="value"
                />
              )}
              {chartType === 'bar' && (
                <RechartsBarChart
                  data={chartData}
                  xAxisKey="name"
                  yAxisKey="value"
                />
              )}
              {chartType === 'pie' && (
                <RechartsPieChart
                  data={chartData}
                  options={{
                    nameKey: "name",
                    dataKey: "value"
                  }}
                />
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <p>No data available for visualization</p>
            </div>
          )}
        </div>
      </div>

      {/* Raw Data Table */}
      {showRawData && uploadData.raw_data && (
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Raw Data</h3>
            <Button variant="outline" size="sm" icon={Download}>
              Export
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {uploadData.raw_data.length > 0 && 
                    Object.keys(uploadData.raw_data[0]).map(key => (
                      <th
                        key={key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))
                  }
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadData.raw_data.slice(0, 50).map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {Object.values(row).map((value, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {uploadData.raw_data.length > 50 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Showing first 50 rows of {uploadData.raw_data.length} total rows
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};