"""Validation service for uploaded financial data."""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
import re


class ValidationError:
    """Represents a validation error."""
    
    def __init__(self, row: Optional[int], column: Optional[str], message: str, severity: str = 'error'):
        self.row = row
        self.column = column
        self.message = message
        self.severity = severity  # 'error', 'warning'
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'row': self.row,
            'column': self.column,
            'message': self.message,
            'severity': self.severity
        }


class ValidationService:
    """Service for validating uploaded financial data."""
    
    def __init__(self):
        self.required_columns = {
            'revenue': ['date', 'amount'],
            'expenses': ['date', 'amount'],
            'cash_flow': ['date', 'inflow', 'outflow'],
            'balance_sheet': ['date', 'assets', 'liabilities'],
            'income_statement': ['date', 'revenue', 'expenses'],
            'budget': ['date', 'category', 'amount'],
            'forecast': ['date', 'category', 'amount']
        }
        
        self.optional_columns = {
            'revenue': ['source', 'description', 'category'],
            'expenses': ['category', 'description', 'vendor'],
            'cash_flow': ['net_flow', 'description'],
            'balance_sheet': ['equity', 'description'],
            'income_statement': ['net_income', 'description'],
            'budget': ['description', 'variance'],
            'forecast': ['description', 'confidence']
        }
    
    def validate_financial_data(self, df: pd.DataFrame, category: str) -> List[Dict[str, Any]]:
        """Validate financial data based on category."""
        errors = []
        
        # Basic DataFrame validation
        errors.extend(self._validate_basic_structure(df))
        
        # Category-specific validation
        if category in self.required_columns:
            errors.extend(self._validate_required_columns(df, category))
            errors.extend(self._validate_data_types(df, category))
            errors.extend(self._validate_data_quality(df, category))
        
        # Convert ValidationError objects to dictionaries
        return [error.to_dict() for error in errors]
    
    def _validate_basic_structure(self, df: pd.DataFrame) -> List[ValidationError]:
        """Validate basic DataFrame structure."""
        errors = []
        
        # Check if DataFrame is empty
        if df.empty:
            errors.append(ValidationError(None, None, "File is empty", "error"))
            return errors
        
        # Check for minimum rows
        if len(df) < 1:
            errors.append(ValidationError(None, None, "File must contain at least one data row", "error"))
        
        # Check for maximum rows
        if len(df) > 100000:
            errors.append(ValidationError(None, None, "File contains too many rows (max 100,000)", "error"))
        
        # Check for duplicate columns
        if len(df.columns) != len(set(df.columns)):
            errors.append(ValidationError(None, None, "File contains duplicate column names", "error"))
        
        # Check for empty column names
        empty_cols = [i for i, col in enumerate(df.columns) if not col or str(col).strip() == '']
        if empty_cols:
            errors.append(ValidationError(None, None, f"File contains empty column names at positions: {empty_cols}", "error"))
        
        return errors
    
    def _validate_required_columns(self, df: pd.DataFrame, category: str) -> List[ValidationError]:
        """Validate required columns for category."""
        errors = []
        required_cols = self.required_columns.get(category, [])
        
        # Normalize column names for comparison
        df_columns_lower = [col.lower().replace(' ', '_').replace('-', '_') for col in df.columns]
        
        for required_col in required_cols:
            # Check if required column exists (case-insensitive)
            if required_col.lower() not in df_columns_lower:
                # Try to find similar column names
                similar_cols = [col for col in df_columns_lower if required_col.lower() in col or col in required_col.lower()]
                
                if similar_cols:
                    errors.append(ValidationError(
                        None, 
                        None, 
                        f"Required column '{required_col}' not found. Did you mean: {', '.join(similar_cols)}?", 
                        "warning"
                    ))
                else:
                    errors.append(ValidationError(
                        None, 
                        None, 
                        f"Required column '{required_col}' not found", 
                        "error"
                    ))
        
        return errors
    
    def _validate_data_types(self, df: pd.DataFrame, category: str) -> List[ValidationError]:
        """Validate data types for specific columns."""
        errors = []
        
        # Find columns that should be numeric
        numeric_columns = ['amount', 'inflow', 'outflow', 'assets', 'liabilities', 'equity', 'revenue', 'expenses', 'net_income']
        df_columns_lower = [col.lower().replace(' ', '_').replace('-', '_') for col in df.columns]
        
        for i, col_lower in enumerate(df_columns_lower):
            original_col = df.columns[i]
            
            # Check if column should be numeric
            if any(num_col in col_lower for num_col in numeric_columns):
                errors.extend(self._validate_numeric_column(df, original_col, i))
            
            # Check if column should be date
            if 'date' in col_lower or 'period' in col_lower:
                errors.extend(self._validate_date_column(df, original_col, i))
        
        return errors
    
    def _validate_numeric_column(self, df: pd.DataFrame, col_name: str, col_index: int) -> List[ValidationError]:
        """Validate numeric column."""
        errors = []
        
        for row_idx, value in enumerate(df[col_name]):
            if pd.isna(value):
                continue
            
            # Try to convert to numeric
            try:
                numeric_value = pd.to_numeric(value, errors='raise')
                
                # Check for reasonable ranges
                if abs(numeric_value) > 1e12:  # 1 trillion
                    errors.append(ValidationError(
                        row_idx + 1,
                        col_name,
                        f"Value {numeric_value} seems unusually large",
                        "warning"
                    ))
                
            except (ValueError, TypeError):
                errors.append(ValidationError(
                    row_idx + 1,
                    col_name,
                    f"Invalid numeric value: '{value}'",
                    "error"
                ))
        
        return errors
    
    def _validate_date_column(self, df: pd.DataFrame, col_name: str, col_index: int) -> List[ValidationError]:
        """Validate date column."""
        errors = []
        
        for row_idx, value in enumerate(df[col_name]):
            if pd.isna(value):
                continue
            
            # Try to parse as date
            try:
                parsed_date = pd.to_datetime(value, errors='raise')
                
                # Check if date is in reasonable range
                current_year = datetime.now().year
                if parsed_date.year < 1900 or parsed_date.year > current_year + 10:
                    errors.append(ValidationError(
                        row_idx + 1,
                        col_name,
                        f"Date {parsed_date.strftime('%Y-%m-%d')} is outside reasonable range",
                        "warning"
                    ))
                
            except (ValueError, TypeError):
                errors.append(ValidationError(
                    row_idx + 1,
                    col_name,
                    f"Invalid date format: '{value}'",
                    "error"
                ))
        
        return errors
    
    def _validate_data_quality(self, df: pd.DataFrame, category: str) -> List[ValidationError]:
        """Validate data quality issues."""
        errors = []
        
        # Check for excessive missing values
        for col in df.columns:
            missing_pct = df[col].isna().sum() / len(df) * 100
            if missing_pct > 80:
                errors.append(ValidationError(
                    None,
                    col,
                    f"Column has {missing_pct:.1f}% missing values",
                    "warning"
                ))
        
        # Check for duplicate rows
        duplicate_rows = df.duplicated().sum()
        if duplicate_rows > 0:
            errors.append(ValidationError(
                None,
                None,
                f"Found {duplicate_rows} duplicate rows",
                "warning"
            ))
        
        # Category-specific quality checks
        if category == 'revenue':
            errors.extend(self._validate_revenue_quality(df))
        elif category == 'expenses':
            errors.extend(self._validate_expenses_quality(df))
        elif category == 'cash_flow':
            errors.extend(self._validate_cash_flow_quality(df))
        
        return errors
    
    def _validate_revenue_quality(self, df: pd.DataFrame) -> List[ValidationError]:
        """Validate revenue-specific data quality."""
        errors = []
        
        # Find amount column
        amount_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['amount', 'revenue', 'sales'])]
        
        if amount_cols:
            amount_col = amount_cols[0]
            numeric_amounts = pd.to_numeric(df[amount_col], errors='coerce')
            
            # Check for negative revenue
            negative_revenue = numeric_amounts < 0
            if negative_revenue.any():
                negative_rows = df[negative_revenue].index + 1
                errors.append(ValidationError(
                    None,
                    amount_col,
                    f"Found negative revenue values in rows: {list(negative_rows)[:5]}",
                    "warning"
                ))
            
            # Check for zero revenue
            zero_revenue = numeric_amounts == 0
            if zero_revenue.sum() > len(df) * 0.5:  # More than 50% zeros
                errors.append(ValidationError(
                    None,
                    amount_col,
                    "More than 50% of revenue values are zero",
                    "warning"
                ))
        
        return errors
    
    def _validate_expenses_quality(self, df: pd.DataFrame) -> List[ValidationError]:
        """Validate expenses-specific data quality."""
        errors = []
        
        # Find amount column
        amount_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['amount', 'expense', 'cost'])]
        
        if amount_cols:
            amount_col = amount_cols[0]
            numeric_amounts = pd.to_numeric(df[amount_col], errors='coerce')
            
            # Check for negative expenses (might be refunds, but flag as warning)
            negative_expenses = numeric_amounts < 0
            if negative_expenses.any():
                negative_rows = df[negative_expenses].index + 1
                errors.append(ValidationError(
                    None,
                    amount_col,
                    f"Found negative expense values in rows: {list(negative_rows)[:5]} (may be refunds)",
                    "warning"
                ))
        
        return errors
    
    def _validate_cash_flow_quality(self, df: pd.DataFrame) -> List[ValidationError]:
        """Validate cash flow-specific data quality."""
        errors = []
        
        # Find inflow and outflow columns
        inflow_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['inflow', 'income', 'receipts'])]
        outflow_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in ['outflow', 'payments', 'expenses'])]
        
        if inflow_cols and outflow_cols:
            inflow_col = inflow_cols[0]
            outflow_col = outflow_cols[0]
            
            numeric_inflows = pd.to_numeric(df[inflow_col], errors='coerce')
            numeric_outflows = pd.to_numeric(df[outflow_col], errors='coerce')
            
            # Check for negative inflows
            negative_inflows = numeric_inflows < 0
            if negative_inflows.any():
                negative_rows = df[negative_inflows].index + 1
                errors.append(ValidationError(
                    None,
                    inflow_col,
                    f"Found negative inflow values in rows: {list(negative_rows)[:5]}",
                    "warning"
                ))
            
            # Check for negative outflows
            negative_outflows = numeric_outflows < 0
            if negative_outflows.any():
                negative_rows = df[negative_outflows].index + 1
                errors.append(ValidationError(
                    None,
                    outflow_col,
                    f"Found negative outflow values in rows: {list(negative_rows)[:5]}",
                    "warning"
                ))
        
        return errors
    
    def suggest_corrections(self, df: pd.DataFrame, category: str) -> List[Dict[str, Any]]:
        """Suggest corrections for common data issues."""
        suggestions = []
        
        # Suggest column name corrections
        required_cols = self.required_columns.get(category, [])
        df_columns_lower = [col.lower().replace(' ', '_').replace('-', '_') for col in df.columns]
        
        for required_col in required_cols:
            if required_col.lower() not in df_columns_lower:
                # Find similar column names
                similar_cols = []
                for i, col_lower in enumerate(df_columns_lower):
                    if self._similarity_score(required_col.lower(), col_lower) > 0.6:
                        similar_cols.append(df.columns[i])
                
                if similar_cols:
                    suggestions.append({
                        'type': 'column_mapping',
                        'message': f"Map column '{similar_cols[0]}' to '{required_col}'",
                        'from_column': similar_cols[0],
                        'to_column': required_col
                    })
        
        return suggestions
    
    def _similarity_score(self, str1: str, str2: str) -> float:
        """Calculate similarity score between two strings."""
        # Simple similarity based on common characters
        set1 = set(str1.lower())
        set2 = set(str2.lower())
        
        intersection = set1.intersection(set2)
        union = set1.union(set2)
        
        if len(union) == 0:
            return 0.0
        
        return len(intersection) / len(union)