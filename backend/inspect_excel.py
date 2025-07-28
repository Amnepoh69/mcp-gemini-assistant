#!/usr/bin/env python3
"""
Inspect Excel file structure to understand the data layout
"""

import pandas as pd
import numpy as np

def inspect_excel_structure():
    """Inspect Excel file structure in detail"""
    
    file_path = "/Users/igorsuvorov/Downloads/forecast.xlsx"
    
    try:
        print("Detailed Excel file inspection...")
        
        # Read Excel file without any processing
        df = pd.read_excel(file_path, engine='openpyxl', header=None)
        
        print(f"Shape: {df.shape}")
        print(f"Columns: {df.columns.tolist()}")
        
        print("\nFull DataFrame:")
        print(df.to_string())
        
        print("\nNon-null values by column:")
        for col in df.columns:
            non_null_count = df[col].notna().sum()
            print(f"  Column {col}: {non_null_count} non-null values")
            if non_null_count > 0:
                print(f"    Sample values: {df[col].dropna().head(3).tolist()}")
        
        print("\nLooking for date patterns...")
        for col in df.columns:
            for idx, value in df[col].items():
                if pd.notna(value) and isinstance(value, str):
                    # Check if it looks like a date
                    if any(char in str(value) for char in ['2025', '2026', '2027', '/', '-']):
                        print(f"  Possible date at [{idx}, {col}]: {value}")
                    # Check if it looks like a scenario name
                    if any(word in str(value).lower() for word in ['базовый', 'консервативный', 'оптимистичный', 'сценарий']):
                        print(f"  Possible scenario at [{idx}, {col}]: {value}")
        
        print("\nLooking for numeric patterns...")
        for col in df.columns:
            numeric_values = []
            for idx, value in df[col].items():
                if pd.notna(value) and isinstance(value, (int, float)) and not isinstance(value, bool):
                    if 0 < value < 1:  # Likely a decimal rate
                        numeric_values.append((idx, value))
            if numeric_values:
                print(f"  Column {col} decimal values: {numeric_values[:5]}")
        
        print("\nTrying different header rows...")
        for header_row in range(min(10, len(df))):
            try:
                df_test = pd.read_excel(file_path, engine='openpyxl', header=header_row)
                if not df_test.empty and df_test.columns.notna().all():
                    print(f"  Header row {header_row}: {df_test.columns.tolist()}")
                    if len(df_test) > 0:
                        print(f"    First data row: {df_test.iloc[0].tolist()}")
            except:
                pass
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    inspect_excel_structure()