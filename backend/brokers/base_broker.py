"""
Base Broker Interface
Defines the unified interface for all broker integrations
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from datetime import datetime
from enum import Enum
from dataclasses import dataclass
import asyncio
import logging

logger = logging.getLogger(__name__)

class OrderType(Enum):
    """Order types"""
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"
    TRAILING_STOP = "trailing_stop"
    MOC = "moc"  # Market on close
    LOC = "loc"  # Limit on close

class OrderSide(Enum):
    """Order side"""
    BUY = "buy"
    SELL = "sell"

class OrderStatus(Enum):
    """Order status"""
    PENDING = "pending"
    OPEN = "open"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"

class TimeInForce(Enum):
    """Time in force"""
    DAY = "day"
    GTC = "gtc"  # Good till cancelled
    IOC = "ioc"  # Immediate or cancel
    FOK = "fok"  # Fill or kill
    GTD = "gtd"  # Good till date

@dataclass
class Order:
    """Order data structure"""
    id: str
    symbol: str
    side: OrderSide
    quantity: Decimal
    order_type: OrderType
    status: OrderStatus
    price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    time_in_force: TimeInForce = TimeInForce.DAY
    filled_quantity: Decimal = Decimal(0)
    average_fill_price: Optional[Decimal] = None
    commission: Decimal = Decimal(0)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Dict = None

@dataclass
class Position:
    """Position data structure"""
    symbol: str
    quantity: Decimal
    side: str  # "long" or "short"
    average_price: Decimal
    current_price: Decimal
    market_value: Decimal
    unrealized_pnl: Decimal
    realized_pnl: Decimal
    cost_basis: Decimal
    updated_at: datetime

@dataclass
class Account:
    """Account data structure"""
    id: str
    currency: str
    balance: Decimal
    available_balance: Decimal
    buying_power: Decimal
    equity: Decimal
    margin_used: Decimal
    margin_available: Decimal
    unrealized_pnl: Decimal
    realized_pnl: Decimal
    positions_value: Decimal
    updated_at: datetime

@dataclass
class MarketData:
    """Market data structure"""
    symbol: str
    bid: Decimal
    ask: Decimal
    last: Decimal
    volume: int
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    timestamp: datetime

class BaseBroker(ABC):
    """Base broker interface"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.name = self.__class__.__name__
        self.connected = False
        self.account = None
        self.positions = {}
        self.orders = {}
        self.market_data = {}
        self.callbacks = {}
        
    @abstractmethod
    async def connect(self) -> bool:
        """Connect to broker"""
        pass
        
    @abstractmethod
    async def disconnect(self):
        """Disconnect from broker"""
        pass
        
    @abstractmethod
    async def get_account(self) -> Account:
        """Get account information"""
        pass
        
    @abstractmethod
    async def get_positions(self) -> List[Position]:
        """Get all positions"""
        pass
        
    @abstractmethod
    async def get_position(self, symbol: str) -> Optional[Position]:
        """Get position for symbol"""
        pass
        
    @abstractmethod
    async def place_order(
        self,
        symbol: str,
        quantity: Decimal,
        side: OrderSide,
        order_type: OrderType = OrderType.MARKET,
        price: Optional[Decimal] = None,
        stop_price: Optional[Decimal] = None,
        time_in_force: TimeInForce = TimeInForce.DAY,
        metadata: Optional[Dict] = None
    ) -> Order:
        """Place an order"""
        pass
        
    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an order"""
        pass
        
    @abstractmethod
    async def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID"""
        pass
        
    @abstractmethod
    async def get_orders(
        self,
        status: Optional[OrderStatus] = None,
        symbol: Optional[str] = None,
        limit: int = 100
    ) -> List[Order]:
        """Get orders with optional filters"""
        pass
        
    @abstractmethod
    async def get_market_data(self, symbol: str) -> MarketData:
        """Get current market data for symbol"""
        pass
        
    @abstractmethod
    async def get_historical_data(
        self,
        symbol: str,
        interval: str,
        start: datetime,
        end: datetime
    ) -> List[Dict]:
        """Get historical price data"""
        pass
        
    @abstractmethod
    async def subscribe_market_data(
        self,
        symbols: List[str],
        callback: callable
    ):
        """Subscribe to real-time market data"""
        pass
        
    @abstractmethod
    async def unsubscribe_market_data(self, symbols: List[str]):
        """Unsubscribe from market data"""
        pass
        
    # Common utility methods
    
    async def get_buying_power(self) -> Decimal:
        """Get available buying power"""
        account = await self.get_account()
        return account.buying_power
        
    async def get_portfolio_value(self) -> Decimal:
        """Get total portfolio value"""
        account = await self.get_account()
        return account.equity
        
    async def close_position(self, symbol: str) -> Optional[Order]:
        """Close a position"""
        position = await self.get_position(symbol)
        if not position:
            return None
            
        side = OrderSide.SELL if position.side == "long" else OrderSide.BUY
        return await self.place_order(
            symbol=symbol,
            quantity=abs(position.quantity),
            side=side,
            order_type=OrderType.MARKET
        )
        
    async def close_all_positions(self) -> List[Order]:
        """Close all positions"""
        positions = await self.get_positions()
        orders = []
        
        for position in positions:
            order = await self.close_position(position.symbol)
            if order:
                orders.append(order)
                
        return orders
        
    async def cancel_all_orders(self) -> List[str]:
        """Cancel all open orders"""
        orders = await self.get_orders(status=OrderStatus.OPEN)
        cancelled = []
        
        for order in orders:
            if await self.cancel_order(order.id):
                cancelled.append(order.id)
                
        return cancelled
        
    def validate_order(
        self,
        symbol: str,
        quantity: Decimal,
        side: OrderSide,
        order_type: OrderType,
        price: Optional[Decimal] = None
    ) -> Tuple[bool, Optional[str]]:
        """Validate order parameters"""
        
        # Check quantity
        if quantity <= 0:
            return False, "Quantity must be positive"
            
        # Check price for limit orders
        if order_type in [OrderType.LIMIT, OrderType.STOP_LIMIT]:
            if not price or price <= 0:
                return False, "Price required for limit orders"
                
        return True, None
        
    async def wait_for_fill(
        self,
        order_id: str,
        timeout: int = 60
    ) -> Optional[Order]:
        """Wait for order to be filled"""
        
        start_time = datetime.now()
        while (datetime.now() - start_time).seconds < timeout:
            order = await self.get_order(order_id)
            
            if order and order.status in [
                OrderStatus.FILLED,
                OrderStatus.CANCELLED,
                OrderStatus.REJECTED
            ]:
                return order
                
            await asyncio.sleep(0.5)
            
        return None
        
    def calculate_position_size(
        self,
        account_value: Decimal,
        risk_percent: Decimal,
        stop_loss_percent: Decimal
    ) -> Decimal:
        """Calculate position size based on risk"""
        
        risk_amount = account_value * (risk_percent / 100)
        position_size = risk_amount / (stop_loss_percent / 100)
        
        return position_size
        
    def calculate_commission(
        self,
        quantity: Decimal,
        price: Decimal,
        commission_rate: Decimal = Decimal("0.001")
    ) -> Decimal:
        """Calculate commission for trade"""
        
        trade_value = quantity * price
        commission = trade_value * commission_rate
        
        # Minimum commission
        min_commission = Decimal("1.00")
        return max(commission, min_commission)
        
    async def get_market_hours(self, symbol: str) -> Dict:
        """Get market hours for symbol"""
        # Default implementation - override in specific brokers
        return {
            "is_open": True,
            "next_open": None,
            "next_close": None
        }
        
    async def search_symbols(self, query: str) -> List[Dict]:
        """Search for symbols"""
        # Default implementation - override in specific brokers
        return []
        
    def register_callback(self, event: str, callback: callable):
        """Register event callback"""
        if event not in self.callbacks:
            self.callbacks[event] = []
        self.callbacks[event].append(callback)
        
    async def emit_event(self, event: str, data: Any):
        """Emit event to callbacks"""
        if event in self.callbacks:
            for callback in self.callbacks[event]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(data)
                    else:
                        callback(data)
                except Exception as e:
                    logger.error(f"Error in callback for {event}: {e}")
                    
    async def health_check(self) -> Dict:
        """Check broker connection health"""
        try:
            account = await self.get_account()
            return {
                "status": "healthy",
                "connected": self.connected,
                "account_id": account.id if account else None,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "connected": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
