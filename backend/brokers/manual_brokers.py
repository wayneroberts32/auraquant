"""
Manual Broker Integration for Plus500 and NAB
Handles signal generation, alerts, and browser automation for non-API brokers
"""

import os
import json
import asyncio
import webbrowser
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class SignalType(Enum):
    BUY = "BUY"
    SELL = "SELL"
    CLOSE = "CLOSE"
    STOP_LOSS = "STOP_LOSS"
    TAKE_PROFIT = "TAKE_PROFIT"

@dataclass
class TradingSignal:
    broker: str
    symbol: str
    signal_type: SignalType
    price: float
    quantity: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    reason: str = ""
    urgency: str = "normal"  # low, normal, high, critical
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
    
    def to_dict(self):
        return {
            "broker": self.broker,
            "symbol": self.symbol,
            "signal_type": self.signal_type.value,
            "price": self.price,
            "quantity": self.quantity,
            "stop_loss": self.stop_loss,
            "take_profit": self.take_profit,
            "reason": self.reason,
            "urgency": self.urgency,
            "timestamp": self.timestamp.isoformat()
        }

class ManualBrokerHandler:
    """Base class for manual broker integrations"""
    
    def __init__(self, broker_name: str, config: Dict[str, Any]):
        self.broker_name = broker_name
        self.config = config
        self.pending_signals = []
        self.executed_trades = []
        self.notification_handlers = []
        
    async def generate_signal(self, 
                             symbol: str,
                             signal_type: SignalType,
                             price: float,
                             quantity: float,
                             **kwargs) -> TradingSignal:
        """Generate a trading signal for manual execution"""
        
        signal = TradingSignal(
            broker=self.broker_name,
            symbol=symbol,
            signal_type=signal_type,
            price=price,
            quantity=quantity,
            **kwargs
        )
        
        self.pending_signals.append(signal)
        await self.send_notifications(signal)
        
        return signal
    
    async def send_notifications(self, signal: TradingSignal):
        """Send signal notifications through all configured channels"""
        
        # Format the message
        message = self.format_signal_message(signal)
        
        # Send through all notification handlers
        for handler in self.notification_handlers:
            try:
                await handler.send(message, signal.urgency)
            except Exception as e:
                logger.error(f"Failed to send notification via {handler.__class__.__name__}: {e}")
    
    def format_signal_message(self, signal: TradingSignal) -> str:
        """Format signal into readable message"""
        
        emoji_map = {
            SignalType.BUY: "🟢",
            SignalType.SELL: "🔴",
            SignalType.CLOSE: "⚪",
            SignalType.STOP_LOSS: "🛑",
            SignalType.TAKE_PROFIT: "🎯"
        }
        
        urgency_emoji = {
            "low": "🔵",
            "normal": "🟡",
            "high": "🟠",
            "critical": "🔴"
        }
        
        message = f"""
{emoji_map[signal.signal_type]} **{signal.signal_type.value} Signal - {self.broker_name}**
{urgency_emoji[signal.urgency]} Urgency: {signal.urgency.upper()}

📊 **Symbol:** {signal.symbol}
💰 **Price:** ${signal.price:.2f}
📦 **Quantity:** {signal.quantity}
"""
        
        if signal.stop_loss:
            message += f"🛑 **Stop Loss:** ${signal.stop_loss:.2f}\n"
        
        if signal.take_profit:
            message += f"🎯 **Take Profit:** ${signal.take_profit:.2f}\n"
        
        if signal.reason:
            message += f"\n📝 **Reason:** {signal.reason}\n"
        
        message += f"\n⏰ **Time:** {signal.timestamp.strftime('%Y-%m-%d %H:%M:%S AWST')}"
        
        return message
    
    def open_broker_website(self):
        """Open broker website in default browser"""
        raise NotImplementedError("Subclasses must implement open_broker_website")
    
    async def confirm_execution(self, signal_id: str, executed: bool = True):
        """Confirm that a signal was manually executed"""
        # Find and update signal status
        for signal in self.pending_signals:
            if str(id(signal)) == signal_id:
                if executed:
                    self.executed_trades.append(signal)
                    self.pending_signals.remove(signal)
                    logger.info(f"Signal {signal_id} marked as executed")
                else:
                    logger.info(f"Signal {signal_id} marked as skipped")
                return True
        return False

class Plus500Handler(ManualBrokerHandler):
    """Handler for Plus500 manual trading signals"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("Plus500", config)
        self.webtrader_url = "https://app.plus500.com/trade"
        self.enabled = config.get("PLUS500_ENABLED", False)
        
    def open_broker_website(self):
        """Open Plus500 WebTrader in browser"""
        webbrowser.open(self.webtrader_url)
        logger.info("Opened Plus500 WebTrader in browser")
    
    async def generate_cfd_signal(self,
                                  symbol: str,
                                  direction: str,
                                  leverage: float = 1.0,
                                  **kwargs) -> TradingSignal:
        """Generate CFD-specific signal for Plus500"""
        
        signal_type = SignalType.BUY if direction.upper() == "LONG" else SignalType.SELL
        
        # Add CFD-specific information
        kwargs["reason"] = kwargs.get("reason", "") + f" | Leverage: {leverage}x"
        
        return await self.generate_signal(
            symbol=symbol,
            signal_type=signal_type,
            **kwargs
        )
    
    def format_signal_message(self, signal: TradingSignal) -> str:
        """Format Plus500-specific signal message"""
        
        base_message = super().format_signal_message(signal)
        
        # Add Plus500-specific instructions
        instructions = f"""

