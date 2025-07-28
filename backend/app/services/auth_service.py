"""Authentication service."""

from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timezone
import structlog
import httpx

from app.models.user import User
from app.core.security import security_manager
from app.config import settings
from shared.types import (
    UserCreate, UserResponse, LoginRequest, LoginResponse, 
    AuthProvider, UserStatus, OnboardingRequest
)

logger = structlog.get_logger(__name__)


class AuthService:
    """Authentication service."""
    
    def __init__(self):
        self.security = security_manager
    
    async def register_user(self, db: Session, user_data: UserCreate) -> Tuple[User, str]:
        """Register a new user."""
        # Check if user already exists
        existing_user = db.query(User).filter(
            or_(
                User.email == user_data.email,
                User.provider_id == user_data.provider_id
            )
        ).first()
        
        if existing_user:
            raise ValueError("User already exists")
        
        # Hash password for email auth
        hashed_password = None
        if user_data.auth_provider == AuthProvider.EMAIL:
            if not user_data.password:
                raise ValueError("Password is required for email authentication")
            hashed_password = self.security.hash_password(user_data.password)
        
        # Create user
        user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            company=user_data.company,
            phone=user_data.phone,
            role=user_data.role,
            auth_provider=user_data.auth_provider,
            provider_id=user_data.provider_id,
            status=UserStatus.ACTIVE,
            email_verified=user_data.auth_provider != AuthProvider.EMAIL  # SSO users are pre-verified
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Generate email verification token for email auth
        verification_token = None
        if user_data.auth_provider == AuthProvider.EMAIL:
            verification_token = self.security.generate_email_verification_token(user)
        
        logger.info(
            "User registered successfully",
            user_id=user.id,
            email=self.security.hash_sensitive_data(user.email),
            auth_provider=user.auth_provider.value
        )
        
        return user, verification_token
    
    async def authenticate_user(self, db: Session, login_data: LoginRequest) -> Optional[User]:
        """Authenticate user with email and password."""
        user = db.query(User).filter(
            User.email == login_data.email,
            User.auth_provider == AuthProvider.EMAIL
        ).first()
        
        if not user:
            logger.warning("User not found", email=self.security.hash_sensitive_data(login_data.email))
            return None
        
        if not user.is_active():
            logger.warning("User account inactive", user_id=user.id)
            return None
        
        if not user.hashed_password:
            logger.warning("User has no password (SSO user)", user_id=user.id)
            return None
        
        if not self.security.verify_password(login_data.password, user.hashed_password):
            logger.warning("Invalid password", user_id=user.id)
            return None
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        db.commit()
        
        logger.info("User authenticated successfully", user_id=user.id)
        return user
    
    async def create_user_session(self, db: Session, user: User) -> LoginResponse:
        """Create user session with tokens."""
        # Generate tokens
        access_token = self.security.generate_access_token(user)
        refresh_token_obj = self.security.create_refresh_token(db, user)
        
        # Create response
        user_response = UserResponse.from_orm(user)
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token_obj.token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=user_response
        )
    
    async def refresh_access_token(self, db: Session, refresh_token: str) -> Optional[LoginResponse]:
        """Refresh access token using refresh token."""
        # Verify refresh token
        token_obj = self.security.verify_refresh_token(db, refresh_token)
        if not token_obj:
            logger.warning("Invalid refresh token")
            return None
        
        # Get user
        user = db.query(User).filter(User.id == token_obj.user_id).first()
        if not user or not user.is_active():
            logger.warning("User not found or inactive", user_id=token_obj.user_id)
            return None
        
        # Create new session
        return await self.create_user_session(db, user)
    
    async def logout_user(self, db: Session, refresh_token: str) -> bool:
        """Logout user by revoking refresh token."""
        success = self.security.revoke_refresh_token(db, refresh_token)
        if success:
            logger.info("User logged out successfully")
        return success
    
    async def logout_all_sessions(self, db: Session, user_id: int) -> None:
        """Logout user from all sessions."""
        self.security.revoke_all_user_tokens(db, user_id)
        logger.info("All user sessions terminated", user_id=user_id)
    
    async def verify_email(self, db: Session, token: str) -> Optional[User]:
        """Verify user email address."""
        payload = self.security.verify_email_verification_token(token)
        if not payload:
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            return None
        
        # Update email verification status
        user.email_verified = True
        db.commit()
        
        logger.info("Email verified successfully", user_id=user.id)
        return user
    
    async def request_password_reset(self, db: Session, email: str) -> Optional[str]:
        """Request password reset."""
        user = db.query(User).filter(
            User.email == email,
            User.auth_provider == AuthProvider.EMAIL
        ).first()
        
        if not user:
            # Don't reveal if user exists
            logger.warning("Password reset requested for non-existent user", 
                         email=self.security.hash_sensitive_data(email))
            return None
        
        # Generate reset token
        reset_token = self.security.generate_reset_token(user)
        
        logger.info("Password reset requested", user_id=user.id)
        return reset_token
    
    async def reset_password(self, db: Session, token: str, new_password: str) -> Optional[User]:
        """Reset user password."""
        payload = self.security.verify_reset_token(token)
        if not payload:
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            return None
        
        # Update password
        user.hashed_password = self.security.hash_password(new_password)
        db.commit()
        
        # Revoke all refresh tokens
        self.security.revoke_all_user_tokens(db, user.id)
        
        logger.info("Password reset successfully", user_id=user.id)
        return user
    
    async def change_password(self, db: Session, user: User, current_password: str, new_password: str) -> bool:
        """Change user password."""
        if not user.hashed_password:
            raise ValueError("User has no password (SSO user)")
        
        if not self.security.verify_password(current_password, user.hashed_password):
            logger.warning("Invalid current password", user_id=user.id)
            return False
        
        # Update password
        user.hashed_password = self.security.hash_password(new_password)
        db.commit()
        
        # Revoke all refresh tokens except current session
        self.security.revoke_all_user_tokens(db, user.id)
        
        logger.info("Password changed successfully", user_id=user.id)
        return True
    
    async def complete_onboarding(self, db: Session, user: User, onboarding_data: OnboardingRequest) -> User:
        """Complete user onboarding."""
        user.company = onboarding_data.company
        user.role = onboarding_data.role
        user.phone = onboarding_data.phone
        user.is_onboarded = True
        
        db.commit()
        db.refresh(user)
        
        logger.info("User onboarding completed", user_id=user.id)
        return user
    
    async def authenticate_sso_user(self, db: Session, provider: AuthProvider, provider_data: Dict[str, Any]) -> Optional[User]:
        """Authenticate or create SSO user."""
        email = provider_data.get("email")
        provider_id = provider_data.get("id")
        
        if not email or not provider_id:
            logger.warning("Missing required SSO data", provider=provider.value)
            return None
        
        # Check if user exists
        user = db.query(User).filter(
            or_(
                User.email == email,
                User.provider_id == str(provider_id)
            )
        ).first()
        
        if user:
            # Update last login
            user.last_login = datetime.now(timezone.utc)
            db.commit()
            return user
        
        # Create new SSO user
        user_data = UserCreate(
            email=email,
            password="",  # No password for SSO
            first_name=provider_data.get("first_name", ""),
            last_name=provider_data.get("last_name", ""),
            auth_provider=provider,
            provider_id=str(provider_id)
        )
        
        user, _ = await self.register_user(db, user_data)
        return user


# Global auth service instance
auth_service = AuthService()


def get_auth_service() -> AuthService:
    """Get auth service instance."""
    return auth_service