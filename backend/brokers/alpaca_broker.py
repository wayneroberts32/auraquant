"""
Alpaca Broker Integration
Implements the Alpaca trading API
"""

import asyncio
import logging
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import aiohttp
import websockets
import json
from base64 import b64encode

from .base_broker import (
    BaseBroker, Order, Position, Account, MarketData,
    OrderType, OrderSide, OrderStatus, TimeInForce
)

logger = logging.getLogger(__name__)

class AlpacaBroker(BaseBroker):
    """Alpaca broker implementation"""
    
    def __init__(self, config: Dict):
        super().__init__(config)
        
        # API endpoints
        self.base_url = config.get("base_url", "https://paper-api.alpaca.markets")
        self.data_url = config.get("data_url", "https://data.alpaca.markets")
        self.ws_url = config.get("ws_url", "wss://stream.data.alpaca.markets/v2/iex")
        
        # API credentials
        self.api_key = config.get("api_key")
        self.secret_key = config.get("secret_key")
        
        # Connection objects
        self.session = None
        self.ws_connection = None
        self.ws_task = None
        
    async def connect(self) -> bool:
        """Connect to Alpaca"""
        try:
            # Create HTTP session
            self.session = aiohttp.ClientSession(headers={
                "APCA-API-KEY-ID": self.api_key,
                "APCA-API-SECRET-KEY": self.secret_key
            })
            
            # Test connection
            account = await self.get_account()
            if account:
                self.connected = True
                logger.info("Connected to Alpaca")
                
                # Start WebSocket connection
                await self.connect_websocket()
                
                return True
                
        except Exception as e:
            logger.error(f"Failed to connect to Alpaca: {e}")
            return False
            
    async def disconnect(self):
        """Disconnect from Alpaca"""
        try:
            # Close WebSocket
            if self.ws_connection:
                await self.ws_connection.close()
                
            if self.ws_task:
                self.ws_task.cancel()
                
            # Close HTTP session
            if self.session:
                await self.session.close()
                
            self.connected = False
            logger.info("Disconnected from Alpaca")
            
        except Exception as e:
            logger.error(f"Error disconnecting from Alpaca: {e}")
            
    async def get_account(self) -> Account:
        """Get account information"""
        try:
            async with self.session.get(f"{self.base_url}/v2/account") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    return Account(
                        id=data["id"],
                        currency=data["currency"],
                        balance=Decimal(data["cash"]),
                        available_balance=Decimal(data["cash"]),
                        buying_power=Decimal(data["buying_power"]),
                        equity=Decimal(data["equity"]),
                        margin_used=Decimal(data["initial_margin"]) if data.get("initial_margin") else Decimal(0),
                        margin_available=Decimal(data["maintenance_margin"]) if data.get("maintenance_margin") else Decimal(0),
                        unrealized_pnl=Decimal(data.get("unrealized_pl", 0)),
                        realized_pnl=Decimal(data.get("realized_pl", 0)),
                        positions_value=Decimal(data["long_market_value"]),
                        updated_at=datetime.now()
                    )
                else:
                    logger.error(f"Failed to get account: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting account: {e}")
            return None
            
    async def get_positions(self) -> List[Position]:
        """Get all positions"""
        try:
            async with self.session.get(f"{self.base_url}/v2/positions") as response:
                if response.status == 200:
                    data = await response.json()
                    positions = []
                    
                    for pos in data:
                        positions.append(Position(
                            symbol=pos["symbol"],
                            quantity=Decimal(pos["qty"]),
                            side="long" if Decimal(pos["qty"]) > 0 else "short",
                            average_price=Decimal(pos["avg_entry_price"]),
                            current_price=Decimal(pos["current_price"]) if pos.get("current_price") else Decimal(0),
                            market_value=Decimal(pos["market_value"]),
                            unrealized_pnl=Decimal(pos["unrealized_pl"]),
                            realized_pnl=Decimal(pos.get("realized_pl", 0)),
                            cost_basis=Decimal(pos["cost_basis"]),
                            updated_at=datetime.now()
                        ))
                        
                    return positions
                else:
                    logger.error(f"Failed to get positions: {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error getting positions: {e}")
            return []
            
    async def get_position(self, symbol: str) -> Optional[Position]:
        """Get position for symbol"""
        try:
            async with self.session.get(f"{self.base_url}/v2/positions/{symbol}") as response:
                if response.status == 200:
                    pos = await response.json()
                    
                    return Position(
                        symbol=pos["symbol"],
                        quantity=Decimal(pos["qty"]),
                        side="long" if Decimal(pos["qty"]) > 0 else "short",
                        average_price=Decimal(pos["avg_entry_price"]),
                        current_price=Decimal(pos["current_price"]) if pos.get("current_price") else Decimal(0),
                        market_value=Decimal(pos["market_value"]),
                        unrealized_pnl=Decimal(pos["unrealized_pl"]),
                        realized_pnl=Decimal(pos.get("realized_pl", 0)),
                        cost_basis=Decimal(pos["cost_basis"]),
                        updated_at=datetime.now()
                    )
                elif response.status == 404:
                    return None
                else:
                    logger.error(f"Failed to get position: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting position: {e}")
            return None
            
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
        
        # Validate order
        valid, error = self.validate_order(symbol, quantity, side, order_type, price)
        if not valid:
            raise ValueError(error)
            
        # Build order request
        order_data = {
            "symbol": symbol,
            "qty": str(quantity),
            "side": side.value,
            "type": self._map_order_type(order_type),
            "time_in_force": self._map_time_in_force(time_in_force)
        }
        
        if order_type in [OrderType.LIMIT, OrderType.STOP_LIMIT]:
            order_data["limit_price"] = str(price)
            
        if order_type in [OrderType.STOP, OrderType.STOP_LIMIT]:
            order_data["stop_price"] = str(stop_price)
            
        if metadata:
            order_data["client_order_id"] = metadata.get("client_order_id")
            
        try:
            async with self.session.post(
                f"{self.base_url}/v2/orders",
                json=order_data
            ) as response:
                if response.status in [200, 201]:
                    data = await response.json()
                    
                    return Order(
                        id=data["id"],
                        symbol=data["symbol"],
                        side=OrderSide(data["side"]),
                        quantity=Decimal(data["qty"]),
                        order_type=order_type,
                        status=self._map_order_status(data["status"]),
                        price=Decimal(data["limit_price"]) if data.get("limit_price") else None,
                        stop_price=Decimal(data["stop_price"]) if data.get("stop_price") else None,
                        time_in_force=time_in_force,
                        filled_quantity=Decimal(data["filled_qty"]),
                        average_fill_price=Decimal(data["filled_avg_price"]) if data.get("filled_avg_price") else None,
                        created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
                        updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00")),
                        metadata=metadata
                    )
                else:
                    error_data = await response.json()
                    raise Exception(f"Order failed: {error_data}")
                    
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            raise
            
    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an order"""
        try:
            async with self.session.delete(f"{self.base_url}/v2/orders/{order_id}") as response:
                if response.status in [200, 204]:
                    return True
                else:
                    logger.error(f"Failed to cancel order: {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error cancelling order: {e}")
            return False
            
    async def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID"""
        try:
            async with self.session.get(f"{self.base_url}/v2/orders/{order_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    return Order(
                        id=data["id"],
                        symbol=data["symbol"],
                        side=OrderSide(data["side"]),
                        quantity=Decimal(data["qty"]),
                        order_type=self._reverse_map_order_type(data["order_type"]),
                        status=self._map_order_status(data["status"]),
                        price=Decimal(data["limit_price"]) if data.get("limit_price") else None,
                        stop_price=Decimal(data["stop_price"]) if data.get("stop_price") else None,
                        time_in_force=self._reverse_map_time_in_force(data["time_in_force"]),
                        filled_quantity=Decimal(data["filled_qty"]),
                        average_fill_price=Decimal(data["filled_avg_price"]) if data.get("filled_avg_price") else None,
                        created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
                        updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
                    )
                elif response.status == 404:
                    return None
                else:
                    logger.error(f"Failed to get order: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting order: {e}")
            return None
            
    async def get_orders(
        self,
        status: Optional[OrderStatus] = None,
        symbol: Optional[str] = None,
        limit: int = 100
    ) -> List[Order]:
        """Get orders with optional filters"""
        
        params = {"limit": limit}
        if status:
            params["status"] = self._map_order_status_reverse(status)
        if symbol:
            params["symbols"] = symbol
            
        try:
            async with self.session.get(
                f"{self.base_url}/v2/orders",
                params=params
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    orders = []
                    
                    for order_data in data:
                        orders.append(Order(
                            id=order_data["id"],
                            symbol=order_data["symbol"],
                            side=OrderSide(order_data["side"]),
                            quantity=Decimal(order_data["qty"]),
                            order_type=self._reverse_map_order_type(order_data["order_type"]),
                            status=self._map_order_status(order_data["status"]),
                            price=Decimal(order_data["limit_price"]) if order_data.get("limit_price") else None,
                            stop_price=Decimal(order_data["stop_price"]) if order_data.get("stop_price") else None,
                            time_in_force=self._reverse_map_time_in_force(order_data["time_in_force"]),
                            filled_quantity=Decimal(order_data["filled_qty"]),
                            average_fill_price=Decimal(order_data["filled_avg_price"]) if order_data.get("filled_avg_price") else None,
                            created_at=datetime.fromisoformat(order_data["created_at"].replace("Z", "+00:00")),
                            updated_at=datetime.fromisoformat(order_data["updated_at"].replace("Z", "+00:00"))
                        ))
                        
                    return orders
                else:
                    logger.error(f"Failed to get orders: {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error getting orders: {e}")
            return []
            
    async def get_market_data(self, symbol: str) -> MarketData:
        """Get current market data for symbol"""
        try:
            # Get latest trade
            async with self.session.get(
                f"{self.data_url}/v2/stocks/{symbol}/trades/latest",
                headers={
                    "APCA-API-KEY-ID": self.api_key,
                    "APCA-API-SECRET-KEY": self.secret_key
                }
            ) as response:
                if response.status == 200:
                    trade_data = await response.json()
                    
            # Get latest quote
            async with self.session.get(
                f"{self.data_url}/v2/stocks/{symbol}/quotes/latest",
                headers={
                    "APCA-API-KEY-ID": self.api_key,
                    "APCA-API-SECRET-KEY": self.secret_key
                }
            ) as response:
                if response.status == 200:
                    quote_data = await response.json()
                    
            # Get daily bar
            end_date = datetime.now()
            start_date = end_date - timedelta(days=1)
            
            async with self.session.get(
                f"{self.data_url}/v2/stocks/{symbol}/bars",
                params={
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "timeframe": "1Day",
                    "limit": 1
                },
                headers={
                    "APCA-API-KEY-ID": self.api_key,
                    "APCA-API-SECRET-KEY": self.secret_key
                }
            ) as response:
                if response.status == 200:
                    bar_data = await response.json()
                    
            # Combine data
            trade = trade_data.get("trade", {})
            quote = quote_data.get("quote", {})
            bars = bar_data.get("bars", [])
            bar = bars[0] if bars else {}
            
            return MarketData(
                symbol=symbol,
                bid=Decimal(quote.get("bp", 0)),
                ask=Decimal(quote.get("ap", 0)),
                last=Decimal(trade.get("p", 0)),
                volume=bar.get("v", 0),
                open=Decimal(bar.get("o", 0)),
                high=Decimal(bar.get("h", 0)),
                low=Decimal(bar.get("l", 0)),
                close=Decimal(bar.get("c", 0)),
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error getting market data: {e}")
            return None
            
    async def get_historical_data(
        self,
        symbol: str,
        interval: str,
        start: datetime,
        end: datetime
    ) -> List[Dict]:
        """Get historical price data"""
        
        # Map interval to Alpaca timeframe
        timeframe_map = {
            "1m": "1Min",
            "5m": "5Min",
            "15m": "15Min",
            "1h": "1Hour",
            "1d": "1Day"
        }
        
        timeframe = timeframe_map.get(interval, "1Day")
        
        try:
            async with self.session.get(
                f"{self.data_url}/v2/stocks/{symbol}/bars",
                params={
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                    "timeframe": timeframe,
                    "limit": 10000
                },
                headers={
                    "APCA-API-KEY-ID": self.api_key,
                    "APCA-API-SECRET-KEY": self.secret_key
                }
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    bars = data.get("bars", [])
                    
                    return [
                        {
                            "timestamp": bar["t"],
                            "open": float(bar["o"]),
                            "high": float(bar["h"]),
                            "low": float(bar["l"]),
                            "close": float(bar["c"]),
                            "volume": bar["v"]
                        }
                        for bar in bars
                    ]
                else:
                    logger.error(f"Failed to get historical data: {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error getting historical data: {e}")
            return []
            
    async def connect_websocket(self):
        """Connect to Alpaca WebSocket"""
        try:
            self.ws_connection = await websockets.connect(self.ws_url)
            
            # Authenticate
            auth_data = {
                "action": "auth",
                "key": self.api_key,
                "secret": self.secret_key
            }
            await self.ws_connection.send(json.dumps(auth_data))
            
            # Start message handler
            self.ws_task = asyncio.create_task(self.handle_websocket_messages())
            
            logger.info("Connected to Alpaca WebSocket")
            
        except Exception as e:
            logger.error(f"Failed to connect to WebSocket: {e}")
            
    async def handle_websocket_messages(self):
        """Handle incoming WebSocket messages"""
        try:
            async for message in self.ws_connection:
                data = json.loads(message)
                
                if data[0]["T"] == "success":
                    logger.info("WebSocket authenticated")
                elif data[0]["T"] == "error":
                    logger.error(f"WebSocket error: {data[0]['msg']}")
                else:
                    # Handle market data
                    for item in data:
                        if item["T"] == "t":  # Trade
                            await self.handle_trade(item)
                        elif item["T"] == "q":  # Quote
                            await self.handle_quote(item)
                            
        except Exception as e:
            logger.error(f"WebSocket handler error: {e}")
            
    async def handle_trade(self, trade: Dict):
        """Handle trade update"""
        symbol = trade["S"]
        price = Decimal(str(trade["p"]))
        size = trade["s"]
        
        # Update market data
        if symbol not in self.market_data:
            self.market_data[symbol] = {}
            
        self.market_data[symbol]["last"] = price
        self.market_data[symbol]["volume"] = self.market_data[symbol].get("volume", 0) + size
        
        # Emit event
        await self.emit_event("trade", {
            "symbol": symbol,
            "price": price,
            "size": size,
            "timestamp": trade["t"]
        })
        
    async def handle_quote(self, quote: Dict):
        """Handle quote update"""
        symbol = quote["S"]
        bid = Decimal(str(quote["bp"]))
        ask = Decimal(str(quote["ap"]))
        
        # Update market data
        if symbol not in self.market_data:
            self.market_data[symbol] = {}
            
        self.market_data[symbol]["bid"] = bid
        self.market_data[symbol]["ask"] = ask
        
        # Emit event
        await self.emit_event("quote", {
            "symbol": symbol,
            "bid": bid,
            "ask": ask,
            "timestamp": quote["t"]
        })
        
    async def subscribe_market_data(
        self,
        symbols: List[str],
        callback: callable
    ):
        """Subscribe to real-time market data"""
        
        # Register callback
        self.register_callback("trade", callback)
        self.register_callback("quote", callback)
        
        # Subscribe via WebSocket
        if self.ws_connection:
            sub_data = {
                "action": "subscribe",
                "trades": symbols,
                "quotes": symbols
            }
            await self.ws_connection.send(json.dumps(sub_data))
            
    async def unsubscribe_market_data(self, symbols: List[str]):
        """Unsubscribe from market data"""
        
        if self.ws_connection:
            unsub_data = {
                "action": "unsubscribe",
                "trades": symbols,
                "quotes": symbols
            }
            await self.ws_connection.send(json.dumps(unsub_data))
            
    # Helper methods
    
    def _map_order_type(self, order_type: OrderType) -> str:
        """Map OrderType to Alpaca order type"""
        mapping = {
            OrderType.MARKET: "market",
            OrderType.LIMIT: "limit",
            OrderType.STOP: "stop",
            OrderType.STOP_LIMIT: "stop_limit",
            OrderType.TRAILING_STOP: "trailing_stop"
        }
        return mapping.get(order_type, "market")
        
    def _reverse_map_order_type(self, alpaca_type: str) -> OrderType:
        """Map Alpaca order type to OrderType"""
        mapping = {
            "market": OrderType.MARKET,
            "limit": OrderType.LIMIT,
            "stop": OrderType.STOP,
            "stop_limit": OrderType.STOP_LIMIT,
            "trailing_stop": OrderType.TRAILING_STOP
        }
        return mapping.get(alpaca_type, OrderType.MARKET)
        
    def _map_time_in_force(self, tif: TimeInForce) -> str:
        """Map TimeInForce to Alpaca"""
        mapping = {
            TimeInForce.DAY: "day",
            TimeInForce.GTC: "gtc",
            TimeInForce.IOC: "ioc",
            TimeInForce.FOK: "fok"
        }
        return mapping.get(tif, "day")
        
    def _reverse_map_time_in_force(self, alpaca_tif: str) -> TimeInForce:
        """Map Alpaca TIF to TimeInForce"""
        mapping = {
            "day": TimeInForce.DAY,
            "gtc": TimeInForce.GTC,
            "ioc": TimeInForce.IOC,
            "fok": TimeInForce.FOK
        }
        return mapping.get(alpaca_tif, TimeInForce.DAY)
        
    def _map_order_status(self, status: str) -> OrderStatus:
        """Map Alpaca status to OrderStatus"""
        mapping = {
            "new": OrderStatus.OPEN,
            "accepted": OrderStatus.OPEN,
            "pending_new": OrderStatus.PENDING,
            "accepted_for_bidding": OrderStatus.OPEN,
            "partially_filled": OrderStatus.PARTIALLY_FILLED,
            "filled": OrderStatus.FILLED,
            "canceled": OrderStatus.CANCELLED,
            "cancelled": OrderStatus.CANCELLED,
            "rejected": OrderStatus.REJECTED,
            "expired": OrderStatus.EXPIRED
        }
        return mapping.get(status, OrderStatus.OPEN)
        
    def _map_order_status_reverse(self, status: OrderStatus) -> str:
        """Map OrderStatus to Alpaca status"""
        mapping = {
            OrderStatus.PENDING: "pending_new",
            OrderStatus.OPEN: "open",
            OrderStatus.PARTIALLY_FILLED: "partially_filled",
            OrderStatus.FILLED: "filled",
            OrderStatus.CANCELLED: "canceled",
            OrderStatus.REJECTED: "rejected",
            OrderStatus.EXPIRED: "expired"
        }
        return mapping.get(status, "open")