📋 **Manual Execution Steps:**
1. Click here to open Plus500: {self.webtrader_url}
2. Search for: {signal.symbol}
3. Click {signal.signal_type.value}
4. Set amount: {signal.quantity}
"""
        
        if signal.stop_loss:
            instructions += f"5. Set Stop Loss: ${signal.stop_loss:.2f}\n"
        
        if signal.take_profit:
            instructions += f"6. Set Take Profit: ${signal.take_profit:.2f}\n"
        
        instructions += "7. Confirm and execute trade\n"
        instructions += "8. Reply 'DONE' when executed"
        
        return base_message + instructions

class NABHandler(ManualBrokerHandler):
    """Handler for NAB (National Australia Bank) manual trading"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("NAB", config)
        self.login_url = config.get("NAB_LOGIN_URL", "https://ib.nab.com.au/nabib/index.jsp")
        self.enabled = config.get("NAB_ENABLED", True)
        self.account_number = config.get("NAB_ACCOUNT_NUMBER", "")
        self.username = config.get("NAB_USERNAME", "")
        
    def open_broker_website(self):
        """Open NAB Internet Banking in browser"""
        webbrowser.open(self.login_url)
        logger.info("Opened NAB Internet Banking login page")
        
        # If we have stored username, we could use browser automation
        # to pre-fill it (requires additional setup)
        if self.username:
            logger.info(f"Username for login: {self.username[:3]}***")
    
    async def generate_asx_signal(self,
                                  asx_code: str,
                                  signal_type: SignalType,
                                  shares: int,
                                  **kwargs) -> TradingSignal:
        """Generate ASX-specific signal for NAB trading"""
        
        # Ensure we're dealing with ASX stocks
        if not asx_code.endswith(".AX"):
            asx_code += ".AX"
        
        return await self.generate_signal(
            symbol=asx_code,
            signal_type=signal_type,
            quantity=shares,
            **kwargs
        )
    
    def format_signal_message(self, signal: TradingSignal) -> str:
        """Format NAB-specific signal message"""
        
        base_message = super().format_signal_message(signal)
        
        # Add NAB-specific instructions
        instructions = f"""

🏦 **NAB Trading Instructions:**
1. Open NAB Trading: {self.login_url}
2. Login with your credentials
3. Navigate to Share Trading
4. Search for: {signal.symbol.replace('.AX', '')}
5. Select {signal.signal_type.value} order
6. Enter quantity: {int(signal.quantity)} shares
7. Set order type: MARKET or LIMIT @ ${signal.price:.2f}
"""
        
        if signal.stop_loss:
            instructions += f"8. Consider setting Stop Loss order at: ${signal.stop_loss:.2f}\n"
        
        instructions += """9. Review brokerage fees
10. Confirm and submit order
11. Note the order number
12. Reply with 'EXECUTED [order_number]' when done"""
        
        return base_message + instructions
    
    async def check_market_hours(self) -> bool:
        """Check if ASX market is open"""
        from datetime import datetime
        import pytz
        
        sydney_tz = pytz.timezone('Australia/Sydney')
        now = datetime.now(sydney_tz)
        
        # ASX trading hours: 10:00 AM - 4:00 PM Sydney time, Mon-Fri
        if now.weekday() >= 5:  # Weekend
            return False
        
        market_open = now.replace(hour=10, minute=0, second=0)
        market_close = now.replace(hour=16, minute=0, second=0)
        
        return market_open <= now <= market_close

