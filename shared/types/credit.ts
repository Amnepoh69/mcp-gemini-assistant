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
  created_at?: string;
  updated_at?: string;
}

export enum PaymentFrequency {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  SEMI_ANNUAL = "semi_annual",
  ANNUAL = "annual"
}

export enum PaymentType {
  ANNUITY = "annuity", // Аннуитетные платежи
  DIFFERENTIATED = "differentiated", // Дифференцированные платежи
  BULLET = "bullet", // Платеж в конце срока
  INTEREST_ONLY = "interest_only" // Только проценты
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
  { value: "LIBOR", label: "LIBOR" },
  { value: "EURIBOR", label: "EURIBOR" },
  { value: "SOFR", label: "SOFR" },
  { value: "FIXED", label: "Фиксированная ставка" }
];

export const SUPPORTED_CURRENCIES = [
  { value: "RUB", label: "Российский рубль" },
  { value: "USD", label: "Доллар США" },
  { value: "EUR", label: "Евро" },
  { value: "CNY", label: "Китайский юань" }
];