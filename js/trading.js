/ Trading Module - Core trading functionality for AuraQuant
// Supports multiple brokers, manual/bot trading, paper/live modes

class TradingModule {
    constructor() {
        this.brokers = new Map();
        this.positions = new Map();
        this.orders = new Map();
        this.bots = new Map();
        this.mode = 'paper'; // 'paper' or 'live'
        this.riskManager = new RiskManager();
        this.performanceTracker = new PerformanceTracker();
        this.emergencyStop = false;
        this.manualOverride = false;
        this.initialized = false;
        
        // Broker configurations
        this.brokerConfigs = {
            alpaca: {
                name: 'Alpaca',
                supportedAssets: ['stocks', 'crypto'],
                paperEndpoint: 'https://paper-api.alpaca.markets',
                liveEndpoint: 'https://api.alpaca.markets',
                wsEndpoint: 'wss://stream.data.alpaca.markets'
            },
            binance: {
                name: 'Binance',
                supportedAssets: ['crypto', 'futures'],
                testEndpoint: 'https://testnet.binance.vision',
                liveEndpoint: 'https://api.binance.com',
                wsEndpoint: 'wss://stream.binance.com:9443'
            },
            interactiveBrokers: {
                name: 'Interactive Brokers',
                supportedAssets: ['stocks', 'options', 'futures', 'forex'],
                paperEndpoint: 'https://localhost:5000/v1/api',
                liveEndpoint: 'https://localhost:5000/v1/api',
                wsEndpoint: 'wss://localhost:5000/v1/ws'
            },
            nabBank: {
                name: 'NAB Bank',
                supportedAssets: ['stocks', 'etf'],
                endpoint: 'https://api.nabtrade.com.au',
                wsEndpoint: 'wss://stream.nabtrade.com.au'
            },
            mockBroker: {
                name: 'Mock Broker',
                supportedAssets: ['all'],
                endpoint: 'mock://localhost',
                wsEndpoint: 'mock://localhost/ws'
            }
        };
        
        // Bot configurations
        this.botVersions = {
            'scalper_v1': { strategy: 'scalping', timeframe: '1m', riskPerTrade: 0.01 },
            'scalper_v2': { strategy: 'scalping', timeframe: '5m', riskPerTrade: 0.015 },
            'swingtrader_v1': { strategy: 'swing', timeframe: '1h', riskPerTrade: 0.02 },
            'momentum_v1': { strategy: 'momentum', timeframe: '15m', riskPerTrade: 0.025 },
            'meanreversion_v1': { strategy: 'meanReversion', timeframe: '30m', riskPerTrade: 0.02 },
            'arbitrage_v1': { strategy: 'arbitrage', timeframe: '1m', riskPerTrade: 0.01 },
            'gridbot_v1': { strategy: 'grid', timeframe: '1h', riskPerTrade: 0.03 },
            'newsbot_v1': { strategy: 'news', timeframe: '5m', riskPerTrade: 0.02 }
        };
        
        this.init();
    }
    
    async init() {
        console.log('Initializing Trading Module...');
        
        // Load saved configurations
        await this.loadConfigurations();
        
        // Initialize brokers
        await this.initializeBrokers();
        
        // Initialize bots
        await this.initializeBots();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load existing positions and orders
        await this.loadPositions();
        await this.loadOrders();
        
        // Start monitoring
        this.startMonitoring();
        
        this.initialized = true;
        console.log('Trading Module initialized successfully');
    }
    
    async loadConfigurations() {
        try {
            const config = localStorage.getItem('tradingConfig');
            if (config) {
                const parsed = JSON.parse(config);
                this.mode = parsed.mode || 'paper';
                this.riskManager.settings = parsed.riskSettings || {};
            }
        } catch (error) {
            console.error('Error loading configurations:', error);
        }
    }
    
    async initializeBrokers() {
        // Initialize configured brokers
        const enabledBrokers = JSON.parse(localStorage.getItem('enabledBrokers') || '["mockBroker"]');
        
        for (const brokerId of enabledBrokers) {
            if (this.brokerConfigs[brokerId]) {
                await this.connectBroker(brokerId);
            }
        }
    }
    
    async connectBroker(brokerId) {
        const config = this.brokerConfigs[brokerId];
        if (!config) return;
        
        const broker = new BrokerConnection(brokerId, config, this.mode);
        
        try {
            await broker.connect();
            this.brokers.set(brokerId, broker);
            console.log(`Connected to ${config.name}`);
            
            // Subscribe to broker events
            broker.on('fill', (data) => this.handleFill(brokerId, data));
            broker.on('reject', (data) => this.handleReject(brokerId, data));
            broker.on('update', (data) => this.handleOrderUpdate(brokerId, data));
            
        } catch (error) {
            console.error(`Failed to connect to ${config.name}:`, error);
            window.showNotification(`Failed to connect to ${config.name}`, 'error');
        }
    }
    
