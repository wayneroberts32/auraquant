"""
AuraQuant Database Models
SQLAlchemy models for trades, positions, users, bot configurations, and audit trails
"""

from sqlalchemy import (
    Column, String, Integer, Float, Decimal, Boolean, DateTime, 
    Text, JSON, ForeignKey, Index, UniqueConstraint, CheckConstraint,
    Enum as SQLEnum, TIMESTAMP
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from datetime import datetime
from decimal import Decimal as DecimalType
import enum
import uuid

Base = declarative_base()

# Enums for various states and types

class OrderStatus(enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    PARTIAL = "partial"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"

class OrderType(enum.Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"
    TRAILING_STOP = "trailing_stop"
    ICEBERG = "iceberg"

class OrderSide(enum.Enum):
    BUY = "buy"
    SELL = "sell"

class PositionStatus(enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    PARTIAL = "partial"

class TradingMode(enum.Enum):
    PAPER = "paper"
    MICRO = "micro"
    FULL = "full"
    BLOCKED = "blocked"

class BotStatus(enum.Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"
    EMERGENCY_STOP = "emergency_stop"

class UserRole(enum.Enum):
    ADMIN = "admin"
    TRADER = "trader"
    VIEWER = "viewer"
    API = "api"

class AlertSeverity(enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

# User and Authentication Models

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.VIEWER, nullable=False)
    
    # Profile
    full_name = Column(String(255))
    phone = Column(String(50))
    country = Column(String(2))  # ISO country code
    timezone = Column(String(50), default='Australia/Perth')
    
    # Security
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255))
    api_key = Column(String(64), unique=True, index=True)
    api_secret_hash = Column(String(255))
    
    # Compliance
    kyc_verified = Column(Boolean, default=False)
    kyc_date = Column(DateTime)
    tax_id = Column(String(100))
    w8ben_status = Column(String(50))
    w8ben_expiry = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    bot_configs = relationship("BotConfiguration", back_populates="user")
    trades = relationship("Trade", back_populates="user")
    positions = relationship("Position", back_populates="user")
    alerts = relationship("Alert", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class UserSession(Base):
    __tablename__ = 'user_sessions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    
    token = Column(String(500), unique=True, nullable=False, index=True)
    refresh_token = Column(String(500), unique=True, index=True)
    
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    device_id = Column(String(100))
    
    expires_at = Column(DateTime, nullable=False)
    refresh_expires_at = Column(DateTime)
    
    created_at = Column(DateTime, default=func.now())
    last_activity = Column(DateTime, default=func.now())
    
    user = relationship("User", back_populates="sessions")

# Bot Configuration Models

class BotConfiguration(Base):
    __tablename__ = 'bot_configurations'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)
    
    # Mode and Status
    trading_mode = Column(SQLEnum(TradingMode), default=TradingMode.PAPER, nullable=False)
    bot_status = Column(SQLEnum(BotStatus), default=BotStatus.STOPPED, nullable=False)
    bot_version = Column(String(20), default='V1')
    
    # Risk Management (from Infinity specs)
    per_trade_var = Column(Decimal(10, 6), default=DecimalType('0.001'))  # 0.10%
    max_daily_loss = Column(Decimal(10, 6), default=DecimalType('0.005'))  # 0.50%
    rolling_drawdown_stop = Column(Decimal(10, 6), default=DecimalType('0.0125'))  # 1.25%
    symbol_risk_cap = Column(Decimal(10, 6), default=DecimalType('0.10'))  # 10%
    venue_risk_cap = Column(Decimal(10, 6), default=DecimalType('0.35'))  # 35%
    slippage_p95_threshold = Column(Decimal(10, 6), default=DecimalType('0.02'))  # 2%
    min_ev_ratio = Column(Decimal(10, 4), default=DecimalType('2.0'))
    
    # Capital Management
    initial_capital = Column(Decimal(20, 8), nullable=False)
    current_equity = Column(Decimal(20, 8))
    reserved_capital = Column(Decimal(20, 8), default=DecimalType('0'))
    
    # Strategy Settings
    enabled_strategies = Column(JSON, default=list)  # List of strategy IDs
    strategy_weights = Column(JSON, default=dict)  # Strategy allocation weights
    
    # Broker Settings
    primary_broker = Column(String(50))
    broker_accounts = Column(JSON, default=dict)  # Broker account mappings
    
    # Compliance Settings
    jurisdictions = Column(JSON, default=['AU'])  # List of allowed jurisdictions
    blocked_symbols = Column(JSON, default=list)
    require_travel_rule = Column(Boolean, default=True)
    
    # Performance Tracking
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    total_pnl = Column(Decimal(20, 8), default=DecimalType('0'))
    max_drawdown = Column(Decimal(10, 6), default=DecimalType('0'))
    sharpe_ratio = Column(Decimal(10, 4))
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_active = Column(DateTime)
    
    user = relationship("User", back_populates="bot_configs")
    strategies = relationship("Strategy", back_populates="bot_config")

# Trading Models

class Trade(Base):
    __tablename__ = 'trades'
    __table_args__ = (
        Index('idx_trades_user_time', 'user_id', 'executed_at'),
        Index('idx_trades_symbol', 'symbol'),
        Index('idx_trades_strategy', 'strategy_id'),
    )
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    order_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Trade Details
    symbol = Column(String(50), nullable=False)
    side = Column(SQLEnum(OrderSide), nullable=False)
    quantity = Column(Decimal(20, 8), nullable=False)
    price = Column(Decimal(20, 8), nullable=False)
    
    # Execution Details
    executed_at = Column(DateTime, nullable=False, index=True)
    venue = Column(String(50), nullable=False)
    execution_id = Column(String(100), unique=True)
    
    # Costs and Slippage
    commission = Column(Decimal(20, 8), default=DecimalType('0'))
    fees = Column(Decimal(20, 8), default=DecimalType('0'))
    slippage = Column(Decimal(10, 6))  # In basis points
    spread_cost = Column(Decimal(20, 8))
    funding_cost = Column(Decimal(20, 8))
    tax_withheld = Column(Decimal(20, 8))
    
    # P&L
    realized_pnl = Column(Decimal(20, 8))
    unrealized_pnl = Column(Decimal(20, 8))
    
    # Risk Metrics
    position_var = Column(Decimal(20, 8))  # Value at Risk
    signal_edge = Column(Decimal(10, 6))  # Expected edge
    ev_after_costs = Column(Decimal(10, 6))  # EV after all costs
    
    # Strategy and Signal
    strategy_id = Column(String(36), ForeignKey('strategies.id'))
    signal_strength = Column(Decimal(10, 6))
    entry_reason = Column(Text)
    
    # Compliance
    compliance_checked = Column(Boolean, default=False)
    travel_rule_complete = Column(Boolean, default=False)
    jurisdiction = Column(String(2))
    
    # Mode
    is_paper = Column(Boolean, default=False)
    is_canary = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="trades")
    strategy = relationship("Strategy", back_populates="trades")

class Position(Base):
    __tablename__ = 'positions'
    __table_args__ = (
        UniqueConstraint('user_id', 'symbol', 'venue', name='uq_user_symbol_venue'),
        Index('idx_positions_status', 'status'),
    )
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    
    # Position Details
    symbol = Column(String(50), nullable=False)
    venue = Column(String(50), nullable=False)
    status = Column(SQLEnum(PositionStatus), default=PositionStatus.OPEN, nullable=False)
    
    # Size and Cost
    quantity = Column(Decimal(20, 8), nullable=False)
    average_price = Column(Decimal(20, 8), nullable=False)
    current_price = Column(Decimal(20, 8))
    
    # P&L
    unrealized_pnl = Column(Decimal(20, 8), default=DecimalType('0'))
    realized_pnl = Column(Decimal(20, 8), default=DecimalType('0'))
    total_pnl = Column(Decimal(20, 8), default=DecimalType('0'))
    
    # Risk
    position_var = Column(Decimal(20, 8))
    beta = Column(Decimal(10, 4))
    correlation_cluster = Column(String(50))  # e.g., "meme", "defi", "tech"
    
    # Targets
    stop_loss = Column(Decimal(20, 8))
    take_profit = Column(Decimal(20, 8))
    trailing_stop_distance = Column(Decimal(10, 6))
    
    # Timestamps
    opened_at = Column(DateTime, default=func.now())
    closed_at = Column(DateTime)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="positions")

class Order(Base):
    __tablename__ = 'orders'
    __table_args__ = (
        Index('idx_orders_user_status', 'user_id', 'status'),
        Index('idx_orders_symbol', 'symbol'),
    )
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    
    # Order Details
    client_order_id = Column(String(100), unique=True, nullable=False, index=True)
    broker_order_id = Column(String(100), unique=True, index=True)
    
    symbol = Column(String(50), nullable=False)
    side = Column(SQLEnum(OrderSide), nullable=False)
    order_type = Column(SQLEnum(OrderType), nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    
    # Quantities and Prices
    quantity = Column(Decimal(20, 8), nullable=False)
    filled_quantity = Column(Decimal(20, 8), default=DecimalType('0'))
    limit_price = Column(Decimal(20, 8))
    stop_price = Column(Decimal(20, 8))
    average_fill_price = Column(Decimal(20, 8))
    
    # Time in Force
    time_in_force = Column(String(10), default='DAY')  # DAY, GTC, IOC, FOK
    expire_time = Column(DateTime)
    
    # Risk Gates Results
    risk_check_passed = Column(Boolean)
    risk_check_reason = Column(Text)
    compliance_passed = Column(Boolean)
    compliance_reason = Column(Text)
    
    # Venue
    venue = Column(String(50), nullable=False)
    route = Column(String(50))
    
    # Strategy
    strategy_id = Column(String(36), ForeignKey('strategies.id'))
    signal_id = Column(String(100))
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    submitted_at = Column(DateTime)
    filled_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# Strategy Models

class Strategy(Base):
    __tablename__ = 'strategies'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    bot_config_id = Column(String(36), ForeignKey('bot_configurations.id'), nullable=False)
    
    name = Column(String(100), nullable=False)
    strategy_type = Column(String(50), nullable=False)  # e.g., 'microstructure_thrust'
    version = Column(String(20), default='1.0.0')
    
    # Status
    is_active = Column(Boolean, default=True)
    is_paper_only = Column(Boolean, default=False)
    
    # Parameters
    parameters = Column(JSON, default=dict)
    
    # Risk Limits
    max_position_size = Column(Decimal(20, 8))
    max_daily_trades = Column(Integer)
    min_signal_strength = Column(Decimal(10, 6))
    
    # Performance
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    total_pnl = Column(Decimal(20, 8), default=DecimalType('0'))
    sharpe_ratio = Column(Decimal(10, 4))
    max_drawdown = Column(Decimal(10, 6))
    
    # Canary Status
    canary_fills = Column(Integer, default=0)
    canary_p95_slippage = Column(Decimal(10, 6))
    canary_passed = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_signal_at = Column(DateTime)
    
    bot_config = relationship("BotConfiguration", back_populates="strategies")
    trades = relationship("Trade", back_populates="strategy")

# Market Data Models

class MarketData(Base):
    __tablename__ = 'market_data'
    __table_args__ = (
        Index('idx_market_data_symbol_time', 'symbol', 'timestamp'),
        Index('idx_market_data_venue', 'venue'),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    symbol = Column(String(50), nullable=False)
    venue = Column(String(50), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    
    # OHLCV
    open = Column(Decimal(20, 8))
    high = Column(Decimal(20, 8))
    low = Column(Decimal(20, 8))
    close = Column(Decimal(20, 8), nullable=False)
    volume = Column(Decimal(20, 8))
    
    # Bid/Ask
    bid = Column(Decimal(20, 8))
    ask = Column(Decimal(20, 8))
    bid_size = Column(Decimal(20, 8))
    ask_size = Column(Decimal(20, 8))
    
    # Market Microstructure
    spread = Column(Decimal(10, 6))  # In basis points
    imbalance = Column(Decimal(10, 6))
    trade_count = Column(Integer)
    
    # Additional Metrics
    vwap = Column(Decimal(20, 8))
    twap = Column(Decimal(20, 8))
    volatility = Column(Decimal(10, 6))
    
    created_at = Column(DateTime, default=func.now())

# Compliance and Audit Models

class ComplianceCheck(Base):
    __tablename__ = 'compliance_checks'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    order_id = Column(String(36), ForeignKey('orders.id'))
    trade_id = Column(String(36), ForeignKey('trades.id'))
    
    check_type = Column(String(50), nullable=False)  # 'pre_trade', 'post_trade', 'periodic'
    jurisdiction = Column(String(2))
    
    # Check Results
    passed = Column(Boolean, nullable=False)
    reason = Column(Text)
    rules_checked = Column(JSON, default=list)
    
    # Specific Checks
    pdt_check = Column(Boolean)
    travel_rule_check = Column(Boolean)
    sanctions_check = Column(Boolean)
    kyc_check = Column(Boolean)
    tax_check = Column(Boolean)
    
    # Risk Scores
    risk_score = Column(Decimal(10, 4))
    venue_risk_score = Column(Decimal(10, 4))
    counterparty_risk_score = Column(Decimal(10, 4))
    
    timestamp = Column(DateTime, default=func.now())

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    __table_args__ = (
        Index('idx_audit_logs_user', 'user_id'),
        Index('idx_audit_logs_timestamp', 'timestamp'),
        Index('idx_audit_logs_entity', 'entity_type', 'entity_id'),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey('users.id'))
    
    action = Column(String(50), nullable=False)  # 'create', 'update', 'delete', 'login', etc.
    entity_type = Column(String(50))  # 'order', 'trade', 'position', etc.
    entity_id = Column(String(36))
    
    # Details
    old_values = Column(JSON)
    new_values = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    
    # Result
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    
    user = relationship("User", back_populates="audit_logs")

# Alert and Notification Models

class Alert(Base):
    __tablename__ = 'alerts'
    __table_args__ = (
        Index('idx_alerts_user_severity', 'user_id', 'severity'),
        Index('idx_alerts_timestamp', 'timestamp'),
    )
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'))
    
    severity = Column(SQLEnum(AlertSeverity), nullable=False)
    category = Column(String(50), nullable=False)  # 'risk', 'compliance', 'performance', etc.
    
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # Context
    symbol = Column(String(50))
    strategy_id = Column(String(36))
    order_id = Column(String(36))
    
    # Delivery
    channels = Column(JSON, default=['ui'])  # 'ui', 'email', 'telegram', 'discord'
    sent_at = Column(DateTime)
    acknowledged_at = Column(DateTime)
    
    # Auto-resolution
    auto_resolve = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolution = Column(Text)
    
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    
    user = relationship("User", back_populates="alerts")

# Performance Metrics Models

class DailyPerformance(Base):
    __tablename__ = 'daily_performance'
    __table_args__ = (
        UniqueConstraint('user_id', 'date', name='uq_user_date'),
        Index('idx_daily_performance_date', 'date'),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    date = Column(DateTime, nullable=False)
    
    # P&L
    gross_pnl = Column(Decimal(20, 8), default=DecimalType('0'))
    net_pnl = Column(Decimal(20, 8), default=DecimalType('0'))
    fees = Column(Decimal(20, 8), default=DecimalType('0'))
    
    # Trading Activity
    trades_count = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    losing_trades = Column(Integer, default=0)
    
    # Risk Metrics
    max_drawdown = Column(Decimal(10, 6))
    var_breach_count = Column(Integer, default=0)
    sharpe_ratio = Column(Decimal(10, 4))
    
    # Slippage
    average_slippage = Column(Decimal(10, 6))
    p95_slippage = Column(Decimal(10, 6))
    
    # Capital
    starting_equity = Column(Decimal(20, 8))
    ending_equity = Column(Decimal(20, 8))
    
    created_at = Column(DateTime, default=func.now())

# Backtesting Models

class Backtest(Base):
    __tablename__ = 'backtests'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    
    name = Column(String(100), nullable=False)
    strategy_id = Column(String(36), ForeignKey('strategies.id'))
    
    # Period
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    # Configuration
    initial_capital = Column(Decimal(20, 8), nullable=False)
    parameters = Column(JSON, default=dict)
    
    # Results
    final_equity = Column(Decimal(20, 8))
    total_return = Column(Decimal(10, 6))
    sharpe_ratio = Column(Decimal(10, 4))
    max_drawdown = Column(Decimal(10, 6))
    win_rate = Column(Decimal(10, 6))
    profit_factor = Column(Decimal(10, 4))
    
    # Trade Statistics
    total_trades = Column(Integer)
    winning_trades = Column(Integer)
    losing_trades = Column(Integer)
    average_win = Column(Decimal(20, 8))
    average_loss = Column(Decimal(20, 8))
    
    # Status
    status = Column(String(20), default='pending')  # pending, running, completed, failed
    progress = Column(Integer, default=0)
    error_message = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)

# Venue and Broker Models

class Venue(Base):
    __tablename__ = 'venues'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), unique=True, nullable=False)
    venue_type = Column(String(20), nullable=False)  # 'exchange', 'broker', 'otc'
    
    # Compliance
    is_licensed = Column(Boolean, default=True)
    kyc_capable = Column(Boolean, default=True)
    travel_rule_capable = Column(Boolean, default=False)
    jurisdictions = Column(JSON, default=list)
    
    # Risk Scoring
    risk_score = Column(Decimal(10, 4), default=DecimalType('1.0'))
    uptime_percentage = Column(Decimal(10, 4))
    withdrawal_reliability = Column(Decimal(10, 4))
    has_proof_of_reserves = Column(Boolean, default=False)
    
    # Trading Limits
    min_order_size = Column(Decimal(20, 8))
    max_order_size = Column(Decimal(20, 8))
    maker_fee = Column(Decimal(10, 6))
    taker_fee = Column(Decimal(10, 6))
    
    # API Configuration
    api_endpoint = Column(String(500))
    websocket_endpoint = Column(String(500))
    rate_limit = Column(Integer)  # requests per second
    
    # Status
    is_active = Column(Boolean, default=True)
    maintenance_mode = Column(Boolean, default=False)
    last_health_check = Column(DateTime)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# Create indexes for performance
Index('idx_trades_composite', Trade.user_id, Trade.executed_at, Trade.symbol)
Index('idx_positions_composite', Position.user_id, Position.status, Position.symbol)
Index('idx_orders_composite', Order.user_id, Order.status, Order.created_at)
