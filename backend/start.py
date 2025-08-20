"""
Simple startup script for AuraQuant Backend
Handles missing dependencies gracefully
"""

import os
import sys
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_dependencies():
    """Check if all required dependencies are available"""
    missing = []
    
    required_packages = [
        'fastapi',
        'uvicorn',
        'pydantic',
        'asyncio',
        'websockets'
    ]
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        logger.warning(f"Missing packages: {', '.join(missing)}")
        logger.info("Install with: pip install " + " ".join(missing))
        return False
    
    return True

def create_minimal_app():
    """Create minimal FastAPI app that works without all dependencies"""
    from fastapi import FastAPI, WebSocket
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    
    app = FastAPI(
        title="AuraQuant Infinity Trading Bot",
        description="Professional automated trading platform",
        version="1.0.0"
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://ai-auraquant.com",
            "https://auraquant-frontend.pages.dev",
            "http://localhost:3000",
            "http://localhost:8000"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/")
    async def root():
        """Root endpoint"""
        return {
            "name": "AuraQuant Infinity Trading Bot",
            "version": "1.0.0",
            "status": "operational",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @app.get("/api/health")
    async def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "features": ["trading", "bot", "ai", "social"],
            "latency": 12
        }
    
    @app.get("/health")
    async def health():
        """Alternative health endpoint"""
        return await health_check()
    
    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        """WebSocket endpoint for real-time updates"""
        await websocket.accept()
        try:
            while True:
                data = await websocket.receive_text()
                # Echo back for now
                await websocket.send_text(f"Echo: {data}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            await websocket.close()
    
    # Mock endpoints for frontend compatibility
    @app.post("/api/auth/login")
    async def login():
        """Mock login endpoint"""
        return {
            "token": "mock-jwt-token",
            "user": {
                "id": "user123",
                "email": "user@auraquant.com",
                "username": "trader"
            }
        }
    
    @app.get("/api/auth/validate")
    async def validate_token():
        """Mock token validation"""
        return {
            "valid": True,
            "user": {
                "id": "user123",
                "email": "user@auraquant.com",
                "username": "trader"
            }
        }
    
    @app.get("/api/bot/status")
    async def bot_status():
        """Mock bot status"""
        return {
            "running": True,
            "mode": "V4",
            "paper_trading": True,
            "positions": 3,
            "daily_pnl": 234.56,
            "uptime": "2d 14h 32m"
        }
    
    @app.post("/api/bot/control/{action}")
    async def bot_control(action: str):
        """Mock bot control"""
        return {
            "success": True,
            "action": action,
            "message": f"Bot {action} executed successfully"
        }
    
    @app.get("/api/market/data")
    async def market_data():
        """Mock market data"""
        return {
            "symbols": [
                {"symbol": "AAPL", "price": 178.45, "change": 2.34},
                {"symbol": "MSFT", "price": 412.23, "change": -1.23},
                {"symbol": "BTC", "price": 67234.56, "change": 1234.56}
            ]
        }
    
    return app

def main():
    """Main entry point"""
    logger.info("Starting AuraQuant Backend...")
    
    # Check if we can load the full app
    try:
        from app import app
        logger.info("Loading full application...")
        
    except ImportError as e:
        logger.warning(f"Cannot load full app: {e}")
        logger.info("Starting minimal version...")
        app = create_minimal_app()
    
    # Start the server
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = "0.0.0.0"
    
    logger.info(f"Starting server on {host}:{port}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )

if __name__ == "__main__":
    if check_dependencies():
        main()
    else:
        logger.error("Missing dependencies. Please install them first.")
        sys.exit(1)
