"""API routes."""

from .auth import router as auth_router
from .users import router as users_router
from .upload import router as upload_router
from .scenarios import router as scenarios_router
from .market_data import router as market_data_router

__all__ = [
    "auth_router",
    "users_router",
    "upload_router",
    "scenarios_router",
    "market_data_router",
]