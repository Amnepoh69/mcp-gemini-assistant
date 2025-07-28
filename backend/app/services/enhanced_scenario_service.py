"""
Enhanced scenario service with external data integration
Extends the base scenario service with market data and risk modeling
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass

from app.services.scenario_service import ScenarioService, ScenarioType
from app.services.external_data_service import external_data_service, MarketData, CurrencyRate

logger = logging.getLogger(__name__)


@dataclass
class RiskScenario:
    """Risk scenario configuration"""
    name: str
    description: str
    market_shock: float  # Market shock percentage
    currency_shock: float  # Currency shock percentage
    interest_rate_shock: float  # Interest rate shock percentage
    commodity_shock: float  # Commodity shock percentage
    probability: float  # Scenario probability


@dataclass
class ScenarioResult:
    """Enhanced scenario result with risk metrics"""
    scenario_name: str
    base_case: Dict[str, Any]
    stressed_case: Dict[str, Any]
    risk_metrics: Dict[str, Any]
    external_factors: Dict[str, Any]
    recommendations: List[str]


class EnhancedScenarioService(ScenarioService):
    """Enhanced scenario service with external data integration"""
    
    def __init__(self, db):
        super().__init__(db)
        self.external_data = external_data_service
        
        # Predefined risk scenarios
        self.risk_scenarios = {
            'mild_recession': RiskScenario(
                name='Mild Recession',
                description='Moderate economic downturn',
                market_shock=-0.15,
                currency_shock=0.05,
                interest_rate_shock=0.01,
                commodity_shock=-0.10,
                probability=0.20
            ),
            'severe_recession': RiskScenario(
                name='Severe Recession',
                description='Deep economic recession',
                market_shock=-0.35,
                currency_shock=0.15,
                interest_rate_shock=0.02,
                commodity_shock=-0.25,
                probability=0.05
            ),
            'inflation_surge': RiskScenario(
                name='Inflation Surge',
                description='High inflation environment',
                market_shock=-0.10,
                currency_shock=-0.08,
                interest_rate_shock=0.03,
                commodity_shock=0.20,
                probability=0.15
            ),
            'market_crash': RiskScenario(
                name='Market Crash',
                description='Severe market correction',
                market_shock=-0.40,
                currency_shock=0.10,
                interest_rate_shock=-0.01,
                commodity_shock=-0.15,
                probability=0.03
            ),
            'currency_crisis': RiskScenario(
                name='Currency Crisis',
                description='Major currency devaluation',
                market_shock=-0.20,
                currency_shock=0.25,
                interest_rate_shock=0.04,
                commodity_shock=0.15,
                probability=0.08
            )
        }
    
    def execute_enhanced_scenario(self, scenario_id: int, stress_test: bool = False) -> ScenarioResult:
        """
        Execute enhanced scenario with external data integration
        
        Args:
            scenario_id: Scenario ID from database
            stress_test: Whether to perform stress testing
            
        Returns:
            ScenarioResult with enhanced analysis
        """
        # Get base scenario
        scenario = self.db.query(self.models.Scenario).filter_by(id=scenario_id).first()
        if not scenario:
            raise ValueError(f"Scenario {scenario_id} not found")
        
        # Get external market data
        external_factors = self._get_external_factors()
        
        # Execute base scenario
        base_result = self.execute_scenario(scenario_id)
        
        # Perform stress testing if requested
        stressed_results = {}
        if stress_test:
            stressed_results = self._perform_stress_testing(scenario, external_factors)
        
        # Calculate risk metrics
        risk_metrics = self._calculate_risk_metrics(base_result, external_factors)
        
        # Generate recommendations
        recommendations = self._generate_enhanced_recommendations(
            base_result, stressed_results, risk_metrics, external_factors
        )
        
        return ScenarioResult(
            scenario_name=scenario.name,
            base_case=base_result,
            stressed_case=stressed_results,
            risk_metrics=risk_metrics,
            external_factors=external_factors,
            recommendations=recommendations
        )
    
    def execute_currency_risk_scenario(self, cash_flows: pd.DataFrame, base_currency: str = 'RUB') -> Dict[str, Any]:
        """
        Execute currency risk scenario analysis
        
        Args:
            cash_flows: DataFrame with cash flows data
            base_currency: Base currency for analysis
            
        Returns:
            Dictionary with currency risk analysis
        """
        # Get current currency rates
        currency_rates = self.external_data.get_currency_rates()
        
        # Identify currency exposures in cash flows
        currency_exposures = self._identify_currency_exposures(cash_flows)
        
        # Calculate current FX impact
        current_fx_impact = self._calculate_fx_impact(currency_exposures, currency_rates)
        
        # Stress test currency scenarios
        fx_stress_results = {}
        for scenario_name, scenario in self.risk_scenarios.items():
            stressed_rates = self._apply_currency_shock(currency_rates, scenario.currency_shock)
            stressed_impact = self._calculate_fx_impact(currency_exposures, stressed_rates)
            
            fx_stress_results[scenario_name] = {
                'fx_impact': stressed_impact,
                'impact_change': stressed_impact - current_fx_impact,
                'scenario_probability': scenario.probability
            }
        
        return {
            'analysis_type': 'currency_risk',
            'base_currency': base_currency,
            'currency_exposures': currency_exposures,
            'current_fx_impact': current_fx_impact,
            'currency_rates': [{'currency': rate.target_currency, 'rate': rate.rate} for rate in currency_rates],
            'stress_test_results': fx_stress_results,
            'recommendations': self._generate_fx_recommendations(currency_exposures, fx_stress_results)
        }
    
    def execute_interest_rate_risk_scenario(self, cash_flows: pd.DataFrame, country: str = 'US') -> Dict[str, Any]:
        """
        Execute interest rate risk scenario analysis
        
        Args:
            cash_flows: DataFrame with cash flows data
            country: Country for interest rate analysis
            
        Returns:
            Dictionary with interest rate risk analysis
        """
        # Get current interest rates
        interest_rates = self.external_data.get_interest_rates(country)
        
        # Identify interest rate sensitive items
        rate_sensitive_items = self._identify_rate_sensitive_items(cash_flows)
        
        # Calculate current interest rate impact
        current_rate_impact = self._calculate_interest_rate_impact(rate_sensitive_items, interest_rates)
        
        # Stress test interest rate scenarios
        rate_stress_results = {}
        for scenario_name, scenario in self.risk_scenarios.items():
            stressed_rates = self._apply_interest_rate_shock(interest_rates, scenario.interest_rate_shock)
            stressed_impact = self._calculate_interest_rate_impact(rate_sensitive_items, stressed_rates)
            
            rate_stress_results[scenario_name] = {
                'rate_impact': stressed_impact,
                'impact_change': stressed_impact - current_rate_impact,
                'scenario_probability': scenario.probability
            }
        
        return {
            'analysis_type': 'interest_rate_risk',
            'country': country,
            'rate_sensitive_items': rate_sensitive_items,
            'current_rate_impact': current_rate_impact,
            'interest_rates': interest_rates,
            'stress_test_results': rate_stress_results,
            'recommendations': self._generate_rate_recommendations(rate_sensitive_items, rate_stress_results)
        }
    
    def execute_commodity_risk_scenario(self, cash_flows: pd.DataFrame) -> Dict[str, Any]:
        """
        Execute commodity risk scenario analysis
        
        Args:
            cash_flows: DataFrame with cash flows data
            
        Returns:
            Dictionary with commodity risk analysis
        """
        # Get current commodity prices
        commodity_prices = self.external_data.get_commodity_prices()
        
        # Identify commodity exposures
        commodity_exposures = self._identify_commodity_exposures(cash_flows)
        
        # Calculate current commodity impact
        current_commodity_impact = self._calculate_commodity_impact(commodity_exposures, commodity_prices)
        
        # Stress test commodity scenarios
        commodity_stress_results = {}
        for scenario_name, scenario in self.risk_scenarios.items():
            stressed_prices = self._apply_commodity_shock(commodity_prices, scenario.commodity_shock)
            stressed_impact = self._calculate_commodity_impact(commodity_exposures, stressed_prices)
            
            commodity_stress_results[scenario_name] = {
                'commodity_impact': stressed_impact,
                'impact_change': stressed_impact - current_commodity_impact,
                'scenario_probability': scenario.probability
            }
        
        return {
            'analysis_type': 'commodity_risk',
            'commodity_exposures': commodity_exposures,
            'current_commodity_impact': current_commodity_impact,
            'commodity_prices': [{'commodity': price.commodity, 'price': price.price} for price in commodity_prices],
            'stress_test_results': commodity_stress_results,
            'recommendations': self._generate_commodity_recommendations(commodity_exposures, commodity_stress_results)
        }
    
    def execute_market_correlation_scenario(self, cash_flows: pd.DataFrame) -> Dict[str, Any]:
        """
        Execute market correlation scenario analysis
        
        Args:
            cash_flows: DataFrame with cash flows data
            
        Returns:
            Dictionary with market correlation analysis
        """
        # Get market indices data
        market_indices = self.external_data.get_market_indices()
        
        # Identify market correlations
        market_correlations = self._identify_market_correlations(cash_flows, market_indices)
        
        # Calculate current market impact
        current_market_impact = self._calculate_market_impact(market_correlations, market_indices)
        
        # Stress test market scenarios
        market_stress_results = {}
        for scenario_name, scenario in self.risk_scenarios.items():
            stressed_indices = self._apply_market_shock(market_indices, scenario.market_shock)
            stressed_impact = self._calculate_market_impact(market_correlations, stressed_indices)
            
            market_stress_results[scenario_name] = {
                'market_impact': stressed_impact,
                'impact_change': stressed_impact - current_market_impact,
                'scenario_probability': scenario.probability
            }
        
        return {
            'analysis_type': 'market_correlation',
            'market_correlations': market_correlations,
            'current_market_impact': current_market_impact,
            'market_indices': [{'symbol': idx.symbol, 'value': idx.value} for idx in market_indices],
            'stress_test_results': market_stress_results,
            'recommendations': self._generate_market_recommendations(market_correlations, market_stress_results)
        }
    
    def _get_external_factors(self) -> Dict[str, Any]:
        """Get all external factors for analysis"""
        try:
            return {
                'currency_rates': self.external_data.get_currency_rates(),
                'interest_rates': self.external_data.get_interest_rates(),
                'commodity_prices': self.external_data.get_commodity_prices(),
                'market_indices': self.external_data.get_market_indices(),
                'economic_indicators': self.external_data.get_economic_indicators()
            }
        except Exception as e:
            logger.error(f"Error getting external factors: {str(e)}")
            return {}
    
    def _perform_stress_testing(self, scenario, external_factors: Dict[str, Any]) -> Dict[str, Any]:
        """Perform stress testing across all risk scenarios"""
        stress_results = {}
        
        for scenario_name, risk_scenario in self.risk_scenarios.items():
            # Apply shocks to external factors
            stressed_factors = self._apply_stress_shocks(external_factors, risk_scenario)
            
            # Recalculate scenario with stressed factors
            stressed_result = self._recalculate_with_stress(scenario, stressed_factors)
            
            stress_results[scenario_name] = {
                'result': stressed_result,
                'probability': risk_scenario.probability,
                'description': risk_scenario.description
            }
        
        return stress_results
    
    def _calculate_risk_metrics(self, base_result: Dict[str, Any], external_factors: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate enhanced risk metrics"""
        return {
            'value_at_risk': self._calculate_var(base_result),
            'expected_shortfall': self._calculate_expected_shortfall(base_result),
            'stress_test_impact': self._calculate_stress_impact(base_result, external_factors),
            'correlation_risk': self._calculate_correlation_risk(external_factors),
            'liquidity_risk': self._calculate_liquidity_risk(base_result),
            'concentration_risk': self._calculate_concentration_risk(base_result)
        }
    
    # Helper methods (mock implementations for development)
    def _identify_currency_exposures(self, cash_flows: pd.DataFrame) -> Dict[str, float]:
        """Identify currency exposures in cash flows"""
        # Mock implementation
        return {
            'CNY': 250000,
            'USD': 150000,
            'EUR': 500000,
            'INR': 800000,
            'RUB': -1000000  # Base currency
        }
    
    def _calculate_fx_impact(self, exposures: Dict[str, float], rates: List[CurrencyRate]) -> float:
        """Calculate FX impact on cash flows"""
        total_impact = 0
        # Создаем словарь курсов: валюта -> курс к рублю
        rate_dict = {}
        for rate in rates:
            if rate.target_currency == 'RUB':
                rate_dict[rate.base_currency] = rate.rate
        
        for currency, exposure in exposures.items():
            if currency in rate_dict:
                # Для валют: exposure * курс = сумма в рублях
                total_impact += exposure * rate_dict[currency]
            elif currency == 'RUB':
                # Для рублей: exposure остается как есть
                total_impact += exposure
        
        return total_impact
    
    def _apply_currency_shock(self, rates: List[CurrencyRate], shock: float) -> List[CurrencyRate]:
        """Apply currency shock to rates"""
        shocked_rates = []
        for rate in rates:
            new_rate = CurrencyRate(
                base_currency=rate.base_currency,
                target_currency=rate.target_currency,
                rate=rate.rate * (1 + shock),
                timestamp=rate.timestamp
            )
            shocked_rates.append(new_rate)
        return shocked_rates
    
    def _generate_fx_recommendations(self, exposures: Dict[str, float], stress_results: Dict[str, Any]) -> List[str]:
        """Generate FX risk recommendations"""
        recommendations = []
        
        # Analyze exposure concentration
        total_exposure = sum(abs(exp) for exp in exposures.values())
        for currency, exposure in exposures.items():
            if abs(exposure) / total_exposure > 0.3:
                recommendations.append(f"Consider hedging {currency} exposure of {exposure:,.0f}")
        
        # Analyze stress test results
        worst_case = max(stress_results.values(), key=lambda x: abs(x['impact_change']))
        if abs(worst_case['impact_change']) > total_exposure * 0.1:
            recommendations.append("Consider implementing FX hedging strategy")
        
        return recommendations
    
    def _identify_rate_sensitive_items(self, cash_flows: pd.DataFrame) -> Dict[str, float]:
        """Identify interest rate sensitive items"""
        # Mock implementation
        return {
            'variable_rate_debt': -500000,
            'fixed_deposits': 200000,
            'floating_rate_investments': 150000
        }
    
    def _calculate_interest_rate_impact(self, items: Dict[str, float], rates: Dict[str, float]) -> float:
        """Calculate interest rate impact"""
        base_rate = rates.get('federal_funds_rate', 0.05)
        total_impact = 0
        
        for item, amount in items.items():
            if 'debt' in item:
                total_impact += amount * base_rate  # Negative impact for debt
            else:
                total_impact += amount * base_rate * 0.8  # Positive impact for investments
        
        return total_impact
    
    def _apply_interest_rate_shock(self, rates: Dict[str, float], shock: float) -> Dict[str, float]:
        """Apply interest rate shock"""
        shocked_rates = {}
        for rate_type, rate in rates.items():
            shocked_rates[rate_type] = rate + shock
        return shocked_rates
    
    def _generate_rate_recommendations(self, items: Dict[str, float], stress_results: Dict[str, Any]) -> List[str]:
        """Generate interest rate recommendations"""
        recommendations = []
        
        variable_debt = sum(amount for item, amount in items.items() if 'debt' in item and 'variable' in item)
        if variable_debt < -100000:
            recommendations.append("Consider fixing interest rates on variable debt")
        
        return recommendations
    
    def _identify_commodity_exposures(self, cash_flows: pd.DataFrame) -> Dict[str, float]:
        """Identify commodity exposures"""
        # Mock implementation
        return {
            'OIL': 50000,
            'GOLD': -25000,
            'WHEAT': 30000
        }
    
    def _calculate_commodity_impact(self, exposures: Dict[str, float], prices) -> float:
        """Calculate commodity impact"""
        total_impact = 0
        price_dict = {price.commodity: price.price for price in prices}
        
        for commodity, exposure in exposures.items():
            if commodity in price_dict:
                total_impact += exposure * price_dict[commodity] * 0.001  # Scale factor
        
        return total_impact
    
    def _apply_commodity_shock(self, prices, shock: float):
        """Apply commodity shock to prices"""
        shocked_prices = []
        for price in prices:
            from app.services.external_data_service import CommodityPrice
            shocked_price = CommodityPrice(
                commodity=price.commodity,
                price=price.price * (1 + shock),
                currency=price.currency,
                timestamp=price.timestamp
            )
            shocked_prices.append(shocked_price)
        return shocked_prices
    
    def _generate_commodity_recommendations(self, exposures: Dict[str, float], stress_results: Dict[str, Any]) -> List[str]:
        """Generate commodity recommendations"""
        recommendations = []
        
        for commodity, exposure in exposures.items():
            if abs(exposure) > 25000:
                recommendations.append(f"Monitor {commodity} price movements closely")
        
        return recommendations
    
    def _identify_market_correlations(self, cash_flows: pd.DataFrame, indices) -> Dict[str, float]:
        """Identify market correlations"""
        # Mock implementation
        return {
            '^GSPC': 0.75,
            '^DJI': 0.68,
            '^IXIC': 0.82
        }
    
    def _calculate_market_impact(self, correlations: Dict[str, float], indices) -> float:
        """Calculate market impact"""
        total_impact = 0
        index_dict = {idx.symbol: idx.value for idx in indices}
        
        for symbol, correlation in correlations.items():
            if symbol in index_dict:
                total_impact += correlation * index_dict[symbol] * 0.0001  # Scale factor
        
        return total_impact
    
    def _apply_market_shock(self, indices, shock: float):
        """Apply market shock to indices"""
        shocked_indices = []
        for idx in indices:
            shocked_idx = MarketData(
                symbol=idx.symbol,
                value=idx.value * (1 + shock),
                timestamp=idx.timestamp,
                source=idx.source,
                metadata=idx.metadata
            )
            shocked_indices.append(shocked_idx)
        return shocked_indices
    
    def _generate_market_recommendations(self, correlations: Dict[str, float], stress_results: Dict[str, Any]) -> List[str]:
        """Generate market recommendations"""
        recommendations = []
        
        high_correlations = [symbol for symbol, corr in correlations.items() if corr > 0.7]
        if high_correlations:
            recommendations.append(f"High correlation with {', '.join(high_correlations)} - consider diversification")
        
        return recommendations
    
    def _apply_stress_shocks(self, external_factors: Dict[str, Any], risk_scenario: RiskScenario) -> Dict[str, Any]:
        """Apply stress shocks to external factors"""
        # Mock implementation
        return external_factors
    
    def _recalculate_with_stress(self, scenario, stressed_factors: Dict[str, Any]) -> Dict[str, Any]:
        """Recalculate scenario with stressed factors"""
        # Mock implementation
        return {'stressed_result': True}
    
    def _calculate_var(self, result: Dict[str, Any]) -> float:
        """Calculate Value at Risk"""
        return 95000  # Mock VaR at 95% confidence
    
    def _calculate_expected_shortfall(self, result: Dict[str, Any]) -> float:
        """Calculate Expected Shortfall"""
        return 125000  # Mock ES
    
    def _calculate_stress_impact(self, result: Dict[str, Any], external_factors: Dict[str, Any]) -> float:
        """Calculate stress test impact"""
        return 0.15  # Mock 15% impact
    
    def _calculate_correlation_risk(self, external_factors: Dict[str, Any]) -> float:
        """Calculate correlation risk"""
        return 0.65  # Mock correlation risk
    
    def _calculate_liquidity_risk(self, result: Dict[str, Any]) -> float:
        """Calculate liquidity risk"""
        return 0.25  # Mock liquidity risk
    
    def _calculate_concentration_risk(self, result: Dict[str, Any]) -> float:
        """Calculate concentration risk"""
        return 0.35  # Mock concentration risk
    
    def _generate_enhanced_recommendations(self, base_result: Dict[str, Any], 
                                         stressed_results: Dict[str, Any],
                                         risk_metrics: Dict[str, Any],
                                         external_factors: Dict[str, Any]) -> List[str]:
        """Generate enhanced recommendations"""
        recommendations = []
        
        # Risk-based recommendations
        if risk_metrics['value_at_risk'] > 100000:
            recommendations.append("Consider implementing risk management strategies")
        
        if risk_metrics['correlation_risk'] > 0.6:
            recommendations.append("Diversify exposures to reduce correlation risk")
        
        if risk_metrics['concentration_risk'] > 0.3:
            recommendations.append("Address concentration risk in portfolio")
        
        # Market-based recommendations
        if external_factors.get('economic_indicators', {}).get('inflation_rate', 0) > 0.04:
            recommendations.append("Monitor inflation impact on cash flows")
        
        return recommendations
    
    def _get_cash_flows_from_uploads(self, upload_ids: List[int], user_id: int) -> pd.DataFrame:
        """Get cash flows data from uploads"""
        try:
            from app.models.data_upload import DataUpload
            
            uploads = self.db.query(DataUpload).filter(
                DataUpload.id.in_(upload_ids),
                DataUpload.user_id == user_id
            ).all()
            
            if not uploads:
                raise ValueError("No uploads found")
            
            # Combine all upload data
            all_data = []
            for upload in uploads:
                if upload.raw_data:
                    all_data.extend(upload.raw_data)
            
            if not all_data:
                raise ValueError("No data found in uploads")
            
            # Convert to DataFrame
            df = pd.DataFrame(all_data)
            
            # Ensure required columns exist
            if 'amount' not in df.columns:
                df['amount'] = 0
            if 'date' not in df.columns:
                df['date'] = pd.Timestamp.now()
            
            return df
            
        except Exception as e:
            logger.error(f"Error getting cash flows from uploads: {str(e)}")
            # Return mock data for development
            return pd.DataFrame([
                {'date': '2024-01-01', 'amount': 100000, 'currency': 'USD', 'type': 'revenue'},
                {'date': '2024-02-01', 'amount': -50000, 'currency': 'EUR', 'type': 'expense'},
                {'date': '2024-03-01', 'amount': 75000, 'currency': 'GBP', 'type': 'revenue'},
            ])