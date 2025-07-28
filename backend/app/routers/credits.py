"""
Credit obligations API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import pandas as pd
import io
from datetime import datetime
import json

from app.database import get_db
from app.models.user import User
from app.models.credit_obligation import CreditObligation, PaymentFrequency, PaymentType
from app.models.payment_schedule import PaymentSchedule
from app.services.cbr_service import CBRService
from datetime import timedelta
import calendar
# from app.api.dependencies import get_current_user

# Temporary function for testing without auth
def get_current_user():
    return User(id=1, email="test@test.com")
from app.schemas.credit import (
    CreditObligationCreate,
    CreditObligationResponse,
    CreditObligationUpdate,
    CreditBulkUpload
)

router = APIRouter(prefix="/credits", tags=["credits"])


def get_base_rate_value(base_rate_indicator: str, db: Session) -> float:
    """
    Get base rate value from market data based on indicator
    """
    try:
        if base_rate_indicator == "KEY_RATE":
            cbr_service = CBRService(db)
            current_rate = cbr_service.get_current_key_rate()
            if current_rate is not None:
                return current_rate
            else:
                # Fallback to default value if no data available
                print(f"Warning: No KEY_RATE data available, using default value 16.0")
                return 16.0
        elif base_rate_indicator == "LIBOR":
            # TODO: Add LIBOR data source
            print(f"Warning: LIBOR data source not implemented, using default value 5.0")
            return 5.0
        elif base_rate_indicator == "SOFR":
            # TODO: Add SOFR data source
            print(f"Warning: SOFR data source not implemented, using default value 4.5")
            return 4.5
        else:
            print(f"Warning: Unknown base rate indicator {base_rate_indicator}, using default value 16.0")
            return 16.0
    except Exception as e:
        print(f"Error getting base rate for {base_rate_indicator}: {str(e)}, using default value 16.0")
        return 16.0


def generate_payment_schedule(credit: CreditObligation, db: Session, payment_day_override=None):
    """
    Generate payment schedule automatically based on credit parameters
    If payment_day_override is provided (1-31), use it as the day of month for all payments
    """
    try:
        print(f"Generating payment schedule for credit {credit.credit_name}")
        print(f"Start date: {credit.start_date}, End date: {credit.end_date}")
        print(f"Payment day override: {payment_day_override}")
        print(f"Payment frequency: {credit.payment_frequency}")
        
        # Generate payment periods
        payment_entries = []
        current_start = credit.start_date
        period_num = 1
        
        # Calculate period increment based on payment frequency
        period_increment = {
            PaymentFrequency.MONTHLY: 1,
            PaymentFrequency.QUARTERLY: 3,
            PaymentFrequency.SEMI_ANNUAL: 6,
            PaymentFrequency.ANNUAL: 12
        }
        
        month_increment = period_increment.get(credit.payment_frequency, 1)
        
        while current_start < credit.end_date:
            # Calculate next payment date based on frequency and payment day
            current_year = current_start.year
            current_month = current_start.month
            
            # Add month increment
            new_month = current_month + month_increment
            new_year = current_year
            while new_month > 12:
                new_month -= 12
                new_year += 1
            
            # Determine payment day
            if payment_day_override:
                target_day = min(payment_day_override, calendar.monthrange(new_year, new_month)[1])
            else:
                # Use last day of month if no payment day specified
                target_day = calendar.monthrange(new_year, new_month)[1]
            
            try:
                period_end = current_start.replace(year=new_year, month=new_month, day=target_day)
            except ValueError:
                # Handle edge case where target day doesn't exist in the month
                target_day = calendar.monthrange(new_year, new_month)[1]
                period_end = current_start.replace(year=new_year, month=new_month, day=target_day)
            
            # Ensure we don't go past the credit end date
            if period_end > credit.end_date:
                period_end = credit.end_date
            
            # Payment date is the period end date
            payment_date = period_end
            
            # Calculate principal amount based on payment type
            if credit.payment_type == PaymentType.BULLET:
                # For bullet payment, principal is paid only in the last period
                principal_for_period = credit.principal_amount if period_end >= credit.end_date else credit.principal_amount
            elif credit.payment_type == PaymentType.INTEREST_ONLY:
                # For interest-only, principal stays the same
                principal_for_period = credit.principal_amount
            else:
                # For annuity and differentiated, we'll use the full principal for interest calculation
                principal_for_period = credit.principal_amount
            
            print(f"Period {period_num}: {current_start} to {period_end}, payment: {payment_date}")
            
            # For payment schedule generation, use the original base rate
            # Historical rates will be applied during recalculation
            base_rate_for_period = credit.base_rate_value
            total_rate_for_period = base_rate_for_period + credit.credit_spread
            
            # Create payment schedule entry
            payment_schedule = PaymentSchedule(
                credit_obligation_id=credit.id,
                period_start_date=current_start,
                period_end_date=period_end,
                payment_date=payment_date,
                principal_amount=principal_for_period,
                period_number=period_num,
                interest_rate=total_rate_for_period,
                base_rate=base_rate_for_period,
                spread=credit.credit_spread
            )
            
            # Calculate financial details
            payment_schedule.calculate_financials()
            payment_entries.append(payment_schedule)
            
            # Move to next period
            current_start = period_end
            period_num += 1
            
            # Safety check to prevent infinite loop
            if period_num > 100:
                print("Warning: Too many periods generated, breaking loop")
                break
        
        # Save payment schedule entries
        print(f"Generated {len(payment_entries)} payment entries")
        if payment_entries:
            db.add_all(payment_entries)
            db.flush()
            print(f"Saved {len(payment_entries)} payment entries to database")
        else:
            print("No payment entries generated - check logic")
        
        return payment_entries
        
    except Exception as e:
        print(f"Error generating payment schedule: {str(e)}")
        raise e


@router.post("/upload-schedule", response_model=dict)
async def upload_payment_schedule(
    file: UploadFile = File(...),
    credit_name: str = Form(...),
    currency: str = Form("RUB"),
    base_rate_indicator: str = Form("KEY_RATE"),
    base_rate_value: float = Form(...),
    credit_spread: float = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload payment schedule from Excel file (like График.xlsx)
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Only Excel files are supported for payment schedules"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Parse Excel file
        df = pd.read_excel(io.BytesIO(content), header=None)
        
        # Find header row (contains "Дата")
        header_row = None
        for i, row in df.iterrows():
            if any('Дата' in str(val) for val in row if pd.notna(val)):
                header_row = i
                break
        
        if header_row is None:
            raise HTTPException(
                status_code=400,
                detail="Could not find header row with date columns"
            )
        
        # Read with proper headers
        df = pd.read_excel(io.BytesIO(content), header=header_row)
        
        # Clean data - remove rows after header and empty rows
        df = df.iloc[1:].dropna(how='all')
        
        # Find relevant columns
        start_date_col = None
        end_date_col = None
        payment_date_col = None
        principal_col = None
        
        for col in df.columns:
            if pd.notna(col):
                col_str = str(col).lower()
                if 'дата начала' in col_str:
                    start_date_col = col
                elif 'дата конца' in col_str:
                    end_date_col = col
                elif 'дата платежа' in col_str:
                    payment_date_col = col
                elif 'номинал' in col_str:
                    principal_col = col
        
        if not all([start_date_col, end_date_col, payment_date_col, principal_col]):
            raise HTTPException(
                status_code=400,
                detail="Required columns not found: start date, end date, payment date, principal"
            )
        
        # Calculate total rate
        total_rate = base_rate_value + credit_spread
        
        # Calculate principal amount as maximum nominal value (initial debt)
        principal_amount = float(df[principal_col].max())
        
        # Create credit obligation
        credit = CreditObligation(
            user_id=current_user.id,
            credit_name=credit_name,
            principal_amount=principal_amount,
            currency=currency,
            start_date=pd.to_datetime(df[start_date_col].iloc[0]),
            end_date=pd.to_datetime(df[end_date_col].iloc[-1]),
            base_rate_indicator=base_rate_indicator,
            base_rate_value=base_rate_value,
            credit_spread=credit_spread,
            total_rate=total_rate,
            payment_frequency=PaymentFrequency.MONTHLY,
            payment_type=PaymentType.INTEREST_ONLY
        )
        
        db.add(credit)
        db.flush()  # Get credit.id without committing
        
        # Create payment schedule entries
        payment_entries = []
        for index, row in df.iterrows():
            if pd.notna(row[start_date_col]) and pd.notna(row[end_date_col]):
                payment_date = pd.to_datetime(row[payment_date_col])
                
                # For payment schedule generation, use the original base rate
                # Historical rates will be applied during recalculation
                base_rate_for_period = base_rate_value
                total_rate_for_period = base_rate_for_period + credit_spread
                
                payment_schedule = PaymentSchedule(
                    credit_obligation_id=credit.id,
                    period_start_date=pd.to_datetime(row[start_date_col]),
                    period_end_date=pd.to_datetime(row[end_date_col]),
                    payment_date=payment_date,
                    principal_amount=float(row[principal_col]),
                    period_number=len(payment_entries) + 1,
                    interest_rate=total_rate_for_period,
                    base_rate=base_rate_for_period,
                    spread=credit_spread
                )
                
                # Calculate financials
                payment_schedule.calculate_financials()
                payment_entries.append(payment_schedule)
        
        # Save all payment entries
        db.add_all(payment_entries)
        db.commit()
        
        return {
            'message': f'Successfully uploaded payment schedule for {credit_name}',
            'credit_id': credit.id,
            'periods_count': len(payment_entries),
            'total_principal': credit.principal_amount,
            'schedule_period': f'{credit.start_date.strftime("%Y-%m-%d")} to {credit.end_date.strftime("%Y-%m-%d")}'
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )


@router.post("/upload", response_model=dict)
async def upload_credit_data(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload credit obligations data from CSV/Excel file (simple format)
    """
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Only CSV and Excel files are supported"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Parse based on file type
        if file.filename.endswith('.csv'):
            # Try different encodings
            encodings = ['utf-8', 'cp1251', 'latin-1', 'iso-8859-1']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(io.StringIO(content.decode(encoding)))
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                raise HTTPException(
                    status_code=400,
                    detail="Could not decode file. Please ensure it's a valid CSV with UTF-8 encoding"
                )
        else:
            # Excel file
            df = pd.read_excel(io.BytesIO(content))
        
        # Column mapping: Russian -> English
        column_mapping = {
            'Название кредита': 'credit_name',
            'Сумма основного долга': 'principal_amount',
            'Валюта': 'currency',
            'Дата начала': 'start_date',
            'Дата окончания': 'end_date',
            'День платежа': 'payment_day',
            'Базовый индикатор ставки': 'base_rate_indicator',
            'Кредитный спред (%)': 'credit_spread',
            'Периодичность платежей': 'payment_frequency',
            'Тип платежей': 'payment_type'
        }
        
        # Rename columns if they are in Russian
        df_columns = df.columns.tolist()
        for russian_name, english_name in column_mapping.items():
            if russian_name in df_columns:
                df = df.rename(columns={russian_name: english_name})
        
        # Filter out comment rows (starting with #)
        df = df[~df.iloc[:, 0].astype(str).str.startswith('#', na=False)]
        
        # Validate required columns (payment_date is optional)
        required_columns = [
            'credit_name', 'principal_amount', 'currency', 'start_date', 'end_date',
            'base_rate_indicator', 'credit_spread', 'payment_frequency', 'payment_type'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # Process and validate data
        credits = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Parse dates
                start_date = pd.to_datetime(row['start_date']).to_pydatetime()
                end_date = pd.to_datetime(row['end_date']).to_pydatetime()
                
                # Validate payment frequency and type
                payment_frequency = PaymentFrequency(row['payment_frequency'].upper())
                payment_type = PaymentType(row['payment_type'].upper())
                
                # Get base rate from market data
                base_rate_indicator = str(row['base_rate_indicator'])
                base_rate = get_base_rate_value(base_rate_indicator, db)
                credit_spread = float(row['credit_spread'])
                total_rate = base_rate + credit_spread
                
                # Create credit obligation
                credit = CreditObligation(
                    user_id=current_user.id,
                    credit_name=str(row['credit_name']),
                    principal_amount=float(row['principal_amount']),
                    currency=str(row['currency']).upper(),
                    start_date=start_date,
                    end_date=end_date,
                    base_rate_indicator=base_rate_indicator,
                    base_rate_value=base_rate,
                    credit_spread=credit_spread,
                    total_rate=total_rate,
                    payment_frequency=payment_frequency,
                    payment_type=payment_type
                )
                
                credits.append(credit)
                
            except Exception as e:
                errors.append({
                    'row': index + 2,  # +2 because pandas is 0-indexed and we have headers
                    'error': str(e)
                })
        
        # Save valid credits to database and generate payment schedules
        if credits:
            db.add_all(credits)
            db.flush()  # Get credit IDs
            
            # Generate payment schedules for each credit
            for i, credit in enumerate(credits):
                try:
                    # Check if payment_day was provided in the original row
                    payment_day_override = None
                    if 'payment_day' in df.columns:
                        original_row = df.iloc[i]
                        if pd.notna(original_row.get('payment_day')):
                            payment_day_override = int(original_row['payment_day'])
                            # Validate payment day is between 1 and 31
                            if payment_day_override < 1 or payment_day_override > 31:
                                payment_day_override = None
                    
                    generate_payment_schedule(credit, db, payment_day_override)
                except Exception as e:
                    print(f"Failed to generate payment schedule for credit {credit.credit_name}: {str(e)}")
            
            db.commit()
        
        return {
            'message': f'Successfully uploaded {len(credits)} credit obligations',
            'uploaded_count': len(credits),
            'error_count': len(errors),
            'errors': errors[:10] if errors else []  # Limit to first 10 errors
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )


@router.post("/", response_model=CreditObligationResponse)
def create_credit_obligation(
    credit_data: CreditObligationCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new credit obligation manually
    """
    try:
        # Calculate total rate
        total_rate = credit_data.base_rate_value + credit_data.credit_spread
        
        # Create credit obligation
        credit = CreditObligation(
            user_id=1,  # Temporary hardcoded user_id for testing
            credit_name=credit_data.credit_name,
            principal_amount=credit_data.principal_amount,
            currency=credit_data.currency,
            start_date=credit_data.start_date,
            end_date=credit_data.end_date,
            base_rate_indicator=credit_data.base_rate_indicator,
            base_rate_value=credit_data.base_rate_value,
            credit_spread=credit_data.credit_spread,
            total_rate=total_rate,
            payment_frequency=credit_data.payment_frequency,
            payment_type=credit_data.payment_type
        )
        
        db.add(credit)
        db.flush()  # Get credit ID
        
        # Generate payment schedule automatically
        try:
            generate_payment_schedule(credit, db)
        except Exception as e:
            print(f"Failed to generate payment schedule for credit {credit.credit_name}: {str(e)}")
        
        db.commit()
        db.refresh(credit)
        
        credit_dict = credit.to_dict()
        return CreditObligationResponse(**credit_dict)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating credit obligation: {str(e)}"
        )


@router.get("/", response_model=List[CreditObligationResponse])
def get_user_credits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all credit obligations for the current user
    """
    credits = db.query(CreditObligation).options(
        joinedload(CreditObligation.payment_schedule)
    ).filter(
        CreditObligation.user_id == current_user.id
    ).all()
    
    # Create response with calculated interest
    response = []
    for credit in credits:
        credit_dict = credit.to_dict()
        response.append(CreditObligationResponse(**credit_dict))
    
    return response


@router.get("/{credit_id}", response_model=CreditObligationResponse)
def get_credit_obligation(
    credit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific credit obligation
    """
    credit = db.query(CreditObligation).options(
        joinedload(CreditObligation.payment_schedule)
    ).filter(
        CreditObligation.id == credit_id,
        CreditObligation.user_id == current_user.id
    ).first()
    
    if not credit:
        raise HTTPException(
            status_code=404,
            detail="Credit obligation not found"
        )
    
    credit_dict = credit.to_dict()
    return CreditObligationResponse(**credit_dict)


@router.put("/{credit_id}", response_model=CreditObligationResponse)
def update_credit_obligation(
    credit_id: int,
    credit_data: CreditObligationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a credit obligation
    """
    credit = db.query(CreditObligation).filter(
        CreditObligation.id == credit_id,
        CreditObligation.user_id == current_user.id
    ).first()
    
    if not credit:
        raise HTTPException(
            status_code=404,
            detail="Credit obligation not found"
        )
    
    try:
        # Update fields
        update_data = credit_data.dict(exclude_unset=True)
        
        # Recalculate total rate if base components changed
        if 'base_rate_value' in update_data or 'credit_spread' in update_data:
            base_rate = update_data.get('base_rate_value', credit.base_rate_value)
            credit_spread = update_data.get('credit_spread', credit.credit_spread)
            update_data['total_rate'] = base_rate + credit_spread
        
        for field, value in update_data.items():
            setattr(credit, field, value)
        
        credit.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(credit)
        
        credit_dict = credit.to_dict()
        return CreditObligationResponse(**credit_dict)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error updating credit obligation: {str(e)}"
        )


@router.delete("/{credit_id}")
def delete_credit_obligation(
    credit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a credit obligation
    """
    credit = db.query(CreditObligation).filter(
        CreditObligation.id == credit_id,
        CreditObligation.user_id == current_user.id
    ).first()
    
    if not credit:
        raise HTTPException(
            status_code=404,
            detail="Credit obligation not found"
        )
    
    try:
        db.delete(credit)
        db.commit()
        
        return {"message": "Credit obligation deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting credit obligation: {str(e)}"
        )


@router.get("/{credit_id}/payment-schedule")
async def get_payment_schedule(
    credit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment schedule for a credit"""
    
    # Get credit
    credit = db.query(CreditObligation).filter(
        CreditObligation.id == credit_id,
        CreditObligation.user_id == current_user.id
    ).first()
    
    if not credit:
        raise HTTPException(
            status_code=404, 
            detail="Credit not found"
        )
    
    # Get payment schedule
    payment_schedule = db.query(PaymentSchedule).filter(
        PaymentSchedule.credit_obligation_id == credit_id
    ).order_by(PaymentSchedule.period_number).all()
    
    return {
        "credit": credit.to_dict(),
        "payment_schedule": [payment.to_dict() for payment in payment_schedule]
    }


@router.post("/{credit_id}/recalculate-interest")
async def recalculate_interest_with_historical_rates(
    credit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Recalculate interest amounts for all payment periods using historical rates
    For periods where rates changed, uses average rate for the period
    """
    
    # Get credit
    credit = db.query(CreditObligation).filter(
        CreditObligation.id == credit_id,
        CreditObligation.user_id == current_user.id
    ).first()
    
    if not credit:
        raise HTTPException(
            status_code=404, 
            detail="Credit not found"
        )
    
    # Get payment schedule
    payment_schedule = db.query(PaymentSchedule).filter(
        PaymentSchedule.credit_obligation_id == credit_id
    ).order_by(PaymentSchedule.period_number).all()
    
    if not payment_schedule:
        raise HTTPException(
            status_code=404, 
            detail="Payment schedule not found for this credit"
        )
    
    try:
        print(f"Recalculating interest for credit {credit.credit_name} with {len(payment_schedule)} periods")
        
        # Recalculate each period
        recalculated_periods = []
        for period in payment_schedule:
            old_interest = period.interest_amount
            old_base_rate = period.base_rate
            old_total_rate = period.interest_rate
            
            # Recalculate using historical rates
            period.recalculate_with_historical_rates(
                db, 
                credit.base_rate_indicator, 
                credit.credit_spread
            )
            
            # Track changes
            recalculated_periods.append({
                "period_number": period.period_number,
                "period_start": period.period_start_date.isoformat(),
                "period_end": period.period_end_date.isoformat(),
                "old_base_rate": old_base_rate,
                "new_base_rate": period.base_rate,
                "old_total_rate": old_total_rate,
                "new_total_rate": period.interest_rate,
                "old_interest_amount": old_interest,
                "new_interest_amount": period.interest_amount,
                "difference": period.interest_amount - old_interest if old_interest else 0
            })
        
        # Save changes
        db.commit()
        
        # Calculate summary
        total_old_interest = sum(p["old_interest_amount"] for p in recalculated_periods if p["old_interest_amount"])
        total_new_interest = sum(p["new_interest_amount"] for p in recalculated_periods if p["new_interest_amount"])
        total_difference = total_new_interest - total_old_interest
        
        return {
            "message": f"Successfully recalculated interest for {len(recalculated_periods)} periods",
            "credit_id": credit_id,
            "credit_name": credit.credit_name,
            "recalculated_periods": recalculated_periods,
            "summary": {
                "total_periods": len(recalculated_periods),
                "total_old_interest": round(total_old_interest, 2),
                "total_new_interest": round(total_new_interest, 2),
                "total_difference": round(total_difference, 2),
                "base_rate_indicator": credit.base_rate_indicator,
                "credit_spread": credit.credit_spread
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error recalculating interest: {str(e)}"
        )


@router.get("/template/download")
def download_template():
    """
    Download Excel template for credit obligations upload
    """
    try:
        from fastapi.responses import Response
        
        # Template data with payment dates
        template_data = [
            {
                'Название кредита': '# Введите название кредита',
                'Сумма основного долга': '# Число без пробелов',
                'Валюта': '# RUB, USD, EUR, CNY',
                'Дата начала': '# YYYY-MM-DD',
                'Дата окончания': '# YYYY-MM-DD',
                'День платежа': '# Число от 1 до 31 (день месяца для всех платежей)',
                'Базовый индикатор ставки': '# KEY_RATE, LIBOR, SOFR',
                'Кредитный спред (%)': '# Число с десятичной точкой',
                'Периодичность платежей': '# MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL',
                'Тип платежей': '# ANNUITY, DIFFERENTIATED, BULLET, INTEREST_ONLY'
            },
            {
                'Название кредита': 'Кредитная линия на оборотные средства',
                'Сумма основного долга': 50000000,
                'Валюта': 'RUB',
                'Дата начала': '2024-01-15',
                'Дата окончания': '2025-01-14',
                'День платежа': 15,
                'Базовый индикатор ставки': 'KEY_RATE',
                'Кредитный спред (%)': 3.5,
                'Периодичность платежей': 'MONTHLY',
                'Тип платежей': 'ANNUITY'
            },
            {
                'Название кредита': 'Инвестиционный кредит на оборудование',
                'Сумма основного долга': 100000000,
                'Валюта': 'RUB',
                'Дата начала': '2024-03-01',
                'Дата окончания': '2027-02-28',
                'День платежа': 30,
                'Базовый индикатор ставки': 'KEY_RATE',
                'Кредитный спред (%)': 4.0,
                'Периодичность платежей': 'QUARTERLY',
                'Тип платежей': 'DIFFERENTIATED'
            },
            {
                'Название кредита': 'Овердрафт по расчетному счету',
                'Сумма основного долга': 10000000,
                'Валюта': 'RUB',
                'Дата начала': '2024-01-01',
                'Дата окончания': '2024-12-31',
                'День платежа': 31,
                'Базовый индикатор ставки': 'KEY_RATE',
                'Кредитный спред (%)': 5.0,
                'Периодичность платежей': 'MONTHLY',
                'Тип платежей': 'INTEREST_ONLY'
            },
            {
                'Название кредита': 'Долгосрочный проектный кредит',
                'Сумма основного долга': 200000000,
                'Валюта': 'RUB',
                'Дата начала': '2024-06-01',
                'Дата окончания': '2029-05-31',
                'День платежа': 1,
                'Базовый индикатор ставки': 'KEY_RATE',
                'Кредитный спред (%)': 2.5,
                'Периодичность платежей': 'SEMI_ANNUAL',
                'Тип платежей': 'BULLET'
            }
        ]
        
        # Create DataFrame and Excel file
        df = pd.DataFrame(template_data)
        
        # Create Excel file in memory with dropdown validation
        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Credits')
            
            # Get the workbook and worksheet
            workbook = writer.book
            worksheet = writer.sheets['Credits']
            
            # Add data validation with updated column positions
            # New column order: A=Название, B=Сумма, C=Валюта, D=Дата начала, E=Дата окончания, 
            # F=День платежа, G=Базовый индикатор, H=Спред, I=Периодичность, J=Тип
            from openpyxl.worksheet.datavalidation import DataValidation
            
            # Currency dropdown (column C)
            currency_validation = DataValidation(
                type="list",
                formula1='"RUB,USD,EUR,CNY"',
                allow_blank=False
            )
            currency_validation.error = 'Выберите значение из списка'
            currency_validation.errorTitle = 'Неверное значение'
            currency_validation.prompt = 'Выберите валюту'
            currency_validation.promptTitle = 'Валюта'
            worksheet.add_data_validation(currency_validation)
            currency_validation.add('C2:C1000')
            
            # Payment day validation (column F) - numbers 1-31
            day_validation = DataValidation(
                type="whole",
                operator="between",
                formula1=1,
                formula2=31,
                allow_blank=False
            )
            day_validation.error = 'Введите число от 1 до 31'
            day_validation.errorTitle = 'Неверный день платежа'
            day_validation.prompt = 'Введите день месяца для всех платежей (1-31)'
            day_validation.promptTitle = 'День платежа'
            worksheet.add_data_validation(day_validation)
            day_validation.add('F2:F1000')
            
            # Base rate indicator dropdown (column G)
            indicator_validation = DataValidation(
                type="list",
                formula1='"KEY_RATE,LIBOR,SOFR"',
                allow_blank=False
            )
            indicator_validation.error = 'Выберите значение из списка'
            indicator_validation.errorTitle = 'Неверное значение'
            indicator_validation.prompt = 'Выберите базовый индикатор ставки (базовая ставка загружается автоматически)'
            indicator_validation.promptTitle = 'Базовый индикатор ставки'
            worksheet.add_data_validation(indicator_validation)
            indicator_validation.add('G2:G1000')
            
            # Payment frequency dropdown (column I)
            frequency_validation = DataValidation(
                type="list",
                formula1='"MONTHLY,QUARTERLY,SEMI_ANNUAL,ANNUAL"',
                allow_blank=False
            )
            frequency_validation.error = 'Выберите значение из списка'
            frequency_validation.errorTitle = 'Неверное значение'
            frequency_validation.prompt = 'Выберите периодичность платежей'
            frequency_validation.promptTitle = 'Периодичность платежей'
            worksheet.add_data_validation(frequency_validation)
            frequency_validation.add('I2:I1000')
            
            # Payment type dropdown (column J)
            type_validation = DataValidation(
                type="list", 
                formula1='"ANNUITY,DIFFERENTIATED,BULLET,INTEREST_ONLY"',
                allow_blank=False
            )
            type_validation.error = 'Выберите значение из списка'
            type_validation.errorTitle = 'Неверное значение'
            type_validation.prompt = 'Выберите тип платежей'
            type_validation.promptTitle = 'Тип платежей'
            worksheet.add_data_validation(type_validation)
            type_validation.add('J2:J1000')
        
        excel_buffer.seek(0)
        excel_content = excel_buffer.getvalue()
        
        # Return Excel file
        return Response(
            content=excel_content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=template_credits.xlsx"}
        )
        
    except Exception as e:
        print(f"Error in download_template: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating template: {str(e)}"
        )


@router.get("/summary/stats")
def get_credit_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get summary statistics for user's credit obligations
    """
    credits = db.query(CreditObligation).options(
        joinedload(CreditObligation.payment_schedule)
    ).filter(
        CreditObligation.user_id == current_user.id
    ).all()
    
    if not credits:
        return {
            'total_count': 0,
            'total_principal': 0,
            'avg_rate': 0,
            'currency_breakdown': {},
            'payment_frequency_breakdown': {},
            'payment_type_breakdown': {}
        }
    
    # Calculate statistics
    total_principal = sum(credit.principal_amount for credit in credits)
    total_interest = sum(credit.get_interest_amount() for credit in credits)
    total_payments = sum(credit.get_total_payment() for credit in credits)
    avg_rate = sum(credit.total_rate for credit in credits) / len(credits)
    
    # Currency breakdown
    currency_breakdown = {}
    for credit in credits:
        currency_breakdown[credit.currency] = currency_breakdown.get(credit.currency, 0) + credit.principal_amount
    
    # Payment frequency breakdown
    frequency_breakdown = {}
    for credit in credits:
        freq = credit.payment_frequency.value
        frequency_breakdown[freq] = frequency_breakdown.get(freq, 0) + 1
    
    # Payment type breakdown
    type_breakdown = {}
    for credit in credits:
        ptype = credit.payment_type.value
        type_breakdown[ptype] = type_breakdown.get(ptype, 0) + 1
    
    return {
        'total_count': len(credits),
        'total_principal': total_principal,
        'total_interest': round(total_interest, 2),
        'total_payments': round(total_payments, 2),
        'avg_rate': round(avg_rate, 2),
        'currency_breakdown': currency_breakdown,
        'payment_frequency_breakdown': frequency_breakdown,
        'payment_type_breakdown': type_breakdown
    }


@router.get("/{credit_id}/schedule", response_model=List[dict])
def get_payment_schedule(
    credit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get payment schedule for a specific credit obligation
    """
    credit = db.query(CreditObligation).filter(
        CreditObligation.id == credit_id,
        CreditObligation.user_id == current_user.id
    ).first()
    
    if not credit:
        raise HTTPException(
            status_code=404,
            detail="Credit obligation not found"
        )
    
    # Get payment schedule
    schedule = db.query(PaymentSchedule).filter(
        PaymentSchedule.credit_obligation_id == credit_id
    ).order_by(PaymentSchedule.period_number).all()
    
    return [payment.to_dict() for payment in schedule]


@router.get("/{credit_id}/schedule/summary", response_model=dict)
def get_schedule_summary(
    credit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get summary statistics for payment schedule
    """
    credit = db.query(CreditObligation).filter(
        CreditObligation.id == credit_id,
        CreditObligation.user_id == current_user.id
    ).first()
    
    if not credit:
        raise HTTPException(
            status_code=404,
            detail="Credit obligation not found"
        )
    
    # Get payment schedule
    schedule = db.query(PaymentSchedule).filter(
        PaymentSchedule.credit_obligation_id == credit_id
    ).all()
    
    if not schedule:
        return {
            'periods_count': 0,
            'total_interest': 0,
            'total_payments': 0,
            'avg_period_days': 0,
            'first_payment': None,
            'last_payment': None
        }
    
    total_interest = sum(p.interest_amount or 0 for p in schedule)
    total_payments = sum(p.total_payment or 0 for p in schedule)
    avg_period_days = sum(p.period_days or 0 for p in schedule) / len(schedule)
    
    return {
        'periods_count': len(schedule),
        'total_interest': total_interest,
        'total_payments': total_payments,
        'avg_period_days': round(avg_period_days, 1),
        'first_payment': schedule[0].payment_date.isoformat() if schedule else None,
        'last_payment': schedule[-1].payment_date.isoformat() if schedule else None
    }


@router.post("/{credit_id}/schedule", response_model=dict)
def save_payment_schedule(
    credit_id: int,
    schedule_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save custom payment schedule for a credit obligation
    """
    credit = db.query(CreditObligation).filter(
        CreditObligation.id == credit_id,
        CreditObligation.user_id == current_user.id
    ).first()
    
    if not credit:
        raise HTTPException(
            status_code=404,
            detail="Credit obligation not found"
        )
    
    try:
        entries = schedule_data.get('entries', [])
        if not entries:
            raise HTTPException(
                status_code=400,
                detail="No payment schedule entries provided"
            )
        
        # Delete existing payment schedule
        db.query(PaymentSchedule).filter(
            PaymentSchedule.credit_obligation_id == credit_id
        ).delete()
        
        # Create new payment schedule entries
        payment_entries = []
        for i, entry in enumerate(entries):
            period_start = datetime.fromisoformat(entry['period_start_date'].replace('Z', '+00:00'))
            period_end = datetime.fromisoformat(entry['period_end_date'].replace('Z', '+00:00'))
            payment_date = datetime.fromisoformat(entry['payment_date'].replace('Z', '+00:00'))
            
            payment_schedule = PaymentSchedule(
                credit_obligation_id=credit_id,
                period_start_date=period_start,
                period_end_date=period_end,
                payment_date=payment_date,
                principal_amount=float(entry['outstanding_balance']),
                period_number=i + 1,
                interest_rate=credit.total_rate,
                base_rate=credit.base_rate_value,
                spread=credit.credit_spread
            )
            
            # Calculate financial details
            payment_schedule.calculate_financials()
            payment_entries.append(payment_schedule)
        
        # Save payment schedule entries
        db.add_all(payment_entries)
        db.commit()
        
        return {
            'message': f'Successfully saved payment schedule with {len(payment_entries)} periods',
            'credit_id': credit_id,
            'periods_count': len(payment_entries)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error saving payment schedule: {str(e)}"
        )