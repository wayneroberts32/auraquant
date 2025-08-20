/**
 * AuraQuant Advanced WebSocket Module
 * Comprehensive real-time data streaming with multi-broker support
 * Enhanced version with full feature set
 */

import Constants from './constants.js';
import Helpers from './helpers.js';

class AdvancedWebSocketManager {
    constructor() {
        // Connection management
        this.connections = new Map();
        this.subscriptions = new Map();
        this.messageQueue = new Map();
        this.handlers = new Map();
        this.reconnectTimers = new Map();
        
        // Performance tracking
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            bytesReceived: 0,
            bytesSent: 0,
            connections: 0,
            errors: 0
        };
        
        // Configuration
        this.config = {
            reconnect: true,
            reconnectDelay: 1000,
            maxReconnectDelay: 30000,
            reconnectDecay: 1.5,
            heartbeatInterval: 30000,
            messageQueueSize: 1000,
            compression: true,
            binaryType: 'arraybuffer',
            maxConnections: 10
        };
        
        // Price cache for quick access
        this.priceCache = new Map();
        
        // Order book cache
        this.orderBookCache = new Map();
        
        this.init();
    }

    init() {
        this.setupEventHandlers();
        this.startHeartbeat();
        this.initializeBrokerConnections();
        console.log('Advanced WebSocket Manager initialized');
    }

    // ===========================
    // Broker-Specific Connections
    // ===========================

    async initializeBrokerConnections() {
        // Initialize connections based on configured brokers
        const brokers = await this.getConfiguredBrokers();
        
        for (const broker of brokers) {
            if (broker.enabled && broker.wsUrl) {
                try {
                    await this.connectBroker(broker);
                } catch (error) {
                    console.error(`Failed to connect to ${broker.name}:`, error);
                }
            }
        }
    }

    async getConfiguredBrokers() {
        // Get broker configuration from settings
        return [
            {
                name: 'binance',
                enabled: true,
                wsUrl: Constants.API.BROKERS.BINANCE.WS,
                apiKey: localStorage.getItem('binance_api_key'),
                apiSecret: localStorage.getItem('binance_api_secret')
            },
            {
                name: 'alpaca',
                enabled: true,
                wsUrl: Constants.API.BROKERS.ALPACA.WS,
                apiKey: localStorage.getItem('alpaca_api_key'),
                apiSecret: localStorage.getItem('alpaca_api_secret')
            },
            {
                name: 'nab',
                enabled: false,
                wsUrl: 'wss://trading.nab.com.au/ws',
                apiKey: localStorage.getItem('nab_api_key'),
                apiSecret: localStorage.getItem('nab_api_secret')
            }
        ];
    }

    async connectBroker(broker) {
        const id = `${broker.name}_${Date.now()}`;
        
        // Create broker-specific connection
        const connection = await this.connect(id, broker.wsUrl, {
            broker: broker.name,
            auth: {
                apiKey: broker.apiKey,
                apiSecret: broker.apiSecret
            }
        });
        
        // Setup broker-specific handlers
        this.setupBrokerHandlers(id, broker.name);
        
        return connection;
    }

    setupBrokerHandlers(id, brokerName) {
        switch (brokerName) {
            case 'binance':
                this.setupBinanceHandlers(id);
                break;
            case 'alpaca':
                this.setupAlpacaHandlers(id);
                break;
            case 'nab':
                this.setupNABHandlers(id);
                break;
            default:
                this.setupGenericHandlers(id);
        }
    }

    // ===========================
    // Binance Specific
    // ===========================

    setupBinanceHandlers(id) {
        // Binance-specific message handlers
        this.registerHandler(id, 'trade', (data) => {
            this.handleBinanceTrade(data);
        });
        
        this.registerHandler(id, 'kline', (data) => {
            this.handleBinanceKline(data);
        });
        
        this.registerHandler(id, 'depth', (data) => {
            this.handleBinanceDepth(data);
        });
        
        // Subscribe to default Binance streams
        this.subscribeBinanceStreams(id, ['BTCUSDT', 'ETHUSDT']);
    }

    subscribeBinanceStreams(id, symbols) {
        const streams = [];
        
        symbols.forEach(symbol => {
            const s = symbol.toLowerCase();
            streams.push(`${s}@trade`);
            streams.push(`${s}@kline_1m`);
            streams.push(`${s}@depth20`);
            streams.push(`${s}@ticker`);
        });
        
        this.send(id, {
            method: 'SUBSCRIBE',
            params: streams,
            id: Date.now()
        });
    }

    handleBinanceTrade(data) {
        const trade = {
            symbol: data.s,
            price: parseFloat(data.p),
            quantity: parseFloat(data.q),
            time: data.T,
            isBuyerMaker: data.m,
            tradeId: data.t
        };
        
        this.emit('trade', trade);
        this.updateLastPrice(trade.symbol, trade.price);
    }

    handleBinanceKline(data) {
        const kline = data.k;
        const candle = {
            symbol: data.s,
            interval: kline.i,
            time: kline.t,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v),
            closed: kline.x
        };
        
        this.emit('candle', candle);
        
        if (candle.closed) {
            this.updateChart(candle);
        }
    }

    handleBinanceDepth(data) {
        const orderBook = {
            symbol: data.s || data.symbol,
            bids: data.bids.map(([price, qty]) => ({
                price: parseFloat(price),
                quantity: parseFloat(qty)
            })),
            asks: data.asks.map(([price, qty]) => ({
                price: parseFloat(price),
                quantity: parseFloat(qty)
            })),
            lastUpdateId: data.lastUpdateId
        };
        
        this.orderBookCache.set(orderBook.symbol, orderBook);
        this.emit('orderbook', orderBook);
    }

    // ===========================
    // Alpaca Specific
    // ===========================

    setupAlpacaHandlers(id) {
        this.registerHandler(id, 'trade', (data) => {
            this.handleAlpacaTrade(data);
        });
        
        this.registerHandler(id, 'quote', (data) => {
            this.handleAlpacaQuote(data);
        });
        
        this.registerHandler(id, 'bar', (data) => {
            this.handleAlpacaBar(data);
        });
        
        // Authenticate with Alpaca
        this.authenticateAlpaca(id);
    }

    authenticateAlpaca(id) {
        const connection = this.connections.get(id);
        if (connection && connection.config.auth) {
            this.send(id, {
                action: 'auth',
                key: connection.config.auth.apiKey,
                secret: connection.config.auth.apiSecret
            });
        }
    }

    handleAlpacaTrade(data) {
        data.forEach(trade => {
            this.emit('trade', {
                symbol: trade.S,
                price: trade.p,
                quantity: trade.s,
                time: trade.t,
                exchange: trade.x,
                conditions: trade.c
            });
        });
    }

    handleAlpacaQuote(data) {
        data.forEach(quote => {
            this.emit('quote', {
                symbol: quote.S,
                bidPrice: quote.bp,
                bidSize: quote.bs,
                askPrice: quote.ap,
                askSize: quote.as,
                time: quote.t
            });
            
            this.updateLastPrice(quote.S, (quote.bp + quote.ap) / 2);
        });
    }

    handleAlpacaBar(data) {
        data.forEach(bar => {
            this.emit('bar', {
                symbol: bar.S,
                open: bar.o,
                high: bar.h,
                low: bar.l,
                close: bar.c,
                volume: bar.v,
                time: bar.t
            });
        });
    }

    // ===========================
    // NAB Bank Specific
    // ===========================

    setupNABHandlers(id) {
        // NAB-specific handlers for Australian market
        this.registerHandler(id, 'marketData', (data) => {
            this.handleNABMarketData(data);
        });
        
        this.registerHandler(id, 'accountUpdate', (data) => {
            this.handleNABAccountUpdate(data);
        });
        
        // Authenticate with NAB
        this.authenticateNAB(id);
    }

    authenticateNAB(id) {
        const connection = this.connections.get(id);
        if (connection && connection.config.auth) {
            this.send(id, {
                type: 'authenticate',
                clientId: connection.config.auth.apiKey,
                clientSecret: connection.config.auth.apiSecret,
                timestamp: Date.now()
            });
        }
    }

    handleNABMarketData(data) {
        // Process NAB market data
        this.emit('nab-market-data', data);
    }

    handleNABAccountUpdate(data) {
        // Process NAB account updates
        this.emit('nab-account-update', data);
    }

    // ===========================
    // Core Connection Management
    // ===========================

    async connect(id, url, options = {}) {
        if (this.connections.size >= this.config.maxConnections) {
            throw new Error('Maximum connections limit reached');
        }

        if (this.connections.has(id)) {
            console.warn(`Connection ${id} already exists`);
            return this.connections.get(id).ws;
        }

        const config = { ...this.config, ...options };
        
        return new Promise((resolve, reject) => {
            try {
                const ws = new WebSocket(url);
                ws.binaryType = config.binaryType;
                
                const connection = {
                    ws,
                    url,
                    config,
                    status: 'connecting',
                    reconnectAttempts: 0,
                    lastActivity: Date.now(),
                    connectedAt: null,
                    messageCount: 0,
                    bytesSent: 0,
                    bytesReceived: 0
                };
                
                this.connections.set(id, connection);
                this.stats.connections++;
                
                // Setup handlers
                ws.onopen = () => {
                    connection.status = 'connected';
                    connection.connectedAt = Date.now();
                    connection.reconnectAttempts = 0;
                    connection.lastActivity = Date.now();
                    
                    this.clearReconnectTimer(id);
                    this.processMessageQueue(id);
                    this.resubscribe(id);
                    
                    console.log(`✅ WebSocket ${id} connected to ${url}`);
                    this.emit('connected', { id, url });
                    resolve(ws);
                };
                
                ws.onclose = (event) => {
                    connection.status = 'closed';
                    console.log(`WebSocket ${id} closed:`, event.code, event.reason);
                    
                    if (config.reconnect && !event.wasClean) {
                        this.scheduleReconnect(id);
                    }
                    
                    this.emit('disconnected', { id, code: event.code, reason: event.reason });
                };
                
                ws.onerror = (error) => {
                    connection.status = 'error';
                    this.stats.errors++;
                    console.error(`WebSocket ${id} error:`, error);
                    this.emit('error', { id, error });
                    
                    if (connection.status === 'connecting') {
                        reject(error);
                    }
                };
                
                ws.onmessage = (event) => {
                    this.handleMessage(id, event);
                };
                
            } catch (error) {
                console.error(`Failed to create WebSocket ${id}:`, error);
                reject(error);
            }
        });
    }

    handleMessage(id, event) {
        const connection = this.connections.get(id);
        if (!connection) return;
        
        connection.lastActivity = Date.now();
        connection.messageCount++;
        this.stats.messagesReceived++;
        
        // Track data size
        if (typeof event.data === 'string') {
            connection.bytesReceived += event.data.length;
            this.stats.bytesReceived += event.data.length;
        } else if (event.data instanceof ArrayBuffer) {
            connection.bytesReceived += event.data.byteLength;
            this.stats.bytesReceived += event.data.byteLength;
        }
        
        try {
            let data;
            
            if (typeof event.data === 'string') {
                data = JSON.parse(event.data);
            } else if (event.data instanceof ArrayBuffer) {
                data = this.decodeBinaryMessage(event.data);
            } else if (event.data instanceof Blob) {
                this.handleBlobMessage(id, event.data);
                return;
            }
            
            this.routeMessage(id, data);
            
        } catch (error) {
            console.error(`Error parsing message from ${id}:`, error);
            this.emit('parse-error', { id, error, raw: event.data });
        }
    }

    routeMessage(id, data) {
        // Check for broker-specific routing
        const connection = this.connections.get(id);
        const broker = connection?.config?.broker;
        
        if (broker === 'binance') {
            this.routeBinanceMessage(id, data);
        } else if (broker === 'alpaca') {
            this.routeAlpacaMessage(id, data);
        } else if (broker === 'nab') {
            this.routeNABMessage(id, data);
        } else {
            this.routeGenericMessage(id, data);
        }
    }

    routeBinanceMessage(id, data) {
        if (data.e) {
            // Event-based message
            const handler = this.handlers.get(`${id}:${data.e}`);
            if (handler) {
                handler(data);
            }
        } else if (data.result === null && data.id) {
            // Subscription confirmation
            console.log(`Binance subscription confirmed: ${data.id}`);
        }
    }

    routeAlpacaMessage(id, data) {
        if (Array.isArray(data)) {
            data.forEach(msg => {
                if (msg.T) {
                    const handler = this.handlers.get(`${id}:${msg.T.toLowerCase()}`);
                    if (handler) {
                        handler([msg]);
                    }
                }
            });
        } else if (data.stream && data.data) {
            const handler = this.handlers.get(`${id}:${data.stream}`);
            if (handler) {
                handler(data.data);
            }
        }
    }

    routeNABMessage(id, data) {
        if (data.type) {
            const handler = this.handlers.get(`${id}:${data.type}`);
            if (handler) {
                handler(data.payload || data);
            }
        }
    }

    routeGenericMessage(id, data) {
        // Generic message routing
        const { type, event, channel } = data;
        const eventType = type || event || channel;
        
        if (eventType) {
            const handler = this.handlers.get(`${id}:${eventType}`);
            if (handler) {
                handler(data.payload || data);
            } else {
                this.emit(eventType, { id, data });
            }
        }
    }

    // ===========================
    // Data Management
    // ===========================

    updateLastPrice(symbol, price) {
        const priceData = {
            symbol,
            price,
            timestamp: Date.now(),
            change: 0,
            changePercent: 0
        };
        
        // Calculate change if we have previous price
        if (this.priceCache.has(symbol)) {
            const prevPrice = this.priceCache.get(symbol).price;
            priceData.change = price - prevPrice;
            priceData.changePercent = (priceData.change / prevPrice) * 100;
        }
        
        this.priceCache.set(symbol, priceData);
        this.emit('price-update', priceData);
        
        // Update UI
        this.updatePriceDisplay(symbol, priceData);
    }

    updatePriceDisplay(symbol, priceData) {
        // Update all price displays for this symbol
        document.querySelectorAll(`[data-symbol="${symbol}"]`).forEach(el => {
            const field = el.dataset.field;
            
            if (field === 'price') {
                el.textContent = Helpers.formatPrice(priceData.price);
                
                // Add animation class
                el.classList.remove('price-up', 'price-down');
                if (priceData.change > 0) {
                    el.classList.add('price-up');
                } else if (priceData.change < 0) {
                    el.classList.add('price-down');
                }
            } else if (field === 'change') {
                el.textContent = Helpers.formatNumber(priceData.change, 2);
                el.className = priceData.change >= 0 ? 'text-success' : 'text-danger';
            } else if (field === 'changePercent') {
                el.textContent = Helpers.formatPercent(priceData.changePercent);
                el.className = priceData.changePercent >= 0 ? 'text-success' : 'text-danger';
            }
        });
    }

    updateChart(candle) {
        // Update chart with new candle data
        if (window.chartManager) {
            window.chartManager.updateCandle(candle);
        }
    }

    // ===========================
    // Message Sending
    // ===========================

    send(id, data, options = {}) {
        const connection = this.connections.get(id);
        if (!connection) {
            console.error(`Connection ${id} not found`);
            return false;
        }

        if (connection.status !== 'connected' || connection.ws.readyState !== WebSocket.OPEN) {
            if (options.queue !== false) {
                this.queueMessage(id, data);
            }
            return false;
        }

        try {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            connection.ws.send(message);
            
            connection.bytesSent += message.length;
            this.stats.bytesSent += message.length;
            this.stats.messagesSent++;
            
            return true;
        } catch (error) {
            console.error(`Error sending message to ${id}:`, error);
            return false;
        }
    }

    broadcast(data, filter = null) {
        const results = [];
        
        this.connections.forEach((connection, id) => {
            if (!filter || filter(id, connection)) {
                results.push({
                    id,
                    success: this.send(id, data)
                });
            }
        });
        
        return results;
    }

    // ===========================
    // Subscription Management
    // ===========================

    subscribe(id, channels, symbols = []) {
        const connection = this.connections.get(id);
        if (!connection) return false;
        
        // Store subscription for reconnection
        if (!this.subscriptions.has(id)) {
            this.subscriptions.set(id, new Set());
        }
        
        const subs = this.subscriptions.get(id);
        channels.forEach(channel => {
            symbols.forEach(symbol => {
                subs.add(`${channel}:${symbol}`);
            });
        });
        
        // Send subscription based on broker type
        const broker = connection.config.broker;
        
        if (broker === 'binance') {
            this.subscribeBinanceStreams(id, symbols);
        } else if (broker === 'alpaca') {
            this.send(id, {
                action: 'subscribe',
                trades: symbols,
                quotes: symbols,
                bars: symbols
            });
        } else {
            this.send(id, {
                type: 'subscribe',
                channels,
                symbols
            });
        }
        
        return true;
    }

    unsubscribe(id, channels, symbols = []) {
        const connection = this.connections.get(id);
        if (!connection) return false;
        
        // Update subscription tracking
        const subs = this.subscriptions.get(id);
        if (subs) {
            channels.forEach(channel => {
                symbols.forEach(symbol => {
                    subs.delete(`${channel}:${symbol}`);
                });
            });
        }
        
        // Send unsubscribe based on broker type
        const broker = connection.config.broker;
        
        if (broker === 'binance') {
            const streams = [];
            symbols.forEach(symbol => {
                channels.forEach(channel => {
                    streams.push(`${symbol.toLowerCase()}@${channel}`);
                });
            });
            
            this.send(id, {
                method: 'UNSUBSCRIBE',
                params: streams,
                id: Date.now()
            });
        } else if (broker === 'alpaca') {
            this.send(id, {
                action: 'unsubscribe',
                trades: symbols,
                quotes: symbols,
                bars: symbols
            });
        } else {
            this.send(id, {
                type: 'unsubscribe',
                channels,
                symbols
            });
        }
        
        return true;
    }

    resubscribe(id) {
        const subs = this.subscriptions.get(id);
        if (!subs || subs.size === 0) return;
        
        // Group by channel and symbol
        const grouped = {};
        subs.forEach(sub => {
            const [channel, symbol] = sub.split(':');
            if (!grouped[channel]) grouped[channel] = [];
            grouped[channel].push(symbol);
        });
        
        // Resubscribe to each channel
        Object.entries(grouped).forEach(([channel, symbols]) => {
            this.subscribe(id, [channel], symbols);
        });
    }

    // ===========================
    // Reconnection Management
    // ===========================

    scheduleReconnect(id) {
        const connection = this.connections.get(id);
        if (!connection || !connection.config.reconnect) return;
        
        connection.reconnectAttempts++;
        
        const delay = Math.min(
            connection.config.reconnectDelay * Math.pow(connection.config.reconnectDecay, connection.reconnectAttempts - 1),
            connection.config.maxReconnectDelay
        );
        
        console.log(`Scheduling reconnect for ${id} in ${delay}ms (attempt ${connection.reconnectAttempts})`);
        
        const timer = setTimeout(() => {
            this.reconnect(id);
        }, delay);
        
        this.reconnectTimers.set(id, timer);
    }

    async reconnect(id) {
        const connection = this.connections.get(id);
        if (!connection) return;
        
        const { url, config } = connection;
        
        // Close existing connection
        if (connection.ws) {
            connection.ws.close();
        }
        
        // Remove old connection
        this.connections.delete(id);
        
        try {
            // Create new connection
            await this.connect(id, url, config);
            console.log(`Successfully reconnected ${id}`);
        } catch (error) {
            console.error(`Failed to reconnect ${id}:`, error);
        }
    }

    clearReconnectTimer(id) {
        if (this.reconnectTimers.has(id)) {
            clearTimeout(this.reconnectTimers.get(id));
            this.reconnectTimers.delete(id);
        }
    }

    // ===========================
    // Queue Management
    // ===========================

    queueMessage(id, data) {
        if (!this.messageQueue.has(id)) {
            this.messageQueue.set(id, []);
        }
        
        const queue = this.messageQueue.get(id);
        queue.push({ data, timestamp: Date.now() });
        
        // Limit queue size
        if (queue.length > this.config.messageQueueSize) {
            queue.shift();
        }
    }

    processMessageQueue(id) {
        const queue = this.messageQueue.get(id);
        if (!queue || queue.length === 0) return;
        
        console.log(`Processing ${queue.length} queued messages for ${id}`);
        
        queue.forEach(({ data }) => {
            this.send(id, data, { queue: false });
        });
        
        this.messageQueue.set(id, []);
    }

    // ===========================
    // Heartbeat & Monitoring
    // ===========================

    startHeartbeat() {
        setInterval(() => {
            this.connections.forEach((connection, id) => {
                if (connection.status === 'connected') {
                    const inactiveTime = Date.now() - connection.lastActivity;
                    
                    if (inactiveTime > this.config.heartbeatInterval) {
                        // Send ping
                        this.send(id, { type: 'ping', timestamp: Date.now() });
                    }
                    
                    if (inactiveTime > this.config.heartbeatInterval * 2) {
                        // Connection seems dead, reconnect
                        console.warn(`Connection ${id} appears dead, reconnecting...`);
                        connection.ws.close();
                    }
                }
            });
        }, this.config.heartbeatInterval);
    }

    // ===========================
    // Statistics & Monitoring
    // ===========================

    getStats(id = null) {
        if (id) {
            const connection = this.connections.get(id);
            if (!connection) return null;
            
            return {
                status: connection.status,
                uptime: connection.connectedAt ? Date.now() - connection.connectedAt : 0,
                messageCount: connection.messageCount,
                bytesSent: connection.bytesSent,
                bytesReceived: connection.bytesReceived,
                reconnectAttempts: connection.reconnectAttempts,
                lastActivity: connection.lastActivity
            };
        }
        
        return {
            global: this.stats,
            connections: Array.from(this.connections.keys()).map(id => ({
                id,
                ...this.getStats(id)
            }))
        };
    }

    getConnectionList() {
        return Array.from(this.connections.entries()).map(([id, conn]) => ({
            id,
            url: conn.url,
            status: conn.status,
            broker: conn.config.broker,
            uptime: conn.connectedAt ? Date.now() - conn.connectedAt : 0
        }));
    }

    // ===========================
    // Event System
    // ===========================

    setupEventHandlers() {
        this.events = new EventTarget();
    }

    emit(event, data) {
        this.events.dispatchEvent(new CustomEvent(event, { detail: data }));
        document.dispatchEvent(new CustomEvent(`ws-${event}`, { detail: data }));
    }

    on(event, handler) {
        this.events.addEventListener(event, (e) => handler(e.detail));
    }

    off(event, handler) {
        this.events.removeEventListener(event, handler);
    }

    registerHandler(id, channel, handler) {
        this.handlers.set(`${id}:${channel}`, handler);
    }

    unregisterHandler(id, channel) {
        this.handlers.delete(`${id}:${channel}`);
    }

    // ===========================
    // Utility Methods
    // ===========================

    decodeBinaryMessage(buffer) {
        try {
            const decoder = new TextDecoder();
            const text = decoder.decode(buffer);
            return JSON.parse(text);
        } catch (error) {
            console.error('Failed to decode binary message:', error);
            return null;
        }
    }

    async handleBlobMessage(id, blob) {
        try {
            const text = await blob.text();
            const data = JSON.parse(text);
            this.routeMessage(id, data);
        } catch (error) {
            console.error('Failed to handle blob message:', error);
        }
    }

    disconnect(id) {
        const connection = this.connections.get(id);
        if (!connection) return;
        
        // Disable reconnect
        connection.config.reconnect = false;
        
        // Clear timers
        this.clearReconnectTimer(id);
        
        // Close WebSocket
        if (connection.ws) {
            connection.ws.close();
        }
        
        // Clean up
        this.connections.delete(id);
        this.subscriptions.delete(id);
        this.messageQueue.delete(id);
        
        // Clean up handlers for this connection
        Array.from(this.handlers.keys()).forEach(key => {
            if (key.startsWith(`${id}:`)) {
                this.handlers.delete(key);
            }
        });
        
        this.stats.connections--;
        console.log(`Disconnected ${id}`);
    }

    disconnectAll() {
        Array.from(this.connections.keys()).forEach(id => {
            this.disconnect(id);
        });
    }

    // ===========================
    // Public API
    // ===========================

    async connectToExchange(exchange, symbols = []) {
        const exchangeConfigs = {
            binance: {
                url: Constants.API.BROKERS.BINANCE.WS,
                broker: 'binance'
            },
            alpaca: {
                url: Constants.API.BROKERS.ALPACA.WS,
                broker: 'alpaca'
            },
            nab: {
                url: 'wss://trading.nab.com.au/ws',
                broker: 'nab'
            }
        };
        
        const config = exchangeConfigs[exchange.toLowerCase()];
        if (!config) {
            throw new Error(`Unknown exchange: ${exchange}`);
        }
        
        const id = `${exchange}_${Date.now()}`;
        await this.connect(id, config.url, config);
        
        if (symbols.length > 0) {
            this.subscribe(id, ['trade', 'quote', 'depth'], symbols);
        }
        
        return id;
    }

    getPrice(symbol) {
        return this.priceCache.get(symbol);
    }

    getOrderBook(symbol) {
        return this.orderBookCache.get(symbol);
    }

    getAllPrices() {
        return Array.from(this.priceCache.entries()).map(([symbol, data]) => ({
            symbol,
            ...data
        }));
    }
}

// Create singleton instance
const wsManager = new AdvancedWebSocketManager();

// Attach to window for global access
window.wsManagerAdvanced = wsManager;

// Export for module usage
export default wsManager;