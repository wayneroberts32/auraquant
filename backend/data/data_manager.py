"""
AuraQuant Data Management System
Handles data ingestion, storage, and retrieval
"""

import asyncio
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging
from sqlalchemy import create_engine
from influxdb_client import InfluxDBClient
import redis.asyncio as redis

logger = logging.getLogger(__name__)

class DataManager:
    """Comprehensive data management for market data and analytics"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.postgres_engine = create_engine(config["database_url"])
        self.influx_client = InfluxDBClient(
            url=config.get("influx_url", "http://localhost:8086"),
            token=config.get("influx_token"),
            org=config.get("influx_org", "auraquant")
        )
        self.redis_client = None
        self.data_sources = {}
        
    async def initialize(self):
        """Initialize data connections"""
        self.redis_client = await redis.create_redis_pool(
            self.config.get("redis_url", "redis://localhost:6379")
        )
        logger.info("Data Manager initialized")
        
    async def ingest_market_data(self, source: str, symbol: str, 
                                 data: pd.DataFrame) -> bool:
        """Ingest market data from various sources"""
        
        try:
            # Validate data
            if not self._validate_market_data(data):
                logger.error(f"Invalid data for {symbol} from {source}")
                return False
            
            # Store in time-series database
            await self._store_timeseries(symbol, data)
            
            # Cache recent data in Redis
            await self._cache_recent_data(symbol, data)
            
            # Store aggregates in PostgreSQL
            await self._store_aggregates(symbol, data)
            
            logger.info(f"Ingested {len(data)} records for {symbol}")
            return True
            
        except Exception as e:
            logger.error(f"Error ingesting data: {e}")
            return False
            
    async def get_historical_data(self, symbol: str, 
                                 start: datetime, 
                                 end: datetime,
                                 timeframe: str = "1m") -> pd.DataFrame:
        """Retrieve historical market data"""
        
        # Try cache first
        cached = await self._get_cached_data(symbol, start, end)
        if cached is not None:
            return cached
        
        # Query time-series database
        query = f"""
        from(bucket: "market_data")
          |> range(start: {start.isoformat()}, stop: {end.isoformat()})
          |> filter(fn: (r) => r["symbol"] == "{symbol}")
          |> filter(fn: (r) => r["timeframe"] == "{timeframe}")
        """
        
        result = self.influx_client.query_api().query(query)
        
        # Convert to DataFrame
        data = self._influx_to_dataframe(result)
        
        # Cache for future use
        await self._cache_data(symbol, data)
        
        return data
        
    async def store_trade(self, trade: Dict[str, Any]) -> bool:
        """Store executed trade"""
        
        try:
            # Store in PostgreSQL
            df = pd.DataFrame([trade])
            df.to_sql("trades", self.postgres_engine, if_exists="append", index=False)
            
            # Update real-time metrics in Redis
            await self._update_trade_metrics(trade)
            
            # Send to analytics pipeline
            await self._send_to_analytics(trade)
            
            return True
            
        except Exception as e:
            logger.error(f"Error storing trade: {e}")
            return False
            
    async def get_analytics(self, user_id: str, 
                           period: str = "1d") -> Dict[str, Any]:
        """Get trading analytics for user"""
        
        # Calculate time range
        end_time = datetime.now()
        if period == "1d":
            start_time = end_time - timedelta(days=1)
        elif period == "1w":
            start_time = end_time - timedelta(weeks=1)
        elif period == "1m":
            start_time = end_time - timedelta(days=30)
        else:
            start_time = end_time - timedelta(days=1)
        
        # Query trades
        query = f"""
        SELECT * FROM trades 
        WHERE user_id = '{user_id}' 
        AND executed_at >= '{start_time}'
        AND executed_at <= '{end_time}'
        """
        
        trades_df = pd.read_sql(query, self.postgres_engine)
        
        # Calculate metrics
        analytics = {
            "total_trades": len(trades_df),
            "winning_trades": len(trades_df[trades_df["realized_pnl"] > 0]),
            "losing_trades": len(trades_df[trades_df["realized_pnl"] < 0]),
            "total_pnl": trades_df["realized_pnl"].sum(),
            "win_rate": len(trades_df[trades_df["realized_pnl"] > 0]) / len(trades_df) if len(trades_df) > 0 else 0,
            "average_win": trades_df[trades_df["realized_pnl"] > 0]["realized_pnl"].mean() if len(trades_df[trades_df["realized_pnl"] > 0]) > 0 else 0,
            "average_loss": trades_df[trades_df["realized_pnl"] < 0]["realized_pnl"].mean() if len(trades_df[trades_df["realized_pnl"] < 0]) > 0 else 0,
            "sharpe_ratio": self._calculate_sharpe(trades_df),
            "max_drawdown": self._calculate_max_drawdown(trades_df),
            "period": period,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat()
        }
        
        return analytics
        
    def _validate_market_data(self, data: pd.DataFrame) -> bool:
        """Validate market data integrity"""
        required_columns = ["open", "high", "low", "close", "volume"]
        return all(col in data.columns for col in required_columns)
        
    def _calculate_sharpe(self, trades_df: pd.DataFrame) -> float:
        """Calculate Sharpe ratio"""
        if len(trades_df) < 2:
            return 0.0
        
        returns = trades_df["realized_pnl"].pct_change().dropna()
        if returns.std() == 0:
            return 0.0
        
        return (returns.mean() / returns.std()) * (252 ** 0.5)  # Annualized
        
    def _calculate_max_drawdown(self, trades_df: pd.DataFrame) -> float:
        """Calculate maximum drawdown"""
        if len(trades_df) == 0:
            return 0.0
        
        cumulative = trades_df["realized_pnl"].cumsum()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max.abs()
        
        return drawdown.min()
