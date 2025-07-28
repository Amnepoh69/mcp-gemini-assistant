#!/usr/bin/env python3
"""
Test scenario functionality with authentication
"""

import requests
import json
import os

def login():
    """Login and get access token"""
    
    url = "http://localhost:8000/api/v1/auth/login"
    
    user_data = {
        "email": "test@example.com", 
        "password": "TestPassword123!"
    }
    
    print("🔐 Logging in...")
    response = requests.post(url, json=user_data)
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('access_token')
        print(f"✅ Login successful! Token: {token[:50]}...")
        return token
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def test_get_scenarios(token):
    """Test getting user scenarios"""
    
    url = "http://localhost:8000/api/v1/rate-scenarios/"
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n📊 Getting user scenarios...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        scenarios = response.json()
        print(f"✅ Found {len(scenarios)} scenarios")
        
        for scenario in scenarios:
            print(f"  📈 {scenario['name']} ({scenario['code']}) - {scenario['scenario_type']}")
        
        return scenarios
    else:
        print(f"❌ Failed to get scenarios: {response.text}")
        return []

def test_upload_scenario(token):
    """Test uploading scenario Excel file"""
    
    url = "http://localhost:8000/api/v1/rate-scenarios/upload"
    headers = {"Authorization": f"Bearer {token}"}
    
    file_path = "/Users/igorsuvorov/Downloads/forecast.xlsx"
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    print(f"\n📤 Uploading scenario file: {file_path}")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': ('forecast.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            response = requests.post(url, files=files, headers=headers)
        
        if response.status_code == 200:
            results = response.json()
            print(f"✅ Upload successful! Processed {len(results)} scenarios:")
            
            for result in results:
                print(f"  📊 {result['scenario_name']}: {result['records_created']} records created")
                if result['errors']:
                    print(f"    ❌ Errors: {result['errors']}")
            
            return True
        else:
            print(f"❌ Upload failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error uploading file: {str(e)}")
        return False

def test_get_scenario_forecasts(token, scenario_id):
    """Test getting forecasts for a specific scenario"""
    
    url = f"http://localhost:8000/api/v1/rate-scenarios/{scenario_id}/forecasts"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\n📈 Getting forecasts for scenario {scenario_id}...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        forecasts = response.json()
        print(f"✅ Found {len(forecasts)} forecasts")
        
        for forecast in forecasts[:3]:  # Show first 3
            print(f"  📅 {forecast['forecast_date']}: {forecast['rate_value']:.1f}%")
        
        if len(forecasts) > 3:
            print(f"  ... and {len(forecasts) - 3} more")
        
        return forecasts
    else:
        print(f"❌ Failed to get forecasts: {response.text}")
        return []

def main():
    """Main test function"""
    
    print("🧪 Testing CFO/CTO Helper Scenario Analysis")
    print("="*60)
    
    # Step 1: Login
    token = login()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    
    # Step 2: Get existing scenarios
    scenarios = test_get_scenarios(token)
    
    # Step 3: Upload scenario file (this will create duplicates, but that's OK for testing)
    upload_success = test_upload_scenario(token)
    
    # Step 4: Get scenarios again to see new ones
    if upload_success:
        print("\n" + "="*60)
        print("📊 Scenarios after upload:")
        scenarios = test_get_scenarios(token)
    
    # Step 5: Test getting forecasts for a scenario
    if scenarios:
        scenario_id = scenarios[0]['id']
        test_get_scenario_forecasts(token, scenario_id)
    
    print("\n" + "="*60)
    print("✅ All tests completed!")
    print("\n💡 You can now test the scenario analysis functionality:")
    print("   1. Login at: http://localhost:3000")
    print("   2. Use credentials: test@example.com / TestPassword123!")
    print("   3. Navigate to scenario management (when frontend is ready)")

if __name__ == "__main__":
    main()