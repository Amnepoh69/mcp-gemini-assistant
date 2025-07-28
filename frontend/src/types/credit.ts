/**
 * Credit obligation data types
 */

export interface CreditObligation {
  id?: number;
  credit_name: string;
  principal_amount: number;
  currency: string;
  start_date: string;
  end_date: string;
  base_rate_indicator: string; // e.g., "KEY_RATE", "LIBOR", "EURIBOR"
  base_rate_value: number;
  credit_spread: number;
  total_rate: number; // base_rate_value + credit_spread
  payment_frequency: PaymentFrequency;
  payment_type: PaymentType;
  interest_amount?: number; // Сумма процентов
  total_payment?: number; // Общая сумма к выплате
  created_at?: string;
  updated_at?: string;
}

export enum PaymentFrequency {
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  SEMI_ANNUAL = "SEMI_ANNUAL",
  ANNUAL = "ANNUAL"
}

export enum PaymentType {
  ANNUITY = "ANNUITY", // Аннуитетные платежи
  DIFFERENTIATED = "DIFFERENTIATED", // Дифференцированные платежи
  BULLET = "BULLET", // Платеж в конце срока
  INTEREST_ONLY = "INTEREST_ONLY" // Только проценты
}

export interface CreditUploadData {
  credits: CreditObligation[];
  total_count: number;
  total_principal: number;
  avg_rate: number;
  currency_breakdown: Record<string, number>;
}

export interface CreditTemplate {
  credit_name: string;
  principal_amount: string;
  currency: string;
  start_date: string;
  end_date: string;
  base_rate_indicator: string;
  base_rate_value: string;
  credit_spread: string;
  payment_frequency: string;
  payment_type: string;
}

export const CREDIT_TEMPLATE_HEADERS: CreditTemplate = {
  credit_name: "Credit Name",
  principal_amount: "Principal Amount",
  currency: "Currency",
  start_date: "Start Date (YYYY-MM-DD)",
  end_date: "End Date (YYYY-MM-DD)",
  base_rate_indicator: "Base Rate Indicator",
  base_rate_value: "Base Rate Value (%)",
  credit_spread: "Credit Spread (%)",
  payment_frequency: "Payment Frequency",
  payment_type: "Payment Type"
};

export const BASE_RATE_INDICATORS = [
  { value: "KEY_RATE", label: "Ключевая ставка ЦБ РФ" },
  { value: "RUONIA", label: "RUONIA" },
  { value: "FIXED", label: "Фиксированная ставка" }
];

export const SUPPORTED_CURRENCIES = [
  { value: "RUB", label: "Российский рубль" },
  { value: "USD", label: "Доллар США" },
  { value: "EUR", label: "Евро" },
  { value: "CNY", label: "Китайский юань" }
];

// Payment Schedule Types
export interface PaymentScheduleEntry {
  id?: number;
  period_start_date: string; // Дата начала процентного периода
  period_end_date: string;   // Дата конца процентного периода
  payment_date: string;      // Дата платежа
  outstanding_balance: number; // Остаток ссудной задолженности
}

export interface PaymentSchedule {
  id?: number;
  credit_id: number;
  entries: PaymentScheduleEntry[];
  created_at?: string;
  updated_at?: string;
}