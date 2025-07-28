/**
 * Utility functions for generating payment schedules
 */

import { PaymentScheduleEntry, PaymentFrequency, PaymentType } from '@/types/credit';

interface CreditParams {
  principal_amount: number;
  start_date: string;
  end_date: string;
  payment_frequency: PaymentFrequency;
  payment_type: PaymentType;
  total_rate: number;
}

/**
 * Calculate payment frequency in months
 */
const getPaymentFrequencyMonths = (frequency: PaymentFrequency): number => {
  switch (frequency) {
    case PaymentFrequency.MONTHLY:
      return 1;
    case PaymentFrequency.QUARTERLY:
      return 3;
    case PaymentFrequency.SEMI_ANNUAL:
      return 6;
    case PaymentFrequency.ANNUAL:
      return 12;
    default:
      return 1;
  }
};

/**
 * Add months to a date
 */
const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * Format date as YYYY-MM-DD
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculate annuity payment amount
 */
const calculateAnnuityPayment = (principal: number, monthlyRate: number, periods: number): number => {
  if (monthlyRate === 0) return principal / periods;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, periods)) / (Math.pow(1 + monthlyRate, periods) - 1);
};

/**
 * Generate payment schedule based on credit parameters
 * Note: payment_frequency and payment_type refer to interest payment characteristics
 */
export const generatePaymentSchedule = (params: CreditParams): PaymentScheduleEntry[] => {
  const {
    principal_amount,
    start_date,
    end_date,
    payment_frequency,
    payment_type,
    total_rate
  } = params;

  if (!principal_amount || !start_date || !end_date || !total_rate) {
    return [];
  }

  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const paymentFrequencyMonths = getPaymentFrequencyMonths(payment_frequency);
  
  // Calculate annual and period rates for interest payments
  const annualRate = total_rate / 100;
  const periodsPerYear = 12 / paymentFrequencyMonths;
  const periodRate = annualRate / periodsPerYear;
  
  // Calculate total number of interest payment periods
  const totalMonths = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const totalPeriods = Math.ceil(totalMonths / paymentFrequencyMonths);
  
  const schedule: PaymentScheduleEntry[] = [];
  let remainingBalance = principal_amount;
  
  for (let period = 0; period < totalPeriods; period++) {
    const periodStartDate = addMonths(startDate, period * paymentFrequencyMonths);
    const periodEndDate = addMonths(startDate, (period + 1) * paymentFrequencyMonths);
    
    // Don't go beyond end date
    if (periodStartDate >= endDate) break;
    
    // Adjust last period end date to credit end date
    const actualPeriodEndDate = periodEndDate > endDate ? endDate : periodEndDate;
    
    let principalPayment = 0;
    let interestPayment = 0;
    
    // Calculate interest payments based on interest payment type
    // Note: payment_type only affects interest calculation method, not principal repayment
    switch (payment_type) {
      case PaymentType.DIFFERENTIATED:
        // Differentiated interest payments - calculated on current outstanding balance
        interestPayment = remainingBalance * periodRate;
        break;
        
      case PaymentType.ANNUITY:
        // Annuity interest payments - calculated on current outstanding balance
        interestPayment = remainingBalance * periodRate;
        break;
        
      case PaymentType.BULLET:
        // Bullet interest payments - calculated on full outstanding balance (no principal reduction during term)
        interestPayment = remainingBalance * periodRate;
        break;
        
      case PaymentType.INTEREST_ONLY:
        // Interest-only payments - calculated on full outstanding balance (no principal reduction during term)
        interestPayment = remainingBalance * periodRate;
        break;
        
      default:
        // Default interest calculation
        interestPayment = remainingBalance * periodRate;
    }
    
    // Principal repayment is determined separately from interest payment type
    // For this basic implementation, we'll assume no principal repayment during the term
    // Principal repayment schedule should be defined separately
    principalPayment = 0; // No principal payment in this basic schedule
    
    // Outstanding balance remains unchanged since no principal is being repaid
    // (In a full implementation, principal repayment would be based on a separate schedule)
    
    // Ensure we don't pay more principal than remaining (safety check)
    if (principalPayment > principal_amount) {
      principalPayment = principal_amount;
    }
    
    // Ensure remaining balance doesn't go negative
    if (remainingBalance < 0) {
      remainingBalance = 0;
    }
    
    // Create schedule entry
    const entry: PaymentScheduleEntry = {
      period_start_date: formatDate(periodStartDate),
      period_end_date: formatDate(actualPeriodEndDate),
      payment_date: formatDate(actualPeriodEndDate), // Payment on period end date
      outstanding_balance: Math.round(remainingBalance * 100) / 100 // Round to 2 decimal places
    };
    
    schedule.push(entry);
    
    // Break if balance is zero
    if (remainingBalance <= 0) break;
  }
  
  return schedule;
};

/**
 * Validate credit parameters for schedule generation
 */
export const validateCreditParams = (params: Partial<CreditParams>): string[] => {
  const errors: string[] = [];
  
  if (!params.principal_amount || params.principal_amount <= 0) {
    errors.push('Сумма основного долга должна быть больше нуля');
  }
  
  if (!params.start_date) {
    errors.push('Дата начала обязательна');
  }
  
  if (!params.end_date) {
    errors.push('Дата окончания обязательна');
  }
  
  if (params.start_date && params.end_date) {
    const startDate = new Date(params.start_date);
    const endDate = new Date(params.end_date);
    
    if (endDate <= startDate) {
      errors.push('Дата окончания должна быть позже даты начала');
    }
  }
  
  if (!params.total_rate || params.total_rate <= 0) {
    errors.push('Процентная ставка должна быть больше нуля');
  }
  
  if (!params.payment_frequency) {
    errors.push('Периодичность процентных платежей обязательна');
  }
  
  if (!params.payment_type) {
    errors.push('Тип процентных платежей обязателен');
  }
  
  return errors;
};