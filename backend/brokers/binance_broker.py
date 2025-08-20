"""
Binance Broker Integration
Implements the Binance cryptocurrency trading API
"""

import asyncio
import logging
import hmac
import hashlib
import time
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import aiohttp
import websockets
import json
from urllib.parse import urlencode

from .base_broker import (
    BaseBroker, Order, Position, Account, MarketData,
    OrderType, OrderSide, OrderStatus, TimeInForce
)

logger = logging.getLogger(__name__)

class BinanceBroker(BaseBroker):
    """Binance broker implementation"""
    
    def __init__(self, config: Dict):
        super().__init__(config)
        
        # API endpoints
        self.base_url = config.get("base_url", "https://api.binance.com")
        self.ws_url = config.get("ws_url", "wss://stream.binance.com:9443/ws")
        self.testnet = config.get("testnet", False)
        
        if self.testnet:
            self.base_url = "https://testnet.binance.vision"
            
        # API credentials
        self.api_key = config.get("api_key")
        self.secret_key = config.get("secret_key")
        
        # Connection objects
        self.session = None
        self.ws_connection = None
        self.ws_task = None
        self.listen_key = None
        
        # Trading parameters
        self.symbols_info = {}
        self.account_info = None
        
    async def connect(self) -> bool:
        """Connect to Binance"""
        try:
            # Create HTTP session
            self.session = aiohttp.ClientSession()
            
            # Get exchange info
            await self.get_exchange_info()
            
            # Test connection and get account
            account = await self.get_account()
            if account:
                self.connected = True
                logger.info("Connected to Binance")
                
                # Start user data stream
                await self.start_user_stream()
                
                return True
                
        except Exception as e:
            logger.error(f"Failed to connect to Binance: {e}")
            return False
            
    async def disconnect(self):
        """Disconnect from Binance"""
        try:
            # Stop user stream
            if self.listen_key:
                await self.stop_user_stream()
                
            # Close WebSocket
            if self.ws_connection:
                await self.ws_connection.close()
                
            if self.ws_task:
                self.ws_task.cancel()
                
            # Close HTTP session
            if self.session:
                await self.session.close()
                
            self.connected = False
            logger.info("Disconnected from Binance")
            
        except Exception as e:
            logger.error(f"Error disconnecting from Binance: {e}")
            
    async def get_exchange_info(self):
        """Get exchange trading rules and symbols"""
        try:
            async with self.session.get(f"{self.base_url}/api/v3/exchangeInfo") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Store symbol info for validation
                    for symbol in data["symbols"]:
                        self.symbols_info[symbol["symbol"]] = {
                            "status": symbol["status"],
                            "baseAsset": symbol["baseAsset"],
                            "quoteAsset": symbol["quoteAsset"],
                            "filters": {f["filterType"]: f for f in symbol["filters"]},
                            "orderTypes": symbol["orderTypes"],
                            "baseAssetPrecision": symbol["baseAssetPrecision"],
                            "quoteAssetPrecision": symbol["quoteAssetPrecision"]
                        }
                        
        except Exception as e:
            logger.error(f"Error getting exchange info: {e}")
            
    def _sign_request(self, params: Dict) -> str:
        """Sign request with HMAC SHA256"""
        query_string = urlencode(params)
        signature = hmac.new(
            self.secret_key.encode(),
            query_string.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
        
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Dict = None,
        signed: bool = False
    ) -> Dict:
        """Make HTTP request to Binance"""
        
        headers = {"X-MBX-APIKEY": self.api_key}
        
        if signed:
            if not params:
                params = {}
            params["timestamp"] = int(time.time() * 1000)
            params["signature"] = self._sign_request(params)
            
        url = f"{self.base_url}{endpoint}"
        
        async with self.session.request(
            method,
            url,
            params=params,
            headers=headers
        ) as response:
            if response.status == 200:
                return await response.json()
            else:
                error = await response.text()
                raise Exception(f"Request failed: {error}")
                
    async def get_account(self) -> Account:
        """Get account information"""
        try:
            data = await self._make_request("GET", "/api/v3/account", signed=True)
            
            # Calculate balances
            total_btc = Decimal(0)
            balances = {}
            
            for balance in data["balances"]:
                asset = balance["asset"]
                free = Decimal(balance["free"])
                locked = Decimal(balance["locked"])
                
                if free + locked > 0:
                    balances[asset] = {
                        "free": free,
                        "locked": locked,
                        "total": free + locked
                    }
                    
            # Get BTC value (simplified - should use actual conversion rates)
            total_value = sum(b["total"] for b in balances.values() if "USDT" in list(balances.keys()))
            
            return Account(
                id=str(data.get("uid", "binance")),
                currency="USDT",
                balance=balances.get("USDT", {}).get("total", Decimal(0)),
                available_balance=balances.get("USDT", {}).get("free", Decimal(0)),
                buying_power=balances.get("USDT", {}).get("free", Decimal(0)),
                equity=total_value,
                margin_used=Decimal(0),
                margin_available=Decimal(0),
                unrealized_pnl=Decimal(0),
                realized_pnl=Decimal(0),
                positions_value=total_value - balances.get("USDT", {}).get("total", Decimal(0)),
                updated_at=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error getting account: {e}")
            return None
            
    async def get_positions(self) -> List[Position]:
        """Get all positions (spot balances)"""
        try:
            data = await self._make_request("GET", "/api/v3/account", signed=True)
            positions = []
            
            for balance in data["balances"]:
                asset = balance["asset"]
                total = Decimal(balance["free"]) + Decimal(balance["locked"])
                
                if total > 0 and asset != "USDT":
                    # Get current price
                    ticker = await self._make_request(
                        "GET",
                        "/api/v3/ticker/price",
                        params={"symbol": f"{asset}USDT"}
                    )
                    
                    current_price = Decimal(ticker["price"]) if ticker else Decimal(0)
                    
                    positions.append(Position(
                        symbol=f"{asset}USDT",
                        quantity=total,
                        side="long",
                        average_price=Decimal(0),  # Binance doesn't track average price
                        current_price=current_price,
                        market_value=total * current_price,
                        unrealized_pnl=Decimal(0),
                        realized_pnl=Decimal(0),
                        cost_basis=Decimal(0),
                        updated_at=datetime.now()
                    ))
                    
            return positions
            
        except Exception as e:
            logger.error(f"Error getting positions: {e}")
            return []
            
    async def get_position(self, symbol: str) -> Optional[Position]:
        """Get position for symbol"""
        positions = await self.get_positions()
        for position in positions:
            if position.symbol == symbol:
                return position
        return None
        
    async def place_order(
        self,
        symbol: str,
        quantity: Decimal,
        side: OrderSide,
        order_type: OrderType = OrderType.MARKET,
        price: Optional[Decimal] = None,
        stop_price: Optional[Decimal] = None,
        time_in_force: TimeInForce = TimeInForce.GTC,
        metadata: Optional[Dict] = None
    ) -> Order:
        """Place an order"""
        
        # Validate symbol
        if symbol not in self.symbols_info:
            raise ValueError(f"Invalid symbol: {symbol}")
            
        # Build order params
        params = {
            "symbol": symbol,
            "side": side.value.upper(),
            "type": self._map_order_type(order_type),
            "quantity": self._format_quantity(symbol, quantity)
        }
        
        # Add order-specific parameters
        if order_type == OrderType.LIMIT:
            if not price:
                raise ValueError("Price required for limit orders")
            params["price"] = self._format_price(symbol, price)
            params["timeInForce"] = self._map_time_in_force(time_in_force)
            
        elif order_type in [OrderType.STOP, OrderType.STOP_LIMIT]:
            if not stop_price:
                raise ValueError("Stop price required for stop orders")
            params["stopPrice"] = self._format_price(symbol, stop_price)
            
            if order_type == OrderType.STOP_LIMIT:
                if not price:
                    raise ValueError("Price required for stop limit orders")
                params["price"] = self._format_price(symbol, price)
                params["timeInForce"] = self._map_time_in_force(time_in_force)
                
        try:
            data = await self._make_request(
                "POST",
                "/api/v3/order",
                params=params,
                signed=True
            )
            
            return Order(
                id=str(data["orderId"]),
                symbol=data["symbol"],
                side=OrderSide(data["side"].lower()),
                quantity=Decimal(data["origQty"]),
                order_type=order_type,
                status=self._map_order_status(data["status"]),
                price=Decimal(data["price"]) if data.get("price") else None,
                stop_price=Decimal(data["stopPrice"]) if data.get("stopPrice") else None,
                time_in_force=time_in_force,
                filled_quantity=Decimal(data["executedQty"]),
                average_fill_price=Decimal(data["cummulativeQuoteQty"]) / Decimal(data["executedQty"]) 
                    if Decimal(data["executedQty"]) > 0 else None,
                created_at=datetime.fromtimestamp(data["time"] / 1000),
                updated_at=datetime.fromtimestamp(data["updateTime"] / 1000) if data.get("updateTime") else None,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            raise
            
    async def cancel_order(self, order_id: str, symbol: str = None) -> bool:
        """Cancel an order"""
        try:
            params = {"orderId": order_id}
            if symbol:
                params["symbol"] = symbol
            else:
                # Need to find symbol from order
                order = await self.get_order(order_id)
                if order:
                    params["symbol"] = order.symbol
                else:
                    return False
                    
            await self._make_request(
                "DELETE",
                "/api/v3/order",
                params=params,
                signed=True
            )
            return True
            
        except Exception as e:
            logger.error(f"Error cancelling order: {e}")
            return False
            
    async def get_order(self, order_id: str, symbol: str = None) -> Optional[Order]:
        """Get order by ID"""
        try:
            # Binance requires symbol for order lookup
            if not symbol:
                # Try to find from recent orders
                orders = await self.get_orders()
                for order in orders:
                    if order.id == order_id:
                        symbol = order.symbol
                        break
                        
            if not symbol:
                return None
                
            params = {
                "symbol": symbol,
                "orderId": order_id
            }
            
            data = await self._make_request(
                "GET",
                "/api/v3/order",
                params=params,
                signed=True
            )
            
            return Order(
                id=str(data["orderId"]),
                symbol=data["symbol"],
                side=OrderSide(data["side"].lower()),
                quantity=Decimal(data["origQty"]),
                order_type=self._reverse_map_order_type(data["type"]),
                status=self._map_order_status(data["status"]),
                price=Decimal(data["price"]) if data.get("price") else None,
                stop_price=Decimal(data["stopPrice"]) if data.get("stopPrice") else None,
                time_in_force=self._reverse_map_time_in_force(data.get("timeInForce", "GTC")),
                filled_quantity=Decimal(data["executedQty"]),
                average_fill_price=Decimal(data["cummulativeQuoteQty"]) / Decimal(data["executedQty"]) 
                    if Decimal(data["executedQty"]) > 0 else None,
                created_at=datetime.fromtimestamp(data["time"] / 1000),
                updated_at=datetime.fromtimestamp(data["updateTime"] / 1000) if data.get("updateTime") else None
            )
            
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
        
        try:
            params = {"limit": min(limit, 1000)}
            if symbol:
                params["symbol"] = symbol
                
            # Get open orders
            open_orders = []
            if not status or status in [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED]:
                if symbol:
                    data = await self._make_request(
                        "GET",
                        "/api/v3/openOrders",
                        params={"symbol": symbol},
                        signed=True
                    )
                    open_orders = data
                else:
                    data = await self._make_request(
                        "GET",
                        "/api/v3/openOrders",
                        signed=True
                    )
                    open_orders = data
                    
            # Get all orders if needed
            all_orders = []
            if not status or status in [OrderStatus.FILLED, OrderStatus.CANCELLED]:
                if symbol:
                    data = await self._make_request(
                        "GET",
                        "/api/v3/allOrders",
                        params=params,
                        signed=True
                    )
                    all_orders = data
                    
            # Combine and convert
            orders = []
            for order_data in open_orders + all_orders:
                order = Order(
                    id=str(order_data["orderId"]),
                    symbol=order_data["symbol"],
                    side=OrderSide(order_data["side"].lower()),
                    quantity=Decimal(order_data["origQty"]),
                    order_type=self._reverse_map_order_type(order_data["type"]),
                    status=self._map_order_status(order_data["status"]),
                    price=Decimal(order_data["price"]) if order_data.get("price") else None,
                    stop_price=Decimal(order_data["stopPrice"]) if order_data.get("stopPrice") else None,
                    time_in_force=self._reverse_map_time_in_force(order_data.get("timeInForce", "GTC")),
                    filled_quantity=Decimal(order_data["executedQty"]),
                    average_fill_price=Decimal(order_data["cummulativeQuoteQty"]) / Decimal(order_data["executedQty"]) 
                        if Decimal(order_data["executedQty"]) > 0 else None,
                    created_at=datetime.fromtimestamp(order_data["time"] / 1000),
                    updated_at=datetime.fromtimestamp(order_data["updateTime"] / 1000) if order_data.get("updateTime") else None
                )
                
                if not status or order.status == status:
                    orders.append(order)
                    
            return orders[:limit]
            
        except Exception as e:
            logger.error(f"Error getting orders: {e}")
            return []
            
    async def get_market_data(self, symbol: str) -> MarketData:
        """Get current market data for symbol"""
        try:
            # Get ticker
            ticker = await self._make_request(
                "GET",
                "/api/v3/ticker/24hr",
                params={"symbol": symbol}
            )
            
            # Get order book
            depth = await self._make_request(
                "GET",
                "/api/v3/depth",
                params={"symbol": symbol, "limit": 5}
            )
            
            return MarketData(
                symbol=symbol,
                bid=Decimal(depth["bids"][0][0]) if depth["bids"] else Decimal(0),
                ask=Decimal(depth["asks"][0][0]) if depth["asks"] else Decimal(0),
                last=Decimal(ticker["lastPrice"]),
                volume=int(float(ticker["volume"])),
                open=Decimal(ticker["openPrice"]),
                high=Decimal(ticker["highPrice"]),
                low=Decimal(ticker["lowPrice"]),
                close=Decimal(ticker["prevClosePrice"]),
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
        
        # Map interval
        interval_map = {
            "1m": "1m",
            "5m": "5m",
            "15m": "15m",
            "30m": "30m",
            "1h": "1h",
            "4h": "4h",
            "1d": "1d",
            "1w": "1w"
        }
        
        binance_interval = interval_map.get(interval, "1h")
        
        try:
            params = {
                "symbol": symbol,
                "interval": binance_interval,
                "startTime": int(start.timestamp() * 1000),
                "endTime": int(end.timestamp() * 1000),
                "limit": 1000
            }
            
            data = await self._make_request(
                "GET",
                "/api/v3/klines",
                params=params
            )
            
            return [
                {
                    "timestamp": candle[0],
                    "open": float(candle[1]),
                    "high": float(candle[2]),
                    "low": float(candle[3]),
                    "close": float(candle[4]),
                    "volume": float(candle[5])
                }
                for candle in data
            ]
            
        except Exception as e:
            logger.error(f"Error getting historical data: {e}")
            return []
            
    async def start_user_stream(self):
        """Start user data stream"""
        try:
            # Get listen key
            data = await self._make_request(
                "POST",
                "/api/v3/userDataStream",
                signed=False
            )
            self.listen_key = data["listenKey"]
            
            # Connect WebSocket
            ws_url = f"{self.ws_url}/{self.listen_key}"
            self.ws_connection = await websockets.connect(ws_url)
            
            # Start handler
            self.ws_task = asyncio.create_task(self.handle_user_stream())
            
            # Keep alive task
            asyncio.create_task(self.keep_alive_stream())
            
            logger.info("Started Binance user data stream")
            
        except Exception as e:
            logger.error(f"Error starting user stream: {e}")
            
    async def stop_user_stream(self):
        """Stop user data stream"""
        try:
            if self.listen_key:
                await self._make_request(
                    "DELETE",
                    "/api/v3/userDataStream",
                    params={"listenKey": self.listen_key},
                    signed=False
                )
                
        except Exception as e:
            logger.error(f"Error stopping user stream: {e}")
            
    async def keep_alive_stream(self):
        """Keep user stream alive"""
        while self.listen_key:
            try:
                await asyncio.sleep(30 * 60)  # 30 minutes
                
                await self._make_request(
                    "PUT",
                    "/api/v3/userDataStream",
                    params={"listenKey": self.listen_key},
                    signed=False
                )
                
            except Exception as e:
                logger.error(f"Error keeping stream alive: {e}")
                break
                
    async def handle_user_stream(self):
        """Handle user data stream messages"""
        try:
            async for message in self.ws_connection:
                data = json.loads(message)
                event_type = data.get("e")
                
                if event_type == "executionReport":
                    # Order update
                    await self.handle_order_update(data)
                elif event_type == "outboundAccountPosition":
                    # Account update
                    await self.handle_account_update(data)
                    
        except Exception as e:
            logger.error(f"User stream handler error: {e}")
            
    async def handle_order_update(self, data: Dict):
        """Handle order update from stream"""
        order_id = str(data["i"])
        status = self._map_order_status(data["X"])
        
        # Emit event
        await self.emit_event("order_update", {
            "order_id": order_id,
            "status": status,
            "symbol": data["s"],
            "filled_qty": data["z"],
            "fill_price": data["L"]
        })
        
    async def handle_account_update(self, data: Dict):
        """Handle account update from stream"""
        # Update cached account info
        await self.emit_event("account_update", data)
        
    async def subscribe_market_data(
        self,
        symbols: List[str],
        callback: callable
    ):
        """Subscribe to real-time market data"""
        
        # Create combined stream
        streams = []
        for symbol in symbols:
            symbol_lower = symbol.lower()
            streams.extend([
                f"{symbol_lower}@trade",
                f"{symbol_lower}@depth",
                f"{symbol_lower}@ticker"
            ])
            
        # Connect to stream
        stream_url = f"{self.ws_url}/stream?streams={'/'.join(streams)}"
        ws = await websockets.connect(stream_url)
        
        # Register callback
        self.register_callback("market_data", callback)
        
        # Handle messages
        async def handle_stream():
            async for message in ws:
                data = json.loads(message)
                await self.emit_event("market_data", data)
                
        asyncio.create_task(handle_stream())
        
    async def unsubscribe_market_data(self, symbols: List[str]):
        """Unsubscribe from market data"""
        # Would need to track and close specific WebSocket connections
        pass
        
    # Helper methods
    
    def _format_quantity(self, symbol: str, quantity: Decimal) -> str:
        """Format quantity according to symbol precision"""
        info = self.symbols_info.get(symbol, {})
        precision = info.get("baseAssetPrecision", 8)
        return f"{quantity:.{precision}f}".rstrip("0").rstrip(".")
        
    def _format_price(self, symbol: str, price: Decimal) -> str:
        """Format price according to symbol precision"""
        info = self.symbols_info.get(symbol, {})
        
        # Get tick size from price filter
        filters = info.get("filters", {})
        price_filter = filters.get("PRICE_FILTER", {})
        tick_size = Decimal(price_filter.get("tickSize", "0.00000001"))
        
        # Round to tick size
        rounded = (price / tick_size).quantize(Decimal("1")) * tick_size
        
        # Format with appropriate precision
        precision = len(str(tick_size).rstrip("0").split(".")[-1])
        return f"{rounded:.{precision}f}"
        
    def _map_order_type(self, order_type: OrderType) -> str:
        """Map OrderType to Binance order type"""
        mapping = {
            OrderType.MARKET: "MARKET",
            OrderType.LIMIT: "LIMIT",
            OrderType.STOP: "STOP_LOSS",
            OrderType.STOP_LIMIT: "STOP_LOSS_LIMIT"
        }
        return mapping.get(order_type, "MARKET")
        
    def _reverse_map_order_type(self, binance_type: str) -> OrderType:
        """Map Binance order type to OrderType"""
        mapping = {
            "MARKET": OrderType.MARKET,
            "LIMIT": OrderType.LIMIT,
            "STOP_LOSS": OrderType.STOP,
            "STOP_LOSS_LIMIT": OrderType.STOP_LIMIT,
            "LIMIT_MAKER": OrderType.LIMIT
        }
        return mapping.get(binance_type, OrderType.MARKET)
        
    def _map_time_in_force(self, tif: TimeInForce) -> str:
        """Map TimeInForce to Binance"""
        mapping = {
            TimeInForce.GTC: "GTC",
            TimeInForce.IOC: "IOC",
            TimeInForce.FOK: "FOK"
        }
        return mapping.get(tif, "GTC")
        
    def _reverse_map_time_in_force(self, binance_tif: str) -> TimeInForce:
        """Map Binance TIF to TimeInForce"""
        mapping = {
            "GTC": TimeInForce.GTC,
            "IOC": TimeInForce.IOC,
            "FOK": TimeInForce.FOK
        }
        return mapping.get(binance_tif, TimeInForce.GTC)
        
    def _map_order_status(self, status: str) -> OrderStatus:
        """Map Binance status to OrderStatus"""
        mapping = {
            "NEW": OrderStatus.OPEN,
            "PARTIALLY_FILLED": OrderStatus.PARTIALLY_FILLED,
            "FILLED": OrderStatus.FILLED,
            "CANCELED": OrderStatus.CANCELLED,
            "REJECTED": OrderStatus.REJECTED,
            "EXPIRED": OrderStatus.EXPIRED
        }
        return mapping.get(status, OrderStatus.OPEN)
