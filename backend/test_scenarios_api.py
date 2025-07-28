#!/usr/bin/env python3
"""
Test API responses for scenarios with permission data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.scenario import Scenario
from app.models.user import User, UserRole
from app.api.routes.scenarios import ScenarioResponse

def test_scenarios_api_data():
    """Test what data is returned by scenarios API"""
    
    db = SessionLocal()
    
    try:
        # Get users
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        regular_user = db.query(User).filter(User.role != UserRole.ADMIN).first()
        
        print("🔍 Testing API Response Data\n")
        
        # Test for admin user
        scenarios = db.query(Scenario).all()
        print(f"📊 Admin user ({admin_user.email}) sees scenarios:")
        
        for scenario in scenarios:
            is_admin = admin_user.role.value == "admin"
            can_delete = scenario.can_be_deleted_by_user(admin_user.id, is_admin)
            
            print(f"   - '{scenario.name}':")
            print(f"     • is_admin_created: {scenario.is_admin_created}")
            print(f"     • can_delete: {can_delete}")
            print(f"     • owner_id: {scenario.user_id}")
            print()
        
        # Test for regular user  
        print(f"📊 Regular user ({regular_user.email}) sees scenarios:")
        
        for scenario in scenarios:
            is_admin = regular_user.role.value == "admin"
            can_delete = scenario.can_be_deleted_by_user(regular_user.id, is_admin)
            
            print(f"   - '{scenario.name}':")
            print(f"     • is_admin_created: {scenario.is_admin_created}")
            print(f"     • can_delete: {can_delete}")
            print(f"     • owner_id: {scenario.user_id}")
            print(f"     • is_owner: {scenario.user_id == regular_user.id}")
            print()
            
    except Exception as e:
        print(f"❌ Error testing API data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_scenarios_api_data()