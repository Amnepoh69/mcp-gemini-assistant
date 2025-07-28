#!/usr/bin/env python3
"""
Create users directly without using auth service
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User, UserRole, AuthProvider, UserStatus
from app.core.security import security_manager
from datetime import datetime

def create_users_direct():
    """Create users directly in database"""
    db = SessionLocal()
    
    demo_users = [
        {
            "email": "test@example.com",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User",
            "role": UserRole.ANALYST
        },
        {
            "email": "cfo@example.com", 
            "password": "cfo123456",
            "first_name": "CFO",
            "last_name": "User",
            "role": UserRole.CFO
        },
        {
            "email": "cto@example.com",
            "password": "cto123456", 
            "first_name": "CTO",
            "last_name": "User",
            "role": UserRole.CTO
        },
        {
            "email": "analyst@example.com",
            "password": "analyst123456",
            "first_name": "Analyst", 
            "last_name": "User",
            "role": UserRole.ANALYST
        }
    ]
    
    try:
        print("🚀 Creating demo users directly...")
        print("=" * 50)
        
        for user_info in demo_users:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_info["email"]).first()
            if existing_user:
                print(f"⚠️  User {user_info['email']} already exists, skipping...")
                continue
            
            # Hash password
            hashed_password = security_manager.hash_password(user_info["password"])
            
            # Create user directly
            user = User(
                email=user_info["email"],
                hashed_password=hashed_password,
                first_name=user_info["first_name"],
                last_name=user_info["last_name"],
                role=user_info["role"],
                status=UserStatus.ACTIVE,
                auth_provider=AuthProvider.EMAIL,
                is_onboarded=True,
                email_verified=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(user)
            db.commit()
            
            print(f"✅ Created {user_info['role'].value}: {user_info['email']}")
            print(f"   Password: {user_info['password']}")
            print(f"   Name: {user_info['first_name']} {user_info['last_name']}")
            print()
        
        print("=" * 50)
        print("🎉 Demo users created successfully!")
        print()
        print("📋 Available accounts:")
        print("   🔧 Admin:    admin@example.com    / admin123456")
        print("   💼 CFO:      cfo@example.com      / cfo123456") 
        print("   🖥️  CTO:      cto@example.com      / cto123456")
        print("   📊 Analyst:  analyst@example.com  / analyst123456")
        print("   🧪 Test:     test@example.com     / TestPassword123!")
        print()
        print("🌐 Access the system at:")
        print("   Frontend: http://localhost:3000")
        print("   Backend:  http://localhost:8000/docs")
        
    except Exception as e:
        print(f"❌ Error creating demo users: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_users_direct()