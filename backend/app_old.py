"""
AuraQuant Infinity Trading Bot - Main Backend Application
FastAPI backend with WebSocket support for real-time trading
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import asyncio
import uvicorn
import json
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging
from decimal import Decimal
import hashlib
import hmac
import time

# Import custom modules
from core.bot_engine import BotEngine
from core.risk_manager import RiskManager
from core.position_manager import PositionManager
from compliance.enforcer import ComplianceEnforcer
from brokers.broker_manager import BrokerManager
from data.market_data import MarketDataManager
from utils.database import Database
from utils.cache import CacheManager
from webhooks.webhook_handler import WebhookHandler
from models.models import User, Order, Position, Trade, Alert
from config.settings import Settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend/logs/app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load settings
settings = Settings()

# Security
security = HTTPBearer()

class ConnectionManager:
    """Manages WebSocket connections"""
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected")
        
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected")
            
    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)
            
    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

# Initialize managers
connection_manager = ConnectionManager()
bot_engine = None
risk_manager = None
position_manager = None
compliance_enforcer = None
broker_manager = None
market_data_manager = None
database = None
cache_manager = None
webhook_handler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global bot_engine, risk_manager, position_manager, compliance_enforcer
    global broker_manager, market_data_manager, database, cache_manager, webhook_handler
    
    # Startup
    logger.info("Starting AuraQuant Backend...")
    
    # Initialize database
    database = Database(settings.DATABASE_URL)
    await database.connect()
    
    # Initialize cache
    cache_manager = CacheManager(settings.REDIS_URL)
    await cache_manager.connect()
    
    # Initialize managers
    risk_manager = RiskManager(database, cache_manager)
    position_manager = PositionManager(database, cache_manager)
    compliance_enforcer = ComplianceEnforcer(database)
    broker_manager = BrokerManager(settings)
    market_data_manager = MarketDataManager(settings)
    webhook_handler = WebhookHandler(settings)
    
    # Initialize bot engine
    bot_engine = BotEngine(
        risk_manager=risk_manager,
        position_manager=position_manager,
        compliance_enforcer=compliance_enforcer,
        broker_manager=broker_manager,
        market_data_manager=market_data_manager,
        database=database,
        cache_manager=cache_manager
    )
    
    # Start background tasks
    asyncio.create_task(market_data_manager.start_streaming())
    asyncio.create_task(bot_engine.start())
    
    logger.info("AuraQuant Backend started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AuraQuant Backend...")
    
    # Stop bot engine
    await bot_engine.stop()
    
    # Close connections
    await market_data_manager.stop_streaming()
    await database.disconnect()
    await cache_manager.disconnect()
    
    logger.info("AuraQuant Backend shut down")

# Create FastAPI app
app = FastAPI(
    title="AuraQuant Infinity Trading Bot",
    description="Professional automated trading platform with quantum calculations",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication dependency
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token"""
    token = credentials.credentials
    # TODO: Implement proper JWT verification
    return {"user_id": "user123", "email": "user@example.com"}

# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "AuraQuant Infinity Trading Bot",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    checks = {
        "database": await database.health_check() if database else False,
        "cache": await cache_manager.health_check() if cache_manager else False,
        "bot_engine": bot_engine.is_running() if bot_engine else False,
        "brokers": broker_manager.get_connected_brokers() if broker_manager else []
    }
    
    status = "healthy" if all([
        checks["database"],
        checks["cache"],
        checks["bot_engine"]
    ]) else "unhealthy"
    
    return {
        "status": status,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }

# ==================== BOT CONTROL ====================

@app.post("/bot/start")
async def start_bot(
    version: str,
    mode: str,
    capital: float,
    user = Depends(verify_token)
):
    """Start the trading bot"""
    try:
        # Compliance check
        compliance_result = await compliance_enforcer.pre_trade_check(
            user=user,
            capital=capital
        )
        
        if not compliance_result["allowed"]:
            raise HTTPException(status_code=403, detail=compliance_result["reason"])
        
        # Start bot
        result = await bot_engine.start_bot(
            user_id=user["user_id"],
            version=version,
            mode=mode,
            capital=capital
        )
        
        return {"status": "started", "bot_id": result["bot_id"]}
    except Exception as e:
        logger.error(f"Error starting bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/bot/stop")