    async initializeBots() {
        const enabledBots = JSON.parse(localStorage.getItem('enabledBots') || '[]');
        
        for (const botId of enabledBots) {
            if (this.botVersions[botId]) {
                const bot = new TradingBot(botId, this.botVersions[botId]);
                this.bots.set(botId, bot);
                
                // Subscribe to bot signals
                bot.on('signal', (signal) => this.handleBotSignal(botId, signal));
                
                // Start bot if configured
                const botConfig = JSON.parse(localStorage.getItem(`bot_${botId}`) || '{}');
                if (botConfig.autoStart) {
                    await bot.start();
                }
            }
        }
    }
    
    setupEventListeners() {
        // Listen for manual trading controls
        document.addEventListener('placeOrder', (e) => this.placeOrder(e.detail));
        document.addEventListener('cancelOrder', (e) => this.cancelOrder(e.detail.orderId));
        document.addEventListener('closePosition', (e) => this.closePosition(e.detail.symbol));
        document.addEventListener('emergencyStop', () => this.triggerEmergencyStop());
        document.addEventListener('toggleMode', (e) => this.toggleMode(e.detail.mode));
        document.addEventListener('manualOverride', (e) => this.setManualOverride(e.detail.enabled));
    }
    
    async placeOrder(orderParams) {
        // Validate order parameters
        if (!this.validateOrder(orderParams)) {
            window.showNotification('Invalid order parameters', 'error');
            return null;
        }
        
        // Check risk limits
        if (!this.riskManager.checkOrderRisk(orderParams)) {
            window.showNotification('Order exceeds risk limits', 'error');
            return null;
        }
        
        // Check emergency stop
        if (this.emergencyStop && !this.manualOverride) {
            window.showNotification('Trading halted - Emergency stop active', 'error');
            return null;
        }
        
        // Generate order ID
        const orderId = this.generateOrderId();
        
        // Create order object
        const order = {
            id: orderId,
            ...orderParams,
            status: 'pending',
            createdAt: new Date().toISOString(),
            mode: this.mode
        };
        
        // Store order
        this.orders.set(orderId, order);
        
        // Select broker
        const broker = this.selectBroker(orderParams);
        if (!broker) {
            window.showNotification('No suitable broker available', 'error');
            order.status = 'rejected';
            return null;
        }
        
        try {
            // Place order with broker
            const brokerOrderId = await broker.placeOrder(order);
            order.brokerOrderId = brokerOrderId;
            order.status = 'submitted';
            
            // Update UI
            this.updateOrdersDisplay();
            
            // Log order
            this.logOrder(order);
            
            window.showNotification(`Order placed: ${order.symbol} ${order.side} ${order.quantity}`, 'success');
            
            return orderId;
            
        } catch (error) {
            console.error('Order placement failed:', error);
            order.status = 'rejected';
            order.error = error.message;
            window.showNotification(`Order failed: ${error.message}`, 'error');
            return null;
        }
    }
    
    validateOrder(params) {
        const required = ['symbol', 'side', 'quantity', 'type'];
        for (const field of required) {
            if (!params[field]) return false;
        }
        
        if (!['buy', 'sell'].includes(params.side)) return false;
        if (!['market', 'limit', 'stop', 'stop_limit'].includes(params.type)) return false;
        if (params.quantity <= 0) return false;
        
        if (params.type === 'limit' && !params.limitPrice) return false;
        if (params.type === 'stop' && !params.stopPrice) return false;
        if (params.type === 'stop_limit' && (!params.stopPrice || !params.limitPrice)) return false;
        
        return true;
    }
    
    selectBroker(orderParams) {
        // Select appropriate broker based on asset type and availability
        const assetType = this.getAssetType(orderParams.symbol);
        
        for (const [brokerId, broker] of this.brokers) {
            const config = this.brokerConfigs[brokerId];
            if (config.supportedAssets.includes(assetType) || config.supportedAssets.includes('all')) {
                if (broker.connected) {
                    return broker;
                }
            }
        }
        
        return null;
    }
    
    getAssetType(symbol) {
        // Determine asset type from symbol
        if (symbol.includes('-USD') || symbol.includes('USDT')) return 'crypto';
        if (symbol.includes('.AX')) return 'stocks'; // Australian stocks
        if (symbol.match(/^[A-Z]{1,5}$/)) return 'stocks'; // US stocks
        if (symbol.includes('FUT')) return 'futures';
        if (symbol.match(/^[A-Z]{6}$/)) return 'forex';
        return 'unknown';
    }
    
    async cancelOrder(orderId) {
        const order = this.orders.get(orderId);
        if (!order) {
            window.showNotification('Order not found', 'error');
            return false;
        }
        
        if (order.status === 'filled' || order.status === 'cancelled') {
            window.showNotification('Order already completed', 'info');
            return false;
        }
        
        try {
            const broker = this.brokers.get(order.brokerId);
            if (broker) {
                await broker.cancelOrder(order.brokerOrderId);
            }
            
            order.status = 'cancelled';
            order.cancelledAt = new Date().toISOString();
            
            this.updateOrdersDisplay();
            window.showNotification('Order cancelled successfully', 'success');
            return true;
            
        } catch (error) {
            console.error('Order cancellation failed:', error);
            window.showNotification(`Cancel failed: ${error.message}`, 'error');
            return false;
        }
    }
    
