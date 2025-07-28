/**
 * API client configuration and utilities
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import { AuthStore } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store reference for token management
let authStore: AuthStore | null = null;

export const setAuthStore = (store: AuthStore) => {
  authStore = store;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Add correlation ID for request tracking
    config.headers['X-Correlation-ID'] = generateCorrelationId();
    
    // Add auth token if available
    const token = authStore?.accessToken || 
                  (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token from storage if authStore not initialized
        const refreshToken = authStore?.refreshToken || 
          (typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null);
        
        // Try to refresh token
        if (refreshToken) {
          if (authStore) {
            await authStore.refreshAuth();
            
            // Retry original request with new token
            if (authStore.accessToken) {
              originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`;
              return api(originalRequest);
            }
          } else {
            // Fallback: manually refresh token if store not available
            const response = await authApi.refresh({ refresh_token: refreshToken });
            const { access_token } = response.data;
            
            // Update localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('access_token', access_token);
            }
            
            // Retry with new token
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        console.error('Token refresh failed:', refreshError);
        authStore?.logout();
        
        // Clear tokens from storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          // Redirect to login
          window.location.href = '/auth';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle other errors
    const errorMessage = getErrorMessage(error);
    
    // Don't show toast for silent requests
    if (!originalRequest.silent) {
      toast.error(errorMessage);
    }
    
    return Promise.reject(error);
  }
);

// Generate correlation ID for request tracking
function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Extract error message from response
function getErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as any;
    return data.message || data.detail || 'An error occurred';
  }
  
  if (error.request) {
    return 'Network error. Please check your connection.';
  }
  
  return error.message || 'An unexpected error occurred';
}

// API endpoints
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: (data: any) => api.post('/auth/logout', data),
  refresh: (data: any) => api.post('/auth/refresh', data),
  me: () => api.get('/auth/me'),
  onboard: (data: any) => api.post('/auth/onboard', data),
  verifyEmail: (token: string) => api.post(`/auth/verify-email?token=${token}`),
  resetPassword: (data: any) => api.post('/auth/reset-password', data),
  confirmResetPassword: (data: any) => api.post('/auth/reset-password/confirm', data),
  changePassword: (data: any) => api.post('/auth/change-password', data),
  getSSOUrl: (provider: string, state?: string) => 
    api.get(`/auth/sso/${provider}/url${state ? `?state=${state}` : ''}`),
  ssoCallback: (data: any) => api.post('/auth/sso/callback', data),
};

export const usersApi = {
  getProfile: (userId: number) => api.get(`/users/${userId}`),
  updateProfile: (userId: number, data: any) => api.put(`/users/${userId}`, data),
  getStats: (userId: number) => api.get(`/users/${userId}/stats`),
  list: (params?: any) => api.get('/users', { params }),
  activate: (userId: number) => api.post(`/users/${userId}/activate`),
  deactivate: (userId: number) => api.post(`/users/${userId}/deactivate`),
  delete: (userId: number) => api.delete(`/users/${userId}`),
};

export const uploadApi = {
  uploadFile: (formData: FormData) => api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  createManual: (data: any) => api.post('/manual', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getUploads: () => api.get('/uploads'),
  getUpload: (uploadId: number) => api.get(`/uploads/${uploadId}`),
  deleteUpload: (uploadId: number) => api.delete(`/uploads/${uploadId}`),
  downloadTemplate: (category: string) => api.get(`/template/${category}`, {
    responseType: 'blob',
  }),
};

export const scenarioApi = {
  createScenario: (data: any) => api.post('/scenarios', data),
  getScenarios: () => api.get('/scenarios'),
  getScenario: (scenarioId: number) => api.get(`/scenarios/${scenarioId}`),
  updateScenario: (scenarioId: number, data: any) => api.put(`/scenarios/${scenarioId}`, data),
  deleteScenario: (scenarioId: number) => api.delete(`/scenarios/${scenarioId}`),
  executeScenario: (scenarioId: number) => api.post(`/scenarios/${scenarioId}/execute`),
  getScenarioResults: (scenarioId: number) => api.get(`/scenarios/${scenarioId}/results`),
  getScenarioTypes: () => api.get('/scenario-types'),
  getScenarioTemplate: (scenarioType: string) => api.post('/scenarios/template', { scenario_type: scenarioType }),
};

export const marketDataApi = {
  getCurrencyRates: () => 
    api.get('/market-data/currencies'),
  
  getInterestRates: (country = 'US') => 
    api.get(`/market-data/interest-rates?country=${country}`),
  
  getCommodityPrices: (commodities?: string) => 
    api.get(`/market-data/commodities${commodities ? `?commodities=${commodities}` : ''}`),
  
  getMarketIndices: (indices?: string) => 
    api.get(`/market-data/indices${indices ? `?indices=${indices}` : ''}`),
  
  getEconomicIndicators: (country = 'US') => 
    api.get(`/market-data/economic-indicators?country=${country}`),
  
  getVolatilityData: (symbol: string, period = '1y') => 
    api.get(`/market-data/volatility/${symbol}?period=${period}`),
  
  getDashboardData: () => 
    api.get(`/market-data/dashboard?_t=${Date.now()}`),
  
  runEnhancedAnalysis: (scenarioId: number, stressTest = false) => 
    api.post(`/scenarios/${scenarioId}/enhanced-analysis?stress_test=${stressTest}`),
  
  runCurrencyRiskAnalysis: (uploadIds: number[], baseCurrency = 'RUB') => 
    api.post('/scenarios/currency-risk', { upload_ids: uploadIds, base_currency: baseCurrency }),
  
  runInterestRateRiskAnalysis: (uploadIds: number[], country = 'US') => 
    api.post('/scenarios/interest-rate-risk', { upload_ids: uploadIds, country }),
  
  runCommodityRiskAnalysis: (uploadIds: number[]) => 
    api.post('/scenarios/commodity-risk', { upload_ids: uploadIds }),
  
  runMarketCorrelationAnalysis: (uploadIds: number[]) => 
    api.post('/scenarios/market-correlation', { upload_ids: uploadIds }),
  
  getRiskScenarios: () => 
    api.get('/scenarios/risk-scenarios'),
};

export const creditsApi = {
  uploadCredits: (formData: FormData) => api.post('/credits/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  uploadSchedule: (formData: FormData) => api.post('/credits/upload-schedule', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  createCredit: (data: any) => api.post('/credits', data),
  getCredits: () => api.get('/credits/'),
  getCredit: (creditId: number) => api.get(`/credits/${creditId}`),
  updateCredit: (creditId: number, data: any) => api.put(`/credits/${creditId}`, data),
  deleteCredit: (creditId: number) => api.delete(`/credits/${creditId}`),
  downloadTemplate: () => api.get('/credits/template/download', {
    responseType: 'blob',
  }),
  getSummary: () => api.get('/credits/summary/stats'),
  getSchedule: (creditId: number) => api.get(`/credits/${creditId}/schedule`),
  getScheduleSummary: (creditId: number) => api.get(`/credits/${creditId}/schedule/summary`),
  savePaymentSchedule: (creditId: number, entries: any[]) => api.post(`/credits/${creditId}/schedule`, { entries }),
  recalculateInterest: (creditId: number) => api.post(`/credits/${creditId}/recalculate-interest`),
};

export const rateScenariosApi = {
  // Upload scenarios from Excel file
  uploadScenarios: (formData: FormData) => api.post('/rate-scenarios/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  // Get user scenarios
  getScenarios: () => api.get('/rate-scenarios/'),
  
  // Get specific scenario
  getScenario: (scenarioId: number) => api.get(`/rate-scenarios/${scenarioId}`),
  
  // Get scenario forecasts
  getScenarioForecasts: (
    scenarioId: number, 
    params?: {
      indicator?: string;
      start_date?: string;
      end_date?: string;
    }
  ) => api.get(`/rate-scenarios/${scenarioId}/forecasts`, { params }),
  
  // Create scenario manually
  createScenario: (data: any) => api.post('/rate-scenarios/', data),
  
  // Update scenario
  updateScenario: (scenarioId: number, data: any) => api.put(`/rate-scenarios/${scenarioId}`, data),
  
  // Delete scenario
  deleteScenario: (scenarioId: number) => api.delete(`/rate-scenarios/${scenarioId}`),
  
  // Get public scenarios
  getPublicScenarios: () => api.get('/rate-scenarios/public/scenarios'),
  
  // Analyze scenario impact on credits
  analyzeImpact: (data: {
    scenario_id: number;
    credit_ids?: number[];
    comparison_scenario_id?: number;
    start_date?: string;
    end_date?: string;
  }) => api.post('/rate-scenarios/analyze', data),
};

export const cbrApi = {
  getCurrentRate: () => api.get('/cbr/key-rate/current'),
  getHistoricalRates: (days: number = 1000) => api.get(`/cbr/key-rate/history?days=${days}`),
  getRateOnDate: (date: string) => api.get(`/cbr/key-rate/on-date?date=${date}`),
  getCurrentRuonia: () => api.get('/cbr/ruonia/current'),
};

// Hedging API
export const hedgingApi = {
  // Hedging instruments CRUD
  createInstrument: (data: any) => api.post('/hedging/', data),
  getInstruments: (skip?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (skip !== undefined) params.append('skip', skip.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    return api.get(`/hedging/?${params.toString()}`);
  },
  getInstrument: (id: number) => api.get(`/hedging/${id}`),
  updateInstrument: (id: number, data: any) => api.put(`/hedging/${id}`, data),
  deleteInstrument: (id: number) => api.delete(`/hedging/${id}`),
  
  // Scenario hedging associations
  addInstrumentToScenario: (scenarioId: number, data: any) => 
    api.post(`/hedging/scenarios/${scenarioId}/hedging`, data),
  getScenarioHedging: (scenarioId: number) => 
    api.get(`/hedging/scenarios/${scenarioId}/hedging`),
  
  // Hedging calculations
  calculateEffect: (instrumentIds: number[]) => 
    api.post('/hedging/calculate-effect', instrumentIds),
  
  // Hedging library
  getDefaultInstruments: () => api.get('/hedging/library/defaults'),
};

export default api;