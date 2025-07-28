"""API routes for hedging instruments."""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.hedging_instrument import HedgingInstrument
from app.schemas.hedging import (
    HedgingInstrumentCreate,
    HedgingInstrumentUpdate,
    HedgingInstrument as HedgingInstrumentSchema,
    HedgingInstrumentList,
    ScenarioHedgingCreate,
    ScenarioHedging as ScenarioHedgingSchema,
    HedgingEffectResponse
)
from app.services.hedging_service import HedgingService
from app.api.dependencies import get_current_user

router = APIRouter()


@router.post(
    "/",
    response_model=HedgingInstrumentSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create hedging instrument",
    description="Create a new hedging instrument for the current user"
)
async def create_hedging_instrument(
    instrument_data: HedgingInstrumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> HedgingInstrument:
    """Create a new hedging instrument."""
    try:
        hedging_service = HedgingService(db)
        instrument = hedging_service.create_hedging_instrument(
            user_id=current_user.id,
            instrument_data=instrument_data
        )
        return instrument
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create hedging instrument"
        )


@router.get(
    "/",
    response_model=HedgingInstrumentList,
    summary="Get hedging instruments",
    description="Get all hedging instruments for the current user"
)
async def get_hedging_instruments(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get hedging instruments for the current user."""
    hedging_service = HedgingService(db)
    instruments = hedging_service.get_user_hedging_instruments(
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    return {
        "instruments": instruments,
        "total": len(instruments)
    }


@router.get(
    "/{instrument_id}",
    response_model=HedgingInstrumentSchema,
    summary="Get hedging instrument",
    description="Get a specific hedging instrument by ID"
)
async def get_hedging_instrument(
    instrument_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> HedgingInstrument:
    """Get a specific hedging instrument."""
    hedging_service = HedgingService(db)
    instrument = hedging_service.get_hedging_instrument(
        instrument_id=instrument_id,
        user_id=current_user.id
    )
    
    if not instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hedging instrument not found"
        )
    
    return instrument


@router.put(
    "/{instrument_id}",
    response_model=HedgingInstrumentSchema,
    summary="Update hedging instrument",
    description="Update a hedging instrument"
)
async def update_hedging_instrument(
    instrument_id: int,
    update_data: HedgingInstrumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> HedgingInstrument:
    """Update a hedging instrument."""
    try:
        hedging_service = HedgingService(db)
        instrument = hedging_service.update_hedging_instrument(
            instrument_id=instrument_id,
            user_id=current_user.id,
            update_data=update_data
        )
        
        if not instrument:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hedging instrument not found"
            )
        
        return instrument
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update hedging instrument"
        )


@router.delete(
    "/{instrument_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete hedging instrument",
    description="Delete a hedging instrument"
)
async def delete_hedging_instrument(
    instrument_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a hedging instrument."""
    hedging_service = HedgingService(db)
    deleted = hedging_service.delete_hedging_instrument(
        instrument_id=instrument_id,
        user_id=current_user.id
    )
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hedging instrument not found"
        )


@router.post(
    "/scenarios/{scenario_id}/hedging",
    response_model=ScenarioHedgingSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Add hedging to scenario",
    description="Add a hedging instrument to a scenario"
)
async def add_hedging_to_scenario(
    scenario_id: int,
    hedging_data: ScenarioHedgingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ScenarioHedgingSchema:
    """Add a hedging instrument to a scenario."""
    try:
        hedging_service = HedgingService(db)
        association = hedging_service.add_instrument_to_scenario(
            scenario_id=scenario_id,
            user_id=current_user.id,
            hedging_data=hedging_data
        )
        return association
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add hedging to scenario"
        )


@router.get(
    "/scenarios/{scenario_id}/hedging",
    response_model=List[ScenarioHedgingSchema],
    summary="Get scenario hedging",
    description="Get hedging instruments for a scenario"
)
async def get_scenario_hedging(
    scenario_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[ScenarioHedgingSchema]:
    """Get hedging instruments for a scenario."""
    hedging_service = HedgingService(db)
    associations = hedging_service.get_scenario_hedging_instruments(
        scenario_id=scenario_id,
        user_id=current_user.id
    )
    return associations


@router.post(
    "/calculate-effect",
    response_model=HedgingEffectResponse,
    summary="Calculate hedging effect",
    description="Calculate the combined effect of multiple hedging instruments"
)
async def calculate_hedging_effect(
    instrument_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Calculate the combined effect of hedging instruments."""
    hedging_service = HedgingService(db)
    
    # Get instruments
    instruments = []
    for instrument_id in instrument_ids:
        instrument = hedging_service.get_hedging_instrument(
            instrument_id=instrument_id,
            user_id=current_user.id
        )
        if instrument:
            instruments.append(instrument)
    
    if not instruments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No valid hedging instruments found"
        )
    
    # Calculate combined effectiveness
    total_effectiveness = hedging_service.calculate_combined_hedge_effectiveness(instruments)
    total_notional = sum(inst.notional_amount for inst in instruments)
    
    return {
        "total_hedge_effectiveness": total_effectiveness,
        "total_notional": total_notional,
        "instruments_count": len(instruments),
        "active_instruments": instruments,
        "risk_reduction_percentage": total_effectiveness * 100
    }


@router.get(
    "/library/defaults",
    response_model=List[Dict[str, Any]],
    summary="Get default instruments library",
    description="Get default library of hedging instruments"
)
async def get_default_instruments_library(
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get default library of hedging instruments."""
    hedging_service = HedgingService(db)
    return hedging_service.get_default_instruments_library()