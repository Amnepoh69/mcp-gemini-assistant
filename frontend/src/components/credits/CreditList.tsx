/**
 * Credit obligations list component
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  Percent, 
  Edit2, 
  Trash2,
  Plus,
  Upload,
  Download,
  TrendingUp,
  AlertCircle,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CreditObligation, PaymentFrequency, PaymentType } from '@/types/credit';
import { creditsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { PaymentScheduleDropdown } from './PaymentScheduleDropdown';

interface CreditListProps {
  onEdit?: (credit: CreditObligation) => void;
  onCreditsChange?: () => void;
  className?: string;
  refreshTrigger?: number; // Add trigger to force refresh
}

export const CreditList: React.FC<CreditListProps> = ({
  onEdit,
  onCreditsChange,
  className = '',
  refreshTrigger
}) => {
  const [credits, setCredits] = useState<CreditObligation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    creditId: number | null;
    creditName: string;
  }>({
    isOpen: false,
    creditId: null,
    creditName: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [recalculatingCredits, setRecalculatingCredits] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadCredits();
    loadSummary();
  }, []);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      loadCredits();
    }
  }, [refreshTrigger]);

  const loadCredits = async () => {
    try {
      setIsLoading(true);
      const response = await creditsApi.getCredits();
      setCredits(response.data);
    } catch (error: any) {
      console.error('Error loading credits:', error);
      toast.error('Ошибка при загрузке кредитов');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await creditsApi.getSummary();
      setSummary(response.data);
    } catch (error: any) {
      console.error('Error loading summary:', error);
    }
  };

  const handleDeleteClick = (creditId: number, creditName: string) => {
    setDeleteConfirm({
      isOpen: true,
      creditId,
      creditName
    });
  };

  const handleRecalculateInterest = async (creditId: number, creditName: string) => {
    try {
      setRecalculatingCredits(prev => new Set(prev).add(creditId));
      
      const response = await creditsApi.recalculateInterest(creditId);
      
      toast.success(`Проценты пересчитаны для "${creditName}"`);
      
      // Show detailed results
      const { summary, recalculated_periods } = response.data;
      const periodsWithChanges = recalculated_periods.filter((p: any) => Math.abs(p.difference) > 0.01);
      
      if (periodsWithChanges.length > 0) {
        const totalDifference = summary.total_difference;
        toast.success(
          `Пересчет завершен:\n` +
          `Изменено периодов: ${periodsWithChanges.length}\n` +
          `Общее изменение: ${totalDifference > 0 ? '+' : ''}${totalDifference.toFixed(2)} руб.`,
          { duration: 5000 }
        );
      } else {
        toast('Изменений в расчете процентов не выявлено');
      }
      
      // Reload credits to show updated values
      await loadCredits();
      
    } catch (error: any) {
      console.error('Error recalculating interest:', error);
      toast.error(
        error.response?.data?.detail || 'Ошибка при пересчете процентов'
      );
    } finally {
      setRecalculatingCredits(prev => {
        const newSet = new Set(prev);
        newSet.delete(creditId);
        return newSet;
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.creditId) return;

    try {
      setIsDeleting(true);
      await creditsApi.deleteCredit(deleteConfirm.creditId);
      toast.success('Кредит удален');
      loadCredits();
      loadSummary();
      onCreditsChange?.();
      setDeleteConfirm({
        isOpen: false,
        creditId: null,
        creditName: ''
      });
    } catch (error: any) {
      console.error('Error deleting credit:', error);
      toast.error('Ошибка при удалении кредита');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({
      isOpen: false,
      creditId: null,
      creditName: ''
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await creditsApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_credits.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Шаблон загружен');
    } catch (error: any) {
      console.error('Error downloading template:', error);
      toast.error('Ошибка при загрузке шаблона');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  // Функция расчета дюрации кредита (дюрация Маколея)
  const calculateCreditDuration = (credit: CreditObligation): number => {
    const startDate = new Date(credit.start_date);
    const endDate = new Date(credit.end_date);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalYears = totalDays / 365;
    const rate = credit.total_rate / 100;
    const principal = credit.principal_amount;
    
    // Определяем количество периодов в году
    const periodsPerYear = credit.payment_frequency === 'MONTHLY' ? 12 : 
                          credit.payment_frequency === 'QUARTERLY' ? 4 :
                          credit.payment_frequency === 'SEMI_ANNUAL' ? 2 : 1;
    
    const totalPeriods = Math.ceil(totalYears * periodsPerYear);
    const periodRate = rate / periodsPerYear;

    // Детальное логирование для "Тестовый кредит 2"
    if (credit.credit_name?.includes('Тестовый кредит 2')) {
      console.log('=== РАСЧЕТ ДЮРАЦИИ для', credit.credit_name, '===');
      console.log('Параметры кредита:');
      console.log('- Сумма:', principal.toLocaleString(), credit.currency);
      console.log('- Ставка:', credit.total_rate + '%');
      console.log('- Срок:', `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
      console.log('- Дней:', totalDays, 'лет:', totalYears.toFixed(2));
      console.log('- Тип платежей:', credit.payment_type);
      console.log('- Периодичность:', credit.payment_frequency, '(' + periodsPerYear, 'раз в год)');
      console.log('- Периодов всего:', totalPeriods);
      console.log('- Ставка за период:', (periodRate * 100).toFixed(4) + '%');
    }
    
    if (credit.payment_type === 'BULLET' || credit.payment_type === 'INTEREST_ONLY') {
      // Для bullet-кредитов дюрация приближается к сроку погашения
      // Учитываем только процентные платежи до погашения
      let duration = 0;
      let presentValue = 0;
      
      // Процентные платежи
      const interestPayment = principal * periodRate;
      for (let i = 1; i <= totalPeriods; i++) {
        const time = i / periodsPerYear;
        const pv = interestPayment / Math.pow(1 + periodRate, i);
        duration += time * pv;
        presentValue += pv;
      }
      
      // Основной долг в конце
      const principalPV = principal / Math.pow(1 + periodRate, totalPeriods);
      duration += totalYears * principalPV;
      presentValue += principalPV;
      
      const result = presentValue > 0 ? duration / presentValue : totalYears;
      
      if (credit.credit_name?.includes('Тестовый кредит 2')) {
        console.log('BULLET расчет завершен. Дюрация:', result.toFixed(2), 'лет');
      }
      
      return result;
    } else {
      // Для аннуитетных и дифференцированных кредитов
      const annuityPayment = principal * (periodRate * Math.pow(1 + periodRate, totalPeriods)) / 
                            (Math.pow(1 + periodRate, totalPeriods) - 1);
      
      if (credit.credit_name?.includes('Тестовый кредит 2')) {
        console.log('Аннуитетный платеж:', annuityPayment.toLocaleString());
      }
      
      let duration = 0;
      let presentValue = 0;
      
      for (let i = 1; i <= totalPeriods; i++) {
        const time = i / periodsPerYear;
        const pv = annuityPayment / Math.pow(1 + periodRate, i);
        duration += time * pv;
        presentValue += pv;
        
        if (credit.credit_name?.includes('Тестовый кредит 2') && i <= 5) {
          console.log(`Период ${i}: время=${time.toFixed(2)}, PV=${pv.toLocaleString()}, накопленная дюрация=${duration.toFixed(2)}`);
        }
      }
      
      const result = presentValue > 0 ? duration / presentValue : totalYears * 0.5;
      
      if (credit.credit_name?.includes('Тестовый кредит 2')) {
        console.log('Итого PV:', presentValue.toLocaleString());
        console.log('Итоговая дюрация:', result.toFixed(2), 'лет');
        console.log('=== КОНЕЦ РАСЧЕТА ===');
      }
      
      return result;
    }
  };

  const getPaymentFrequencyLabel = (frequency: PaymentFrequency) => {
    const labels = {
      [PaymentFrequency.MONTHLY]: 'Ежемесячно',
      [PaymentFrequency.QUARTERLY]: 'Ежеквартально',
      [PaymentFrequency.SEMI_ANNUAL]: 'Полугодично',
      [PaymentFrequency.ANNUAL]: 'Ежегодно'
    };
    return labels[frequency] || frequency;
  };

  const getPaymentTypeLabel = (type: PaymentType) => {
    const labels = {
      [PaymentType.ANNUITY]: 'Аннуитет',
      [PaymentType.DIFFERENTIATED]: 'Дифференцированный',
      [PaymentType.BULLET]: 'В конце срока',
      [PaymentType.INTEREST_ONLY]: 'Только проценты'
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-end">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadTemplate}
              icon={Download}
            >
              Шаблон
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Всего кредитов
                </span>
              </div>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {summary.total_count}
              </p>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Основной долг
                </span>
              </div>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                {formatCurrency(summary.total_principal, 'RUB')}
              </p>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Percent className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  Проценты
                </span>
              </div>
              <p className="text-lg font-bold text-red-700 dark:text-red-300">
                {summary.total_interest ? formatCurrency(summary.total_interest, 'RUB') : '-'}
              </p>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Percent className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Средняя ставка
                </span>
              </div>
              <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                {summary.avg_rate}%
              </p>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Всего к выплате
                </span>
              </div>
              <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                {summary.total_payments ? formatCurrency(summary.total_payments, 'RUB') : '-'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Credits List */}
      <div className="p-6">
        {credits.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Нет кредитов
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Добавьте первый кредит для начала анализа
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {credits.map((credit) => (
              <div
                key={credit.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {credit.credit_name}
                      </h3>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                        {credit.currency}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Сумма:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(credit.principal_amount, credit.currency)}
                        </p>
                      </div>
                      
                      
                      
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Период:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(credit.start_date)} - {formatDate(credit.end_date)}
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Платежи:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {getPaymentFrequencyLabel(credit.payment_frequency)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {credit.base_rate_indicator === 'FIXED' ? (
                        <span>Фиксированная ставка: {credit.base_rate_value}%</span>
                      ) : (
                        <>
                          <span>Базовая ставка: {credit.base_rate_indicator}</span>
                          <span className="mx-2">+</span>
                          <span>Спред: {credit.credit_spread}%</span>
                        </>
                      )}
                      <span className="mx-2">•</span>
                      <span>Тип: {getPaymentTypeLabel(credit.payment_type)}</span>
                      {credit.total_payment && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="font-medium">Всего к выплате: {formatCurrency(credit.total_payment, credit.currency)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(credit)}
                        icon={Edit2}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Изменить
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(credit.id!, credit.credit_name)}
                      icon={Trash2}
                      className="text-red-600 hover:text-red-700"
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
                
                {/* Payment Schedule Dropdown */}
                <div className="mt-4">
                  <PaymentScheduleDropdown
                    creditId={credit.id!}
                    creditName={credit.credit_name}
                    currency={credit.currency}
                    baseRateValue={credit.base_rate_value}
                    creditSpread={credit.credit_spread}
                    onScheduleUploaded={() => {
                      // Reload credits and summary when schedule is uploaded
                      loadCredits();
                      loadSummary();
                      if (onCreditsChange) {
                        onCreditsChange();
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Удалить кредит"
        message={`Вы действительно хотите удалить кредит "${deleteConfirm.creditName}"? Это действие нельзя отменить. Все связанные данные, включая график платежей, также будут удалены.`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};