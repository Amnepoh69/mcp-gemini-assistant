/**
 * Tornado chart component for sensitivity analysis
 */

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface TornadoChartProps {
  data: any[];
  options?: {
    colors?: string[];
    showGrid?: boolean;
    baseValue?: number;
    lowKey?: string;
    highKey?: string;
    nameKey?: string;
  };
  height?: number;
}

export const TornadoChart: React.FC<TornadoChartProps> = ({
  data,
  options = {},
  height = 400,
}) => {
  const {
    colors = ['#EF4444', '#10B981'],
    showGrid = true,
    baseValue = 0,
    lowKey = 'low',
    highKey = 'high',
    nameKey = 'name',
  } = options;

  // Transform data for tornado chart
  const transformedData = data.map(item => ({
    ...item,
    lowValue: item[lowKey] - baseValue,
    highValue: item[highKey] - baseValue,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-red-600">
            Low: {data[lowKey]}
          </p>
          <p className="text-green-600">
            High: {data[highKey]}
          </p>
          <p className="text-gray-600">
            Range: {Math.abs(data[highKey] - data[lowKey]).toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={transformedData}
        layout="horizontal"
        margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          type="number"
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
        />
        <YAxis
          type="category"
          dataKey={nameKey}
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
          width={100}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine x={0} stroke="#374151" strokeWidth={2} />
        <Bar
          dataKey="lowValue"
          fill={colors[0]}
          name="Low Impact"
          stackId="tornado"
        />
        <Bar
          dataKey="highValue"
          fill={colors[1]}
          name="High Impact"
          stackId="tornado"
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};