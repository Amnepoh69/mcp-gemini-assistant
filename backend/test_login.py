#!/usr/bin/env python3
"""
Test login functionality
"""

import requests
import json

def test_login():
    """Test login with different credentials"""
    
    url = "http://localhost:8000/api/v1/auth/login"
    
    # Test credentials
    test_users = [
        {"email": "test@example.com", "password": "TestPassword123!"},
        {"email": "cfo@example.com", "password": "password123"},
        {"email": "cto@example.com", "password": "password123"},
        {"email": "test@example.com", "password": "password123"}
    ]
    
    for user in test_users:
        print(f"\nTesting login with: {user['email']}")
        
        try:
            response = requests.post(url, json=user)
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Login successful!")
                data = response.json()
                print(f"Access token: {data.get('access_token', 'N/A')[:50]}...")
                print(f"User: {data.get('user', {}).get('email', 'N/A')}")
                return data
            else:
                print("❌ Login failed")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
    
    return None

def test_register():
    """Test user registration"""
    
    url = "http://localhost:8000/api/v1/auth/register"
    
    user_data = {
        "email": "testuser@cfo.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "auth_provider": "EMAIL"
    }
    
    print(f"\nTesting registration with: {user_data['email']}")
    
    try:
        response = requests.post(url, json=user_data)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Registration successful!")
            data = response.json()
            print(f"User ID: {data.get('user', {}).get('id', 'N/A')}")
            print(f"Email: {data.get('user', {}).get('email', 'N/A')}")
            return data
        else:
            print("❌ Registration failed")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    return None

if __name__ == "__main__":
    print("Testing CFO/CTO Helper authentication...")
    
    # Try to login first
    login_result = test_login()
    
    if not login_result:
        print("\n" + "="*50)
        print("Login failed. Trying registration...")
        register_result = test_register()
        
        if register_result:
            print("\n" + "="*50)
            print("Registration successful. Trying login again...")
            test_login()
    
    print("\n" + "="*50)
    print("Test completed!")