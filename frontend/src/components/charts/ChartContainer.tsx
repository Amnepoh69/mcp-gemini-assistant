/**
 * Chart container component for different chart types
 */

import React from 'react';
import { LineChart } from './LineChart';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { TornadoChart } from './TornadoChart';
import { ScatterPlot } from './ScatterPlot';

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'tornado' | 'scatter';
  title: string;
  data: any[];
  xAxisKey?: string;
  yAxisKey?: string;
  options?: any;
}

interface ChartContainerProps {
  chartData: ChartData;
  className?: string;
  height?: number;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  chartData,
  className = '',
  height = 400,
}) => {
  const { type, title, data, xAxisKey, yAxisKey, options } = chartData;

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart
            data={data}
            xAxisKey={xAxisKey}
            yAxisKey={yAxisKey}
            options={options}
            height={height}
          />
        );
      case 'bar':
        return (
          <BarChart
            data={data}
            xAxisKey={xAxisKey}
            yAxisKey={yAxisKey}
            options={options}
            height={height}
          />
        );
      case 'pie':
        return (
          <PieChart
            data={data}
            options={options}
            height={height}
          />
        );
      case 'tornado':
        return (
          <TornadoChart
            data={data}
            options={options}
            height={height}
          />
        );
      case 'scatter':
        return (
          <ScatterPlot
            data={data}
            xAxisKey={xAxisKey}
            yAxisKey={yAxisKey}
            options={options}
            height={height}
          />
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="w-full">
        {renderChart()}
      </div>
    </div>
  );
};