    async closePosition(symbol) {
        const position = this.positions.get(symbol);
        if (!position) {
            window.showNotification('No position found', 'error');
            return false;
        }
        
        // Create market order to close position
        const closeOrder = {
            symbol: symbol,
            side: position.quantity > 0 ? 'sell' : 'buy',
            quantity: Math.abs(position.quantity),
            type: 'market',
            timeInForce: 'IOC',
            isClosing: true
        };
        
        const orderId = await this.placeOrder(closeOrder);
        return orderId !== null;
    }
    
    handleFill(brokerId, fillData) {
        console.log('Order filled:', fillData);
        
        const order = Array.from(this.orders.values()).find(o => 
            o.brokerOrderId === fillData.orderId
        );
        
        if (order) {
            order.status = 'filled';
            order.filledAt = fillData.timestamp;
            order.fillPrice = fillData.price;
            order.fillQuantity = fillData.quantity;
            
            // Update position
            this.updatePosition(fillData);
            
            // Update performance
            this.performanceTracker.recordTrade(fillData);
            
            // Update displays
            this.updateOrdersDisplay();
            this.updatePositionsDisplay();
            
            // Trigger alerts
            if (window.audioAlerts) {
                window.audioAlerts.playAlert('fill');
            }
            
            window.showNotification(
                `Order filled: ${fillData.symbol} ${fillData.side} ${fillData.quantity} @ ${fillData.price}`,
                'success'
            );
        }
    }
    
    handleReject(brokerId, rejectData) {
        console.log('Order rejected:', rejectData);
        
        const order = Array.from(this.orders.values()).find(o => 
            o.brokerOrderId === rejectData.orderId
        );
        
        if (order) {
            order.status = 'rejected';
            order.rejectedAt = rejectData.timestamp;
            order.rejectReason = rejectData.reason;
            
            this.updateOrdersDisplay();
            
            window.showNotification(
                `Order rejected: ${rejectData.reason}`,
                'error'
            );
        }
    }
    
    handleOrderUpdate(brokerId, updateData) {
        const order = Array.from(this.orders.values()).find(o => 
            o.brokerOrderId === updateData.orderId
        );
        
        if (order) {
            order.status = updateData.status;
            if (updateData.filledQuantity) {
                order.filledQuantity = updateData.filledQuantity;
            }
            
            this.updateOrdersDisplay();
        }
    }
    
    updatePosition(fillData) {
        const symbol = fillData.symbol;
        let position = this.positions.get(symbol);
        
        if (!position) {
            position = {
                symbol: symbol,
                quantity: 0,
                avgPrice: 0,
                realizedPnL: 0,
                unrealizedPnL: 0,
                value: 0
            };
            this.positions.set(symbol, position);
        }
        
        const fillQty = fillData.side === 'buy' ? fillData.quantity : -fillData.quantity;
        const fillValue = fillData.quantity * fillData.price;
        
        if (position.quantity === 0) {
            // Opening new position
            position.quantity = fillQty;
            position.avgPrice = fillData.price;
        } else if ((position.quantity > 0 && fillQty > 0) || (position.quantity < 0 && fillQty < 0)) {
            // Adding to position
            const totalValue = (Math.abs(position.quantity) * position.avgPrice) + fillValue;
            position.quantity += fillQty;
            position.avgPrice = totalValue / Math.abs(position.quantity);
        } else {
            // Reducing or closing position
            const closedQty = Math.min(Math.abs(position.quantity), Math.abs(fillQty));
            const pnl = closedQty * (fillData.price - position.avgPrice) * (position.quantity > 0 ? 1 : -1);
            position.realizedPnL += pnl;
            position.quantity += fillQty;
            
            if (position.quantity === 0) {
                // Position closed
                this.positions.delete(symbol);
            }
        }
        
        // Update position value
        if (position.quantity !== 0) {
            position.value = Math.abs(position.quantity) * position.avgPrice;
        }
    }
    
    handleBotSignal(botId, signal) {
        console.log(`Bot signal from ${botId}:`, signal);
        
        // Check if manual override is active
        if (this.manualOverride) {
            console.log('Manual override active - ignoring bot signal');
            return;
        }
        
        // Check emergency stop
        if (this.emergencyStop) {
            console.log('Emergency stop active - ignoring bot signal');
            return;
        }
        
        // Process bot signal
        const orderParams = {
            symbol: signal.symbol,
            side: signal.action,
            quantity: signal.quantity || this.calculatePositionSize(signal),
            type: signal.orderType || 'market',
            limitPrice: signal.limitPrice,
            stopPrice: signal.stopPrice,
            timeInForce: signal.timeInForce || 'GTC',
            botId: botId,
            signalId: signal.id
        };
        
        // Place order
        this.placeOrder(orderParams);
    }
    
    calculatePositionSize(signal) {
        // Calculate position size based on risk management rules
        const accountBalance = this.getAccountBalance();
        const riskAmount = accountBalance * (signal.riskPercent || 0.01);
        
        if (signal.stopLoss) {
            const riskPerShare = Math.abs(signal.entryPrice - signal.stopLoss);
            return Math.floor(riskAmount / riskPerShare);
        }
        
        // Default position size
        return Math.floor(riskAmount / signal.entryPrice);
    }
    
