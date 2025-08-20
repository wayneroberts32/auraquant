"""
Crypto Screener Module
Integrates free data sources for crypto screening (CoinGecko, CoinMarketCap)
"""

import asyncio
import aiohttp
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from dataclasses import dataclass
import json
import logging
import os

logger = logging.getLogger(__name__)

@dataclass
class CryptoScreenerResult:
    id: str
    symbol: str
    name: str
    price: float
    change_24h: float
    volume_24h: float
    market_cap: float
    circulating_supply: float
    total_supply: Optional[float]
    ath: float
    ath_change_percentage: float
    atl: float
    atl_change_percentage: float
    score: float
    signals: List[str]

class CryptoScreener:
    """Free crypto screener using CoinGecko and CoinMarketCap free tiers"""
    
    def __init__(self):
        self.session = None
        self.cache = {}
        self.cache_ttl = 300  # 5 minutes
        
        self.coingecko_api_key = os.getenv('COINGECKO_API_KEY')
        self.coinmarketcap_api_key = os.getenv('COINMARKETCAP_API_KEY')
        
        self.coingecko_base_url = "https://api.coingecko.com/api/v3"
        self.coinmarketcap_base_url = "https://pro-api.coinmarketcap.com/v1"
        
        self.screen_configs = {
            'trending': {
                'min_volume_24h': 1000000,
                'min_change_24h': 5,
                'sort_by': 'market_cap_desc'
            },
            'new_listings': {
                'min_volume_24h': 100000,
                'sort_by': 'market_cap_desc'
            },
            'top_gainers': {
                'min_volume_24h': 100000,
                'min_change_24h': 20,
                'sort_by': 'percent_change_24h_desc'
            },
            'top_losers': {
                'min_volume_24h': 100000,
                'max_change_24h': -20,
                'sort_by': 'percent_change_24h_asc'
            },
            'high_volume': {
                'min_volume_24h': 50000000,
                'sort_by': 'volume_24h_desc'
            },
            'meme_coins': {
                'min_volume_24h': 500000,
                'min_market_cap': 1000000,
                'category': 'meme-token'
            },
            'defi': {
                'min_volume_24h': 1000000,
                'min_market_cap': 50000000,
                'category': 'decentralized-finance-defi'
            },
            'nft': {
                'min_volume_24h': 100000,
                'category': 'non-fungible-tokens-nft'
            }
        }
    
    async def initialize(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def screen_crypto(self, 
                           criteria: str = 'trending',
                           limit: int = 50,
                           source: str = 'coingecko') -> List[CryptoScreenerResult]:
        """
        Screen cryptocurrencies based on criteria
        
        Args:
            criteria: Screening criteria name
            limit: Maximum number of results
            source: Data source (coingecko or coinmarketcap)
        
        Returns:
            List of screened cryptocurrencies
        """
        await self.initialize()
        
        config = self.screen_configs.get(criteria, self.screen_configs['trending'])
        
        if source == 'coingecko':
            data = await self._fetch_coingecko_data(config, limit)
        elif source == 'coinmarketcap':
            data = await self._fetch_coinmarketcap_data(config, limit)
        else:
            raise ValueError("Invalid data source")
        
        if not data:
            return []
        
        results = self._process_screener_data(data, config)
        
        # Sort by score
        results.sort(key=lambda x: x.score, reverse=True)
        
        return results[:limit]
    
    async def _fetch_coingecko_data(self, config: Dict, limit: int) -> Optional[List[Dict]]:
        """Fetch data from CoinGecko API"""
        cache_key = f"coingecko_{json.dumps(config)}_{limit}"
        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if datetime.now() - cached_time < timedelta(seconds=self.cache_ttl):
                return cached_data
        
        try:
            url = f"{self.coingecko_base_url}/coins/markets"
            params = {
                'vs_currency': 'usd',
                'order': config.get('sort_by', 'market_cap_desc'),
                'per_page': limit,
                'page': 1,
                'sparkline': 'false',
                'price_change_percentage': '24h,7d,30d'
            }
            if config.get('category'):
                params['category'] = config['category']
            
            headers = {'x-cg-demo-api-key': self.coingecko_api_key} if self.coingecko_api_key else {}
            
            async with self.session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    self.cache[cache_key] = (data, datetime.now())
                    return data
                else:
                    logger.error(f"CoinGecko API error: {response.status} {await response.text()}")
                    return None
        except Exception as e:
            logger.error(f"Error fetching CoinGecko data: {e}")
            return None
    
    async def _fetch_coinmarketcap_data(self, config: Dict, limit: int) -> Optional[List[Dict]]:
        """Fetch data from CoinMarketCap API"""
        if not self.coinmarketcap_api_key:
            logger.error("CoinMarketCap API key not provided")
            return None
            
        cache_key = f"cmc_{json.dumps(config)}_{limit}"
        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if datetime.now() - cached_time < timedelta(seconds=self.cache_ttl):
                return cached_data
        
        try:
            url = f"{self.coinmarketcap_base_url}/cryptocurrency/listings/latest"
            params = {
                'start': '1',
                'limit': str(limit),
                'convert': 'USD',
                'sort': config.get('sort_by', 'market_cap'),
                'sort_dir': 'desc'
            }
            headers = {
                'Accepts': 'application/json',
                'X-CMC_PRO_API_KEY': self.coinmarketcap_api_key
            }
            
            async with self.session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = (await response.json()).get('data', [])
                    self.cache[cache_key] = (data, datetime.now())
                    return data
                else:
                    logger.error(f"CoinMarketCap API error: {response.status} {await response.text()}")
                    return None
        except Exception as e:
            logger.error(f"Error fetching CoinMarketCap data: {e}")
            return None
    
    def _process_screener_data(self, data: List[Dict], config: Dict) -> List[CryptoScreenerResult]:
        """Process raw data from APIs into standardized format"""
        results = []
        
        for item in data:
            try:
                if 'id' in item: # CoinGecko format
                    price = item.get('current_price', 0)
                    change_24h = item.get('price_change_percentage_24h', 0)
                    volume_24h = item.get('total_volume', 0)
                    
                    if volume_24h < config.get('min_volume_24h', 0):
                        continue
                    if change_24h < config.get('min_change_24h', -100):
                        continue
                    if change_24h > config.get('max_change_24h', 10000):
                        continue
                        
                    result = CryptoScreenerResult(
                        id=item['id'],
                        symbol=item['symbol'],
                        name=item['name'],
                        price=price,
                        change_24h=change_24h,
                        volume_24h=volume_24h,
                        market_cap=item.get('market_cap', 0),
                        circulating_supply=item.get('circulating_supply', 0),
                        total_supply=item.get('total_supply'),
                        ath=item.get('ath', 0),
                        ath_change_percentage=item.get('ath_change_percentage', 0),
                        atl=item.get('atl', 0),
                        atl_change_percentage=item.get('atl_change_percentage', 0),
                        score=0.0,
                        signals=[]
                    )
                else: # CoinMarketCap format
                    quote = item['quote']['USD']
                    volume_24h = quote.get('volume_24h', 0)
                    change_24h = quote.get('percent_change_24h', 0)
                    
                    if volume_24h < config.get('min_volume_24h', 0):
                        continue
                    if change_24h < config.get('min_change_24h', -100):
                        continue
                    if change_24h > config.get('max_change_24h', 10000):
                        continue
                        
                    result = CryptoScreenerResult(
                        id=item['slug'],
                        symbol=item['symbol'],
                        name=item['name'],
                        price=quote.get('price', 0),
                        change_24h=change_24h,
                        volume_24h=volume_24h,
                        market_cap=quote.get('market_cap', 0),
                        circulating_supply=item.get('circulating_supply', 0),
                        total_supply=item.get('total_supply'),
                        ath=quote.get('ath', 0),
                        ath_change_percentage=quote.get('percent_change_from_ath', 0),
                        atl=quote.get('atl', 0),
                        atl_change_percentage=quote.get('percent_change_from_atl', 0),
                        score=0.0,
                        signals=[]
                    )
                
                # Generate signals and score
                result.signals = self._generate_signals(result)
                result.score = self._calculate_score(result, config)
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error processing crypto item: {e}")
                continue
                
        return results
    
    def _generate_signals(self, data: CryptoScreenerResult) -> List[str]:
        signals = []
        
        if data.change_24h > 20:
            signals.append('strong_bullish_momentum')
        elif data.change_24h > 5:
            signals.append('bullish_momentum')
        
        if data.volume_24h > 50000000:
            signals.append('high_volume')
        
        if data.market_cap > 10000000000:
            signals.append('large_cap')
        elif data.market_cap < 10000000:
            signals.append('micro_cap')
        
        if data.ath_change_percentage > -10:
            signals.append('near_ath')
        elif data.atl_change_percentage < 100:
            signals.append('near_atl')
            
        return signals
    
    def _calculate_score(self, data: CryptoScreenerResult, config: Dict) -> float:
        score = 0.0
        
        score += min(abs(data.change_24h) * 2, 50)
        score += min(np.log(data.volume_24h) * 2, 30) if data.volume_24h > 0 else 0
        score += min(np.log(data.market_cap) * 1, 20) if data.market_cap > 0 else 0
        
        if 'trending' in config or 'gainers' in config:
            if 'bullish_momentum' in data.signals:
                score += 10
            if 'strong_bullish_momentum' in data.signals:
                score += 15
        
        return min(score, 100)
    
    async def cleanup(self):
        if self.session:
            await self.session.close()
            self.session = None

# FastAPI endpoints
from fastapi import APIRouter, Query, HTTPException

router = APIRouter()
screener = CryptoScreener()

@router.get("/screener/crypto")
async def screen_crypto(
    criteria: str = Query('trending', description="Screening criteria"),
    limit: int = Query(50, description="Maximum results"),
    source: str = Query('coingecko', description="Data source")
):
    """Screen cryptocurrencies"""
    try:
        results = await screener.screen_crypto(criteria, limit, source)
        return {
            'success': True,
            'criteria': criteria,
            'source': source,
            'count': len(results),
            'results': [
                {
                    'id': r.id,
                    'symbol': r.symbol,
                    'name': r.name,
                    'price': r.price,
                    'change_24h': r.change_24h,
                    'volume_24h': r.volume_24h,
                    'market_cap': r.market_cap,
                    'score': r.score,
                    'signals': r.signals
                }
                for r in results
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

