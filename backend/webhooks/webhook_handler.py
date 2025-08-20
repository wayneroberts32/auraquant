"""
AuraQuant Webhook Handler
Auto-setup webhooks with IP allowlisting and infinity-speed processing
"""

import asyncio
import hashlib
import hmac
import json
import time
from typing import Dict, List, Optional, Set, Any
from datetime import datetime, timedelta
from decimal import Decimal
import aiohttp
import logging
from fastapi import Request, HTTPException
from pydantic import BaseModel
import redis.asyncio as redis
import ipaddress

logger = logging.getLogger(__name__)

class WebhookConfig(BaseModel):
    """Webhook configuration"""
    id: str
    url: str
    secret: str
    events: List[str]
    active: bool = True
    retry_count: int = 3
    timeout: int = 30
    headers: Dict[str, str] = {}

class WebhookEvent(BaseModel):
    """Webhook event data"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]
    source: str
    priority: str = "normal"  # low, normal, high, critical

class WebhookHandler:
    """
    Advanced webhook handler with auto-setup and infinity-speed processing
    Handles broker fills, market data, alerts, and system events
    """
    
    def __init__(self):
        # Webhook registry
        self.webhooks: Dict[str, WebhookConfig] = {}
        self.event_subscriptions: Dict[str, List[str]] = {}
        
        # IP allowlist for security
        self.ip_allowlist: Set[str] = set()
        self.ip_blocklist: Set[str] = set()
        
        # Performance tracking
        self.webhook_stats = {
            "total_received": 0,
            "total_sent": 0,
            "total_failed": 0,
            "avg_latency_ms": 0,
            "min_latency_ms": float('inf'),
            "max_latency_ms": 0
        }
        
        # Redis for caching and queue
        self.redis_client = None
        self.webhook_queue = asyncio.Queue()
        
        # Auto-setup configuration
        self.auto_setup_enabled = True
        self.broker_webhooks = {}
        
        logger.info("Webhook Handler initialized")
    
    async def initialize(self):
        """Initialize webhook system with auto-setup"""
        # Connect to Redis
        try:
            self.redis_client = await redis.from_url(
                "redis://localhost:6379",
                encoding="utf-8",
                decode_responses=True
            )
            logger.info("Connected to Redis for webhook caching")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Using in-memory cache.")
        
        # Load saved webhooks
        await self.load_webhooks()
        
        # Auto-setup broker webhooks
        if self.auto_setup_enabled:
            await self.auto_setup_webhooks()
        
        # Start webhook processor
        asyncio.create_task(self.process_webhook_queue())
        
        # Initialize IP allowlist with known broker IPs
        self._initialize_ip_allowlist()
        
        logger.info("Webhook system initialized with auto-setup")
    
    def _initialize_ip_allowlist(self):
        """Initialize IP allowlist with known broker and service IPs"""
        # Alpaca IPs
        self.ip_allowlist.update([
            "52.4.0.0/14",      # Alpaca AWS US-East
            "54.208.0.0/13",    # Alpaca AWS US-East
            "3.208.0.0/12",     # Alpaca AWS
        ])
        
        # Binance IPs
        self.ip_allowlist.update([
            "52.84.0.0/15",     # Binance CloudFront
            "13.225.0.0/16",    # Binance CloudFront
            "52.124.128.0/17",  # Binance CloudFront
        ])
        
        # Interactive Brokers IPs
        self.ip_allowlist.update([
            "209.134.160.0/19",  # IB Gateway
            "198.190.48.0/20",   # IB Data Centers
        ])
        
        # TradingView IPs (for alerts)
        self.ip_allowlist.update([
            "52.89.214.238",
            "34.212.75.30",
            "54.218.53.128",
            "52.32.178.7"
        ])
        
        # Localhost for development
        self.ip_allowlist.add("127.0.0.1")
        self.ip_allowlist.add("::1")
        
        logger.info(f"IP allowlist initialized with {len(self.ip_allowlist)} entries")
    
    async def auto_setup_webhooks(self):
        """
        Automatically setup webhooks for all configured brokers
        This runs on deployment to ensure webhooks are registered
        """
        logger.info("Starting auto-setup of broker webhooks...")
        
        # Alpaca webhook setup
        alpaca_webhook = await self.setup_alpaca_webhook()
        if alpaca_webhook:
            self.broker_webhooks["alpaca"] = alpaca_webhook
        
        # Binance webhook setup
        binance_webhook = await self.setup_binance_webhook()
        if binance_webhook:
            self.broker_webhooks["binance"] = binance_webhook
        
        # Interactive Brokers webhook setup
        ib_webhook = await self.setup_ib_webhook()
        if ib_webhook:
            self.broker_webhooks["interactive_brokers"] = ib_webhook
        
        # TradingView webhook setup
        tv_webhook = await self.setup_tradingview_webhook()
        if tv_webhook:
            self.broker_webhooks["tradingview"] = tv_webhook
        
        # Coinbase webhook setup
        coinbase_webhook = await self.setup_coinbase_webhook()
        if coinbase_webhook:
            self.broker_webhooks["coinbase"] = coinbase_webhook
        
        logger.info(f"Auto-setup complete. {len(self.broker_webhooks)} webhooks configured")
    
    async def setup_alpaca_webhook(self) -> Optional[str]:
        """Setup Alpaca webhook for trade fills and account updates"""
        try:
            # Get deployment URL from environment
            deployment_url = "https://your-app.onrender.com"  # Will be set from env
            webhook_url = f"{deployment_url}/webhook/alpaca"
            
            # Generate webhook secret
            webhook_secret = self.generate_webhook_secret("alpaca")
            
            # Register webhook with Alpaca (mock for now)
            webhook_config = WebhookConfig(
                id="alpaca_fills",
                url=webhook_url,
                secret=webhook_secret,
                events=["trade_fill", "order_update", "account_update"],
                active=True
            )
            
            await self.register_webhook(webhook_config)
            
            logger.info(f"Alpaca webhook registered: {webhook_url}")
            return webhook_config.id
            
        except Exception as e:
            logger.error(f"Failed to setup Alpaca webhook: {e}")
            return None
    
    async def setup_binance_webhook(self) -> Optional[str]:
        """Setup Binance webhook for crypto trades"""
        try:
            deployment_url = "https://your-app.onrender.com"
            webhook_url = f"{deployment_url}/webhook/binance"
            
            webhook_secret = self.generate_webhook_secret("binance")
            
            webhook_config = WebhookConfig(
                id="binance_trades",
                url=webhook_url,
                secret=webhook_secret,
                events=["executionReport", "outboundAccountPosition", "balanceUpdate"],
                active=True
            )
            
            await self.register_webhook(webhook_config)
            
            logger.info(f"Binance webhook registered: {webhook_url}")
            return webhook_config.id
            
        except Exception as e:
            logger.error(f"Failed to setup Binance webhook: {e}")
            return None
    
    async def setup_ib_webhook(self) -> Optional[str]:
        """Setup Interactive Brokers webhook"""
        try:
            deployment_url = "https://your-app.onrender.com"
            webhook_url = f"{deployment_url}/webhook/ib"
            
            webhook_secret = self.generate_webhook_secret("interactive_brokers")
            
            webhook_config = WebhookConfig(
                id="ib_gateway",
                url=webhook_url,
                secret=webhook_secret,
                events=["execution", "commission", "position", "account"],
                active=True
            )
            
            await self.register_webhook(webhook_config)
            
            logger.info(f"IB webhook registered: {webhook_url}")
            return webhook_config.id
            
        except Exception as e:
            logger.error(f"Failed to setup IB webhook: {e}")
            return None
    
    async def setup_tradingview_webhook(self) -> Optional[str]:
        """Setup TradingView webhook for alerts"""
        try:
            deployment_url = "https://your-app.onrender.com"
            webhook_url = f"{deployment_url}/webhook/tradingview"
            
            # TradingView uses a different auth mechanism
            webhook_config = WebhookConfig(
                id="tradingview_alerts",
                url=webhook_url,
                secret="",  # TV uses message-based auth
                events=["alert", "strategy_signal"],
                active=True,
                headers={"X-TradingView-Signature": "required"}
            )
            
            await self.register_webhook(webhook_config)
            
            logger.info(f"TradingView webhook registered: {webhook_url}")
            return webhook_config.id
            
        except Exception as e:
            logger.error(f"Failed to setup TradingView webhook: {e}")
            return None
    
    async def setup_coinbase_webhook(self) -> Optional[str]:
        """Setup Coinbase webhook for crypto trades"""
        try:
            deployment_url = "https://your-app.onrender.com"
            webhook_url = f"{deployment_url}/webhook/coinbase"
            
            webhook_secret = self.generate_webhook_secret("coinbase")
            
            webhook_config = WebhookConfig(
                id="coinbase_events",
                url=webhook_url,
                secret=webhook_secret,
                events=["fills", "orders", "accounts"],
                active=True
            )
            
            await self.register_webhook(webhook_config)
            
            logger.info(f"Coinbase webhook registered: {webhook_url}")
            return webhook_config.id
            
        except Exception as e:
            logger.error(f"Failed to setup Coinbase webhook: {e}")
            return None
    
    def generate_webhook_secret(self, broker: str) -> str:
        """Generate secure webhook secret for a broker"""
        timestamp = str(time.time())
        data = f"{broker}_{timestamp}_infinity_secure"
        secret = hashlib.sha256(data.encode()).hexdigest()
        return secret
    
    async def register_webhook(self, config: WebhookConfig):
        """Register a new webhook"""
        self.webhooks[config.id] = config
        
        # Update event subscriptions
        for event in config.events:
            if event not in self.event_subscriptions:
                self.event_subscriptions[event] = []
            self.event_subscriptions[event].append(config.id)
        
        # Save to Redis if available
        if self.redis_client:
            await self.redis_client.hset(
                "webhooks",
                config.id,
                json.dumps(config.dict())
            )
        
        logger.info(f"Webhook registered: {config.id}")
    
    async def verify_ip(self, ip_address: str) -> bool:
        """Verify if IP is in allowlist"""
        # Check direct IP match
        if ip_address in self.ip_allowlist:
            return True
        
        # Check if IP is in blocklist
        if ip_address in self.ip_blocklist:
            return False
        
        # Check CIDR ranges
        try:
            ip_obj = ipaddress.ip_address(ip_address)
            for allowed_range in self.ip_allowlist:
                try:
                    if "/" in allowed_range:  # CIDR notation
                        network = ipaddress.ip_network(allowed_range, strict=False)
                        if ip_obj in network:
                            return True
                except ValueError:
                    continue
        except ValueError:
            logger.warning(f"Invalid IP address: {ip_address}")
            return False
        
        # Log unknown IP for review
        logger.warning(f"Unknown IP attempting webhook: {ip_address}")
        return False
    
    async def verify_signature(self, webhook_id: str, payload: bytes, signature: str) -> bool:
        """Verify webhook signature"""
        webhook = self.webhooks.get(webhook_id)
        if not webhook:
            return False
        
        if not webhook.secret:
            return True  # No secret configured
        
        # Calculate expected signature
        expected = hmac.new(
            webhook.secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Constant-time comparison
        return hmac.compare_digest(expected, signature)
    
    async def handle_webhook(self, request: Request, source: str) -> Dict:
        """
        Handle incoming webhook with ultra-low latency
        Processes in microseconds for infinity-speed execution
        """
        start_time = time.perf_counter()
        
        # Get client IP
        client_ip = request.client.host
        
        # Verify IP is allowlisted
        if not await self.verify_ip(client_ip):
            raise HTTPException(status_code=403, detail="IP not authorized")
        
        # Get payload
        payload = await request.body()
        
        # Parse JSON
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON")
        
        # Verify signature if present
        signature = request.headers.get("X-Webhook-Signature", "")
        webhook_id = f"{source}_webhook"
        
        if signature and not await self.verify_signature(webhook_id, payload, signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Create webhook event
        event = WebhookEvent(
            event_type=self._determine_event_type(source, data),
            timestamp=datetime.now().isoformat(),
            data=data,
            source=source,
            priority=self._determine_priority(source, data)
        )
        
        # Add to processing queue for async handling
        await self.webhook_queue.put(event)
        
        # Calculate latency
        latency_ms = (time.perf_counter() - start_time) * 1000
        self._update_stats(latency_ms)
        
        # Return immediate response (non-blocking)
        return {
            "status": "accepted",
            "event_id": hashlib.sha256(f"{event.timestamp}_{source}".encode()).hexdigest()[:16],
            "latency_ms": round(latency_ms, 3)
        }
    
    def _determine_event_type(self, source: str, data: Dict) -> str:
        """Determine event type from webhook data"""
        if source == "alpaca":
            return data.get("event", "unknown")
        elif source == "binance":
            return data.get("e", "unknown")  # Binance uses 'e' for event type
        elif source == "tradingview":
            return "alert"
        elif source == "interactive_brokers":
            return data.get("type", "unknown")
        elif source == "coinbase":
            return data.get("type", "unknown")
        else:
            return "unknown"
    
    def _determine_priority(self, source: str, data: Dict) -> str:
        """Determine event priority for processing order"""
        # Trade fills are critical priority
        if "fill" in str(data).lower() or "execution" in str(data).lower():
            return "critical"
        
        # Order updates are high priority
        if "order" in str(data).lower():
            return "high"
        
        # Account updates are normal priority
        if "account" in str(data).lower() or "balance" in str(data).lower():
            return "normal"
        
        # Everything else is low priority
        return "low"
    
    async def process_webhook_queue(self):
        """
        Process webhook events from queue with priority handling
        Runs continuously for infinity-speed processing
        """
        priority_queues = {
            "critical": [],
            "high": [],
            "normal": [],
            "low": []
        }
        
        while True:
            try:
                # Get event from queue (non-blocking with short timeout)
                try:
                    event = await asyncio.wait_for(
                        self.webhook_queue.get(),
                        timeout=0.01  # 10ms timeout for ultra-fast processing
                    )
                    priority_queues[event.priority].append(event)
                except asyncio.TimeoutError:
                    pass
                
                # Process events by priority
                for priority in ["critical", "high", "normal", "low"]:
                    if priority_queues[priority]:
                        event = priority_queues[priority].pop(0)
                        await self.process_webhook_event(event)
                
                # Micro-sleep to prevent CPU spinning
                await asyncio.sleep(0.001)  # 1ms
                
            except Exception as e:
                logger.error(f"Error processing webhook queue: {e}")
                await asyncio.sleep(0.1)
    
    async def process_webhook_event(self, event: WebhookEvent):
        """Process individual webhook event"""
        try:
            logger.info(f"Processing {event.priority} priority event: {event.event_type} from {event.source}")
            
            # Route to appropriate handler
            if event.source == "alpaca":
                await self.process_alpaca_event(event)
            elif event.source == "binance":
                await self.process_binance_event(event)
            elif event.source == "tradingview":
                await self.process_tradingview_event(event)
            elif event.source == "interactive_brokers":
                await self.process_ib_event(event)
            elif event.source == "coinbase":
                await self.process_coinbase_event(event)
            else:
                logger.warning(f"Unknown webhook source: {event.source}")
            
            # Trigger any subscribed webhooks
            await self.trigger_event_webhooks(event.event_type, event.data)
            
            # Update stats
            self.webhook_stats["total_received"] += 1
            
        except Exception as e:
            logger.error(f"Error processing webhook event: {e}")
            self.webhook_stats["total_failed"] += 1
    
    async def process_alpaca_event(self, event: WebhookEvent):
        """Process Alpaca webhook event"""
        data = event.data
        
        if event.event_type == "trade_fill":
            # Process trade fill with infinity precision
            await self.handle_trade_fill("alpaca", {
                "symbol": data.get("symbol"),
                "qty": Decimal(str(data.get("qty", 0))),
                "price": Decimal(str(data.get("price", 0))),
                "side": data.get("side"),
                "order_id": data.get("order_id"),
                "filled_at": data.get("filled_at")
            })
        
        elif event.event_type == "order_update":
            # Handle order status update
            await self.handle_order_update("alpaca", data)
        
        elif event.event_type == "account_update":
            # Handle account balance update
            await self.handle_account_update("alpaca", data)
    
    async def process_binance_event(self, event: WebhookEvent):
        """Process Binance webhook event"""
        data = event.data
        
        if event.event_type == "executionReport":
            # Process trade execution
            if data.get("X") == "FILLED":  # Order filled
                await self.handle_trade_fill("binance", {
                    "symbol": data.get("s"),
                    "qty": Decimal(str(data.get("q", 0))),
                    "price": Decimal(str(data.get("p", 0))),
                    "side": data.get("S"),
                    "order_id": data.get("i"),
                    "filled_at": data.get("T")
                })
        
        elif event.event_type == "outboundAccountPosition":
            # Handle account position update
            await self.handle_account_update("binance", data)
    
    async def process_tradingview_event(self, event: WebhookEvent):
        """Process TradingView alert webhook"""
        data = event.data
        
        # Parse TradingView alert
        alert_message = data.get("message", "")
        
        # Extract trading signal
        signal = self.parse_tradingview_alert(alert_message)
        
        if signal:
            # Route to trading engine
            await self.handle_trading_signal("tradingview", signal)
    
    async def process_ib_event(self, event: WebhookEvent):
        """Process Interactive Brokers webhook event"""
        data = event.data
        
        if event.event_type == "execution":
            # Process trade execution
            await self.handle_trade_fill("interactive_brokers", {
                "symbol": data.get("symbol"),
                "qty": Decimal(str(data.get("shares", 0))),
                "price": Decimal(str(data.get("price", 0))),
                "side": data.get("side"),
                "order_id": data.get("orderId"),
                "filled_at": data.get("time")
            })
        
        elif event.event_type == "position":
            # Handle position update
            await self.handle_position_update("interactive_brokers", data)
    
    async def process_coinbase_event(self, event: WebhookEvent):
        """Process Coinbase webhook event"""
        data = event.data
        
        if event.event_type == "fills":
            # Process crypto fill
            await self.handle_trade_fill("coinbase", {
                "symbol": data.get("product_id"),
                "qty": Decimal(str(data.get("size", 0))),
                "price": Decimal(str(data.get("price", 0))),
                "side": data.get("side"),
                "order_id": data.get("order_id"),
                "filled_at": data.get("created_at")
            })
    
    def parse_tradingview_alert(self, message: str) -> Optional[Dict]:
        """Parse TradingView alert message into trading signal"""
        try:
            # Expected format: "BUY AAPL 150.50 SL:149.00 TP:153.00"
            parts = message.split()
            
            if len(parts) >= 3:
                return {
                    "action": parts[0],
                    "symbol": parts[1],
                    "price": Decimal(parts[2]),
                    "stop_loss": Decimal(parts[3].split(":")[1]) if len(parts) > 3 else None,
                    "take_profit": Decimal(parts[4].split(":")[1]) if len(parts) > 4 else None
                }
        except Exception as e:
            logger.error(f"Failed to parse TradingView alert: {e}")
        
        return None
    
    async def handle_trade_fill(self, broker: str, fill_data: Dict):
        """Handle trade fill from any broker with infinity precision"""
        logger.info(f"Trade fill from {broker}: {fill_data}")
        
        # Store in Redis for fast access
        if self.redis_client:
            fill_key = f"fill:{broker}:{fill_data['order_id']}"
            await self.redis_client.setex(
                fill_key,
                3600,  # 1 hour TTL
                json.dumps(fill_data, default=str)
            )
        
        # Notify trading engine
        # This would integrate with your bot engine
        pass
    
    async def handle_order_update(self, broker: str, order_data: Dict):
        """Handle order status update"""
        logger.info(f"Order update from {broker}: {order_data.get('order_id')}")
        
        # Update order status in system
        pass
    
    async def handle_account_update(self, broker: str, account_data: Dict):
        """Handle account balance/position update"""
        logger.info(f"Account update from {broker}")
        
        # Update account metrics
        pass
    
    async def handle_position_update(self, broker: str, position_data: Dict):
        """Handle position update"""
        logger.info(f"Position update from {broker}: {position_data}")
        
        # Update position tracking
        pass
    
    async def handle_trading_signal(self, source: str, signal: Dict):
        """Handle trading signal from alerts"""
        logger.info(f"Trading signal from {source}: {signal}")
        
        # Route to trading engine for execution
        pass
    
    async def trigger_event_webhooks(self, event_type: str, data: Dict):
        """Trigger webhooks subscribed to an event"""
        webhook_ids = self.event_subscriptions.get(event_type, [])
        
        for webhook_id in webhook_ids:
            webhook = self.webhooks.get(webhook_id)
            if webhook and webhook.active:
                asyncio.create_task(self.send_webhook(webhook, event_type, data))
    
    async def send_webhook(self, webhook: WebhookConfig, event_type: str, data: Dict):
        """Send webhook with retries and timeout"""
        payload = {
            "event": event_type,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        
        # Calculate signature
        signature = hmac.new(
            webhook.secret.encode(),
            json.dumps(payload).encode(),
            hashlib.sha256
        ).hexdigest()
        
        headers = webhook.headers.copy()
        headers["X-Webhook-Signature"] = signature
        headers["Content-Type"] = "application/json"
        
        # Send with retries
        for attempt in range(webhook.retry_count):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        webhook.url,
                        json=payload,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=webhook.timeout)
                    ) as response:
                        if response.status < 300:
                            self.webhook_stats["total_sent"] += 1
                            logger.info(f"Webhook sent successfully to {webhook.id}")
                            return
                        else:
                            logger.warning(f"Webhook {webhook.id} returned {response.status}")
                            
            except Exception as e:
                logger.error(f"Failed to send webhook {webhook.id} (attempt {attempt + 1}): {e}")
                
                if attempt < webhook.retry_count - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        self.webhook_stats["total_failed"] += 1
    
    def _update_stats(self, latency_ms: float):
        """Update webhook statistics"""
        self.webhook_stats["total_received"] += 1
        
        # Update latency stats
        if latency_ms < self.webhook_stats["min_latency_ms"]:
            self.webhook_stats["min_latency_ms"] = latency_ms
        
        if latency_ms > self.webhook_stats["max_latency_ms"]:
            self.webhook_stats["max_latency_ms"] = latency_ms
        
        # Calculate running average
        total = self.webhook_stats["total_received"]
        current_avg = self.webhook_stats["avg_latency_ms"]
        self.webhook_stats["avg_latency_ms"] = (
            (current_avg * (total - 1) + latency_ms) / total
        )
    
    async def get_stats(self) -> Dict:
        """Get webhook statistics"""
        return self.webhook_stats.copy()
    
    async def load_webhooks(self):
        """Load saved webhooks from Redis"""
        if not self.redis_client:
            return
        
        try:
            webhooks = await self.redis_client.hgetall("webhooks")
            for webhook_id, webhook_data in webhooks.items():
                config = WebhookConfig(**json.loads(webhook_data))
                self.webhooks[webhook_id] = config
                
                # Rebuild event subscriptions
                for event in config.events:
                    if event not in self.event_subscriptions:
                        self.event_subscriptions[event] = []
                    self.event_subscriptions[event].append(webhook_id)
            
            logger.info(f"Loaded {len(self.webhooks)} webhooks from storage")
            
        except Exception as e:
            logger.error(f"Failed to load webhooks: {e}")
    
    async def cleanup(self):
        """Cleanup webhook handler resources"""
        if self.redis_client:
            await self.redis_client.close()
        
        logger.info("Webhook handler cleaned up")

# Global instance
webhook_handler = WebhookHandler()