    getAccountBalance() {
        // Get total account balance across all brokers
        let totalBalance = 0;
        
        for (const [brokerId, broker] of this.brokers) {
            if (broker.accountInfo) {
                totalBalance += broker.accountInfo.cashBalance || 0;
            }
        }
        
        // In paper mode, use simulated balance
        if (this.mode === 'paper') {
            return parseFloat(localStorage.getItem('paperBalance') || '100000');
        }
        
        return totalBalance;
    }
    
    triggerEmergencyStop() {
        console.log('EMERGENCY STOP TRIGGERED');
        this.emergencyStop = true;
        
        // Cancel all pending orders
        for (const [orderId, order] of this.orders) {
            if (order.status === 'pending' || order.status === 'submitted') {
                this.cancelOrder(orderId);
            }
        }
        
        // Stop all bots
        for (const [botId, bot] of this.bots) {
            bot.stop();
        }
        
        // Close all positions if configured
        const closePositions = confirm('Close all positions?');
        if (closePositions) {
            for (const [symbol, position] of this.positions) {
                this.closePosition(symbol);
            }
        }
        
        // Send alert
        window.showNotification('EMERGENCY STOP ACTIVATED', 'error');
        
        if (window.audioAlerts) {
            window.audioAlerts.playAlert('emergency');
        }
        
        // Update UI
        document.getElementById('emergencyStopBtn')?.classList.add('active');
    }
    
    releaseEmergencyStop() {
        this.emergencyStop = false;
        window.showNotification('Emergency stop released', 'success');
        document.getElementById('emergencyStopBtn')?.classList.remove('active');
    }
    
    setManualOverride(enabled) {
        this.manualOverride = enabled;
        
        if (enabled) {
            // Pause all bots
            for (const [botId, bot] of this.bots) {
                bot.pause();
            }
            window.showNotification('Manual override activated - Bots paused', 'info');
        } else {
            // Resume bots
            for (const [botId, bot] of this.bots) {
                bot.resume();
            }
            window.showNotification('Manual override deactivated - Bots resumed', 'info');
        }
        
        // Update UI
        document.getElementById('manualOverrideBtn')?.classList.toggle('active', enabled);
    }
    
    async toggleMode(mode) {
        if (!['paper', 'live'].includes(mode)) return;
        
        if (mode === 'live') {
            const confirmed = confirm(
                'WARNING: You are about to switch to LIVE TRADING mode. ' +
                'Real money will be at risk. Are you sure?'
            );
            if (!confirmed) return;
        }
        
        this.mode = mode;
        
        // Save mode
        const config = JSON.parse(localStorage.getItem('tradingConfig') || '{}');
        config.mode = mode;
        localStorage.setItem('tradingConfig', JSON.stringify(config));
        
        // Reconnect brokers with new mode
        for (const [brokerId, broker] of this.brokers) {
            await broker.reconnect(mode);
        }
        
        // Update UI
        this.updateModeDisplay();
        
        window.showNotification(`Switched to ${mode.toUpperCase()} trading mode`, 'info');
    }
    
    startMonitoring() {
        // Monitor positions for stop loss and take profit
        setInterval(() => {
            this.checkStopLossAndTakeProfit();
            this.updateUnrealizedPnL();
            this.checkRiskLimits();
        }, 1000);
        
        // Update performance metrics
        setInterval(() => {
            this.performanceTracker.updateMetrics();
            this.updatePerformanceDisplay();
        }, 5000);
        
        // Auto-save state
        setInterval(() => {
            this.saveState();
        }, 30000);
    }
    
    checkStopLossAndTakeProfit() {
        for (const [symbol, position] of this.positions) {
            const currentPrice = this.getCurrentPrice(symbol);
            if (!currentPrice) continue;
            
            // Check stop loss
            if (position.stopLoss) {
                if ((position.quantity > 0 && currentPrice <= position.stopLoss) ||
                    (position.quantity < 0 && currentPrice >= position.stopLoss)) {
                    console.log(`Stop loss triggered for ${symbol}`);
                    this.closePosition(symbol);
                }
            }
            
            // Check take profit
            if (position.takeProfit) {
                if ((position.quantity > 0 && currentPrice >= position.takeProfit) ||
                    (position.quantity < 0 && currentPrice <= position.takeProfit)) {
                    console.log(`Take profit triggered for ${symbol}`);
                    this.closePosition(symbol);
                }
            }
        }
    }
    
    updateUnrealizedPnL() {
        for (const [symbol, position] of this.positions) {
            const currentPrice = this.getCurrentPrice(symbol);
            if (currentPrice && position.quantity !== 0) {
                position.unrealizedPnL = position.quantity * (currentPrice - position.avgPrice);
                position.currentPrice = currentPrice;
            }
        }
        
        this.updatePositionsDisplay();
    }
    
