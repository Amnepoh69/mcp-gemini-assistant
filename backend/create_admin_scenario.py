#!/usr/bin/env python3
"""
Script to create admin scenarios for testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.scenario import Scenario
from app.models.user import User, UserRole
from app.services.scenario_service import ScenarioType

def create_admin_scenario():
    """Create an admin scenario for testing"""
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Find admin user
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin_user:
            print("❌ No admin user found")
            return
        
        # Create admin scenario
        admin_scenario = Scenario(
            user_id=admin_user.id,
            name="Market Stress Test (Admin Template)",
            description="Comprehensive market stress test scenario created by administrators. This scenario cannot be deleted by regular users.",
            scenario_type=ScenarioType.STRESS_TEST,
            parameters={
                "market_shock": 0.3,
                "currency_volatility": 0.25,
                "interest_rate_change": 0.05,
                "commodity_impact": 0.15
            },
            data_upload_ids=[],
            status="created",
            is_admin_created=True
        )
        
        db.add(admin_scenario)
        db.commit()
        db.refresh(admin_scenario)
        
        print(f"✅ Created admin scenario: '{admin_scenario.name}' (ID: {admin_scenario.id})")
        print(f"   - Created by: {admin_user.email}")
        print(f"   - Admin created: {admin_scenario.is_admin_created}")
        
        # Create regular user scenario for comparison
        regular_user = db.query(User).filter(User.role != UserRole.ADMIN).first()
        if regular_user:
            user_scenario = Scenario(
                user_id=regular_user.id,
                name="Custom Risk Analysis",
                description="User-created scenario for testing deletion permissions.",
                scenario_type=ScenarioType.RISK_ASSESSMENT,
                parameters={
                    "risk_factors": ["revenue_volatility", "market_exposure"]
                },
                data_upload_ids=[],
                status="created",
                is_admin_created=False
            )
            
            db.add(user_scenario)
            db.commit()
            db.refresh(user_scenario)
            
            print(f"✅ Created user scenario: '{user_scenario.name}' (ID: {user_scenario.id})")
            print(f"   - Created by: {regular_user.email}")
            print(f"   - Admin created: {user_scenario.is_admin_created}")
        
    except Exception as e:
        print(f"❌ Error creating scenarios: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_scenario()