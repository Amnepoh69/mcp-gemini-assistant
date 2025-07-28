/**
 * Payment schedule entry form component
 */

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, X, Calendar, DollarSign, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SimpleDatePicker } from '@/components/ui/SimpleDatePicker';
import { PaymentScheduleEntry } from '@/types/credit';
import { toast } from 'react-hot-toast';

interface PaymentScheduleFormProps {
  creditId: number;
  creditName: string;
  currency: string;
  creditStartDate?: string;
  creditEndDate?: string;
  creditPrincipalAmount?: number;
  onSave?: (entries: PaymentScheduleEntry[]) => void; // Called when user saves changes
  initialData?: PaymentScheduleEntry[];
  key?: string; // Allow parent to force re-render by changing key
}

interface FormData {
  entries: PaymentScheduleEntry[];
}

export const PaymentScheduleForm: React.FC<PaymentScheduleFormProps> = ({
  creditId,
  creditName,
  currency,
  creditStartDate,
  creditEndDate,
  creditPrincipalAmount,
  onSave,
  initialData = []
}) => {
  const [displayBalances, setDisplayBalances] = useState<{[key: number]: string}>({});

  const {
    control,
    register,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      entries: [
        {
          period_start_date: '',
          period_end_date: '',
          payment_date: '',
          outstanding_balance: '' as any
        }
      ]
    }
  });

  const { fields, append, remove, insert } = useFieldArray({
    control,
    name: 'entries'
  });

  const entries = watch('entries');

  // Track if form has been manually edited
  const [hasBeenEdited, setHasBeenEdited] = useState(false);
  
  // Reset states when component is recreated (key changes)
  useEffect(() => {
    setHasBeenEdited(false);
  }, []); // Empty dependency array means this runs only on mount
  
  // Update form when initialData changes
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      // Reset form with new data - this completely replaces form content
      reset({
        entries: initialData
      });
      
      // Update display balances immediately  
      const balances: {[key: number]: string} = {};
      initialData.forEach((entry, index) => {
        // Use only the outstanding_balance from saved schedule data
        const balance = entry.outstanding_balance;
        
        if (balance !== undefined && balance !== null && balance !== '') {
          // Convert to number first, then format
          const numericBalance = typeof balance === 'string' ? parseFloat(balance) : balance;
          if (!isNaN(numericBalance) && numericBalance >= 0) {
            const formatted = formatNumberWithSpaces(numericBalance);
            balances[index] = formatted;
          }
        }
      });
      
      setDisplayBalances(balances);
      
      // Reset edited flag since we're loading fresh data
      setHasBeenEdited(false);
    }
  }, [initialData, reset]);

  // Function to save current schedule to parent
  const handleSaveSchedule = () => {
    if (!onSave) return;
    
    // Get current form data
    const currentEntries = watch('entries');
    
    // Validate all entries first
    const validationErrors: string[] = [];
    currentEntries.forEach((entry, index) => {
      if (entry.period_start_date) {
        const startValidation = validatePeriodStartDate(entry.period_start_date);
        if (startValidation !== true) {
          validationErrors.push(`Запись ${index + 1}: ${startValidation}`);
        }
      }
      if (entry.period_end_date) {
        const endValidation = validatePeriodEndDate(entry.period_end_date);
        if (endValidation !== true) {
          validationErrors.push(`Запись ${index + 1}: ${endValidation}`);
        }
      }
    });
    
    if (validationErrors.length > 0) {
      toast.error(`Ошибки валидации:\n${validationErrors.join('\n')}`);
      return;
    }
    
    const validEntries = currentEntries.filter(entry => 
      entry.period_start_date && 
      entry.period_end_date && 
      entry.payment_date && 
      entry.outstanding_balance
    ).map(entry => ({
      ...entry,
      outstanding_balance: parseNumber(entry.outstanding_balance)
    }));
    
    console.log('PaymentScheduleForm saving schedule:', validEntries);
    onSave(validEntries);
    setHasBeenEdited(false); // Reset edited flag after saving
    toast.success('График платежей сохранен');
  };

  // Helper function to parse numbers
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

  // Helper function to get error message
  const getErrorMessage = (error: any): string | undefined => {
    if (!error) return undefined;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error.message) return error.message;
    return undefined;
  };

  // Function to validate period start date
  const validatePeriodStartDate = (startDate: string) => {
    if (!creditStartDate || !startDate) return true;
    
    const periodStart = new Date(startDate);
    const creditStart = new Date(creditStartDate);
    
    if (periodStart < creditStart) {
      return 'Дата начала периода не может быть раньше даты начала кредита';
    }
    
    return true;
  };

  // Function to validate period end date
  const validatePeriodEndDate = (endDate: string) => {
    if (!creditEndDate || !endDate) return true;
    
    const periodEnd = new Date(endDate);
    const creditEnd = new Date(creditEndDate);
    
    if (periodEnd > creditEnd) {
      return 'Дата конца периода не может быть позже даты окончания кредита';
    }
    
    return true;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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

  const handleAddEntry = () => {
    setHasBeenEdited(true);
    const newIndex = fields.length;
    append({
      period_start_date: '',
      period_end_date: '',
      payment_date: '',
      outstanding_balance: '' as any
    });
    // Initialize display balance for new entry
    setDisplayBalances(prev => ({
      ...prev,
      [newIndex]: ''
    }));
  };

  const handleRemoveEntry = (index: number) => {
    if (fields.length > 1) {
      setHasBeenEdited(true);
      remove(index);
      // Remove from display balances and reindex
      const newBalances: {[key: number]: string} = {};
      Object.keys(displayBalances).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex < index) {
          newBalances[keyIndex] = displayBalances[keyIndex];
        } else if (keyIndex > index) {
          newBalances[keyIndex - 1] = displayBalances[keyIndex];
        }
      });
      setDisplayBalances(newBalances);
    } else {
      toast.error('Необходимо оставить минимум одну запись');
    }
  };

  // Handle outstanding balance change for a specific period
  const handleBalanceChange = (index: number, newValue: string) => {
    setHasBeenEdited(true);
    // Format the value and update display state
    const formatted = formatNumberWithSpaces(newValue);
    const parsedValue = parseNumber(formatted);
    
    // Update display state
    setDisplayBalances(prev => ({
      ...prev,
      [index]: formatted
    }));
    
    // Update the current field with numeric value
    setValue(`entries.${index}.outstanding_balance`, parsedValue, { shouldValidate: true });
    
    // If it's not the last entry, update all subsequent balances
    if (index < fields.length - 1 && parsedValue > 0) {
      const updatedBalances = { ...displayBalances };
      for (let i = index + 1; i < fields.length; i++) {
        updatedBalances[i] = formatted;
        setValue(`entries.${i}.outstanding_balance`, parsedValue, { 
          shouldValidate: false,
          shouldDirty: true 
        });
      }
      setDisplayBalances(updatedBalances);
    }
  };

  // Handle period end date change - split period if needed
  const handlePeriodEndDateChange = (index: number, newEndDate: string) => {
    const currentEntry = watch(`entries.${index}`);
    const previousEndDate = currentEntry.period_end_date;
    
    // Update the current field
    setValue(`entries.${index}.period_end_date`, newEndDate, { shouldValidate: true });
    trigger(`entries.${index}.period_end_date`);
    
    // If this is not the last entry and the date was changed (not initial setting)
    if (index < fields.length - 1 && previousEndDate && previousEndDate !== newEndDate) {
      // Check if we need to insert a new entry
      const nextEntry = watch(`entries.${index + 1}`);
      const nextStartDate = nextEntry?.period_start_date;
      
      // If the next entry's start date doesn't match the new end date, insert a split period
      if (nextStartDate && nextStartDate !== newEndDate) {
        // Create a new entry for the split period
        const newEntry = {
          period_start_date: newEndDate,
          period_end_date: previousEndDate,
          payment_date: previousEndDate, // Default payment date to period end
          outstanding_balance: parseNumber(currentEntry.outstanding_balance) || '' as any
        };
        
        // Insert the new entry after the current one
        insert(index + 1, newEntry);
        
        toast.success('Период разделен на две части');
      }
    }
  };


  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              График платежей
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Кредит: {creditName} • {fields.length} {fields.length === 1 ? 'период' : fields.length < 5 ? 'периода' : 'периодов'}
            </p>
          </div>
        </div>
        {fields.length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Можно редактировать значения
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Entries */}
        <div className="space-y-2">
          {/* Headers row */}
          {fields.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Дата начала периода
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Дата конца периода
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Дата платежа
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Остаток задолженности
              </label>
            </div>
          )}
          
          {/* Data rows */}
          {fields.map((field, index) => (
            <div key={field.id}>
              <div className="flex items-center gap-3">
                <div className="flex-1 grid grid-cols-4 gap-3">
                {/* Period Start Date */}
                <div>
                  <SimpleDatePicker
                      value={watch(`entries.${index}.period_start_date`)}
                      onChange={(date) => {
                        setHasBeenEdited(true);
                        setValue(`entries.${index}.period_start_date`, date, { shouldValidate: true });
                        trigger(`entries.${index}.period_start_date`);
                      }}
                      error={getErrorMessage(errors.entries?.[index]?.period_start_date)}
                      minDate="2000-01-01"
                      maxDate="2050-12-31"
                    />
                  <input
                    type="hidden"
                    {...register(`entries.${index}.period_start_date`, { 
                      required: 'Дата начала периода обязательна',
                      validate: validatePeriodStartDate
                    })}
                  />
                </div>

                {/* Period End Date */}
                <div>
                  <SimpleDatePicker
                      value={watch(`entries.${index}.period_end_date`)}
                      onChange={(date) => {
                        setHasBeenEdited(true);
                        handlePeriodEndDateChange(index, date);
                      }}
                      error={getErrorMessage(errors.entries?.[index]?.period_end_date)}
                      minDate={watch(`entries.${index}.period_start_date`) || "2000-01-01"}
                      maxDate="2050-12-31"
                    />
                  <input
                    type="hidden"
                    {...register(`entries.${index}.period_end_date`, { 
                      required: 'Дата конца периода обязательна',
                      validate: validatePeriodEndDate
                    })}
                  />
                </div>

                {/* Payment Date */}
                <div>
                  <SimpleDatePicker
                      value={watch(`entries.${index}.payment_date`)}
                      onChange={(date) => {
                        setHasBeenEdited(true);
                        setValue(`entries.${index}.payment_date`, date, { shouldValidate: true });
                        trigger(`entries.${index}.payment_date`);
                      }}
                      error={getErrorMessage(errors.entries?.[index]?.payment_date)}
                      minDate="2000-01-01"
                      maxDate="2050-12-31"
                    />
                  <input
                    type="hidden"
                    {...register(`entries.${index}.payment_date`, { 
                      required: 'Дата платежа обязательна' 
                    })}
                  />
                </div>

                {/* Outstanding Balance */}
                <div>
                  <Input
                    value={displayBalances[index] || ''}
                    onChange={(e) => {
                      const formatted = formatNumberWithSpaces(e.target.value);
                      const parsedValue = parseNumber(formatted);
                      
                      // Mark form as edited
                      setHasBeenEdited(true);
                      
                      // Update display state
                      setDisplayBalances(prev => ({
                        ...prev,
                        [index]: formatted
                      }));
                      
                      // Update form value immediately for real-time sync
                      setValue(`entries.${index}.outstanding_balance`, parsedValue, { 
                        shouldValidate: true,
                        shouldDirty: true 
                      });
                    }}
                    onBlur={(e) => {
                      // Update subsequent balances on blur
                      handleBalanceChange(index, e.target.value);
                    }}
                    type="text"
                    inputMode="decimal"
                    placeholder="100 000 000,00"
                    error={getErrorMessage(errors.entries?.[index]?.outstanding_balance)}
                    leftElement={getCurrencySymbol(currency)}
                  />
                  <input
                    type="hidden"
                    {...register(`entries.${index}.outstanding_balance`, {
                      required: 'Остаток задолженности обязателен',
                      validate: (value) => {
                        if (!value) {
                          return 'Остаток задолженности обязателен';
                        }
                        const num = parseNumber(value);
                        if (isNaN(num) || num <= 0) {
                          return 'Остаток должен быть положительным числом';
                        }
                        return true;
                      }
                    })}
                  />
                </div>
              </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEntry(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Entry Button */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={handleAddEntry}
            icon={Plus}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Добавить запись
          </Button>
        </div>

        {/* Save Button - only show when edited */}
        {hasBeenEdited && (
          <div className="flex justify-center pt-4">
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveSchedule}
              className="bg-green-600 hover:bg-green-700"
            >
              Сохранить график
            </Button>
          </div>
        )}

        {/* Info */}
        <div className="flex items-center justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className={`text-sm ${hasBeenEdited 
            ? 'text-amber-600 dark:text-amber-400 font-medium' 
            : 'text-green-600 dark:text-green-400 font-medium'
          }`}>
            {hasBeenEdited 
              ? '⚠️ Есть несохраненные изменения' 
              : 'График готов к использованию'
            }
          </div>
        </div>
      </div>
    </div>
  );
};