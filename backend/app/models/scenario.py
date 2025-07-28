"""Scenario model."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from app.database import Base


class Scenario(Base):
    """Scenario model."""
    
    __tablename__ = "scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    scenario_type = Column(String(50), nullable=False)
    is_admin_created = Column(Boolean, default=False, nullable=False)
    
    # Scenario configuration
    parameters = Column(JSON, nullable=False, default=dict)
    data_upload_ids = Column(JSON, nullable=False, default=list)
    
    status = Column(String(20), default="created", nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Execution metadata
    execution_time_ms = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_run = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="scenarios")
    analysis_results = relationship("AnalysisResult", back_populates="scenario", cascade="all, delete-orphan")
    scenario_hedging = relationship("ScenarioHedging", back_populates="scenario", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Scenario(id={self.id}, name={self.name}, status={self.status})>"
    
    def is_draft(self) -> bool:
        """Check if scenario is in draft state."""
        return self.status == "created"
    
    def is_running(self) -> bool:
        """Check if scenario is currently running."""
        return self.status == "running"
    
    def is_completed(self) -> bool:
        """Check if scenario execution is completed."""
        return self.status == "completed"
    
    def is_failed(self) -> bool:
        """Check if scenario execution failed."""
        return self.status == "failed"
    
    def can_run(self) -> bool:
        """Check if scenario can be executed."""
        return self.status in ["created", "completed", "failed"]
    
    def get_data_sources_count(self) -> int:
        """Get count of data sources."""
        return len(self.data_upload_ids) if self.data_upload_ids else 0
    
    def can_be_deleted_by_user(self, user_id: int, is_admin: bool = False) -> bool:
        """Check if scenario can be deleted by user."""
        # Admin can delete any scenario
        if is_admin:
            return True
        
        # Regular users can only delete scenarios they created and that are not admin-created
        return self.user_id == user_id and not self.is_admin_created