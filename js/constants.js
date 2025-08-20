/**
 * AuraQuant Constants Module
 * Central configuration for all platform constants and settings
 */

const Constants = {
    // Application Info
    APP: {
        NAME: 'AuraQuant',
        VERSION: '2.0.0',
        BUILD: '20240118',
        ENVIRONMENT: 'production', // 'development', 'staging', 'production'
        DEBUG: false,
        LOG_LEVEL: 'info' // 'debug', 'info', 'warn', 'error'
    },

    // API Endpoints
    API: {
        // Main Backend
        BASE_URL: process.env.API_BASE_URL || 'https://api.auraquant.com',
        WS_URL: process.env.WS_URL || 'wss://ws.auraquant.com',
        
        // Market Data Providers
        MARKET_DATA: {
            ALPHA_VANTAGE: 'https://www.alphavantage.co/query',
            YAHOO_FINANCE: 'https://query1.finance.yahoo.com/v8/finance',
            POLYGON: 'https://api.polygon.io',
            TWELVE_DATA: 'https://api.twelvedata.com',
            FINNHUB: 'https://finnhub.io/api/v1',
            IEX_CLOUD: 'https://cloud.iexapis.com/stable',
            MARKETSTACK: 'https://api.marketstack.com/v1',
            QUANDL: 'https://www.quandl.com/api/v3'
        },

        // Broker APIs
        BROKERS: {
            ALPACA: {
                LIVE: 'https://api.alpaca.markets',
                PAPER: 'https://paper-api.alpaca.markets',
                WS: 'wss://stream.alpaca.markets'
            },
            BINANCE: {
                SPOT: 'https://api.binance.com',
                FUTURES: 'https://fapi.binance.com',
                WS: 'wss://stream.binance.com:9443/ws',
                TESTNET: 'https://testnet.binance.vision'
            },
            INTERACTIVE_BROKERS: {
                GATEWAY: 'https://localhost:5000/v1/api',
                WS: 'wss://localhost:5000/v1/api/ws'
            },
            TD_AMERITRADE: {
                API: 'https://api.tdameritrade.com/v1',
                AUTH: 'https://auth.tdameritrade.com/auth'
            },
            PLUS500: {
                API: 'https://api.plus500.com/v1',
                DEMO: 'https://demo-api.plus500.com/v1'
            },
            NAB: {
                API: 'https://api.nab.com.au/v1',
                TRADING: 'https://trading.nab.com.au/api',
                AUTH: 'https://auth.nab.com.au/oauth2'
            }
        },

        // Crypto APIs
        CRYPTO: {
            COINGECKO: 'https://api.coingecko.com/api/v3',
            COINMARKETCAP: 'https://pro-api.coinmarketcap.com/v1',
            CRYPTOCOMPARE: 'https://min-api.cryptocompare.com',
            MESSARI: 'https://data.messari.io/api/v1',
            GLASSNODE: 'https://api.glassnode.com/v1',
            DEXSCREENER: 'https://api.dexscreener.com/latest',
            HONEYPOT: {
                TOKENSNIFFER: 'https://tokensniffer.com/api/v2',
                GOPLUS: 'https://api.gopluslabs.io/api/v1',
                HONEYPOT_IS: 'https://api.honeypot.is/v2',
                QUICKINTEL: 'https://api.quickintel.io/v1'
            }
        },

        // AI Services
        AI: {
            OPENAI: 'https://api.openai.com/v1',
            ANTHROPIC: 'https://api.anthropic.com/v1',
            DEEPSEEK: 'https://api.deepseek.com/v1',
            WARP: 'wss://api.warp.dev/ai',
            GITHUB_COPILOT: 'https://api.github.com/copilot',
            PERPLEXITY: 'https://api.perplexity.ai',
            MISTRAL: 'https://api.mistral.ai/v1'
        },

        // Social Media
        SOCIAL: {
            DISCORD: 'https://discord.com/api/v10',
            TELEGRAM: 'https://api.telegram.org',
            TWITTER: 'https://api.twitter.com/2',
            REDDIT: 'https://oauth.reddit.com',
            STOCKTWITS: 'https://api.stocktwits.com/api/2'
        },

        // News APIs
        NEWS: {
            BENZINGA: 'https://api.benzinga.com/api/v2',
            NEWSAPI: 'https://newsapi.org/v2',
            MARKETAUX: 'https://api.marketaux.com/v1',
            ALPHAVANTAGE: 'https://www.alphavantage.co/query'
        }
    },

    // WebSocket Events
    WS_EVENTS: {
        // Connection
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        ERROR: 'error',
        RECONNECT: 'reconnect',
        
        // Market Data
        PRICE_UPDATE: 'price_update',
        ORDERBOOK_UPDATE: 'orderbook_update',
        TRADE_UPDATE: 'trade_update',
        CANDLE_UPDATE: 'candle_update',
        
        // Trading
        ORDER_UPDATE: 'order_update',
        POSITION_UPDATE: 'position_update',
        BALANCE_UPDATE: 'balance_update',
        EXECUTION: 'execution',
        
        // Alerts
        ALERT_TRIGGERED: 'alert_triggered',
        SCANNER_HIT: 'scanner_hit',
        NEWS_ALERT: 'news_alert',
        
        // System
        HEARTBEAT: 'heartbeat',
        SYSTEM_STATUS: 'system_status',
        MAINTENANCE: 'maintenance'
    },

    // Trading Constants
    TRADING: {
        // Order Types
        ORDER_TYPES: {
            MARKET: 'market',
            LIMIT: 'limit',
            STOP: 'stop',
            STOP_LIMIT: 'stop_limit',
            TRAILING_STOP: 'trailing_stop',
            OCO: 'oco', // One-Cancels-Other
            BRACKET: 'bracket',
            ICEBERG: 'iceberg'
        },

        // Order Sides
        ORDER_SIDES: {
            BUY: 'buy',
            SELL: 'sell',
            BUY_TO_COVER: 'buy_to_cover',
            SELL_SHORT: 'sell_short'
        },

        // Order Status
        ORDER_STATUS: {
            NEW: 'new',
            PENDING: 'pending',
            ACCEPTED: 'accepted',
            PARTIALLY_FILLED: 'partially_filled',
            FILLED: 'filled',
            CANCELED: 'canceled',
            REJECTED: 'rejected',
            EXPIRED: 'expired'
        },

        // Time In Force
        TIME_IN_FORCE: {
            DAY: 'day',
            GTC: 'gtc', // Good Till Canceled
            IOC: 'ioc', // Immediate Or Cancel
            FOK: 'fok', // Fill Or Kill
            GTD: 'gtd', // Good Till Date
            OPG: 'opg', // At The Opening
            CLS: 'cls'  // At The Close
        },

        // Position Types
        POSITION_TYPES: {
            LONG: 'long',
            SHORT: 'short',
            FLAT: 'flat'
        },

        // Risk Management
        RISK: {
            MAX_POSITION_SIZE_PERCENT: 10,
            MAX_DAILY_LOSS_PERCENT: 2,
            MAX_PORTFOLIO_RISK_PERCENT: 6,
            DEFAULT_STOP_LOSS_PERCENT: 2,
            DEFAULT_TAKE_PROFIT_PERCENT: 4,
            MIN_RISK_REWARD_RATIO: 2,
            MAX_LEVERAGE: 5,
            MARGIN_CALL_LEVEL: 0.3,
            LIQUIDATION_LEVEL: 0.15
        },

        // Fees & Slippage
        FEES: {
            MAKER_FEE: 0.001, // 0.1%
            TAKER_FEE: 0.002, // 0.2%
            COMMISSION_PER_SHARE: 0.005,
            MIN_COMMISSION: 1.00,
            SLIPPAGE_PERCENT: 0.1
        }
    },

    // Market Hours (in UTC)
    MARKET_HOURS: {
        NYSE: {
            TIMEZONE: 'America/New_York',
            PRE_MARKET: { start: '04:00', end: '09:30' },
            REGULAR: { start: '09:30', end: '16:00' },
            AFTER_HOURS: { start: '16:00', end: '20:00' }
        },
        FOREX: {
            SYDNEY: { start: '21:00', end: '06:00' },
            TOKYO: { start: '00:00', end: '09:00' },
            LONDON: { start: '08:00', end: '17:00' },
            NEW_YORK: { start: '13:00', end: '22:00' }
        },
        CRYPTO: {
            OPEN_24_7: true
        },
        ASX: {
            TIMEZONE: 'Australia/Sydney',
            PRE_MARKET: { start: '07:00', end: '10:00' },
            REGULAR: { start: '10:00', end: '16:00' },
            AFTER_HOURS: { start: '16:10', end: '17:00' }
        }
    },

    // Timeframes
    TIMEFRAMES: {
        '1s': { label: '1 Second', seconds: 1 },
        '5s': { label: '5 Seconds', seconds: 5 },
        '10s': { label: '10 Seconds', seconds: 10 },
        '30s': { label: '30 Seconds', seconds: 30 },
        '1m': { label: '1 Minute', seconds: 60 },
        '3m': { label: '3 Minutes', seconds: 180 },
        '5m': { label: '5 Minutes', seconds: 300 },
        '15m': { label: '15 Minutes', seconds: 900 },
        '30m': { label: '30 Minutes', seconds: 1800 },
        '1h': { label: '1 Hour', seconds: 3600 },
        '2h': { label: '2 Hours', seconds: 7200 },
        '4h': { label: '4 Hours', seconds: 14400 },
        '6h': { label: '6 Hours', seconds: 21600 },
        '12h': { label: '12 Hours', seconds: 43200 },
        '1d': { label: '1 Day', seconds: 86400 },
        '1w': { label: '1 Week', seconds: 604800 },
        '1M': { label: '1 Month', seconds: 2592000 }
    },

    // Technical Indicators
    INDICATORS: {
        // Trend
        SMA: { name: 'Simple Moving Average', category: 'trend' },
        EMA: { name: 'Exponential Moving Average', category: 'trend' },
        WMA: { name: 'Weighted Moving Average', category: 'trend' },
        VWAP: { name: 'Volume Weighted Average Price', category: 'trend' },
        PSAR: { name: 'Parabolic SAR', category: 'trend' },
        ICHIMOKU: { name: 'Ichimoku Cloud', category: 'trend' },
        
        // Momentum
        RSI: { name: 'Relative Strength Index', category: 'momentum' },
        MACD: { name: 'MACD', category: 'momentum' },
        STOCH: { name: 'Stochastic', category: 'momentum' },
        CCI: { name: 'Commodity Channel Index', category: 'momentum' },
        MFI: { name: 'Money Flow Index', category: 'momentum' },
        ROC: { name: 'Rate of Change', category: 'momentum' },
        
        // Volatility
        BB: { name: 'Bollinger Bands', category: 'volatility' },
        ATR: { name: 'Average True Range', category: 'volatility' },
        KC: { name: 'Keltner Channels', category: 'volatility' },
        DC: { name: 'Donchian Channels', category: 'volatility' },
        
        // Volume
        OBV: { name: 'On Balance Volume', category: 'volume' },
        AD: { name: 'Accumulation/Distribution', category: 'volume' },
        CMF: { name: 'Chaikin Money Flow', category: 'volume' },
        VWAP: { name: 'VWAP', category: 'volume' }
    },

    // Chart Settings
    CHART: {
        TYPES: {
            CANDLESTICK: 'candlestick',
            LINE: 'line',
            AREA: 'area',
            BAR: 'bar',
            HEIKIN_ASHI: 'heikinashi',
            RENKO: 'renko',
            POINT_FIGURE: 'pointfigure',
            KAGI: 'kagi',
            RANGE: 'range'
        },
        
        THEMES: {
            DARK: {
                background: '#0a0e1a',
                grid: '#1a1e2e',
                text: '#d1d4dc',
                up: '#26a69a',
                down: '#ef5350',
                volume: '#26a69a40'
            },
            LIGHT: {
                background: '#ffffff',
                grid: '#e0e0e0',
                text: '#333333',
                up: '#26a69a',
                down: '#ef5350',
                volume: '#26a69a40'
            }
        },
        
        DEFAULT_CANDLES: 100,
        MAX_CANDLES: 5000,
        AUTO_SCALE: true,
        SHOW_VOLUME: true,
        SHOW_GRID: true
    },

    // Scanner/Screener Criteria
    SCANNER: {
        FILTERS: {
            PRICE: {
                MIN: 0,
                MAX: 999999,
                ABOVE_MA: [20, 50, 200],
                BELOW_MA: [20, 50, 200]
            },
            VOLUME: {
                MIN: 0,
                MAX: 999999999,
                ABOVE_AVG: [1.5, 2, 3, 5],
                UNUSUAL: 2
            },
            CHANGE: {
                MIN: -100,
                MAX: 1000,
                GAINERS: 5,
                LOSERS: -5
            },
            MARKET_CAP: {
                MICRO: { min: 0, max: 50000000 },
                SMALL: { min: 50000000, max: 2000000000 },
                MID: { min: 2000000000, max: 10000000000 },
                LARGE: { min: 10000000000, max: 999999999999 }
            },
            TECHNICAL: {
                RSI_OVERSOLD: 30,
                RSI_OVERBOUGHT: 70,
                MACD_CROSS: true,
                BB_SQUEEZE: true,
                BREAKOUT: true
            }
        },
        
        ALERT_TYPES: {
            PRICE_ALERT: 'price_alert',
            VOLUME_SURGE: 'volume_surge',
            BREAKOUT: 'breakout',
            PATTERN: 'pattern',
            NEWS: 'news',
            HALT: 'halt',
            UNUSUAL_ACTIVITY: 'unusual_activity'
        }
    },

    // Bot Settings
    BOT: {
        MODES: {
            MANUAL: 'manual',
            SEMI_AUTO: 'semi_auto',
            FULL_AUTO: 'full_auto'
        },
        
        STRATEGIES: {
            SCALPING: 'scalping',
            DAY_TRADING: 'day_trading',
            SWING: 'swing',
            POSITION: 'position',
            ARBITRAGE: 'arbitrage',
            MARKET_MAKING: 'market_making',
            MEAN_REVERSION: 'mean_reversion',
            MOMENTUM: 'momentum',
            PAIRS: 'pairs',
            GRID: 'grid'
        },
        
        VERSIONS: {
            BASIC: { id: 'v1', name: 'Basic Bot', features: ['basic_signals'] },
            ADVANCED: { id: 'v2', name: 'Advanced Bot', features: ['ml_signals', 'risk_management'] },
            PRO: { id: 'v3', name: 'Pro Bot', features: ['ml_signals', 'risk_management', 'portfolio'] },
            ELITE: { id: 'v4', name: 'Elite Bot', features: ['all'] }
        },
        
        DEFAULT_SETTINGS: {
            MAX_POSITIONS: 5,
            POSITION_SIZE_PERCENT: 2,
            STOP_LOSS_PERCENT: 2,
            TAKE_PROFIT_PERCENT: 4,
            TRAILING_STOP_PERCENT: 1,
            MIN_VOLUME: 1000000,
            MIN_PRICE: 1,
            MAX_PRICE: 10000,
            CONFIDENCE_THRESHOLD: 0.7
        }
    },

    // UI Constants
    UI: {
        // Screen IDs
        SCREENS: {
            DASHBOARD: 'dashboard-screen',
            TRADING: 'trading-screen',
            CHARTS: 'charts-screen',
            SCREENER: 'screener-screen',
            PORTFOLIO: 'portfolio-screen',
            ORDERS: 'orders-screen',
            POSITIONS: 'positions-screen',
            RISK: 'risk-screen',
            BACKTEST: 'backtest-screen',
            PINE_EDITOR: 'pine-editor-screen',
            AI_COMMAND: 'ai-command-screen',
            SOCIAL: 'social-screen',
            NEWS: 'news-screen',
            CALENDAR: 'calendar-screen',
            SETTINGS: 'settings-screen',
            BOT_CONTROL: 'bot-control-screen'
        },
        
        // Notification Types
        NOTIFICATIONS: {
            SUCCESS: 'success',
            ERROR: 'error',
            WARNING: 'warning',
            INFO: 'info',
            TRADE: 'trade',
            ALERT: 'alert'
        },
        
        // Animation Durations (ms)
        ANIMATIONS: {
            FAST: 200,
            NORMAL: 300,
            SLOW: 500,
            CHART_UPDATE: 100
        },
        
        // Refresh Rates (ms)
        REFRESH_RATES: {
            PRICES: 1000,
            ORDERBOOK: 500,
            POSITIONS: 5000,
            ACCOUNT: 10000,
            NEWS: 60000,
            SCANNER: 5000
        },
        
        // Theme Colors
        COLORS: {
            PRIMARY: '#4a90e2',
            SECONDARY: '#7b68ee',
            SUCCESS: '#26a69a',
            DANGER: '#ef5350',
            WARNING: '#ffa726',
            INFO: '#29b6f6',
            DARK: '#0a0e1a',
            LIGHT: '#ffffff',
            GRAY: '#9e9e9e'
        }
    },

    // Storage Keys
    STORAGE: {
        // LocalStorage
        LOCAL: {
            AUTH_TOKEN: 'auraquant_token',
            USER_PREFERENCES: 'auraquant_preferences',
            WORKSPACE: 'auraquant_workspace',
            WATCHLIST: 'auraquant_watchlist',
            ALERTS: 'auraquant_alerts',
            CHART_SETTINGS: 'auraquant_chart_settings',
            LAYOUT: 'auraquant_layout',
            API_KEYS: 'auraquant_api_keys'
        },
        
        // SessionStorage
        SESSION: {
            CURRENT_SYMBOL: 'current_symbol',
            ACTIVE_ORDERS: 'active_orders',
            POSITIONS: 'positions',
            MARKET_DATA_CACHE: 'market_data_cache'
        },
        
        // IndexedDB
        DB: {
            NAME: 'AuraQuantDB',
            VERSION: 1,
            STORES: {
                HISTORICAL_DATA: 'historical_data',
                BACKTEST_RESULTS: 'backtest_results',
                STRATEGIES: 'strategies',
                TRADE_HISTORY: 'trade_history',
                NEWS_CACHE: 'news_cache'
            }
        }
    },

    // Validation Rules
    VALIDATION: {
        // Symbol Patterns
        SYMBOL: {
            STOCK: /^[A-Z]{1,5}$/,
            FOREX: /^[A-Z]{6}$/,
            CRYPTO: /^[A-Z]{2,10}[-/][A-Z]{3,5}$/,
            OPTION: /^[A-Z]{1,5}\d{6}[CP]\d{8}$/
        },
        
        // Order Validation
        ORDER: {
            MIN_SIZE: 0.001,
            MAX_SIZE: 1000000,
            MIN_PRICE: 0.00001,
            MAX_PRICE: 999999,
            PRICE_PRECISION: 5,
            SIZE_PRECISION: 8
        },
        
        // Account Validation
        ACCOUNT: {
            MIN_BALANCE: 0,
            MIN_EQUITY: 25000, // PDT Rule
            MIN_MARGIN: 2000,
            MAX_LEVERAGE: 4
        },
        
        // API Key Patterns
        API_KEYS: {
            ALPACA: /^[A-Z0-9]{20}$/,
            BINANCE: /^[a-zA-Z0-9]{64}$/,
            OPENAI: /^sk-[a-zA-Z0-9]{48}$/,
            TELEGRAM: /^\d{10}:[a-zA-Z0-9_-]{35}$/
        }
    },

    // Error Messages
    ERRORS: {
        // Connection Errors
        CONNECTION: {
            TIMEOUT: 'Connection timeout. Please check your internet connection.',
            REFUSED: 'Connection refused. Server may be down.',
            LOST: 'Connection lost. Attempting to reconnect...',
            WS_FAILED: 'WebSocket connection failed.'
        },
        
        // Trading Errors
        TRADING: {
            INSUFFICIENT_BALANCE: 'Insufficient balance for this order.',
            INVALID_SYMBOL: 'Invalid trading symbol.',
            MARKET_CLOSED: 'Market is closed.',
            ORDER_REJECTED: 'Order rejected by broker.',
            POSITION_NOT_FOUND: 'Position not found.',
            MAX_POSITIONS: 'Maximum positions limit reached.',
            RISK_EXCEEDED: 'Risk limit exceeded.'
        },
        
        // API Errors
        API: {
            RATE_LIMIT: 'API rate limit exceeded. Please try again later.',
            INVALID_KEY: 'Invalid API key.',
            UNAUTHORIZED: 'Unauthorized access.',
            NOT_FOUND: 'Resource not found.',
            SERVER_ERROR: 'Server error. Please try again.'
        },
        
        // Validation Errors
        VALIDATION: {
            REQUIRED_FIELD: 'This field is required.',
            INVALID_FORMAT: 'Invalid format.',
            MIN_VALUE: 'Value is below minimum.',
            MAX_VALUE: 'Value exceeds maximum.',
            INVALID_EMAIL: 'Invalid email address.',
            WEAK_PASSWORD: 'Password is too weak.'
        }
    },

    // Success Messages
    SUCCESS: {
        ORDER_PLACED: 'Order placed successfully.',
        ORDER_CANCELED: 'Order canceled successfully.',
        POSITION_CLOSED: 'Position closed successfully.',
        SETTINGS_SAVED: 'Settings saved successfully.',
        STRATEGY_SAVED: 'Strategy saved successfully.',
        BACKTEST_COMPLETE: 'Backtest completed successfully.',
        ALERT_CREATED: 'Alert created successfully.',
        LOGIN_SUCCESS: 'Login successful.',
        SYNC_COMPLETE: 'Sync completed successfully.'
    },

    // Regex Patterns
    REGEX: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        PHONE: /^\+?[\d\s\-\(\)]+$/,
        URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
        IP_ADDRESS: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    },

    // Keyboard Shortcuts
    SHORTCUTS: {
        // Trading
        BUY: 'b',
        SELL: 's',
        CANCEL_ALL: 'Escape',
        CLOSE_POSITION: 'x',
        
        // Navigation
        DASHBOARD: '1',
        TRADING: '2',
        CHARTS: '3',
        SCREENER: '4',
        PORTFOLIO: '5',
        
        // Chart
        ZOOM_IN: '+',
        ZOOM_OUT: '-',
        RESET_CHART: 'r',
        TOGGLE_FULLSCREEN: 'f',
        
        // Tools
        LINE: 'l',
        FIBONACCI: 'f',
        MEASURE: 'm',
        TEXT: 't',
        
        // System
        SAVE: 'Ctrl+s',
        HELP: 'F1',
        SETTINGS: 'Ctrl+,',
        SEARCH: 'Ctrl+k'
    },

    // Currency & Locale
    LOCALE: {
        DEFAULT: 'en-US',
        TIMEZONE: 'Australia/Perth', // AWST
        CURRENCY: 'USD',
        DATE_FORMAT: 'DD/MM/YYYY',
        TIME_FORMAT: 'HH:mm:ss',
        NUMBER_FORMAT: {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        }
    },

    // Rate Limits
    RATE_LIMITS: {
        API_CALLS_PER_MINUTE: 60,
        WS_MESSAGES_PER_SECOND: 10,
        ORDERS_PER_MINUTE: 30,
        BACKTEST_PER_HOUR: 100,
        AI_QUERIES_PER_MINUTE: 20,
        NEWS_REFRESH_MINUTES: 5,
        SCANNER_REFRESH_SECONDS: 5
    },

    // File Limits
    FILE_LIMITS: {
        MAX_UPLOAD_SIZE: 10485760, // 10MB
        MAX_STRATEGY_SIZE: 1048576, // 1MB
        MAX_BACKTEST_HISTORY_DAYS: 365 * 5, // 5 years
        ALLOWED_EXTENSIONS: ['.csv', '.json', '.txt', '.pine'],
        MAX_WORKSPACE_SAVES: 10
    },

    // Performance Thresholds
    PERFORMANCE: {
        MAX_CHART_POINTS: 10000,
        MAX_ORDERBOOK_LEVELS: 50,
        MAX_TRADE_HISTORY: 1000,
        MAX_NOTIFICATIONS: 100,
        DEBOUNCE_DELAY: 300,
        THROTTLE_DELAY: 100,
        IDLE_TIMEOUT: 1800000 // 30 minutes
    }
};

// Freeze the object to prevent modifications
Object.freeze(Constants);

// Export for both CommonJS and ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
} else {
    window.Constants = Constants;
}

// Also export as ES6 module
export default Constants;