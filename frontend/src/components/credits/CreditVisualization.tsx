/**
 * Credit data visualization component for risk analysis
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  PieChartIcon, 
  BarChart3, 
  Activity,
  Calendar,
  DollarSign,
  Percent,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CreditObligation } from '@/types/credit';
import { creditsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface CreditVisualizationProps {
  credits: CreditObligation[];
  selectedCredit?: CreditObligation | null;
  className?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export const CreditVisualization: React.FC<CreditVisualizationProps> = ({
  credits,
  selectedCredit,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rates' | 'schedule' | 'risk'>('overview');
  const [paymentSchedule, setPaymentSchedule] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load payment schedule if a credit is selected
  useEffect(() => {
    if (selectedCredit?.id) {
      loadPaymentSchedule(selectedCredit.id);
    }
  }, [selectedCredit]);

  const loadPaymentSchedule = async (creditId: number) => {
    try {
      setIsLoading(true);
      const response = await creditsApi.getSchedule(creditId);
      setPaymentSchedule(response.data);
    } catch (error: any) {
      console.error('Error loading payment schedule:', error);
      toast.error('Ошибка при загрузке графика платежей');
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare data for visualization
  const getCurrencyBreakdown = () => {
    const breakdown = credits.reduce((acc, credit) => {
      acc[credit.currency] = (acc[credit.currency] || 0) + credit.principal_amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(breakdown).map(([currency, amount]) => ({
      currency,
      amount,
      percentage: (amount / Object.values(breakdown).reduce((sum, val) => sum + val, 0)) * 100
    }));
  };

  const getRateDistribution = () => {
    return credits.map(credit => ({
      name: credit.credit_name,
      baseRate: credit.base_rate_value,
      spread: credit.credit_spread,
      totalRate: credit.total_rate,
      amount: credit.principal_amount,
      interest: credit.interest_amount || 0
    }));
  };

  const getMaturityProfile = () => {
    const currentDate = new Date();
    const maturityBuckets = {
      '< 1 год': 0,
      '1-3 года': 0,
      '3-5 лет': 0,
      '> 5 лет': 0
    };

    credits.forEach(credit => {
      const endDate = new Date(credit.end_date);
      const yearsToMaturity = (endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      if (yearsToMaturity < 1) {
        maturityBuckets['< 1 год'] += credit.principal_amount;
      } else if (yearsToMaturity < 3) {
        maturityBuckets['1-3 года'] += credit.principal_amount;
      } else if (yearsToMaturity < 5) {
        maturityBuckets['3-5 лет'] += credit.principal_amount;
      } else {
        maturityBuckets['> 5 лет'] += credit.principal_amount;
      }
    });

    return Object.entries(maturityBuckets).map(([bucket, amount]) => ({
      bucket,
      amount,
      percentage: (amount / credits.reduce((sum, c) => sum + c.principal_amount, 0)) * 100
    }));
  };

  const getPaymentScheduleChart = () => {
    if (!paymentSchedule.length) return [];
    
    return paymentSchedule.map((payment, index) => ({
      period: index + 1,
      principal: payment.principal_amount, // Остаток задолженности на начало периода
      interest: payment.interest_amount || 0,
      total: payment.total_payment || payment.principal_amount,
      date: new Date(payment.payment_date).toLocaleDateString('ru-RU')
    }));
  };

  const getRiskAnalysis = () => {
    const totalPrincipal = credits.reduce((sum, credit) => sum + credit.principal_amount, 0);
    const weightedAvgRate = credits.reduce((sum, credit) => 
      sum + (credit.total_rate * credit.principal_amount), 0) / totalPrincipal;

    // Risk scenarios: +/-200bp rate shock
    const rateShock200bp = credits.map(credit => {
      const newRate = credit.total_rate + 2; // +200bp
      const rateChange = newRate - credit.total_rate;
      const estimatedImpact = credit.principal_amount * (rateChange / 100); // Simplified calculation
      
      return {
        name: credit.credit_name,
        currentRate: credit.total_rate,
        stressRate: newRate,
        impact: estimatedImpact,
        relativeImpact: (estimatedImpact / credit.principal_amount) * 100
      };
    });

    return rateShock200bp;
  };

  const formatCurrency = (amount: number, currency: string = 'RUB') => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const tabs = [
    { id: 'overview', label: 'Обзор', icon: PieChartIcon },
    { id: 'rates', label: 'Ставки', icon: TrendingUp },
    { id: 'schedule', label: 'График платежей', icon: Calendar },
    { id: 'risk', label: 'Анализ рисков', icon: AlertTriangle }
  ];

  if (credits.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Нет данных для визуализации
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Добавьте кредитные обязательства для отображения графиков
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Activity className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Анализ кредитных обязательств
          </h2>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1 mt-4 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Currency Breakdown */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                Структура по валютам
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getCurrencyBreakdown()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ currency, percentage }) => `${currency} ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {getCurrencyBreakdown().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getCurrencyBreakdown()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="currency" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="amount" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Maturity Profile */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                Профиль погашения
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMaturityProfile()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="amount" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rates' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                Структура процентных ставок
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getRateDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Bar dataKey="baseRate" stackId="a" fill="#3B82F6" name="Базовая ставка" />
                    <Bar dataKey="spread" stackId="a" fill="#F59E0B" name="Спред" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Interest Analysis */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                Анализ процентных платежей
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getRateDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="amount" fill="#10B981" name="Остаток задолженности" />
                    <Bar dataKey="interest" fill="#EF4444" name="Проценты" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rate Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Percent className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Мин. ставка</span>
                </div>
                <p className="text-xl font-bold text-blue-700">
                  {Math.min(...credits.map(c => c.total_rate)).toFixed(1)}%
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Макс. ставка</span>
                </div>
                <p className="text-xl font-bold text-green-700">
                  {Math.max(...credits.map(c => c.total_rate)).toFixed(1)}%
                </p>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600">Средняя ставка</span>
                </div>
                <p className="text-xl font-bold text-yellow-700">
                  {(credits.reduce((sum, c) => sum + c.total_rate, 0) / credits.length).toFixed(1)}%
                </p>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Всего процентов</span>
                </div>
                <p className="text-xl font-bold text-red-700">
                  {formatCurrency(credits.reduce((sum, c) => sum + (c.interest_amount || 0), 0))}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {selectedCredit ? (
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                  График платежей: {selectedCredit.credit_name}
                </h3>
                
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : paymentSchedule.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getPaymentScheduleChart()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => `Период ${label}`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="principal" 
                          stackId="1" 
                          stroke="#3B82F6" 
                          fill="#3B82F6" 
                          name="Остаток задолженности"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="interest" 
                          stackId="1" 
                          stroke="#F59E0B" 
                          fill="#F59E0B" 
                          name="Проценты"
                        />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      График платежей не найден для выбранного кредита
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Выберите кредит из списка для просмотра графика платежей
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                Анализ процентного риска (сценарий +200 б.п.)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getRiskAnalysis()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Кредит: ${label}`}
                    />
                    <Bar dataKey="impact" fill="#EF4444" name="Воздействие на P&L" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Summary */}
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h4 className="text-sm font-medium text-red-600">Сводка по рискам</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-red-700 dark:text-red-300">
                    <strong>Общее воздействие:</strong> {formatCurrency(
                      getRiskAnalysis().reduce((sum, item) => sum + item.impact, 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-red-700 dark:text-red-300">
                    <strong>Наиболее рискованный:</strong> {
                      getRiskAnalysis().reduce((max, item) => 
                        item.impact > max.impact ? item : max
                      ).name
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};