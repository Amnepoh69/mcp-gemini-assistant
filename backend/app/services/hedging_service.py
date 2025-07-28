"""Service for managing hedging instruments and calculations."""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
import logging

from app.models.hedging_instrument import HedgingInstrument, ScenarioHedging
from app.models.user import User
from app.models.scenario import Scenario
from app.schemas.hedging import (
    HedgingInstrumentCreate,
    HedgingInstrumentUpdate,
    ScenarioHedgingCreate,
    HedgingAnalysisRequest,
    HedgingAnalysisResult
)

logger = logging.getLogger(__name__)


class HedgingService:
    """Service for hedging instrument operations."""
    
    def __init__(self, db: Session):
        self.db = db

    def create_hedging_instrument(
        self, 
        user_id: int, 
        instrument_data: HedgingInstrumentCreate
    ) -> HedgingInstrument:
        """Create a new hedging instrument."""
        try:
            # Verify user exists
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User with id {user_id} not found")

            # Create instrument
            instrument = HedgingInstrument(
                name=instrument_data.name,
                instrument_type=instrument_data.instrument_type,
                description=instrument_data.description,
                notional_amount=instrument_data.notional_amount,
                currency=instrument_data.currency,
                parameters=instrument_data.parameters,
                hedge_effectiveness=instrument_data.hedge_effectiveness,
                user_id=user_id
            )

            self.db.add(instrument)
            self.db.commit()
            self.db.refresh(instrument)

            logger.info(f"Created hedging instrument {instrument.id} for user {user_id}")
            return instrument

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating hedging instrument for user {user_id}: {str(e)}")
            raise

    def get_user_hedging_instruments(
        self, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[HedgingInstrument]:
        """Get hedging instruments for a user."""
        return (
            self.db.query(HedgingInstrument)
            .filter(HedgingInstrument.user_id == user_id)
            .order_by(HedgingInstrument.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_hedging_instrument(
        self, 
        instrument_id: int, 
        user_id: int
    ) -> Optional[HedgingInstrument]:
        """Get a specific hedging instrument."""
        return (
            self.db.query(HedgingInstrument)
            .filter(
                and_(
                    HedgingInstrument.id == instrument_id,
                    HedgingInstrument.user_id == user_id
                )
            )
            .first()
        )

    def update_hedging_instrument(
        self, 
        instrument_id: int, 
        user_id: int, 
        update_data: HedgingInstrumentUpdate
    ) -> Optional[HedgingInstrument]:
        """Update a hedging instrument."""
        try:
            instrument = self.get_hedging_instrument(instrument_id, user_id)
            if not instrument:
                return None

            update_dict = update_data.dict(exclude_unset=True)
            for field, value in update_dict.items():
                setattr(instrument, field, value)

            instrument.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(instrument)

            logger.info(f"Updated hedging instrument {instrument_id}")
            return instrument

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating hedging instrument {instrument_id}: {str(e)}")
            raise

    def delete_hedging_instrument(
        self, 
        instrument_id: int, 
        user_id: int
    ) -> bool:
        """Delete a hedging instrument."""
        try:
            instrument = self.get_hedging_instrument(instrument_id, user_id)
            if not instrument:
                return False

            # Remove from any scenario associations first
            self.db.query(ScenarioHedging).filter(
                ScenarioHedging.hedging_instrument_id == instrument_id
            ).delete()

            self.db.delete(instrument)
            self.db.commit()

            logger.info(f"Deleted hedging instrument {instrument_id}")
            return True

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting hedging instrument {instrument_id}: {str(e)}")
            raise

    def add_instrument_to_scenario(
        self, 
        scenario_id: int, 
        user_id: int, 
        hedging_data: ScenarioHedgingCreate
    ) -> Optional[ScenarioHedging]:
        """Add a hedging instrument to a scenario."""
        try:
            # Verify scenario belongs to user
            scenario = (
                self.db.query(Scenario)
                .filter(
                    and_(
                        Scenario.id == scenario_id,
                        Scenario.user_id == user_id
                    )
                )
                .first()
            )
            if not scenario:
                raise ValueError(f"Scenario {scenario_id} not found for user {user_id}")

            # Verify instrument belongs to user
            instrument = self.get_hedging_instrument(
                hedging_data.hedging_instrument_id, 
                user_id
            )
            if not instrument:
                raise ValueError(f"Hedging instrument {hedging_data.hedging_instrument_id} not found")

            # Check if association already exists
            existing = (
                self.db.query(ScenarioHedging)
                .filter(
                    and_(
                        ScenarioHedging.scenario_id == scenario_id,
                        ScenarioHedging.hedging_instrument_id == hedging_data.hedging_instrument_id
                    )
                )
                .first()
            )
            
            if existing:
                # Update existing association
                existing.allocation_percentage = hedging_data.allocation_percentage
                existing.active = hedging_data.active
                association = existing
            else:
                # Create new association
                association = ScenarioHedging(
                    scenario_id=scenario_id,
                    hedging_instrument_id=hedging_data.hedging_instrument_id,
                    allocation_percentage=hedging_data.allocation_percentage,
                    active=hedging_data.active
                )
                self.db.add(association)

            self.db.commit()
            self.db.refresh(association)

            logger.info(f"Added hedging instrument {hedging_data.hedging_instrument_id} to scenario {scenario_id}")
            return association

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding hedging to scenario {scenario_id}: {str(e)}")
            raise

    def get_scenario_hedging_instruments(
        self, 
        scenario_id: int, 
        user_id: int
    ) -> List[ScenarioHedging]:
        """Get hedging instruments for a scenario."""
        return (
            self.db.query(ScenarioHedging)
            .join(HedgingInstrument)
            .filter(
                and_(
                    ScenarioHedging.scenario_id == scenario_id,
                    HedgingInstrument.user_id == user_id
                )
            )
            .all()
        )

    def calculate_combined_hedge_effectiveness(
        self, 
        instruments: List[HedgingInstrument]
    ) -> float:
        """Calculate combined hedge effectiveness for multiple instruments."""
        if not instruments:
            return 0.0

        # Use diversification formula: combined_effect = Σ(effect_i × (1 - accumulated_effect_{i-1}))
        total_effect = 0.0
        for instrument in instruments:
            total_effect = total_effect + instrument.hedge_effectiveness * (1 - total_effect)
        
        # Cap at 95% for realism
        return min(total_effect, 0.95)

    def calculate_hedging_effect_on_scenario(
        self, 
        scenario_impact: float, 
        current_amount: float, 
        hedge_effectiveness: float
    ) -> Dict[str, float]:
        """Calculate the effect of hedging on scenario impact."""
        # Original scenario impact (difference from current)
        scenario_difference = scenario_impact - current_amount
        
        # Apply hedging to reduce the impact
        hedged_difference = scenario_difference * (1 - hedge_effectiveness)
        hedged_amount = current_amount + hedged_difference
        
        # Calculate benefit from hedging
        hedging_benefit = abs(scenario_difference) - abs(hedged_difference)
        hedging_benefit_percentage = (
            (hedging_benefit / abs(scenario_difference)) * 100 
            if scenario_difference != 0 else 0
        )
        
        return {
            "original_impact": scenario_impact,
            "hedged_impact": hedged_amount,
            "hedging_benefit": hedging_benefit,
            "hedging_benefit_percentage": hedging_benefit_percentage,
            "effective_hedge_ratio": hedge_effectiveness
        }

    def get_default_instruments_library(self) -> List[Dict[str, Any]]:
        """Get default library of hedging instruments for users to choose from."""
        return [
            {
                "name": "Процентный своп (IRS)",
                "instrument_type": "IRS",
                "description": "Обмен плавающей ставки на фиксированную",
                "default_effectiveness": 0.85,
                "required_parameters": ["fixed_rate"],
                "optional_parameters": ["maturity_date", "payment_frequency"]
            },
            {
                "name": "Процентный кэп (CAP)",
                "instrument_type": "CAP",
                "description": "Ограничение максимальной процентной ставки",
                "default_effectiveness": 0.6,
                "required_parameters": ["cap_rate"],
                "optional_parameters": ["maturity_date", "payment_frequency"]
            },
            {
                "name": "Процентный флор (FLOOR)",
                "instrument_type": "FLOOR",
                "description": "Установление минимальной процентной ставки",
                "default_effectiveness": 0.4,
                "required_parameters": ["floor_rate"],
                "optional_parameters": ["maturity_date", "payment_frequency"]
            },
            {
                "name": "Процентный коллар (COLLAR)",
                "instrument_type": "COLLAR",
                "description": "Комбинация кэпа и флора",
                "default_effectiveness": 0.7,
                "required_parameters": ["cap_rate", "floor_rate"],
                "optional_parameters": ["maturity_date", "payment_frequency"]
            },
            {
                "name": "Валютно-процентный своп",
                "instrument_type": "SWAP",
                "description": "Обмен процентных платежей в разных валютах",
                "default_effectiveness": 0.75,
                "required_parameters": ["fixed_rate"],
                "optional_parameters": ["maturity_date", "currency_pair"]
            }
        ]