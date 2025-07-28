#!/usr/bin/env python3
"""
Test script for scenario deletion permissions
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.scenario import Scenario
from app.models.user import User, UserRole

def test_scenario_permissions():
    """Test scenario deletion permissions"""
    
    db = SessionLocal()
    
    try:
        # Get users
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        regular_user = db.query(User).filter(User.role != UserRole.ADMIN).first()
        
        # Get scenarios
        admin_scenario = db.query(Scenario).filter(Scenario.is_admin_created == True).first()
        user_scenario = db.query(Scenario).filter(Scenario.is_admin_created == False).first()
        
        print("🧪 Testing Scenario Deletion Permissions\n")
        
        if admin_scenario:
            print(f"📋 Admin Scenario: '{admin_scenario.name}' (ID: {admin_scenario.id})")
            print(f"   - Admin can delete: {admin_scenario.can_be_deleted_by_user(admin_user.id, True)}")
            print(f"   - Regular user can delete: {admin_scenario.can_be_deleted_by_user(regular_user.id, False)}")
            print()
        
        if user_scenario:
            print(f"📋 User Scenario: '{user_scenario.name}' (ID: {user_scenario.id})")
            print(f"   - Admin can delete: {user_scenario.can_be_deleted_by_user(admin_user.id, True)}")
            print(f"   - Owner can delete: {user_scenario.can_be_deleted_by_user(user_scenario.user_id, False)}")
            print(f"   - Other user can delete: {user_scenario.can_be_deleted_by_user(admin_user.id, False)}")
            print()
        
        # Summary
        print("✅ Expected behavior:")
        print("   - Admins can delete any scenario")
        print("   - Regular users can only delete their own non-admin scenarios")
        print("   - Admin-created scenarios cannot be deleted by regular users")
        
    except Exception as e:
        print(f"❌ Error testing permissions: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_scenario_permissions()