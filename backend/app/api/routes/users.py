"""User management API routes."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import structlog

from app.database import get_db
from app.models.user import User
from app.api.dependencies import (
    get_current_user, get_current_admin_user, 
    require_admin, get_correlation_id
)
from shared.types import (
    UserResponse, UserUpdate, UserStatus, UserRole, ApiResponse
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """List users (admin only)."""
    try:
        query = db.query(User)
        
        # Apply filters
        if role:
            query = query.filter(User.role == role)
        
        if status:
            query = query.filter(User.status == status)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                User.first_name.ilike(search_term) |
                User.last_name.ilike(search_term) |
                User.email.ilike(search_term) |
                User.company.ilike(search_term)
            )
        
        # Apply pagination
        users = query.offset(skip).limit(limit).all()
        
        return [UserResponse.from_orm(user) for user in users]
        
    except Exception as e:
        logger.error("List users error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list users"
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Get user by ID."""
    try:
        # Users can only access their own profile unless they're admin
        if user_id != current_user.id and not current_user.can_access_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse.from_orm(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get user error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user"
        )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Update user."""
    try:
        # Users can only update their own profile unless they're admin
        if user_id != current_user.id and not current_user.can_access_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update fields
        update_data = user_update.dict(exclude_unset=True)
        
        # Non-admin users cannot change their role
        if not current_user.can_access_admin() and "role" in update_data:
            del update_data["role"]
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        
        logger.info("User updated", user_id=user.id, correlation_id=correlation_id)
        
        return UserResponse.from_orm(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Update user error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )


@router.delete("/{user_id}", response_model=ApiResponse)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Delete user (admin only)."""
    try:
        # Cannot delete self
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Soft delete by setting status to inactive
        user.status = UserStatus.INACTIVE
        db.commit()
        
        logger.info("User deleted", user_id=user.id, correlation_id=correlation_id)
        
        return ApiResponse(
            success=True,
            message="User deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Delete user error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )


@router.post("/{user_id}/activate", response_model=ApiResponse)
async def activate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Activate user (admin only)."""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.status = UserStatus.ACTIVE
        db.commit()
        
        logger.info("User activated", user_id=user.id, correlation_id=correlation_id)
        
        return ApiResponse(
            success=True,
            message="User activated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Activate user error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate user"
        )


@router.post("/{user_id}/deactivate", response_model=ApiResponse)
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Deactivate user (admin only)."""
    try:
        # Cannot deactivate self
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.status = UserStatus.INACTIVE
        db.commit()
        
        logger.info("User deactivated", user_id=user.id, correlation_id=correlation_id)
        
        return ApiResponse(
            success=True,
            message="User deactivated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Deactivate user error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate user"
        )


@router.get("/{user_id}/stats", response_model=dict)
async def get_user_stats(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id)
):
    """Get user statistics."""
    try:
        # Users can only access their own stats unless they're admin
        if user_id != current_user.id and not current_user.can_access_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get user statistics
        stats = {
            "data_uploads": len(user.data_uploads),
            "scenarios": len(user.scenarios),
            "analysis_results": len(user.analysis_results),
            "active_alerts": len([alert for alert in user.alerts if alert.is_active()]),
            "total_alerts": len(user.alerts),
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "is_onboarded": user.is_onboarded,
            "account_age_days": (user.created_at - user.created_at).days if user.created_at else 0
        }
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get user stats error", error=str(e), correlation_id=correlation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user statistics"
        )