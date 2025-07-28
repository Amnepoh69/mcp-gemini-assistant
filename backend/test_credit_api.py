"""
Simple test script to create credit directly in database
"""

from app.database import SessionLocal
from app.models.credit_obligation import CreditObligation, PaymentFrequency, PaymentType
from datetime import datetime

# Create database session
db = SessionLocal()

try:
    # Create a test credit
    credit = CreditObligation(
        user_id=1,
        credit_name="Test Credit with Key Rate",
        principal_amount=1000000.0,
        currency="RUB",
        start_date=datetime(2025, 1, 1),
        end_date=datetime(2026, 1, 1),
        base_rate_indicator="KEY_RATE",
        base_rate_value=20.0,
        credit_spread=3.5,
        total_rate=23.5,
        payment_frequency=PaymentFrequency.MONTHLY,
        payment_type=PaymentType.ANNUITY
    )
    
    db.add(credit)
    db.commit()
    db.refresh(credit)
    
    print(f"✅ Credit created successfully!")
    print(f"ID: {credit.id}")
    print(f"Name: {credit.credit_name}")
    print(f"Base Rate: {credit.base_rate_value}%")
    print(f"Total Rate: {credit.total_rate}%")
    print(f"Payment Frequency: {credit.payment_frequency}")
    print(f"Payment Type: {credit.payment_type}")
    
except Exception as e:
    print(f"❌ Error creating credit: {e}")
    db.rollback()

finally:
    db.close()