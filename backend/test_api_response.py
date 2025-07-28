#!/usr/bin/env python3
"""
Test API response for rate scenarios to see actual JSON returned
"""

import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.api.rate_scenarios import get_user_scenarios
from app.dependencies import get_current_user
from app.database import get_db

def test_api_response():
    """Test what the API actually returns for rate scenarios"""
    
    db = SessionLocal()
    
    try:
        # Get regular user
        regular_user = db.query(User).filter(User.role != UserRole.ADMIN).first()
        
        print(f"🔍 Testing API response for user: {regular_user.email}\n")
        
        # Simulate API call
        from app.services.rate_scenario_service import RateScenarioService
        from app.schemas.rate_scenario import RateScenarioResponse
        
        service = RateScenarioService(db)
        scenarios = service.get_scenarios_by_user(regular_user.id)
        
        # Manually construct the response like API does
        is_admin = regular_user.role.value == "admin"
        result = []
        
        for scenario in scenarios:
            scenario_dict = {
                "id": scenario.id,
                "name": scenario.name,
                "code": scenario.code,
                "scenario_type": scenario.scenario_type,
                "description": scenario.description,
                "is_active": scenario.is_active,
                "is_default": scenario.is_default,
                "is_admin_created": scenario.is_admin_created,
                "created_by": scenario.created_by,
                "user_id": scenario.user_id,
                "created_at": scenario.created_at.isoformat(),
                "updated_at": scenario.updated_at.isoformat(),
                "forecasts": [],  # Simplify for testing
                "can_delete": scenario.can_be_deleted_by_user(regular_user.id, is_admin)
            }
            result.append(scenario_dict)
        
        # Print first few scenarios (the admin ones from screenshot)
        admin_scenarios = [s for s in result if s['is_admin_created']]
        user_scenarios = [s for s in result if not s['is_admin_created']]
        
        print("📋 Admin scenarios (should have can_delete=False):")
        for scenario in admin_scenarios[:3]:  # Show first 3
            print(f"  - {scenario['name']}:")
            print(f"    • is_admin_created: {scenario['is_admin_created']}")
            print(f"    • can_delete: {scenario['can_delete']}")
            print(f"    • user_id: {scenario['user_id']}")
        
        print(f"\\n📋 User scenarios (should have can_delete=True):")
        for scenario in user_scenarios[:3]:  # Show first 3
            print(f"  - {scenario['name']}:")
            print(f"    • is_admin_created: {scenario['is_admin_created']}")
            print(f"    • can_delete: {scenario['can_delete']}")
            print(f"    • user_id: {scenario['user_id']}")
        
        # Show JSON structure for first admin scenario
        if admin_scenarios:
            print(f"\\n🔍 Sample JSON for admin scenario:")
            sample = admin_scenarios[0]
            print(json.dumps({
                "name": sample["name"],
                "is_admin_created": sample["is_admin_created"], 
                "can_delete": sample["can_delete"]
            }, indent=2, ensure_ascii=False))
            
    except Exception as e:
        print(f"❌ Error testing API response: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_api_response()