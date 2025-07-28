/**
 * Credit obligations upload component
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { creditsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface CreditUploadProps {
  onUploadComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface UploadResult {
  message: string;
  uploaded_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

export const CreditUpload: React.FC<CreditUploadProps> = ({
  onUploadComplete,
  onCancel,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast.error('Поддерживаются только CSV и Excel файлы');
      return;
    }

    try {
      setIsUploading(true);
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await creditsApi.uploadCredits(formData);

      const result: UploadResult = response.data;
      setUploadResult(result);

      if (result.uploaded_count > 0) {
        toast.success(`Загружено ${result.uploaded_count} кредитных обязательств`);
        if (onUploadComplete) {
          onUploadComplete();
        }
      }

      if (result.error_count > 0) {
        toast.error(`Ошибки в ${result.error_count} строках`);
      }

    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.detail || 'Ошибка при загрузке файла');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await creditsApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'credit_obligations_template.csv');
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

  const resetUpload = () => {
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Upload className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Загрузить кредитные обязательства
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
        <div>
          {/* Template Download */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Шаблон для загрузки
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  Скачайте шаблон CSV с примером данных и правильными заголовками
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadTemplate}
                icon={Download}
                className="text-blue-600 hover:text-blue-700"
              >
                Скачать шаблон
              </Button>
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            
            <div className="space-y-4">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <FileText className="h-full w-full" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {isUploading ? 'Загрузка...' : 'Выберите файл или перетащите сюда'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Поддерживаются файлы CSV, XLSX и XLS
                </p>
              </div>
              
              {!isUploading && (
                <Button
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                  icon={Upload}
                >
                  Выбрать файл
                </Button>
              )}
            </div>
          </div>

          {/* File Format Guidelines */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Требования к файлу:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Файл должен содержать заголовки на первой строке</li>
              <li>• Обязательные поля: название кредита, сумма, валюта, даты, ставки</li>
              <li>• Даты в формате YYYY-MM-DD</li>
              <li>• Процентные ставки в числовом формате (например, 16.5)</li>
              <li>• Поддерживаемые валюты: RUB, USD, EUR, CNY</li>
            </ul>
          </div>
        </div>
      ) : (
        /* Upload Results */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {uploadResult.uploaded_count > 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Результаты загрузки
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
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Успешно загружено
                </span>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {uploadResult.uploaded_count}
              </p>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                  Ошибки
                </span>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {uploadResult.error_count}
              </p>
            </div>
          </div>

          {/* Error Details */}
          {uploadResult.errors.length > 0 && (
            <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Подробности ошибок:
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uploadResult.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 dark:text-red-400">
                    <span className="font-medium">Строка {error.row}:</span> {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadResult.uploaded_count > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                {uploadResult.message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isUploading}
          >
            Отменить
          </Button>
        )}
        {uploadResult && uploadResult.uploaded_count > 0 && (
          <Button
            variant="primary"
            onClick={onUploadComplete}
          >
            Готово
          </Button>
        )}
      </div>
    </div>
  );
};