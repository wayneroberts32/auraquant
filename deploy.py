"""
AuraQuant Deployment Script
Automated deployment to Render with complete backend setup
"""

import os
import sys
import subprocess
import json
import shutil
from pathlib import Path
import requests
from datetime import datetime

class AuraQuantDeployment:
    """Complete deployment automation for AuraQuant"""
    
    def __init__(self):
        self.project_root = Path("D:/AuraQuant_Rich_Bot/Warp/AuraQuant")
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        self.render_api_key = os.getenv("RENDER_API_KEY")
        self.github_token = os.getenv("GITHUB_TOKEN")
        
    def setup_environment(self):
        """Set up environment variables and configuration"""
        
        print("🔧 Setting up environment...")
        
        # Create .env file for backend
        env_content = """
# AuraQuant Environment Configuration
DATABASE_URL=postgresql://auraquant:password@localhost:5432/auraquant
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here

# API Keys (Replace with actual keys)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ALPACA_KEY=your-alpaca-key
ALPACA_SECRET=your-alpaca-secret
BINANCE_API_KEY=your-binance-key
BINANCE_SECRET=your-binance-secret
IB_GATEWAY_HOST=localhost
IB_GATEWAY_PORT=7497
IB_CLIENT_ID=1

# Webhook Configuration
WEBHOOK_SECRET=your-webhook-secret
ALLOWED_IPS=["127.0.0.1", "::1"]

# Trading Configuration
TRADING_MODE=paper
DEFAULT_JURISDICTION=AU
MAX_DAILY_LOSS=0.005
ROLLING_DRAWDOWN_STOP=0.0125

# Monitoring
TELEGRAM_BOT_TOKEN=your-telegram-token
TELEGRAM_CHAT_ID=your-chat-id
DISCORD_WEBHOOK_URL=your-discord-webhook
"""
        
        env_file = self.backend_dir / ".env"
        env_file.write_text(env_content)
        print(f"✅ Environment file created: {env_file}")
        
        # Create render.yaml for deployment
        render_yaml = """
services:
  - type: web
    name: auraquant-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: auraquant-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: auraquant-redis
          type: redis
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: PYTHON_VERSION
        value: 3.11
    healthCheckPath: /health
    
  - type: redis
    name: auraquant-redis
    plan: starter
    
  - type: pserv
    name: auraquant-worker
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python worker.py
    
databases:
  - name: auraquant-db
    plan: starter
    databaseName: auraquant
    user: auraquant
"""
        
        render_file = self.project_root / "render.yaml"
        render_file.write_text(render_yaml)
        print(f"✅ Render configuration created: {render_file}")
        
    def create_remaining_modules(self):
        """Create all remaining backend modules"""
        
        print("📦 Creating remaining backend modules...")
        
        # AI Integration Module
        ai_integration = '''"""
AuraQuant AI Integration
Integrates OpenAI, Claude, and custom ML models for market analysis
"""

import openai
import anthropic
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
from datetime import datetime
import asyncio
import logging

logger = logging.getLogger(__name__)

class AITradingAssistant:
    """AI-powered trading analysis and signal generation"""
    
    def __init__(self, config: Dict[str, Any]):
        self.openai_client = openai.AsyncOpenAI(api_key=config.get("openai_api_key"))
        self.anthropic_client = anthropic.AsyncAnthropic(api_key=config.get("anthropic_api_key"))
        self.model_configs = {
            "market_analysis": "gpt-4-turbo-preview",
            "risk_assessment": "claude-3-opus-20240229",
            "signal_generation": "gpt-4"
        }
        
    async def analyze_market(self, symbol: str, data: pd.DataFrame) -> Dict[str, Any]:
        """Analyze market conditions using AI"""
        
        # Prepare market data summary
        summary = self._prepare_market_summary(data)
        
        # Get AI analysis
        prompt = f"""Analyze the following market data for {symbol}:
        {summary}
        
        Provide:
        1. Current market sentiment
        2. Key support/resistance levels
        3. Potential trading opportunities
        4. Risk factors to consider
        """
        
        response = await self.openai_client.chat.completions.create(
            model=self.model_configs["market_analysis"],
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        
        return {
            "symbol": symbol,
            "analysis": response.choices[0].message.content,
            "timestamp": datetime.now().isoformat()
        }
        
    async def assess_risk(self, position: Dict) -> Dict[str, Any]:
        """Assess risk using Claude"""
        
        prompt = f"""Assess the risk for this position:
        {json.dumps(position, indent=2)}
        
        Consider:
        - Market volatility
        - Position size relative to portfolio
        - Current market conditions
        - Potential black swan events
        
        Provide a risk score (0-100) and detailed explanation.
        """
        
        response = await self.anthropic_client.messages.create(
            model=self.model_configs["risk_assessment"],
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000
        )
        
        return {
            "position_id": position.get("id"),
            "risk_assessment": response.content[0].text,
            "timestamp": datetime.now().isoformat()
        }
        
    async def generate_signals(self, market_data: Dict) -> List[Dict]:
        """Generate trading signals using AI ensemble"""
        
        signals = []
        
        # Use multiple AI models for consensus
        tasks = [
            self._get_openai_signal(market_data),
            self._get_claude_signal(market_data)
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Combine signals with voting mechanism
        for result in results:
            if result["confidence"] > 0.7:
                signals.append(result)
        
        return signals
        
    def _prepare_market_summary(self, data: pd.DataFrame) -> str:
        """Prepare market data summary for AI analysis"""
        
        return f"""
        Recent Price Action:
        - Current Price: {data['close'].iloc[-1]}
        - 24h Change: {((data['close'].iloc[-1] / data['close'].iloc[-24] - 1) * 100):.2f}%
        - Volume: {data['volume'].iloc[-1]:,.0f}
        - RSI: {self._calculate_rsi(data)}
        - MACD: {self._calculate_macd(data)}
        """
        
    def _calculate_rsi(self, data: pd.DataFrame, period: int = 14) -> float:
        """Calculate RSI indicator"""
        delta = data['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1]
        
    def _calculate_macd(self, data: pd.DataFrame) -> Dict:
        """Calculate MACD indicator"""
        exp1 = data['close'].ewm(span=12, adjust=False).mean()
        exp2 = data['close'].ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        return {
            "macd": macd.iloc[-1],
            "signal": signal.iloc[-1],
            "histogram": (macd - signal).iloc[-1]
        }
'''
        
        ai_file = self.backend_dir / "ai" / "ai_integration.py"
        ai_file.parent.mkdir(exist_ok=True)
        ai_file.write_text(ai_integration)
        print(f"✅ AI Integration module created")
        
        # Paper/Real Trading Switch Module
        trading_switch = '''"""
AuraQuant Paper/Real Trading Switch
Intelligent switching between paper and real trading modes
"""

from enum import Enum
from typing import Dict, Any, Optional
from decimal import Decimal
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class TradingEnvironment(Enum):
    PAPER = "paper"
    MICRO = "micro"
    REAL = "real"

class TradingModeManager:
    """Manages switching between paper and real trading modes"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.current_mode = TradingEnvironment.PAPER
        self.mode_history = []
        self.safety_checks = {
            "min_paper_trades": 100,
            "min_paper_profit": Decimal("1000"),
            "min_win_rate": 0.55,
            "max_drawdown": 0.10,
            "required_equity": Decimal("25000")
        }
        
    async def switch_mode(self, target_mode: TradingEnvironment, 
                         force: bool = False) -> Dict[str, Any]:
        """Switch trading mode with safety checks"""
        
        if not force:
            # Perform safety checks
            checks_passed, reason = await self._perform_safety_checks(target_mode)
            
            if not checks_passed:
                logger.warning(f"Mode switch blocked: {reason}")
                return {
                    "success": False,
                    "reason": reason,
                    "current_mode": self.current_mode.value
                }
        
        # Log mode change
        self.mode_history.append({
            "from": self.current_mode.value,
            "to": target_mode.value,
            "timestamp": datetime.now().isoformat(),
            "forced": force
        })
        
        # Update configuration
        old_mode = self.current_mode
        self.current_mode = target_mode
        
        # Update broker connections
        await self._update_broker_connections(target_mode)
        
        logger.info(f"Trading mode switched from {old_mode.value} to {target_mode.value}")
        
        return {
            "success": True,
            "previous_mode": old_mode.value,
            "current_mode": target_mode.value,
            "timestamp": datetime.now().isoformat()
        }
        
    async def _perform_safety_checks(self, target_mode: TradingEnvironment) -> tuple:
        """Perform safety checks before mode switch"""
        
        # Check progression path
        if target_mode == TradingEnvironment.REAL:
            # Must go through paper -> micro -> real
            if self.current_mode == TradingEnvironment.PAPER:
                return False, "Must complete micro trading before real trading"
            
            # Check performance metrics
            metrics = await self._get_performance_metrics()
            
            if metrics["total_trades"] < self.safety_checks["min_paper_trades"]:
                return False, f"Insufficient trades: {metrics['total_trades']}"
            
            if metrics["win_rate"] < self.safety_checks["min_win_rate"]:
                return False, f"Win rate too low: {metrics['win_rate']:.2%}"
            
            if metrics["max_drawdown"] > self.safety_checks["max_drawdown"]:
                return False, f"Drawdown too high: {metrics['max_drawdown']:.2%}"
            
            if metrics["equity"] < self.safety_checks["required_equity"]:
                return False, f"Insufficient equity: ${metrics['equity']}"
        
        return True, "All checks passed"
        
    async def _update_broker_connections(self, mode: TradingEnvironment):
        """Update broker connections for new mode"""
        
        if mode == TradingEnvironment.PAPER:
            # Connect to paper trading endpoints
            self.config["alpaca_base_url"] = "https://paper-api.alpaca.markets"
            self.config["binance_testnet"] = True
            
        elif mode == TradingEnvironment.REAL:
            # Connect to live trading endpoints
            self.config["alpaca_base_url"] = "https://api.alpaca.markets"
            self.config["binance_testnet"] = False
            
    async def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        # Would fetch from database
        return {
            "total_trades": 150,
            "win_rate": 0.58,
            "max_drawdown": 0.08,
            "equity": Decimal("30000")
        }
'''
        
        switch_file = self.backend_dir / "core" / "trading_switch.py"
        switch_file.write_text(trading_switch)
        print(f"✅ Trading Switch module created")
        
        # Data Management Module
        data_management = '''"""
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
'''
        
        data_file = self.backend_dir / "data" / "data_manager.py"
        data_file.parent.mkdir(exist_ok=True)
        data_file.write_text(data_management)
        print(f"✅ Data Management module created")
        
    def setup_git_repository(self):
        """Initialize Git repository and prepare for deployment"""
        
        print("📁 Setting up Git repository...")
        
        # Create .gitignore
        gitignore_content = """
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv
build/
dist/
*.egg-info/

# Environment
.env
.env.local
.env.*.local

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
logs/

# Database
*.db
*.sqlite
*.sqlite3

# OS
.DS_Store
Thumbs.db

# Testing
.coverage
.pytest_cache/
htmlcov/

# Node (for frontend)
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production
*.pem
*.key
*.crt
"""
        
        gitignore_file = self.project_root / ".gitignore"
        gitignore_file.write_text(gitignore_content)
        print(f"✅ .gitignore created")
        
        # Initialize git repository
        try:
            subprocess.run(["git", "init"], cwd=self.project_root, check=True)
            subprocess.run(["git", "add", "."], cwd=self.project_root, check=True)
            subprocess.run(["git", "commit", "-m", "Initial AuraQuant commit"], 
                         cwd=self.project_root, check=True)
            print("✅ Git repository initialized")
        except subprocess.CalledProcessError as e:
            print(f"⚠️ Git initialization warning: {e}")
        
    def create_deployment_scripts(self):
        """Create deployment and maintenance scripts"""
        
        print("🚀 Creating deployment scripts...")
        
        # Create deploy.sh for Unix systems
        deploy_sh = """#!/bin/bash

# AuraQuant Deployment Script

echo "🚀 Deploying AuraQuant to Render..."

# Check environment variables
if [ -z "$RENDER_API_KEY" ]; then
    echo "❌ RENDER_API_KEY not set"
    exit 1
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# Trigger Render deployment
echo "🔄 Triggering Render deployment..."
curl -X POST "https://api.render.com/v1/services/YOUR_SERVICE_ID/deploys" \
     -H "Authorization: Bearer $RENDER_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"clearCache": false}'

echo "✅ Deployment triggered successfully!"
"""
        
        deploy_sh_file = self.project_root / "scripts" / "deploy.sh"
        deploy_sh_file.parent.mkdir(exist_ok=True)
        deploy_sh_file.write_text(deploy_sh)
        print(f"✅ Deploy script created")
        
        # Create backup script
        backup_script = """#!/usr/bin/env python3

import os
import subprocess
from datetime import datetime
import boto3

def backup_database():
    '''Backup PostgreSQL database'''
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = f"auraquant_backup_{timestamp}.sql"
    
    # Dump database
    subprocess.run([
        "pg_dump",
        os.getenv("DATABASE_URL"),
        "-f", backup_file
    ])
    
    # Upload to S3
    s3 = boto3.client('s3')
    s3.upload_file(backup_file, 'auraquant-backups', backup_file)
    
    # Clean up local file
    os.remove(backup_file)
    
    print(f"✅ Backup completed: {backup_file}")

if __name__ == "__main__":
    backup_database()
"""
        
        backup_file = self.project_root / "scripts" / "backup.py"
        backup_file.write_text(backup_script)
        print(f"✅ Backup script created")
        
    def create_frontend_backend_sync(self):
        """Create frontend-backend synchronization module"""
        
        print("🔄 Creating frontend-backend sync...")
        
        sync_module = '''"""
Frontend-Backend Synchronization
Real-time WebSocket and REST API integration
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, Any
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_subscriptions: Dict[str, Set[str]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_subscriptions[user_id] = set()
        logger.info(f"User {user_id} connected via WebSocket")
        
    def disconnect(self, user_id: str):
        """Remove WebSocket connection"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            del self.user_subscriptions[user_id]
            logger.info(f"User {user_id} disconnected")
            
    async def send_personal_message(self, message: str, user_id: str):
        """Send message to specific user"""
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)
            
    async def broadcast(self, message: str, channel: str = "general"):
        """Broadcast message to all connected clients"""
        for user_id, connection in self.active_connections.items():
            if channel in self.user_subscriptions.get(user_id, set()):
                await connection.send_text(message)
                
    async def subscribe(self, user_id: str, channel: str):
        """Subscribe user to channel"""
        if user_id in self.user_subscriptions:
            self.user_subscriptions[user_id].add(channel)
            
    async def unsubscribe(self, user_id: str, channel: str):
        """Unsubscribe user from channel"""
        if user_id in self.user_subscriptions:
            self.user_subscriptions[user_id].discard(channel)

# Global connection manager
manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time updates"""
    
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message["type"] == "subscribe":
                await manager.subscribe(user_id, message["channel"])
                
            elif message["type"] == "unsubscribe":
                await manager.unsubscribe(user_id, message["channel"])
                
            elif message["type"] == "order":
                # Process order and send updates
                response = await process_order(message["data"])
                await manager.send_personal_message(
                    json.dumps(response), user_id
                )
                
            elif message["type"] == "ping":
                await manager.send_personal_message(
                    json.dumps({"type": "pong"}), user_id
                )
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)

async def send_market_update(symbol: str, data: Dict[str, Any]):
    """Send market update to subscribed users"""
    
    message = json.dumps({
        "type": "market_update",
        "symbol": symbol,
        "data": data,
        "timestamp": datetime.now().isoformat()
    })
    
    await manager.broadcast(message, f"market:{symbol}")

async def send_trade_update(user_id: str, trade: Dict[str, Any]):
    """Send trade update to user"""
    
    message = json.dumps({
        "type": "trade_update",
        "trade": trade,
        "timestamp": datetime.now().isoformat()
    })
    
    await manager.send_personal_message(message, user_id)
'''
        
        sync_file = self.backend_dir / "api" / "websocket_sync.py"
        sync_file.parent.mkdir(exist_ok=True)
        sync_file.write_text(sync_module)
        print(f"✅ Frontend-Backend sync module created")
        
    def cleanup_old_render_code(self):
        """Clean up any old backend code from Render"""
        
        print("🧹 Cleaning up old Render deployment...")
        
        if self.render_api_key:
            headers = {
                "Authorization": f"Bearer {self.render_api_key}",
                "Content-Type": "application/json"
            }
            
            # Get list of services
            response = requests.get(
                "https://api.render.com/v1/services",
                headers=headers
            )
            
            if response.status_code == 200:
                services = response.json()
                
                for service in services:
                    if "auraquant" in service["name"].lower():
                        # Delete old service
                        delete_response = requests.delete(
                            f"https://api.render.com/v1/services/{service['id']}",
                            headers=headers
                        )
                        
                        if delete_response.status_code == 204:
                            print(f"✅ Deleted old service: {service['name']}")
                        else:
                            print(f"⚠️ Could not delete: {service['name']}")
            else:
                print("⚠️ Could not fetch Render services")
        else:
            print("⚠️ RENDER_API_KEY not set - skipping cleanup")
    
    def run_deployment(self):
        """Run complete deployment process"""
        
        print("\n" + "="*50)
        print("🚀 AuraQuant Deployment Process Starting")
        print("="*50 + "\n")
        
        # Step 1: Setup environment
        self.setup_environment()
        
        # Step 2: Create remaining modules
        self.create_remaining_modules()
        
        # Step 3: Setup Git repository
        self.setup_git_repository()
        
        # Step 4: Create deployment scripts
        self.create_deployment_scripts()
        
        # Step 5: Create frontend-backend sync
        self.create_frontend_backend_sync()
        
        # Step 6: Cleanup old Render code
        self.cleanup_old_render_code()
        
        print("\n" + "="*50)
        print("✅ AuraQuant Deployment Setup Complete!")
        print("="*50 + "\n")
        
        print("Next steps:")
        print("1. Set your environment variables in .env")
        print("2. Push to GitHub: git remote add origin <your-repo>")
        print("3. Deploy to Render: git push origin main")
        print("4. Configure webhooks in Render dashboard")
        print("5. Test paper trading mode first")
        print("\n🎉 AuraQuant is ready for deployment!")

if __name__ == "__main__":
    deployment = AuraQuantDeployment()
    deployment.run_deployment()
