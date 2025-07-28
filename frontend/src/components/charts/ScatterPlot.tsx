/**
 * Scatter plot component using Recharts
 */

import React from 'react';
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ScatterPlotProps {
  data: any[];
  xAxisKey?: string;
  yAxisKey?: string;
  options?: {
    colors?: string[];
    showGrid?: boolean;
    showLegend?: boolean;
    scatters?: Array<{
      data: any[];
      name: string;
      color: string;
    }>;
  };
  height?: number;
}

export const ScatterPlot: React.FC<ScatterPlotProps> = ({
  data,
  xAxisKey = 'x',
  yAxisKey = 'y',
  options = {},
  height = 400,
}) => {
  const {
    colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    showGrid = true,
    showLegend = true,
    scatters = [{ data, name: 'Series 1', color: colors[0] }],
  } = options;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">Data Point</p>
          <p className="text-blue-600">
            X: {data[xAxisKey]}
          </p>
          <p className="text-green-600">
            Y: {data[yAxisKey]}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          dataKey={xAxisKey}
          type="number"
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
        />
        <YAxis
          dataKey={yAxisKey}
          type="number"
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        {scatters.map((scatter, index) => (
          <Scatter
            key={scatter.name}
            name={scatter.name}
            data={scatter.data}
            fill={scatter.color}
          />
        ))}
      </RechartsScatterChart>
    </ResponsiveContainer>
  );
};