#!/usr/bin/env python3
"""
Test script for scenario API endpoints
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.models.user import User
from app.models.rate_scenario import RateScenario
from app.api.dependencies import get_current_user
import json

# Create a test client
client = TestClient(app)

# Mock user for testing
def mock_get_current_user():
    return User(
        id=1,
        email="test@example.com",
        full_name="Test User",
        is_active=True,
        is_verified=True
    )

# Override the dependency
app.dependency_overrides[get_current_user] = mock_get_current_user

def test_get_scenarios():
    """Test getting user scenarios"""
    print("Testing GET /api/v1/rate-scenarios/")
    
    response = client.get("/api/v1/rate-scenarios/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    assert response.status_code == 200
    scenarios = response.json()
    assert isinstance(scenarios, list)
    print(f"Found {len(scenarios)} scenarios")
    return scenarios

def test_get_scenario_forecasts():
    """Test getting scenario forecasts"""
    scenarios = test_get_scenarios()
    
    if scenarios:
        scenario_id = scenarios[0]['id']
        print(f"\nTesting GET /api/v1/rate-scenarios/{scenario_id}/forecasts")
        
        response = client.get(f"/api/v1/rate-scenarios/{scenario_id}/forecasts")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        forecasts = response.json()
        assert isinstance(forecasts, list)
        print(f"Found {len(forecasts)} forecasts for scenario {scenario_id}")
    else:
        print("No scenarios found to test forecasts")

def test_upload_scenario():
    """Test uploading scenario file"""
    print("\nTesting POST /api/v1/rate-scenarios/upload")
    
    # Test with the forecast file
    file_path = "/Users/igorsuvorov/Downloads/forecast.xlsx"
    
    if os.path.exists(file_path):
        with open(file_path, 'rb') as f:
            files = {'file': ('forecast.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            response = client.post("/api/v1/rate-scenarios/upload", files=files)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            results = response.json()
            print(f"Upload successful: {len(results)} scenarios processed")
            for result in results:
                print(f"  {result['scenario_name']}: {result['records_created']} records created")
        else:
            print(f"Upload failed: {response.json()}")
    else:
        print(f"Test file not found: {file_path}")

def test_public_scenarios():
    """Test getting public scenarios"""
    print("\nTesting GET /api/v1/rate-scenarios/public/scenarios")
    
    response = client.get("/api/v1/rate-scenarios/public/scenarios")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    assert response.status_code == 200
    scenarios = response.json()
    assert isinstance(scenarios, list)
    print(f"Found {len(scenarios)} public scenarios")

if __name__ == "__main__":
    print("Starting scenario API tests...")
    
    try:
        test_get_scenarios()
        test_get_scenario_forecasts()
        test_upload_scenario()
        test_public_scenarios()
        print("\nAll tests completed successfully!")
    except Exception as e:
        print(f"Test failed: {str(e)}")
        import traceback
        traceback.print_exc()