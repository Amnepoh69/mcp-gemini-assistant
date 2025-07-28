#!/usr/bin/env python3
"""
Test the GET /scenarios endpoint with different users
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.services.scenario_service import ScenarioService

def test_get_scenarios_endpoint():
    """Test what scenarios are returned for different users"""
    
    db = SessionLocal()
    
    try:
        # Get users
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        regular_user = db.query(User).filter(User.role != UserRole.ADMIN).first()
        
        service = ScenarioService(db)
        
        print("🔍 Testing GET /scenarios endpoint\n")
        
        # Test for admin user
        admin_scenarios = service.get_user_scenarios(admin_user.id)
        print(f"📊 Admin user ({admin_user.email}) sees {len(admin_scenarios)} scenarios:")
        
        for scenario in admin_scenarios:
            is_admin = admin_user.role.value == "admin"
            can_delete = scenario.can_be_deleted_by_user(admin_user.id, is_admin)
            
            print(f"   - '{scenario.name}':")
            print(f"     • is_admin_created: {scenario.is_admin_created}")
            print(f"     • can_delete: {can_delete}")
            print(f"     • owner_id: {scenario.user_id}")
        
        print()
        
        # Test for regular user  
        regular_scenarios = service.get_user_scenarios(regular_user.id)
        print(f"📊 Regular user ({regular_user.email}) sees {len(regular_scenarios)} scenarios:")
        
        for scenario in regular_scenarios:
            is_admin = regular_user.role.value == "admin"
            can_delete = scenario.can_be_deleted_by_user(regular_user.id, is_admin)
            
            print(f"   - '{scenario.name}':")
            print(f"     • is_admin_created: {scenario.is_admin_created}")
            print(f"     • can_delete: {can_delete}")
            print(f"     • owner_id: {scenario.user_id}")
            print(f"     • is_owner: {scenario.user_id == regular_user.id}")
        
        print("\n✅ Expected behavior:")
        print("   - Both users should see admin scenarios (but regular users can't delete them)")
        print("   - Users should see their own scenarios (and can delete them)")
        print("   - Admin can delete any scenario")
            
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_get_scenarios_endpoint()