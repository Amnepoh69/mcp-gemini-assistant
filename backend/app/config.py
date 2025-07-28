"""Application configuration settings."""

from typing import Optional, List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    app_name: str = "CFO/CTO Helper MVP"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server
    host: str = "localhost"
    port: int = 8000
    
    # Database
    database_url: str = Field(..., env="DATABASE_URL")
    database_echo: bool = False
    
    # Security
    secret_key: str = Field(..., env="SECRET_KEY")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8 часов
    refresh_token_expire_days: int = 7
    password_reset_expire_hours: int = 24
    
    # Rate limiting
    redis_url: Optional[str] = Field(None, env="REDIS_URL")
    rate_limit_per_minute: int = 60
    
    # Email
    smtp_server: Optional[str] = Field(None, env="SMTP_SERVER")
    smtp_port: int = 587
    smtp_username: Optional[str] = Field(None, env="SMTP_USERNAME")
    smtp_password: Optional[str] = Field(None, env="SMTP_PASSWORD")
    email_from: Optional[str] = Field(None, env="EMAIL_FROM")
    
    # OAuth2 Settings
    google_client_id: Optional[str] = Field(None, env="GOOGLE_CLIENT_ID")
    google_client_secret: Optional[str] = Field(None, env="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: Optional[str] = Field(None, env="GOOGLE_REDIRECT_URI")
    
    linkedin_client_id: Optional[str] = Field(None, env="LINKEDIN_CLIENT_ID")
    linkedin_client_secret: Optional[str] = Field(None, env="LINKEDIN_CLIENT_SECRET")
    linkedin_redirect_uri: Optional[str] = Field(None, env="LINKEDIN_REDIRECT_URI")
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "https://localhost:3000", "file://", "*"]
    
    # Logging
    log_level: str = "INFO"
    log_json: bool = True
    
    # Analytics
    analytics_enabled: bool = True
    
    # File uploads
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    upload_dir: str = "uploads"
    allowed_extensions: List[str] = ["csv", "xlsx", "xls", "json"]
    
    # Monitoring
    sentry_dsn: Optional[str] = Field(None, env="SENTRY_DSN")
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @field_validator("database_url", mode="before")
    @classmethod
    def assemble_database_url(cls, v):
        """Validate database URL."""
        if not v:
            raise ValueError("DATABASE_URL is required")
        return v
    
    @field_validator("secret_key", mode="before")
    @classmethod
    def assemble_secret_key(cls, v):
        """Validate secret key."""
        if not v:
            raise ValueError("SECRET_KEY is required")
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings."""
    return settings