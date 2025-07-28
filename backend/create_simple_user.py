#!/usr/bin/env python3
"""
Create a user with simple password
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User
from app.core.security import security_manager
from datetime import datetime

def create_simple_user():
    """Create a user with simple credentials"""
    
    db = SessionLocal()
    
    try:
        # Check if user already exists
        email = "demo@test.com"
        existing_user = db.query(User).filter(User.email == email).first()
        
        if existing_user:
            print(f"User {email} already exists, deleting...")
            db.delete(existing_user)
            db.commit()
        
        # Create new user with simple password
        password = "Demo1234"  # Meets minimum requirements
        hashed_password = security_manager.hash_password(password)
        
        user = User(
            email=email,
            hashed_password=hashed_password,
            first_name="Demo",
            last_name="User",
            role="ANALYST",
            status="ACTIVE",
            auth_provider="EMAIL",
            email_verified=True,
            is_onboarded=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"✅ Created demo user successfully!")
        print(f"\n🔐 Login credentials:")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"\n🌐 You can now login at: http://localhost:3000")
        
        # Test login
        print("\nTesting login...")
        import requests
        response = requests.post(
            "http://localhost:8000/api/v1/auth/login",
            json={"email": email, "password": password}
        )
        
        if response.status_code == 200:
            print("✅ Login test successful!")
        else:
            print(f"❌ Login test failed: {response.text}")
        
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_simple_user()