"""Security utilities for authentication and authorization."""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import secrets
import hashlib
import jwt
from passlib.context import CryptContext
from passlib.exc import InvalidTokenError
from sqlalchemy.orm import Session
import structlog

from app.config import settings
from app.models.user import User, RefreshToken

logger = structlog.get_logger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SecurityManager:
    """Security manager for authentication and authorization."""
    
    def __init__(self):
        self.secret_key = settings.secret_key
        self.algorithm = settings.algorithm
        self.access_token_expire_minutes = settings.access_token_expire_minutes
        self.refresh_token_expire_days = settings.refresh_token_expire_days
    
    def hash_password(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    def generate_access_token(self, user: User) -> str:
        """Generate JWT access token."""
        now = datetime.now(timezone.utc)
        expire = now + timedelta(minutes=self.access_token_expire_minutes)
        
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "iat": now.timestamp(),
            "exp": expire.timestamp(),
            "type": "access"
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def generate_refresh_token(self) -> str:
        """Generate a secure refresh token."""
        return secrets.token_urlsafe(32)
    
    def create_refresh_token(self, db: Session, user: User) -> RefreshToken:
        """Create a new refresh token in database."""
        # Revoke existing refresh tokens
        existing_tokens = db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id,
            RefreshToken.is_revoked == False
        ).all()
        
        for token in existing_tokens:
            token.revoke()
        
        # Create new refresh token
        token_value = self.generate_refresh_token()
        expires_at = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
        
        refresh_token = RefreshToken(
            token=token_value,
            user_id=user.id,
            expires_at=expires_at
        )
        
        db.add(refresh_token)
        db.commit()
        db.refresh(refresh_token)
        
        return refresh_token
    
    def verify_access_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode access token."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check token type
            if payload.get("type") != "access":
                return None
            
            # Check expiration
            if datetime.fromtimestamp(payload["exp"], tz=timezone.utc) < datetime.now(timezone.utc):
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Access token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid access token", error=str(e))
            return None
    
    def get_user_from_token(self, db: Session, token: str) -> Optional[User]:
        """Get user from access token."""
        payload = self.verify_access_token(token)
        if not payload:
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user if user and user.is_active() else None
    
    def verify_refresh_token(self, db: Session, token: str) -> Optional[RefreshToken]:
        """Verify refresh token."""
        refresh_token = db.query(RefreshToken).filter(
            RefreshToken.token == token,
            RefreshToken.is_revoked == False
        ).first()
        
        if not refresh_token or not refresh_token.is_valid():
            return None
        
        return refresh_token
    
    def revoke_refresh_token(self, db: Session, token: str) -> bool:
        """Revoke a refresh token."""
        refresh_token = db.query(RefreshToken).filter(
            RefreshToken.token == token
        ).first()
        
        if refresh_token:
            refresh_token.revoke()
            db.commit()
            return True
        
        return False
    
    def revoke_all_user_tokens(self, db: Session, user_id: int) -> None:
        """Revoke all refresh tokens for a user."""
        tokens = db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False
        ).all()
        
        for token in tokens:
            token.revoke()
        
        db.commit()
    
    def generate_reset_token(self, user: User) -> str:
        """Generate password reset token."""
        now = datetime.now(timezone.utc)
        expire = now + timedelta(hours=settings.password_reset_expire_hours)
        
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "iat": now.timestamp(),
            "exp": expire.timestamp(),
            "type": "reset"
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_reset_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify password reset token."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check token type
            if payload.get("type") != "reset":
                return None
            
            # Check expiration
            if datetime.fromtimestamp(payload["exp"], tz=timezone.utc) < datetime.now(timezone.utc):
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Reset token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid reset token", error=str(e))
            return None
    
    def generate_email_verification_token(self, user: User) -> str:
        """Generate email verification token."""
        now = datetime.now(timezone.utc)
        expire = now + timedelta(hours=24)  # 24 hours for email verification
        
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "iat": now.timestamp(),
            "exp": expire.timestamp(),
            "type": "email_verification"
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_email_verification_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify email verification token."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check token type
            if payload.get("type") != "email_verification":
                return None
            
            # Check expiration
            if datetime.fromtimestamp(payload["exp"], tz=timezone.utc) < datetime.now(timezone.utc):
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Email verification token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid email verification token", error=str(e))
            return None
    
    def generate_correlation_id(self) -> str:
        """Generate correlation ID for request tracking."""
        return secrets.token_hex(16)
    
    def hash_sensitive_data(self, data: str) -> str:
        """Hash sensitive data for logging (one-way)."""
        return hashlib.sha256(data.encode()).hexdigest()[:16]


# Global security manager instance
security_manager = SecurityManager()


def get_security_manager() -> SecurityManager:
    """Get security manager instance."""
    return security_manager