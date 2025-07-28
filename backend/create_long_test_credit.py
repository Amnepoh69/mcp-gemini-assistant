#!/usr/bin/env python3
"""
Create a long test credit extending to 2030 for better testing of hedging scenarios
"""

import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.credit_obligation import CreditObligation, PaymentFrequency, PaymentType
from app.models.user import User

def create_long_test_credit():
    """Create a test credit that extends to 2030"""
    db = SessionLocal()
    
    try:
        # Find test user (you can change this email to your test user)
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            print("❌ Test user not found. Please create a test user first.")
            return
        
        # Check if similar credit already exists
        existing_credit = db.query(CreditObligation).filter(
            CreditObligation.user_id == test_user.id,
            CreditObligation.credit_name.like("%2030%")
        ).first()
        
        if existing_credit:
            print(f"⚠️  Long test credit already exists: {existing_credit.credit_name}")
            return
        
        # Create long-term credit data (2025-2030)
        start_date = datetime(2025, 1, 1)
        end_date = datetime(2030, 12, 31)
        
        long_credit = CreditObligation(
            user_id=test_user.id,
            credit_name="Долгосрочный тестовый кредит до 2030",
            principal_amount=50000000.0,  # 50 million rubles
            currency="RUB",
            start_date=start_date,
            end_date=end_date,
            base_rate_indicator="KEY_RATE",
            base_rate_value=16.0,  # Current CBR key rate
            credit_spread=2.5,  # 2.5% credit spread
            total_rate=18.5,  # 16.0 + 2.5
            payment_frequency=PaymentFrequency.QUARTERLY,
            payment_type=PaymentType.INTEREST_ONLY
        )
        
        db.add(long_credit)
        db.commit()
        
        print("🎉 Long test credit created successfully!")
        print("=" * 50)
        print(f"📋 Credit Details:")
        print(f"   Name: {long_credit.credit_name}")
        print(f"   Principal: {long_credit.principal_amount:,.2f} {long_credit.currency}")
        print(f"   Period: {start_date.strftime('%d.%m.%Y')} - {end_date.strftime('%d.%m.%Y')}")
        print(f"   Base Rate: {long_credit.base_rate_value}% (KEY_RATE)")
        print(f"   Credit Spread: {long_credit.credit_spread}%")
        print(f"   Total Rate: {long_credit.total_rate}%")
        print(f"   Duration: {(end_date - start_date).days} days (~6 years)")
        print()
        print("🔧 This credit can now be used for testing:")
        print("   - Long-term hedging scenarios")
        print("   - Multiple rate changes over time")
        print("   - Extended forecast periods")
        print("   - Complex hedging strategies")
        
    except Exception as e:
        print(f"❌ Error creating long test credit: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_long_test_credit()