"""
Rate scenario models for forecast analysis
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Date, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.database import Base


class ScenarioType(str, enum.Enum):
    """Types of rate scenarios"""
    BASE = "BASE"
    OPTIMISTIC = "OPTIMISTIC"
    PESSIMISTIC = "PESSIMISTIC"
    STRESS = "STRESS"
    CUSTOM = "CUSTOM"


class DataType(str, enum.Enum):
    """Types of rate data"""
    HISTORICAL = "HISTORICAL"
    FORECAST = "FORECAST"


class RateScenario(Base):
    """Rate scenario model for storing different forecast scenarios"""
    
    __tablename__ = "rate_scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # "Базовый сценарий", "Оптимистичный", etc.
    code = Column(String, unique=True, nullable=False)  # "BASE", "OPTIMISTIC", etc.
    scenario_type = Column(SQLEnum(ScenarioType), default=ScenarioType.CUSTOM)
    description = Column(Text)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Отметка сценария по умолчанию
    is_admin_created = Column(Boolean, default=False, nullable=False)  # Административный сценарий
    created_by = Column(String)  # Источник: "USER", "CBR", "ANALYST", "ML_MODEL"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    forecasts = relationship("RateForecast", back_populates="scenario", cascade="all, delete-orphan")
    user = relationship("User", backref="rate_scenarios")
    
    def __repr__(self):
        return f"<RateScenario(id={self.id}, name='{self.name}', code='{self.code}')>"
    
    def can_be_deleted_by_user(self, user_id: int, is_admin: bool = False) -> bool:
        """Check if rate scenario can be deleted by user."""
        # Admin can delete any scenario
        if is_admin:
            return True
        
        # Regular users can only delete scenarios they created and that are not admin-created
        return self.user_id == user_id and not self.is_admin_created


class RateForecast(Base):
    """Rate forecast model for storing predicted rate values"""
    
    __tablename__ = "rate_forecasts"
    
    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("rate_scenarios.id"), nullable=False)
    
    # Forecast data
    indicator = Column(String, default="KEY_RATE")  # Тип ставки
    forecast_date = Column(Date, nullable=False, index=True)
    rate_value = Column(Float, nullable=False)
    
    # Additional metrics
    confidence_level = Column(Float, default=100.0)  # Уровень уверенности 0-100%
    min_value = Column(Float, nullable=True)  # Минимальное значение диапазона
    max_value = Column(Float, nullable=True)  # Максимальное значение диапазона
    
    # Source tracking
    data_type = Column(SQLEnum(DataType), default=DataType.FORECAST)
    source = Column(String)  # Источник данных
    notes = Column(Text)  # Дополнительные заметки
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    scenario = relationship("RateScenario", back_populates="forecasts")
    
    def __repr__(self):
        return f"<RateForecast(date={self.forecast_date}, rate={self.rate_value}%, scenario_id={self.scenario_id})>"
    
    class Meta:
        # Уникальность по сценарию + дата + индикатор
        unique_together = [["scenario_id", "forecast_date", "indicator"]]