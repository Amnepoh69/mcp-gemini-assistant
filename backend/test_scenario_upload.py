#!/usr/bin/env python3
"""
Test script for scenario upload functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.rate_scenario_service import RateScenarioService
from app.database import SessionLocal
import pandas as pd

def test_excel_parsing():
    """Test Excel file parsing"""
    
    # Path to the forecast file
    file_path = "/Users/igorsuvorov/Downloads/forecast.xlsx"
    
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found")
        return
    
    try:
        # Create a database session
        db = SessionLocal()
        
        # Create service instance
        service = RateScenarioService(db)
        
        # Test parsing Excel file
        print("Testing Excel file parsing...")
        scenarios_data = service.parse_excel_file(file_path)
        
        print(f"Successfully parsed {len(scenarios_data)} scenarios:")
        
        for scenario_name, scenario_data in scenarios_data.items():
            print(f"\nScenario: {scenario_name}")
            print(f"  Records: {len(scenario_data)}")
            
            if scenario_data:
                print(f"  First record: {scenario_data[0]}")
                print(f"  Last record: {scenario_data[-1]}")
                
                # Show some sample data
                print("  Sample data:")
                for i, record in enumerate(scenario_data[:3]):
                    print(f"    {i+1}. {record['forecast_date']}: {record['rate_value']:.2f}%")
                
                if len(scenario_data) > 3:
                    print(f"    ... and {len(scenario_data) - 3} more records")
        
        # Test uploading scenarios
        print("\nTesting scenario upload...")
        results = service.upload_scenarios_from_excel(file_path, user_id=1)
        
        print(f"Upload results:")
        for result in results:
            print(f"  {result.scenario_name}: {result.records_created} records created")
            if result.errors:
                print(f"    Errors: {result.errors}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

def inspect_excel_directly():
    """Inspect Excel file directly with pandas"""
    
    file_path = "/Users/igorsuvorov/Downloads/forecast.xlsx"
    
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found")
        return
    
    try:
        print("Inspecting Excel file directly...")
        
        # Read Excel file
        df = pd.read_excel(file_path, engine='openpyxl')
        
        print(f"Shape: {df.shape}")
        print(f"Columns: {df.columns.tolist()}")
        print(f"Index: {df.index.tolist()[:5]}")
        
        print("\nFirst 5 rows:")
        print(df.head())
        
        print("\nData types:")
        print(df.dtypes)
        
        print("\nSample data:")
        for col in df.columns:
            print(f"  {col}: {df[col].iloc[0] if not df[col].empty else 'Empty'}")
        
    except Exception as e:
        print(f"Error reading Excel file: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Starting scenario upload test...")
    
    # First inspect the Excel file
    inspect_excel_directly()
    
    # Then test the service
    test_excel_parsing()