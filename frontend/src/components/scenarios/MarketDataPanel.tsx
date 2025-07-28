/**
 * Market data panel component for displaying external market data
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Globe, 
  Activity,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { marketDataApi } from '@/lib/api';
import { KeyRatePanel } from '@/components/market-data/KeyRatePanel';
import { toast } from 'react-hot-toast';

interface MarketDataPanelProps {
  onDataSelected?: (data: any) => void;
  className?: string;
}

interface MarketData {
  currency_rates: Array<{
    base_currency: string;
    target_currency: string;
    rate: number;
    timestamp: string;
  }>;
  interest_rates: Record<string, number>;
  commodity_prices: Array<{
    commodity: string;
    price: number;
    currency: string;
    timestamp: string;
  }>;
  market_indices: Array<{
    symbol: string;
    value: number;
    timestamp: string;
    metadata: any;
  }>;
  economic_indicators: Record<string, number>;
  last_updated: string;
}

export const MarketDataPanel: React.FC<MarketDataPanelProps> = ({ 
  onDataSelected, 
  className = '' 
}) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'currencies' | 'rates' | 'commodities' | 'indices' | 'indicators' | 'key-rate'>('key-rate');

  useEffect(() => {
    loadMarketData();
  }, []);

  const loadMarketData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading market data...', new Date().toISOString());
      const response = await marketDataApi.getDashboardData();
      console.log('Market data loaded:', response.data);
      setMarketData(response.data);
      toast.success(`Market data updated at ${new Date().toLocaleTimeString()}`);
    } catch (error: any) {
      console.error('Failed to load market data:', error);
      toast.error(`Failed to load market data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  const getTrendIcon = (change: number) => {
    return change > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const tabs = [
    { id: 'key-rate', label: 'Ключевая ставка ЦБ', icon: Percent },
    { id: 'currencies', label: 'Currencies', icon: DollarSign },
    { id: 'rates', label: 'Interest Rates', icon: BarChart3 },
    { id: 'commodities', label: 'Commodities', icon: PieChart },
    { id: 'indices', label: 'Market Indices', icon: LineChart },
    { id: 'indicators', label: 'Economic', icon: Activity }
  ];

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Globe className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Market Data
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {marketData?.last_updated ? new Date(marketData.last_updated).toLocaleTimeString() : 'Never'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMarketData}
            icon={RefreshCw}
            className={`p-2 ${isLoading ? 'animate-spin' : ''}`}
            disabled={isLoading}
          >
            Обновить
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'key-rate' && (
          <KeyRatePanel />
        )}
        
        {activeTab === 'currencies' && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Currency Rates to RUB
            </h3>
            {marketData?.currency_rates.map((rate) => (
              <div key={rate.target_currency} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {rate.target_currency}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {rate.base_currency}/{rate.target_currency}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(rate.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {rate.rate.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'rates' && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              US Interest Rates
            </h3>
            {marketData?.interest_rates && Object.entries(marketData.interest_rates).map(([rate_type, rate]) => (
              <div key={rate_type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {rate_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatPercentage(rate)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'commodities' && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Commodity Prices
            </h3>
            {marketData?.commodity_prices.map((commodity) => (
              <div key={commodity.commodity} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {commodity.commodity.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {commodity.commodity}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(commodity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(commodity.price, commodity.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'indices' && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Market Indices
            </h3>
            {marketData?.market_indices.map((index) => (
              <div key={index.symbol} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <LineChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {index.symbol}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(index.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {index.value.toLocaleString()}
                  </p>
                  {index.metadata?.change && (
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(index.metadata.change)}
                      <span className={`text-xs ${index.metadata.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {index.metadata.change > 0 ? '+' : ''}{index.metadata.change.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'indicators' && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Economic Indicators
            </h3>
            {marketData?.economic_indicators && Object.entries(marketData.economic_indicators).map(([indicator, value]) => (
              <div key={indicator} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {indicator.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {typeof value === 'number' ? 
                      (indicator.includes('rate') ? formatPercentage(value) : value.toFixed(1)) : 
                      value
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Use this data for enhanced scenario analysis
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onDataSelected && onDataSelected(marketData)}
          >
            Use for Analysis
          </Button>
        </div>
      </div>
    </div>
  );
};