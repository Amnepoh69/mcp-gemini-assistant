"""Analysis result model."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from app.database import Base


class AnalysisResult(Base):
    """Analysis result model."""
    
    __tablename__ = "analysis_results"
    
    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)
    
    # Analysis results data
    results = Column(JSON, nullable=False)
    
    # Chart configuration for visualization
    charts_config = Column(JSON, nullable=False, default=dict)
    
    # Status
    status = Column(String(20), default="completed", nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    scenario = relationship("Scenario", back_populates="analysis_results")
    
    def __repr__(self):
        return f"<AnalysisResult(id={self.id}, scenario_id={self.scenario_id}, status={self.status})>"
    
    def has_results(self) -> bool:
        """Check if analysis has results."""
        return bool(self.results)
    
    def has_chart_config(self) -> bool:
        """Check if analysis has chart configuration."""
        return bool(self.charts_config)