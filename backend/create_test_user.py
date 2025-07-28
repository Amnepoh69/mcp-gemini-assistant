#!/usr/bin/env python3
"""
Create a test user for the CFO/CTO Helper MVP
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.auth_service import auth_service
from app.database import SessionLocal
from shared.types import UserCreate, UserRole, AuthProvider

async def create_test_user():
    """Create a test user with strong password"""
    db = SessionLocal()
    
    try:
        # Test user data
        user_data = UserCreate(
            email="test@example.com",
            password="TestPassword123!",  # Strong password: 8+ chars, upper, lower, number, special
            first_name="Test",
            last_name="User",
            auth_provider=AuthProvider.EMAIL
        )
        
        print("Creating test user...")
        print(f"Email: {user_data.email}")
        print(f"Password: {user_data.password}")
        print(f"Name: {user_data.first_name} {user_data.last_name}")
        print("Password requirements:")
        print("  ✓ At least 8 characters")
        print("  ✓ One uppercase letter")
        print("  ✓ One lowercase letter") 
        print("  ✓ One number")
        print("  ✓ One special character")
        
        # Check if user already exists
        from app.models.user import User
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            print(f"\n❌ User with email {user_data.email} already exists!")
            print("Delete the existing user first or use a different email.")
            return
        
        # Create user
        user, verification_token = await auth_service.register_user(db, user_data)
        
        print(f"\n✅ Test user created successfully!")
        print(f"User ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Status: {user.status}")
        print(f"Role: {user.role}")
        
        if verification_token:
            print(f"Verification token: {verification_token}")
        
        print("\n🔐 Login credentials:")
        print(f"Email: {user_data.email}")
        print(f"Password: {user_data.password}")
        
        print("\n🌐 You can now test the login at:")
        print("Frontend: http://localhost:3000")
        print("Backend: http://localhost:8001/docs")
        
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(create_test_user())