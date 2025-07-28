#!/usr/bin/env python3
"""
Test rate scenario permissions functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.services.rate_scenario_service import RateScenarioService

def test_rate_scenarios_permissions():
    """Test rate scenario permissions"""
    
    db = SessionLocal()
    
    try:
        # Get users
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        regular_user = db.query(User).filter(User.role != UserRole.ADMIN).first()
        
        service = RateScenarioService(db)
        
        print("🔍 Testing Rate Scenarios Permissions\n")
        
        # Test for admin user
        admin_scenarios = service.get_scenarios_by_user(admin_user.id)
        print(f"📊 Admin user ({admin_user.email}) sees {len(admin_scenarios)} rate scenarios:")
        
        for scenario in admin_scenarios:
            is_admin = admin_user.role.value == "admin"
            can_delete = scenario.can_be_deleted_by_user(admin_user.id, is_admin)
            
            print(f"   - '{scenario.name}':")
            print(f"     • is_admin_created: {scenario.is_admin_created}")
            print(f"     • can_delete: {can_delete}")
            print(f"     • owner_id: {scenario.user_id}")
        
        print()
        
        # Test for regular user  
        regular_scenarios = service.get_scenarios_by_user(regular_user.id)
        print(f"📊 Regular user ({regular_user.email}) sees {len(regular_scenarios)} rate scenarios:")
        
        for scenario in regular_scenarios:
            is_admin = regular_user.role.value == "admin"
            can_delete = scenario.can_be_deleted_by_user(regular_user.id, is_admin)
            
            print(f"   - '{scenario.name}':")
            print(f"     • is_admin_created: {scenario.is_admin_created}")
            print(f"     • can_delete: {can_delete}")
            print(f"     • owner_id: {scenario.user_id}")
            print(f"     • is_owner: {scenario.user_id == regular_user.id}")
        
        print("\n✅ Expected behavior:")
        print("   - Both users should see admin rate scenarios (marked with is_admin_created=True)")
        print("   - Regular users should NOT be able to delete admin scenarios (can_delete=False)")
        print("   - Users should be able to delete their own scenarios (can_delete=True)")
        print("   - Admin can delete any scenario (can_delete=True)")
            
    except Exception as e:
        print(f"❌ Error testing rate scenario permissions: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_rate_scenarios_permissions()