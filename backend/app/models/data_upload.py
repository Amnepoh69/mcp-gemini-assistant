"""Data upload model."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class DataUploadStatus(str, enum.Enum):
    """Data upload status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DataUpload(Base):
    """Data upload model."""
    
    __tablename__ = "data_uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    source_type = Column(String(50), nullable=False)  # csv, excel, api, manual
    
    file_path = Column(String(500), nullable=True)
    file_size = Column(Integer, nullable=True)
    row_count = Column(Integer, nullable=True)
    
    status = Column(Enum(DataUploadStatus), default=DataUploadStatus.PENDING, nullable=False)
    
    # Store raw data for manual uploads or processed data
    raw_data = Column(JSON, nullable=True)
    
    # Validation and processing metadata
    validation_errors = Column(JSON, nullable=True)
    processing_log = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="data_uploads")
    
    def __repr__(self):
        return f"<DataUpload(id={self.id}, name={self.name}, status={self.status})>"
    
    def is_completed(self) -> bool:
        """Check if upload is completed."""
        return self.status == DataUploadStatus.COMPLETED
    
    def is_failed(self) -> bool:
        """Check if upload failed."""
        return self.status == DataUploadStatus.FAILED
    
    def get_file_extension(self) -> str:
        """Get file extension from file path."""
        if self.file_path:
            return self.file_path.split('.')[-1].lower()
        return ""