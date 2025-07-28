"""User model."""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    """User roles in the system."""
    ADMIN = "admin"
    CFO = "cfo"
    CTO = "cto"
    ANALYST = "analyst"


class AuthProvider(str, enum.Enum):
    """Authentication providers."""
    EMAIL = "email"
    GOOGLE = "google"
    LINKEDIN = "linkedin"


class UserStatus(str, enum.Enum):
    """User account status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"


class User(Base):
    """User model."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for SSO users
    
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    company = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    
    role = Column(Enum(UserRole), default=UserRole.ANALYST, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    auth_provider = Column(Enum(AuthProvider), default=AuthProvider.EMAIL, nullable=False)
    provider_id = Column(String(255), nullable=True)  # External provider ID
    
    is_onboarded = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    data_uploads = relationship("DataUpload", back_populates="user", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    hedging_instruments = relationship("HedgingInstrument", back_populates="user", cascade="all, delete-orphan")
    # credit_obligations = relationship("CreditObligation", back_populates="user", cascade="all, delete-orphan", lazy="select")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
    
    @property
    def full_name(self) -> str:
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}"
    
    def is_active(self) -> bool:
        """Check if user is active."""
        return self.status == UserStatus.ACTIVE
    
    def can_access_admin(self) -> bool:
        """Check if user can access admin features."""
        return self.role == UserRole.ADMIN
    
    def can_upload_data(self) -> bool:
        """Check if user can upload data."""
        return self.is_active() and self.is_onboarded
    
    def can_create_scenarios(self) -> bool:
        """Check if user can create scenarios."""
        return self.is_active() and self.is_onboarded


class RefreshToken(Base):
    """Refresh token model."""
    
    __tablename__ = "refresh_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="refresh_tokens")
    
    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id={self.user_id}, revoked={self.is_revoked})>"
    
    def is_valid(self) -> bool:
        """Check if refresh token is valid."""
        return not self.is_revoked and self.expires_at > datetime.utcnow()
    
    def revoke(self) -> None:
        """Revoke the refresh token."""
        self.is_revoked = True