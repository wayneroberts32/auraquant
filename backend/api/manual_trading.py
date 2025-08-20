"""
API endpoints for manual trading with Plus500 and NAB
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/api/manual", tags=["Manual Trading"])

class ManualSignalRequest(BaseModel):
    broker: str  # PLUS500 or NAB
    symbol: str
    action: str  # BUY, SELL, CLOSE
    quantity: float
    price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    leverage: Optional[float] = 1.0
    reason: Optional[str] = ""
    urgency: Optional[str] = "normal"

class TradeConfirmation(BaseModel):
    broker: str
    symbol: str
    action: str
    quantity: float
    price: float
    order_id: Optional[str] = None
    notes: Optional[str] = ""

class BrokerLoginRequest(BaseModel):
    broker: str
    username: Optional[str] = None

@router.post("/signal")
async def create_manual_signal(request: Request, signal: ManualSignalRequest):
    """
    Generate a trading signal for manual execution
    Bot will send alerts via Discord/Telegram with execution instructions
    """
    try:
        manager = request.app.state.manual_brokers
        
        trading_signal = await manager.process_signal(
            broker=signal.broker,
            symbol=signal.symbol,
            action=signal.action,
            quantity=signal.quantity,
            price=signal.price,
            stop_loss=signal.stop_loss,
            take_profit=signal.take_profit,
            leverage=signal.leverage,
            reason=signal.reason,
            urgency=signal.urgency
        )
        
        if not trading_signal:
            raise HTTPException(status_code=400, detail=f"Broker {signal.broker} not available")
        
        return {
            "status": "success",
            "message": "Signal generated and alerts sent",
            "signal": trading_signal.to_dict(),
            "instructions": "Check Discord/Telegram for execution steps"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/confirm")
async def confirm_trade_execution(request: Request, confirmation: TradeConfirmation):
    """
    Confirm that a manual trade was executed
    Records the trade for tracking and position management
    """
    try:
        manager = request.app.state.manual_brokers
        
        trade = manager.record_trade(
            broker=confirmation.broker,
            symbol=confirmation.symbol,
            action=confirmation.action,
            quantity=confirmation.quantity,
            price=confirmation.price,
            order_id=confirmation.order_id,
            notes=confirmation.notes
        )
        
        return {
            "status": "success",
            "message": "Trade recorded successfully",
            "trade": trade
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/positions/{broker}")
async def get_broker_positions(request: Request, broker: str):
    """
    Get all open positions for a specific broker
    """
    try:
        manager = request.app.state.manual_brokers
        positions = manager.get_positions(broker.upper())
        
        return {
            "broker": broker,
            "positions": positions,
            "total_positions": len(positions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/open-broker")
async def open_broker_website(request: Request, login_request: BrokerLoginRequest):
    """
    Open broker website in browser for manual trading
    """
    try:
        manager = request.app.state.manual_brokers
        
        # Open the broker website
        manager.open_broker(login_request.broker)
        
        response = {
            "status": "success",
            "message": f"{login_request.broker} website opened in browser"
        }
        
        # Add login URL for reference
        if login_request.broker.upper() == "NAB":
            response["login_url"] = "https://ib.nab.com.au/nabib/index.jsp"
            response["instructions"] = "Please login with your NAB credentials"
        elif login_request.broker.upper() == "PLUS500":
            response["login_url"] = "https://app.plus500.com/trade"
            response["instructions"] = "Please login to Plus500 WebTrader"
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pending-signals")
async def get_pending_signals(request: Request):
    """
    Get all pending signals awaiting manual execution
    """
    try:
        manager = request.app.state.manual_brokers
        
        pending = []
        
        if manager.plus500:
            pending.extend([s.to_dict() for s in manager.plus500.pending_signals])
        
        if manager.nab:
            pending.extend([s.to_dict() for s in manager.nab.pending_signals])
        
        return {
            "pending_signals": pending,
            "total": len(pending)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk-signals")
async def create_bulk_signals(request: Request, signals: List[ManualSignalRequest]):
    """
    Generate multiple trading signals at once
    """
    try:
        manager = request.app.state.manual_brokers
        
        generated_signals = []
        for signal in signals:
            trading_signal = await manager.process_signal(
                broker=signal.broker,
                symbol=signal.symbol,
                action=signal.action,
                quantity=signal.quantity,
                price=signal.price,
                stop_loss=signal.stop_loss,
                take_profit=signal.take_profit,
                leverage=signal.leverage,
                reason=signal.reason,
                urgency=signal.urgency
            )
            
            if trading_signal:
                generated_signals.append(trading_signal)
        
        # Send bulk alert
        await manager.send_bulk_alert(generated_signals)
        
        return {
            "status": "success",
            "message": f"Generated {len(generated_signals)} signals",
            "signals": [s.to_dict() for s in generated_signals]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-status/{broker}")
async def check_market_status(request: Request, broker: str):
    """
    Check if the market is open for a specific broker
    """
    try:
        manager = request.app.state.manual_brokers
        
        if broker.upper() == "NAB" and manager.nab:
            is_open = await manager.nab.check_market_hours()
            return {
                "broker": "NAB",
                "market": "ASX",
                "is_open": is_open,
                "trading_hours": "10:00 AM - 4:00 PM Sydney time",
                "days": "Monday - Friday"
            }
        
        elif broker.upper() == "PLUS500":
            # Plus500 offers 24/5 trading on many instruments
            return {
                "broker": "Plus500",
                "market": "Various (CFDs)",
                "is_open": True,  # Depends on instrument
                "note": "Market hours vary by instrument",
                "forex": "24/5 (Sunday 5PM - Friday 5PM EST)",
                "stocks": "Follow underlying exchange hours"
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown broker: {broker}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trade-history/{broker}")
async def get_trade_history(request: Request, broker: str, limit: int = 50):
    """
    Get historical trades for a specific broker
    """
    try:
        manager = request.app.state.manual_brokers
        trades = manager.tracker.get_broker_trades(broker.upper())
        
        # Sort by timestamp (most recent first)
        trades.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Apply limit
        trades = trades[:limit]
        
        return {
            "broker": broker,
            "trades": trades,
            "total": len(trades)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear-signals/{broker}")
async def clear_pending_signals(request: Request, broker: str):
    """
    Clear all pending signals for a specific broker
    """
    try:
        manager = request.app.state.manual_brokers
        
        cleared = 0
        if broker.upper() == "PLUS500" and manager.plus500:
            cleared = len(manager.plus500.pending_signals)
            manager.plus500.pending_signals.clear()
        
        elif broker.upper() == "NAB" and manager.nab:
            cleared = len(manager.nab.pending_signals)
            manager.nab.pending_signals.clear()
        
        elif broker.upper() == "ALL":
            if manager.plus500:
                cleared += len(manager.plus500.pending_signals)
                manager.plus500.pending_signals.clear()
            if manager.nab:
                cleared += len(manager.nab.pending_signals)
                manager.nab.pending_signals.clear()
        
        return {
            "status": "success",
            "message": f"Cleared {cleared} pending signals",
            "broker": broker
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for real-time signal updates
@router.websocket("/ws/signals")
async def websocket_signals(websocket):
    """
    WebSocket connection for real-time signal updates
    """
    await websocket.accept()
    
    try:
        while True:
            # Wait for signals from the manager
            # This would be connected to the notification queue
            data = await websocket.receive_text()
            
            # Echo back for now
            await websocket.send_text(f"Signal received: {data}")
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()
