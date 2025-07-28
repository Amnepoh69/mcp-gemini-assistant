#!/usr/bin/env python3
"""Test authentication system."""

import asyncio
import httpx
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv('backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/cfo_cto_helper')

async def test_auth():
    """Test the authentication system."""
    print("🔐 Testing CFO/CTO Helper Authentication System")
    print("=" * 50)
    
    # Test 1: Database connection
    print("\n1. Testing database connection...")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text('SELECT COUNT(*) FROM users'))
            count = result.fetchone()[0]
            print(f"✅ Database connected! Found {count} users.")
            
            # Get test users
            result = conn.execute(text('SELECT email, first_name, last_name, role FROM users LIMIT 3'))
            users = result.fetchall()
            print("📋 Test users:")
            for user in users:
                print(f"   - {user[1]} {user[2]} ({user[3]}) - {user[0]}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return
    
    # Test 2: Start backend server
    print("\n2. Testing backend server...")
    backend_url = "http://localhost:8000"
    
    try:
        # Start the backend server in background
        import subprocess
        import time
        
        print("   Starting backend server...")
        process = subprocess.Popen([
            'python3', '-c', '''
import uvicorn
from simple_backend import app
uvicorn.run(app, host="0.0.0.0", port=8000)
'''
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for server to start
        time.sleep(3)
        
        # Test health endpoint
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{backend_url}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Backend server healthy! Status: {data['status']}")
                print(f"   Database: {data['database']}")
            else:
                print(f"❌ Backend server unhealthy: {response.status_code}")
                return
    except Exception as e:
        print(f"❌ Backend server test failed: {e}")
        return
    
    # Test 3: API endpoints
    print("\n3. Testing API endpoints...")
    try:
        async with httpx.AsyncClient() as client:
            # Test user list
            response = await client.get(f"{backend_url}/api/v1/users/test")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Users API working! Found {len(data['users'])} users.")
            else:
                print(f"❌ Users API failed: {response.status_code}")
            
            # Test login
            response = await client.post(f"{backend_url}/api/v1/auth/login", json={
                "email": "admin@cfohelper.com",
                "password": "admin123"
            })
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Login API working! User: {data['user']['first_name']} {data['user']['last_name']}")
            else:
                print(f"❌ Login API failed: {response.status_code}")
    except Exception as e:
        print(f"❌ API test failed: {e}")
    
    # Test 4: Frontend setup
    print("\n4. Testing frontend setup...")
    try:
        # Check if Node.js is available
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js available: {result.stdout.strip()}")
        else:
            print("❌ Node.js not available")
            return
        
        # Check if npm is available
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ npm available: {result.stdout.strip()}")
        else:
            print("❌ npm not available")
            return
        
        # Check if frontend dependencies are installed
        if os.path.exists('frontend/node_modules'):
            print("✅ Frontend dependencies installed")
        else:
            print("❌ Frontend dependencies not installed")
            
    except Exception as e:
        print(f"❌ Frontend test failed: {e}")
    
    print("\n🎉 Authentication system test completed!")
    print("\nNext steps:")
    print("1. Start the backend: python3 simple_backend.py")
    print("2. In another terminal, start the frontend: cd frontend && npm run dev")
    print("3. Open http://localhost:3000 in your browser")
    print("4. Test login with: admin@cfohelper.com / admin123")
    
    # Clean up
    try:
        process.terminate()
    except:
        pass

if __name__ == "__main__":
    asyncio.run(test_auth())