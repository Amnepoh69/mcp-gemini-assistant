/**
 * Payment schedule dropdown component for credit obligations
 */

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, DollarSign, Percent, Clock, FileText, Download, Upload, X, BarChart3, Table } from 'lucide-react';
import { ExpandToggle } from '@/components/ui/ExpandToggle';
import { Button } from '@/components/ui/Button';
import { creditsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { PaymentScheduleChart } from './PaymentScheduleChart';

interface PaymentScheduleItem {
  id: number;
  period_number: number;
  period_start_date: string;
  period_end_date: string;
  payment_date: string;
  principal_amount: number;
  interest_amount: number;
  total_payment: number;
  period_days: number;
  interest_rate: number;
  base_rate: number;
  spread: number;
  notes?: string;
}

interface PaymentScheduleDropdownProps {
  creditId: number;
  creditName: string;
  currency: string;
  baseRateValue?: number;
  creditSpread?: number;
  onScheduleUploaded?: () => void;
}

export const PaymentScheduleDropdown: React.FC<PaymentScheduleDropdownProps> = ({
  creditId,
  creditName,
  currency,
  baseRateValue = 16.0,
  creditSpread = 3.5,
  onScheduleUploaded
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number, curr: string = currency) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: curr
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const loadSchedule = async () => {
    if (schedule.length > 0) return; // Already loaded

    try {
      setIsLoading(true);
      setError(null);
      const response = await creditsApi.getSchedule(creditId);
      setSchedule(response.data);
    } catch (error: any) {
      console.error('Error loading payment schedule:', error);
      setError('Не удалось загрузить график платежей');
      toast.error('Ошибка при загрузке графика платежей');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      loadSchedule();
    }
    setIsOpen(!isOpen);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Поддерживаются только Excel файлы (.xlsx, .xls)');
      return;
    }

    try {
      setIsUploading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('credit_name', creditName);
      formData.append('currency', currency);
      formData.append('base_rate_indicator', 'KEY_RATE');
      formData.append('base_rate_value', baseRateValue.toString());
      formData.append('credit_spread', creditSpread.toString());

      const response = await creditsApi.uploadSchedule(formData);
      
      toast.success('График платежей успешно загружен');
      
      // Reload the schedule
      setSchedule([]);
      await loadSchedule();
      setShowUploadArea(false);
      
      // Notify parent component
      if (onScheduleUploaded) {
        onScheduleUploaded();
      }
      
    } catch (error: any) {
      console.error('Error uploading schedule:', error);
      toast.error(error.response?.data?.detail || 'Ошибка при загрузке файла');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Principal amount is the maximum nominal value from schedule (initial debt)
  const totalPrincipal = schedule.length > 0 ? Math.max(...schedule.map(item => item.principal_amount)) : 0;
  const totalInterest = schedule.reduce((sum, item) => sum + (item.interest_amount || 0), 0);
  const totalPayments = schedule.reduce((sum, item) => sum + (item.total_payment || 0), 0);

  return (
    <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            График платежей
          </span>
          {schedule.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({schedule.length} периодов)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isLoading && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          )}
          <ExpandToggle isExpanded={isOpen} />
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-800">
          {error ? (
            <div className="p-4 text-center text-red-600 dark:text-red-400">
              <p>{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadSchedule}
                className="mt-2"
              >
                Попробовать снова
              </Button>
            </div>
          ) : schedule.length === 0 ? (
            <div className="p-4">
              {!showUploadArea ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="mb-2">График платежей не найден</p>
                  <p className="text-xs mb-4">
                    Загрузите файл с детальным графиком платежей для отображения данных
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowUploadArea(true)}
                    icon={Upload}
                  >
                    Загрузить график
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Upload Area Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Загрузка графика платежей
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUploadArea(false)}
                      icon={X}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Закрыть
                    </Button>
                  </div>

                  {/* Upload Parameters */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Параметры для расчета:
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Кредит:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {creditName}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Валюта:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {currency}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Базовая ставка:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {baseRateValue}%
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Спред:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {creditSpread}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* File Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isUploading
                        ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                    }`}
                    onClick={!isUploading ? handleFileSelect : undefined}
                  >
                    {isUploading ? (
                      <div className="space-y-2">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          Загрузка и обработка файла...
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Нажмите для выбора файла
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Поддерживаются Excel файлы (.xlsx, .xls)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <h5 className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Требования к файлу:
                    </h5>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>• Файл должен содержать колонки: "Дата начала", "Дата конца", "Дата платежа", "Номинал"</li>
                      <li>• Первая строка должна содержать заголовки</li>
                      <li>• Даты в формате YYYY-MM-DD или DD.MM.YYYY</li>
                      <li>• Дата платежа - конец процентного периода и дата уплаты процентов</li>
                      <li>• Номинал - остаток основного долга на начало периода</li>
                      <li>• Базовая ставка загружается автоматически из рыночных данных</li>
                    </ul>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Header with view mode toggle */}
              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Сводка по графику
                  </h4>
                  
                  {/* View Mode Toggle */}
                  <div className="flex items-center space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        viewMode === 'table'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      <Table className="h-3 w-3 inline mr-1" />
                      Таблица
                    </button>
                    <button
                      onClick={() => setViewMode('chart')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        viewMode === 'chart'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      <BarChart3 className="h-3 w-3 inline mr-1" />
                      График
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Основной долг:</span>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {formatCurrency(totalPrincipal)}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Проценты:</span>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {formatCurrency(totalInterest)}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Всего платежей:</span>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {formatCurrency(totalPayments)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content based on view mode */}
              {viewMode === 'table' ? (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">
                          №
                        </th>
                        <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">
                          Период
                        </th>
                        <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">
                          Дата платежа
                        </th>
                        <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">
                          Остаток долга
                        </th>
                        <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">
                          Проценты
                        </th>
                        <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">
                          Дни
                        </th>
                        <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">
                          Ставка
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-700/30'
                          }`}
                        >
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100 font-medium">
                            {item.period_number}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            <div>
                              <div>{formatDate(item.period_start_date)}</div>
                              <div className="text-gray-500">- {formatDate(item.period_end_date)}</div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                            {formatDate(item.payment_date)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100 font-medium">
                            {formatCurrency(item.principal_amount)}
                          </td>
                          <td className="px-3 py-2 text-right text-green-600 dark:text-green-400 font-medium">
                            {item.interest_amount ? formatCurrency(item.interest_amount) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                            {item.period_days || '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                            {item.interest_rate ? `${item.interest_rate.toFixed(2)}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 max-h-[600px] overflow-y-auto">
                  <PaymentScheduleChart
                    schedule={schedule}
                    currency={currency}
                    creditName={creditName}
                  />
                </div>
              )}

              {/* Footer Actions */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Всего периодов: {schedule.length}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Download}
                    className="text-xs"
                    onClick={() => {
                      // TODO: Implement export functionality
                      toast('Экспорт будет реализован позже');
                    }}
                  >
                    Экспорт
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};