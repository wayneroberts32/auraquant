"""
Equity and ETF Screener Module
Integrates free data sources for stock and ETF screening
"""

import asyncio
import aiohttp
import yfinance as yf
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from dataclasses import dataclass
import json
import logging

logger = logging.getLogger(__name__)

@dataclass
class StockScreenerResult:
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    volume: int
    avg_volume: int
    market_cap: float
    pe_ratio: Optional[float]
    eps: Optional[float]
    dividend_yield: Optional[float]
    rsi: Optional[float]
    macd: Optional[Dict]
    moving_averages: Dict[str, float]
    support_resistance: Dict[str, float]
    score: float
    signals: List[str]

class EquityScreener:
    """Free equity and ETF screener using Yahoo Finance and other free sources"""
    
    def __init__(self):
        self.session = None
        self.cache = {}
        self.cache_ttl = 300  # 5 minutes
        
        # Popular screening criteria
        self.screen_configs = {
            'momentum': {
                'min_price': 5,
                'min_volume': 1000000,
                'min_change_percent': 2,
                'rsi_min': 50,
                'rsi_max': 70
            },
            'value': {
                'max_pe': 15,
                'min_dividend_yield': 2,
                'min_market_cap': 1000000000
            },
            'growth': {
                'min_revenue_growth': 0.15,
                'min_earnings_growth': 0.20,
                'min_price': 10
            },
            'breakout': {
                'volume_multiplier': 2,
                'price_near_high': 0.98,
                'min_price': 1,
                'min_volume': 500000
            },
            'oversold': {
                'rsi_max': 30,
                'min_price': 5,
                'min_volume': 1000000
            },
            'dividend': {
                'min_dividend_yield': 3,
                'min_market_cap': 5000000000,
                'max_pe': 25
            },
            'penny_stocks': {
                'max_price': 5,
                'min_price': 0.01,
                'min_volume': 1000000,
                'min_change_percent': 5
            },
            'blue_chip': {
                'min_market_cap': 50000000000,
                'max_pe': 30,
                'min_dividend_yield': 1
            },
            'etf_trending': {
                'min_volume': 5000000,
                'min_change_percent': 1,
                'asset_type': 'ETF'
            },
            'small_cap_growth': {
                'min_market_cap': 300000000,
                'max_market_cap': 2000000000,
                'min_change_percent': 3
            }
        }
        
        # Major indices and ETFs to track
        self.major_symbols = {
            'indices': ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO'],
            'sectors': ['XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLY', 'XLP', 'XLB', 'XLRE', 'XLU'],
            'international': ['EFA', 'EEM', 'VEA', 'VWO', 'IEMG', 'IEFA'],
            'bonds': ['AGG', 'BND', 'TLT', 'IEF', 'SHY', 'HYG', 'LQD'],
            'commodities': ['GLD', 'SLV', 'USO', 'UNG', 'DBA', 'GDX'],
            'volatility': ['VXX', 'UVXY', 'SVXY', 'VIXY']
        }
        
    async def initialize(self):
        """Initialize the screener session"""
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def screen_stocks(self, 
                          criteria: str = 'momentum',
                          limit: int = 50,
                          market: str = 'US') -> List[StockScreenerResult]:
        """
        Screen stocks based on criteria
        
        Args:
            criteria: Screening criteria name
            limit: Maximum number of results
            market: Market to screen (US, AU, etc.)
        
        Returns:
            List of screened stocks
        """
        await self.initialize()
        
        # Get screen configuration
        config = self.screen_configs.get(criteria, self.screen_configs['momentum'])
        
        # Get stock list based on market
        if market == 'US':
            symbols = await self._get_us_stocks()
        elif market == 'AU':
            symbols = await self._get_au_stocks()
        else:
            symbols = await self._get_us_stocks()
        
        # Screen stocks
        results = []
        batch_size = 50
        
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i+batch_size]
            batch_results = await self._screen_batch(batch, config)
            results.extend(batch_results)
        
        # Sort by score
        results.sort(key=lambda x: x.score, reverse=True)
        
        return results[:limit]
    
    async def _get_us_stocks(self) -> List[str]:
        """Get list of US stocks to screen"""
        # In production, this would fetch from a more comprehensive source
        # For now, use S&P 500 components
        try:
            # Get S&P 500 list
            sp500_url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
            tables = pd.read_html(sp500_url)
            sp500_symbols = tables[0]['Symbol'].tolist()
            
            # Add NASDAQ 100
            nasdaq_url = "https://en.wikipedia.org/wiki/Nasdaq-100"
            tables = pd.read_html(nasdaq_url)
            nasdaq_symbols = tables[4]['Ticker'].tolist()
            
            # Combine and deduplicate
            all_symbols = list(set(sp500_symbols + nasdaq_symbols))
            
            return all_symbols[:500]  # Limit for performance
            
        except Exception as e:
            logger.error(f"Error fetching stock list: {e}")
            # Return default list
            return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 
                   'JPM', 'V', 'JNJ', 'WMT', 'PG', 'UNH', 'DIS', 'MA']
    
    async def _get_au_stocks(self) -> List[str]:
        """Get list of Australian stocks"""
        # ASX 200 components
        asx_symbols = [
            'CBA.AX', 'BHP.AX', 'CSL.AX', 'NAB.AX', 'WBC.AX', 'ANZ.AX',
            'WES.AX', 'MQG.AX', 'GMG.AX', 'TCL.AX', 'WOW.AX', 'TLS.AX',
            'RIO.AX', 'COL.AX', 'FMG.AX', 'REA.AX', 'ALL.AX', 'SUN.AX',
            'IAG.AX', 'QBE.AX', 'NCM.AX', 'AMC.AX', 'APT.AX', 'XRO.AX'
        ]
        return asx_symbols
    
    async def _screen_batch(self, symbols: List[str], config: Dict) -> List[StockScreenerResult]:
        """Screen a batch of symbols"""
        results = []
        
        for symbol in symbols:
            try:
                # Get stock data
                data = await self._get_stock_data(symbol)
                if not data:
                    continue
                
                # Apply screening criteria
                if self._meets_criteria(data, config):
                    # Calculate technical indicators
                    indicators = await self._calculate_indicators(symbol, data)
                    
                    # Generate signals
                    signals = self._generate_signals(data, indicators)
                    
                    # Calculate score
                    score = self._calculate_score(data, indicators, signals, config)
                    
                    result = StockScreenerResult(
                        symbol=symbol,
                        name=data.get('name', symbol),
                        price=data['price'],
                        change=data['change'],
                        change_percent=data['change_percent'],
                        volume=data['volume'],
                        avg_volume=data['avg_volume'],
                        market_cap=data.get('market_cap', 0),
                        pe_ratio=data.get('pe_ratio'),
                        eps=data.get('eps'),
                        dividend_yield=data.get('dividend_yield'),
                        rsi=indicators.get('rsi'),
                        macd=indicators.get('macd'),
                        moving_averages=indicators.get('moving_averages', {}),
                        support_resistance=indicators.get('support_resistance', {}),
                        score=score,
                        signals=signals
                    )
                    results.append(result)
                    
            except Exception as e:
                logger.error(f"Error screening {symbol}: {e}")
                continue
        
        return results
    
    async def _get_stock_data(self, symbol: str) -> Optional[Dict]:
        """Get stock data from Yahoo Finance"""
        try:
            # Check cache
            cache_key = f"stock_{symbol}"
            if cache_key in self.cache:
                cached_data, cached_time = self.cache[cache_key]
                if datetime.now() - cached_time < timedelta(seconds=self.cache_ttl):
                    return cached_data
            
            # Fetch from Yahoo Finance
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Get current price data
            history = ticker.history(period="5d")
            if history.empty:
                return None
            
            current_price = history['Close'].iloc[-1]
            prev_close = history['Close'].iloc[-2] if len(history) > 1 else current_price
            
            data = {
                'symbol': symbol,
                'name': info.get('longName', symbol),
                'price': current_price,
                'change': current_price - prev_close,
                'change_percent': ((current_price - prev_close) / prev_close) * 100,
                'volume': history['Volume'].iloc[-1],
                'avg_volume': history['Volume'].mean(),
                'market_cap': info.get('marketCap', 0),
                'pe_ratio': info.get('trailingPE'),
                'eps': info.get('trailingEps'),
                'dividend_yield': info.get('dividendYield'),
                'beta': info.get('beta'),
                '52_week_high': info.get('fiftyTwoWeekHigh'),
                '52_week_low': info.get('fiftyTwoWeekLow'),
                'history': history
            }
            
            # Cache the data
            self.cache[cache_key] = (data, datetime.now())
            
            return data
            
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            return None
    
    def _meets_criteria(self, data: Dict, config: Dict) -> bool:
        """Check if stock meets screening criteria"""
        try:
            # Price criteria
            if 'min_price' in config and data['price'] < config['min_price']:
                return False
            if 'max_price' in config and data['price'] > config['max_price']:
                return False
            
            # Volume criteria
            if 'min_volume' in config and data['volume'] < config['min_volume']:
                return False
            
            # Change percent criteria
            if 'min_change_percent' in config and data['change_percent'] < config['min_change_percent']:
                return False
            
            # Market cap criteria
            if 'min_market_cap' in config and data.get('market_cap', 0) < config['min_market_cap']:
                return False
            if 'max_market_cap' in config and data.get('market_cap', float('inf')) > config['max_market_cap']:
                return False
            
            # PE ratio criteria
            if 'max_pe' in config and data.get('pe_ratio'):
                if data['pe_ratio'] > config['max_pe']:
                    return False
            
            # Dividend yield criteria
            if 'min_dividend_yield' in config and data.get('dividend_yield'):
                if data['dividend_yield'] < config['min_dividend_yield'] / 100:
                    return False
            
            # Volume multiplier (for breakout detection)
            if 'volume_multiplier' in config:
                if data['volume'] < data['avg_volume'] * config['volume_multiplier']:
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking criteria: {e}")
            return False
    
    async def _calculate_indicators(self, symbol: str, data: Dict) -> Dict:
        """Calculate technical indicators"""
        try:
            history = data.get('history')
            if history is None or history.empty:
                return {}
            
            close_prices = history['Close'].values
            high_prices = history['High'].values
            low_prices = history['Low'].values
            volumes = history['Volume'].values
            
            indicators = {}
            
            # Moving averages
            indicators['moving_averages'] = {
                'sma_20': np.mean(close_prices[-20:]) if len(close_prices) >= 20 else None,
                'sma_50': np.mean(close_prices[-50:]) if len(close_prices) >= 50 else None,
                'sma_200': np.mean(close_prices[-200:]) if len(close_prices) >= 200 else None,
                'ema_12': self._calculate_ema(close_prices, 12),
                'ema_26': self._calculate_ema(close_prices, 26)
            }
            
            # RSI
            indicators['rsi'] = self._calculate_rsi(close_prices)
            
            # MACD
            if indicators['moving_averages']['ema_12'] and indicators['moving_averages']['ema_26']:
                macd_line = indicators['moving_averages']['ema_12'] - indicators['moving_averages']['ema_26']
                signal_line = self._calculate_ema([macd_line], 9)
                indicators['macd'] = {
                    'macd': macd_line,
                    'signal': signal_line,
                    'histogram': macd_line - signal_line if signal_line else None
                }
            
            # Support and Resistance
            indicators['support_resistance'] = {
                'support': np.min(low_prices[-20:]) if len(low_prices) >= 20 else None,
                'resistance': np.max(high_prices[-20:]) if len(high_prices) >= 20 else None,
                'pivot': (high_prices[-1] + low_prices[-1] + close_prices[-1]) / 3
            }
            
            # Volume indicators
            indicators['volume'] = {
                'volume_ratio': volumes[-1] / np.mean(volumes[-20:]) if len(volumes) >= 20 else 1,
                'volume_trend': 'increasing' if volumes[-1] > np.mean(volumes[-5:]) else 'decreasing'
            }
            
            return indicators
            
        except Exception as e:
            logger.error(f"Error calculating indicators for {symbol}: {e}")
            return {}
    
    def _calculate_ema(self, prices: np.ndarray, period: int) -> Optional[float]:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return None
        
        multiplier = 2 / (period + 1)
        ema = prices[0]
        
        for price in prices[1:]:
            ema = (price * multiplier) + (ema * (1 - multiplier))
        
        return ema
    
    def _calculate_rsi(self, prices: np.ndarray, period: int = 14) -> Optional[float]:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return None
        
        deltas = np.diff(prices)
        gains = deltas[deltas > 0]
        losses = -deltas[deltas < 0]
        
        if len(gains) == 0:
            return 0
        if len(losses) == 0:
            return 100
        
        avg_gain = np.mean(gains[-period:]) if len(gains) >= period else np.mean(gains)
        avg_loss = np.mean(losses[-period:]) if len(losses) >= period else np.mean(losses)
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def _generate_signals(self, data: Dict, indicators: Dict) -> List[str]:
        """Generate trading signals based on data and indicators"""
        signals = []
        
        # Price action signals
        if data['change_percent'] > 5:
            signals.append('strong_bullish_momentum')
        elif data['change_percent'] > 2:
            signals.append('bullish_momentum')
        elif data['change_percent'] < -5:
            signals.append('strong_bearish_momentum')
        elif data['change_percent'] < -2:
            signals.append('bearish_momentum')
        
        # Volume signals
        if indicators.get('volume', {}).get('volume_ratio', 1) > 2:
            signals.append('high_volume_breakout')
        elif indicators.get('volume', {}).get('volume_ratio', 1) > 1.5:
            signals.append('above_average_volume')
        
        # RSI signals
        rsi = indicators.get('rsi')
        if rsi:
            if rsi > 70:
                signals.append('overbought')
            elif rsi < 30:
                signals.append('oversold')
            elif 50 < rsi < 70:
                signals.append('bullish_rsi')
            elif 30 < rsi < 50:
                signals.append('bearish_rsi')
        
        # MACD signals
        macd = indicators.get('macd', {})
        if macd.get('histogram'):
            if macd['histogram'] > 0:
                signals.append('macd_bullish')
            else:
                signals.append('macd_bearish')
        
        # Moving average signals
        ma = indicators.get('moving_averages', {})
        if ma.get('sma_20') and data['price'] > ma['sma_20']:
            signals.append('above_sma_20')
        if ma.get('sma_50') and data['price'] > ma['sma_50']:
            signals.append('above_sma_50')
        if ma.get('sma_200') and data['price'] > ma['sma_200']:
            signals.append('above_sma_200')
        
        # Support/Resistance signals
        sr = indicators.get('support_resistance', {})
        if sr.get('resistance') and data['price'] > sr['resistance'] * 0.98:
            signals.append('near_resistance')
        if sr.get('support') and data['price'] < sr['support'] * 1.02:
            signals.append('near_support')
        
        # 52-week high/low signals
        if data.get('52_week_high') and data['price'] > data['52_week_high'] * 0.95:
            signals.append('near_52_week_high')
        if data.get('52_week_low') and data['price'] < data['52_week_low'] * 1.05:
            signals.append('near_52_week_low')
        
        return signals
    
    def _calculate_score(self, data: Dict, indicators: Dict, signals: List[str], config: Dict) -> float:
        """Calculate overall screening score"""
        score = 0.0
        
        # Momentum scoring
        if 'momentum' in str(config):
            score += min(abs(data['change_percent']) * 10, 30)
            if 'high_volume_breakout' in signals:
                score += 20
            if 'bullish_momentum' in signals:
                score += 10
            if indicators.get('rsi') and 50 < indicators['rsi'] < 70:
                score += 15
        
        # Value scoring
        if 'value' in str(config):
            if data.get('pe_ratio') and data['pe_ratio'] < 15:
                score += 20
            if data.get('dividend_yield') and data['dividend_yield'] > 0.03:
                score += 15
            if data.get('market_cap') and data['market_cap'] > 10000000000:
                score += 10
        
        # Technical scoring
        if 'above_sma_20' in signals:
            score += 5
        if 'above_sma_50' in signals:
            score += 10
        if 'above_sma_200' in signals:
            score += 15
        
        if 'macd_bullish' in signals:
            score += 10
        
        # Volume scoring
        volume_ratio = indicators.get('volume', {}).get('volume_ratio', 1)
        if volume_ratio > 1.5:
            score += min(volume_ratio * 5, 20)
        
        # Normalize score to 0-100
        score = min(score, 100)
        
        return score
    
    async def get_etf_screener(self, category: str = 'all') -> List[StockScreenerResult]:
        """Screen ETFs by category"""
        etf_symbols = []
        
        if category == 'all' or category == 'indices':
            etf_symbols.extend(self.major_symbols['indices'])
        if category == 'all' or category == 'sectors':
            etf_symbols.extend(self.major_symbols['sectors'])
        if category == 'all' or category == 'international':
            etf_symbols.extend(self.major_symbols['international'])
        if category == 'all' or category == 'bonds':
            etf_symbols.extend(self.major_symbols['bonds'])
        if category == 'all' or category == 'commodities':
            etf_symbols.extend(self.major_symbols['commodities'])
        
        # Screen ETFs with specific criteria
        config = self.screen_configs['etf_trending']
        results = await self._screen_batch(etf_symbols, config)
        
        return results
    
    async def get_market_overview(self) -> Dict:
        """Get market overview with major indices and sectors"""
        overview = {
            'indices': {},
            'sectors': {},
            'market_breadth': {},
            'top_gainers': [],
            'top_losers': [],
            'most_active': []
        }
        
        # Get major indices
        for symbol in self.major_symbols['indices']:
            data = await self._get_stock_data(symbol)
            if data:
                overview['indices'][symbol] = {
                    'name': data['name'],
                    'price': data['price'],
                    'change': data['change'],
                    'change_percent': data['change_percent']
                }
        
        # Get sector performance
        for symbol in self.major_symbols['sectors']:
            data = await self._get_stock_data(symbol)
            if data:
                overview['sectors'][symbol] = {
                    'name': data['name'],
                    'price': data['price'],
                    'change': data['change'],
                    'change_percent': data['change_percent']
                }
        
        # Screen for top movers
        all_stocks = await self._get_us_stocks()
        sample_stocks = all_stocks[:100]  # Sample for performance
        
        stock_data = []
        for symbol in sample_stocks:
            data = await self._get_stock_data(symbol)
            if data:
                stock_data.append(data)
        
        # Sort for top gainers/losers
        stock_data.sort(key=lambda x: x['change_percent'], reverse=True)
        overview['top_gainers'] = [
            {
                'symbol': s['symbol'],
                'name': s['name'],
                'price': s['price'],
                'change_percent': s['change_percent']
            }
            for s in stock_data[:5]
        ]
        
        overview['top_losers'] = [
            {
                'symbol': s['symbol'],
                'name': s['name'],
                'price': s['price'],
                'change_percent': s['change_percent']
            }
            for s in stock_data[-5:]
        ]
        
        # Most active by volume
        stock_data.sort(key=lambda x: x['volume'], reverse=True)
        overview['most_active'] = [
            {
                'symbol': s['symbol'],
                'name': s['name'],
                'price': s['price'],
                'volume': s['volume']
            }
            for s in stock_data[:5]
        ]
        
        # Market breadth
        advancing = sum(1 for s in stock_data if s['change_percent'] > 0)
        declining = sum(1 for s in stock_data if s['change_percent'] < 0)
        unchanged = len(stock_data) - advancing - declining
        
        overview['market_breadth'] = {
            'advancing': advancing,
            'declining': declining,
            'unchanged': unchanged,
            'ratio': advancing / declining if declining > 0 else float('inf')
        }
        
        return overview
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            self.session = None

