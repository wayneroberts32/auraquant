/**
 * AuraQuant Master Integration Module
 * Ensures complete frontend-backend communication and synchronization
 */

class AuraQuantIntegration {
    constructor() {
        this.apiBaseUrl = window.CONFIG?.API_BASE_URL || 'http://localhost:8000';
        this.wsUrl = window.CONFIG?.WS_URL || 'ws://localhost:8000/ws';
        this.isInitialized = false;
        this.modules = {};
        this.wsConnection = null;
        this.authToken = localStorage.getItem('auth_token');
        
        // Module references
        this.modules = {
            websocket: null,
            trading: null,
            charts: null,
            screener: null,
            ai: null,
            social: null,
            backtest: null,
            timezone: null,
            emergency: null,
            backup: null,
            targets: null
        };
    }
    
    async initialize() {
        console.log('🚀 Initializing AuraQuant Integration System...');
        
        try {
            // 1. Verify backend connection
            await this.verifyBackendConnection();
            
            // 2. Initialize WebSocket
            await this.initializeWebSocket();
            
            // 3. Initialize all modules
            await this.initializeModules();
            
            // 4. Setup event listeners
            this.setupEventListeners();
            
            // 5. Load initial data
            await this.loadInitialData();
            
            // 6. Start real-time updates
            this.startRealTimeUpdates();
            
            // 7. Setup frontend-backend sync
            this.setupFrontendBackendSync();
            
            this.isInitialized = true;
            console.log('✅ AuraQuant Integration System initialized successfully');
            
            // Update UI to show connected status
            this.updateConnectionStatus('connected');
            
        } catch (error) {
            console.error('❌ Integration initialization failed:', error);
            this.updateConnectionStatus('error');
            throw error;
        }
    }
    
