"""Hedging instrument model for managing financial derivatives."""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class HedgingInstrument(Base):
    """Model for hedging instruments used to mitigate interest rate risk."""
    
    __tablename__ = "hedging_instruments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic information
    name = Column(String(255), nullable=False)
    instrument_type = Column(String(50), nullable=False)  # IRS, CAP, FLOOR, COLLAR, SWAP
    description = Column(Text)
    
    # Financial parameters
    notional_amount = Column(Float, nullable=False)
    currency = Column(String(3), default="RUB")
    
    # Instrument-specific parameters stored as JSON
    parameters = Column(JSON, default={})
    # Example parameters:
    # {
    #   "fixed_rate": 12.5,      # For IRS, SWAP
    #   "cap_rate": 20.0,        # For CAP, COLLAR
    #   "floor_rate": 8.0,       # For FLOOR, COLLAR
    #   "strike_rate": 15.0,     # Generic strike
    #   "maturity_date": "2025-12-31",
    #   "payment_frequency": "quarterly"
    # }
    
    # Risk metrics
    hedge_effectiveness = Column(Float, nullable=False)  # 0.0 to 1.0 (percentage as decimal)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="hedging_instruments")
    
    # Portfolio associations (many-to-many with scenarios)
    scenario_hedging = relationship("ScenarioHedging", back_populates="hedging_instrument")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<HedgingInstrument(id={self.id}, name='{self.name}', type='{self.instrument_type}')>"
    
    def to_dict(self):
        """Convert model to dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "instrument_type": self.instrument_type,
            "description": self.description,
            "notional_amount": self.notional_amount,
            "currency": self.currency,
            "parameters": self.parameters or {},
            "hedge_effectiveness": self.hedge_effectiveness,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def create_from_dict(cls, data: dict):
        """Create instance from dictionary data."""
        return cls(
            name=data.get("name"),
            instrument_type=data.get("instrument_type"),
            description=data.get("description"),
            notional_amount=data.get("notional_amount"),
            currency=data.get("currency", "RUB"),
            parameters=data.get("parameters", {}),
            hedge_effectiveness=data.get("hedge_effectiveness"),
            user_id=data.get("user_id")
        )


class ScenarioHedging(Base):
    """Association table for scenarios and hedging instruments."""
    
    __tablename__ = "scenario_hedging"
    
    id = Column(Integer, primary_key=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)
    hedging_instrument_id = Column(Integer, ForeignKey("hedging_instruments.id"), nullable=False)
    
    # Hedging-specific parameters for this scenario
    allocation_percentage = Column(Float, default=100.0)  # What % of notional to use
    active = Column(String(10), default="true")  # Whether this hedging is active
    
    # Relationships
    scenario = relationship("Scenario", back_populates="scenario_hedging")
    hedging_instrument = relationship("HedgingInstrument", back_populates="scenario_hedging")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<ScenarioHedging(scenario_id={self.scenario_id}, instrument_id={self.hedging_instrument_id})>"