class ManualTradeTracker:
    """Track manually executed trades for record keeping"""
    
    def __init__(self):
        self.trades_file = "manual_trades.json"
        self.trades = self.load_trades()
        
    def load_trades(self) -> List[Dict]:
        """Load existing manual trades from file"""
        if os.path.exists(self.trades_file):
            with open(self.trades_file, 'r') as f:
                return json.load(f)
        return []
    
    def save_trades(self):
        """Save trades to file"""
        with open(self.trades_file, 'w') as f:
            json.dump(self.trades, f, indent=2, default=str)
    
    def add_trade(self, 
                  broker: str,
                  symbol: str,
                  action: str,
                  quantity: float,
                  price: float,
                  order_id: str = None,
                  notes: str = ""):
        """Add a manually executed trade"""
        
        trade = {
            "id": len(self.trades) + 1,
            "timestamp": datetime.now().isoformat(),
            "broker": broker,
            "symbol": symbol,
            "action": action,
            "quantity": quantity,
            "price": price,
            "value": quantity * price,
            "order_id": order_id,
            "notes": notes,
            "status": "executed"
        }
        
        self.trades.append(trade)
        self.save_trades()
        
        logger.info(f"Recorded manual trade: {broker} {action} {quantity} {symbol} @ ${price}")
        
        return trade
    
    def get_broker_trades(self, broker: str) -> List[Dict]:
        """Get all trades for a specific broker"""
        return [t for t in self.trades if t["broker"] == broker]
    
    def get_position(self, broker: str, symbol: str) -> Dict:
        """Calculate current position for a symbol"""
        trades = [t for t in self.trades 
                 if t["broker"] == broker and t["symbol"] == symbol]
        
        position = {
            "symbol": symbol,
            "quantity": 0,
            "avg_price": 0,
            "total_value": 0
        }
        
        for trade in trades:
            if trade["action"] in ["BUY", "LONG"]:
                position["quantity"] += trade["quantity"]
                position["total_value"] += trade["value"]
            elif trade["action"] in ["SELL", "SHORT"]:
                position["quantity"] -= trade["quantity"]
                position["total_value"] -= trade["value"]
        
        if position["quantity"] > 0:
            position["avg_price"] = position["total_value"] / position["quantity"]
        
        return position

class ManualBrokerManager:
    """Manage all manual broker integrations"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.plus500 = Plus500Handler(config) if config.get("PLUS500_ENABLED") else None
        self.nab = NABHandler(config) if config.get("NAB_ENABLED") else None
        self.tracker = ManualTradeTracker()
        self.notification_queue = asyncio.Queue()
        
    async def process_signal(self, 
                           broker: str,
                           symbol: str,
                           action: str,
                           quantity: float,
                           price: float,
                           **kwargs) -> TradingSignal:
        """Process a trading signal for manual execution"""
        
        if broker.upper() == "PLUS500" and self.plus500:
            signal_type = SignalType[action.upper()]
            return await self.plus500.generate_signal(
                symbol=symbol,
                signal_type=signal_type,
                price=price,
                quantity=quantity,
                **kwargs
            )
        
        elif broker.upper() == "NAB" and self.nab:
            signal_type = SignalType[action.upper()]
            return await self.nab.generate_asx_signal(
                asx_code=symbol,
                signal_type=signal_type,
                shares=int(quantity),
                price=price,
                **kwargs
            )
        
        else:
            logger.warning(f"Unknown or disabled broker: {broker}")
            return None
    
    def open_broker(self, broker: str):
        """Open specific broker website"""
        if broker.upper() == "PLUS500" and self.plus500:
            self.plus500.open_broker_website()
        elif broker.upper() == "NAB" and self.nab:
            self.nab.open_broker_website()
        else:
            logger.warning(f"Cannot open broker: {broker}")
    
    def record_trade(self, broker: str, **trade_details):
        """Record a manually executed trade"""
        return self.tracker.add_trade(broker=broker, **trade_details)
    
    def get_positions(self, broker: str) -> List[Dict]:
        """Get all positions for a broker"""
        trades = self.tracker.get_broker_trades(broker)
        
        # Group by symbol
        symbols = set(t["symbol"] for t in trades)
        positions = []
        
        for symbol in symbols:
            position = self.tracker.get_position(broker, symbol)
            if position["quantity"] != 0:  # Only show open positions
                positions.append(position)
        
        return positions
    
    async def send_bulk_alert(self, signals: List[TradingSignal]):
        """Send multiple signals as a single alert"""
        if not signals:
            return
        
        message = "📊 **BULK TRADING SIGNALS**\n"
        message += f"Total signals: {len(signals)}\n\n"
        
        for i, signal in enumerate(signals, 1):
            message += f"Signal #{i}:\n"
            message += f"  • {signal.broker}: {signal.signal_type.value} {signal.quantity} {signal.symbol} @ ${signal.price:.2f}\n"
        
        message += "\n⚠️ Please execute these trades in order"
        
        # Send through notification channels
        await self.notification_queue.put(message)

# Integration with main application
async def setup_manual_brokers(app):
    """Setup manual broker handlers in the FastAPI app"""
    
    config = app.state.config
    
    # Initialize manual broker manager
    manager = ManualBrokerManager(config)
    
    # Add notification handlers (Discord, Telegram, etc.)
    if config.get("ENABLE_DISCORD_ALERTS"):
        from ..notifications.discord_bot import DiscordNotifier
        discord = DiscordNotifier(config)
        if manager.plus500:
            manager.plus500.notification_handlers.append(discord)
        if manager.nab:
            manager.nab.notification_handlers.append(discord)
    
    if config.get("ENABLE_TELEGRAM_ALERTS"):
        from ..notifications.telegram_bot import TelegramNotifier
        telegram = TelegramNotifier(config)
        if manager.plus500:
            manager.plus500.notification_handlers.append(telegram)
        if manager.nab:
            manager.nab.notification_handlers.append(telegram)
    
    # Store in app state
    app.state.manual_brokers = manager
    
    logger.info("Manual broker handlers initialized")
    
    return manager
