/**
 * Payment schedule upload component for detailed credit schedules
 */

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, FileText, AlertCircle, CheckCircle, X, Calendar, Percent, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { BASE_RATE_INDICATORS, SUPPORTED_CURRENCIES } from '@/types/credit';
import { creditsApi, cbrApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface PaymentScheduleUploadProps {
  onUploadComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface ScheduleFormData {
  credit_name: string;
  currency: string;
  base_rate_indicator: string;
  base_rate_value: number;
  credit_spread: number;
}

interface UploadResult {
  message: string;
  credit_id: number;
  periods_count: number;
  total_principal: number;
  schedule_period: string;
}

export const PaymentScheduleUpload: React.FC<PaymentScheduleUploadProps> = ({
  onUploadComplete,
  onCancel,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentKeyRate, setCurrentKeyRate] = useState<number | null>(null);
  const [isLoadingKeyRate, setIsLoadingKeyRate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ScheduleFormData>({
    defaultValues: {
      credit_name: '',
      currency: 'RUB',
      base_rate_indicator: 'KEY_RATE',
      base_rate_value: 0,
      credit_spread: 0
    }
  });

  const baseRateValue = watch('base_rate_value');
  const creditSpread = watch('credit_spread');
  const baseRateIndicator = watch('base_rate_indicator');
  const totalRate = (baseRateValue || 0) + (creditSpread || 0);

  // Load current key rate when KEY_RATE is selected
  useEffect(() => {
    if (baseRateIndicator === 'KEY_RATE') {
      loadCurrentKeyRate();
    }
  }, [baseRateIndicator]);

  const loadCurrentKeyRate = async () => {
    try {
      setIsLoadingKeyRate(true);
      const response = await cbrApi.getCurrentRate();
      const keyRate = response.data.rate;
      setCurrentKeyRate(keyRate);
      
      // Auto-fill the base rate value if it's currently 0 or not set
      if (!baseRateValue || baseRateValue === 0) {
        setValue('base_rate_value', keyRate);
        toast.success(`Загружена текущая ключевая ставка ЦБ РФ: ${keyRate}%`);
      }
    } catch (error: any) {
      console.error('Error loading key rate:', error);
      toast.error('Не удалось загрузить ключевую ставку ЦБ РФ');
    } finally {
      setIsLoadingKeyRate(false);
    }
  };

  const handleKeyRateRefresh = async () => {
    await loadCurrentKeyRate();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFormSubmit = async (data: ScheduleFormData) => {
    if (!selectedFile) {
      toast.error('Пожалуйста, выберите файл с графиком платежей');
      return;
    }

    // Validate file type
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Поддерживаются только Excel файлы (.xlsx, .xls)');
      return;
    }

    try {
      setIsUploading(true);
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('credit_name', data.credit_name);
      formData.append('currency', data.currency);
      formData.append('base_rate_indicator', data.base_rate_indicator);
      formData.append('base_rate_value', data.base_rate_value.toString());
      formData.append('credit_spread', data.credit_spread.toString());

      const response = await creditsApi.uploadSchedule(formData);
      const result: UploadResult = response.data;
      setUploadResult(result);

      toast.success(`Загружено ${result.periods_count} периодов платежей`);
      
      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error: any) {
      console.error('Error uploading schedule:', error);
      toast.error(error.response?.data?.detail || 'Ошибка при загрузке графика платежей');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setUploadResult(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Загрузить график платежей
          </h2>
        </div>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            icon={X}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Закрыть
          </Button>
        )}
      </div>

      {!uploadResult ? (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Credit Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
              Информация о кредите
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название кредита
                </label>
                <Input
                  {...register('credit_name', { required: 'Название кредита обязательно' })}
                  placeholder="Кредитная линия на оборотные средства"
                  error={errors.credit_name?.message}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Валюта
                  </label>
                  <Select
                    {...register('currency', { required: 'Валюта обязательна' })}
                    options={SUPPORTED_CURRENCIES}
                    error={errors.currency?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Базовый индикатор
                  </label>
                  <Select
                    {...register('base_rate_indicator', { required: 'Базовый индикатор обязателен' })}
                    options={BASE_RATE_INDICATORS}
                    error={errors.base_rate_indicator?.message}
                  />
                </div>
              </div>

              {/* Key Rate Information */}
              {baseRateIndicator === 'KEY_RATE' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Percent className="h-4 w-4 text-blue-600" />
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Ключевая ставка ЦБ РФ
                      </h4>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleKeyRateRefresh}
                      disabled={isLoadingKeyRate}
                      icon={RefreshCw}
                      className={`text-blue-600 hover:text-blue-700 ${isLoadingKeyRate ? 'animate-spin' : ''}`}
                    >
                      Обновить
                    </Button>
                  </div>
                  
                  {currentKeyRate !== null ? (
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p>
                        <strong>Текущая ставка:</strong> {currentKeyRate}%
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Значение автоматически загружено из данных ЦБ РФ
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      {isLoadingKeyRate ? 'Загрузка ключевой ставки...' : 'Нажмите "Обновить" для загрузки актуальной ставки'}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Базовая ставка (%)
                  </label>
                  <Input
                    {...register('base_rate_value', { 
                      required: 'Базовая ставка обязательна',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Ставка не может быть отрицательной' }
                    })}
                    type="number"
                    step="0.01"
                    placeholder="16.00"
                    error={errors.base_rate_value?.message}
                    icon={Percent}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Кредитный спред (%)
                  </label>
                  <Input
                    {...register('credit_spread', { 
                      required: 'Кредитный спред обязателен',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Спред не может быть отрицательным' }
                    })}
                    type="number"
                    step="0.01"
                    placeholder="3.50"
                    error={errors.credit_spread?.message}
                    icon={Percent}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Итоговая ставка (%)
                  </label>
                  <Input
                    value={totalRate.toFixed(2)}
                    disabled
                    className="bg-gray-50 dark:bg-gray-700"
                    icon={Percent}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Файл с графиком платежей
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              
              <div className="space-y-3">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <FileText className="h-full w-full" />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedFile ? selectedFile.name : 'Выберите Excel файл'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Формат: Excel (.xlsx, .xls) с колонками дат и номинала
                  </p>
                </div>
                
                {!selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    icon={Upload}
                    disabled={isUploading}
                  >
                    Выбрать файл
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isUploading}
              >
                Отменить
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={isUploading || !selectedFile}
              isLoading={isUploading}
              icon={Upload}
            >
              Загрузить график
            </Button>
          </div>
        </form>
      ) : (
        /* Upload Results */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                График платежей загружен
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetUpload}
              icon={X}
            >
              Загрузить другой файл
            </Button>
          </div>

          {/* Upload Summary */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              {uploadResult.message}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-700 dark:text-green-300">Периодов:</span>
                <span className="ml-2 font-medium">{uploadResult.periods_count}</span>
              </div>
              <div>
                <span className="text-green-700 dark:text-green-300">Номинал:</span>
                <span className="ml-2 font-medium">{uploadResult.total_principal.toLocaleString()}</span>
              </div>
              <div className="col-span-2">
                <span className="text-green-700 dark:text-green-300">Период:</span>
                <span className="ml-2 font-medium">{uploadResult.schedule_period}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {onCancel && (
              <Button
                variant="ghost"
                onClick={onCancel}
              >
                Закрыть
              </Button>
            )}
            <Button
              variant="primary"
              onClick={onUploadComplete}
            >
              Готово
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};