/**
 * AuraQuant Infinity - Configuration Module
 * Live Trading Platform Configuration
 */

window.Config = {
    // API Configuration - Connected to Render backend
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:8000/api'  // Local development
        : 'https://auraquant-backend.onrender.com/api',  // Production Render URL
    
    WS_URL: window.location.hostname === 'localhost'
        ? 'ws://localhost:8000/ws'  // Local development
        : 'wss://auraquant-backend.onrender.com/ws',  // Production Render URL
    
    // Environment
    ENVIRONMENT: window.location.hostname === 'localhost' ? 'development' : 'production',
    DEBUG: window.location.hostname === 'localhost',
    
    // Platform Settings
    PLATFORM: {
        NAME: 'AuraQuant Infinity',
        VERSION: '∞',
        INITIAL_CAPITAL: 500, // AUD
        TARGET_CAPITAL: 100000, // AUD
        MAX_DRAWDOWN: 2, // Percentage
        DEFAULT_TIMEZONE: 'Australia/Perth',
        MARKET_TIMEZONE: 'America/New_York',
        LANGUAGE: 'en',
        CURRENCY: 'AUD'
    },
    
    // Trading Configuration
    TRADING: {
        DEFAULT_POSITION_SIZE: 10, // Percentage of capital
        MAX_POSITIONS: 10,
        DEFAULT_STOP_LOSS: 2, // Percentage
        DEFAULT_TAKE_PROFIT: 5, // Percentage
        MIN_ORDER_VALUE: 1, // Minimum order value in base currency
        MAX_ORDER_VALUE: 100000,
        SLIPPAGE_TOLERANCE: 0.1, // Percentage
        ORDER_TYPES: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'],
        SUPPORTED_VENUES: ['NYSE', 'NASDAQ', 'ASX', 'LSE', 'CRYPTO']
    },
    
    // Broker Configuration
    BROKERS: {
        ALPACA: {
            API_URL: 'https://api.alpaca.markets',
            WS_URL: 'wss://stream.data.alpaca.markets',
            PAPER_URL: 'https://paper-api.alpaca.markets',
            ENABLED: true
        },
        BINANCE: {
            API_URL: 'https://api.binance.com',
            WS_URL: 'wss://stream.binance.com:9443',
            TESTNET_URL: 'https://testnet.binance.vision',
            ENABLED: true
        },
        INTERACTIVE_BROKERS: {
            API_URL: 'https://localhost:5000/v1',
            WS_URL: 'wss://localhost:5000/v1/ws',
            ENABLED: true
        },
        COINBASE: {
            API_URL: 'https://api.exchange.coinbase.com',
            WS_URL: 'wss://ws-feed.exchange.coinbase.com',
            SANDBOX_URL: 'https://api-public.sandbox.exchange.coinbase.com',
            ENABLED: true
        },
        NAB: {
            API_URL: 'https://api.nab.com.au',
            ENABLED: true
        }
    },
    
    // AI Configuration
    AI: {
        OPENAI: {
            API_URL: 'https://api.openai.com/v1',
            MODEL: 'gpt-4-turbo-preview',
            MAX_TOKENS: 4000,
            TEMPERATURE: 0.7,
            ENABLED: true
        },
        CLAUDE: {
            API_URL: 'https://api.anthropic.com/v1',
            MODEL: 'claude-3-opus-20240229',
            MAX_TOKENS: 4000,
            ENABLED: true
        },
        DEEPSEEK: {
            API_URL: 'https://api.deepseek.com/v1',
            MODEL: 'deepseek-coder',
            ENABLED: true
        },
        GITHUB_COPILOT: {
            ENABLED: false // Requires separate integration
        }
    },
    
    // Social Media Configuration
    SOCIAL: {
        DISCORD: {
            WEBHOOK_URL: '', // Will be loaded from backend API
            ENABLED: true
        },
        TELEGRAM: {
            BOT_TOKEN: '', // Will be loaded from backend API
            CHAT_ID: '', // Will be loaded from backend API
            ENABLED: true
        },
        TWITTER: {
            API_URL: 'https://api.twitter.com/2',
            ENABLED: true
        },
        EMAIL: {
            SENDGRID_API_URL: 'https://api.sendgrid.com/v3',
            FROM_EMAIL: 'alerts@auraquant.com',
            ENABLED: true
        }
    },
    
    // Market Data Providers
    MARKET_DATA: {
        POLYGON: {
            API_URL: 'https://api.polygon.io',
            WS_URL: 'wss://socket.polygon.io',
            ENABLED: true
        },
        ALPHA_VANTAGE: {
            API_URL: 'https://www.alphavantage.co/query',
            ENABLED: true
        },
        FINNHUB: {
            API_URL: 'https://finnhub.io/api/v1',
            WS_URL: 'wss://ws.finnhub.io',
            ENABLED: true
        },
        IEX_CLOUD: {
            API_URL: 'https://cloud.iexapis.com/stable',
            SANDBOX_URL: 'https://sandbox.iexapis.com/stable',
            ENABLED: true
        }
    },
    
    // Screener Configuration
    SCREENER: {
        MAX_RESULTS: 100,
        UPDATE_INTERVAL: 5000, // milliseconds
        SCAN_CATEGORIES: [
            'PRE_MARKET',
            'MOMENTUM',
            'BREAKOUT',
            'REVERSAL',
            'VWAP',
            'HALTS',
            'NEWS',
            'VOLUME',
            'TECHNICAL'
        ],
        DEFAULT_FILTERS: {
            MIN_PRICE: 1,
            MAX_PRICE: 10000,
            MIN_VOLUME: 100000,
            MIN_MARKET_CAP: 1000000
        }
    },
    
    // Chart Configuration
    CHARTS: {
        DEFAULT_TIMEFRAME: '15m',
        TIMEFRAMES: ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'],
        DEFAULT_INDICATORS: ['RSI', 'MACD', 'VOLUME'],
        MAX_BARS: 1000,
        UPDATE_INTERVAL: 1000,
        THEME: 'dark'
    },
    
    // Backtesting Configuration
    BACKTEST: {
        DEFAULT_PERIOD: '1Y',
        MAX_PERIOD: '10Y',
        INITIAL_CAPITAL: 10000,
        COMMISSION: 0.001, // 0.1%
        SLIPPAGE: 0.001, // 0.1%
        DATA_RESOLUTION: '1m'
    },
    
    // Webhook Configuration
    WEBHOOKS: {
        ALLOWED_IPS: [
            '52.89.214.238', // TradingView
            '34.212.75.30',  // TradingView
            '54.218.53.128', // TradingView
            '52.32.178.7',   // TradingView
        ],
        SIGNATURE_HEADER: 'X-Webhook-Signature',
        MAX_PAYLOAD_SIZE: 1048576, // 1MB
        TIMEOUT: 30000 // 30 seconds
    },
    
    // Honeypot Checker APIs
    HONEYPOT: {
        TOKEN_SNIFFER: {
            API_URL: 'https://tokensniffer.com/api/v2',
            ENABLED: true
        },
        HONEYPOT_IS: {
            API_URL: 'https://api.honeypot.is/v2',
            ENABLED: true
        },
        GOPLUS: {
            API_URL: 'https://api.gopluslabs.io/api/v1',
            ENABLED: true
        },
        DEX_TOOLS: {
            API_URL: 'https://api.dextools.io/v1',
            ENABLED: true
        }
    },
    
    // Audio Configuration
    AUDIO: {
        ENABLED: true,
        DEFAULT_VOLUME: 0.5,
        QUIET_HOURS: {
            ENABLED: true,
            START: '22:00',
            END: '07:00'
        },
        SOUNDS: {
            SUCCESS: '/assets/sounds/success.mp3',
            ERROR: '/assets/sounds/error.mp3',
            WARNING: '/assets/sounds/warning.mp3',
            ALERT_UP: '/assets/sounds/alert_up.mp3',
            ALERT_DOWN: '/assets/sounds/alert_down.mp3',
            ALERT_BREAK: '/assets/sounds/alert_break.mp3',
            ALERT_HOT: '/assets/sounds/alert_hot.mp3',
            ALERT_HALT: '/assets/sounds/alert_halt.mp3',
            BOT_START: '/assets/sounds/bot_start.mp3',
            BOT_STOP: '/assets/sounds/bot_stop.mp3',
            EMERGENCY: '/assets/sounds/emergency.mp3',
            ORDER_FILL: '/assets/sounds/order_fill.mp3',
            POSITION_OPEN: '/assets/sounds/position_open.mp3',
            POSITION_CLOSE: '/assets/sounds/position_close.mp3'
        }
    },
    
    // Backup Configuration
    BACKUP: {
        AUTO_BACKUP: true,
        INTERVAL: 3600000, // 1 hour in milliseconds
        PROVIDERS: {
            GOOGLE_DRIVE: {
                ENABLED: true,
                FOLDER_ID: '' // Will be loaded from backend API
            },
            AWS_S3: {
                ENABLED: true,
                BUCKET: '', // Will be loaded from backend API
                REGION: 'us-west-2'
            },
            LOCAL: {
                ENABLED: true,
                PATH: '/backups'
            }
        },
        MAX_BACKUPS: 100,
        RETENTION_DAYS: 30
    },
    
    // Security Configuration
    SECURITY: {
        JWT_EXPIRY: 86400, // 24 hours in seconds
        REFRESH_TOKEN_EXPIRY: 604800, // 7 days
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 900, // 15 minutes in seconds
        TWO_FACTOR_AUTH: true,
        IP_WHITELIST: [],
        ENCRYPTION: {
            ALGORITHM: 'AES-256-GCM',
            KEY_LENGTH: 32
        }
    },
    
    // Rate Limiting
    RATE_LIMITS: {
        API_CALLS_PER_MINUTE: 60,
        WS_MESSAGES_PER_SECOND: 10,
        ORDERS_PER_MINUTE: 30,
        SCREENER_SCANS_PER_MINUTE: 10
    },
    
    // Performance Monitoring
    MONITORING: {
        ENABLED: true,
        METRICS_INTERVAL: 60000, // 1 minute
        ALERT_THRESHOLDS: {
            CPU_USAGE: 80, // Percentage
            MEMORY_USAGE: 80, // Percentage
            LATENCY: 1000, // milliseconds
            ERROR_RATE: 5 // Percentage
        }
    },
    
    // Feature Flags
    FEATURES: {
        PAPER_TRADING: true,
        LIVE_TRADING: true,
        AI_SIGNALS: true,
        SOCIAL_TRADING: true,
        ADVANCED_CHARTS: true,
        PINE_SCRIPT: true,
        BACKTESTING: true,
        OPTIONS_TRADING: true,
        FUTURES_TRADING: true,
        CRYPTO_TRADING: true,
        FOREX_TRADING: true,
        NEWS_FEED: true,
        ECONOMIC_CALENDAR: true,
        RESEARCH_TOOLS: true,
        API_MANAGEMENT: true,
        AUTO_BACKUP: true,
        MULTI_BROKER: true,
        BOT_TRADING: true,
        MANUAL_OVERRIDE: true,
        EMERGENCY_STOP: true,
        HONEYPOT_CHECKER: true,
        WARRIOR_SCREENERS: true,
        TIMEZONE_DISPLAY: true,
        FX_CALCULATOR: true
    },
    
    // Initialize configuration
    async initialize() {
        try {
            // Load environment-specific configuration
            if (this.ENVIRONMENT === 'development') {
                await this.loadDevelopmentConfig();
            }
            
            // Validate configuration
            this.validateConfig();
            
            // Load API keys from secure storage
            await this.loadAPIKeys();
            
            console.log('✅ Configuration loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Configuration loading failed:', error);
            throw error;
        }
    },
    
    // Load development configuration
    async loadDevelopmentConfig() {
        // Override URLs for development
        this.API_BASE_URL = 'http://localhost:8000/api';
        this.WS_URL = 'ws://localhost:8000/ws';
        this.DEBUG = true;
    },
    
    // Validate configuration
    validateConfig() {
        const required = [
            'API_BASE_URL',
            'WS_URL',
            'ENVIRONMENT'
        ];
        
        for (const field of required) {
            if (!this[field]) {
                throw new Error(`Missing required configuration: ${field}`);
            }
        }
    },
    
    // Load API keys from secure storage
    async loadAPIKeys() {
        // In production, these would be loaded from secure environment variables
        // or encrypted storage
        
        // Placeholder for API key loading logic
        // Keys should never be hardcoded in production
    },
    
    // Get broker configuration
    getBrokerConfig(broker) {
        return this.BROKERS[broker.toUpperCase()];
    },
    
    // Get AI model configuration
    getAIConfig(provider) {
        return this.AI[provider.toUpperCase()];
    },
    
    // Get social platform configuration
    getSocialConfig(platform) {
        return this.SOCIAL[platform.toUpperCase()];
    },
    
    // Check if feature is enabled
    isFeatureEnabled(feature) {
        return this.FEATURES[feature.toUpperCase()] === true;
    },
    
    // Get rate limit for specific action
    getRateLimit(action) {
        return this.RATE_LIMITS[action.toUpperCase()];
    }
};

// Make Config available globally
if (typeof window !== 'undefined') {
    window.Config = Config;
}