async def stop_bot(user = Depends(verify_token)):
    """Stop the trading bot"""
    try:
        await bot_engine.stop_bot(user["user_id"])
        return {"status": "stopped"}
    except Exception as e:
        logger.error(f"Error stopping bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/bot/pause")
async def pause_bot(user = Depends(verify_token)):
    """Pause the trading bot"""
    try:
        await bot_engine.pause_bot(user["user_id"])
        return {"status": "paused"}
    except Exception as e:
        logger.error(f"Error pausing bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/bot/resume")
async def resume_bot(user = Depends(verify_token)):
    """Resume the trading bot"""
    try:
        await bot_engine.resume_bot(user["user_id"])
        return {"status": "resumed"}
    except Exception as e:
        logger.error(f"Error resuming bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/bot/emergency-stop")
async def emergency_stop(user = Depends(verify_token)):
    """Emergency stop - close all positions immediately"""
    try:
        result = await risk_manager.emergency_stop(user["user_id"])
        return {"status": "emergency_stopped", "positions_closed": result["positions_closed"]}
    except Exception as e:
        logger.error(f"Error in emergency stop: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/bot/status")
async def get_bot_status(user = Depends(verify_token)):
    """Get current bot status"""
    try:
        status = await bot_engine.get_status(user["user_id"])
        return status
    except Exception as e:
        logger.error(f"Error getting bot status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== TRADING ====================

@app.post("/orders")
async def place_order(
    symbol: str,
    side: str,
    order_type: str,
    quantity: float,
    price: Optional[float] = None,
    stop_price: Optional[float] = None,
    take_profit: Optional[float] = None,
    user = Depends(verify_token)
):
    """Place a trading order"""
    try:
        # Risk check
        risk_check = await risk_manager.check_order_risk(
            user_id=user["user_id"],
            symbol=symbol,
            quantity=quantity,
            side=side
        )
        
        if not risk_check["allowed"]:
            raise HTTPException(status_code=403, detail=risk_check["reason"])
        
        # Place order
        order = await broker_manager.place_order(
            user_id=user["user_id"],
            symbol=symbol,
            side=side,
            order_type=order_type,
            quantity=quantity,
            price=price,
            stop_price=stop_price,
            take_profit=take_profit
        )
        
        return order
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/orders")
async def get_orders(
    status: Optional[str] = None,
    limit: int = 100,
    user = Depends(verify_token)
):
    """Get user orders"""
    try:
        orders = await database.get_orders(
            user_id=user["user_id"],
            status=status,
            limit=limit
        )
        return orders
    except Exception as e:
        logger.error(f"Error getting orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/orders/{order_id}")
async def cancel_order(order_id: str, user = Depends(verify_token)):
    """Cancel an order"""
    try:
        result = await broker_manager.cancel_order(
            user_id=user["user_id"],
            order_id=order_id
        )
        return result
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/positions")
async def get_positions(user = Depends(verify_token)):
    """Get current positions"""
    try:
        positions = await position_manager.get_positions(user["user_id"])
        return positions
    except Exception as e:
        logger.error(f"Error getting positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/positions/{position_id}/close")
async def close_position(position_id: str, user = Depends(verify_token)):
    """Close a position"""
    try:
        result = await position_manager.close_position(
            user_id=user["user_id"],
            position_id=position_id
        )
        return result
    except Exception as e:
        logger.error(f"Error closing position: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PORTFOLIO ====================

@app.get("/portfolio")
async def get_portfolio(user = Depends(verify_token)):
    """Get portfolio summary"""
    try:
        portfolio = await database.get_portfolio(user["user_id"])
        return portfolio
    except Exception as e:
        logger.error(f"Error getting portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/portfolio/performance")
async def get_performance(
    period: str = "1D",
    user = Depends(verify_token)
):
    """Get portfolio performance"""
    try:
        performance = await database.get_performance(
            user_id=user["user_id"],
            period=period
        )
        return performance
    except Exception as e:
        logger.error(f"Error getting performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== MARKET DATA ====================

@app.get("/market/quote/{symbol}")
async def get_quote(symbol: str):
    """Get real-time quote for a symbol"""
    try:
        quote = await market_data_manager.get_quote(symbol)
        return quote
    except Exception as e:
        logger.error(f"Error getting quote: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/market/candles/{symbol}")
async def get_candles(
    symbol: str,
    timeframe: str = "1m",
    limit: int = 100
):
    """Get historical candles"""
    try:
        candles = await market_data_manager.get_candles(
            symbol=symbol,
            timeframe=timeframe,
            limit=limit
        )
        return candles
    except Exception as e:
        logger.error(f"Error getting candles: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/market/screener")
async def run_screener(
    screener_type: str,
    filters: Optional[str] = None
):
    """Run market screener"""
    try:
        results = await market_data_manager.run_screener(
            screener_type=screener_type,
            filters=json.loads(filters) if filters else {}
        )
        return results
    except Exception as e:
        logger.error(f"Error running screener: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BROKER MANAGEMENT ====================

@app.post("/brokers/connect")
async def connect_broker(
    broker: str,
    api_key: str,
    api_secret: str,
    additional_params: Optional[Dict] = None,
    user = Depends(verify_token)
):
    """Connect a broker account"""
    try:
        result = await broker_manager.connect_broker(
            user_id=user["user_id"],
            broker=broker,
            api_key=api_key,
            api_secret=api_secret,
            additional_params=additional_params
        )
        return result
    except Exception as e:
        logger.error(f"Error connecting broker: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/brokers/{broker}")
async def disconnect_broker(broker: str, user = Depends(verify_token)):
    """Disconnect a broker"""
    try:
        result = await broker_manager.disconnect_broker(
            user_id=user["user_id"],
            broker=broker
        )
        return result
    except Exception as e:
        logger.error(f"Error disconnecting broker: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/brokers")
async def get_brokers(user = Depends(verify_token)):
    """Get connected brokers"""
    try:
        brokers = await broker_manager.get_user_brokers(user["user_id"])
        return brokers
    except Exception as e:
        logger.error(f"Error getting brokers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== COMPLIANCE ====================

@app.get("/compliance/check")
async def compliance_check(user = Depends(verify_token)):
    """Check compliance status"""
    try:
        status = await compliance_enforcer.get_compliance_status(user["user_id"])
        return status
    except Exception as e:
        logger.error(f"Error checking compliance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/compliance/jurisdictions")
async def get_jurisdictions():
    """Get supported jurisdictions"""
    try:
        jurisdictions = await compliance_enforcer.get_jurisdictions()
        return jurisdictions
    except Exception as e:
        logger.error(f"Error getting jurisdictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== RISK MANAGEMENT ====================

@app.get("/risk/metrics")
async def get_risk_metrics(user = Depends(verify_token)):
    """Get current risk metrics"""
    try:
        metrics = await risk_manager.get_risk_metrics(user["user_id"])
        return metrics
    except Exception as e:
        logger.error(f"Error getting risk metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/risk/settings")
async def update_risk_settings(
    max_drawdown: float,
    max_position_size: float,
    max_daily_loss: float,
    user = Depends(verify_token)
):
    """Update risk settings"""
    try:
        result = await risk_manager.update_settings(
            user_id=user["user_id"],
            max_drawdown=max_drawdown,
            max_position_size=max_position_size,
            max_daily_loss=max_daily_loss
        )
        return result
    except Exception as e:
        logger.error(f"Error updating risk settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== WEBHOOKS ====================

@app.post("/webhook/tradingview")
async def tradingview_webhook(request: Request):
    """Handle TradingView webhook"""
    try:
        # Verify webhook signature
        signature = request.headers.get("X-Webhook-Signature")
        body = await request.body()
        
        if not webhook_handler.verify_signature(body, signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Process webhook
        data = await request.json()
        result = await webhook_handler.process_tradingview(data)
        return result
    except Exception as e:
        logger.error(f"Error processing TradingView webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/webhook/broker")
async def broker_webhook(request: Request):
    """Handle broker webhook"""
    try:
        data = await request.json()
        result = await webhook_handler.process_broker(data)
        return result
    except Exception as e:
        logger.error(f"Error processing broker webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== WEBSOCKET ====================

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time updates"""
    await connection_manager.connect(websocket, client_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Process message
            if message["type"] == "subscribe":
                # Subscribe to market data
                await market_data_manager.subscribe(
                    client_id=client_id,
                    symbols=message["symbols"]
                )
            elif message["type"] == "unsubscribe":
                # Unsubscribe from market data
                await market_data_manager.unsubscribe(
                    client_id=client_id,
                    symbols=message["symbols"]
                )
            elif message["type"] == "ping":
                # Respond to ping
                await websocket.send_text(json.dumps({"type": "pong"}))
            
    except WebSocketDisconnect:
        connection_manager.disconnect(client_id)
        await market_data_manager.unsubscribe_all(client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        connection_manager.disconnect(client_id)

# ==================== ALERTS ====================

@app.get("/alerts")
async def get_alerts(
    limit: int = 100,
    user = Depends(verify_token)
):
    """Get user alerts"""
    try:
        alerts = await database.get_alerts(
            user_id=user["user_id"],
            limit=limit
        )
        return alerts
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/alerts/acknowledge/{alert_id}")
async def acknowledge_alert(alert_id: str, user = Depends(verify_token)):
    """Acknowledge an alert"""
    try:
        result = await database.acknowledge_alert(
            user_id=user["user_id"],
            alert_id=alert_id
        )
        return result
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BACKTESTING ====================

@app.post("/backtest")
async def run_backtest(
    strategy: str,
    symbol: str,
    start_date: str,
    end_date: str,
    initial_capital: float,
    parameters: Optional[Dict] = None,
    user = Depends(verify_token)
):
    """Run strategy backtest"""
    try:
        from strategies.backtester import Backtester
        
        backtester = Backtester(database, market_data_manager)
        result = await backtester.run(
            user_id=user["user_id"],
            strategy=strategy,
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital,
            parameters=parameters or {}
        )
        return result
    except Exception as e:
        logger.error(f"Error running backtest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== AI INTEGRATION ====================

@app.post("/ai/analyze")
async def ai_analyze(
    symbol: str,
    analysis_type: str,
    user = Depends(verify_token)
):
    """AI market analysis"""
    try:
        from core.ai_analyzer import AIAnalyzer
        
        analyzer = AIAnalyzer(settings)
        result = await analyzer.analyze(
            symbol=symbol,
            analysis_type=analysis_type
        )
        return result
    except Exception as e:
        logger.error(f"Error in AI analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SOCIAL ====================

@app.post("/social/broadcast")
async def broadcast_message(
    message: str,
    platforms: List[str],
    user = Depends(verify_token)
):
    """Broadcast message to social platforms"""
    try:
        from core.social_manager import SocialManager
        
        social = SocialManager(settings)
        result = await social.broadcast(
            user_id=user["user_id"],
            message=message,
            platforms=platforms
        )
        return result
    except Exception as e:
        logger.error(f"Error broadcasting message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SETTINGS ====================

@app.get("/settings")
async def get_settings(user = Depends(verify_token)):
    """Get user settings"""
    try:
        settings = await database.get_user_settings(user["user_id"])
        return settings
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/settings")
async def update_settings(
    settings_data: Dict,
    user = Depends(verify_token)
):
    """Update user settings"""
    try:
        result = await database.update_user_settings(
            user_id=user["user_id"],
            settings=settings_data
        )
        return result
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BACKUP ====================

@app.post("/backup")
async def create_backup(user = Depends(verify_token)):
    """Create data backup"""
    try:
        from utils.backup import BackupManager
        
        backup = BackupManager(database, settings)
        result = await backup.create_backup(user["user_id"])
        return result
    except Exception as e:
        logger.error(f"Error creating backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/restore")
async def restore_backup(
    backup_id: str,
    user = Depends(verify_token)
):
    """Restore from backup"""
    try:
        from utils.backup import BackupManager
        
        backup = BackupManager(database, settings)
        result = await backup.restore(
            user_id=user["user_id"],
            backup_id=backup_id
        )
        return result
    except Exception as e:
        logger.error(f"Error restoring backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
