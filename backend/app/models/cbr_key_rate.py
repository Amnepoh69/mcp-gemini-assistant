"""
CBR Key Rate model for storing Central Bank of Russia key interest rates
"""

from sqlalchemy import Column, Integer, Float, DateTime, Text
from sqlalchemy.sql import func
from .base import Base

class CBRKeyRate(Base):
    __tablename__ = "cbr_key_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True)  # Date of announcement
    effective_date = Column(DateTime, nullable=False, index=True)  # Date when rate takes effect (announcement + 2 days)
    rate = Column(Float, nullable=False)  # Key rate percentage
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<CBRKeyRate(date={self.date}, effective_date={self.effective_date}, rate={self.rate})>"
    
    @classmethod
    def get_latest_rate(cls, db_session):
        """Get the most recent key rate (by effective date)"""
        return db_session.query(cls).order_by(cls.effective_date.desc()).first()
    
    @classmethod
    def get_rate_on_date(cls, db_session, target_date):
        """Get key rate effective on a specific date (uses effective_date, not announcement date)"""
        return db_session.query(cls).filter(
            cls.effective_date <= target_date
        ).order_by(cls.effective_date.desc()).first()