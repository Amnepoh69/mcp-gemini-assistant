"""Upload service for processing uploaded files."""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
import json
import os
import tempfile

from app.models.data_upload import DataUpload, DataUploadStatus


class UploadService:
    """Service for handling file uploads and data processing."""
    
    def __init__(self):
        self.supported_formats = ['.csv', '.xlsx', '.xls']
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.max_rows = 100000  # 100k rows limit
    
    def validate_file(self, file_path: str, file_size: int) -> List[str]:
        """Validate uploaded file."""
        errors = []
        
        # Check file extension
        if not any(file_path.endswith(ext) for ext in self.supported_formats):
            errors.append("Unsupported file format. Only CSV and Excel files are allowed.")
        
        # Check file size
        if file_size > self.max_file_size:
            errors.append(f"File size exceeds {self.max_file_size / (1024*1024):.1f}MB limit.")
        
        return errors
    
    def parse_csv(self, file_content: bytes) -> pd.DataFrame:
        """Parse CSV file content."""
        try:
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'cp1252']
            
            for encoding in encodings:
                try:
                    content = file_content.decode(encoding)
                    df = pd.read_csv(pd.StringIO(content))
                    return df
                except UnicodeDecodeError:
                    continue
            
            raise ValueError("Unable to decode CSV file with supported encodings")
            
        except Exception as e:
            raise ValueError(f"Error parsing CSV file: {str(e)}")
    
    def parse_excel(self, file_content: bytes) -> pd.DataFrame:
        """Parse Excel file content."""
        try:
            # Use BytesIO for Excel files
            df = pd.read_excel(pd.BytesIO(file_content))
            return df
        except Exception as e:
            raise ValueError(f"Error parsing Excel file: {str(e)}")
    
    def clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and standardize DataFrame."""
        # Make a copy to avoid modifying original
        df_clean = df.copy()
        
        # Remove completely empty rows
        df_clean = df_clean.dropna(how='all')
        
        # Remove completely empty columns
        df_clean = df_clean.dropna(axis=1, how='all')
        
        # Strip whitespace from string columns
        for col in df_clean.select_dtypes(include=['object']).columns:
            df_clean[col] = df_clean[col].astype(str).str.strip()
        
        # Replace 'nan' strings with actual NaN
        df_clean = df_clean.replace('nan', np.nan)
        
        # Standardize column names (lowercase, replace spaces with underscores)
        df_clean.columns = [col.lower().replace(' ', '_').replace('-', '_') for col in df_clean.columns]
        
        return df_clean
    
    def detect_data_types(self, df: pd.DataFrame) -> Dict[str, str]:
        """Detect and suggest data types for columns."""
        type_suggestions = {}
        
        for col in df.columns:
            # Try to infer data type
            if df[col].dtype == 'object':
                # Try to convert to numeric
                try:
                    pd.to_numeric(df[col], errors='raise')
                    type_suggestions[col] = 'numeric'
                except:
                    # Try to convert to datetime
                    try:
                        pd.to_datetime(df[col], errors='raise')
                        type_suggestions[col] = 'datetime'
                    except:
                        type_suggestions[col] = 'text'
            elif np.issubdtype(df[col].dtype, np.number):
                type_suggestions[col] = 'numeric'
            elif np.issubdtype(df[col].dtype, np.datetime64):
                type_suggestions[col] = 'datetime'
            else:
                type_suggestions[col] = 'text'
        
        return type_suggestions
    
    def process_financial_data(self, df: pd.DataFrame, category: str) -> Dict[str, Any]:
        """Process financial data based on category."""
        processed_data = {
            'original_rows': len(df),
            'processed_rows': 0,
            'columns': list(df.columns),
            'data_types': self.detect_data_types(df),
            'summary': {}
        }
        
        # Clean the data
        df_clean = self.clean_dataframe(df)
        processed_data['processed_rows'] = len(df_clean)
        
        # Category-specific processing
        if category == 'revenue':
            processed_data['summary'] = self._process_revenue_data(df_clean)
        elif category == 'expenses':
            processed_data['summary'] = self._process_expenses_data(df_clean)
        elif category == 'cash_flow':
            processed_data['summary'] = self._process_cash_flow_data(df_clean)
        elif category == 'balance_sheet':
            processed_data['summary'] = self._process_balance_sheet_data(df_clean)
        elif category == 'income_statement':
            processed_data['summary'] = self._process_income_statement_data(df_clean)
        
        # Convert DataFrame to records for JSON storage
        processed_data['records'] = df_clean.to_dict(orient='records')
        
        return processed_data
    
    def _process_revenue_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process revenue-specific data."""
        summary = {}
        
        # Look for amount/revenue columns
        amount_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['amount', 'revenue', 'sales', 'income'])]
        
        if amount_cols:
            main_amount_col = amount_cols[0]
            numeric_amounts = pd.to_numeric(df[main_amount_col], errors='coerce')
            
            summary['total_revenue'] = float(numeric_amounts.sum())
            summary['average_revenue'] = float(numeric_amounts.mean())
            summary['min_revenue'] = float(numeric_amounts.min())
            summary['max_revenue'] = float(numeric_amounts.max())
            summary['amount_column'] = main_amount_col
        
        # Look for date columns
        date_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['date', 'period', 'month', 'year'])]
        if date_cols:
            summary['date_column'] = date_cols[0]
            summary['date_range'] = {
                'start': df[date_cols[0]].min(),
                'end': df[date_cols[0]].max()
            }
        
        return summary
    
    def _process_expenses_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process expenses-specific data."""
        summary = {}
        
        # Look for amount/expense columns
        amount_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['amount', 'expense', 'cost', 'spending'])]
        
        if amount_cols:
            main_amount_col = amount_cols[0]
            numeric_amounts = pd.to_numeric(df[main_amount_col], errors='coerce')
            
            summary['total_expenses'] = float(numeric_amounts.sum())
            summary['average_expenses'] = float(numeric_amounts.mean())
            summary['min_expenses'] = float(numeric_amounts.min())
            summary['max_expenses'] = float(numeric_amounts.max())
            summary['amount_column'] = main_amount_col
        
        # Look for category columns
        category_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['category', 'type', 'class'])]
        if category_cols:
            summary['category_column'] = category_cols[0]
            summary['expense_categories'] = df[category_cols[0]].value_counts().to_dict()
        
        return summary
    
    def _process_cash_flow_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process cash flow-specific data."""
        summary = {}
        
        # Look for inflow/outflow columns
        inflow_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['inflow', 'income', 'receipts'])]
        outflow_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['outflow', 'payments', 'expenses'])]
        
        if inflow_cols:
            inflow_col = inflow_cols[0]
            numeric_inflows = pd.to_numeric(df[inflow_col], errors='coerce')
            summary['total_inflows'] = float(numeric_inflows.sum())
            summary['inflow_column'] = inflow_col
        
        if outflow_cols:
            outflow_col = outflow_cols[0]
            numeric_outflows = pd.to_numeric(df[outflow_col], errors='coerce')
            summary['total_outflows'] = float(numeric_outflows.sum())
            summary['outflow_column'] = outflow_col
        
        if inflow_cols and outflow_cols:
            summary['net_cash_flow'] = summary['total_inflows'] - summary['total_outflows']
        
        return summary
    
    def _process_balance_sheet_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process balance sheet-specific data."""
        summary = {}
        
        # Look for assets/liabilities columns
        asset_cols = [col for col in df.columns if 'asset' in col.lower()]
        liability_cols = [col for col in df.columns if 'liability' in col.lower()]
        equity_cols = [col for col in df.columns if 'equity' in col.lower()]
        
        if asset_cols:
            summary['asset_columns'] = asset_cols
        if liability_cols:
            summary['liability_columns'] = liability_cols
        if equity_cols:
            summary['equity_columns'] = equity_cols
        
        return summary
    
    def _process_income_statement_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process income statement-specific data."""
        summary = {}
        
        # Look for revenue and expense indicators
        revenue_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['revenue', 'sales', 'income'])]
        expense_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['expense', 'cost', 'spending'])]
        
        if revenue_cols:
            summary['revenue_columns'] = revenue_cols
        if expense_cols:
            summary['expense_columns'] = expense_cols
        
        return summary
    
    def save_processed_data(self, upload_id: int, processed_data: Dict[str, Any]) -> str:
        """Save processed data to temporary file."""
        try:
            # Create temporary file
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, f"upload_{upload_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
            
            # Save data as JSON
            with open(file_path, 'w') as f:
                json.dump(processed_data, f, indent=2, default=str)
            
            return file_path
        except Exception as e:
            raise ValueError(f"Error saving processed data: {str(e)}")