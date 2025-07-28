#!/usr/bin/env python3
"""
Debug authentication service
"""

import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(__file__))

from app.services.auth_service import auth_service
from app.database import SessionLocal
from shared.types import LoginRequest
from sqlalchemy.orm import Session


async def test_auth_service():
    """Test authentication service directly"""
    db = SessionLocal()
    
    try:
        print("Testing authentication service...")
        
        # Test credentials
        login_data = LoginRequest(
            email="cfo@example.com",
            password="cfo123456"
        )
        
        print(f"Attempting login for: {login_data.email}")
        
        # Test authentication
        user = await auth_service.authenticate_user(db, login_data)
        
        if user:
            print("✅ Authentication successful!")
            print(f"User ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Role: {user.role}")
            print(f"Status: {user.status}")
            print(f"Is Active: {user.is_active()}")
            
            # Test session creation
            session = await auth_service.create_user_session(db, user)
            print("✅ Session creation successful!")
            print(f"Access token generated: {bool(session.access_token)}")
            print(f"Refresh token generated: {bool(session.refresh_token)}")
            
        else:
            print("❌ Authentication failed")
            
            # Let's debug why
            from app.models.user import User
            user_record = db.query(User).filter(User.email == login_data.email).first()
            if user_record:
                print(f"User found in database: {user_record.email}")
                print(f"User status: {user_record.status}")
                print(f"Is active: {user_record.is_active()}")
                print(f"Has password: {bool(user_record.hashed_password)}")
                
                # Test password verification directly
                from app.core.security import security_manager
                if user_record.hashed_password:
                    password_valid = security_manager.verify_password(
                        login_data.password, 
                        user_record.hashed_password
                    )
                    print(f"Password valid: {password_valid}")
                else:
                    print("No password hash found")
            else:
                print("User not found in database")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(test_auth_service())