    getCurrentPrice(symbol) {
        // Get current price from market data
        if (window.marketData) {
            return window.marketData.getPrice(symbol);
        }
        return null;
    }
    
    checkRiskLimits() {
        const metrics = this.riskManager.calculateMetrics(this.positions, this.getAccountBalance());
        
        // Check daily loss limit
        if (metrics.dailyLoss > this.riskManager.settings.maxDailyLoss) {
            console.log('Daily loss limit exceeded');
            this.triggerEmergencyStop();
        }
        
        // Check drawdown limit
        if (metrics.drawdown > this.riskManager.settings.maxDrawdown) {
            console.log('Drawdown limit exceeded');
            this.triggerEmergencyStop();
        }
        
        // Check position limits
        if (this.positions.size > this.riskManager.settings.maxPositions) {
            console.log('Position limit exceeded');
            // Prevent new positions
            this.riskManager.blockNewPositions = true;
        }
    }
    
    async loadPositions() {
        // Load positions from storage or brokers
        try {
            // Load from brokers
            for (const [brokerId, broker] of this.brokers) {
                const positions = await broker.getPositions();
                for (const pos of positions) {
                    this.positions.set(pos.symbol, pos);
                }
            }
            
            // Load saved positions (paper mode)
            if (this.mode === 'paper') {
                const saved = localStorage.getItem('paperPositions');
                if (saved) {
                    const positions = JSON.parse(saved);
                    for (const pos of positions) {
                        this.positions.set(pos.symbol, pos);
                    }
                }
            }
            
            this.updatePositionsDisplay();
            
        } catch (error) {
            console.error('Error loading positions:', error);
        }
    }
    