    async verifyBackendConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            if (!response.ok) {
                throw new Error('Backend health check failed');
            }
            const data = await response.json();
            console.log('✅ Backend connected:', data);
            return true;
        } catch (error) {
            console.error('❌ Backend connection failed:', error);
            // Try to start backend if not running
            await this.attemptBackendStart();
            throw error;
        }
    }
    
    async initializeWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                // Use the WebSocket module if available
                if (window.WebSocketManager) {
                    this.modules.websocket = window.WebSocketManager;
                    this.modules.websocket.connect();
                    resolve();
                    return;
                }
                
                // Fallback to direct WebSocket connection
                this.wsConnection = new WebSocket(this.wsUrl);
                
                this.wsConnection.onopen = () => {
                    console.log('✅ WebSocket connected');
                    this.sendWebSocketMessage({
                        type: 'authenticate',
                        token: this.authToken
                    });
                    resolve();
                };
                
                this.wsConnection.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    reject(error);
                };
                
                this.wsConnection.onmessage = (event) => {
                    this.handleWebSocketMessage(JSON.parse(event.data));
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    async initializeModules() {
        console.log('📦 Initializing modules...');
        
        // Trading Module
        if (window.TradingModule) {
            this.modules.trading = window.TradingModule;
            await this.modules.trading.initialize();
        }
        
        // Charts Module
        if (window.ChartsModule) {
            this.modules.charts = window.ChartsModule;
            await this.modules.charts.initialize();
        }
        
        // Screener Module
        if (window.ScreenerModule) {
            this.modules.screener = window.ScreenerModule;
            await this.modules.screener.initialize();
        }
        
        // AI Module
        if (window.AIModule) {
            this.modules.ai = window.AIModule;
            await this.modules.ai.initialize();
        }
        
        // Social Module
        if (window.SocialModule) {
            this.modules.social = window.SocialModule;
            await this.modules.social.initialize();
        }
        
        // Backtest Module
        if (window.BacktestEngine) {
            this.modules.backtest = window.BacktestEngine;
            await this.modules.backtest.initialize();
        }
        
        // Timezone Module
        if (window.timezoneModule) {
            this.modules.timezone = window.timezoneModule;
        }
        
        // Emergency Module
        if (window.EmergencySystem) {
            this.modules.emergency = window.EmergencySystem;
            await this.modules.emergency.initialize();
        }
        
        // Backup Module
        if (window.BackupSystem) {
            this.modules.backup = window.BackupSystem;
            await this.modules.backup.initialize();
        }
        
        console.log('✅ All modules initialized');
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleNavigation(e));
        });
        
        // Trading actions
        document.getElementById('placeOrderBtn')?.addEventListener('click', () => this.placeOrder());
        document.getElementById('emergencyStopBtn')?.addEventListener('click', () => this.emergencyStop());
        
        // Bot controls
        document.getElementById('startBotBtn')?.addEventListener('click', () => this.startBot());
        document.getElementById('stopBotBtn')?.addEventListener('click', () => this.stopBot());
        document.getElementById('pauseBotBtn')?.addEventListener('click', () => this.pauseBot());
        
        // Mode switching
        document.getElementById('tradingModeToggle')?.addEventListener('change', (e) => this.switchTradingMode(e));
        
        // Target setting
        document.getElementById('setTargetBtn')?.addEventListener('click', () => this.setTarget());
        
        // API Management
        document.getElementById('saveApiKeysBtn')?.addEventListener('click', () => this.saveApiKeys());
        
        // Webhook setup
        document.getElementById('setupWebhooksBtn')?.addEventListener('click', () => this.setupWebhooks());
    }
    
    async loadInitialData() {
        console.log('📊 Loading initial data...');
        
        try {
            // Load user profile
            await this.loadUserProfile();
            
            // Load bot configuration
            await this.loadBotConfiguration();
            
            // Load current positions
            await this.loadPositions();
            
            // Load recent trades
            await this.loadRecentTrades();
            
            // Load market data
            await this.loadMarketData();
            
            // Load targets
            await this.loadTargets();
            
            console.log('✅ Initial data loaded');
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
        }
    }
    
    startRealTimeUpdates() {
        // Market data updates
        setInterval(() => this.updateMarketData(), 1000);
        
        // Position updates
        setInterval(() => this.updatePositions(), 2000);
        
        // P&L updates
        setInterval(() => this.updatePnL(), 1000);
        
        // Risk metrics updates
        setInterval(() => this.updateRiskMetrics(), 5000);
    }
    
    setupFrontendBackendSync() {
        // Subscribe to WebSocket channels
        this.subscribeToChannels([
            'market:*',
            'trades',
            'positions',
            'alerts',
            'bot_status'
        ]);
        
        // Setup bi-directional sync
        window.addEventListener('frontend-update', (e) => {
            this.sendToBackend(e.detail);
        });
    }
    
    // Core Trading Functions
    
    async placeOrder() {
        const orderData = {
            symbol: document.getElementById('orderSymbol')?.value,
            side: document.getElementById('orderSide')?.value,
            quantity: parseFloat(document.getElementById('orderQuantity')?.value),
            type: document.getElementById('orderType')?.value,
            price: parseFloat(document.getElementById('orderPrice')?.value) || null
        };
        
        try {
            const response = await this.apiCall('/api/orders', 'POST', orderData);
            console.log('✅ Order placed:', response);
            this.showNotification('Order placed successfully', 'success');
            
            // Update UI
            await this.loadPositions();
            await this.loadRecentTrades();
            
        } catch (error) {
            console.error('❌ Order failed:', error);
            this.showNotification('Order failed: ' + error.message, 'error');
        }
    }
    
    async emergencyStop() {
        if (!confirm('⚠️ EMERGENCY STOP: This will close all positions and halt trading. Continue?')) {
            return;
        }
        
        try {
            const response = await this.apiCall('/api/bot/emergency-stop', 'POST');
            console.log('🛑 Emergency stop executed:', response);
            
            // Update all displays
            this.updateBotStatus('emergency_stop');
            this.showNotification('EMERGENCY STOP ACTIVATED', 'critical');
            
            // Trigger emergency module
            if (this.modules.emergency) {
                this.modules.emergency.activate('Manual trigger');
            }
            
        } catch (error) {
            console.error('❌ Emergency stop failed:', error);
            this.showNotification('Emergency stop failed!', 'error');
        }
    }
    
    // Bot Control Functions
    
    async startBot() {
        try {
            const response = await this.apiCall('/api/bot/start', 'POST');
            console.log('✅ Bot started:', response);
            this.updateBotStatus('running');
            this.showNotification('Bot started successfully', 'success');
        } catch (error) {
            console.error('❌ Failed to start bot:', error);
            this.showNotification('Failed to start bot', 'error');
        }
    }
    
    async stopBot() {
        try {
            const response = await this.apiCall('/api/bot/stop', 'POST');
            console.log('✅ Bot stopped:', response);
            this.updateBotStatus('stopped');
            this.showNotification('Bot stopped', 'info');
        } catch (error) {
            console.error('❌ Failed to stop bot:', error);
            this.showNotification('Failed to stop bot', 'error');
        }
    }
    
    async pauseBot() {
        try {
            const response = await this.apiCall('/api/bot/pause', 'POST');
            console.log('✅ Bot paused:', response);
            this.updateBotStatus('paused');
            this.showNotification('Bot paused', 'info');
        } catch (error) {
            console.error('❌ Failed to pause bot:', error);
            this.showNotification('Failed to pause bot', 'error');
        }
    }
    
    // Mode Management
    
    async switchTradingMode(event) {
        const newMode = event.target.checked ? 'live' : 'paper';
        
        if (newMode === 'live') {
            if (!confirm('⚠️ Switch to LIVE trading? Real money will be at risk!')) {
                event.target.checked = false;
                return;
            }
        }
        
        try {
            const response = await this.apiCall('/api/bot/mode', 'POST', { mode: newMode });
            console.log(`✅ Switched to ${newMode} mode:`, response);
            this.showNotification(`Switched to ${newMode} mode`, 'success');
            
            // Update UI
            document.getElementById('tradingModeLabel').textContent = newMode.toUpperCase();
            
        } catch (error) {
            console.error('❌ Mode switch failed:', error);
            this.showNotification('Mode switch failed: ' + error.message, 'error');
            event.target.checked = !event.target.checked; // Revert
        }
    }
    
    // Target Management
    
    async setTarget() {
        const targetData = {
            type: document.getElementById('targetType')?.value,
            value: parseFloat(document.getElementById('targetValue')?.value),
            timeframe: document.getElementById('targetTimeframe')?.value
        };
        
        try {
            const response = await this.apiCall('/api/targets', 'POST', targetData);
            console.log('✅ Target set:', response);
            this.showNotification('Target set successfully', 'success');
            await this.loadTargets();
        } catch (error) {
            console.error('❌ Failed to set target:', error);
            this.showNotification('Failed to set target', 'error');
        }
    }
    
    // API Configuration
    
    async saveApiKeys() {
        const apiKeys = {
            alpaca_key: document.getElementById('alpacaKey')?.value,
            alpaca_secret: document.getElementById('alpacaSecret')?.value,
            binance_key: document.getElementById('binanceKey')?.value,
            binance_secret: document.getElementById('binanceSecret')?.value,
            openai_key: document.getElementById('openaiKey')?.value,
            anthropic_key: document.getElementById('anthropicKey')?.value
        };
        
        try {
            const response = await this.apiCall('/api/config/api-keys', 'POST', apiKeys);
            console.log('✅ API keys saved:', response);
            this.showNotification('API keys saved successfully', 'success');
        } catch (error) {
            console.error('❌ Failed to save API keys:', error);
            this.showNotification('Failed to save API keys', 'error');
        }
    }
    
    // Webhook Setup
    
    async setupWebhooks() {
        try {
            const response = await this.apiCall('/api/webhooks/setup', 'POST');
            console.log('✅ Webhooks setup:', response);
            
            // Display webhook URLs
            const webhookInfo = `
                <div>
                    <h4>Webhook URLs:</h4>
                    <p>TradingView: ${response.tradingview_url}</p>
                    <p>Alpaca: ${response.alpaca_url}</p>
                    <p>Binance: ${response.binance_url}</p>
                </div>
            `;
            
            this.showNotification('Webhooks configured', 'success');
            this.showModal('Webhook Configuration', webhookInfo);
            
        } catch (error) {
            console.error('❌ Webhook setup failed:', error);
            this.showNotification('Webhook setup failed', 'error');
        }
    }
    
    // Data Loading Functions
    
    async loadUserProfile() {
        try {
            const profile = await this.apiCall('/api/user/profile');
            
            // Update UI with user info
            document.getElementById('userName')?.textContent = profile.name;
            document.getElementById('userEmail')?.textContent = profile.email;
            document.getElementById('userEquity')?.textContent = `$${profile.equity.toLocaleString()}`;
            
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }
    
    async loadBotConfiguration() {
        try {
            const config = await this.apiCall('/api/bot/config');
            
            // Update bot status display
            this.updateBotStatus(config.status);
            document.getElementById('botVersion')?.textContent = config.version;
            document.getElementById('tradingMode')?.textContent = config.trading_mode;
            
        } catch (error) {
            console.error('Error loading bot configuration:', error);
        }
    }
    
    async loadPositions() {
        try {
            const positions = await this.apiCall('/api/positions');
            
            // Update positions table
            const tbody = document.querySelector('#positionsTable tbody');
            if (tbody) {
                tbody.innerHTML = positions.map(pos => `
                    <tr>
                        <td>${pos.symbol}</td>
                        <td>${pos.quantity}</td>
                        <td>$${pos.average_price.toFixed(2)}</td>
                        <td>$${pos.current_price.toFixed(2)}</td>
                        <td class="${pos.pnl >= 0 ? 'profit' : 'loss'}">
                            $${pos.pnl.toFixed(2)}
                        </td>
                        <td>
                            <button onclick="integration.closePosition('${pos.id}')">Close</button>
                        </td>
                    </tr>
                `).join('');
            }
            
        } catch (error) {
            console.error('Error loading positions:', error);
        }
    }
    
    async loadRecentTrades() {
        try {
            const trades = await this.apiCall('/api/trades?limit=10');
            
            // Update trades table
            const tbody = document.querySelector('#tradesTable tbody');
            if (tbody) {
                tbody.innerHTML = trades.map(trade => `
                    <tr>
                        <td>${new Date(trade.executed_at).toLocaleString()}</td>
                        <td>${trade.symbol}</td>
                        <td>${trade.side}</td>
                        <td>${trade.quantity}</td>
                        <td>$${trade.price.toFixed(2)}</td>
                        <td class="${trade.pnl >= 0 ? 'profit' : 'loss'}">
                            $${trade.pnl.toFixed(2)}
                        </td>
                    </tr>
                `).join('');
            }
            
        } catch (error) {
            console.error('Error loading trades:', error);
        }
    }
    
    async loadMarketData() {
        try {
            const watchlist = ['BTC/USD', 'ETH/USD', 'AAPL', 'GOOGL', 'TSLA'];
            
            for (const symbol of watchlist) {
                const data = await this.apiCall(`/api/market/${symbol}`);
                this.updateMarketDisplay(symbol, data);
            }
            
        } catch (error) {
            console.error('Error loading market data:', error);
        }
    }
    
    async loadTargets() {
        try {
            const targets = await this.apiCall('/api/targets');
            
            // Update targets display
            const container = document.getElementById('targetsContainer');
            if (container) {
                container.innerHTML = targets.map(target => `
                    <div class="target-card">
                        <h4>${target.type}</h4>
                        <p>Target: ${target.value}</p>
                        <p>Progress: ${target.progress}%</p>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${target.progress}%"></div>
                        </div>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error('Error loading targets:', error);
        }
    }
    
    // Real-time Update Functions
    
    async updateMarketData() {
        // This is called every second
        if (this.modules.charts) {
            // Charts module handles its own updates
            return;
        }
        
        // Fallback market data update
        const symbols = document.querySelectorAll('.market-symbol');
        symbols.forEach(async (element) => {
            const symbol = element.dataset.symbol;
            if (symbol) {
                try {
                    const data = await this.apiCall(`/api/market/${symbol}/quote`);
                    this.updateMarketDisplay(symbol, data);
                } catch (error) {
                    // Silent fail for continuous updates
                }
            }
        });
    }
    
    async updatePositions() {
        // Update positions P&L
        const positions = document.querySelectorAll('.position-row');
        positions.forEach(async (row) => {
            const positionId = row.dataset.positionId;
            if (positionId) {
                try {
                    const data = await this.apiCall(`/api/positions/${positionId}`);
                    this.updatePositionDisplay(positionId, data);
                } catch (error) {
                    // Silent fail
                }
            }
        });
    }
    
    async updatePnL() {
        try {
            const pnl = await this.apiCall('/api/account/pnl');
            
            document.getElementById('dailyPnL')?.textContent = `$${pnl.daily.toFixed(2)}`;
            document.getElementById('totalPnL')?.textContent = `$${pnl.total.toFixed(2)}`;
            document.getElementById('unrealizedPnL')?.textContent = `$${pnl.unrealized.toFixed(2)}`;
            
        } catch (error) {
            // Silent fail for continuous updates
        }
    }
    
    async updateRiskMetrics() {
        try {
            const metrics = await this.apiCall('/api/risk/metrics');
            
            document.getElementById('currentDrawdown')?.textContent = `${(metrics.drawdown * 100).toFixed(2)}%`;
            document.getElementById('riskUtilization')?.textContent = `${(metrics.risk_utilization * 100).toFixed(2)}%`;
            document.getElementById('sharpeRatio')?.textContent = metrics.sharpe_ratio.toFixed(2);
            
        } catch (error) {
            // Silent fail for continuous updates
        }
    }
    
    // WebSocket Handling
    
    handleWebSocketMessage(message) {
        console.log('📨 WebSocket message:', message);
        
        switch (message.type) {
            case 'market_update':
                this.handleMarketUpdate(message.data);
                break;
            case 'trade_executed':
                this.handleTradeExecuted(message.data);
                break;
            case 'position_update':
                this.handlePositionUpdate(message.data);
                break;
            case 'alert':
                this.handleAlert(message.data);
                break;
            case 'bot_status':
                this.handleBotStatusUpdate(message.data);
                break;
            case 'emergency_stop':
                this.handleEmergencyStop(message.data);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }
    
    handleMarketUpdate(data) {
        this.updateMarketDisplay(data.symbol, data);
        
        // Update charts if available
        if (this.modules.charts) {
            this.modules.charts.updateChart(data.symbol, data);
        }
    }
    
    handleTradeExecuted(data) {
        this.showNotification(`Trade executed: ${data.side} ${data.quantity} ${data.symbol} @ $${data.price}`, 'info');
        
        // Reload trades and positions
        this.loadRecentTrades();
        this.loadPositions();
    }
    
    handlePositionUpdate(data) {
        this.updatePositionDisplay(data.id, data);
    }
    
    handleAlert(data) {
        const severity = data.severity || 'info';
        this.showNotification(data.message, severity);
        
        // Add to alerts panel
        const alertsPanel = document.getElementById('alertsPanel');
        if (alertsPanel) {
            const alertElement = document.createElement('div');
            alertElement.className = `alert alert-${severity}`;
            alertElement.innerHTML = `
                <span class="alert-time">${new Date().toLocaleTimeString()}</span>
                <span class="alert-message">${data.message}</span>
            `;
            alertsPanel.prepend(alertElement);
        }
    }
    
    handleBotStatusUpdate(data) {
        this.updateBotStatus(data.status);
        
        if (data.version) {
            document.getElementById('botVersion')?.textContent = data.version;
        }
    }
    
    handleEmergencyStop(data) {
        console.error('🛑 EMERGENCY STOP TRIGGERED:', data);
        
        // Activate emergency UI
        if (this.modules.emergency) {
            this.modules.emergency.activate(data.reason);
        }
        
        // Show critical notification
        this.showNotification(`EMERGENCY STOP: ${data.reason}`, 'critical');
        
        // Update bot status
        this.updateBotStatus('emergency_stop');
    }
    
    // Helper Functions
    
    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'API request failed');
        }
        
        return response.json();
    }
    
    sendWebSocketMessage(message) {
        if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            this.wsConnection.send(JSON.stringify(message));
        } else if (this.modules.websocket) {
            this.modules.websocket.send(message);
        }
    }
    
    subscribeToChannels(channels) {
        channels.forEach(channel => {
            this.sendWebSocketMessage({
                type: 'subscribe',
                channel: channel
            });
        });
    }
    
    updateConnectionStatus(status) {
        const indicator = document.getElementById('connectionIndicator');
        if (indicator) {
            indicator.className = `connection-${status}`;
            indicator.title = status.charAt(0).toUpperCase() + status.slice(1);
        }
        
        const statusText = document.getElementById('connectionStatus');
        if (statusText) {
            statusText.textContent = status.toUpperCase();
        }
    }
    
    updateBotStatus(status) {
        const statusElement = document.getElementById('botStatus');
        if (statusElement) {
            statusElement.textContent = status.toUpperCase();
            statusElement.className = `bot-status bot-status-${status}`;
        }
        
        // Update control buttons
        document.getElementById('startBotBtn')?.disabled = (status === 'running');
        document.getElementById('stopBotBtn')?.disabled = (status === 'stopped');
        document.getElementById('pauseBotBtn')?.disabled = (status !== 'running');
    }
    
    updateMarketDisplay(symbol, data) {
        const element = document.querySelector(`[data-symbol="${symbol}"]`);
        if (element) {
            element.querySelector('.price')?.textContent = `$${data.price.toFixed(2)}`;
            element.querySelector('.change')?.textContent = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%`;
            element.querySelector('.volume')?.textContent = data.volume.toLocaleString();
        }
    }
    
    updatePositionDisplay(positionId, data) {
        const row = document.querySelector(`[data-position-id="${positionId}"]`);
        if (row) {
            row.querySelector('.current-price')?.textContent = `$${data.current_price.toFixed(2)}`;
            row.querySelector('.pnl')?.textContent = `$${data.pnl.toFixed(2)}`;
            row.querySelector('.pnl')?.className = `pnl ${data.pnl >= 0 ? 'profit' : 'loss'}`;
        }
    }
    
    showNotification(message, type = 'info') {
        // Use the helpers module if available
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }
        
        // Fallback notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }
    
    showModal(title, content) {
        // Create modal if doesn't exist
        let modal = document.getElementById('infoModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'infoModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title"></h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        modal.querySelector('.modal-title').textContent = title;
        modal.querySelector('.modal-body').innerHTML = content;
        modal.style.display = 'flex';
        
        modal.querySelector('.modal-close').onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    async closePosition(positionId) {
        if (!confirm('Close this position?')) {
            return;
        }
        
        try {
            const response = await this.apiCall(`/api/positions/${positionId}/close`, 'POST');
            console.log('✅ Position closed:', response);
            this.showNotification('Position closed successfully', 'success');
            await this.loadPositions();
        } catch (error) {
            console.error('❌ Failed to close position:', error);
            this.showNotification('Failed to close position', 'error');
        }
    }
    
    handleNavigation(event) {
        const tabId = event.target.dataset.tab;
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        // Show selected screen
        const screen = document.getElementById(`${tabId}Screen`);
        if (screen) {
            screen.style.display = 'block';
        }
        
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');
    }
    
    async attemptBackendStart() {
        console.log('Attempting to start backend...');
        // This would typically trigger a local backend start script
        // For now, just log the attempt
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Starting AuraQuant Integration...');
    
    window.integration = new AuraQuantIntegration();
    
    try {
        await window.integration.initialize();
        console.log('✅ AuraQuant fully integrated and running!');
    } catch (error) {
        console.error('❌ Failed to initialize AuraQuant:', error);
        
        // Show error UI
        document.body.innerHTML = `
            <div class="initialization-error">
                <h1>⚠️ AuraQuant Initialization Failed</h1>
                <p>${error.message}</p>
                <p>Please ensure the backend is running and try refreshing the page.</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }
});

// Export for use by other modules
window.AuraQuantIntegration = AuraQuantIntegration;