# FastAPI endpoints
from fastapi import APIRouter, Query, HTTPException

router = APIRouter()
screener = EquityScreener()

@router.get("/screener/stocks")
async def screen_stocks(
    criteria: str = Query('momentum', description="Screening criteria"),
    limit: int = Query(50, description="Maximum results"),
    market: str = Query('US', description="Market to screen")
):
    """Screen stocks based on criteria"""
    try:
        results = await screener.screen_stocks(criteria, limit, market)
        return {
            'success': True,
            'criteria': criteria,
            'market': market,
            'count': len(results),
            'results': [
                {
                    'symbol': r.symbol,
                    'name': r.name,
                    'price': r.price,
                    'change_percent': r.change_percent,
                    'volume': r.volume,
                    'score': r.score,
                    'signals': r.signals
                }
                for r in results
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/screener/etfs")
async def screen_etfs(
    category: str = Query('all', description="ETF category")
):
    """Screen ETFs by category"""
    try:
        results = await screener.get_etf_screener(category)
        return {
            'success': True,
            'category': category,
            'count': len(results),
            'results': [
                {
                    'symbol': r.symbol,
                    'name': r.name,
                    'price': r.price,
                    'change_percent': r.change_percent,
                    'volume': r.volume,
                    'score': r.score
                }
                for r in results
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/screener/market-overview")
async def get_market_overview():
    """Get market overview"""
    try:
        overview = await screener.get_market_overview()
        return {
            'success': True,
            'data': overview
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
