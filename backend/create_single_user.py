#!/usr/bin/env python3
"""
Create a single user
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.auth_service import auth_service
from app.database import SessionLocal
from shared.types import UserCreate, UserRole, AuthProvider

async def create_single_user(email, password, first_name, last_name, role):
    """Create a single user"""
    db = SessionLocal()
    
    try:
        from app.models.user import User
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"⚠️  User {email} already exists")
            return
        
        # Create user data
        user_data = UserCreate(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            auth_provider=AuthProvider.EMAIL
        )
        
        # Create user
        user, verification_token = await auth_service.register_user(db, user_data)
        
        # Set role if different from default
        if role != UserRole.ANALYST:
            user.role = role
            db.commit()
        
        print(f"✅ Created {role.value}: {email} / {password}")
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 6:
        print("Usage: python create_single_user.py <email> <password> <first_name> <last_name> <role>")
        sys.exit(1)
    
    email, password, first_name, last_name, role_str = sys.argv[1:6]
    role = UserRole(role_str)
    
    asyncio.run(create_single_user(email, password, first_name, last_name, role))