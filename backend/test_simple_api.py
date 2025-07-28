#!/usr/bin/env python3
"""
Simple test for scenario API without authentication
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

# Create a test client
client = TestClient(app)

def test_public_scenarios():
    """Test getting public scenarios"""
    print("Testing GET /api/v1/rate-scenarios/public/scenarios")
    
    response = client.get("/api/v1/rate-scenarios/public/scenarios")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        scenarios = response.json()
        print(f"Found {len(scenarios)} public scenarios")
        for scenario in scenarios:
            print(f"  - {scenario['name']} ({scenario['code']})")
    
def test_health():
    """Test health endpoint"""
    print("\nTesting GET /health")
    
    response = client.get("/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    print("Starting simple API tests...")
    
    try:
        test_health()
        test_public_scenarios()
        print("\nAll tests completed!")
    except Exception as e:
        print(f"Test failed: {str(e)}")
        import traceback
        traceback.print_exc()