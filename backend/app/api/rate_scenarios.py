"""
API endpoints for rate scenario management
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import tempfile
import os

from app.database import get_db
from app.services.rate_scenario_service import RateScenarioService
from app.schemas.rate_scenario import (
    RateScenarioResponse, RateScenarioCreate, RateScenarioUpdate,
    RateForecastResponse, ScenarioUploadResponse,
    ScenarioAnalysisRequest, ScenarioImpactResponse
)
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/rate-scenarios", tags=["rate-scenarios"])


@router.post("/upload", response_model=List[ScenarioUploadResponse])
async def upload_scenarios_from_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload rate scenarios from Excel file
    
    Expected Excel format:
    - Column A: Date (YYYY-MM-DD)
    - Column B: Базовый (Base scenario)
    - Column C: Консервативный (Conservative scenario)
    - Column D: Оптимистичный (Optimistic scenario)
    """
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are supported"
        )
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        # Process the file
        service = RateScenarioService(db)
        results = service.upload_scenarios_from_excel(tmp_file_path, current_user.id)
        
        return results
        
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)


@router.get("/", response_model=List[RateScenarioResponse])
async def get_user_scenarios(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all rate scenarios for the current user"""
    service = RateScenarioService(db)
    scenarios = service.get_scenarios_by_user(current_user.id)
    
    # Calculate can_delete for each scenario
    is_admin = current_user.role.value == "admin"
    result = []
    
    for scenario in scenarios:
        scenario_dict = {
            "id": scenario.id,
            "name": scenario.name,
            "code": scenario.code,
            "scenario_type": scenario.scenario_type,
            "description": scenario.description,
            "is_active": scenario.is_active,
            "is_default": scenario.is_default,
            "is_admin_created": scenario.is_admin_created,
            "created_by": scenario.created_by,
            "user_id": scenario.user_id,
            "created_at": scenario.created_at,
            "updated_at": scenario.updated_at,
            "forecasts": scenario.forecasts,
            "can_delete": scenario.can_be_deleted_by_user(current_user.id, is_admin)
        }
        result.append(RateScenarioResponse(**scenario_dict))
    
    return result


@router.get("/{scenario_id}", response_model=RateScenarioResponse)
async def get_scenario(
    scenario_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific rate scenario by ID"""
    service = RateScenarioService(db)
    scenario = service.get_scenario_by_id(scenario_id)
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    # Check if user has access to this scenario
    if scenario.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return scenario


@router.get("/{scenario_id}/forecasts", response_model=List[RateForecastResponse])
async def get_scenario_forecasts(
    scenario_id: int,
    indicator: str = "KEY_RATE",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get forecasts for a specific scenario"""
    service = RateScenarioService(db)
    
    # Check if scenario exists and user has access
    scenario = service.get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    if scenario.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    forecasts = service.get_scenario_forecasts(
        scenario_id=scenario_id,
        indicator=indicator,
        start_date=start_date,
        end_date=end_date
    )
    
    return forecasts


@router.post("/", response_model=RateScenarioResponse)
async def create_scenario(
    scenario_data: RateScenarioCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new rate scenario manually"""
    service = RateScenarioService(db)
    
    # Convert schema to dictionary for the service
    forecasts_data = []
    for forecast in scenario_data.forecasts:
        forecasts_data.append({
            'forecast_date': forecast.forecast_date,
            'rate_value': forecast.rate_value,
            'indicator': forecast.indicator,
            'data_type': forecast.data_type,
            'source': forecast.source,
            'confidence_level': forecast.confidence_level
        })
    
    scenario = service.create_scenario_from_data(
        scenario_name=scenario_data.name,
        scenario_data=forecasts_data,
        scenario_type=scenario_data.scenario_type,
        user_id=current_user.id
    )
    
    return scenario


@router.put("/{scenario_id}", response_model=RateScenarioResponse)
async def update_scenario(
    scenario_id: int,
    scenario_update: RateScenarioUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing rate scenario"""
    service = RateScenarioService(db)
    
    # Check if scenario exists and user has access
    scenario = service.get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    if scenario.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update scenario fields
    update_data = scenario_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(scenario, field, value)
    
    db.commit()
    db.refresh(scenario)
    
    return scenario


@router.delete("/{scenario_id}")
async def delete_scenario(
    scenario_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a rate scenario"""
    service = RateScenarioService(db)
    
    # Check if scenario exists and user has access
    scenario = service.get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    # Check if user has permission to delete this scenario
    is_admin = current_user.role.value == "admin"
    if not scenario.can_be_deleted_by_user(current_user.id, is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this scenario"
        )
    
    success = service.delete_scenario(scenario_id)
    
    if success:
        return {"message": "Scenario deleted successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete scenario"
        )


@router.post("/analyze", response_model=List[ScenarioImpactResponse])
async def analyze_scenario_impact(
    analysis_request: ScenarioAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze the impact of a rate scenario on user's credits
    
    This endpoint will be implemented in the next iteration
    to calculate how different rate scenarios affect credit obligations
    """
    # TODO: Implement scenario impact analysis
    # This would involve:
    # 1. Get user's credit obligations
    # 2. Get scenario forecasts
    # 3. Recalculate credit payments using scenario rates
    # 4. Compare with current calculations
    # 5. Return impact analysis
    
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Scenario impact analysis will be implemented in the next iteration"
    )


@router.get("/public/scenarios")
async def get_public_scenarios(
    db: Session = Depends(get_db)
):
    """Get public rate scenarios (no authentication required)"""
    from app.models.rate_scenario import RateScenario, RateForecast
    
    # Get all active scenarios from uploaded file
    scenarios = db.query(RateScenario).filter(
        RateScenario.is_active == True,
        RateScenario.created_by == 'FILE_UPLOAD'
    ).all()
    
    # Convert to simple dict format
    scenario_responses = []
    for scenario in scenarios:
        # Get forecasts for this scenario
        forecasts = db.query(RateForecast).filter(
            RateForecast.scenario_id == scenario.id
        ).order_by(RateForecast.forecast_date).all()
        
        forecast_list = []
        for forecast in forecasts:
            forecast_list.append({
                'id': forecast.id,
                'forecast_date': forecast.forecast_date.isoformat(),
                'rate_value': forecast.rate_value,
                'confidence_level': forecast.confidence_level,
                'indicator': forecast.indicator,
                'data_type': forecast.data_type.value,
                'source': forecast.source,
                'created_at': forecast.created_at.isoformat() if forecast.created_at else None
            })
        
        scenario_responses.append({
            'id': scenario.id,
            'name': scenario.name,
            'code': scenario.code,
            'scenario_type': scenario.scenario_type.value,
            'description': scenario.description,
            'is_active': scenario.is_active,
            'is_default': scenario.is_default,
            'created_by': scenario.created_by,
            'user_id': scenario.user_id,
            'created_at': scenario.created_at.isoformat() if scenario.created_at else None,
            'updated_at': scenario.updated_at.isoformat() if scenario.updated_at else None,
            'forecasts': forecast_list
        })
    
    return {'scenarios': scenario_responses}