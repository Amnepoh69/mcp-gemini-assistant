#!/usr/bin/env python3
"""
Test all demo user credentials
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.auth_service import auth_service
from app.database import SessionLocal
from shared.types import LoginRequest

async def test_all_users():
    """Test authentication for all demo users"""
    db = SessionLocal()
    
    test_credentials = [
        ('test@example.com', 'TestPassword123!'),
        ('cfo@example.com', 'cfo123456'),
        ('cto@example.com', 'cto123456'),
        ('analyst@example.com', 'analyst123456'),
    ]
    
    print("Testing all demo user credentials:")
    print("=" * 50)
    
    for email, password in test_credentials:
        try:
            login_data = LoginRequest(email=email, password=password)
            user = await auth_service.authenticate_user(db, login_data)
            if user:
                print(f"✅ {email}: Success (Role: {user.role})")
            else:
                print(f"❌ {email}: Failed")
        except Exception as e:
            print(f"❌ {email}: Error - {e}")
    
    db.close()

if __name__ == "__main__":
    asyncio.run(test_all_users())