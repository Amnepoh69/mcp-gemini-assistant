"""Market data API routes for external data integration."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging

from app.database import get_db
from app.models.user import User
from app.api.dependencies import get_current_user
from app.services.external_data_service import external_data_service
from app.services.enhanced_scenario_service import EnhancedScenarioService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/market-data/currencies", response_model=List[Dict[str, Any]])
async def get_currency_rates(
    current_user: User = Depends(get_current_user)
):
    """Get current currency exchange rates."""
    
    try:
        rates = external_data_service.get_currency_rates()
        
        return [
            {
                "base_currency": rate.base_currency,
                "target_currency": rate.target_currency,
                "rate": rate.rate,
                "timestamp": rate.timestamp.isoformat()
            }
            for rate in rates
        ]
        
    except Exception as e:
        logger.error(f"Error fetching currency rates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching currency rates: {str(e)}")


@router.get("/market-data/interest-rates", response_model=Dict[str, float])
async def get_interest_rates(
    country: str = Query(default="US", description="Country code"),
    current_user: User = Depends(get_current_user)
):
    """Get current interest rates for a country."""
    
    try:
        rates = external_data_service.get_interest_rates(country)
        return rates
        
    except Exception as e:
        logger.error(f"Error fetching interest rates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching interest rates: {str(e)}")


@router.get("/market-data/commodities", response_model=List[Dict[str, Any]])
async def get_commodity_prices(
    commodities: Optional[str] = Query(default=None, description="Comma-separated commodity symbols"),
    current_user: User = Depends(get_current_user)
):
    """Get current commodity prices."""
    
    try:
        commodity_list = None
        if commodities:
            commodity_list = [comm.strip() for comm in commodities.split(",")]
        
        prices = external_data_service.get_commodity_prices(commodity_list)
        
        return [
            {
                "commodity": price.commodity,
                "price": price.price,
                "currency": price.currency,
                "timestamp": price.timestamp.isoformat()
            }
            for price in prices
        ]
        
    except Exception as e:
        logger.error(f"Error fetching commodity prices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching commodity prices: {str(e)}")


@router.get("/market-data/indices", response_model=List[Dict[str, Any]])
async def get_market_indices(
    indices: Optional[str] = Query(default=None, description="Comma-separated index symbols"),
    current_user: User = Depends(get_current_user)
):
    """Get current market index data."""
    
    try:
        index_list = None
        if indices:
            index_list = [idx.strip() for idx in indices.split(",")]
        
        market_data = external_data_service.get_market_indices(index_list)
        
        return [
            {
                "symbol": data.symbol,
                "value": data.value,
                "timestamp": data.timestamp.isoformat(),
                "source": data.source,
                "metadata": data.metadata
            }
            for data in market_data
        ]
        
    except Exception as e:
        logger.error(f"Error fetching market indices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching market indices: {str(e)}")


@router.get("/market-data/economic-indicators", response_model=Dict[str, Any])
async def get_economic_indicators(
    country: str = Query(default="US", description="Country code"),
    current_user: User = Depends(get_current_user)
):
    """Get economic indicators for a country."""
    
    try:
        indicators = external_data_service.get_economic_indicators(country)
        return indicators
        
    except Exception as e:
        logger.error(f"Error fetching economic indicators: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching economic indicators: {str(e)}")


@router.get("/market-data/volatility/{symbol}", response_model=Dict[str, float])
async def get_volatility_data(
    symbol: str,
    period: str = Query(default="1y", description="Time period for volatility"),
    current_user: User = Depends(get_current_user)
):
    """Get volatility data for a financial instrument."""
    
    try:
        volatility = external_data_service.get_volatility_data(symbol, period)
        return volatility
        
    except Exception as e:
        logger.error(f"Error fetching volatility data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching volatility data: {str(e)}")


@router.post("/scenarios/{scenario_id}/enhanced-analysis", response_model=Dict[str, Any])
async def run_enhanced_scenario_analysis(
    scenario_id: int,
    stress_test: bool = Query(default=False, description="Include stress testing"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run enhanced scenario analysis with external data."""
    
    try:
        enhanced_service = EnhancedScenarioService(db)
        result = enhanced_service.execute_enhanced_scenario(scenario_id, stress_test)
        
        return {
            "scenario_name": result.scenario_name,
            "base_case": result.base_case,
            "stressed_case": result.stressed_case,
            "risk_metrics": result.risk_metrics,
            "external_factors": result.external_factors,
            "recommendations": result.recommendations
        }
        
    except Exception as e:
        logger.error(f"Error running enhanced scenario analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error running enhanced analysis: {str(e)}")


