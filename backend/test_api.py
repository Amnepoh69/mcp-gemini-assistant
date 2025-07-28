#!/usr/bin/env python3
"""
Simple API test script to verify backend functionality
"""

import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8001"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health check: {response.status_code}")
        print(f"   Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_root():
    """Test root endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✅ Root endpoint: {response.status_code}")
        print(f"   Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Root endpoint failed: {e}")
        return False

def test_scenario_types():
    """Test scenario types endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/v1/scenario-types")
        print(f"✅ Scenario types: {response.status_code}")
        data = response.json()
        print(f"   Available types: {len(data['scenario_types'])}")
        for scenario_type in data['scenario_types']:
            print(f"     - {scenario_type['value']}: {scenario_type['label']}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Scenario types failed: {e}")
        return False

def test_protected_endpoint():
    """Test that protected endpoints require authentication"""
    try:
        response = requests.get(f"{BASE_URL}/api/v1/scenarios")
        print(f"✅ Protected endpoint (scenarios): {response.status_code}")
        if response.status_code == 403:
            print("   ✅ Correctly requires authentication")
            return True
        else:
            print(f"   ❌ Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Protected endpoint test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing CFO/CTO Helper MVP Backend")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health),
        ("Root Endpoint", test_root),
        ("Scenario Types", test_scenario_types),
        ("Authentication Required", test_protected_endpoint),
    ]
    
    passed = 0
    total = len(tests)
    
    for name, test_func in tests:
        print(f"\n🔍 {name}:")
        if test_func():
            passed += 1
        else:
            print(f"   ❌ {name} failed")
    
    print("\n" + "=" * 50)
    print(f"📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is working correctly.")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Please check the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()