"""Shared types and models for the CFO/CTO Helper MVP platform."""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from enum import Enum


class UserRole(str, Enum):
    """User roles in the system."""
    ADMIN = "admin"
    CFO = "cfo"
    CTO = "cto"
    ANALYST = "analyst"


class AuthProvider(str, Enum):
    """Authentication providers."""
    EMAIL = "email"
    GOOGLE = "google"
    LINKEDIN = "linkedin"


class DataUploadType(str, Enum):
    """Data upload types."""
    MANUAL = "manual"
    CSV = "csv"
    EXCEL = "excel"
    API = "api"
    GOOGLE_SHEETS = "google_sheets"


class DataUploadStatus(str, Enum):
    """Data upload status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FinancialDataCategory(str, Enum):
    """Financial data categories."""
    REVENUE = "revenue"
    EXPENSES = "expenses"
    CASH_FLOW = "cash_flow"
    BALANCE_SHEET = "balance_sheet"
    INCOME_STATEMENT = "income_statement"
    BUDGET = "budget"
    FORECAST = "forecast"


class UserStatus(str, Enum):
    """User account status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"


class UserBase(BaseModel):
    """Base user model."""
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    role: UserRole = UserRole.ANALYST
    company: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


class UserCreate(UserBase):
    """User creation model."""
    password: str = Field(..., min_length=8, max_length=100)
    auth_provider: AuthProvider = AuthProvider.EMAIL
    provider_id: Optional[str] = None


class UserUpdate(BaseModel):
    """User update model."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    company: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    """User response model."""
    id: int
    status: UserStatus
    auth_provider: AuthProvider
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    is_onboarded: bool = False
    
    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """Login request model."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


class LoginResponse(BaseModel):
    """Login response model."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Refresh token request model."""
    refresh_token: str


class ResetPasswordRequest(BaseModel):
    """Password reset request model."""
    email: EmailStr


class ResetPasswordConfirm(BaseModel):
    """Password reset confirmation model."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)


class ChangePasswordRequest(BaseModel):
    """Change password request model."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)


class OnboardingRequest(BaseModel):
    """Onboarding completion request."""
    company: str = Field(..., min_length=1, max_length=100)
    role: UserRole
    phone: Optional[str] = Field(None, max_length=20)
    data_sources: List[str] = Field(default_factory=list)
    notifications_enabled: bool = True


class SSOAuthRequest(BaseModel):
    """SSO authentication request."""
    provider: AuthProvider
    code: str
    redirect_uri: str
    state: Optional[str] = None


class ApiResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool
    message: str
    data: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Error response model."""
    success: bool = False
    message: str
    error: Dict[str, Any]
    timestamp: float
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# Data Upload Models
class DataUploadStatus(str, Enum):
    """Data upload status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DataUploadBase(BaseModel):
    """Base data upload model."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    source_type: str = Field(..., max_length=50)  # csv, excel, api, manual


class DataUploadCreate(DataUploadBase):
    """Data upload creation model."""
    file_path: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class DataUploadResponse(DataUploadBase):
    """Data upload response model."""
    id: int
    user_id: int
    status: DataUploadStatus
    file_size: Optional[int] = None
    row_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Scenario Models
class ScenarioStatus(str, Enum):
    """Scenario execution status."""
    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ScenarioBase(BaseModel):
    """Base scenario model."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    market_indicators: List[str] = Field(default_factory=list)


class ScenarioCreate(ScenarioBase):
    """Scenario creation model."""
    pass


class ScenarioUpdate(BaseModel):
    """Scenario update model."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    parameters: Optional[Dict[str, Any]] = None
    market_indicators: Optional[List[str]] = None


class ScenarioResponse(ScenarioBase):
    """Scenario response model."""
    id: int
    user_id: int
    status: ScenarioStatus
    created_at: datetime
    updated_at: datetime
    last_run: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Analysis Result Models
class AnalysisResultResponse(BaseModel):
    """Analysis result response model."""
    id: int
    scenario_id: int
    user_id: int
    results: Dict[str, Any]
    chart_config: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Alert Models
class AlertType(str, Enum):
    """Alert types."""
    THRESHOLD = "threshold"
    TREND = "trend"
    ANOMALY = "anomaly"


class AlertStatus(str, Enum):
    """Alert status."""
    ACTIVE = "active"
    TRIGGERED = "triggered"
    DISABLED = "disabled"


class AlertBase(BaseModel):
    """Base alert model."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    alert_type: AlertType
    conditions: Dict[str, Any] = Field(default_factory=dict)
    threshold_value: Optional[float] = None
    market_indicator: str = Field(..., min_length=1, max_length=100)


class AlertCreate(AlertBase):
    """Alert creation model."""
    pass


class AlertUpdate(BaseModel):
    """Alert update model."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    conditions: Optional[Dict[str, Any]] = None
    threshold_value: Optional[float] = None
    status: Optional[AlertStatus] = None


class AlertResponse(AlertBase):
    """Alert response model."""
    id: int
    user_id: int
    status: AlertStatus
    created_at: datetime
    updated_at: datetime
    last_triggered: Optional[datetime] = None
    
    class Config:
        from_attributes = True