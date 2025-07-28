"""
Credit obligation Pydantic schemas
"""

from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional, List
from enum import Enum


class PaymentFrequency(str, Enum):
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    SEMI_ANNUAL = "SEMI_ANNUAL"
    ANNUAL = "ANNUAL"


class PaymentType(str, Enum):
    ANNUITY = "ANNUITY"
    DIFFERENTIATED = "DIFFERENTIATED"
    BULLET = "BULLET"
    INTEREST_ONLY = "INTEREST_ONLY"


class CreditObligationBase(BaseModel):
    credit_name: str
    principal_amount: float
    currency: str = "RUB"
    start_date: datetime
    end_date: datetime
    base_rate_indicator: str
    base_rate_value: float
    credit_spread: float
    payment_frequency: PaymentFrequency
    payment_type: PaymentType
    
    @validator('principal_amount')
    def validate_principal_amount(cls, v):
        if v <= 0:
            raise ValueError('Principal amount must be positive')
        return v
    
    @validator('base_rate_value')
    def validate_base_rate_value(cls, v):
        if v < 0:
            raise ValueError('Base rate value cannot be negative')
        return v
    
    @validator('credit_spread')
    def validate_credit_spread(cls, v):
        if v < 0:
            raise ValueError('Credit spread cannot be negative')
        return v
    
    @validator('currency')
    def validate_currency(cls, v):
        valid_currencies = ['RUB', 'USD', 'EUR', 'CNY']
        if v.upper() not in valid_currencies:
            raise ValueError(f'Currency must be one of: {", ".join(valid_currencies)}')
        return v.upper()
    
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class CreditObligationCreate(CreditObligationBase):
    pass


class CreditObligationUpdate(BaseModel):
    credit_name: Optional[str] = None
    principal_amount: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    base_rate_indicator: Optional[str] = None
    base_rate_value: Optional[float] = None
    credit_spread: Optional[float] = None
    payment_frequency: Optional[PaymentFrequency] = None
    payment_type: Optional[PaymentType] = None
    
    @validator('principal_amount')
    def validate_principal_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Principal amount must be positive')
        return v
    
    @validator('base_rate_value')
    def validate_base_rate_value(cls, v):
        if v is not None and v < 0:
            raise ValueError('Base rate value cannot be negative')
        return v
    
    @validator('credit_spread')
    def validate_credit_spread(cls, v):
        if v is not None and v < 0:
            raise ValueError('Credit spread cannot be negative')
        return v
    
    @validator('currency')
    def validate_currency(cls, v):
        if v is not None:
            valid_currencies = ['RUB', 'USD', 'EUR', 'CNY']
            if v.upper() not in valid_currencies:
                raise ValueError(f'Currency must be one of: {", ".join(valid_currencies)}')
            return v.upper()
        return v


class CreditObligationResponse(CreditObligationBase):
    id: int
    user_id: int
    total_rate: float
    interest_amount: Optional[float] = None
    total_payment: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CreditBulkUpload(BaseModel):
    credits: List[CreditObligationCreate]


class CreditSummary(BaseModel):
    total_count: int
    total_principal: float
    avg_rate: float
    currency_breakdown: dict
    payment_frequency_breakdown: dict
    payment_type_breakdown: dict


class CreditUploadResponse(BaseModel):
    message: str
    uploaded_count: int
    error_count: int
    errors: List[dict]


class CreditTemplate(BaseModel):
    credit_name: str = "Credit Name"
    principal_amount: str = "Principal Amount"
    currency: str = "Currency"
    start_date: str = "Start Date (YYYY-MM-DD)"
    end_date: str = "End Date (YYYY-MM-DD)"
    base_rate_indicator: str = "Base Rate Indicator"
    base_rate_value: str = "Base Rate Value (%)"
    credit_spread: str = "Credit Spread (%)"
    payment_frequency: str = "Payment Frequency"
    payment_type: str = "Payment Type"