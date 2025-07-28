/**
 * Scenario modeling types for frontend
 */

export enum ScenarioStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum MarketIndicator {
  INFLATION_RATE = 'inflation_rate',
  INTEREST_RATE = 'interest_rate',
  GDP_GROWTH = 'gdp_growth',
  UNEMPLOYMENT_RATE = 'unemployment_rate',
  CURRENCY_EXCHANGE = 'currency_exchange',
  COMMODITY_PRICES = 'commodity_prices',
  STOCK_MARKET = 'stock_market',
  CONSUMER_CONFIDENCE = 'consumer_confidence'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ScenarioParameter {
  indicator: MarketIndicator;
  current_value: number;
  scenario_value: number;
  change_percentage: number;
  impact_weight: number;
}

export interface Scenario {
  id: number;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  market_indicators: string[];
  user_id: number;
  status: ScenarioStatus;
  created_at: string;
  updated_at: string;
  last_run?: string;
  is_admin_created?: boolean;
  can_delete?: boolean;
}

export interface ScenarioCreate {
  name: string;
  description?: string;
  parameters: Record<string, any>;
  market_indicators: string[];
}

export interface ScenarioResult {
  id: number;
  scenario_id: number;
  user_id: number;
  results: {
    risk_score: number;
    risk_level: RiskLevel;
    impact_analysis: {
      revenue_impact: number;
      cost_impact: number;
      cash_flow_impact: number;
      profitability_impact: number;
    };
    recommendations: string[];
    market_scenario_summary: string;
  };
  chart_config: {
    charts: ChartConfig[];
  };
  created_at: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'tornado' | 'pie' | 'area';
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
  categories?: string[];
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'market' | 'operational' | 'strategic';
  parameters: ScenarioParameter[];
  icon: string;
}

export interface RunScenarioRequest {
  scenario_id: number;
  parameters?: Record<string, any>;
}