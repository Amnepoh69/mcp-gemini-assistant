/**
 * Data upload component
 */

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { 
  Upload, 
  FileText, 
  Table, 
  Link, 
  AlertCircle,
  CheckCircle,
  X,
  Download,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataUploadType, FinancialDataCategory, UploadProgress, ManualDataEntry } from '@/types/upload';
import { uploadApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { DataVisualization } from '@/components/upload/DataVisualization';

interface DataUploadProps {
  onUploadComplete?: (uploadId: string) => void;
}

export const DataUpload: React.FC<DataUploadProps> = ({ onUploadComplete }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'manual' | 'api'>('file');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [manualEntries, setManualEntries] = useState<ManualDataEntry[]>([]);
  const [manualForm, setManualForm] = useState({
    name: '',
    description: '',
    category: FinancialDataCategory.REVENUE,
    amount: '',
    period: ''
  });
  const [completedUploadId, setCompletedUploadId] = useState<string | null>(null);
  const router = useRouter();

  // File upload handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  }, []);

  const handleFileUpload = async (files: File[]) => {
    if (isUploading) return;
    
    for (const file of files) {
      if (!isValidFileType(file)) {
        toast.error(`Invalid file type: ${file.name}`);
        continue;
      }

      const uploadId = `upload-${Date.now()}-${Math.random()}`;
      const newUpload: UploadProgress = {
        id: uploadId,
        file,
        progress: 0,
        status: 'uploading'
      };

      setUploadProgress(prev => [...prev, newUpload]);
      setIsUploading(true);

      try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name.split('.')[0]);
        formData.append('description', `Uploaded ${file.name}`);
        formData.append('category', 'revenue'); // Default category, should be selected by user

        // Upload file
        const response = await uploadApi.uploadFile(formData);
        
        setUploadProgress(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: 'completed', progress: 100 }
              : upload
          )
        );
        
        const responseData = response.data;
        toast.success(`File ${file.name} uploaded successfully - ${responseData.row_count} rows, ${responseData.column_count} columns`);
        console.log('Upload successful:', responseData);
        setCompletedUploadId(responseData.upload_id);
        onUploadComplete?.(responseData.upload_id);
        
      } catch (error: any) {
        setUploadProgress(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: 'error', error: error.message || 'Upload failed' }
              : upload
          )
        );
        
        const errorMessage = error.response?.data?.detail || error.message || 'Upload failed';
        toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
        console.error('Upload error:', error.response?.data || error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    return validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx');
  };

  const handleDownloadTemplate = async (category: string) => {
    try {
      const response = await uploadApi.downloadTemplate(category);
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${category}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded successfully');
    } catch (error: any) {
      toast.error(`Failed to download template: ${error.message}`);
    }
  };

  const removeUpload = (uploadId: string) => {
    setUploadProgress(prev => prev.filter(upload => upload.id !== uploadId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleManualSubmit = async (formData: any) => {
    try {
      setIsUploading(true);
      
      // Create manual entry
      const manualData = new FormData();
      manualData.append('name', formData.name);
      manualData.append('description', formData.description || '');
      manualData.append('category', formData.category);
      manualData.append('entries', JSON.stringify([{
        period: formData.period,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category
      }]));

      const response = await uploadApi.createManual(manualData);
      
      toast.success('Manual entry created successfully');
      setCompletedUploadId(response.data.upload_id);
      onUploadComplete?.(response.data.upload_id);
      
    } catch (error: any) {
      toast.error(`Failed to create manual entry: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const tabs = [
    { id: 'file', label: 'Upload Files', icon: Upload },
    { id: 'manual', label: 'Manual Entry', icon: Table },
    { id: 'api', label: 'Connect API', icon: Link }
  ];

  const categoryOptions = [
    { value: FinancialDataCategory.REVENUE, label: 'Revenue' },
    { value: FinancialDataCategory.EXPENSES, label: 'Expenses' },
    { value: FinancialDataCategory.CASH_FLOW, label: 'Cash Flow' },
    { value: FinancialDataCategory.BALANCE_SHEET, label: 'Balance Sheet' },
    { value: FinancialDataCategory.INCOME_STATEMENT, label: 'Income Statement' },
    { value: FinancialDataCategory.BUDGET, label: 'Budget' },
    { value: FinancialDataCategory.FORECAST, label: 'Forecast' }
  ];

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/credits')}
          icon={ArrowLeft}
          size="sm"
        >
          Back to Credits
        </Button>
      </div>
      
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Upload Financial Data
        </h1>
        <p className="text-gray-600">
          Import your data from files, enter manually, or connect external sources
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* File Upload Tab */}
      {activeTab === 'file' && (
        <div className="space-y-6">
          {/* Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to upload
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Supports CSV, Excel (.xlsx) files up to 10MB
            </p>
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                handleFileUpload(files);
              }}
              className="hidden"
              id="file-upload"
            />
            <div className="flex justify-center">
              <Button 
                variant="primary" 
                onClick={() => {
                  console.log('Upload button clicked');
                  document.getElementById('file-upload')?.click();
                }}
                icon={Upload}
                size="lg"
              >
                Upload Data
              </Button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Upload Progress</h3>
              {uploadProgress.map((upload) => (
                <div key={upload.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{upload.file.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(upload.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {upload.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <button
                        onClick={() => removeUpload(upload.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  
                  {upload.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {upload.status === 'error' && upload.error && (
                    <p className="text-sm text-red-600 mt-2">{upload.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Need a template?</h4>
                <p className="text-sm text-blue-700">
                  Download our Excel template to ensure proper data formatting
                </p>
              </div>
              <Button 
                variant="outline" 
                icon={Download} 
                size="sm"
                onClick={() => handleDownloadTemplate('revenue')}
              >
                Download Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Add Financial Data Entry
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Entry Name"
                placeholder="e.g., Q4 2024 Revenue"
                value={manualForm.name}
                onChange={(e) => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              
              <Select
                label="Category"
                options={categoryOptions}
                placeholder="Select category"
                value={manualForm.category}
                onChange={(e) => setManualForm(prev => ({ ...prev, category: e.target.value as FinancialDataCategory }))}
                required
              />
              
              <Input
                label="Amount"
                type="number"
                placeholder="0.00"
                value={manualForm.amount}
                onChange={(e) => setManualForm(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
              
              <Input
                label="Period"
                type="date"
                value={manualForm.period}
                onChange={(e) => setManualForm(prev => ({ ...prev, period: e.target.value }))}
                required
              />
              
              <div className="md:col-span-2">
                <Input
                  label="Description"
                  placeholder="Optional description"
                  value={manualForm.description}
                  onChange={(e) => setManualForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button 
                variant="outline"
                onClick={() => setManualForm({
                  name: '',
                  description: '',
                  category: FinancialDataCategory.REVENUE,
                  amount: '',
                  period: ''
                })}
              >
                Reset Form
              </Button>
              <Button 
                variant="primary"
                onClick={() => handleManualSubmit(manualForm)}
                disabled={isUploading || !manualForm.name || !manualForm.amount || !manualForm.period}
              >
                {isUploading ? 'Creating...' : 'Add Entry'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* API Connection Tab */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Sheets */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Table className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Google Sheets</h3>
                  <p className="text-sm text-gray-500">Connect your Google Sheets</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Connect Google Sheets
              </Button>
            </div>

            {/* QuickBooks */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">QuickBooks</h3>
                  <p className="text-sm text-gray-500">Import from QuickBooks</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Connect QuickBooks
              </Button>
            </div>
          </div>

          <div className="bg-gray-50 border rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Coming soon:</strong> Direct integrations with Xero, SAP, Oracle, and other financial systems.
            </p>
          </div>
        </div>
      )}

      {/* Data Visualization */}
      {completedUploadId && (
        <div className="mt-8">
          <DataVisualization
            uploadId={completedUploadId}
            onClose={() => setCompletedUploadId(null)}
          />
        </div>
      )}
    </div>
  );
};