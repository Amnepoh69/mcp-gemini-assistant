"""
Scenario analysis service for CFO/CTO Helper MVP
Handles scenario creation, execution, and analysis logic
"""

from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from enum import Enum

from app.models.scenario import Scenario
from app.models.data_upload import DataUpload
from app.models.analysis_result import AnalysisResult
from app.models.user import User


class ScenarioType(str, Enum):
    REVENUE_FORECAST = "revenue_forecast"
    COST_ANALYSIS = "cost_analysis"
    CASH_FLOW = "cash_flow"
    RISK_ASSESSMENT = "risk_assessment"
    MARKET_SCENARIO = "market_scenario"
    # New enhanced scenarios with external data
    CURRENCY_RISK = "currency_risk"
    INTEREST_RATE_RISK = "interest_rate_risk"
    COMMODITY_RISK = "commodity_risk"
    MARKET_CORRELATION = "market_correlation"
    STRESS_TEST = "stress_test"


class ScenarioService:
    def __init__(self, db: Session):
        self.db = db

    def create_scenario(
        self, 
        user_id: int, 
        name: str, 
        description: str,
        scenario_type: ScenarioType,
        parameters: Dict[str, Any],
        data_upload_ids: List[int],
        is_admin_created: bool = False
    ) -> Scenario:
        """Create a new scenario with validation"""
        
        # Validate data uploads belong to user
        uploads = self.db.query(DataUpload).filter(
            DataUpload.id.in_(data_upload_ids),
            DataUpload.user_id == user_id
        ).all()
        
        if len(uploads) != len(data_upload_ids):
            raise ValueError("Some data uploads not found or don't belong to user")
        
        # Validate scenario parameters
        self._validate_scenario_parameters(scenario_type, parameters)
        
        scenario = Scenario(
            user_id=user_id,
            name=name,
            description=description,
            scenario_type=scenario_type,
            parameters=parameters,
            data_upload_ids=data_upload_ids,
            status="created",
            is_admin_created=is_admin_created
        )
        
        self.db.add(scenario)
        self.db.commit()
        self.db.refresh(scenario)
        
        return scenario

    def execute_scenario(self, scenario_id: int) -> AnalysisResult:
        """Execute scenario analysis and return results"""
        
        scenario = self.db.query(Scenario).filter(Scenario.id == scenario_id).first()
        if not scenario:
            raise ValueError("Scenario not found")
        
        # Update scenario status
        scenario.status = "running"
        self.db.commit()
        
        try:
            # Load data for analysis
            data = self._load_scenario_data(scenario)
            
            # Execute analysis based on scenario type
            if scenario.scenario_type == ScenarioType.REVENUE_FORECAST:
                results = self._execute_revenue_forecast(data, scenario.parameters)
            elif scenario.scenario_type == ScenarioType.COST_ANALYSIS:
                results = self._execute_cost_analysis(data, scenario.parameters)
            elif scenario.scenario_type == ScenarioType.CASH_FLOW:
                results = self._execute_cash_flow_analysis(data, scenario.parameters)
            elif scenario.scenario_type == ScenarioType.RISK_ASSESSMENT:
                results = self._execute_risk_assessment(data, scenario.parameters)
            elif scenario.scenario_type == ScenarioType.MARKET_SCENARIO:
                results = self._execute_market_scenario(data, scenario.parameters)
            else:
                raise ValueError(f"Unknown scenario type: {scenario.scenario_type}")
            
            # Save analysis results
            analysis_result = AnalysisResult(
                scenario_id=scenario_id,
                results=results,
                charts_config=self._generate_charts_config(results, scenario.scenario_type),
                status="completed"
            )
            
            self.db.add(analysis_result)
            
            # Update scenario status
            scenario.status = "completed"
            scenario.last_run = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(analysis_result)
            
            return analysis_result
            
        except Exception as e:
            scenario.status = "failed"
            scenario.error_message = str(e)
            self.db.commit()
            raise

    def _load_scenario_data(self, scenario: Scenario) -> Dict[str, pd.DataFrame]:
        """Load and prepare data for scenario analysis"""
        
        data = {}
        
        for upload_id in scenario.data_upload_ids:
            upload = self.db.query(DataUpload).filter(DataUpload.id == upload_id).first()
            if upload and upload.processed_data:
                # Convert stored data back to DataFrame
                df = pd.DataFrame(upload.processed_data)
                data[upload.category] = df
        
        return data

    def _execute_revenue_forecast(self, data: Dict[str, pd.DataFrame], parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute revenue forecasting scenario"""
        
        if 'revenue' not in data:
            raise ValueError("Revenue data required for revenue forecast")
        
        revenue_df = data['revenue']
        
        # Parameters
        forecast_months = parameters.get('forecast_months', 12)
        growth_rate = parameters.get('growth_rate', 0.05)  # 5% default
        seasonality = parameters.get('seasonality', False)
        
        # Basic revenue forecasting logic
        if 'amount' in revenue_df.columns and 'date' in revenue_df.columns:
            # Convert date column
            revenue_df['date'] = pd.to_datetime(revenue_df['date'])
            
            # Calculate monthly revenue
            monthly_revenue = revenue_df.groupby(revenue_df['date'].dt.to_period('M'))['amount'].sum()
            
            # Generate forecast
            last_month = monthly_revenue.index[-1]
            forecast_periods = pd.period_range(start=last_month + 1, periods=forecast_months, freq='M')
            
            # Simple growth model
            base_revenue = monthly_revenue.iloc[-3:].mean()  # Average last 3 months
            forecast_values = []
            
            for i, period in enumerate(forecast_periods):
                if seasonality:
                    # Simple seasonality factor (peak in Dec, low in Feb)
                    seasonal_factor = 1 + 0.2 * np.sin(2 * np.pi * (period.month - 2) / 12)
                else:
                    seasonal_factor = 1
                
                forecast_value = base_revenue * (1 + growth_rate) ** (i + 1) * seasonal_factor
                forecast_values.append(forecast_value)
            
            forecast_df = pd.DataFrame({
                'period': [str(p) for p in forecast_periods],
                'forecasted_revenue': forecast_values
            })
            
            return {
                'forecast_type': 'revenue',
                'historical_data': monthly_revenue.to_dict(),
                'forecast_data': forecast_df.to_dict('records'),
                'total_forecasted': sum(forecast_values),
                'growth_rate': growth_rate,
                'forecast_months': forecast_months,
                'confidence_interval': {
                    'lower': [v * 0.8 for v in forecast_values],
                    'upper': [v * 1.2 for v in forecast_values]
                }
            }
        
        raise ValueError("Revenue data must contain 'amount' and 'date' columns")

    def _execute_cost_analysis(self, data: Dict[str, pd.DataFrame], parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute cost analysis scenario"""
        
        if 'expenses' not in data:
            raise ValueError("Expense data required for cost analysis")
        
        expenses_df = data['expenses']
        
        # Parameters
        analysis_period = parameters.get('analysis_period', 'monthly')
        cost_categories = parameters.get('cost_categories', [])
        
        if 'amount' in expenses_df.columns and 'category' in expenses_df.columns:
            # Cost breakdown by category
            cost_breakdown = expenses_df.groupby('category')['amount'].sum().to_dict()
            
            # Cost trends if date available
            cost_trends = {}
            if 'date' in expenses_df.columns:
                expenses_df['date'] = pd.to_datetime(expenses_df['date'])
                
                if analysis_period == 'monthly':
                    period_grouper = expenses_df['date'].dt.to_period('M')
                else:
                    period_grouper = expenses_df['date'].dt.to_period('Q')
                
                cost_trends = expenses_df.groupby([period_grouper, 'category'])['amount'].sum().unstack(fill_value=0).to_dict()
            
            # Cost efficiency metrics
            total_costs = expenses_df['amount'].sum()
            avg_cost_per_category = expenses_df.groupby('category')['amount'].mean().to_dict()
            
            return {
                'analysis_type': 'cost_analysis',
                'cost_breakdown': cost_breakdown,
                'cost_trends': cost_trends,
                'total_costs': total_costs,
                'avg_cost_per_category': avg_cost_per_category,
                'top_cost_categories': sorted(cost_breakdown.items(), key=lambda x: x[1], reverse=True)[:5],
                'analysis_period': analysis_period
            }
        
        raise ValueError("Expense data must contain 'amount' and 'category' columns")

    def _execute_cash_flow_analysis(self, data: Dict[str, pd.DataFrame], parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute cash flow analysis scenario"""
        
        # Combine revenue and expense data
        cash_flows = []
        
        if 'revenue' in data and 'amount' in data['revenue'].columns:
            revenue_df = data['revenue'].copy()
            revenue_df['type'] = 'inflow'
            cash_flows.append(revenue_df[['date', 'amount', 'type']])
        
        if 'expenses' in data and 'amount' in data['expenses'].columns:
            expenses_df = data['expenses'].copy()
            expenses_df['type'] = 'outflow'
            expenses_df['amount'] = -expenses_df['amount']  # Make negative
            cash_flows.append(expenses_df[['date', 'amount', 'type']])
        
        if not cash_flows:
            raise ValueError("Either revenue or expense data required for cash flow analysis")
        
        # Combine all cash flows
        combined_df = pd.concat(cash_flows, ignore_index=True)
        combined_df['date'] = pd.to_datetime(combined_df['date'])
        
        # Calculate monthly cash flow
        monthly_cash_flow = combined_df.groupby(combined_df['date'].dt.to_period('M'))['amount'].sum()
        
        # Calculate cumulative cash flow
        cumulative_cash_flow = monthly_cash_flow.cumsum()
        
        # Cash flow projections
        projection_months = parameters.get('projection_months', 6)
        avg_monthly_flow = monthly_cash_flow.iloc[-3:].mean()
        
        projections = []
        last_cumulative = cumulative_cash_flow.iloc[-1]
        
        for i in range(1, projection_months + 1):
            projected_cumulative = last_cumulative + (avg_monthly_flow * i)
            projections.append({
                'month': str(monthly_cash_flow.index[-1] + i),
                'projected_flow': avg_monthly_flow,
                'projected_cumulative': projected_cumulative
            })
        
        return {
            'analysis_type': 'cash_flow',
            'monthly_cash_flow': monthly_cash_flow.to_dict(),
            'cumulative_cash_flow': cumulative_cash_flow.to_dict(),
            'projections': projections,
            'current_cash_position': cumulative_cash_flow.iloc[-1],
            'avg_monthly_flow': avg_monthly_flow,
            'cash_burn_rate': -avg_monthly_flow if avg_monthly_flow < 0 else 0,
            'runway_months': max(0, -cumulative_cash_flow.iloc[-1] / avg_monthly_flow) if avg_monthly_flow < 0 else float('inf')
        }

    def _execute_risk_assessment(self, data: Dict[str, pd.DataFrame], parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute risk assessment scenario"""
        
        risk_factors = []
        
        # Revenue concentration risk
        if 'revenue' in data and 'customer' in data['revenue'].columns:
            customer_revenue = data['revenue'].groupby('customer')['amount'].sum()
            top_customer_share = customer_revenue.max() / customer_revenue.sum()
            
            risk_factors.append({
                'type': 'revenue_concentration',
                'score': min(top_customer_share * 10, 10),  # Scale 0-10
                'description': f"Top customer represents {top_customer_share:.1%} of revenue",
                'impact': 'high' if top_customer_share > 0.3 else 'medium' if top_customer_share > 0.15 else 'low'
            })
        
        # Cash flow volatility
        if 'revenue' in data and 'expenses' in data:
            # Calculate cash flow volatility
            revenue_df = data['revenue']
            expenses_df = data['expenses']
            
            if 'date' in revenue_df.columns and 'date' in expenses_df.columns:
                monthly_revenue = revenue_df.groupby(pd.to_datetime(revenue_df['date']).dt.to_period('M'))['amount'].sum()
                monthly_expenses = expenses_df.groupby(pd.to_datetime(expenses_df['date']).dt.to_period('M'))['amount'].sum()
                
                monthly_cash_flow = monthly_revenue - monthly_expenses
                volatility = monthly_cash_flow.std() / monthly_cash_flow.mean() if monthly_cash_flow.mean() != 0 else 0
                
                risk_factors.append({
                    'type': 'cash_flow_volatility',
                    'score': min(volatility * 5, 10),
                    'description': f"Cash flow volatility: {volatility:.2f}",
                    'impact': 'high' if volatility > 0.5 else 'medium' if volatility > 0.2 else 'low'
                })
        
        # Overall risk score
        overall_risk = sum(factor['score'] for factor in risk_factors) / len(risk_factors) if risk_factors else 0
        
        return {
            'analysis_type': 'risk_assessment',
            'risk_factors': risk_factors,
            'overall_risk_score': overall_risk,
            'risk_level': 'high' if overall_risk > 7 else 'medium' if overall_risk > 4 else 'low',
            'recommendations': self._generate_risk_recommendations(risk_factors)
        }

    def _execute_market_scenario(self, data: Dict[str, pd.DataFrame], parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute market scenario analysis"""
        
        # Market parameters
        market_growth = parameters.get('market_growth', 0.05)
        market_volatility = parameters.get('market_volatility', 0.1)
        scenarios = parameters.get('scenarios', ['optimistic', 'realistic', 'pessimistic'])
        
        # Base case from historical data
        base_revenue = 0
        if 'revenue' in data and 'amount' in data['revenue'].columns:
            base_revenue = data['revenue']['amount'].sum()
        
        scenario_results = {}
        
        for scenario_name in scenarios:
            if scenario_name == 'optimistic':
                growth_factor = 1 + market_growth * 1.5
                volatility_factor = market_volatility * 0.5
            elif scenario_name == 'pessimistic':
                growth_factor = 1 + market_growth * 0.3
                volatility_factor = market_volatility * 1.5
            else:  # realistic
                growth_factor = 1 + market_growth
                volatility_factor = market_volatility
            
            # Generate scenario projection
            monthly_projections = []
            current_value = base_revenue / 12  # Monthly base
            
            for month in range(12):
                # Add growth and volatility
                growth_impact = current_value * (growth_factor - 1) * (month + 1) / 12
                volatility_impact = current_value * volatility_factor * np.random.normal(0, 0.1)
                
                projected_value = current_value + growth_impact + volatility_impact
                monthly_projections.append({
                    'month': month + 1,
                    'value': max(0, projected_value)  # Ensure non-negative
                })
            
            scenario_results[scenario_name] = {
                'projections': monthly_projections,
                'total_projected': sum(p['value'] for p in monthly_projections),
                'growth_factor': growth_factor,
                'volatility_factor': volatility_factor
            }
        
        return {
            'analysis_type': 'market_scenario',
            'base_revenue': base_revenue,
            'scenarios': scenario_results,
            'market_parameters': {
                'growth': market_growth,
                'volatility': market_volatility
            }
        }

    def _generate_risk_recommendations(self, risk_factors: List[Dict[str, Any]]) -> List[str]:
        """Generate risk mitigation recommendations"""
        
        recommendations = []
        
        for factor in risk_factors:
            if factor['type'] == 'revenue_concentration' and factor['impact'] == 'high':
                recommendations.append("Diversify customer base to reduce revenue concentration risk")
            elif factor['type'] == 'cash_flow_volatility' and factor['impact'] == 'high':
                recommendations.append("Implement cash flow smoothing mechanisms or maintain larger cash reserves")
        
        if not recommendations:
            recommendations.append("Continue monitoring key risk indicators")
        
        return recommendations

    def _generate_charts_config(self, results: Dict[str, Any], scenario_type: ScenarioType) -> Dict[str, Any]:
        """Generate chart configuration for visualization"""
        
        charts = []
        
        if scenario_type == ScenarioType.REVENUE_FORECAST:
            charts.append({
                'type': 'line',
                'title': 'Revenue Forecast',
                'data_key': 'forecast_data',
                'x_axis': 'period',
                'y_axis': 'forecasted_revenue'
            })
            
            charts.append({
                'type': 'bar',
                'title': 'Monthly Historical Revenue',
                'data_key': 'historical_data',
                'x_axis': 'period',
                'y_axis': 'amount'
            })
        
        elif scenario_type == ScenarioType.COST_ANALYSIS:
            charts.append({
                'type': 'pie',
                'title': 'Cost Breakdown by Category',
                'data_key': 'cost_breakdown'
            })
            
            charts.append({
                'type': 'bar',
                'title': 'Top Cost Categories',
                'data_key': 'top_cost_categories',
                'x_axis': 'category',
                'y_axis': 'amount'
            })
        
        elif scenario_type == ScenarioType.CASH_FLOW:
            charts.append({
                'type': 'line',
                'title': 'Monthly Cash Flow',
                'data_key': 'monthly_cash_flow',
                'x_axis': 'period',
                'y_axis': 'amount'
            })
            
            charts.append({
                'type': 'line',
                'title': 'Cumulative Cash Flow',
                'data_key': 'cumulative_cash_flow',
                'x_axis': 'period',
                'y_axis': 'amount'
            })
        
        elif scenario_type == ScenarioType.RISK_ASSESSMENT:
            charts.append({
                'type': 'radar',
                'title': 'Risk Assessment',
                'data_key': 'risk_factors',
                'metrics': ['score']
            })
        
        elif scenario_type == ScenarioType.MARKET_SCENARIO:
            charts.append({
                'type': 'multi_line',
                'title': 'Market Scenario Projections',
                'data_key': 'scenarios',
                'x_axis': 'month',
                'y_axis': 'value'
            })
        
        return {
            'charts': charts,
            'layout': 'grid',
            'responsive': True
        }

    def _validate_scenario_parameters(self, scenario_type: ScenarioType, parameters: Dict[str, Any]):
        """Validate scenario parameters based on type"""
        
        if scenario_type == ScenarioType.REVENUE_FORECAST:
            required_keys = ['forecast_months', 'growth_rate']
            for key in required_keys:
                if key not in parameters:
                    raise ValueError(f"Missing required parameter: {key}")
        
        elif scenario_type == ScenarioType.COST_ANALYSIS:
            if 'analysis_period' in parameters:
                valid_periods = ['monthly', 'quarterly', 'yearly']
                if parameters['analysis_period'] not in valid_periods:
                    raise ValueError(f"Invalid analysis_period. Must be one of: {valid_periods}")
        
        # Add more validation as needed
        
    def get_user_scenarios(self, user_id: int) -> List[Scenario]:
        """Get all scenarios accessible to a user (own scenarios + admin scenarios)"""
        return self.db.query(Scenario).filter(
            (Scenario.user_id == user_id) | (Scenario.is_admin_created == True)
        ).all()
    
    def get_scenario_results(self, scenario_id: int) -> Optional[AnalysisResult]:
        """Get results for a specific scenario"""
        return self.db.query(AnalysisResult).filter(AnalysisResult.scenario_id == scenario_id).first()