/**
 * Bar chart component using Recharts
 */

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BarChartProps {
  data: any[];
  xAxisKey?: string;
  yAxisKey?: string;
  options?: {
    colors?: string[];
    showGrid?: boolean;
    showLegend?: boolean;
    bars?: Array<{
      dataKey: string;
      name: string;
      color: string;
    }>;
    orientation?: 'horizontal' | 'vertical';
  };
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
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
    bars = [{ dataKey: yAxisKey, name: 'Value', color: colors[0] }],
    orientation = 'vertical',
  } = options;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        {orientation === 'horizontal' ? (
          <>
            <XAxis type="number" stroke="#6B7280" fontSize={12} tick={{ fill: '#6B7280' }} />
            <YAxis type="category" dataKey={xAxisKey} stroke="#6B7280" fontSize={12} tick={{ fill: '#6B7280' }} />
          </>
        ) : (
          <>
            <XAxis dataKey={xAxisKey} stroke="#6B7280" fontSize={12} tick={{ fill: '#6B7280' }} />
            <YAxis stroke="#6B7280" fontSize={12} tick={{ fill: '#6B7280' }} />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        {showLegend && <Legend />}
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={bar.color}
            name={bar.name}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};