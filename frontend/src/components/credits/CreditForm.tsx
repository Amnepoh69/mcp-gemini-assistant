/**
 * Credit obligation form component for manual data entry
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { DollarSign, Clock, FileText, Plus, X, Upload, Percent, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SimpleDatePicker } from '@/components/ui/SimpleDatePicker';
import { PaymentScheduleForm } from './PaymentScheduleForm';
import { 
  CreditObligation, 
  PaymentFrequency, 
  PaymentType, 
  PaymentScheduleEntry,
  BASE_RATE_INDICATORS,
  SUPPORTED_CURRENCIES 
} from '@/types/credit';
import { creditsApi, cbrApi } from '@/lib/api';
import { generatePaymentSchedule, validateCreditParams } from '@/utils/paymentScheduleGenerator';

interface CreditFormProps {
  onSubmit?: (credit: CreditObligation) => void;
  onCancel?: () => void;
  initialData?: Partial<CreditObligation>;
  isEdit?: boolean;
}

export const CreditForm: React.FC<CreditFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEdit = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentKeyRate, setCurrentKeyRate] = useState<number | null>(null);
  const [currentRuonia, setCurrentRuonia] = useState<number | null>(null);
  const [paymentScheduleEntries, setPaymentScheduleEntries] = useState<PaymentScheduleEntry[]>([]);
  const [displayPrincipalAmount, setDisplayPrincipalAmount] = useState('');
  const [scheduleFormKey, setScheduleFormKey] = useState('schedule-form-1');
  const [hasScheduleValidationErrors, setHasScheduleValidationErrors] = useState(false);
  const loadedScheduleForCreditId = useRef<number | null>(null);
  
  // Get current date in local timezone for default values
  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    clearErrors,
    formState: { errors },
    trigger
  } = useForm<CreditObligation>({
    defaultValues: {
      credit_name: '',
      principal_amount: '' as any,
      currency: 'RUB',
      start_date: getCurrentDate(),
      end_date: '',
      base_rate_indicator: 'KEY_RATE',
      base_rate_value: '' as any,
      credit_spread: '' as any,
      payment_frequency: PaymentFrequency.MONTHLY,
      payment_type: PaymentType.DIFFERENTIATED
    }
  });

  // Helper function to parse numbers with both comma and dot as decimal separators
  const parseNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Remove spaces and replace comma with dot for parsing
    const normalizedValue = String(value).replace(/\s/g, '').replace(',', '.');
    return parseFloat(normalizedValue) || 0;
  };

  // Helper function to format number with thousand separators (Russian format)
  const formatNumberWithSpaces = (value: string | number): string => {
    if (!value) return '';
    // Remove all non-numeric characters except dot and comma
    const cleanValue = String(value).replace(/[^\d.,]/g, '');
    // Handle both dot and comma as decimal separators
    let parts: string[];
    if (cleanValue.includes(',')) {
      parts = cleanValue.split(',');
    } else if (cleanValue.includes('.')) {
      parts = cleanValue.split('.');
    } else {
      parts = [cleanValue];
    }
    
    // Format integer part with spaces
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    // Join back with comma as decimal separator (Russian standard)
    return parts.length > 1 ? parts[0] + ',' + parts[1] : parts[0];
  };

  // Helper function to safely get error message
  const getErrorMessage = (error: any): string | undefined => {
    if (!error) return undefined;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error.message) return error.message;
    return undefined;
  };

  const baseRateValue = watch('base_rate_value');
  const creditSpread = watch('credit_spread');
  const baseRateIndicator = watch('base_rate_indicator');
  const currency = watch('currency');
  const startDate = watch('start_date');
  const endDate = watch('end_date');
  
  // Get label for base rate field based on selected indicator
  const getBaseRateLabel = () => {
    const indicator = BASE_RATE_INDICATORS.find(i => i.value === baseRateIndicator);
    return indicator ? indicator.label : 'Процентная ставка';
  };
  const totalRate = baseRateIndicator === 'FIXED' 
    ? parseNumber(baseRateValue) 
    : parseNumber(baseRateValue) + parseNumber(creditSpread);

  // Function to validate payment schedule entries
  const validatePaymentScheduleEntries = (entries: PaymentScheduleEntry[], creditStartDate: string, creditEndDate: string): boolean => {
    if (!entries || entries.length === 0) return true; // No schedule is valid
    if (!creditStartDate || !creditEndDate) return true; // Skip if credit dates not set
    
    const creditStart = new Date(creditStartDate);
    const creditEnd = new Date(creditEndDate);
    
    for (const entry of entries) {
      if (entry.period_start_date && entry.period_end_date) {
        const periodStart = new Date(entry.period_start_date);
        const periodEnd = new Date(entry.period_end_date);
        
        // Check if period start is before credit start
        if (periodStart < creditStart) {
          return false;
        }
        
        // Check if period end is after credit end
        if (periodEnd > creditEnd) {
          return false;
        }
      }
    }
    
    return true;
  };

  // Function to get currency symbol element
  const getCurrencySymbol = (currencyCode: string) => {
    const textProps = { 
      className: "text-gray-500 dark:text-gray-500 text-xl font-medium select-none w-5 h-5 flex items-center justify-center"
    };
    
    switch (currencyCode) {
      case 'RUB':
        return <span {...textProps}>₽</span>;
      case 'USD':
        return <span {...textProps}>$</span>;
      case 'EUR':
        return <span {...textProps}>€</span>;
      case 'CNY':
        return <span {...textProps}>¥</span>;
      default:
        return <span {...textProps}>$</span>;
    }
  };

  // Helper function to format date for input field without timezone issues
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Parse the date string and format it as YYYY-MM-DD
    // This handles both ISO strings and other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Use local timezone to avoid shifting dates
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Load current key rate and RUONIA from CBR
  useEffect(() => {
    const loadRates = async () => {
      // Load key rate
      try {
        const keyRateResponse = await cbrApi.getCurrentRate();
        setCurrentKeyRate(keyRateResponse.data.rate);
      } catch (error) {
        console.error('Error loading key rate:', error);
        setCurrentKeyRate(null);
      }
      
      // Load RUONIA
      try {
        const ruoniaResponse = await cbrApi.getCurrentRuonia();
        setCurrentRuonia(ruoniaResponse.data.rate);
      } catch (error) {
        console.error('Error loading RUONIA:', error);
        setCurrentRuonia(null);
      }
    };
    loadRates();
  }, []);

  // Update base_rate_value when baseRateIndicator changes
  useEffect(() => {
    // Clear validation errors when switching indicators
    if (baseRateIndicator === 'FIXED') {
      clearErrors('credit_spread');
    } else {
      clearErrors('base_rate_value');
    }
    
    if (baseRateIndicator === 'KEY_RATE') {
      if (currentKeyRate !== null) {
        setValue('base_rate_value', currentKeyRate);
      } else {
        setValue('base_rate_value', '' as any);
      }
    } else if (baseRateIndicator === 'RUONIA') {
      if (currentRuonia !== null) {
        setValue('base_rate_value', currentRuonia);
      } else {
        setValue('base_rate_value', '' as any);
      }
    } else if (baseRateIndicator === 'FIXED') {
      // Clear the field for fixed rate
      setValue('base_rate_value', '' as any);
      // Also clear credit spread for fixed rate
      setValue('credit_spread', '' as any);
    }
  }, [baseRateIndicator, currentKeyRate, currentRuonia, setValue, clearErrors]);

  // Load payment schedule for editing
  const loadPaymentSchedule = async (creditId: number) => {
    // Prevent duplicate loading using ref
    if (loadedScheduleForCreditId.current === creditId) {
      console.log('Schedule already loaded for credit:', creditId);
      return;
    }
    
    // Set immediately to prevent race conditions
    loadedScheduleForCreditId.current = creditId;
    
    try {
      const response = await creditsApi.getSchedule(creditId);
      
      if (response.data && response.data.length > 0) {
        // Map API response to our component format
        // API returns principal_amount, but our component expects outstanding_balance
        const mappedEntries = response.data.map((entry: any) => ({
          period_start_date: entry.period_start_date?.split('T')[0] || entry.period_start_date,
          period_end_date: entry.period_end_date?.split('T')[0] || entry.period_end_date,
          payment_date: entry.payment_date?.split('T')[0] || entry.payment_date,
          outstanding_balance: entry.principal_amount || 0 // Map principal_amount to outstanding_balance
        }));
        
        setPaymentScheduleEntries(mappedEntries);
        setScheduleFormKey(`schedule-form-${Date.now()}`);
        toast.success(`Загружен график платежей (${mappedEntries.length} записей)`);
      } else {
        console.log('No payment schedule found for credit:', creditId);
        // Don't show error - it's normal for credits to not have schedules yet
      }
    } catch (error: any) {
      console.error('Error loading payment schedule:', error);
      toast.error('Ошибка при загрузке графика платежей');
      // Reset ref on error so user can retry
      loadedScheduleForCreditId.current = null;
    }
  };

  // Update form when initialData changes
  useEffect(() => {
    if (initialData && isEdit) {
      const formattedStartDate = formatDateForInput(initialData.start_date || '');
      const formattedEndDate = formatDateForInput(initialData.end_date || '');
      
      // Format principal amount for display
      setDisplayPrincipalAmount(formatNumberWithSpaces(initialData.principal_amount || 0));
      
      reset({
        credit_name: initialData.credit_name || '',
        principal_amount: initialData.principal_amount || 0,
        currency: initialData.currency || 'RUB',
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        base_rate_indicator: initialData.base_rate_indicator || 'KEY_RATE',
        base_rate_value: initialData.base_rate_value || 0,
        credit_spread: initialData.credit_spread || 0,
        payment_frequency: initialData.payment_frequency || PaymentFrequency.MONTHLY,
        payment_type: initialData.payment_type || PaymentType.ANNUITY
      });

      // Load existing payment schedule if editing (only once per credit)
      if (initialData.id && loadedScheduleForCreditId.current !== initialData.id) {
        loadPaymentSchedule(initialData.id);
      }
    }
  }, [initialData, isEdit, reset]);

  // Validate payment schedule when entries or dates change
  useEffect(() => {
    const isScheduleValid = validatePaymentScheduleEntries(paymentScheduleEntries, startDate, endDate);
    setHasScheduleValidationErrors(!isScheduleValid);
  }, [paymentScheduleEntries, startDate, endDate]);


  const paymentFrequencyOptions = [
    { value: PaymentFrequency.MONTHLY, label: 'Ежемесячно' },
    { value: PaymentFrequency.QUARTERLY, label: 'Ежеквартально' },
    { value: PaymentFrequency.SEMI_ANNUAL, label: 'Полугодично' },
    { value: PaymentFrequency.ANNUAL, label: 'Ежегодно' }
  ];

  const paymentTypeOptions = [
    { value: PaymentType.DIFFERENTIATED, label: 'Дифференцированные платежи' },
    { value: PaymentType.BULLET, label: 'Погашение в конце срока (отсрочка)' },
    { value: PaymentType.INTEREST_ONLY, label: 'Погашение в конце срока (амортизация)' }
  ];


  // Function to save payment schedule entries when user clicks save
  const handlePaymentScheduleSave = useCallback((entries: PaymentScheduleEntry[]) => {
    console.log('CreditForm received payment schedule save:', entries);
    setPaymentScheduleEntries(entries);
  }, []);


  const handleGenerateSchedule = () => {
    const formData = watch();
    
    // Validate form data
    const errors = validateCreditParams({
      principal_amount: parseNumber(formData.principal_amount),
      start_date: formData.start_date,
      end_date: formData.end_date,
      payment_frequency: formData.payment_frequency,
      payment_type: formData.payment_type,
      total_rate: totalRate
    });
    
    if (errors.length > 0) {
      toast.error(`Для генерации графика необходимо заполнить:\n${errors.join('\n')}`);
      return;
    }
    
    // Generate schedule
    const generatedSchedule = generatePaymentSchedule({
      principal_amount: parseNumber(formData.principal_amount),
      start_date: formData.start_date,
      end_date: formData.end_date,
      payment_frequency: formData.payment_frequency,
      payment_type: formData.payment_type,
      total_rate: totalRate
    });
    
    if (generatedSchedule.length === 0) {
      toast.error('Не удалось сгенерировать график платежей. Проверьте параметры кредита.');
      return;
    }
    
    setPaymentScheduleEntries(generatedSchedule);
    setScheduleFormKey(`schedule-form-${Date.now()}`); // Force re-render of PaymentScheduleForm
    toast.success(`График платежей сгенерирован (${generatedSchedule.length} записей)`);
  };

  const handleFormSubmit = async (data: CreditObligation) => {
    try {
      setIsSubmitting(true);
      
      // Check for payment schedule validation errors
      if (hasScheduleValidationErrors) {
        toast.error('Исправьте ошибки в графике платежей перед сохранением кредита');
        setIsSubmitting(false);
        return;
      }
      
      console.log('Form submission - current paymentScheduleEntries:', paymentScheduleEntries);
      
      // Convert string values to numbers manually to preserve exact user input
      // Note: total_rate is calculated automatically by backend, don't send it
      const creditData = {
        ...data,
        principal_amount: parseNumber(data.principal_amount as any),
        base_rate_value: parseNumber(data.base_rate_value as any),
        credit_spread: baseRateIndicator === 'FIXED' ? 0 : parseNumber(data.credit_spread as any),
        // Convert dates to ISO format for backend
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString()
      };
      
      let response;
      if (isEdit && initialData?.id) {
        response = await creditsApi.updateCredit(initialData.id, creditData);
      } else {
        response = await creditsApi.createCredit(creditData);
      }
      
      if (!response || !response.data) {
        throw new Error('Invalid API response - no data received');
      }

      // If there's a payment schedule, save it along with the credit
      if (paymentScheduleEntries.length > 0 && response.data?.id) {
        try {
          console.log('=== SAVING SCHEDULE ===');
          console.log('Credit ID:', response.data.id);
          console.log('Schedule entries to save:', paymentScheduleEntries);
          paymentScheduleEntries.forEach((entry, index) => {
            console.log(`Entry ${index}:`, {
              dates: `${entry.period_start_date} -> ${entry.period_end_date}`,
              payment: entry.payment_date,
              balance: entry.outstanding_balance,
              balanceType: typeof entry.outstanding_balance
            });
          });
          
          const saveResponse = await creditsApi.savePaymentSchedule(response.data.id, paymentScheduleEntries);
          console.log('=== SAVE RESPONSE ===', saveResponse);
          toast.success('График платежей сохранен вместе с кредитом');
        } catch (scheduleError) {
          console.error('=== SAVE ERROR ===', scheduleError);
          toast.error('Кредит сохранен, но возникла ошибка при сохранении графика платежей');
        }
      } else {
        console.log('No payment schedule entries to save, current entries:', paymentScheduleEntries);
      }

      toast.success(isEdit ? 'Кредит обновлен' : 'Кредит добавлен');
      
      if (onSubmit) {
        onSubmit(response.data);
      }
      
    } catch (error: any) {
      console.error('Error saving credit obligation:', error);
      toast.error(error.response?.data?.detail || 'Ошибка при сохранении кредита');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      {isEdit && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Редактировать кредит
              </h2>
              {initialData?.credit_name && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Редактирование: {initialData.credit_name}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Credit Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Название кредита
          </label>
          <Input
            {...register('credit_name', { required: 'Название кредита обязательно' })}
            placeholder="Например: Кредитная линия на оборотные средства"
            error={getErrorMessage(errors.credit_name)}
            icon={FileText}
          />
        </div>

        {/* Principal Amount and Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сумма основного долга
            </label>
            <Input
              value={displayPrincipalAmount}
              onChange={(e) => {
                const formatted = formatNumberWithSpaces(e.target.value);
                setDisplayPrincipalAmount(formatted);
                setValue('principal_amount', parseNumber(formatted), { shouldValidate: true });
              }}
              onBlur={() => {
                trigger('principal_amount');
              }}
              type="text"
              inputMode="decimal"
              placeholder="100 000 000,00"
              error={getErrorMessage(errors.principal_amount)}
              leftElement={getCurrencySymbol(currency)}
            />
            <input
              type="hidden"
              {...register('principal_amount', { 
                required: 'Сумма основного долга обязательна',
                validate: (value) => {
                  const num = parseNumber(value);
                  if (isNaN(num) || num <= 0) {
                    return 'Сумма должна быть положительной';
                  }
                  return true;
                }
              })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Валюта
            </label>
            <Select
              {...register('currency', { required: 'Валюта обязательна' })}
              options={SUPPORTED_CURRENCIES}
              error={getErrorMessage(errors.currency)}
            />
          </div>
        </div>

        {/* Start and End Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Дата начала
            </label>
            <SimpleDatePicker
              value={watch('start_date')}
              onChange={(date) => {
                setValue('start_date', date, { shouldValidate: true });
                trigger('start_date');
              }}
              error={getErrorMessage(errors.start_date)}
              minDate="2000-01-01"
              maxDate="2050-12-31"
            />
            {/* Hidden input for react-hook-form validation */}
            <input
              type="hidden"
              {...register('start_date', { required: 'Дата начала обязательна' })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Дата окончания
            </label>
            <SimpleDatePicker
              value={watch('end_date')}
              onChange={(date) => {
                setValue('end_date', date, { shouldValidate: true });
                trigger('end_date');
              }}
              error={getErrorMessage(errors.end_date)}
              minDate={watch('start_date') || "2000-01-01"}
              maxDate="2050-12-31"
            />
            {/* Hidden input for react-hook-form validation */}
            <input
              type="hidden"
              {...register('end_date', { required: 'Дата окончания обязательна' })}
            />
          </div>
        </div>

        {/* Base Rate Indicator Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Базовый индикатор
          </label>
          <Select
            {...register('base_rate_indicator', { required: 'Базовый индикатор обязателен' })}
            options={BASE_RATE_INDICATORS}
            error={getErrorMessage(errors.base_rate_indicator)}
          />
        </div>

        {/* Interest Rate Components */}
        <div className={`grid grid-cols-1 ${baseRateIndicator === 'FIXED' ? '' : 'md:grid-cols-2'} gap-4`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {baseRateIndicator === 'FIXED' ? 'Процентная ставка' : getBaseRateLabel()}
            </label>
            <Input
              {...register('base_rate_value', { 
                required: 'Процентная ставка обязательна',
                validate: (value) => {
                  const num = parseNumber(value);
                  if (isNaN(num) || num < 0) {
                    return 'Ставка не может быть отрицательной';
                  }
                  return true;
                }
              })}
              type="text"
              inputMode="decimal"
              placeholder="16.00"
              error={getErrorMessage(errors.base_rate_value)}
              icon={Percent}
              disabled={baseRateIndicator === 'KEY_RATE' || baseRateIndicator === 'RUONIA'}
              helperText={
                baseRateIndicator === 'KEY_RATE' ? 
                  (currentKeyRate !== null ? 'Источник cbr.ru' : 'Не удалось загрузить данные ЦБ РФ') :
                baseRateIndicator === 'RUONIA' ? 
                  (currentRuonia !== null ? 'Источник cbr.ru' : 'Не удалось загрузить данные ЦБ РФ') :
                undefined
              }
            />
          </div>
          
          {baseRateIndicator !== 'FIXED' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Кредитный спред
              </label>
              <Input
                {...register('credit_spread', { 
                  required: baseRateIndicator !== 'FIXED' ? 'Кредитный спред обязателен' : false,
                  validate: (value) => {
                    if (baseRateIndicator === 'FIXED') return true;
                    const num = parseNumber(value);
                    if (isNaN(num) || num < 0) {
                      return 'Спред не может быть отрицательным';
                    }
                    return true;
                  }
                })}
                type="text"
                inputMode="decimal"
                placeholder="3.50"
                error={getErrorMessage(errors.credit_spread)}
                icon={Percent}
              />
            </div>
          )}
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Периодичность процентных платежей
            </label>
            <Select
              {...register('payment_frequency', { required: 'Периодичность процентных платежей обязательна' })}
              options={paymentFrequencyOptions}
              error={getErrorMessage(errors.payment_frequency)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Тип процентных платежей
            </label>
            <Select
              {...register('payment_type', { required: 'Тип процентных платежей обязателен' })}
              options={paymentTypeOptions}
              error={getErrorMessage(errors.payment_type)}
            />
          </div>
        </div>

        {/* Real-time Interest Calculation Preview */}
        {baseRateValue && (baseRateIndicator === 'FIXED' || creditSpread) && (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Предварительный расчет
            </h3>
            <div className="text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">
                  Итоговая ставка{baseRateIndicator !== 'FIXED' && ' (при текущем значении КС ЦБ РФ)'}:
                </span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {isNaN(totalRate) ? '--' : totalRate.toFixed(2)}%
                  {baseRateIndicator !== 'FIXED' && ` (${parseNumber(baseRateValue)}% + ${parseNumber(creditSpread)}%)`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Credit Information for Edit Mode */}
        {isEdit && initialData && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
              Текущие расчетные данные
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700 dark:text-blue-300">Сумма процентов:</span>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {initialData.interest_amount ? 
                    new Intl.NumberFormat('ru-RU', { 
                      style: 'currency', 
                      currency: initialData.currency || 'RUB' 
                    }).format(initialData.interest_amount) : 
                    'Не рассчитано'
                  }
                </p>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Всего к выплате:</span>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {initialData.total_payment ? 
                    new Intl.NumberFormat('ru-RU', { 
                      style: 'currency', 
                      currency: initialData.currency || 'RUB' 
                    }).format(initialData.total_payment) : 
                    'Не рассчитано'
                  }
                </p>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Создано:</span>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {initialData.created_at ? 
                    new Date(initialData.created_at).toLocaleDateString('ru-RU') : 
                    'Неизвестно'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Schedule Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              График платежей
            </h3>
            {paymentScheduleEntries.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPaymentScheduleEntries([]);
                  setScheduleFormKey(`schedule-form-${Date.now()}`);
                  // Don't reset loadedScheduleForCreditId.current - user chose to clear manually
                }}
                className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Изменить способ
              </Button>
            )}
          </div>
          
          {paymentScheduleEntries.length > 0 ? (
            <PaymentScheduleForm
              key={scheduleFormKey}
              creditId={initialData?.id || 0}
              creditName={watch('credit_name') || 'Новый кредит'}
              currency={watch('currency')}
              creditStartDate={watch('start_date')}
              creditEndDate={watch('end_date')}
              creditPrincipalAmount={parseNumber(watch('principal_amount')) || (initialData?.principal_amount || 0)}
              onSave={handlePaymentScheduleSave}
              initialData={paymentScheduleEntries}
            />
          ) : (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                График платежей не добавлен
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateSchedule}
                  icon={Calendar}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Сгенерировать график
                </Button>
                <span className="text-xs text-gray-400">или</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Add a single empty entry to start the schedule
                    setPaymentScheduleEntries([{
                      period_start_date: '',
                      period_end_date: '',
                      payment_date: '',
                      outstanding_balance: '' as any
                    }]);
                    setScheduleFormKey(`schedule-form-${Date.now()}`); // Force re-render of PaymentScheduleForm
                  }}
                  icon={Plus}
                  className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                >
                  Добавить вручную
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Schedule Validation Warning */}
        {hasScheduleValidationErrors && paymentScheduleEntries.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-600 dark:text-red-400 text-sm font-medium">
                ⚠️ В графике платежей есть ошибки валидации. Исправьте их перед сохранением кредита.
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Always show */}
        <div className="flex items-center justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Отменить
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || hasScheduleValidationErrors}
              isLoading={isSubmitting}
              icon={isEdit ? FileText : Plus}
            >
              {isEdit ? 'Обновить' : 'Добавить кредит'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};