    async loadOrders() {
        // Load active orders from storage or brokers
        try {
            // Load from brokers
            for (const [brokerId, broker] of this.brokers) {
                const orders = await broker.getOrders();
                for (const order of orders) {
                    this.orders.set(order.id, order);
                }
            }
            
            // Load saved orders (paper mode)
            if (this.mode === 'paper') {
                const saved = localStorage.getItem('paperOrders');
                if (saved) {
                    const orders = JSON.parse(saved);
                    for (const order of orders) {
                        this.orders.set(order.id, order);
                    }
                }
            }
            
            this.updateOrdersDisplay();
            
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }
    
    saveState() {
        // Save current state to localStorage
        try {
            if (this.mode === 'paper') {
                // Save paper trading state
                localStorage.setItem('paperPositions', JSON.stringify(Array.from(this.positions.values())));
                localStorage.setItem('paperOrders', JSON.stringify(Array.from(this.orders.values())));
                localStorage.setItem('paperBalance', this.getAccountBalance().toString());
            }
            
            // Save performance metrics
            localStorage.setItem('performanceMetrics', JSON.stringify(this.performanceTracker.getMetrics()));
            
            // Save risk settings
            localStorage.setItem('riskSettings', JSON.stringify(this.riskManager.settings));
            
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }
    
    updateOrdersDisplay() {
        const ordersContainer = document.getElementById('ordersContainer');
        if (!ordersContainer) return;
        
        const activeOrders = Array.from(this.orders.values())
            .filter(o => ['pending', 'submitted'].includes(o.status))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        ordersContainer.innerHTML = activeOrders.map(order => `
            <div class="order-item ${order.status}">
                <div class="order-header">
                    <span class="symbol">${order.symbol}</span>
                    <span class="status">${order.status.toUpperCase()}</span>
                </div>
                <div class="order-details">
                    <span class="${order.side}">${order.side.toUpperCase()}</span>
                    <span>${order.quantity} @ ${order.type === 'market' ? 'MARKET' : order.limitPrice}</span>
                </div>
                <div class="order-actions">
                    <button onclick="tradingModule.cancelOrder('${order.id}')" class="btn-cancel">Cancel</button>
                </div>
            </div>
        `).join('');
    }
    
    updatePositionsDisplay() {
        const positionsContainer = document.getElementById('positionsContainer');
        if (!positionsContainer) return;
        
        const positions = Array.from(this.positions.values())
            .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
        
        let totalUnrealizedPnL = 0;
        let totalValue = 0;
        
        const positionsHTML = positions.map(pos => {
            totalUnrealizedPnL += pos.unrealizedPnL || 0;
            totalValue += Math.abs(pos.value) || 0;
            
            const pnlClass = pos.unrealizedPnL >= 0 ? 'profit' : 'loss';
            const pnlPercent = ((pos.unrealizedPnL / pos.value) * 100).toFixed(2);
            
            return `
                <div class="position-item">
                    <div class="position-header">
                        <span class="symbol">${pos.symbol}</span>
                        <span class="${pnlClass}">
                            ${pos.unrealizedPnL >= 0 ? '+' : ''}$${pos.unrealizedPnL?.toFixed(2) || '0.00'}
                            (${pnlPercent}%)
                        </span>
                    </div>
                    <div class="position-details">
                        <span>${pos.quantity > 0 ? 'LONG' : 'SHORT'} ${Math.abs(pos.quantity)}</span>
                        <span>Avg: $${pos.avgPrice.toFixed(2)}</span>
                        <span>Cur: $${pos.currentPrice?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div class="position-actions">
                        <button onclick="tradingModule.closePosition('${pos.symbol}')" class="btn-close">Close</button>
                        <button onclick="tradingModule.addToPosition('${pos.symbol}')" class="btn-add">Add</button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Update summary
        const summaryHTML = `
            <div class="positions-summary">
                <div>Positions: ${positions.length}</div>
                <div>Total Value: $${totalValue.toFixed(2)}</div>
                <div class="${totalUnrealizedPnL >= 0 ? 'profit' : 'loss'}">
                    Unrealized P&L: ${totalUnrealizedPnL >= 0 ? '+' : ''}$${totalUnrealizedPnL.toFixed(2)}
                </div>
            </div>
        `;
        
        positionsContainer.innerHTML = summaryHTML + positionsHTML;
    }
    
    updatePerformanceDisplay() {
        const metrics = this.performanceTracker.getMetrics();
        const perfContainer = document.getElementById('performanceMetrics');
        if (!perfContainer) return;
        
        perfContainer.innerHTML = `
            <div class="metric">
                <span class="label">Win Rate</span>
                <span class="value">${metrics.winRate.toFixed(1)}%</span>
            </div>
            <div class="metric">
                <span class="label">Profit Factor</span>
                <span class="value">${metrics.profitFactor.toFixed(2)}</span>
            </div>
            <div class="metric">
                <span class="label">Sharpe Ratio</span>
                <span class="value">${metrics.sharpeRatio.toFixed(2)}</span>
            </div>
            <div class="metric">
                <span class="label">Max Drawdown</span>
                <span class="value">${metrics.maxDrawdown.toFixed(1)}%</span>
            </div>
            <div class="metric">
                <span class="label">Daily P&L</span>
                <span class="value ${metrics.dailyPnL >= 0 ? 'profit' : 'loss'}">
                    ${metrics.dailyPnL >= 0 ? '+' : ''}$${metrics.dailyPnL.toFixed(2)}
                </span>
            </div>
            <div class="metric">
                <span class="label">Total P&L</span>
                <span class="value ${metrics.totalPnL >= 0 ? 'profit' : 'loss'}">
                    ${metrics.totalPnL >= 0 ? '+' : ''}$${metrics.totalPnL.toFixed(2)}
                </span>
            </div>
        `;
    }
    
    updateModeDisplay() {
        const modeIndicator = document.getElementById('tradingMode');
        if (!modeIndicator) return;
        
        modeIndicator.className = `mode-indicator ${this.mode}`;
        modeIndicator.textContent = this.mode.toUpperCase();
        
        // Update mode toggle buttons
        document.querySelectorAll('.mode-toggle').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.mode);
        });
    }
    
    logOrder(order) {
        // Log order for audit trail
        const log = {
            timestamp: new Date().toISOString(),
            orderId: order.id,
            action: 'ORDER_PLACED',
            details: order
        };
        
        const logs = JSON.parse(localStorage.getItem('tradingLogs') || '[]');
        logs.push(log);
        
        // Keep last 1000 logs
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        
        localStorage.setItem('tradingLogs', JSON.stringify(logs));
    }
    
    generateOrderId() {
        return `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Public methods for UI interaction
    
    async addToPosition(symbol) {
        const position = this.positions.get(symbol);
        if (!position) return;
        
        const quantity = prompt(`Add quantity to ${symbol} position:`, '100');
        if (!quantity || isNaN(quantity)) return;
        
        await this.placeOrder({
            symbol: symbol,
            side: position.quantity > 0 ? 'buy' : 'sell',
            quantity: parseInt(quantity),
            type: 'market'
        });
    }
    
    startBot(botId) {
        const bot = this.bots.get(botId);
        if (bot) {
            bot.start();
            window.showNotification(`Bot ${botId} started`, 'success');
        }
    }
    
    stopBot(botId) {
        const bot = this.bots.get(botId);
        if (bot) {
            bot.stop();
            window.showNotification(`Bot ${botId} stopped`, 'info');
        }
    }
    
    configureBroker(brokerId) {
        // Open broker configuration modal
        const modal = document.getElementById('brokerConfigModal');
        if (modal) {
            // Load broker config
            const config = this.brokerConfigs[brokerId];
            // Populate modal with config
            // ... implementation
            modal.style.display = 'block';
        }
    }
}

// Risk Manager Class
class RiskManager {
    constructor() {
        this.settings = {
            maxPositionSize: 0.05,      // 5% of account per position
            maxTotalExposure: 0.25,     // 25% total exposure
            maxDailyLoss: 0.02,          // 2% daily loss limit
            maxDrawdown: 0.10,           // 10% max drawdown
            maxPositions: 10,            // Maximum concurrent positions
            stopLossRequired: true,      // Require stop loss on all trades
            defaultStopLoss: 0.02        // 2% default stop loss
        };
        
        this.dailyStats = {
            startBalance: 0,
            currentBalance: 0,
            realizedPnL: 0,
            trades: 0,
            wins: 0,
            losses: 0
        };
        
        this.blockNewPositions = false;
        this.loadSettings();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('riskSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    checkOrderRisk(orderParams) {
        // Check if order passes risk checks
        
        // Check if new positions are blocked
        if (this.blockNewPositions && !orderParams.isClosing) {
            console.log('New positions blocked by risk manager');
            return false;
        }
        
        // Check position size limit
        const accountBalance = window.tradingModule?.getAccountBalance() || 100000;
        const positionValue = orderParams.quantity * (orderParams.limitPrice || orderParams.marketPrice || 0);
        
        if (positionValue > accountBalance * this.settings.maxPositionSize) {
            console.log('Position size exceeds limit');
            return false;
        }
        
        // Check stop loss requirement
        if (this.settings.stopLossRequired && !orderParams.isClosing) {
            if (!orderParams.stopLoss && !orderParams.stopPrice) {
                console.log('Stop loss required but not provided');
                return false;
            }
        }
        
        return true;
    }
    
    calculateMetrics(positions, accountBalance) {
        let totalExposure = 0;
        let unrealizedPnL = 0;
        
        for (const [symbol, position] of positions) {
            totalExposure += Math.abs(position.value) || 0;
            unrealizedPnL += position.unrealizedPnL || 0;
        }
        
        const currentBalance = accountBalance + unrealizedPnL + this.dailyStats.realizedPnL;
        const dailyLoss = (this.dailyStats.startBalance - currentBalance) / this.dailyStats.startBalance;
        const drawdown = Math.min(0, (currentBalance - this.dailyStats.startBalance) / this.dailyStats.startBalance);
        
        return {
            totalExposure,
            exposurePercent: totalExposure / accountBalance,
            unrealizedPnL,
            dailyLoss,
            drawdown,
            positionCount: positions.size
        };
    }
    
    resetDailyStats(startBalance) {
        this.dailyStats = {
            startBalance,
            currentBalance: startBalance,
            realizedPnL: 0,
            trades: 0,
            wins: 0,
            losses: 0
        };
    }
}

// Performance Tracker Class
class PerformanceTracker {
    constructor() {
        this.trades = [];
        this.equityCurve = [];
        this.metrics = {
            winRate: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            avgWin: 0,
            avgLoss: 0,
            expectancy: 0,
            dailyPnL: 0,
            totalPnL: 0
        };
        
        this.loadHistory();
    }
    
    loadHistory() {
        const saved = localStorage.getItem('tradeHistory');
        if (saved) {
            this.trades = JSON.parse(saved);
            this.calculateMetrics();
        }
    }
    
    recordTrade(tradeData) {
        const trade = {
            id: tradeData.id || this.generateTradeId(),
            symbol: tradeData.symbol,
            side: tradeData.side,
            quantity: tradeData.quantity,
            entryPrice: tradeData.price,
            exitPrice: tradeData.exitPrice,
            entryTime: tradeData.timestamp,
            exitTime: tradeData.exitTime,
            pnl: tradeData.pnl || 0,
            fees: tradeData.fees || 0,
            netPnl: (tradeData.pnl || 0) - (tradeData.fees || 0)
        };
        
        this.trades.push(trade);
        
        // Keep last 1000 trades
        if (this.trades.length > 1000) {
            this.trades.shift();
        }
        
        this.saveHistory();
        this.calculateMetrics();
    }
    
    calculateMetrics() {
        if (this.trades.length === 0) return;
        
        const wins = this.trades.filter(t => t.netPnl > 0);
        const losses = this.trades.filter(t => t.netPnl < 0);
        
        this.metrics.winRate = (wins.length / this.trades.length) * 100;
        
        const totalWins = wins.reduce((sum, t) => sum + t.netPnl, 0);
        const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.netPnl, 0));
        
        this.metrics.profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;
        this.metrics.avgWin = wins.length > 0 ? totalWins / wins.length : 0;
        this.metrics.avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
        this.metrics.expectancy = (this.metrics.winRate / 100 * this.metrics.avgWin) - 
                                  ((1 - this.metrics.winRate / 100) * this.metrics.avgLoss);
        
        this.metrics.totalPnL = this.trades.reduce((sum, t) => sum + t.netPnl, 0);
        
        // Calculate daily P&L
        const today = new Date().toDateString();
        const todayTrades = this.trades.filter(t => 
            new Date(t.exitTime || t.entryTime).toDateString() === today
        );
        this.metrics.dailyPnL = todayTrades.reduce((sum, t) => sum + t.netPnl, 0);
        
        // Calculate Sharpe ratio (simplified)
        const returns = this.trades.map(t => t.netPnl);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
        this.metrics.sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
        
        // Calculate max drawdown
        this.calculateDrawdown();
    }
    
    calculateDrawdown() {
        if (this.trades.length === 0) return;
        
        let peak = 0;
        let maxDrawdown = 0;
        let runningPnL = 0;
        
        for (const trade of this.trades) {
            runningPnL += trade.netPnl;
            if (runningPnL > peak) {
                peak = runningPnL;
            }
            const drawdown = peak > 0 ? ((peak - runningPnL) / peak) * 100 : 0;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        
        this.metrics.maxDrawdown = maxDrawdown;
    }
    
    updateMetrics() {
        this.calculateMetrics();
    }
    
    getMetrics() {
        return this.metrics;
    }
    
    saveHistory() {
        localStorage.setItem('tradeHistory', JSON.stringify(this.trades));
    }
    
    generateTradeId() {
        return `TRD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Broker Connection Class
class BrokerConnection {
    constructor(brokerId, config, mode) {
        this.brokerId = brokerId;
        this.config = config;
        this.mode = mode;
        this.connected = false;
        this.ws = null;
        this.accountInfo = null;
        this.callbacks = new Map();
    }
    
    async connect() {
        console.log(`Connecting to ${this.config.name}...`);
        
        // Get appropriate endpoint based on mode
        const endpoint = this.mode === 'paper' ? 
            (this.config.paperEndpoint || this.config.testEndpoint) : 
            this.config.liveEndpoint;
        
        if (!endpoint || endpoint.startsWith('mock://')) {
            // Mock connection for testing
            this.connected = true;
            this.accountInfo = {
                cashBalance: 100000,
                buyingPower: 100000,
                positions: [],
                orders: []
            };
            return;
        }
        
        // Real broker connection would go here
        // This is a placeholder for actual broker API integration
        
        this.connected = true;
    }
    
    async reconnect(mode) {
        this.mode = mode;
        this.disconnect();
        await this.connect();
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }
    
    async placeOrder(order) {
        if (!this.connected) {
            throw new Error('Broker not connected');
        }
        
        // Mock order placement
        const brokerOrderId = `${this.brokerId}_${Date.now()}`;
        
        // Simulate order execution for paper trading
        if (this.mode === 'paper' || this.config.endpoint?.startsWith('mock://')) {
            setTimeout(() => {
                this.emit('fill', {
                    orderId: brokerOrderId,
                    symbol: order.symbol,
                    side: order.side,
                    quantity: order.quantity,
                    price: order.limitPrice || this.getMarketPrice(order.symbol),
                    timestamp: new Date().toISOString()
                });
            }, 1000);
        }
        
        return brokerOrderId;
    }
    
    async cancelOrder(orderId) {
        if (!this.connected) {
            throw new Error('Broker not connected');
        }
        
        // Mock order cancellation
        return true;
    }
    
    async getPositions() {
        if (!this.connected) {
            throw new Error('Broker not connected');
        }
        
        return this.accountInfo?.positions || [];
    }
    
    async getOrders() {
        if (!this.connected) {
            throw new Error('Broker not connected');
        }
        
        return this.accountInfo?.orders || [];
    }
    
    getMarketPrice(symbol) {
        // Mock market price
        return 100 + Math.random() * 10;
    }
    
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }
    
    emit(event, data) {
        const callbacks = this.callbacks.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }
}

// Trading Bot Class
class TradingBot {
    constructor(botId, config) {
        this.botId = botId;
        this.config = config;
        this.running = false;
        this.paused = false;
        this.callbacks = new Map();
        this.signals = [];
    }
    
    async start() {
        this.running = true;
        this.paused = false;
        console.log(`Bot ${this.botId} started`);
        
        // Start strategy execution loop
        this.executeStrategy();
    }
    
    stop() {
        this.running = false;
        console.log(`Bot ${this.botId} stopped`);
    }
    
    pause() {
        this.paused = true;
        console.log(`Bot ${this.botId} paused`);
    }
    
    resume() {
        this.paused = false;
        console.log(`Bot ${this.botId} resumed`);
    }
    
    executeStrategy() {
        if (!this.running) return;
        
        if (!this.paused) {
            // Execute strategy logic based on config
            // This is a placeholder for actual strategy implementation
            
            // Example: Generate random signals for testing
            if (Math.random() < 0.01) { // 1% chance per tick
                const signal = {
                    id: `SIG_${Date.now()}`,
                    symbol: this.getRandomSymbol(),
                    action: Math.random() > 0.5 ? 'buy' : 'sell',
                    entryPrice: 100 + Math.random() * 10,
                    stopLoss: 95 + Math.random() * 5,
                    takeProfit: 105 + Math.random() * 10,
                    riskPercent: this.config.riskPerTrade,
                    confidence: Math.random(),
                    timestamp: new Date().toISOString()
                };
                
                this.emit('signal', signal);
                this.signals.push(signal);
            }
        }
        
        // Continue execution loop
        setTimeout(() => this.executeStrategy(), 1000);
    }
    
    getRandomSymbol() {
        const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'BTC-USD', 'ETH-USD'];
        return symbols[Math.floor(Math.random() * symbols.length)];
    }
    
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }
    
    emit(event, data) {
        const callbacks = this.callbacks.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }
}

// Initialize trading module when document is ready
if (typeof window !== 'undefined') {
    window.tradingModule = null;
    
    document.addEventListener('DOMContentLoaded', () => {
        window.tradingModule = new TradingModule();
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TradingModule, RiskManager, PerformanceTracker, BrokerConnection, TradingBot };
}