#!/usr/bin/env python3
"""
Update user password
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User
from app.core.security import security_manager

def update_user_password(email: str, new_password: str):
    """Update password for a user"""
    
    db = SessionLocal()
    
    try:
        # Find user
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User with email {email} not found")
            return False
        
        # Update password
        hashed_password = security_manager.hash_password(new_password)
        user.password_hash = hashed_password
        
        db.commit()
        db.refresh(user)
        
        print(f"✅ Password updated successfully for {email}")
        print(f"   New password: {new_password}")
        return True
        
    except Exception as e:
        print(f"❌ Error updating password: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    # Update password for test user
    email = "test@example.com"
    password = "test1234"  # Simple password for testing (8 chars minimum)
    
    print(f"Updating password for {email}...")
    success = update_user_password(email, password)
    
    if success:
        print("\n🔐 Login credentials:")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print("\n🌐 Login at: http://localhost:3000")