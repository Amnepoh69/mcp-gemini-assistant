"""
Service for managing rate scenarios and Excel file parsing
"""

import pandas as pd
from typing import List, Dict, Optional, Union
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.rate_scenario import RateScenario, RateForecast, ScenarioType, DataType
from app.schemas.rate_scenario import (
    RateScenarioCreate, RateForecastCreate, 
    ScenarioUploadResponse, RateScenarioResponse
)
import logging

logger = logging.getLogger(__name__)


class RateScenarioService:
    """Service for managing rate scenarios and forecasts"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def parse_excel_file(self, file_path: str) -> Dict[str, List[Dict]]:
        """
        Parse Excel file with rate scenarios
        
        Expected format:
        - Column 4: Date (Russian month names)
        - Column 5: Базовый (Base scenario)
        - Column 6: Консервативный (Conservative/Pessimistic scenario)
        - Column 7: Оптимистичный (Optimistic scenario)
        
        Returns:
            Dict with scenario data keyed by scenario name
        """
        try:
            # Read Excel file without headers first
            df = pd.read_excel(file_path, engine='openpyxl', header=None)
            
            logger.info(f"Excel shape: {df.shape}")
            logger.info(f"Excel columns: {df.columns.tolist()}")
            
            # Find the header row (row 5, index 5)
            header_row_idx = 5
            
            # Extract scenario names from the header row
            scenario_names = []
            for col_idx in [5, 6, 7]:  # Columns with scenario data
                if col_idx < len(df.columns):
                    scenario_name = df.iloc[header_row_idx, col_idx]
                    if pd.notna(scenario_name):
                        scenario_names.append((col_idx, str(scenario_name).strip()))
            
            logger.info(f"Found scenarios: {scenario_names}")
            
            # Parse data starting from row 6 (index 6)
            scenarios_data = {}
            
            for col_idx, scenario_name in scenario_names:
                scenario_data = []
                
                # Process data rows (starting from row 6)
                for row_idx in range(6, len(df)):
                    # Get date from column 4
                    date_str = df.iloc[row_idx, 4]
                    if pd.isna(date_str):
                        continue
                    
                    # Get rate value from the scenario column
                    rate_value = df.iloc[row_idx, col_idx]
                    if pd.isna(rate_value):
                        continue
                    
                    # Parse Russian date format
                    forecast_date = self._parse_russian_date(str(date_str))
                    if not forecast_date:
                        logger.warning(f"Could not parse date: {date_str}")
                        continue
                    
                    # Convert rate value to percentage
                    rate_value = float(rate_value)
                    if rate_value <= 1:  # Assume decimal format
                        rate_value = rate_value * 100
                    
                    scenario_data.append({
                        'forecast_date': forecast_date,
                        'rate_value': rate_value,
                        'indicator': 'KEY_RATE',
                        'data_type': DataType.FORECAST,
                        'source': 'Excel Upload',
                        'confidence_level': 100.0
                    })
                
                scenarios_data[scenario_name] = scenario_data
            
            logger.info(f"Parsed {len(scenarios_data)} scenarios from Excel file")
            for name, data in scenarios_data.items():
                logger.info(f"  {name}: {len(data)} forecasts")
            
            return scenarios_data
            
        except Exception as e:
            logger.error(f"Error parsing Excel file: {str(e)}")
            raise ValueError(f"Failed to parse Excel file: {str(e)}")
    
    def _parse_russian_date(self, date_str: str) -> Optional[date]:
        """Parse Russian date format like 'Июль 2025' to date object"""
        
        # Russian month names mapping
        russian_months = {
            'январь': 1, 'января': 1,
            'февраль': 2, 'февраля': 2,
            'март': 3, 'марта': 3,
            'апрель': 4, 'апреля': 4,
            'май': 5, 'мая': 5,
            'июнь': 6, 'июня': 6,
            'июль': 7, 'июля': 7,
            'август': 8, 'августа': 8,
            'сентябрь': 9, 'сентября': 9,
            'октябрь': 10, 'октября': 10,
            'ноябрь': 11, 'ноября': 11,
            'декабрь': 12, 'декабря': 12
        }
        
        try:
            # Split date string
            parts = date_str.lower().strip().split()
            if len(parts) != 2:
                return None
            
            month_name, year_str = parts
            
            # Get month number
            month_num = russian_months.get(month_name)
            if not month_num:
                return None
            
            # Parse year
            year = int(year_str)
            
            # Create date (use first day of month)
            return date(year, month_num, 1)
            
        except Exception as e:
            logger.warning(f"Error parsing date '{date_str}': {str(e)}")
            return None
    
    def create_scenario_from_data(
        self, 
        scenario_name: str, 
        scenario_data: List[Dict],
        scenario_type: Optional[ScenarioType] = None,
        user_id: Optional[int] = None,
        force_custom_type: bool = False
    ) -> RateScenario:
        """
        Create a rate scenario from parsed data
        
        Args:
            scenario_name: Name of the scenario
            scenario_data: List of forecast data dictionaries
            scenario_type: Type of scenario (auto-detected if None)
            user_id: ID of user creating the scenario
            force_custom_type: If True, always mark as CUSTOM regardless of name
            
        Returns:
            Created RateScenario instance
        """
        try:
            # Auto-detect scenario type if not provided
            if scenario_type is None:
                if force_custom_type:
                    # Force all user-uploaded scenarios to be marked as CUSTOM
                    scenario_type = ScenarioType.CUSTOM
                else:
                    name_lower = scenario_name.lower()
                    if 'базовый' in name_lower or 'base' in name_lower:
                        scenario_type = ScenarioType.BASE
                    elif 'оптимистичный' in name_lower or 'optimistic' in name_lower:
                        scenario_type = ScenarioType.OPTIMISTIC
                    elif 'консервативный' in name_lower or 'pessimistic' in name_lower:
                        scenario_type = ScenarioType.PESSIMISTIC
                    else:
                        scenario_type = ScenarioType.CUSTOM
            
            # Generate unique code
            code = scenario_name.upper().replace(' ', '_').replace('Ч', 'CH').replace('Й', 'Y')
            code = ''.join(c for c in code if c.isalnum() or c == '_')
            
            # Check if scenario with this code already exists
            existing = self.db.query(RateScenario).filter(RateScenario.code == code).first()
            if existing:
                code = f"{code}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Create scenario
            scenario = RateScenario(
                name=scenario_name,
                code=code,
                scenario_type=scenario_type,
                description=f"{'Пользовательский прогноз' if user_id else 'Прогноз'} ключевой ставки ЦБ РФ - {scenario_name}",
                is_active=True,
                created_by="USER_UPLOAD" if user_id else "Excel Upload",
                user_id=user_id
            )
            
            self.db.add(scenario)
            self.db.flush()  # Get the ID
            
            # Create forecasts
            forecasts_created = 0
            for data in scenario_data:
                # Check if forecast already exists for this scenario, date, and indicator
                existing_forecast = self.db.query(RateForecast).filter(
                    and_(
                        RateForecast.scenario_id == scenario.id,
                        RateForecast.forecast_date == data['forecast_date'],
                        RateForecast.indicator == data['indicator']
                    )
                ).first()
                
                if not existing_forecast:
                    forecast = RateForecast(
                        scenario_id=scenario.id,
                        forecast_date=data['forecast_date'],
                        rate_value=data['rate_value'],
                        indicator=data['indicator'],
                        data_type=data['data_type'],
                        source=data['source'],
                        confidence_level=data['confidence_level']
                    )
                    self.db.add(forecast)
                    forecasts_created += 1
            
            self.db.commit()
            logger.info(f"Created scenario '{scenario_name}' with {forecasts_created} forecasts")
            
            return scenario
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating scenario: {str(e)}")
            raise
    
    def upload_scenarios_from_excel(
        self, 
        file_path: str, 
        user_id: Optional[int] = None
    ) -> List[ScenarioUploadResponse]:
        """
        Upload multiple scenarios from Excel file
        
        Args:
            file_path: Path to Excel file
            user_id: ID of user uploading scenarios
            
        Returns:
            List of upload responses for each scenario
        """
        try:
            # Parse Excel file
            scenarios_data = self.parse_excel_file(file_path)
            
            results = []
            
            for scenario_name, scenario_data in scenarios_data.items():
                try:
                    # Create scenario (force CUSTOM type for user uploads)
                    scenario = self.create_scenario_from_data(
                        scenario_name=scenario_name,
                        scenario_data=scenario_data,
                        user_id=user_id,
                        force_custom_type=True  # Force all user uploads to be CUSTOM
                    )
                    
                    # Count forecasts
                    forecasts_count = len(scenario_data)
                    
                    results.append(ScenarioUploadResponse(
                        scenario_id=scenario.id,
                        scenario_name=scenario.name,
                        records_created=forecasts_count,
                        records_updated=0,
                        errors=[],
                        warnings=[]
                    ))
                    
                except Exception as e:
                    error_msg = f"Failed to create scenario '{scenario_name}': {str(e)}"
                    logger.error(error_msg)
                    results.append(ScenarioUploadResponse(
                        scenario_id=0,
                        scenario_name=scenario_name,
                        records_created=0,
                        records_updated=0,
                        errors=[error_msg],
                        warnings=[]
                    ))
            
            return results
            
        except Exception as e:
            logger.error(f"Error uploading scenarios from Excel: {str(e)}")
            raise
    
    def get_scenario_by_id(self, scenario_id: int) -> Optional[RateScenario]:
        """Get scenario by ID"""
        return self.db.query(RateScenario).filter(RateScenario.id == scenario_id).first()
    
    def get_scenarios_by_user(self, user_id: Optional[int] = None) -> List[RateScenario]:
        """Get scenarios accessible to a user (own scenarios + admin scenarios)"""
        query = self.db.query(RateScenario).filter(RateScenario.is_active == True)
        if user_id is not None:
            # User can see their own scenarios + admin scenarios
            query = query.filter(
                (RateScenario.user_id == user_id) | (RateScenario.is_admin_created == True)
            )
        return query.order_by(RateScenario.created_at.desc()).all()
    
    def get_scenario_forecasts(
        self, 
        scenario_id: int, 
        indicator: str = "KEY_RATE",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[RateForecast]:
        """Get forecasts for a scenario"""
        query = self.db.query(RateForecast).filter(
            and_(
                RateForecast.scenario_id == scenario_id,
                RateForecast.indicator == indicator
            )
        )
        
        if start_date:
            query = query.filter(RateForecast.forecast_date >= start_date)
        if end_date:
            query = query.filter(RateForecast.forecast_date <= end_date)
            
        return query.order_by(RateForecast.forecast_date).all()
    
    def delete_scenario(self, scenario_id: int) -> bool:
        """Delete a scenario and all its forecasts"""
        try:
            scenario = self.get_scenario_by_id(scenario_id)
            if scenario:
                self.db.delete(scenario)
                self.db.commit()
                return True
            return False
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting scenario {scenario_id}: {str(e)}")
            raise