@router.post("/scenarios/currency-risk", response_model=Dict[str, Any])
async def run_currency_risk_analysis(
    upload_ids: List[int],
    base_currency: str = "RUB",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run currency risk scenario analysis."""
    
    try:
        enhanced_service = EnhancedScenarioService(db)
        
        # Get cash flows data from uploads
        cash_flows = enhanced_service._get_cash_flows_from_uploads(upload_ids, current_user.id)
        
        result = enhanced_service.execute_currency_risk_scenario(cash_flows, base_currency)
        return result
        
    except Exception as e:
        logger.error(f"Error running currency risk analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error running currency risk analysis: {str(e)}")


@router.post("/scenarios/interest-rate-risk", response_model=Dict[str, Any])
async def run_interest_rate_risk_analysis(
    upload_ids: List[int],
    country: str = "US",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run interest rate risk scenario analysis."""
    
    try:
        enhanced_service = EnhancedScenarioService(db)
        
        # Get cash flows data from uploads
        cash_flows = enhanced_service._get_cash_flows_from_uploads(upload_ids, current_user.id)
        
        result = enhanced_service.execute_interest_rate_risk_scenario(cash_flows, country)
        return result
        
    except Exception as e:
        logger.error(f"Error running interest rate risk analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error running interest rate risk analysis: {str(e)}")


@router.post("/scenarios/commodity-risk", response_model=Dict[str, Any])
async def run_commodity_risk_analysis(
    upload_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run commodity risk scenario analysis."""
    
    try:
        enhanced_service = EnhancedScenarioService(db)
        
        # Get cash flows data from uploads
        cash_flows = enhanced_service._get_cash_flows_from_uploads(upload_ids, current_user.id)
        
        result = enhanced_service.execute_commodity_risk_scenario(cash_flows)
        return result
        
    except Exception as e:
        logger.error(f"Error running commodity risk analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error running commodity risk analysis: {str(e)}")


@router.post("/scenarios/market-correlation", response_model=Dict[str, Any])
async def run_market_correlation_analysis(
    upload_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run market correlation scenario analysis."""
    
    try:
        enhanced_service = EnhancedScenarioService(db)
        
        # Get cash flows data from uploads
        cash_flows = enhanced_service._get_cash_flows_from_uploads(upload_ids, current_user.id)
        
        result = enhanced_service.execute_market_correlation_scenario(cash_flows)
        return result
        
    except Exception as e:
        logger.error(f"Error running market correlation analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error running market correlation analysis: {str(e)}")


@router.get("/scenarios/risk-scenarios", response_model=List[Dict[str, Any]])
async def get_available_risk_scenarios(
    current_user: User = Depends(get_current_user)
):
    """Get available risk scenarios for stress testing."""
    
    try:
        enhanced_service = EnhancedScenarioService(None)
        
        scenarios = []
        for name, scenario in enhanced_service.risk_scenarios.items():
            scenarios.append({
                "name": scenario.name,
                "description": scenario.description,
                "market_shock": scenario.market_shock,
                "currency_shock": scenario.currency_shock,
                "interest_rate_shock": scenario.interest_rate_shock,
                "commodity_shock": scenario.commodity_shock,
                "probability": scenario.probability
            })
        
        return scenarios
        
    except Exception as e:
        logger.error(f"Error getting risk scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting risk scenarios: {str(e)}")


@router.get("/market-data/dashboard", response_model=Dict[str, Any])
async def get_market_dashboard_data(
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive market data for dashboard."""
    
    try:
        logger.info(f"Dashboard data requested by user {current_user.email}")
        # Get all market data for dashboard
        currency_rates = external_data_service.get_currency_rates()
        interest_rates = external_data_service.get_interest_rates()
        commodity_prices = external_data_service.get_commodity_prices()
        market_indices = external_data_service.get_market_indices()
        economic_indicators = external_data_service.get_economic_indicators()
        
        return {
            "currency_rates": [
                {
                    "base_currency": rate.base_currency,
                    "target_currency": rate.target_currency,
                    "rate": rate.rate,
                    "timestamp": rate.timestamp.isoformat()
                }
                for rate in currency_rates[:5]  # Top 5 currencies
            ],
            "interest_rates": interest_rates,
            "commodity_prices": [
                {
                    "commodity": price.commodity,
                    "price": price.price,
                    "currency": price.currency,
                    "timestamp": price.timestamp.isoformat()
                }
                for price in commodity_prices[:5]  # Top 5 commodities
            ],
            "market_indices": [
                {
                    "symbol": data.symbol,
                    "value": data.value,
                    "timestamp": data.timestamp.isoformat(),
                    "metadata": data.metadata
                }
                for data in market_indices[:5]  # Top 5 indices
            ],
            "economic_indicators": economic_indicators,
            "last_updated": market_indices[0].timestamp.isoformat() if market_indices else None
        }
        
    except Exception as e:
        logger.error(f"Error getting market dashboard data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting market dashboard data: {str(e)}")