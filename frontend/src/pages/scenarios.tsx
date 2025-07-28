/**
 * Scenarios management page
 */

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { 
  Upload, 
  TrendingUp, 
  Calendar, 
  BarChart3,
  FileText,
  Plus,
  Trash2,
  Eye,
  Download,
  Shield
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { rateScenariosApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Scenario {
  id: number;
  name: string;
  code: string;
  scenario_type: string;
  description: string;
  created_at: string;
  forecasts: any[];
  is_admin_created?: boolean;
  can_delete?: boolean;
}

interface UploadResult {
  scenario_id: number;
  scenario_name: string;
  records_created: number;
  records_updated: number;
  errors: string[];
  warnings: string[];
}

export default function ScenariosPage() {
  const { user } = useAuthStore();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    scenarioId: number | null;
    scenarioName: string;
  }>({
    isOpen: false,
    scenarioId: null,
    scenarioName: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      setIsLoading(true);
      
      // Load both public scenarios and user scenarios if authenticated
      let allScenarios: Scenario[] = [];
      
      // Load public scenarios
      try {
        const publicResponse = await rateScenariosApi.getPublicScenarios();
        allScenarios = publicResponse.data?.scenarios || [];
      } catch (error) {
        console.warn('Could not load public scenarios:', error);
      }
      
      // Load user scenarios if authenticated
      if (user) {
        try {
          const userResponse = await rateScenariosApi.getScenarios();
          const userScenarios = userResponse.data?.scenarios || userResponse.data || [];
          
          // Merge and deduplicate scenarios
          const existingIds = new Set(allScenarios.map(s => s.id));
          userScenarios.forEach((scenario: Scenario) => {
            if (!existingIds.has(scenario.id)) {
              allScenarios.push(scenario);
            }
          });
        } catch (error) {
          console.warn('Could not load user scenarios:', error);
        }
      }
      
      setScenarios(allScenarios);
    } catch (error: any) {
      console.error('Error loading scenarios:', error);
      toast.error('Ошибка при загрузке сценариев');
      setScenarios([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
      } else {
        toast.error('Пожалуйста, выберите Excel файл (.xlsx или .xls)');
      }
    }
  };

  const handleUpload = async () => {
    if (!user) {
      toast.error('Для загрузки сценариев необходимо войти в систему');
      return;
    }

    if (!selectedFile) {
      toast.error('Выберите файл для загрузки');
      return;
    }

    try {
      setUploadLoading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await rateScenariosApi.uploadScenarios(formData);
      const results: UploadResult[] = response.data || [];
      
      // Show results
      const successCount = results.filter(r => r.errors.length === 0).length;
      const errorCount = results.filter(r => r.errors.length > 0).length;
      
      if (successCount > 0) {
        toast.success(`Успешно загружено сценариев: ${successCount}`);
      }
      
      if (errorCount > 0) {
        toast.error(`Ошибок при загрузке: ${errorCount}`);
      }
      
      // Show detailed results
      results.forEach(result => {
        if (result.errors.length === 0) {
          console.log(`✅ ${result.scenario_name}: ${result.records_created} записей`);
        } else {
          console.error(`❌ ${result.scenario_name}:`, result.errors);
        }
      });
      
      // Reset form and reload data
      setSelectedFile(null);
      if (successCount > 0) {
        await loadScenarios();
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка при загрузке файла');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteClick = (scenarioId: number, scenarioName: string) => {
    setDeleteConfirm({
      isOpen: true,
      scenarioId,
      scenarioName
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.scenarioId) return;

    try {
      setIsDeleting(true);
      await rateScenariosApi.deleteScenario(deleteConfirm.scenarioId);
      toast.success(`Сценарий "${deleteConfirm.scenarioName}" удален`);
      await loadScenarios();
      setDeleteConfirm({
        isOpen: false,
        scenarioId: null,
        scenarioName: ''
      });
    } catch (error) {
      console.error('Error deleting scenario:', error);
      toast.error('Ошибка при удалении сценария');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({
      isOpen: false,
      scenarioId: null,
      scenarioName: ''
    });
  };

  const showScenarioDetails = (scenario: Scenario) => {
    setSelectedScenario(scenario);
  };

  const getScenarioTypeLabel = (type: string) => {
    switch (type) {
      case 'BASE': return 'Базовый';
      case 'OPTIMISTIC': return 'Оптимистичный';
      case 'PESSIMISTIC': return 'Пессимистичный';
      case 'CONSERVATIVE': return 'Консервативный';
      case 'STRESS': return 'Стресс-тест';
      case 'CUSTOM': return 'Пользовательский';
      default: return 'Пользовательский';
    }
  };

  const getScenarioTypeColor = (type: string) => {
    switch (type) {
      case 'BASE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'OPTIMISTIC': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'PESSIMISTIC': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'CONSERVATIVE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'STRESS': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'CUSTOM': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Загрузка сценариев...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Prepare chart data for all scenarios
  const prepareChartData = () => {
    if (scenarios.length === 0) return [];

    // Get all unique dates from all scenarios
    const allDates = new Set<string>();
    scenarios.forEach(scenario => {
      scenario.forecasts?.forEach((forecast: any) => {
        allDates.add(forecast.forecast_date);
      });
    });

    // Sort dates
    const sortedDates = Array.from(allDates).sort();

    // Create chart data points
    return sortedDates.map(date => {
      const dateObj = new Date(date);
      const dataPoint: any = {
        date: dateObj.toLocaleDateString('ru-RU', { 
          year: 'numeric', 
          month: 'short' 
        }),
        fullDate: date,
        sortDate: dateObj.getTime() // Timestamp for proper time scaling
      };

      // Add data for each scenario
      scenarios.forEach(scenario => {
        const forecast = scenario.forecasts?.find((f: any) => f.forecast_date === date);
        if (forecast) {
          dataPoint[scenario.name] = forecast.rate_value;
        }
      });

      return dataPoint;
    });
  };

  const chartData = prepareChartData();

  // Calculate Y-axis domain based on forecast values
  const getYAxisDomain = () => {
    if (scenarios.length === 0) return ['auto', 'auto'];
    
    const allValues: number[] = [];
    scenarios.forEach(scenario => {
      scenario.forecasts?.forEach((forecast: any) => {
        if (typeof forecast.rate_value === 'number') {
          allValues.push(forecast.rate_value);
        }
      });
    });
    
    if (allValues.length === 0) return ['auto', 'auto'];
    
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    
    return [minValue - 1, maxValue + 1];
  };

  // Sort scenarios for consistent legend order
  const getSortedScenarios = () => {
    const typeOrder = {
      'BASE': 1,
      'CONSERVATIVE': 2,
      'OPTIMISTIC': 3,
      'PESSIMISTIC': 4,
      'STRESS': 5,
      'CUSTOM': 6
    };
    
    return [...scenarios].sort((a, b) => {
      const orderA = typeOrder[a.scenario_type as keyof typeof typeOrder] || 999;
      const orderB = typeOrder[b.scenario_type as keyof typeof typeOrder] || 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If same type, sort by name
      return a.name.localeCompare(b.name, 'ru');
    });
  };

  // Colors for different scenarios
  const getScenarioColor = (scenarioType: string, index: number) => {
    const colorMap: {[key: string]: string} = {
      'BASE': '#3B82F6',
      'OPTIMISTIC': '#10B981', 
      'PESSIMISTIC': '#EF4444',
      'CONSERVATIVE': '#F59E0B',
      'STRESS': '#8B5CF6',
      'CUSTOM': '#6B7280'
    };
    
    const defaultColors = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#6B7280', '#EC4899', '#14B8A6'];
    
    return colorMap[scenarioType] || defaultColors[index % defaultColors.length];
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Управление сценариями
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Загрузка и управление сценариями прогнозов ключевой ставки ЦБ РФ
          </p>
        </div>


        {/* Chart Section */}
        {scenarios.length > 0 && chartData.length > 0 && (
          <div className="mb-8">
            <Card className="p-6">
              <div className="flex items-center mb-6">
                <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Сравнение сценариев развития ключевой ставки
                </h2>
              </div>
              
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
                    <XAxis 
                      dataKey="sortDate"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      className="text-gray-600 dark:text-gray-400"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('ru-RU', { 
                          year: 'numeric', 
                          month: 'short' 
                        });
                      }}
                    />
                    <YAxis 
                      className="text-gray-600 dark:text-gray-400"
                      tick={{ fontSize: 12 }}
                      domain={getYAxisDomain()}
                      label={{ 
                        value: 'Ключевая ставка, %', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgb(255 255 255)',
                        border: '1px solid rgb(209 213 219)',
                        borderRadius: '6px'
                      }}
                      formatter={(value: any, name: string) => [`${value}%`, name]}
                      labelFormatter={(label: string, payload: any) => {
                        if (payload && payload[0]?.payload?.fullDate) {
                          const fullDate = new Date(payload[0].payload.fullDate);
                          return `Период: ${fullDate.toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long'
                          })}`;
                        }
                        return `Период: ${label}`;
                      }}
                    />
                    <Legend />
                    
                    {getSortedScenarios().map((scenario, index) => (
                      <Line
                        key={scenario.id}
                        type="monotone"
                        dataKey={scenario.name}
                        stroke={getScenarioColor(scenario.scenario_type, index)}
                        strokeWidth={2}
                        dot={{ r: 3, fill: getScenarioColor(scenario.scenario_type, index) }}
                        activeDot={{ r: 5, fill: getScenarioColor(scenario.scenario_type, index) }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p>График показывает прогнозы ключевой ставки ЦБ РФ по всем загруженным сценариям</p>
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Upload */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <Upload className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Загрузка сценариев
                </h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Excel файл с прогнозами
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      dark:file:bg-blue-900 dark:file:text-blue-300
                      dark:hover:file:bg-blue-800"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Выбран файл: {selectedFile.name}
                    </p>
                  )}
                </div>
                
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadLoading || !user}
                  icon={Upload}
                  className="w-full"
                >
                  {uploadLoading ? 'Загрузка...' : 
                   !user ? 'Войдите для загрузки' : 
                   'Загрузить сценарии'}
                </Button>
                
                {!user && (
                  <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                    💡 Для загрузки собственных сценариев необходимо войти в систему
                  </p>
                )}
              </div>
              
              <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                <h3 className="font-medium mb-2">Формат файла:</h3>
                <ul className="space-y-1">
                  <li>• Колонка A: Дата (Июль 2025, Декабрь 2026, ...)</li>
                  <li>• Колонка B: Базовый сценарий</li>
                  <li>• Колонка C: Консервативный сценарий</li>
                  <li>• Колонка D: Оптимистичный сценарий</li>
                  <li>• Значения ставок в процентах (19, 18.5, ...)</li>
                </ul>
              </div>
            </Card>
          </div>

          {/* Right Panel - Scenarios List */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Загруженные сценарии
                  </h2>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Всего: {scenarios.length}
                </div>
              </div>

              {scenarios.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Нет загруженных сценариев
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Загрузите Excel файл с прогнозами ключевой ставки
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {scenario.name}
                            </h3>
                            {scenario.is_admin_created && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScenarioTypeColor(scenario.scenario_type)}`}>
                              {getScenarioTypeLabel(scenario.scenario_type)}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                            {scenario.description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(scenario.created_at).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            onClick={() => showScenarioDetails(scenario)}
                          >
                            Просмотр
                          </Button>
                          {scenario.can_delete === true && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteClick(scenario.id, scenario.name)}
                            >
                              Удалить
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Scenario Details Modal */}
        {selectedScenario && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {selectedScenario.name}
                </h2>
                <button
                  onClick={() => setSelectedScenario(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScenarioTypeColor(selectedScenario.scenario_type)}`}>
                    {getScenarioTypeLabel(selectedScenario.scenario_type)}
                  </span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedScenario.description}
                </p>
                
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Прогнозные значения ключевой ставки
                  </h3>
                  
                  {selectedScenario.forecasts && selectedScenario.forecasts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Дата
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Ставка, %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {selectedScenario.forecasts.map((forecast: any, index: number) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {new Date(forecast.forecast_date).toLocaleDateString('ru-RU', {
                                  year: 'numeric',
                                  month: 'long'
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                                {forecast.rate_value}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Нет данных прогнозов
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Удалить сценарий"
          message={`Вы действительно хотите удалить сценарий "${deleteConfirm.scenarioName}"? Это действие нельзя отменить. Все связанные прогнозы также будут удалены.`}
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}