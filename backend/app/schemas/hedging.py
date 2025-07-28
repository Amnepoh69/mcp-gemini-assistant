"""Pydantic schemas for hedging instruments."""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum


class HedgingInstrumentType(str, Enum):
    """Types of hedging instruments."""
    IRS = "IRS"  # Interest Rate Swap
    CAP = "CAP"  # Interest Rate Cap
    FLOOR = "FLOOR"  # Interest Rate Floor
    COLLAR = "COLLAR"  # Interest Rate Collar
    SWAP = "SWAP"  # Currency Interest Rate Swap


class HedgingInstrumentBase(BaseModel):
    """Base schema for hedging instruments."""
    name: str = Field(..., min_length=1, max_length=255)
    instrument_type: HedgingInstrumentType
    description: Optional[str] = None
    notional_amount: float = Field(..., gt=0)
    currency: str = Field(default="RUB", min_length=3, max_length=3)
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    hedge_effectiveness: float = Field(..., ge=0.0, le=1.0)

    @validator('currency')
    def validate_currency(cls, v):
        """Validate currency code."""
        return v.upper()

    @validator('hedge_effectiveness')
    def validate_hedge_effectiveness(cls, v):
        """Validate hedge effectiveness is between 0 and 1."""
        if not 0.0 <= v <= 1.0:
            raise ValueError('Hedge effectiveness must be between 0.0 and 1.0')
        return v

    @validator('parameters')
    def validate_parameters(cls, v, values):
        """Validate parameters based on instrument type."""
        instrument_type = values.get('instrument_type')
        if not instrument_type:
            return v

        if instrument_type in [HedgingInstrumentType.IRS, HedgingInstrumentType.SWAP]:
            if 'fixed_rate' not in v or not isinstance(v['fixed_rate'], (int, float)):
                raise ValueError(f'{instrument_type} requires fixed_rate parameter')
        
        elif instrument_type == HedgingInstrumentType.CAP:
            if 'cap_rate' not in v or not isinstance(v['cap_rate'], (int, float)):
                raise ValueError('CAP requires cap_rate parameter')
        
        elif instrument_type == HedgingInstrumentType.FLOOR:
            if 'floor_rate' not in v or not isinstance(v['floor_rate'], (int, float)):
                raise ValueError('FLOOR requires floor_rate parameter')
        
        elif instrument_type == HedgingInstrumentType.COLLAR:
            if ('cap_rate' not in v or 'floor_rate' not in v or 
                not isinstance(v['cap_rate'], (int, float)) or 
                not isinstance(v['floor_rate'], (int, float))):
                raise ValueError('COLLAR requires both cap_rate and floor_rate parameters')
            
            if v['cap_rate'] <= v['floor_rate']:
                raise ValueError('Cap rate must be higher than floor rate')

        return v


class HedgingInstrumentCreate(HedgingInstrumentBase):
    """Schema for creating hedging instruments."""
    pass


class HedgingInstrumentUpdate(BaseModel):
    """Schema for updating hedging instruments."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    notional_amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    parameters: Optional[Dict[str, Any]] = None
    hedge_effectiveness: Optional[float] = Field(None, ge=0.0, le=1.0)


class HedgingInstrument(HedgingInstrumentBase):
    """Schema for hedging instrument response."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HedgingInstrumentList(BaseModel):
    """Schema for listing hedging instruments."""
    instruments: List[HedgingInstrument]
    total: int


class ScenarioHedgingCreate(BaseModel):
    """Schema for creating scenario-hedging associations."""
    hedging_instrument_id: int
    allocation_percentage: float = Field(default=100.0, ge=0.0, le=100.0)
    active: bool = Field(default=True)


class ScenarioHedgingUpdate(BaseModel):
    """Schema for updating scenario-hedging associations."""
    allocation_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    active: Optional[bool] = None


class ScenarioHedging(BaseModel):
    """Schema for scenario-hedging association response."""
    id: int
    scenario_id: int
    hedging_instrument_id: int
    allocation_percentage: float
    active: bool
    hedging_instrument: HedgingInstrument
    created_at: datetime

    class Config:
        from_attributes = True


class HedgingEffectResponse(BaseModel):
    """Schema for hedging effect calculation response."""
    total_hedge_effectiveness: float = Field(..., ge=0.0, le=1.0)
    total_notional: float
    instruments_count: int
    active_instruments: List[HedgingInstrument]
    risk_reduction_percentage: float = Field(..., ge=0.0, le=100.0)


class HedgingAnalysisRequest(BaseModel):
    """Schema for hedging analysis request."""
    scenario_id: int
    credit_ids: List[int]
    hedging_instrument_ids: List[int]


class HedgingAnalysisResult(BaseModel):
    """Schema for hedging analysis results."""
    credit_id: int
    credit_name: str
    base_scenario_impact: float
    hedged_scenario_impact: float
    hedging_benefit: float
    hedging_benefit_percentage: float
    effective_hedge_ratio: float