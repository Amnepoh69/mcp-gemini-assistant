"""
Payment schedule model for credit obligations
"""

from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class PaymentSchedule(Base):
    """Payment schedule model for detailed credit period tracking"""
    
    __tablename__ = "payment_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    credit_obligation_id = Column(Integer, ForeignKey("credit_obligations.id"), nullable=False)
    
    # Period details
    period_start_date = Column(DateTime, nullable=False)  # Дата начала процентного периода
    period_end_date = Column(DateTime, nullable=False)    # Дата конца процентного периода
    payment_date = Column(DateTime, nullable=False)       # Дата платежа
    
    # Financial details
    principal_amount = Column(Float, nullable=False)      # Остаток задолженности на начало периода
    interest_amount = Column(Float, nullable=True)        # Сумма процентов
    total_payment = Column(Float, nullable=True)          # Общая сумма платежа
    
    # Period characteristics
    period_days = Column(Integer, nullable=True)          # Количество дней в периоде
    period_number = Column(Integer, nullable=False)       # Номер периода
    
    # Interest calculation details
    interest_rate = Column(Float, nullable=True)          # Процентная ставка для периода
    base_rate = Column(Float, nullable=True)              # Базовая ставка
    spread = Column(Float, nullable=True)                 # Спред
    
    # Additional info
    notes = Column(Text, nullable=True)                   # Дополнительные заметки
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    credit_obligation = relationship("CreditObligation", back_populates="payment_schedule")
    
    def __repr__(self):
        return f"<PaymentSchedule(id={self.id}, period={self.period_number}, payment_date={self.payment_date})>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "credit_obligation_id": self.credit_obligation_id,
            "period_start_date": self.period_start_date.isoformat() if self.period_start_date else None,
            "period_end_date": self.period_end_date.isoformat() if self.period_end_date else None,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "principal_amount": self.principal_amount,
            "interest_amount": self.interest_amount,
            "total_payment": self.total_payment,
            "period_days": self.period_days,
            "period_number": self.period_number,
            "interest_rate": self.interest_rate,
            "base_rate": self.base_rate,
            "spread": self.spread,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    @classmethod
    def calculate_period_days(cls, start_date: datetime, end_date: datetime) -> int:
        """Calculate number of days in period"""
        return (end_date - start_date).days
    
    @classmethod
    def calculate_interest_amount(cls, principal: float, rate: float, days: int) -> float:
        """Calculate interest amount for period"""
        return principal * (rate / 100) * (days / 365)
    
    def calculate_financials(self):
        """Calculate financial details for this payment period"""
        if self.period_start_date and self.period_end_date:
            self.period_days = self.calculate_period_days(self.period_start_date, self.period_end_date)
        
        if self.principal_amount and self.interest_rate and self.period_days:
            self.interest_amount = self.calculate_interest_amount(
                self.principal_amount, 
                self.interest_rate, 
                self.period_days
            )
            
        if self.principal_amount and self.interest_amount:
            # For bullet payment or interest-only, total payment = interest only
            # For annuity or differentiated, this would be calculated differently
            self.total_payment = self.interest_amount
    
    def recalculate_with_historical_rates(self, db_session, base_rate_indicator: str, credit_spread: float):
        """
        Recalculate interest amounts using historical rates with period averaging
        
        Args:
            db_session: Database session
            base_rate_indicator: Base rate indicator (e.g., 'KEY_RATE')
            credit_spread: Credit spread percentage
        """
        if not self.period_start_date or not self.period_end_date:
            return
        
        if base_rate_indicator == "KEY_RATE":
            from app.services.cbr_service import CBRService
            from datetime import datetime
            cbr_service = CBRService(db_session)
            
            current_date = datetime.now()
            
            # Check if this is a future period
            if self.period_start_date > current_date:
                # For future periods, use current key rate
                current_rate = cbr_service.get_current_key_rate()
                if current_rate is not None:
                    self.base_rate = current_rate
                    self.interest_rate = current_rate + credit_spread
                    
                    print(f"Period {self.period_number}: Using current key rate {current_rate:.2f}% for future period ({self.period_start_date} to {self.period_end_date})")
                    print(f"Period {self.period_number}: Total interest rate: {self.interest_rate:.2f}%")
                else:
                    print(f"Period {self.period_number}: No current key rate available, keeping original rate")
                    return
            else:
                # For past/current periods, use historical average
                average_base_rate = cbr_service.get_average_key_rate_for_period(
                    self.period_start_date, 
                    self.period_end_date
                )
                
                if average_base_rate is not None:
                    self.base_rate = average_base_rate
                    self.interest_rate = average_base_rate + credit_spread
                    
                    print(f"Period {self.period_number}: Updated base rate to {average_base_rate:.2f}% (historical average for {self.period_start_date} to {self.period_end_date})")
                    print(f"Period {self.period_number}: Total interest rate: {self.interest_rate:.2f}%")
                else:
                    print(f"Period {self.period_number}: No historical rate data available for period {self.period_start_date} to {self.period_end_date}")
                    logger.warning(f"No official CBR data available for period {self.period_start_date} to {self.period_end_date}")
                    # Don't update the rate if we don't have official data
                    return
            
            # Recalculate interest amount
            if self.principal_amount and self.period_days:
                self.interest_amount = self.calculate_interest_amount(
                    self.principal_amount, 
                    self.interest_rate, 
                    self.period_days
                )
                
                # Update total payment
                self.total_payment = self.interest_amount
                
                print(f"Period {self.period_number}: Recalculated interest amount: {self.interest_amount:.2f}")
        else:
            print(f"Period {self.period_number}: Base rate indicator {base_rate_indicator} not supported for historical recalculation")