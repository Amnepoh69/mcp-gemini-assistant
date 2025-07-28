"""Credit obligation model."""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class PaymentFrequency(enum.Enum):
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    SEMI_ANNUAL = "SEMI_ANNUAL"
    ANNUAL = "ANNUAL"


class PaymentType(enum.Enum):
    ANNUITY = "ANNUITY"
    DIFFERENTIATED = "DIFFERENTIATED"
    BULLET = "BULLET"
    INTEREST_ONLY = "INTEREST_ONLY"


class CreditObligation(Base):
    """Credit obligation model."""
    
    __tablename__ = "credit_obligations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    upload_id = Column(Integer, ForeignKey("data_uploads.id"), nullable=True)
    
    # Credit details
    credit_name = Column(String(255), nullable=False)
    principal_amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="RUB")
    
    # Date range
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    # Interest rate components
    base_rate_indicator = Column(String(50), nullable=False)  # KEY_RATE, LIBOR, etc.
    base_rate_value = Column(Float, nullable=False)  # Base rate percentage
    credit_spread = Column(Float, nullable=False)  # Credit spread percentage
    total_rate = Column(Float, nullable=False)  # base_rate_value + credit_spread
    
    # Payment details
    payment_frequency = Column(Enum(PaymentFrequency), nullable=False)
    payment_type = Column(Enum(PaymentType), nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    upload = relationship("DataUpload")
    payment_schedule = relationship("PaymentSchedule", back_populates="credit_obligation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<CreditObligation(id={self.id}, name={self.credit_name}, principal={self.principal_amount})>"
    
    def calculate_total_interest(self):
        """Calculate total interest amount for the credit."""
        if not self.start_date or not self.end_date:
            return 0
        
        # Calculate days
        days = (self.end_date - self.start_date).days
        
        # Simple interest calculation (can be overridden by payment schedule)
        # Interest = Principal × Rate × Time
        years = days / 365
        total_interest = self.principal_amount * (self.total_rate / 100) * years
        
        return round(total_interest, 2)
    
    def calculate_payment_schedule_interest(self):
        """Calculate total interest from payment schedule if available."""
        if self.payment_schedule:
            return sum(schedule.interest_amount or 0 for schedule in self.payment_schedule)
        return 0
    
    def get_interest_amount(self):
        """Get interest amount - from schedule if available, otherwise calculated."""
        schedule_interest = self.calculate_payment_schedule_interest()
        if schedule_interest > 0:
            return schedule_interest
        return self.calculate_total_interest()
    
    def get_total_payment(self):
        """Get total payment amount (principal + interest)."""
        return self.principal_amount + self.get_interest_amount()
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "credit_name": self.credit_name,
            "principal_amount": self.principal_amount,
            "currency": self.currency,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "base_rate_indicator": self.base_rate_indicator,
            "base_rate_value": self.base_rate_value,
            "credit_spread": self.credit_spread,
            "total_rate": self.total_rate,
            "payment_frequency": self.payment_frequency.value if self.payment_frequency else None,
            "payment_type": self.payment_type.value if self.payment_type else None,
            "interest_amount": self.get_interest_amount(),
            "total_payment": self.get_total_payment(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }