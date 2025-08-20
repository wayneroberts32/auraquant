/**
 * NAB Integration Module
 * Handles NAB login integration and manual trading interface
 */

class NABIntegration {
    constructor() {
        this.nabLoginUrl = 'https://ib.nab.com.au/nabib/index.jsp';
        this.nabTradingUrl = 'https://www.nabtrade.com.au/';
        this.isLoggedIn = false;
        this.sessionData = null;
        this.pendingTrades = [];
        
        this.init();
    }
    
    async init() {
        console.log('Initializing NAB Integration...');
        
        // Check session status
        await this.checkSession();
        
        // Setup UI components
        this.setupNABInterface();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Connect to backend for manual trade signals
        this.connectToBackend();
        
        console.log('NAB Integration initialized');
    }
    
    setupNABInterface() {
        // Add NAB login section to the broker tabs
        const nabContent = `
            <div id="nab-trading-interface" class="broker-content">
                <!-- NAB Login Section -->
                <div class="nab-login-section">
                    <div class="section-header">
                        <h3>NAB Trading Account</h3>
                        <div class="connection-status ${this.isLoggedIn ? 'connected' : 'disconnected'}">
                            <span class="status-dot"></span>
                            <span class="status-text">${this.isLoggedIn ? 'Connected' : 'Not Connected'}</span>
                        </div>
                    </div>
                    
                    <div class="nab-login-container">
                        ${!this.isLoggedIn ? `
                            <div class="login-prompt">
                                <p>Connect to your NAB Trading account to enable manual trading</p>
                                <div class="login-buttons">
                                    <button id="nabLoginBtn" class="btn btn-primary">
                                        <i class="fas fa-sign-in-alt"></i> Login to NAB
                                    </button>
                                    <button id="nabLoginNewWindow" class="btn btn-secondary">
                                        <i class="fas fa-external-link-alt"></i> Open in New Window
                                    </button>
                                </div>
                                <div class="login-help">
                                    <p class="text-muted">Don't have a NAB Trading account?</p>
                                    <a href="https://www.nab.com.au/personal/investments/online-investing" target="_blank" class="btn btn-link">
                                        Setup NAB Trading Account
                                    </a>
                                </div>
                            </div>
                        ` : `
                            <div class="account-info">
                                <div class="info-row">
                                    <span class="label">Account:</span>
                                    <span class="value">${this.sessionData?.accountNumber || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Cash Balance:</span>
                                    <span class="value">$${this.sessionData?.cashBalance || '0.00'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Portfolio Value:</span>
                                    <span class="value">$${this.sessionData?.portfolioValue || '0.00'}</span>
                                </div>
                                <button id="nabLogoutBtn" class="btn btn-danger btn-sm">
                                    <i class="fas fa-sign-out-alt"></i> Disconnect
                                </button>
                            </div>
                        `}
                    </div>
                </div>
                
                <!-- Embedded NAB Frame (Optional) -->
                <div id="nabFrameContainer" class="nab-frame-container" style="display: none;">
                    <div class="frame-header">
                        <h4>NAB Trading Platform</h4>
                        <button id="closeNabFrame" class="btn btn-sm btn-secondary">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                    <iframe id="nabFrame" 
                            src="" 
                            class="trading-iframe"
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                            style="width: 100%; height: 600px; border: none;">
                    </iframe>
                </div>
                
                <!-- Manual Trading Signals -->
                <div class="manual-trading-section">
                    <div class="section-header">
                        <h3>Manual Trading Signals</h3>
                        <div class="signal-count">
                            <span class="badge badge-warning">${this.pendingTrades.length} Pending</span>
                        </div>
                    </div>
                    
                    <div id="nabSignalsList" class="signals-list">
                        ${this.renderTradingSignals()}
                    </div>
                </div>
                
                <!-- Quick Trade Panel -->
                <div class="quick-trade-panel">
                    <h4>Quick Trade Entry</h4>
                    <div class="trade-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Symbol</label>
                                <input type="text" id="nabSymbol" class="form-control" placeholder="e.g., CBA.AX">
                            </div>
                            <div class="form-group">
                                <label>Action</label>
                                <select id="nabAction" class="form-control">
                                    <option value="BUY">Buy</option>
                                    <option value="SELL">Sell</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Quantity</label>
                                <input type="number" id="nabQuantity" class="form-control" placeholder="100">
                            </div>
                            <div class="form-group">
                                <label>Order Type</label>
                                <select id="nabOrderType" class="form-control">
                                    <option value="MARKET">Market</option>
                                    <option value="LIMIT">Limit</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row" id="nabLimitPriceRow" style="display: none;">
                            <div class="form-group">
                                <label>Limit Price</label>
                                <input type="number" id="nabLimitPrice" class="form-control" step="0.01" placeholder="0.00">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button id="nabPreviewTrade" class="btn btn-secondary">
                                <i class="fas fa-eye"></i> Preview
                            </button>
                            <button id="nabExecuteTrade" class="btn btn-primary">
                                <i class="fas fa-bolt"></i> Execute on NAB
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Trade History -->
                <div class="trade-history-section">
                    <h4>Recent Manual Trades</h4>
                    <div id="nabTradeHistory" class="trade-history">
                        <!-- Trade history will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        // Add to the trading screen or create new tab
        const tradingScreen = document.getElementById('tradingScreen');
        if (tradingScreen) {
            // Check if NAB tab exists
            let nabTab = document.getElementById('nabBrokerTab');
            if (!nabTab) {
                // Add NAB tab to broker tabs
                const brokerTabs = document.querySelector('.broker-tabs');
                if (brokerTabs) {
                    const nabTabHtml = `
                        <button class="broker-tab" data-broker="nab" id="nabBrokerTab">
                            <img src="assets/brokers/nab-logo.png" alt="NAB" onerror="this.style.display='none'">
                            <span>NAB</span>
                        </button>
                    `;
                    brokerTabs.insertAdjacentHTML('beforeend', nabTabHtml);
                }
            }
            
            // Add NAB content
            let nabContainer = document.getElementById('nabTradingContent');
            if (!nabContainer) {
                nabContainer = document.createElement('div');
                nabContainer.id = 'nabTradingContent';
                nabContainer.className = 'broker-content-container';
                nabContainer.style.display = 'none';
                tradingScreen.appendChild(nabContainer);
            }
            nabContainer.innerHTML = nabContent;
        }
    }
    
    renderTradingSignals() {
        if (this.pendingTrades.length === 0) {
            return '<div class="no-signals">No pending signals. Signals from TradingView webhooks will appear here.</div>';
        }
        
        return this.pendingTrades.map(signal => `
            <div class="signal-card ${signal.priority}" data-signal-id="${signal.id}">
                <div class="signal-header">
                    <span class="signal-symbol">${signal.symbol}</span>
                    <span class="signal-action ${signal.action.toLowerCase()}">${signal.action}</span>
                    <span class="signal-time">${this.formatTime(signal.timestamp)}</span>
                </div>
                <div class="signal-details">
                    <div class="detail-row">
                        <span>Entry:</span>
                        <span>$${signal.entry || 'Market'}</span>
                    </div>
                    <div class="detail-row">
                        <span>Stop Loss:</span>
                        <span>$${signal.stopLoss || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span>Take Profit:</span>
                        <span>$${signal.takeProfit || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span>Source:</span>
                        <span>${signal.source || 'TradingView'}</span>
                    </div>
                    ${signal.message ? `
                        <div class="signal-message">
                            <i class="fas fa-info-circle"></i> ${signal.message}
                        </div>
                    ` : ''}
                </div>
                <div class="signal-actions">
                    <button class="btn btn-sm btn-success" onclick="nabIntegration.executeSignal('${signal.id}')">
                        <i class="fas fa-check"></i> Execute
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="nabIntegration.modifySignal('${signal.id}')">
                        <i class="fas fa-edit"></i> Modify
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="nabIntegration.dismissSignal('${signal.id}')">
                        <i class="fas fa-times"></i> Dismiss
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    setupEventListeners() {
        // NAB Login button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'nabLoginBtn') {
                this.openNABLogin();
            } else if (e.target.id === 'nabLoginNewWindow') {
                this.openNABLoginNewWindow();
            } else if (e.target.id === 'nabLogoutBtn') {
                this.disconnectNAB();
            } else if (e.target.id === 'closeNabFrame') {
                this.closeNABFrame();
            } else if (e.target.id === 'nabPreviewTrade') {
                this.previewTrade();
            } else if (e.target.id === 'nabExecuteTrade') {
                this.executeTrade();
            } else if (e.target.closest('.broker-tab[data-broker="nab"]')) {
                this.showNABInterface();
            }
        });
        
        // Order type change
        const orderTypeSelect = document.getElementById('nabOrderType');
        if (orderTypeSelect) {
            orderTypeSelect.addEventListener('change', (e) => {
                const limitPriceRow = document.getElementById('nabLimitPriceRow');
                if (limitPriceRow) {
                    limitPriceRow.style.display = e.target.value === 'LIMIT' ? 'block' : 'none';
                }
            });
        }
        
        // Listen for webhook signals
        if (window.websocketManager) {
            window.websocketManager.subscribe('webhook_signal', (data) => {
                if (data.broker === 'NAB' || data.broker === 'MANUAL') {
                    this.addTradingSignal(data);
                }
            });
        }
    }
    
    async openNABLogin() {
        const frameContainer = document.getElementById('nabFrameContainer');
        const frame = document.getElementById('nabFrame');
        
        if (frameContainer && frame) {
            // Note: NAB may block iframe embedding, so we'll try but have fallback
            frame.src = this.nabLoginUrl;
            frameContainer.style.display = 'block';
            
            // Listen for potential login success (if NAB allows postMessage)
            window.addEventListener('message', this.handleNABMessage.bind(this));
            
            // Show warning if iframe doesn't load
            setTimeout(() => {
                if (!frame.contentWindow || frame.contentDocument?.body?.innerHTML === '') {
                    this.showNotification('NAB requires login in a new window for security', 'warning');
                    this.openNABLoginNewWindow();
                }
            }, 3000);
        }
    }
    
    openNABLoginNewWindow() {
        // Open NAB in new window
        const nabWindow = window.open(
            this.nabLoginUrl,
            'NAB_Login',
            'width=1200,height=800,menubar=no,toolbar=no,location=yes,status=yes'
        );
        
        if (nabWindow) {
            // Poll to check if window is closed
            const checkInterval = setInterval(() => {
                if (nabWindow.closed) {
                    clearInterval(checkInterval);
                    // Check if login was successful
                    this.checkSession();
                }
            }, 1000);
            
            this.showNotification('NAB login window opened. Complete login and return here.', 'info');
        } else {
            this.showNotification('Please allow popups to login to NAB', 'error');
        }
    }
    
    closeNABFrame() {
        const frameContainer = document.getElementById('nabFrameContainer');
        if (frameContainer) {
            frameContainer.style.display = 'none';
            const frame = document.getElementById('nabFrame');
            if (frame) {
                frame.src = '';
            }
        }
    }
    
    handleNABMessage(event) {
        // Handle potential messages from NAB iframe (if allowed)
        if (event.origin.includes('nab.com.au')) {
            if (event.data.type === 'login_success') {
                this.onLoginSuccess(event.data);
            }
        }
    }
    
    async checkSession() {
        try {
            // Check with backend if NAB session is valid
            const response = await fetch('/api/brokers/nab/session', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.connected) {
                    this.isLoggedIn = true;
                    this.sessionData = data.session;
                    this.updateUIStatus();
                }
            }
        } catch (error) {
            console.error('Error checking NAB session:', error);
        }
    }
    
    onLoginSuccess(data) {
        this.isLoggedIn = true;
        this.sessionData = data;
        this.updateUIStatus();
        this.closeNABFrame();
        this.showNotification('Successfully connected to NAB Trading', 'success');
        
        // Notify backend
        this.notifyBackendLogin();
    }
    
    async notifyBackendLogin() {
        try {
            await fetch('/api/brokers/nab/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    connected: true,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Error notifying backend of NAB login:', error);
        }
    }
    
    disconnectNAB() {
        this.isLoggedIn = false;
        this.sessionData = null;
        this.updateUIStatus();
        this.showNotification('Disconnected from NAB Trading', 'info');
    }
    
    updateUIStatus() {
        const statusElement = document.querySelector('.nab-login-section .connection-status');
        if (statusElement) {
            statusElement.className = `connection-status ${this.isLoggedIn ? 'connected' : 'disconnected'}`;
            statusElement.querySelector('.status-text').textContent = this.isLoggedIn ? 'Connected' : 'Not Connected';
        }
        
        // Re-render the interface
        this.setupNABInterface();
    }
    
    showNABInterface() {
        // Hide other broker interfaces
        document.querySelectorAll('.broker-content-container').forEach(container => {
            container.style.display = 'none';
        });
        
        // Show NAB interface
        const nabContainer = document.getElementById('nabTradingContent');
        if (nabContainer) {
            nabContainer.style.display = 'block';
        }
        
        // Update active tab
        document.querySelectorAll('.broker-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector('.broker-tab[data-broker="nab"]')?.classList.add('active');
    }
    
    async connectToBackend() {
        // Connect to backend for real-time signals
        if (window.websocketManager) {
            window.websocketManager.subscribe('manual_trade_signal', (signal) => {
                this.addTradingSignal(signal);
            });
        }
    }
    
    addTradingSignal(signal) {
        // Add unique ID if not present
        if (!signal.id) {
            signal.id = `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        
        // Show notification
        this.showNotification(
            `New ${signal.action} signal for ${signal.symbol}`,
            'info',
            {
                sound: true,
                persistent: true
            }
        );
        
        // Send to Discord/Telegram if configured
        this.sendToNotificationChannels(signal);
    }
    
    updateSignalsList() {
        const signalsList = document.getElementById('nabSignalsList');
        if (signalsList) {
            signalsList.innerHTML = this.renderTradingSignals();
        }
        
        // Update signal count
        const countBadge = document.querySelector('.manual-trading-section .badge');
        if (countBadge) {
            countBadge.textContent = `${this.pendingTrades.length} Pending`;
        }
    }
    
    async executeSignal(signalId) {
        const signal = this.pendingTrades.find(s => s.id === signalId);
        if (!signal) return;
        
        if (!this.isLoggedIn) {
            this.showNotification('Please login to NAB first', 'warning');
            this.openNABLoginNewWindow();
            return;
        }
        
        // Open NAB trading with pre-filled order
        const orderUrl = `${this.nabTradingUrl}?action=${signal.action}&symbol=${signal.symbol}&qty=${signal.quantity || 100}`;
        window.open(orderUrl, 'NAB_Trade', 'width=1200,height=800');
        
        // Mark signal as executed
        signal.status = 'executed';
        signal.executedAt = new Date().toISOString();
        
        // Remove from pending
        this.pendingTrades = this.pendingTrades.filter(s => s.id !== signalId);
        this.updateSignalsList();
        
        // Log execution
        await this.logTradeExecution(signal);
        
        this.showNotification(`Signal executed for ${signal.symbol}`, 'success');
    }
    
    modifySignal(signalId) {
        const signal = this.pendingTrades.find(s => s.id === signalId);
        if (!signal) return;
        
        // Pre-fill the quick trade form
        document.getElementById('nabSymbol').value = signal.symbol;
        document.getElementById('nabAction').value = signal.action;
        document.getElementById('nabQuantity').value = signal.quantity || 100;
        
        if (signal.orderType) {
            document.getElementById('nabOrderType').value = signal.orderType;
        }
        
        if (signal.entry && signal.orderType === 'LIMIT') {
            document.getElementById('nabLimitPrice').value = signal.entry;
            document.getElementById('nabLimitPriceRow').style.display = 'block';
        }
        
        // Scroll to quick trade panel
        document.querySelector('.quick-trade-panel')?.scrollIntoView({ behavior: 'smooth' });
    }
    
    dismissSignal(signalId) {
        this.pendingTrades = this.pendingTrades.filter(s => s.id !== signalId);
        this.updateSignalsList();
        this.showNotification('Signal dismissed', 'info');
    }
    
    async previewTrade() {
        const trade = this.getTradeFormData();
        if (!trade) return;
        
        // Show preview modal
        const previewHtml = `
            <div class="trade-preview">
                <h4>Trade Preview</h4>
                <div class="preview-details">
                    <div class="detail-row">
                        <span>Symbol:</span>
                        <span>${trade.symbol}</span>
                    </div>
                    <div class="detail-row">
                        <span>Action:</span>
                        <span class="${trade.action.toLowerCase()}">${trade.action}</span>
                    </div>
                    <div class="detail-row">
                        <span>Quantity:</span>
                        <span>${trade.quantity}</span>
                    </div>
                    <div class="detail-row">
                        <span>Order Type:</span>
                        <span>${trade.orderType}</span>
                    </div>
                    ${trade.limitPrice ? `
                        <div class="detail-row">
                            <span>Limit Price:</span>
                            <span>$${trade.limitPrice}</span>
                        </div>
                    ` : ''}
                    <div class="detail-row estimated-cost">
                        <span>Estimated Cost:</span>
                        <span>$${(trade.quantity * (trade.limitPrice || 0)).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal('Trade Preview', previewHtml);
    }
    
    async executeTrade() {
        const trade = this.getTradeFormData();
        if (!trade) return;
        
        if (!this.isLoggedIn) {
            this.showNotification('Please login to NAB first', 'warning');
            this.openNABLoginNewWindow();
            return;
        }
        
        // Create signal from manual trade
        const signal = {
            ...trade,
            id: `manual_${Date.now()}`,
            source: 'Manual Entry',
            timestamp: new Date().toISOString()
        };
        
        // Execute the signal
        await this.executeSignal(signal.id);
    }
    
    getTradeFormData() {
        const symbol = document.getElementById('nabSymbol')?.value;
        const action = document.getElementById('nabAction')?.value;
        const quantity = parseInt(document.getElementById('nabQuantity')?.value);
        const orderType = document.getElementById('nabOrderType')?.value;
        const limitPrice = parseFloat(document.getElementById('nabLimitPrice')?.value);
        
        if (!symbol || !quantity) {
            this.showNotification('Please fill in required fields', 'warning');
            return null;
        }
        
        return {
            symbol,
            action,
            quantity,
            orderType,
            limitPrice: orderType === 'LIMIT' ? limitPrice : null
        };
    }
    
    async logTradeExecution(signal) {
        try {
            await fetch('/api/trades/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    broker: 'NAB',
                    signal,
                    executedAt: signal.executedAt,
                    status: 'executed'
                })
            });
        } catch (error) {
            console.error('Error logging trade execution:', error);
        }
    }
    
    async sendToNotificationChannels(signal) {
        // Send to Discord
        if (window.discordIntegration) {
            window.discordIntegration.sendSignal(signal);
        }
        
        // Send to Telegram
        if (window.telegramIntegration) {
            window.telegramIntegration.sendSignal(signal);
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
            new Notification('AuraQuant Trading Alert', {
                body: message,
                icon: '/assets/logo.png'
            });
        }
    }
    
    showModal(title, content) {
        // Create or use existing modal
        let modal = document.getElementById('nabModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'nabModal';
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

// Initialize NAB Integration when document is ready
if (typeof window !== 'undefined') {
    window.nabIntegration = null;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.nabIntegration = new NABIntegration();
        });
    } else {
        window.nabIntegration = new NABIntegration();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NABIntegration;
}
