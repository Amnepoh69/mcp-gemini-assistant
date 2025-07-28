/**
 * CBR Key Rate Panel component
 */

import React, { useState, useEffect } from 'react';
import { Percent, TrendingUp, TrendingDown, RefreshCw, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LineChart } from '@/components/charts/LineChart';
import { cbrApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface KeyRateData {
  rate: number;
  date: string;
  indicator: string;
  description: string;
}

interface KeyRateHistory {
  rates: Array<{
    date: string;
    rate: number;
  }>;
  period_days: number;
  count: number;
}

export const KeyRatePanel: React.FC = () => {
  const [currentRate, setCurrentRate] = useState<KeyRateData | null>(null);
  const [history, setHistory] = useState<KeyRateHistory | null>(null);
  const [historyPeriod, setHistoryPeriod] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadKeyRateData();
  }, []);

  useEffect(() => {
    if (historyPeriod > 0) {
      loadKeyRateHistory();
    }
  }, [historyPeriod]);

  const loadKeyRateData = async () => {
    try {
      setIsLoading(true);
      const response = await cbrApi.getCurrentRate();
      setCurrentRate(response.data);
    } catch (error: any) {
      console.error('Error loading key rate data:', error);
      toast.error('Ошибка при загрузке данных ключевой ставки');
    } finally {
      setIsLoading(false);
    }
  };

  const loadKeyRateHistory = async () => {
    try {
      const response = await cbrApi.getHistoricalRates(historyPeriod);
      setHistory(response.data);
    } catch (error: any) {
      console.error('Error loading key rate history:', error);
      toast.error('Ошибка при загрузке истории ключевой ставки');
    }
  };

  const updateKeyRates = async () => {
    // TODO: Implement updateKeyRates API method
    try {
      setIsUpdating(true);
      // const response = await cbrApi.updateKeyRates(365);
      toast.success('Функция обновления пока недоступна');
      await loadKeyRateData();
      await loadKeyRateHistory();
    } catch (error: any) {
      console.error('Error updating key rates:', error);
      toast.error('Ошибка при обновлении данных');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getPreviousRate = () => {
    if (!history || history.rates.length < 2) return null;
    return history.rates[1].rate;
  };

  const getRateChange = () => {
    if (!currentRate || !history) return null;
    const previousRate = getPreviousRate();
    if (previousRate === null) return null;
    return currentRate.rate - previousRate;
  };

  const chartData = history?.rates.map(rate => ({
    name: formatDate(rate.date),
    value: rate.rate,
    x: rate.date,
    y: rate.rate
  })) || [];

  return (
    <div className="space-y-4">
      {/* Current Key Rate */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Percent className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Ключевая ставка ЦБ РФ
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={updateKeyRates}
            disabled={isUpdating}
            icon={RefreshCw}
            className={`${isUpdating ? 'animate-spin' : ''}`}
          >
            Обновить
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : currentRate ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Текущая ставка
                </span>
                {(() => {
                  const change = getRateChange();
                  if (change === null) return null;
                  return change > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : change < 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : null;
                })()}
              </div>
              <div className="mt-1">
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {currentRate.rate.toFixed(2)}%
                </span>
                {(() => {
                  const change = getRateChange();
                  if (change === null) return null;
                  return (
                    <span className={`ml-2 text-sm ${
                      change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {change > 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Дата установления
                </span>
              </div>
              <div className="mt-1">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(currentRate.date)}
                </span>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Статус
                </span>
              </div>
              <div className="mt-1">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Действует
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Данные ключевой ставки недоступны
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={updateKeyRates}
              disabled={isUpdating}
              className="mt-4"
            >
              Загрузить данные
            </Button>
          </div>
        )}
      </div>

      {/* Key Rate History Chart */}
      {history && history.rates.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">
              История изменений
            </h4>
            <div className="flex items-center space-x-2">
              <select
                value={historyPeriod}
                onChange={(e) => setHistoryPeriod(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value={30}>30 дней</option>
                <option value={90}>90 дней</option>
                <option value={180}>180 дней</option>
                <option value={365}>1 год</option>
              </select>
            </div>
          </div>

          <div className="h-64">
            <LineChart
              data={chartData}
              xAxisKey="name"
              yAxisKey="value"
              options={{
                colors: ['#3B82F6'],
                showGrid: true,
                showLegend: false,
                lines: [{
                  dataKey: 'value',
                  name: 'Ключевая ставка',
                  color: '#3B82F6',
                  strokeWidth: 2
                }]
              }}
            />
          </div>

          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            Показано {history.count} записей за {history.period_days} дней
          </div>
        </div>
      )}
    </div>
  );
};