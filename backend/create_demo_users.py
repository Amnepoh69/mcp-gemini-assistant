#!/usr/bin/env python3
"""
Create demo users for the CFO/CTO Helper MVP with different roles
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.auth_service import auth_service
from app.database import SessionLocal
from shared.types import UserCreate, UserRole, AuthProvider

async def create_demo_users():
    """Create demo users with different roles"""
    db = SessionLocal()
    
    demo_users = [
        {
            "email": "admin@example.com",
            "password": "admin123456",
            "first_name": "Admin",
            "last_name": "User",
            "role": UserRole.ADMIN
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
        },
        {
            "email": "test@example.com",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User", 
            "role": UserRole.ANALYST
        }
    ]
    
    try:
        from app.models.user import User
        
        print("🚀 Creating demo users...")
        print("=" * 50)
        
        for user_info in demo_users:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_info["email"]).first()
            if existing_user:
                print(f"⚠️  User {user_info['email']} already exists, skipping...")
                continue
            
            # Create user data
            user_data = UserCreate(
                email=user_info["email"],
                password=user_info["password"],
                first_name=user_info["first_name"],
                last_name=user_info["last_name"],
                auth_provider=AuthProvider.EMAIL
            )
            
            # Create user
            user, verification_token = await auth_service.register_user(db, user_data)
            
            # Set role if different from default
            if user_info["role"] != UserRole.ANALYST:
                user.role = user_info["role"]
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
    asyncio.run(create_demo_users())