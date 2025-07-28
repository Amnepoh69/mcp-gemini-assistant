"""Alert model."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from app.database import Base
from shared.types import AlertType, AlertStatus
from sqlalchemy import Enum


class Alert(Base):
    """Alert model."""
    
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    alert_type = Column(Enum(AlertType), nullable=False)
    status = Column(Enum(AlertStatus), default=AlertStatus.ACTIVE, nullable=False)
    
    # Alert configuration
    conditions = Column(JSON, nullable=False, default=dict)
    threshold_value = Column(Float, nullable=True)
    market_indicator = Column(String(100), nullable=False)
    
    # Tracking
    trigger_count = Column(Integer, default=0, nullable=False)
    last_triggered = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="alerts")
    
    def __repr__(self):
        return f"<Alert(id={self.id}, name={self.name}, type={self.alert_type}, status={self.status})>"
    
    def is_active(self) -> bool:
        """Check if alert is active."""
        return self.status == AlertStatus.ACTIVE
    
    def is_triggered(self) -> bool:
        """Check if alert was recently triggered."""
        return self.status == AlertStatus.TRIGGERED
    
    def is_disabled(self) -> bool:
        """Check if alert is disabled."""
        return self.status == AlertStatus.DISABLED
    
    def can_trigger(self) -> bool:
        """Check if alert can be triggered."""
        return self.status == AlertStatus.ACTIVE
    
    def trigger(self) -> None:
        """Trigger the alert."""
        if self.can_trigger():
            self.status = AlertStatus.TRIGGERED
            self.trigger_count += 1
            self.last_triggered = func.now()
    
    def reset(self) -> None:
        """Reset alert status to active."""
        self.status = AlertStatus.ACTIVE
    
    def disable(self) -> None:
        """Disable the alert."""
        self.status = AlertStatus.DISABLED
    
    def get_trigger_rate(self) -> float:
        """Get trigger rate (triggers per day since creation)."""
        if not self.created_at:
            return 0.0
        
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        days_active = (now - self.created_at).days
        
        if days_active <= 0:
            return float(self.trigger_count)
        
        return self.trigger_count / days_active