/**
 * Service for converting scenario analysis results into chart data
 */

import { ChartData } from '@/components/charts/ChartContainer';

export interface ScenarioResult {
  scenario_id: string;
  scenario_name: string;
  scenario_type: string;
  results: {
    summary: {
      total_impact?: number;
      growth_rate?: number;
      confidence_score?: number;
      recommendations?: string[];
    };
    data: {
      [key: string]: any;
    };
  };
}

export class VisualizationService {
  /**
   * Convert revenue forecast results to line chart
   */
  static createRevenueChart(result: ScenarioResult): ChartData {
    const data = result.results.data;
    
    const chartData = data.forecast?.map((item: any, index: number) => ({
      month: `Month ${index + 1}`,
      revenue: item.projected_revenue,
      historical: item.historical_revenue,
      growth: item.growth_rate * 100,
    })) || [];

    return {
      type: 'line',
      title: `Revenue Forecast - ${result.scenario_name}`,
      data: chartData,
      xAxisKey: 'month',
      yAxisKey: 'revenue',
      options: {
        colors: ['#3B82F6', '#10B981', '#F59E0B'],
        lines: [
          { dataKey: 'revenue', name: 'Projected Revenue', color: '#3B82F6' },
          { dataKey: 'historical', name: 'Historical Revenue', color: '#10B981', strokeDasharray: '5 5' },
          { dataKey: 'growth', name: 'Growth Rate (%)', color: '#F59E0B' },
        ],
      },
    };
  }

  /**
   * Convert cost analysis results to bar chart
   */
  static createCostChart(result: ScenarioResult): ChartData {
    const data = result.results.data;
    
    const chartData = data.cost_breakdown?.map((item: any) => ({
      category: item.category,
      current: item.current_cost,
      projected: item.projected_cost,
      variance: item.variance,
    })) || [];

    return {
      type: 'bar',
      title: `Cost Analysis - ${result.scenario_name}`,
      data: chartData,
      xAxisKey: 'category',
      yAxisKey: 'current',
      options: {
        colors: ['#EF4444', '#F59E0B', '#10B981'],
        bars: [
          { dataKey: 'current', name: 'Current Cost', color: '#EF4444' },
          { dataKey: 'projected', name: 'Projected Cost', color: '#F59E0B' },
          { dataKey: 'variance', name: 'Variance', color: '#10B981' },
        ],
      },
    };
  }

  /**
   * Convert cash flow results to line chart
   */
  static createCashFlowChart(result: ScenarioResult): ChartData {
    const data = result.results.data;
    
    const chartData = data.monthly_flow?.map((item: any, index: number) => ({
      month: `Month ${index + 1}`,
      inflow: item.inflow,
      outflow: item.outflow,
      netFlow: item.net_flow,
      cumulativeFlow: item.cumulative_flow,
    })) || [];

    return {
      type: 'line',
      title: `Cash Flow Analysis - ${result.scenario_name}`,
      data: chartData,
      xAxisKey: 'month',
      yAxisKey: 'netFlow',
      options: {
        colors: ['#10B981', '#EF4444', '#3B82F6', '#8B5CF6'],
        lines: [
          { dataKey: 'inflow', name: 'Cash Inflow', color: '#10B981' },
          { dataKey: 'outflow', name: 'Cash Outflow', color: '#EF4444' },
          { dataKey: 'netFlow', name: 'Net Cash Flow', color: '#3B82F6', strokeWidth: 3 },
          { dataKey: 'cumulativeFlow', name: 'Cumulative Flow', color: '#8B5CF6', strokeDasharray: '5 5' },
        ],
      },
    };
  }

  /**
   * Convert risk assessment results to tornado chart
   */
  static createRiskChart(result: ScenarioResult): ChartData {
    const data = result.results.data;
    
    const chartData = data.risk_factors?.map((item: any) => ({
      name: item.factor,
      low: item.low_impact,
      high: item.high_impact,
      probability: item.probability,
    })) || [];

    return {
      type: 'tornado',
      title: `Risk Assessment - ${result.scenario_name}`,
      data: chartData,
      options: {
        colors: ['#EF4444', '#10B981'],
        baseValue: 0,
        lowKey: 'low',
        highKey: 'high',
        nameKey: 'name',
      },
    };
  }

  /**
   * Convert market scenario results to scatter plot
   */
  static createMarketChart(result: ScenarioResult): ChartData {
    const data = result.results.data;
    
    const chartData = data.market_positions?.map((item: any) => ({
      x: item.market_share,
      y: item.revenue_impact,
      size: item.confidence * 100,
      label: item.scenario_name,
    })) || [];

    return {
      type: 'scatter',
      title: `Market Scenario Analysis - ${result.scenario_name}`,
      data: chartData,
      xAxisKey: 'x',
      yAxisKey: 'y',
      options: {
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
        scatters: [
          { data: chartData, name: 'Market Positions', color: '#3B82F6' },
        ],
      },
    };
  }

  /**
   * Create summary pie chart for cost breakdown
   */
  static createCostBreakdownChart(result: ScenarioResult): ChartData {
    const data = result.results.data;
    
    const chartData = data.cost_breakdown?.map((item: any) => ({
      name: item.category,
      value: item.current_cost,
      percentage: item.percentage,
    })) || [];

    return {
      type: 'pie',
      title: `Cost Breakdown - ${result.scenario_name}`,
      data: chartData,
      options: {
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
        dataKey: 'value',
        nameKey: 'name',
        showLegend: true,
      },
    };
  }

  /**
   * Convert scenario result to appropriate chart based on type
   */
  static convertToChart(result: ScenarioResult): ChartData[] {
    const charts: ChartData[] = [];

    switch (result.scenario_type) {
      case 'revenue_forecast':
        charts.push(this.createRevenueChart(result));
        break;
      
      case 'cost_analysis':
        charts.push(this.createCostChart(result));
        charts.push(this.createCostBreakdownChart(result));
        break;
      
      case 'cash_flow':
        charts.push(this.createCashFlowChart(result));
        break;
      
      case 'risk_assessment':
        charts.push(this.createRiskChart(result));
        break;
      
      case 'market_scenario':
        charts.push(this.createMarketChart(result));
        break;
      
      default:
        // Generic chart for unknown types
        charts.push({
          type: 'bar',
          title: `Analysis Results - ${result.scenario_name}`,
          data: [],
          xAxisKey: 'category',
          yAxisKey: 'value',
        });
    }

    return charts;
  }

  /**
   * Create comparison charts for multiple scenarios
   */
  static createComparisonChart(results: ScenarioResult[]): ChartData {
    const chartData = results.map(result => ({
      scenario: result.scenario_name,
      impact: result.results.summary.total_impact || 0,
      confidence: result.results.summary.confidence_score || 0,
      growth: result.results.summary.growth_rate || 0,
    }));

    return {
      type: 'bar',
      title: 'Scenario Comparison',
      data: chartData,
      xAxisKey: 'scenario',
      yAxisKey: 'impact',
      options: {
        colors: ['#3B82F6', '#10B981', '#F59E0B'],
        bars: [
          { dataKey: 'impact', name: 'Total Impact', color: '#3B82F6' },
          { dataKey: 'confidence', name: 'Confidence Score', color: '#10B981' },
          { dataKey: 'growth', name: 'Growth Rate', color: '#F59E0B' },
        ],
      },
    };
  }
}