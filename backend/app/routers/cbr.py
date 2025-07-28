"""
CBR (Central Bank of Russia) API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from app.database import get_db
from app.services.cbr_service import CBRService
from app.models.cbr_key_rate import CBRKeyRate
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/cbr",
    tags=["CBR"]
)

@router.get("/key-rate/current")
async def get_current_key_rate(
    db: Session = Depends(get_db)
):
    """Get current CBR key rate"""
    cbr_service = CBRService(db)
    
    current_rate = cbr_service.get_current_key_rate()
    
    if current_rate is None:
        raise HTTPException(status_code=404, detail="Key rate data not available")
    
    latest_rate_record = CBRKeyRate.get_latest_rate(db)
    return {
        "rate": current_rate,
        "announcement_date": latest_rate_record.date.isoformat(),
        "effective_date": latest_rate_record.effective_date.isoformat(),
        "indicator": "KEY_RATE",
        "description": "Ключевая ставка ЦБ РФ"
    }

@router.get("/ruonia/current")
async def get_current_ruonia(
    db: Session = Depends(get_db)
):
    """Get current RUONIA rate from CBR"""
    cbr_service = CBRService(db)
    
    current_rate = cbr_service.get_current_ruonia()
    
    if current_rate is None:
        raise HTTPException(status_code=404, detail="RUONIA data not available")
    
    return {
        "rate": current_rate,
        "date": datetime.now().date().isoformat(),
        "indicator": "RUONIA",
        "description": "RUONIA (Ruble Overnight Index Average)"
    }

@router.get("/ruonia/debug")
async def debug_ruonia(
    db: Session = Depends(get_db)
):
    """Debug RUONIA fetching - shows detailed logs"""
    import logging
    
    # Temporarily set debug level
    cbr_logger = logging.getLogger("app.services.cbr_service")
    original_level = cbr_logger.level
    cbr_logger.setLevel(logging.DEBUG)
    
    try:
        cbr_service = CBRService(db)
        current_rate = cbr_service.get_current_ruonia()
        
        return {
            "rate": current_rate,
            "status": "success" if current_rate is not None else "failed",
            "message": f"RUONIA rate: {current_rate}%" if current_rate else "Could not fetch RUONIA"
        }
    except Exception as e:
        return {
            "rate": None,
            "status": "error",
            "message": f"Error: {str(e)}"
        }
    finally:
        # Restore original log level
        cbr_logger.setLevel(original_level)

@router.post("/key-rate/update-historical")
async def update_historical_key_rates(
    days_back: int = 730,  # Default 2 years
    db: Session = Depends(get_db)
):
    """Update historical key rate data from CBR"""
    cbr_service = CBRService(db)
    
    try:
        updated_count = cbr_service.update_key_rates(days_back=days_back)
        
        return {
            "message": f"Successfully updated {updated_count} key rate records",
            "updated_count": updated_count,
            "days_back": days_back
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating historical key rates: {str(e)}"
        )

@router.get("/key-rate/history")
async def get_key_rate_history(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get key rate history for specified number of days"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    rates = db.query(CBRKeyRate).filter(
        CBRKeyRate.effective_date >= start_date,
        CBRKeyRate.effective_date <= end_date
    ).order_by(CBRKeyRate.effective_date.desc()).all()
    
    return {
        "rates": [
            {
                "announcement_date": rate.date.isoformat(),
                "effective_date": rate.effective_date.isoformat(),
                "rate": rate.rate
            }
            for rate in rates
        ],
        "period_days": days,
        "count": len(rates)
    }

@router.post("/key-rate/update")
async def update_key_rates(
    days_back: int = 365,
    db: Session = Depends(get_db)
):
    """Update key rate data from CBR web service"""
    cbr_service = CBRService(db)
    
    try:
        updated_count = cbr_service.update_key_rates(days_back)
        
        return {
            "message": f"Successfully updated {updated_count} key rate records",
            "updated_count": updated_count,
            "days_back": days_back
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating key rates: {str(e)}")

@router.get("/key-rate/on-date")
async def get_key_rate_on_date(
    date: str,
    db: Session = Depends(get_db)
):
    """Get key rate effective on a specific date (YYYY-MM-DD format)"""
    try:
        target_date = datetime.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    cbr_service = CBRService(db)
    rate = cbr_service.get_key_rate_on_date(target_date)
    
    if rate is None:
        raise HTTPException(status_code=404, detail="Key rate data not available for this date")
    
    # Get the actual rate record for additional info
    rate_record = CBRKeyRate.get_rate_on_date(db, target_date)
    
    return {
        "query_date": date,
        "rate": rate,
        "announcement_date": rate_record.date.isoformat() if rate_record else None,
        "effective_date": rate_record.effective_date.isoformat() if rate_record else None,
        "indicator": "KEY_RATE",
        "description": "Ключевая ставка ЦБ РФ"
    }

@router.get("/key-rate/data-source")
async def get_data_source_info(
    db: Session = Depends(get_db)
):
    """Get information about the data source for key rates"""
    # Check if we have any data
    total_records = db.query(CBRKeyRate).count()
    
    if total_records == 0:
        return {
            "status": "no_data",
            "message": "No key rate data available",
            "source": None,
            "total_records": 0
        }
    
    # Get date range
    oldest = db.query(CBRKeyRate).order_by(CBRKeyRate.effective_date).first()
    newest = db.query(CBRKeyRate).order_by(CBRKeyRate.effective_date.desc()).first()
    
    return {
        "status": "official_data",
        "message": "Using official data from Central Bank of Russia",
        "source": {
            "name": "Central Bank of Russia (CBR)",
            "api": "SOAP API - DailyInfoWebServ",
            "url": "http://www.cbr.ru/DailyInfoWebServ/DailyInfo.asmx",
            "method": "KeyRateXML"
        },
        "total_records": total_records,
        "date_range": {
            "from": oldest.effective_date.isoformat() if oldest else None,
            "to": newest.effective_date.isoformat() if newest else None
        },
        "last_update": newest.created_at.isoformat() if newest and newest.created_at else None,
        "disclaimer": "All historical key rate data is sourced directly from the official CBR API"
    }