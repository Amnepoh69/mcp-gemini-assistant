/**
 * Line chart component using Recharts
 */

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface LineChartProps {
  data: any[];
  xAxisKey?: string;
  yAxisKey?: string;
  options?: {
    colors?: string[];
    showGrid?: boolean;
    showLegend?: boolean;
    lines?: Array<{
      dataKey: string;
      name: string;
      color: string;
      strokeWidth?: number;
      strokeDasharray?: string;
    }>;
  };
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
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
    lines = [{ dataKey: yAxisKey, name: 'Value', color: colors[0] }],
  } = options;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          dataKey={xAxisKey}
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
        />
        <YAxis
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        {showLegend && <Legend />}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            strokeWidth={line.strokeWidth || 2}
            strokeDasharray={line.strokeDasharray}
            name={line.name}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};