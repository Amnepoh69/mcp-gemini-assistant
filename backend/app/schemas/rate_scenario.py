"""
Pydantic schemas for rate scenarios
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import date, datetime
from enum import Enum


class ScenarioTypeEnum(str, Enum):
    BASE = "BASE"
    OPTIMISTIC = "OPTIMISTIC"
    PESSIMISTIC = "PESSIMISTIC"
    STRESS = "STRESS"
    CUSTOM = "CUSTOM"


class DataTypeEnum(str, Enum):
    HISTORICAL = "HISTORICAL"
    FORECAST = "FORECAST"


class RateForecastBase(BaseModel):
    """Base schema for rate forecast"""
    forecast_date: date
    rate_value: float = Field(..., ge=0, le=100, description="Rate value in percentage")
    confidence_level: Optional[float] = Field(100.0, ge=0, le=100)
    min_value: Optional[float] = Field(None, ge=0, le=100)
    max_value: Optional[float] = Field(None, ge=0, le=100)
    indicator: str = "KEY_RATE"
    data_type: DataTypeEnum = DataTypeEnum.FORECAST
    source: Optional[str] = None
    notes: Optional[str] = None


class RateForecastCreate(RateForecastBase):
    """Schema for creating rate forecast"""
    pass


class RateForecastResponse(RateForecastBase):
    """Schema for rate forecast response"""
    id: int
    scenario_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RateScenarioBase(BaseModel):
    """Base schema for rate scenario"""
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    scenario_type: ScenarioTypeEnum = ScenarioTypeEnum.CUSTOM
    description: Optional[str] = None
    is_active: bool = True
    is_default: bool = False
    is_admin_created: bool = False
    created_by: Optional[str] = None


class RateScenarioCreate(RateScenarioBase):
    """Schema for creating rate scenario"""
    forecasts: Optional[List[RateForecastCreate]] = []


class RateScenarioUpdate(BaseModel):
    """Schema for updating rate scenario"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class RateScenarioResponse(RateScenarioBase):
    """Schema for rate scenario response"""
    id: int
    user_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    forecasts: List[RateForecastResponse] = []
    is_admin_created: bool = False
    can_delete: bool = True
    
    model_config = ConfigDict(from_attributes=True)


class ScenarioUploadResponse(BaseModel):
    """Response schema for scenario upload"""
    scenario_id: int
    scenario_name: str
    records_created: int
    records_updated: int
    errors: List[str] = []
    warnings: List[str] = []


class ScenarioAnalysisRequest(BaseModel):
    """Request schema for scenario analysis"""
    scenario_id: int
    credit_ids: Optional[List[int]] = None  # None = all credits
    comparison_scenario_id: Optional[int] = None  # For comparing two scenarios
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ScenarioImpactResponse(BaseModel):
    """Response schema for scenario impact analysis"""
    scenario_id: int
    scenario_name: str
    credit_id: int
    credit_name: str
    current_interest_total: float
    scenario_interest_total: float
    difference_amount: float
    difference_percentage: float
    period_details: List[dict] = []