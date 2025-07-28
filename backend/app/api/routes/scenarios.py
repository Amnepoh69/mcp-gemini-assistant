"""
Scenario management API routes
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.scenario import Scenario
from app.services.scenario_service import ScenarioService, ScenarioType

router = APIRouter()

# Request/Response Models
class ScenarioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=1000)
    scenario_type: ScenarioType
    parameters: Dict[str, Any]
    data_upload_ids: List[int]
    is_admin_created: bool = False

class ScenarioResponse(BaseModel):
    id: int
    name: str
    description: str
    scenario_type: str
    parameters: Dict[str, Any]
    data_upload_ids: List[int]
    status: str
    created_at: str
    last_run: str = None
    error_message: str = None
    is_admin_created: bool = False
    can_delete: bool = True

    class Config:
        from_attributes = True

class ScenarioExecute(BaseModel):
    scenario_id: int

class AnalysisResultResponse(BaseModel):
    id: int
    scenario_id: int
    results: Dict[str, Any]
    charts_config: Dict[str, Any]
    status: str
    created_at: str

    class Config:
        from_attributes = True

@router.post("/scenarios", response_model=ScenarioResponse)
async def create_scenario(
    scenario_data: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new scenario"""
    
    service = ScenarioService(db)
    
    try:
        # Only admins can create admin scenarios
        is_admin = current_user.role.value == "admin"
        is_admin_created = scenario_data.is_admin_created if is_admin else False
        
        scenario = service.create_scenario(
            user_id=current_user.id,
            name=scenario_data.name,
            description=scenario_data.description,
            scenario_type=scenario_data.scenario_type,
            parameters=scenario_data.parameters,
            data_upload_ids=scenario_data.data_upload_ids,
            is_admin_created=is_admin_created
        )
        
        is_admin = current_user.role.value == "admin"
        return ScenarioResponse(
            id=scenario.id,
            name=scenario.name,
            description=scenario.description,
            scenario_type=scenario.scenario_type,
            parameters=scenario.parameters,
            data_upload_ids=scenario.data_upload_ids,
            status=scenario.status,
            created_at=scenario.created_at.isoformat(),
            last_run=scenario.last_run.isoformat() if scenario.last_run else None,
            error_message=scenario.error_message,
            is_admin_created=scenario.is_admin_created,
            can_delete=scenario.can_be_deleted_by_user(current_user.id, is_admin)
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/scenarios", response_model=List[ScenarioResponse])
async def get_scenarios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all scenarios for the current user"""
    
    service = ScenarioService(db)
    scenarios = service.get_user_scenarios(current_user.id)
    
    is_admin = current_user.role.value == "admin"
    return [
        ScenarioResponse(
            id=scenario.id,
            name=scenario.name,
            description=scenario.description,
            scenario_type=scenario.scenario_type,
            parameters=scenario.parameters,
            data_upload_ids=scenario.data_upload_ids,
            status=scenario.status,
            created_at=scenario.created_at.isoformat(),
            last_run=scenario.last_run.isoformat() if scenario.last_run else None,
            error_message=scenario.error_message,
            is_admin_created=scenario.is_admin_created,
            can_delete=scenario.can_be_deleted_by_user(current_user.id, is_admin)
        )
        for scenario in scenarios
    ]

@router.get("/scenarios/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific scenario"""
    
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id,
        Scenario.user_id == current_user.id
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    is_admin = current_user.role.value == "admin"
    return ScenarioResponse(
        id=scenario.id,
        name=scenario.name,
        description=scenario.description,
        scenario_type=scenario.scenario_type,
        parameters=scenario.parameters,
        data_upload_ids=scenario.data_upload_ids,
        status=scenario.status,
        created_at=scenario.created_at.isoformat(),
        last_run=scenario.last_run.isoformat() if scenario.last_run else None,
        error_message=scenario.error_message,
        is_admin_created=scenario.is_admin_created,
        can_delete=scenario.can_be_deleted_by_user(current_user.id, is_admin)
    )

@router.post("/scenarios/{scenario_id}/execute", response_model=AnalysisResultResponse)
async def execute_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Execute a scenario analysis"""
    
    # Verify scenario belongs to user
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id,
        Scenario.user_id == current_user.id
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    service = ScenarioService(db)
    
    try:
        result = service.execute_scenario(scenario_id)
        
        return AnalysisResultResponse(
            id=result.id,
            scenario_id=result.scenario_id,
            results=result.results,
            charts_config=result.charts_config,
            status=result.status,
            created_at=result.created_at.isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scenario execution failed: {str(e)}"
        )

@router.get("/scenarios/{scenario_id}/results", response_model=AnalysisResultResponse)
async def get_scenario_results(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get results for a specific scenario"""
    
    # Verify scenario belongs to user
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id,
        Scenario.user_id == current_user.id
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    service = ScenarioService(db)
    result = service.get_scenario_results(scenario_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No results found for this scenario"
        )
    
    return AnalysisResultResponse(
        id=result.id,
        scenario_id=result.scenario_id,
        results=result.results,
        charts_config=result.charts_config,
        status=result.status,
        created_at=result.created_at.isoformat()
    )

@router.delete("/scenarios/{scenario_id}")
async def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a scenario"""
    
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    
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
    
    db.delete(scenario)
    db.commit()
    
    return {"message": "Scenario deleted successfully"}

@router.put("/scenarios/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: int,
    scenario_data: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a scenario"""
    
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id,
        Scenario.user_id == current_user.id
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    # Update scenario fields
    scenario.name = scenario_data.name
    scenario.description = scenario_data.description
    scenario.scenario_type = scenario_data.scenario_type
    scenario.parameters = scenario_data.parameters
    scenario.data_upload_ids = scenario_data.data_upload_ids
    
    db.commit()
    db.refresh(scenario)
    
    is_admin = current_user.role.value == "admin"
    return ScenarioResponse(
        id=scenario.id,
        name=scenario.name,
        description=scenario.description,
        scenario_type=scenario.scenario_type,
        parameters=scenario.parameters,
        data_upload_ids=scenario.data_upload_ids,
        status=scenario.status,
        created_at=scenario.created_at.isoformat(),
        last_run=scenario.last_run.isoformat() if scenario.last_run else None,
        error_message=scenario.error_message,
        is_admin_created=scenario.is_admin_created,
        can_delete=scenario.can_be_deleted_by_user(current_user.id, is_admin)
    )

@router.get("/scenario-types")
async def get_scenario_types():
    """Get available scenario types"""
    
    return {
        "scenario_types": [
            {
                "value": ScenarioType.REVENUE_FORECAST,
                "label": "Revenue Forecast",
                "description": "Predict future revenue based on historical data and growth assumptions"
            },
            {
                "value": ScenarioType.COST_ANALYSIS,
                "label": "Cost Analysis",
                "description": "Analyze cost breakdown and identify optimization opportunities"
            },
            {
                "value": ScenarioType.CASH_FLOW,
                "label": "Cash Flow Analysis",
                "description": "Track cash inflows and outflows with projections"
            },
            {
                "value": ScenarioType.RISK_ASSESSMENT,
                "label": "Risk Assessment",
                "description": "Identify and quantify business risks"
            },
            {
                "value": ScenarioType.MARKET_SCENARIO,
                "label": "Market Scenario",
                "description": "Model different market conditions and their impact"
            }
        ]
    }

@router.post("/scenarios/template")
async def create_scenario_template(
    scenario_type: ScenarioType,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a template for creating a specific scenario type"""
    
    templates = {
        ScenarioType.REVENUE_FORECAST: {
            "name": "Revenue Forecast",
            "description": "Forecast revenue for the next 12 months",
            "parameters": {
                "forecast_months": 12,
                "growth_rate": 0.05,
                "seasonality": False
            },
            "required_data": ["revenue"]
        },
        ScenarioType.COST_ANALYSIS: {
            "name": "Cost Analysis",
            "description": "Analyze cost structure and trends",
            "parameters": {
                "analysis_period": "monthly",
                "cost_categories": []
            },
            "required_data": ["expenses"]
        },
        ScenarioType.CASH_FLOW: {
            "name": "Cash Flow Analysis",
            "description": "Analyze cash flow patterns and projections",
            "parameters": {
                "projection_months": 6
            },
            "required_data": ["revenue", "expenses"]
        },
        ScenarioType.RISK_ASSESSMENT: {
            "name": "Risk Assessment",
            "description": "Assess business risks and vulnerabilities",
            "parameters": {
                "risk_factors": ["revenue_concentration", "cash_flow_volatility"]
            },
            "required_data": ["revenue", "expenses"]
        },
        ScenarioType.MARKET_SCENARIO: {
            "name": "Market Scenario Analysis",
            "description": "Model different market scenarios",
            "parameters": {
                "market_growth": 0.05,
                "market_volatility": 0.1,
                "scenarios": ["optimistic", "realistic", "pessimistic"]
            },
            "required_data": ["revenue"]
        }
    }
    
    template = templates.get(scenario_type)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid scenario type"
        )
    
    return template