/**
 * Plus500 Integration Module
 * Handles Plus500 manual trading interface and signal management
 * Note: Plus500 doesn't provide API, all trades are manual
 */

class Plus500Integration {
    constructor() {
        this.plus500Url = 'https://app.plus500.com';
        this.webTraderUrl = 'https://app.plus500.com/trade';
        this.isConnected = false;
        this.pendingTrades = [];
        this.watchlist = [];
        this.accountInfo = null;
        
        this.init();
    }
    
    async init() {
        console.log('Initializing Plus500 Integration...');
        
        // Setup UI components
        this.setupPlus500Interface();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Connect to backend for signals
        this.connectToBackend();
        
        // Load saved watchlist
        this.loadWatchlist();
        
        console.log('Plus500 Integration initialized');
    }
    
    setupPlus500Interface() {
        const plus500Content = `
            <div id="plus500-trading-interface" class="broker-content">
                <!-- Plus500 Status Section -->
                <div class="plus500-status-section">
                    <div class="section-header">
                        <h3>Plus500 WebTrader</h3>
                        <div class="connection-status ${this.isConnected ? 'connected' : 'manual-mode'}">
                            <span class="status-dot"></span>
                            <span class="status-text">Manual Trading Mode</span>
                        </div>
                    </div>
                    
                    <div class="plus500-info-banner">
                        <div class="banner-icon">⚠️</div>
                        <div class="banner-content">
                            <p><strong>Manual Trading Required</strong></p>
                            <p>Plus500 doesn't provide API access. All trades must be executed manually through their WebTrader platform.</p>
                        </div>
                    </div>
                    
                    <div class="plus500-quick-access">
                        <button id="openPlus500WebTrader" class="btn btn-primary">
                            <i class="fas fa-external-link-alt"></i> Open Plus500 WebTrader
                        </button>
                        <button id="plus500Demo" class="btn btn-secondary">
                            <i class="fas fa-graduation-cap"></i> Demo Account
                        </button>
                        <button id="plus500Help" class="btn btn-info">
                            <i class="fas fa-question-circle"></i> Trading Guide
                        </button>
                    </div>
                </div>
                
                <!-- Manual Trading Signals -->
                <div class="manual-signals-section">
                    <div class="section-header">
                        <h3>Trading Signals for Plus500</h3>
                        <div class="signal-filters">
                            <select id="plus500SignalFilter" class="form-control">
                                <option value="all">All Signals</option>
                                <option value="forex">Forex</option>
                                <option value="stocks">Stocks</option>
                                <option value="crypto">Crypto</option>
                                <option value="commodities">Commodities</option>
                                <option value="indices">Indices</option>
                            </select>
                            <button id="refreshPlus500Signals" class="btn btn-sm btn-secondary">
                                <i class="fas fa-sync"></i> Refresh
                            </button>
                        </div>
                    </div>
                    
                    <div id="plus500SignalsList" class="signals-list">
                        ${this.renderTradingSignals()}
                    </div>
                </div>
                
                <!-- Quick Order Calculator -->
                <div class="order-calculator-section">
                    <h4>Position Size Calculator</h4>
                    <div class="calculator-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Account Balance</label>
                                <input type="number" id="plus500Balance" class="form-control" placeholder="10000" value="10000">
                            </div>
                            <div class="form-group">
                                <label>Risk %</label>
                                <input type="number" id="plus500RiskPercent" class="form-control" placeholder="1" value="1" min="0.1" max="5" step="0.1">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Entry Price</label>
                                <input type="number" id="plus500EntryPrice" class="form-control" placeholder="0.00" step="0.00001">
                            </div>
                            <div class="form-group">
                                <label>Stop Loss</label>
                                <input type="number" id="plus500StopLoss" class="form-control" placeholder="0.00" step="0.00001">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Leverage</label>
                                <select id="plus500Leverage" class="form-control">
                                    <option value="1">1:1</option>
                                    <option value="2">1:2</option>
                                    <option value="5">1:5</option>
                                    <option value="10">1:10</option>
                                    <option value="20">1:20</option>
                                    <option value="30" selected>1:30</option>
                                    <option value="50">1:50</option>
                                    <option value="100">1:100</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Position Size</label>
                                <input type="text" id="plus500PositionSize" class="form-control" readonly>
                            </div>
                        </div>
                        <button id="calculatePlus500Position" class="btn btn-primary">
                            <i class="fas fa-calculator"></i> Calculate
                        </button>
                    </div>
                </div>
                
                <!-- Watchlist Section -->
                <div class="watchlist-section">
                    <div class="section-header">
                        <h4>Plus500 Watchlist</h4>
                        <button id="addToPlus500Watchlist" class="btn btn-sm btn-success">
                            <i class="fas fa-plus"></i> Add Symbol
                        </button>
                    </div>
                    <div id="plus500Watchlist" class="watchlist-grid">
                        ${this.renderWatchlist()}
                    </div>
                </div>
                
                <!-- Trade Checklist -->
                <div class="trade-checklist-section">
                    <h4>Manual Trade Checklist</h4>
                    <div class="checklist">
                        <div class="checklist-item">
                            <input type="checkbox" id="check1">
                            <label for="check1">Signal confirmed and understood</label>
                        </div>
                        <div class="checklist-item">
                            <input type="checkbox" id="check2">
                            <label for="check2">Position size calculated</label>
                        </div>
                        <div class="checklist-item">
                            <input type="checkbox" id="check3">
                            <label for="check3">Stop loss level set</label>
                        </div>
                        <div class="checklist-item">
                            <input type="checkbox" id="check4">
                            <label for="check4">Take profit level set</label>
                        </div>
                        <div class="checklist-item">
                            <input type="checkbox" id="check5">
                            <label for="check5">Risk/Reward ratio acceptable (min 1:2)</label>
                        </div>
                        <div class="checklist-item">
                            <input type="checkbox" id="check6">
                            <label for="check6">Market conditions checked</label>
                        </div>
                        <div class="checklist-item">
                            <input type="checkbox" id="check7">
                            <label for="check7">Economic calendar reviewed</label>
                        </div>
                    </div>
                    <button id="executeOnPlus500" class="btn btn-success" disabled>
                        <i class="fas fa-check-circle"></i> Ready to Trade on Plus500
                    </button>
                </div>
                
                <!-- Trade Log -->
                <div class="trade-log-section">
                    <h4>Recent Plus500 Trades</h4>
                    <div id="plus500TradeLog" class="trade-log">
                        <!-- Trade history will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        // Add to trading screen
        const tradingScreen = document.getElementById('tradingScreen');
        if (tradingScreen) {
            // Add Plus500 tab if not exists
            let plus500Tab = document.getElementById('plus500BrokerTab');
            if (!plus500Tab) {
                const brokerTabs = document.querySelector('.broker-tabs');
                if (brokerTabs) {
                    const tabHtml = `
                        <button class="broker-tab" data-broker="plus500" id="plus500BrokerTab">
                            <img src="assets/brokers/plus500-logo.png" alt="Plus500" onerror="this.style.display='none'">
                            <span>Plus500</span>
                        </button>
                    `;
                    brokerTabs.insertAdjacentHTML('beforeend', tabHtml);
                }
            }
            
            // Add Plus500 content container
            let plus500Container = document.getElementById('plus500TradingContent');
            if (!plus500Container) {
                plus500Container = document.createElement('div');
                plus500Container.id = 'plus500TradingContent';
                plus500Container.className = 'broker-content-container';
                plus500Container.style.display = 'none';
                tradingScreen.appendChild(plus500Container);
            }
            plus500Container.innerHTML = plus500Content;
        }
    }
    
    renderTradingSignals() {
        if (this.pendingTrades.length === 0) {
            return `
                <div class="no-signals">
                    <i class="fas fa-satellite-dish fa-3x"></i>
                    <p>No active signals</p>
                    <small>Signals from TradingView will appear here</small>
                </div>
            `;
        }
        
        return this.pendingTrades.map(signal => {
            const urgencyClass = signal.confidence > 80 ? 'high-priority' : signal.confidence > 60 ? 'medium-priority' : 'low-priority';
            const actionClass = signal.action === 'BUY' ? 'buy-signal' : 'sell-signal';
            
            return `
                <div class="plus500-signal-card ${urgencyClass} ${actionClass}" data-signal-id="${signal.id}">
                    <div class="signal-header">
                        <div class="signal-main">
                            <span class="signal-symbol">${signal.symbol}</span>
                            <span class="signal-action ${signal.action.toLowerCase()}">${signal.action}</span>
                            <span class="signal-confidence">${signal.confidence}% confidence</span>
                        </div>
                        <span class="signal-time">${this.formatTime(signal.timestamp)}</span>
                    </div>
                    
                    <div class="signal-body">
                        <div class="signal-prices">
                            <div class="price-item">
                                <span class="label">Entry:</span>
                                <span class="value">$${signal.entry || 'Market'}</span>
                            </div>
                            <div class="price-item">
                                <span class="label">Stop Loss:</span>
                                <span class="value danger">$${signal.stopLoss || 'Set manually'}</span>
                            </div>
                            <div class="price-item">
                                <span class="label">Take Profit:</span>
                                <span class="value success">$${signal.takeProfit || 'Set manually'}</span>
                            </div>
                            <div class="price-item">
                                <span class="label">R/R Ratio:</span>
                                <span class="value">1:${signal.riskReward || '2'}</span>
                            </div>
                        </div>
                        
                        ${signal.message ? `
                            <div class="signal-message">
                                <i class="fas fa-info-circle"></i> ${signal.message}
                            </div>
                        ` : ''}
                        
                        <div class="signal-strategy">
                            <span class="badge badge-info">${signal.strategy || 'Manual'}</span>
                            <span class="badge badge-secondary">${signal.timeframe || '1H'}</span>
                            <span class="badge badge-warning">${signal.source || 'TradingView'}</span>
                        </div>
                    </div>
                    
                    <div class="signal-actions">
                        <button class="btn btn-sm btn-primary" onclick="plus500Integration.openPlus500WithSignal('${signal.id}')">
                            <i class="fas fa-external-link-alt"></i> Open in Plus500
                        </button>
                        <button class="btn btn-sm btn-success" onclick="plus500Integration.copySignalDetails('${signal.id}')">
                            <i class="fas fa-copy"></i> Copy Details
                        </button>
                        <button class="btn btn-sm btn-info" onclick="plus500Integration.calculateForSignal('${signal.id}')">
                            <i class="fas fa-calculator"></i> Calculate
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="plus500Integration.dismissSignal('${signal.id}')">
                            <i class="fas fa-times"></i> Dismiss
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderWatchlist() {
        if (this.watchlist.length === 0) {
            return '<div class="empty-watchlist">Add symbols to monitor</div>';
        }
        
        return this.watchlist.map(item => `
            <div class="watchlist-item">
                <div class="symbol">${item.symbol}</div>
                <div class="price ${item.change >= 0 ? 'positive' : 'negative'}">
                    $${item.price || '0.00'}
                    <span class="change">${item.change >= 0 ? '+' : ''}${item.change || 0}%</span>
                </div>
                <button class="btn-remove" onclick="plus500Integration.removeFromWatchlist('${item.symbol}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    setupEventListeners() {
        // Plus500 buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'openPlus500WebTrader') {
                this.openPlus500WebTrader();
            } else if (e.target.id === 'plus500Demo') {
                this.openPlus500Demo();
            } else if (e.target.id === 'plus500Help') {
                this.showTradingGuide();
            } else if (e.target.id === 'refreshPlus500Signals') {
                this.refreshSignals();
            } else if (e.target.id === 'calculatePlus500Position') {
                this.calculatePositionSize();
            } else if (e.target.id === 'addToPlus500Watchlist') {
                this.promptAddWatchlist();
            } else if (e.target.id === 'executeOnPlus500') {
                this.executeCheckedTrade();
            } else if (e.target.closest('.broker-tab[data-broker="plus500"]')) {
                this.showPlus500Interface();
            }
        });
        
        // Signal filter
        const filterSelect = document.getElementById('plus500SignalFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterSignals(e.target.value);
            });
        }
        
        // Checklist validation
        document.querySelectorAll('.checklist-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.validateChecklist();
            });
        });
        
        // Listen for webhook signals
        if (window.websocketManager) {
            window.websocketManager.subscribe('webhook_signal', (data) => {
                if (data.broker === 'Plus500' || data.broker === 'MANUAL' || !data.broker) {
                    this.addTradingSignal(data);
                }
            });
        }
    }
    
    openPlus500WebTrader() {
        window.open(this.webTraderUrl, 'Plus500_WebTrader', 'width=1400,height=900');
        this.showNotification('Plus500 WebTrader opened in new window', 'info');
    }
    
    openPlus500Demo() {
        window.open('https://www.plus500.com/trading/demo', '_blank');
        this.showNotification('Opening Plus500 demo account page', 'info');
    }
    
    showTradingGuide() {
        const guideModal = `
            <div class="modal-content">
                <h3>Plus500 Trading Guide</h3>
                <div class="guide-content">
                    <h4>How to Execute Signals:</h4>
                    <ol>
                        <li>Review the signal details carefully</li>
                        <li>Calculate your position size using the calculator</li>
                        <li>Open Plus500 WebTrader</li>
                        <li>Search for the symbol</li>
                        <li>Click Buy or Sell based on the signal</li>
                        <li>Set your position size</li>
                        <li>Set Stop Loss and Take Profit levels</li>
                        <li>Confirm and execute the trade</li>
                        <li>Monitor your position</li>
                    </ol>
                    
                    <h4>Important Notes:</h4>
                    <ul>
                        <li>Plus500 uses CFDs - understand the risks</li>
                        <li>Always use Stop Loss orders</li>
                        <li>Never risk more than 2% per trade</li>
                        <li>Check spreads before trading</li>
                        <li>Be aware of overnight fees</li>
                        <li>Monitor margin requirements</li>
                    </ul>
                    
                    <h4>Available Markets:</h4>
                    <ul>
                        <li>Forex pairs</li>
                        <li>Stock CFDs</li>
                        <li>Indices</li>
                        <li>Commodities</li>
                        <li>Cryptocurrencies</li>
                        <li>ETFs</li>
                    </ul>
                </div>
            </div>
        `;
        
        this.showModal('Plus500 Trading Guide', guideModal);
    }
    
    openPlus500WithSignal(signalId) {
        const signal = this.pendingTrades.find(s => s.id === signalId);
        if (!signal) return;
        
        // Open Plus500 with symbol if possible
        const symbol = signal.symbol.replace('/', '');
        const url = `${this.webTraderUrl}?symbol=${symbol}`;
        window.open(url, 'Plus500_Trade', 'width=1400,height=900');
        
        // Copy signal details to clipboard
        this.copySignalDetails(signalId);
        
        this.showNotification(`Opening Plus500 for ${signal.symbol}. Details copied to clipboard.`, 'success');
    }
    
    copySignalDetails(signalId) {
        const signal = this.pendingTrades.find(s => s.id === signalId);
        if (!signal) return;
        
        const details = `
Plus500 Trade Signal
Symbol: ${signal.symbol}
Action: ${signal.action}
Entry: ${signal.entry || 'Market'}
Stop Loss: ${signal.stopLoss || 'Set manually'}
Take Profit: ${signal.takeProfit || 'Set manually'}
Risk/Reward: 1:${signal.riskReward || '2'}
Strategy: ${signal.strategy || 'Manual'}
Confidence: ${signal.confidence}%
Time: ${new Date(signal.timestamp).toLocaleString()}
        `.trim();
        
        navigator.clipboard.writeText(details).then(() => {
            this.showNotification('Signal details copied to clipboard', 'success');
        });
    }
    
    calculateForSignal(signalId) {
        const signal = this.pendingTrades.find(s => s.id === signalId);
        if (!signal) return;
        
        // Pre-fill calculator
        if (signal.entry) {
            document.getElementById('plus500EntryPrice').value = signal.entry;
        }
        if (signal.stopLoss) {
            document.getElementById('plus500StopLoss').value = signal.stopLoss;
        }
        
        // Scroll to calculator
        document.querySelector('.order-calculator-section')?.scrollIntoView({ behavior: 'smooth' });
        
        // Auto calculate
        this.calculatePositionSize();
    }
    
    calculatePositionSize() {
        const balance = parseFloat(document.getElementById('plus500Balance')?.value) || 10000;
        const riskPercent = parseFloat(document.getElementById('plus500RiskPercent')?.value) || 1;
        const entry = parseFloat(document.getElementById('plus500EntryPrice')?.value);
        const stopLoss = parseFloat(document.getElementById('plus500StopLoss')?.value);
        const leverage = parseFloat(document.getElementById('plus500Leverage')?.value) || 30;
        
        if (!entry || !stopLoss) {
            this.showNotification('Please enter entry price and stop loss', 'warning');
            return;
        }
        
        const riskAmount = balance * (riskPercent / 100);
        const pipRisk = Math.abs(entry - stopLoss);
        const positionSize = riskAmount / pipRisk;
        const leveragedSize = positionSize * leverage;
        
        document.getElementById('plus500PositionSize').value = 
            `${positionSize.toFixed(2)} units (${leveragedSize.toFixed(2)} with leverage)`;
        
        // Show margin required
        const marginRequired = (positionSize * entry) / leverage;
        this.showNotification(
            `Position size: ${positionSize.toFixed(2)} units\n` +
            `Margin required: $${marginRequired.toFixed(2)}\n` +
            `Risk: $${riskAmount.toFixed(2)}`,
            'info'
        );
    }
    
    dismissSignal(signalId) {
        this.pendingTrades = this.pendingTrades.filter(s => s.id !== signalId);
        this.updateSignalsList();
        this.showNotification('Signal dismissed', 'info');
    }
    
    addTradingSignal(signal) {
        // Add unique ID if not present
        if (!signal.id) {
            signal.id = `plus500_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Add timestamp
        signal.timestamp = signal.timestamp || new Date().toISOString();
        
        // Add to pending trades
        this.pendingTrades.unshift(signal);
        
        // Keep only last 50 signals
        if (this.pendingTrades.length > 50) {
            this.pendingTrades = this.pendingTrades.slice(0, 50);
        }
        
        // Update UI
        this.updateSignalsList();
        
        // Show notification with sound
        this.showNotification(
            `New ${signal.action} signal for ${signal.symbol}`,
            'info',
            {
                sound: true,
                persistent: true
            }
        );
        
        // Send to Discord/Telegram
        this.sendToNotificationChannels(signal);
    }
    
    updateSignalsList() {
        const signalsList = document.getElementById('plus500SignalsList');
        if (signalsList) {
            signalsList.innerHTML = this.renderTradingSignals();
        }
    }
    
    filterSignals(filter) {
        // Filter signals by type
        let filtered = this.pendingTrades;
        
        if (filter !== 'all') {
            filtered = this.pendingTrades.filter(signal => {
                const symbol = signal.symbol.toLowerCase();
                switch(filter) {
                    case 'forex':
                        return symbol.includes('/') && !symbol.includes('btc') && !symbol.includes('eth');
                    case 'crypto':
                        return symbol.includes('btc') || symbol.includes('eth') || symbol.includes('crypto');
                    case 'stocks':
                        return !symbol.includes('/') && !symbol.includes('btc');
                    case 'commodities':
                        return symbol.includes('gold') || symbol.includes('oil') || symbol.includes('silver');
                    case 'indices':
                        return symbol.includes('sp500') || symbol.includes('dax') || symbol.includes('nasdaq');
                    default:
                        return true;
                }
            });
        }
        
        // Temporarily show filtered results
        const originalTrades = this.pendingTrades;
        this.pendingTrades = filtered;
        this.updateSignalsList();
        this.pendingTrades = originalTrades;
    }
    
    refreshSignals() {
        this.updateSignalsList();
        this.showNotification('Signals refreshed', 'success');
    }
    
    validateChecklist() {
        const checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        const executeBtn = document.getElementById('executeOnPlus500');
        if (executeBtn) {
            executeBtn.disabled = !allChecked;
            if (allChecked) {
                executeBtn.classList.add('pulse-animation');
            } else {
                executeBtn.classList.remove('pulse-animation');
            }
        }
    }
    
    executeCheckedTrade() {
        // Open Plus500
        this.openPlus500WebTrader();
        
        // Reset checklist
        document.querySelectorAll('.checklist-item input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        document.getElementById('executeOnPlus500').disabled = true;
        
        this.showNotification('Opening Plus500 WebTrader for manual execution', 'success');
    }
    
    promptAddWatchlist() {
        const symbol = prompt('Enter symbol to add to watchlist (e.g., EUR/USD, AAPL, BTC):');
        if (symbol) {
            this.addToWatchlist(symbol.toUpperCase());
        }
    }
    
    addToWatchlist(symbol) {
        if (!this.watchlist.find(item => item.symbol === symbol)) {
            this.watchlist.push({
                symbol,
                price: 0,
                change: 0
            });
            this.saveWatchlist();
            this.updateWatchlistDisplay();
            this.showNotification(`${symbol} added to watchlist`, 'success');
        }
    }
    
    removeFromWatchlist(symbol) {
        this.watchlist = this.watchlist.filter(item => item.symbol !== symbol);
        this.saveWatchlist();
        this.updateWatchlistDisplay();
    }
    
    updateWatchlistDisplay() {
        const watchlistContainer = document.getElementById('plus500Watchlist');
        if (watchlistContainer) {
            watchlistContainer.innerHTML = this.renderWatchlist();
        }
    }
    
    saveWatchlist() {
        localStorage.setItem('plus500_watchlist', JSON.stringify(this.watchlist));
    }
    
    loadWatchlist() {
        const saved = localStorage.getItem('plus500_watchlist');
        if (saved) {
            this.watchlist = JSON.parse(saved);
            this.updateWatchlistDisplay();
        }
    }
    
    showPlus500Interface() {
        // Hide other broker interfaces
        document.querySelectorAll('.broker-content-container').forEach(container => {
            container.style.display = 'none';
        });
        
        // Show Plus500 interface
        const plus500Container = document.getElementById('plus500TradingContent');
        if (plus500Container) {
            plus500Container.style.display = 'block';
        }
        
        // Update active tab
        document.querySelectorAll('.broker-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector('.broker-tab[data-broker="plus500"]')?.classList.add('active');
    }
    
    async connectToBackend() {
        // Connect to backend for real-time signals
        if (window.websocketManager) {
            window.websocketManager.subscribe('manual_trade_signal', (signal) => {
                if (signal.broker === 'Plus500' || !signal.broker) {
                    this.addTradingSignal(signal);
                }
            });
        }
    }
    
    async sendToNotificationChannels(signal) {
        // Prepare Plus500 specific message
        const plus500Signal = {
            ...signal,
            broker: 'Plus500',
            requires_manual: true,
            plus500_link: `${this.webTraderUrl}?symbol=${signal.symbol}`
        };
        
        // Send to Discord
        if (window.discordIntegration) {
            window.discordIntegration.sendSignal(plus500Signal);
        }
        
        // Send to Telegram
        if (window.telegramIntegration) {
            window.telegramIntegration.sendSignal(plus500Signal);
        }
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-AU', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }
    
    showNotification(message, type = 'info', options = {}) {
        // Use the app's notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
        
        // Play sound if requested
        if (options.sound && window.audioAlerts) {
            window.audioAlerts.playAlert(type === 'success' ? 'success' : 'notification');
        }
        
        // Show browser notification if persistent
        if (options.persistent && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Plus500 Trading Alert', {
                body: message,
                icon: '/assets/logo.png'
            });
        }
    }
    
    showModal(title, content) {
        // Create or use existing modal
        let modal = document.getElementById('plus500Modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'plus500Modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" onclick="this.closest('.modal').style.display='none'">×</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').style.display='none'">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.querySelector('.modal-title').textContent = title;
            modal.querySelector('.modal-body').innerHTML = content;
        }
        
        modal.style.display = 'block';
    }
}

// Initialize Plus500 Integration when document is ready
if (typeof window !== 'undefined') {
    window.plus500Integration = null;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.plus500Integration = new Plus500Integration();
        });
    } else {
        window.plus500Integration = new Plus500Integration();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Plus500Integration;
}
