"""Authentication API routes."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import structlog

from app.database import get_db
from app.services.auth_service import auth_service
from app.services.oauth_service import oauth_service
from app.api.dependencies import get_current_user, get_correlation_id
from shared.types import (
    UserCreate, LoginRequest, LoginResponse, RefreshTokenRequest,
    ResetPasswordRequest, ResetPasswordConfirm, ChangePasswordRequest,
    OnboardingRequest, SSOAuthRequest, ApiResponse, ErrorResponse,
    AuthProvider, UserResponse
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=LoginResponse)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Register a new user."""
    try:
        # Register user
        user, verification_token = await auth_service.register_user(db, user_data)
        
        # Create session
        session = await auth_service.create_user_session(db, user)
        
        # TODO: Send verification email if email auth
        if verification_token:
            logger.info("Email verification token generated", 
                       user_id=user.id, 
                       correlation_id=correlation_id)
        
        return session
        
    except ValueError as e:
        logger.warning("Registration failed", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Registration error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Login with email and password."""
    try:
        # Authenticate user
        user = await auth_service.authenticate_user(db, login_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create session
        session = await auth_service.create_user_session(db, user)
        
        logger.info("User logged in successfully", 
                   user_id=user.id, 
                   correlation_id=correlation_id)
        
        return session
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Refresh access token."""
    try:
        session = await auth_service.refresh_access_token(db, refresh_data.refresh_token)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        return session
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Token refresh error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post("/logout", response_model=ApiResponse)
async def logout(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Logout user."""
    try:
        success = await auth_service.logout_user(db, refresh_data.refresh_token)
        return ApiResponse(
            success=success,
            message="Logged out successfully" if success else "Logout failed"
        )
        
    except Exception as e:
        logger.error("Logout error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.post("/logout-all", response_model=ApiResponse)
async def logout_all(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Logout user from all sessions."""
    try:
        await auth_service.logout_all_sessions(db, current_user.id)
        return ApiResponse(
            success=True,
            message="Logged out from all sessions successfully"
        )
        
    except Exception as e:
        logger.error("Logout all error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.post("/verify-email", response_model=ApiResponse)
async def verify_email(
    token: str,
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Verify user email address."""
    try:
        user = await auth_service.verify_email(db, token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        return ApiResponse(
            success=True,
            message="Email verified successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Email verification error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )


@router.post("/reset-password", response_model=ApiResponse)
async def request_password_reset(
    reset_data: ResetPasswordRequest,
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Request password reset."""
    try:
        reset_token = await auth_service.request_password_reset(db, reset_data.email)
        
        # TODO: Send password reset email
        if reset_token:
            logger.info("Password reset requested", 
                       email=auth_service.security.hash_sensitive_data(reset_data.email),
                       correlation_id=correlation_id)
        
        # Always return success to prevent email enumeration
        return ApiResponse(
            success=True,
            message="If the email exists, a password reset link has been sent"
        )
        
    except Exception as e:
        logger.error("Password reset request error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset request failed"
        )


@router.post("/reset-password/confirm", response_model=ApiResponse)
async def confirm_password_reset(
    reset_data: ResetPasswordConfirm,
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Confirm password reset."""
    try:
        user = await auth_service.reset_password(db, reset_data.token, reset_data.new_password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        return ApiResponse(
            success=True,
            message="Password reset successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Password reset confirm error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )


@router.post("/change-password", response_model=ApiResponse)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Change user password."""
    try:
        success = await auth_service.change_password(
            db, current_user, password_data.current_password, password_data.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid current password"
            )
        
        return ApiResponse(
            success=True,
            message="Password changed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Password change error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )


@router.post("/onboard", response_model=UserResponse)
async def complete_onboarding(
    onboarding_data: OnboardingRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Complete user onboarding."""
    try:
        user = await auth_service.complete_onboarding(db, current_user, onboarding_data)
        return UserResponse.from_orm(user)
        
    except Exception as e:
        logger.error("Onboarding error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Onboarding failed"
        )


# SSO Routes
@router.get("/sso/{provider}/url")
async def get_sso_auth_url(
    provider: AuthProvider,
    state: Optional[str] = None
):
    """Get SSO authentication URL."""
    if provider == AuthProvider.EMAIL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is not an SSO provider"
        )
    
    if not oauth_service.is_provider_configured(provider):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{provider.value} SSO is not configured"
        )
    
    auth_url = oauth_service.get_auth_url(provider, state)
    if not auth_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate authentication URL"
        )
    
    return {"auth_url": auth_url}


@router.post("/sso/callback", response_model=LoginResponse)
async def sso_callback(
    sso_data: SSOAuthRequest,
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Handle SSO callback."""
    try:
        # Exchange code for user info
        user_info = await oauth_service.get_user_info(sso_data.provider, sso_data.code)
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user information from SSO provider"
            )
        
        # Authenticate or create user
        user = await auth_service.authenticate_sso_user(db, sso_data.provider, user_info)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to authenticate user"
            )
        
        # Create session
        session = await auth_service.create_user_session(db, user)
        
        logger.info("SSO authentication successful", 
                   user_id=user.id, 
                   provider=sso_data.provider.value,
                   correlation_id=correlation_id)
        
        return session
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("SSO callback error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SSO authentication failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """Get current user information."""
    return UserResponse.from_orm(current_user)