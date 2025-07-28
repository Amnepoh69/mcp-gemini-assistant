"""API dependencies for authentication and authorization."""

from typing import Optional, Generator
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import structlog

from app.database import get_db
from app.models.user import User
from app.core.security import security_manager
from app.services.auth_service import auth_service
from shared.types import UserRole

logger = structlog.get_logger(__name__)

# Security scheme
security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    token = credentials.credentials
    
    user = security_manager.get_user_from_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    if not current_user.is_active():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


async def get_current_onboarded_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Get current onboarded user."""
    if not current_user.is_onboarded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has not completed onboarding"
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Get current admin user."""
    if not current_user.can_access_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


class RoleChecker:
    """Role-based access control dependency."""
    
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user


# Common role checkers
require_admin = RoleChecker([UserRole.ADMIN])
require_cfo_or_admin = RoleChecker([UserRole.CFO, UserRole.ADMIN])
require_cto_or_admin = RoleChecker([UserRole.CTO, UserRole.ADMIN])
require_analyst_or_above = RoleChecker([UserRole.ANALYST, UserRole.CFO, UserRole.CTO, UserRole.ADMIN])


async def get_optional_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get optional authenticated user (for endpoints that work with or without auth)."""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        user = security_manager.get_user_from_token(db, token)
        
        if user and user.is_active():
            return user
        
    except Exception as e:
        logger.warning("Failed to get optional user", error=str(e))
    
    return None


async def get_correlation_id(request: Request) -> str:
    """Get or generate correlation ID for request tracking."""
    correlation_id = request.headers.get("X-Correlation-ID")
    if not correlation_id:
        correlation_id = security_manager.generate_correlation_id()
    return correlation_id