#!/usr/bin/env python3
"""
Reset database tables for clean testing
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import Base, engine
from app.models.user import User, RefreshToken
from app.models.scenario import Scenario
from app.models.analysis_result import AnalysisResult
from app.models.data_upload import DataUpload
from app.models.alert import Alert

def reset_database():
    """Drop and recreate all tables"""
    try:
        print("🗑️  Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        print("✅ All tables dropped")
        
        print("🔨 Creating all tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created")
        
        print("🎉 Database reset complete!")
        print("\nYou can now create a test user with:")
        print("python create_test_user.py")
        
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reset_database()