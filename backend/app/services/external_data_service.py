"""
External data service for market data integration
Handles fetching data from various external APIs for scenario analysis
"""

import requests
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class DataProvider(str, Enum):
    """Supported external data providers"""
    YAHOO_FINANCE = "yahoo_finance"
    EXCHANGE_RATES_API = "exchange_rates_api"
    ALPHA_VANTAGE = "alpha_vantage"
    QUANDL = "quandl"
    FRED = "fred"  # Federal Reserve Economic Data


@dataclass
class MarketData:
    """Market data point"""
    symbol: str
    value: float
    timestamp: datetime
    source: str
    metadata: Dict[str, Any] = None


@dataclass
class CurrencyRate:
    """Currency exchange rate"""
    base_currency: str
    target_currency: str
    rate: float
    timestamp: datetime


@dataclass
class CommodityPrice:
    """Commodity price data"""
    commodity: str
    price: float
    currency: str
    timestamp: datetime


class ExternalDataService:
    """Service for fetching external market data"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'CFO-CTO-Helper-MVP/1.0'
        })
        
        # API endpoints
        self.endpoints = {
            'exchange_rates': 'https://api.exchangerate-api.com/v4/latest',
            'yahoo_finance': 'https://query1.finance.yahoo.com/v8/finance/chart',
            'alpha_vantage': 'https://www.alphavantage.co/query',
            'commodities': 'https://api.metals.live/v1/spot',
        }
    
    def get_currency_rates(self) -> List[CurrencyRate]:
        """
        Get current currency exchange rates for major currencies to RUB from Moscow Exchange
        
        Returns:
            List of CurrencyRate objects with rates as amount of RUB per unit of currency
        """
        logger.info("get_currency_rates() called")
        try:
            # Try to get real data from Moscow Exchange
            rates = self._get_moex_currency_rates()
            logger.info(f"Successfully fetched {len(rates)} currency rates from MOEX")
            return rates
            
        except Exception as e:
            logger.error(f"Error fetching currency rates from MOEX: {str(e)}")
            # Fallback to mock data
            logger.info("Using mock currency rates as fallback")
            return self._get_mock_currency_rates()
    
    def get_interest_rates(self, country: str = 'US') -> Dict[str, float]:
        """
        Get interest rates for a country
        
        Args:
            country: Country code (e.g., 'US', 'EU', 'UK')
            
        Returns:
            Dictionary with interest rate types and values
        """
        try:
            # This would typically use Federal Reserve API or similar
            # For now, return mock data
            return self._get_mock_interest_rates(country)
            
        except Exception as e:
            logger.error(f"Error fetching interest rates: {str(e)}")
            return self._get_mock_interest_rates(country)
    
    def get_commodity_prices(self, commodities: List[str] = None) -> List[CommodityPrice]:
        """
        Get commodity prices
        
        Args:
            commodities: List of commodity symbols (e.g., ['GOLD', 'SILVER', 'OIL'])
            
        Returns:
            List of CommodityPrice objects
        """
        if commodities is None:
            commodities = ['GOLD', 'SILVER', 'COPPER', 'OIL', 'WHEAT']
        
        try:
            # This would typically use a commodities API
            # For now, return mock data
            return self._get_mock_commodity_prices(commodities)
            
        except Exception as e:
            logger.error(f"Error fetching commodity prices: {str(e)}")
            return self._get_mock_commodity_prices(commodities)
    
    def get_market_indices(self, indices: List[str] = None) -> List[MarketData]:
        """
        Get market index data
        
        Args:
            indices: List of index symbols (e.g., ['^GSPC', '^DJI', '^IXIC'])
            
        Returns:
            List of MarketData objects
        """
        if indices is None:
            indices = ['^GSPC', '^DJI', '^IXIC', '^FTSE', '^GDAXI']
        
        try:
            market_data = []
            timestamp = datetime.now()
            
            for index in indices:
                try:
                    # This would typically use Yahoo Finance API
                    # For now, return mock data
                    data = self._get_mock_market_data(index)
                    market_data.append(MarketData(
                        symbol=index,
                        value=data['price'],
                        timestamp=timestamp,
                        source='yahoo_finance',
                        metadata=data
                    ))
                except Exception as e:
                    logger.warning(f"Error fetching data for {index}: {str(e)}")
                    continue
            
            logger.info(f"Retrieved {len(market_data)} market indices")
            return market_data
            
        except Exception as e:
            logger.error(f"Error fetching market indices: {str(e)}")
            return []
    
    def get_volatility_data(self, symbol: str, period: str = '1y') -> Dict[str, float]:
        """
        Get volatility data for a financial instrument
        
        Args:
            symbol: Financial instrument symbol
            period: Time period for volatility calculation
            
        Returns:
            Dictionary with volatility metrics
        """
        try:
            # This would calculate actual volatility from historical data
            # For now, return mock data
            return self._get_mock_volatility_data(symbol, period)
            
        except Exception as e:
            logger.error(f"Error fetching volatility data: {str(e)}")
            return self._get_mock_volatility_data(symbol, period)
    
    def get_economic_indicators(self, country: str = 'US') -> Dict[str, Any]:
        """
        Get economic indicators for scenario analysis
        
        Args:
            country: Country code
            
        Returns:
            Dictionary with economic indicators
        """
        try:
            # This would typically use FRED API or similar
            # For now, return mock data
            return self._get_mock_economic_indicators(country)
            
        except Exception as e:
            logger.error(f"Error fetching economic indicators: {str(e)}")
            return self._get_mock_economic_indicators(country)
    
    # Mock data methods for development
    def _get_mock_currency_rates(self) -> List[CurrencyRate]:
        """Mock currency rates for development"""
        # Создаем курсы для основных валют к рублю (количество рублей за единицу валюты)
        currency_pairs = [
            ('USD', 'RUB', 98.5),   # USD/RUB - доллары к рублю
            ('EUR', 'RUB', 105.2),  # EUR/RUB - евро к рублю  
            ('CNY', 'RUB', 13.6),   # CNY/RUB - юани к рублю
            ('INR', 'RUB', 1.18)    # INR/RUB - рупии к рублю
        ]
        
        rates = []
        timestamp = datetime.now()
        
        for base_curr, target_curr, rate_value in currency_pairs:
            rates.append(CurrencyRate(
                base_currency=base_curr,
                target_currency=target_curr,
                rate=rate_value,
                timestamp=timestamp
            ))
        
        return rates
    
    def _get_moex_currency_rates(self) -> List[CurrencyRate]:
        """Get real currency rates from Moscow Exchange"""
        # Валютные инструменты на MOEX
        moex_instruments = {
            'USD000UTSTOM': 'USD',  # USD/RUB
            'EUR_RUB__TOM': 'EUR',  # EUR/RUB
            'CNYRUB_TOM': 'CNY',    # CNY/RUB
            # INR/RUB не торгуется на MOEX, используем mock
        }
        
        rates = []
        timestamp = datetime.now()
        
        for instrument, currency in moex_instruments.items():
            try:
                # Получаем данные по инструменту
                url = f"https://iss.moex.com/iss/engines/currency/markets/selt/securities/{instrument}.json"
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
                
                data = response.json()
                
                # Извлекаем курс из данных
                rate_value = self._extract_rate_from_moex_data(data, currency)
                if rate_value:
                    rates.append(CurrencyRate(
                        base_currency=currency,
                        target_currency='RUB',
                        rate=rate_value,
                        timestamp=timestamp
                    ))
                    logger.info(f"MOEX: {currency}/RUB = {rate_value}")
                    
            except Exception as e:
                logger.warning(f"Error fetching {instrument}: {str(e)}")
                continue
        
        # Добавляем INR/RUB из mock данных (не торгуется на MOEX)
        rates.append(CurrencyRate(
            base_currency='INR',
            target_currency='RUB',
            rate=1.18,  # Mock значение
            timestamp=timestamp
        ))
        
        logger.info(f"Retrieved {len(rates)} currency rates from MOEX")
        return rates
    
    def _extract_rate_from_moex_data(self, data: dict, currency: str) -> Optional[float]:
        """Extract exchange rate from MOEX API response"""
        try:
            # Проверяем структуру данных
            if 'marketdata' not in data or 'data' not in data['marketdata']:
                return None
                
            marketdata_data = data['marketdata']['data']
            marketdata_columns = data['marketdata']['columns']
            
            # Создаем индекс колонок для удобства
            col_index = {col: i for i, col in enumerate(marketdata_columns)}
            
            # Ищем курс с площадки CETS (основная площадка)
            for row in marketdata_data:
                if len(row) > col_index.get('BOARDID', 0):
                    board_id = row[col_index['BOARDID']]
                    
                    # Приоритет: CETS площадка
                    if board_id == 'CETS':
                        # Проверяем MARKETPRICE (рыночная цена)
                        if 'MARKETPRICE' in col_index:
                            market_price = row[col_index['MARKETPRICE']]
                            if market_price and isinstance(market_price, (int, float)) and market_price > 0:
                                return float(market_price)
                        
                        # Если нет MARKETPRICE, проверяем LAST (последняя цена)
                        if 'LAST' in col_index:
                            last_price = row[col_index['LAST']]
                            if last_price and isinstance(last_price, (int, float)) and last_price > 0:
                                return float(last_price)
                        
                        # Если нет LAST, проверяем WAPRICE (взвешенная средняя цена)
                        if 'WAPRICE' in col_index:
                            waprice = row[col_index['WAPRICE']]
                            if waprice and isinstance(waprice, (int, float)) and waprice > 0:
                                return float(waprice)
            
            # Если не нашли CETS, ищем любую другую площадку
            for row in marketdata_data:
                if len(row) > col_index.get('BOARDID', 0):
                    for price_col in ['MARKETPRICE', 'LAST', 'WAPRICE']:
                        if price_col in col_index:
                            price_value = row[col_index[price_col]]
                            if price_value and isinstance(price_value, (int, float)) and price_value > 0:
                                return float(price_value)
                                
            return None
            
        except Exception as e:
            logger.error(f"Error extracting rate for {currency}: {str(e)}")
            return None
    
    def _get_mock_interest_rates(self, country: str) -> Dict[str, float]:
        """Mock interest rates for development"""
        mock_rates = {
            'US': {
                'federal_funds_rate': 5.25,
                'treasury_1y': 4.85,
                'treasury_10y': 4.35,
                'prime_rate': 8.25
            },
            'EU': {
                'main_refinancing_rate': 4.50,
                'deposit_rate': 4.00,
                'marginal_lending_rate': 4.75
            },
            'UK': {
                'bank_rate': 5.00,
                'gilt_10y': 4.20
            }
        }
        
        return mock_rates.get(country, mock_rates['US'])
    
    def _get_mock_commodity_prices(self, commodities: List[str]) -> List[CommodityPrice]:
        """Mock commodity prices for development"""
        mock_prices = {
            'GOLD': 2025.50,
            'SILVER': 24.75,
            'COPPER': 3.85,
            'OIL': 82.30,
            'WHEAT': 6.45
        }
        
        prices = []
        timestamp = datetime.now()
        
        for commodity in commodities:
            if commodity in mock_prices:
                prices.append(CommodityPrice(
                    commodity=commodity,
                    price=mock_prices[commodity],
                    currency='USD',
                    timestamp=timestamp
                ))
        
        return prices
    
    def _get_mock_market_data(self, index: str) -> Dict[str, Any]:
        """Mock market data for development"""
        mock_data = {
            '^GSPC': {'price': 4567.89, 'change': 1.23, 'change_percent': 0.027},
            '^DJI': {'price': 35234.56, 'change': -45.67, 'change_percent': -0.013},
            '^IXIC': {'price': 14567.23, 'change': 89.45, 'change_percent': 0.062},
            '^FTSE': {'price': 7456.78, 'change': 23.45, 'change_percent': 0.032},
            '^GDAXI': {'price': 15678.90, 'change': -12.34, 'change_percent': -0.008}
        }
        
        return mock_data.get(index, {'price': 1000.0, 'change': 0.0, 'change_percent': 0.0})
    
    def _get_mock_volatility_data(self, symbol: str, period: str) -> Dict[str, float]:
        """Mock volatility data for development"""
        return {
            'historical_volatility': 0.18,
            'implied_volatility': 0.22,
            'volatility_percentile': 0.65,
            'beta': 1.15
        }
    
    def _get_mock_economic_indicators(self, country: str) -> Dict[str, Any]:
        """Mock economic indicators for development"""
        return {
            'gdp_growth': 2.1,
            'inflation_rate': 3.2,
            'unemployment_rate': 3.8,
            'consumer_confidence': 102.5,
            'manufacturing_pmi': 48.7,
            'services_pmi': 54.3
        }


# Singleton instance
external_data_service = ExternalDataService()