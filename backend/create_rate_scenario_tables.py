#!/usr/bin/env python3
"""
Create rate scenario tables directly using SQLAlchemy models
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.models.rate_scenario import RateScenario, RateForecast
from app.models.cbr_key_rate import CBRKeyRate
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_tables():
    """Create rate scenario and CBR key rate tables"""
    
    try:
        # Create the tables
        logger.info("Creating rate scenario tables...")
        
        # Create rate_scenarios table
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS rate_scenarios (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    code VARCHAR NOT NULL UNIQUE,
                    scenario_type VARCHAR DEFAULT 'CUSTOM',
                    description TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    is_default BOOLEAN DEFAULT FALSE,
                    created_by VARCHAR,
                    user_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """))
            
            # Create rate_forecasts table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS rate_forecasts (
                    id INTEGER PRIMARY KEY,
                    scenario_id INTEGER NOT NULL,
                    indicator VARCHAR DEFAULT 'KEY_RATE',
                    forecast_date DATE NOT NULL,
                    rate_value FLOAT NOT NULL,
                    confidence_level FLOAT DEFAULT 100.0,
                    min_value FLOAT,
                    max_value FLOAT,
                    data_type VARCHAR DEFAULT 'FORECAST',
                    source VARCHAR,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (scenario_id) REFERENCES rate_scenarios(id)
                )
            """))
            
            # Create CBR key rates table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS cbr_key_rates (
                    id INTEGER PRIMARY KEY,
                    date DATETIME NOT NULL,
                    rate FLOAT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Create indexes
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rate_scenarios_id ON rate_scenarios(id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rate_forecasts_id ON rate_forecasts(id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rate_forecasts_forecast_date ON rate_forecasts(forecast_date)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cbr_key_rates_id ON cbr_key_rates(id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cbr_key_rates_date ON cbr_key_rates(date)"))
            
            # Create unique constraint for rate_forecasts
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_rate_forecasts_scenario_date_indicator
                ON rate_forecasts(scenario_id, forecast_date, indicator)
            """))
            
            conn.commit()
            logger.info("Tables created successfully")
            
    except Exception as e:
        logger.error(f"Error creating tables: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    create_tables()
    print("Rate scenario tables created successfully!")