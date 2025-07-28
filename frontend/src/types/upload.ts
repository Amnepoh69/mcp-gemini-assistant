/**
 * Data upload types for frontend
 */

export enum DataUploadType {
  MANUAL = 'manual',
  CSV = 'csv',
  EXCEL = 'excel',
  API = 'api',
  GOOGLE_SHEETS = 'google_sheets'
}

export enum DataUploadStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum FinancialDataCategory {
  REVENUE = 'revenue',
  EXPENSES = 'expenses',
  CASH_FLOW = 'cash_flow',
  BALANCE_SHEET = 'balance_sheet',
  INCOME_STATEMENT = 'income_statement',
  BUDGET = 'budget',
  FORECAST = 'forecast'
}

export interface DataUpload {
  id: number;
  name: string;
  description?: string;
  upload_type: DataUploadType;
  category: FinancialDataCategory;
  file_path?: string;
  data?: Record<string, any>;
  user_id: number;
  status: DataUploadStatus;
  file_size?: number;
  row_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DataUploadCreate {
  name: string;
  description?: string;
  upload_type: DataUploadType;
  category: FinancialDataCategory;
  file_path?: string;
  data?: Record<string, any>;
}

export interface UploadProgress {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface ManualDataEntry {
  period: string;
  category: FinancialDataCategory;
  amount: number;
  description?: string;
  currency?: string;
}

export interface UploadValidationError {
  row?: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface UploadResponse {
  upload: DataUpload;
  validation_errors?: UploadValidationError[];
  preview_data?: Record<string, any>[];
}