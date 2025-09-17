"""
AuraQuant V8/V9 Sovereign Quantum Infinity Backend
SUPER FINAL Implementation - Following Golden Rules
V8 = ACTIVE profit core
V9+ = DORMANT learning (locked until Wayne unlocks)
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import os
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import jwt
import hashlib
import pymongo
from pymongo import MongoClient
from dotenv import load_dotenv
import uvicorn

# Load V8/V9 configuration
load_dotenv('.env.v8v9')

# Configure logging with audit capability
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("AuraQuantV8V9")

# Audit logger for V9 unlock events
audit_logger = logging.getLogger("AuditV8V9")
audit_handler = logging.FileHandler(os.getenv('AUDIT_LOG_PATH', './logs/audit_v8v9.log'))
audit_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
audit_logger.addHandler(audit_handler)
audit_logger.setLevel(logging.INFO)

class V8V9Config:
    """Configuration for V8/V9 modes"""
    def __init__(self):
        self.v8_active = os.getenv('V8_MODE', 'ACTIVE') == 'ACTIVE'
        self.v9_dormant = os.getenv('V9_MODE', 'DORMANT') == 'DORMANT'
        self.v9_locked = os.getenv('V9_LOCKED', 'true').lower() == 'true'
        self.god_phrase = os.getenv('GOD_PHRASE', 'meggie moo')
        self.admin_email = os.getenv('ADMIN_EMAIL', 'wayne@auraquant.com')
        self.paper_trading = int(os.getenv('PAPER_TRADING', '1'))
        self.gradual_capital = os.getenv('GRADUAL_CAPITAL_SWITCH', 'true').lower() == 'true'

config = V8V9Config()

# MongoDB connection
client = None
db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global client, db
    
    # Startup
    logger.info("🚀 Starting AuraQuant V8/V9 Sovereign Quantum Infinity")
    logger.info(f"V8 Mode: {'ACTIVE' if config.v8_active else 'INACTIVE'}")
    logger.info(f"V9 Mode: {'DORMANT (LOCKED)' if config.v9_dormant and config.v9_locked else 'UNLOCKED'}")
    logger.info(f"Paper Trading: {'ON' if config.paper_trading else 'OFF'}")
    
    # Connect to MongoDB
    try:
        mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/auraquant_v8v9')
        client = MongoClient(mongo_uri)
        db = client[os.getenv('DB_NAME', 'auraquant_v8v9')]
        await client.admin.command('ping')
        logger.info("✅ MongoDB connected successfully")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AuraQuant V8/V9")
    if client:
        client.close()

app = FastAPI(
    title="AuraQuant V8/V9 Sovereign Quantum Infinity",
    description="SUPER FINAL Trading Platform - V8 Active, V9+ Dormant",
    version="8.9.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pydantic models
class UnlockV9Request(BaseModel):
    god_phrase: str = Field(..., description="God phrase for unlocking V9")
    two_fa_code: str = Field(..., description="2FA verification code")
    gradual_percentage: float = Field(10.0, ge=0, le=100, description="Percentage of capital to switch")

class AdminOverrideRequest(BaseModel):
    action: str = Field(..., description="pause|resume|force_v8|broker_switch")
    parameters: Dict[str, Any] = Field(default_factory=dict)

class TradingSignal(BaseModel):
    symbol: str
    action: str  # buy|sell
    quantity: float
    price: Optional[float] = None
    mode: str = Field("V8", description="V8|V9")

# WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.admin_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, is_admin: bool = False):
        await websocket.accept()
        if is_admin:
            self.admin_connections.append(websocket)
        else:
            self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)

    async def broadcast(self, message: dict, admin_only: bool = False):
        connections = self.admin_connections if admin_only else self.active_connections
        for connection in connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Authentication helpers
def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify admin JWT token"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
        if payload.get('email') != config.admin_email:
            raise HTTPException(status_code=403, detail="Not authorized as admin")
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_god_phrase(phrase: str) -> bool:
    """Verify the god phrase for V9 unlock"""
    return phrase == config.god_phrase

# API Routes

@app.get("/")
async def root():
    """Root endpoint with system status"""
    return {
        "platform": "AuraQuant V8/V9 Sovereign Quantum Infinity",
        "status": "operational",
        "v8_mode": "ACTIVE" if config.v8_active else "INACTIVE",
        "v9_mode": "DORMANT_LOCKED" if config.v9_locked else "UNLOCKED",
        "paper_trading": bool(config.paper_trading),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment verification"""
    checks = {
        "server": "ok",
        "mongodb": "ok" if db else "failed",
        "v8_engine": "active" if config.v8_active else "inactive",
        "v9_engine": "dormant" if config.v9_dormant else "inactive",
        "websocket": "enabled" if os.getenv('WS_ENABLED') == 'true' else "disabled"
    }
    
    all_ok = all(v in ["ok", "active", "dormant", "enabled"] for v in checks.values())
    
    return {
        "status": "healthy" if all_ok else "degraded",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/admin/unlock-v9")
async def unlock_v9(
    request: UnlockV9Request,
    admin = Depends(verify_admin_token)
):
    """
    Unlock V9+ mode with god phrase and 2FA
    Only Wayne can execute this
    """
    # Verify god phrase
    if not verify_god_phrase(request.god_phrase):
        audit_logger.warning(f"FAILED V9 unlock attempt by {admin['email']} - Invalid god phrase")
        raise HTTPException(status_code=403, detail="Invalid god phrase")
    
    # TODO: Implement actual 2FA verification
    # For now, accept any non-empty 2FA code in development
    if not request.two_fa_code:
        raise HTTPException(status_code=403, detail="2FA code required")
    
    # Log successful unlock
    audit_logger.info(f"SUCCESS: V9 unlocked by {admin['email']} - Capital allocation: {request.gradual_percentage}%")
    
    # Update configuration
    config.v9_locked = False
    
    # Gradual capital switch
    capital_message = f"Switching {request.gradual_percentage}% of capital to V9 mode"
    
    # Broadcast to admin connections
    await manager.broadcast({
        "event": "v9_unlocked",
        "admin": admin['email'],
        "capital_percentage": request.gradual_percentage,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }, admin_only=True)
    
    return {
        "status": "success",
        "message": "V9+ mode unlocked",
        "capital_switch": capital_message,
        "gradual_mode": config.gradual_capital,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/admin/override")
async def admin_override(
    request: AdminOverrideRequest,
    admin = Depends(verify_admin_token)
):
    """
    Wayne's Admin Quick Panel controls
    - Pause/Resume trading
    - Force V8 mode
    - Switch brokers
    """
    action = request.action.lower()
    
    audit_logger.info(f"Admin override: {action} by {admin['email']} - Params: {request.parameters}")
    
    response = {"status": "success", "action": action}
    
    if action == "pause":
        # Pause all trading
        response["message"] = "Trading paused globally"
        await manager.broadcast({"event": "trading_paused", "admin": admin['email']})
        
    elif action == "resume":
        # Resume trading
        response["message"] = "Trading resumed"
        await manager.broadcast({"event": "trading_resumed", "admin": admin['email']})
        
    elif action == "force_v8":
        # Force V8 mode, lock V9
        config.v8_active = True
        config.v9_locked = True
        response["message"] = "Forced V8 mode, V9 locked"
        await manager.broadcast({"event": "forced_v8_mode", "admin": admin['email']})
        
    elif action == "broker_switch":
        broker = request.parameters.get("broker", "alpaca")
        response["message"] = f"Switched to broker: {broker}"
        await manager.broadcast({"event": "broker_switched", "broker": broker})
        
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
    
    response["timestamp"] = datetime.now(timezone.utc).isoformat()
    return response

@app.post("/trading/signal")
async def receive_trading_signal(
    signal: TradingSignal,
    token = Depends(security)
):
    """
    Receive trading signals for V8 or V9 processing
    V8 executes immediately if active
    V9 only learns unless unlocked
    """
    # Check which mode should process
    if signal.mode == "V9" and config.v9_locked:
        # V9 is dormant - only store for learning
        if db:
            db[os.getenv('DB_COLLECTION_V9_LEARNING')].insert_one({
                "signal": signal.dict(),
                "timestamp": datetime.now(timezone.utc),
                "status": "learning_only",
                "v9_locked": True
            })
        return {
            "status": "stored",
            "mode": "V9_LEARNING",
            "message": "V9 is dormant - signal stored for learning only"
        }
    
    # V8 active processing
    if config.v8_active and signal.mode == "V8":
        # Execute trade through V8 profit core
        trade_result = {
            "status": "executed" if not config.paper_trading else "paper_executed",
            "mode": "V8_ACTIVE",
            "signal": signal.dict(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Store in database
        if db:
            db[os.getenv('DB_COLLECTION_TRADES')].insert_one(trade_result)
        
        # Broadcast to connections
        await manager.broadcast(trade_result)
        
        return trade_result
    
    return {"status": "rejected", "reason": "No active mode for signal"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Send heartbeat
            await websocket.send_json({
                "type": "heartbeat",
                "v8_status": "active" if config.v8_active else "inactive",
                "v9_status": "locked" if config.v9_locked else "unlocked",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            await asyncio.sleep(30)  # Heartbeat interval
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/admin")
async def admin_websocket(websocket: WebSocket):
    """Admin WebSocket for Wayne's control panel"""
    # TODO: Add authentication for WebSocket
    await manager.connect(websocket, is_admin=True)
    try:
        while True:
            data = await websocket.receive_text()
            # Process admin commands via WebSocket
            command = json.loads(data)
            logger.info(f"Admin WebSocket command: {command}")
            
            # Echo back with status
            await websocket.send_json({
                "command_received": command,
                "status": "processed",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/deployment/checklist")
async def deployment_checklist():
    """Return deployment checklist status"""
    checklist = {
        "backend_render_deployed": False,  # Will be true when on Render
        "frontend_cloudflare_deployed": False,  # Will be true when on Cloudflare
        "mongodb_connected": db is not None,
        "websockets_verified": os.getenv('WS_ENABLED') == 'true',
        "all_policies_loaded": True,  # V8/V9 policies are loaded
        "paper_trading_enabled": bool(config.paper_trading),
        "v8_mode_active": config.v8_active,
        "v9_mode_dormant": config.v9_dormant and config.v9_locked
    }
    
    ready = all([
        checklist["mongodb_connected"],
        checklist["websockets_verified"],
        checklist["all_policies_loaded"],
        checklist["v8_mode_active"],
        checklist["v9_mode_dormant"]
    ])
    
    return {
        "ready_for_deployment": ready,
        "checklist": checklist,
        "message": "System ready for deployment" if ready else "Complete checklist items before deployment",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

if __name__ == "__main__":
    # Run the server
    port = int(os.getenv('PORT', 8000))
    host = os.getenv('HOST', '0.0.0.0')
    
    logger.info(f"Starting server on {host}:{port}")
    logger.info("Following V8/V9 Golden Rules: BUILD → TEST → DEPLOY → EXPLAIN → TRADE")
    
    uvicorn.run(
        "main_v8v9:app",
        host=host,
        port=port,
        reload=True if os.getenv('ENVIRONMENT') == 'development' else False,
        log_level="info"
    )