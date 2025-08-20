"""
Settings configuration for AuraQuant Backend
"""

import os
from typing import List
from pydantic import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", 8000))
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-jwt-secret-change-this")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "https://ai-auraquant.com",
        "https://auraquant-frontend.pages.dev",
        "https://57033049.auraquant-frontend.pages.dev",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000"
    ]
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://user:password@localhost/auraquant"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Trading Configuration
    MAX_DRAWDOWN_PERCENT: float = float(os.getenv("MAX_DRAWDOWN_PERCENT", "2"))
    INITIAL_CAPITAL: float = float(os.getenv("INITIAL_CAPITAL", "500"))
    TARGET_CAPITAL: float = float(os.getenv("TARGET_CAPITAL", "100000"))
    MAX_POSITIONS: int = int(os.getenv("MAX_POSITIONS", "10"))
    DEFAULT_STOP_LOSS: float = float(os.getenv("DEFAULT_STOP_LOSS", "2"))
    DEFAULT_TAKE_PROFIT: float = float(os.getenv("DEFAULT_TAKE_PROFIT", "5"))
    
    # Broker API Keys
    ALPACA_API_KEY: str = os.getenv("ALPACA_API_KEY", "")
    ALPACA_API_SECRET: str = os.getenv("ALPACA_API_SECRET", "")
    ALPACA_PAPER: bool = os.getenv("ALPACA_PAPER", "True").lower() == "true"
    
    BINANCE_API_KEY: str = os.getenv("BINANCE_API_KEY", "")
    BINANCE_API_SECRET: str = os.getenv("BINANCE_API_SECRET", "")
    BINANCE_TESTNET: bool = os.getenv("BINANCE_TESTNET", "True").lower() == "true"
    
    COINBASE_API_KEY: str = os.getenv("COINBASE_API_KEY", "")
    COINBASE_API_SECRET: str = os.getenv("COINBASE_API_SECRET", "")
    COINBASE_PASSPHRASE: str = os.getenv("COINBASE_PASSPHRASE", "")
    
    IB_GATEWAY_HOST: str = os.getenv("IB_GATEWAY_HOST", "localhost")
    IB_GATEWAY_PORT: int = int(os.getenv("IB_GATEWAY_PORT", "7497"))
    IB_CLIENT_ID: int = int(os.getenv("IB_CLIENT_ID", "1"))
    
    # Market Data Providers
    POLYGON_API_KEY: str = os.getenv("POLYGON_API_KEY", "")
    ALPHA_VANTAGE_API_KEY: str = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    FINNHUB_API_KEY: str = os.getenv("FINNHUB_API_KEY", "")
    IEX_CLOUD_API_KEY: str = os.getenv("IEX_CLOUD_API_KEY", "")
    
    # AI Services
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    
    # Social Media
    DISCORD_BOT_TOKEN: str = os.getenv("DISCORD_BOT_TOKEN", "")
    DISCORD_WEBHOOK_URL: str = os.getenv("DISCORD_WEBHOOK_URL", "")
    DISCORD_CHANNEL_ID: str = os.getenv("DISCORD_CHANNEL_ID", "1407369896089616635")
    
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
    
    TWITTER_API_KEY: str = os.getenv("TWITTER_API_KEY", "")
    TWITTER_API_SECRET: str = os.getenv("TWITTER_API_SECRET", "")
    TWITTER_ACCESS_TOKEN: str = os.getenv("TWITTER_ACCESS_TOKEN", "")
    TWITTER_ACCESS_TOKEN_SECRET: str = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", "")
    
    # Email
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "alerts@auraquant.com")
    EMAIL_TO: str = os.getenv("EMAIL_TO", "")
    
    # Webhook Security
    WEBHOOK_SECRET: str = os.getenv("WEBHOOK_SECRET", "your-webhook-secret")
    ALLOWED_WEBHOOK_IPS: List[str] = [
        "52.89.214.238",  # TradingView
        "34.212.75.30",   # TradingView
        "54.218.53.128",  # TradingView
        "52.32.178.7",    # TradingView
        "127.0.0.1",      # Local testing
    ]
    
    # Honeypot Checkers
    TOKEN_SNIFFER_API_KEY: str = os.getenv("TOKEN_SNIFFER_API_KEY", "")
    HONEYPOT_IS_API_KEY: str = os.getenv("HONEYPOT_IS_API_KEY", "")
    GOPLUS_API_KEY: str = os.getenv("GOPLUS_API_KEY", "")
    DEXTOOLS_API_KEY: str = os.getenv("DEXTOOLS_API_KEY", "")
    
    # Backup
    GOOGLE_DRIVE_CREDENTIALS: str = os.getenv("GOOGLE_DRIVE_CREDENTIALS", "")
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "")
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    API_RATE_LIMIT: int = 60  # requests per minute
    WS_RATE_LIMIT: int = 10   # messages per second
    
    # Monitoring
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create global settings instance
settings = Settings()
