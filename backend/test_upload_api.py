#!/usr/bin/env python3
"""
Test scenario upload API endpoint
"""
import requests
import json

def test_upload_scenario():
    """Test uploading the forecast Excel file"""
    
    url = "http://localhost:8000/api/v1/rate-scenarios/upload"
    file_path = "/Users/igorsuvorov/Downloads/forecast.xlsx"
    
    # Mock authentication header (since we don't have a real user session)
    headers = {
        'Authorization': 'Bearer mock-token-for-testing'
    }
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': ('forecast.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            
            print("Testing scenario upload...")
            response = requests.post(url, files=files, headers=headers)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            
            if response.status_code == 200:
                print("\n✅ Upload successful!")
                results = response.json()
                for result in results:
                    print(f"  📊 {result['scenario_name']}: {result['records_created']} records created")
            else:
                print(f"\n❌ Upload failed: {response.status_code}")
                
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}")
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure it's running on localhost:8000")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_get_scenarios():
    """Test getting scenarios"""
    
    url = "http://localhost:8000/api/v1/rate-scenarios/public/scenarios"
    
    try:
        print("\nTesting get public scenarios...")
        response = requests.get(url)
        
        print(f"Status Code: {response.status_code}")
        scenarios = response.json()
        
        print(f"Found {len(scenarios)} public scenarios")
        for scenario in scenarios:
            print(f"  📈 {scenario['name']} ({scenario['code']})")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_upload_scenario()
    test_get_scenarios()