/**
 * AuraQuant Emergency Stop System
 * Immediate trading halt, position closure, and risk management
 * Enforces 2% maximum drawdown rule
 */

class EmergencyStopSystem {
    constructor() {
        this.isActive = false;
        this.emergencyTriggered = false;
        this.maxDrawdown = 0.02; // 2% max drawdown
        this.currentDrawdown = 0;
        this.peakBalance = 0;
        this.initialBalance = 0;
        this.positions = new Map();
        this.openOrders = new Map();
        this.botStatus = 'running';
        this.riskLevel = 'normal';
        this.emergencyLog = [];
        this.alertSound = new Audio('assets/sounds/emergency.mp3');
        
        // Risk thresholds
        this.thresholds = {
            warning: 0.01,      // 1% drawdown warning
            critical: 0.015,    // 1.5% drawdown critical
            emergency: 0.02     // 2% drawdown emergency stop
        };
        
        // Emergency contacts
        this.emergencyContacts = {
            email: [],
            sms: [],
            discord: [],
            telegram: []
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚨 Emergency Stop System Initializing...');
        
        // Load saved configuration
        this.loadConfiguration();
        
        // Setup monitoring
        this.startMonitoring();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Connect to trading systems
        await this.connectToTradingSystems();
        
        // Initialize balance tracking
        await this.initializeBalanceTracking();
        
        console.log('✅ Emergency Stop System Ready');
        this.isActive = true;
    }
    
    loadConfiguration() {
        const saved = localStorage.getItem('emergencyConfig');
        if (saved) {
            const config = JSON.parse(saved);
            this.maxDrawdown = config.maxDrawdown || 0.02;
            this.thresholds = config.thresholds || this.thresholds;
            this.emergencyContacts = config.contacts || this.emergencyContacts;
        }
    }
    
    saveConfiguration() {
        const config = {
            maxDrawdown: this.maxDrawdown,
            thresholds: this.thresholds,
            contacts: this.emergencyContacts
        };
        localStorage.setItem('emergencyConfig', JSON.stringify(config));
    }
    
    async connectToTradingSystems() {
        // Connect to all active brokers
        const brokers = ['alpaca', 'binance', 'ib', 'nab'];
        
        for (const broker of brokers) {
            try {
                await this.connectToBroker(broker);
            } catch (error) {
                console.error(`Failed to connect to ${broker}:`, error);
            }
        }
    }
    
    async connectToBroker(broker) {
        // Simulate broker connection
        console.log(`Connecting to ${broker}...`);
        
        // In production, this would establish real broker connections
        return new Promise(resolve => {
            setTimeout(() => {
                console.log(`Connected to ${broker}`);
                resolve();
            }, 100);
        });
    }
    
    async initializeBalanceTracking() {
        // Get initial balance from all accounts
        const balance = await this.getTotalBalance();
        this.initialBalance = balance;
        this.peakBalance = balance;
        
        console.log(`Initial balance: $${balance.toLocaleString()}`);
    }
    
    async getTotalBalance() {
        // In production, this would fetch real balances
        // For now, return simulated balance
        return 100000;
    }
    
    startMonitoring() {
        // Monitor positions and balance every second
        this.monitoringInterval = setInterval(() => {
            this.checkRiskLevels();
            this.monitorPositions();
            this.checkDrawdown();
        }, 1000);
        
        // Deep check every 10 seconds
        this.deepCheckInterval = setInterval(() => {
            this.performDeepRiskAnalysis();
        }, 10000);
    }
    
    async checkRiskLevels() {
        const currentBalance = await this.getTotalBalance();
        
        // Update peak balance if current is higher
        if (currentBalance > this.peakBalance) {
            this.peakBalance = currentBalance;
        }
        
        // Calculate current drawdown
        this.currentDrawdown = (this.peakBalance - currentBalance) / this.peakBalance;
        
        // Determine risk level
        if (this.currentDrawdown >= this.thresholds.emergency) {
            this.triggerEmergencyStop('MAX_DRAWDOWN_EXCEEDED');
        } else if (this.currentDrawdown >= this.thresholds.critical) {
            this.setRiskLevel('critical');
            this.sendAlert('CRITICAL', `Drawdown at ${(this.currentDrawdown * 100).toFixed(2)}%`);
        } else if (this.currentDrawdown >= this.thresholds.warning) {
            this.setRiskLevel('warning');
            this.sendAlert('WARNING', `Drawdown at ${(this.currentDrawdown * 100).toFixed(2)}%`);
        } else {
            this.setRiskLevel('normal');
        }
        
        // Update UI
        this.updateRiskDisplay();
    }
    
    setRiskLevel(level) {
        if (this.riskLevel !== level) {
            this.riskLevel = level;
            console.log(`Risk level changed to: ${level}`);
            
            // Emit event for other systems
            document.dispatchEvent(new CustomEvent('riskLevelChanged', {
                detail: { level, drawdown: this.currentDrawdown }
            }));
        }
    }
    
    async monitorPositions() {
        // Get all open positions
        const positions = await this.getAllPositions();
        
        for (const position of positions) {
            // Check individual position risk
            const positionRisk = this.calculatePositionRisk(position);
            
            if (positionRisk > 0.005) { // 0.5% of account
                console.warn(`High risk position: ${position.symbol}`, positionRisk);
                
                // Consider reducing position
                if (this.riskLevel === 'critical') {
                    await this.reducePosition(position, 0.5);
                }
            }
        }
    }
    
    calculatePositionRisk(position) {
        const currentValue = position.quantity * position.currentPrice;
        const entryValue = position.quantity * position.entryPrice;
        const pnl = currentValue - entryValue;
        const riskPercent = Math.abs(pnl) / this.peakBalance;
        
        return riskPercent;
    }
    
    async checkDrawdown() {
        // Additional drawdown checks
        const unrealizedPnL = await this.getUnrealizedPnL();
        const realizedPnL = await this.getRealizedPnL();
        const totalPnL = unrealizedPnL + realizedPnL;
        
        // Check if approaching drawdown limit
        const projectedDrawdown = Math.abs(totalPnL) / this.peakBalance;
        
        if (projectedDrawdown > this.thresholds.warning) {
            this.prepareEmergencyMeasures();
        }
    }
    
    async performDeepRiskAnalysis() {
        console.log('Performing deep risk analysis...');
        
        const analysis = {
            timestamp: new Date(),
            balance: await this.getTotalBalance(),
            drawdown: this.currentDrawdown,
            positions: await this.getAllPositions(),
            openOrders: await this.getAllOpenOrders(),
            riskMetrics: this.calculateRiskMetrics()
        };
        
        // Store analysis
        this.emergencyLog.push(analysis);
        
        // Check for anomalies
        this.detectAnomalies(analysis);
    }
    
    calculateRiskMetrics() {
        return {
            currentDrawdown: this.currentDrawdown,
            maxDrawdown: this.maxDrawdown,
            riskLevel: this.riskLevel,
            positionCount: this.positions.size,
            orderCount: this.openOrders.size,
            exposurePercent: this.calculateTotalExposure()
        };
    }
    
    calculateTotalExposure() {
        let totalExposure = 0;
        
        for (const [id, position] of this.positions) {
            totalExposure += position.quantity * position.currentPrice;
        }
        
        return totalExposure / this.peakBalance;
    }
    
    detectAnomalies(analysis) {
        // Check for unusual patterns
        const anomalies = [];
        
        // Rapid drawdown
        if (this.emergencyLog.length > 1) {
            const prevAnalysis = this.emergencyLog[this.emergencyLog.length - 2];
            const drawdownRate = (analysis.drawdown - prevAnalysis.drawdown) / 10; // per second
            
            if (drawdownRate > 0.001) { // 0.1% per second
                anomalies.push('RAPID_DRAWDOWN');
            }
        }
        
        // Too many positions
        if (analysis.positions.length > 20) {
            anomalies.push('EXCESSIVE_POSITIONS');
        }
        
        // High exposure
        if (analysis.riskMetrics.exposurePercent > 1) {
            anomalies.push('OVER_EXPOSED');
        }
        
        if (anomalies.length > 0) {
            this.handleAnomalies(anomalies);
        }
    }
    
    handleAnomalies(anomalies) {
        console.warn('Anomalies detected:', anomalies);
        
        for (const anomaly of anomalies) {
            switch (anomaly) {
                case 'RAPID_DRAWDOWN':
                    this.pauseTrading();
                    break;
                case 'EXCESSIVE_POSITIONS':
                    this.consolidatePositions();
                    break;
                case 'OVER_EXPOSED':
                    this.reduceExposure();
                    break;
            }
        }
    }
    
    prepareEmergencyMeasures() {
        console.log('Preparing emergency measures...');
        
        // Cancel all pending orders
        this.cancelAllPendingOrders();
        
        // Disable new order placement
        this.disableNewOrders();
        
        // Prepare position closure sequence
        this.prepareClosureSequence();
    }
    
    async triggerEmergencyStop(reason) {
        if (this.emergencyTriggered) {
            console.log('Emergency stop already triggered');
            return;
        }
        
        console.error('🚨🚨🚨 EMERGENCY STOP TRIGGERED 🚨🚨🚨');
        console.error('Reason:', reason);
        
        this.emergencyTriggered = true;
        this.botStatus = 'emergency_stop';
        
        // Play emergency sound
        this.playEmergencySound();
        
        // Log the event
        this.logEmergencyEvent(reason);
        
        // Execute emergency procedures
        await this.executeEmergencyProcedures();
        
        // Notify all channels
        await this.notifyEmergency(reason);
        
        // Update UI
        this.showEmergencyUI();
    }
    
    async executeEmergencyProcedures() {
        const procedures = [
            this.stopAllBots(),
            this.cancelAllOrders(),
            this.closeAllPositions(),
            this.disableTrading(),
            this.saveEmergencyState()
        ];
        
        try {
            await Promise.all(procedures);
            console.log('Emergency procedures completed');
        } catch (error) {
            console.error('Error during emergency procedures:', error);
            // Try individual procedures if batch fails
            for (const procedure of procedures) {
                try {
                    await procedure;
                } catch (err) {
                    console.error('Individual procedure failed:', err);
                }
            }
        }
    }
    
    async stopAllBots() {
        console.log('Stopping all trading bots...');
        
        // Send stop signal to all bots
        document.dispatchEvent(new CustomEvent('emergencyStopBots', {
            detail: { reason: 'emergency_stop' }
        }));
        
        // Update bot status
        this.botStatus = 'stopped';
        
        return new Promise(resolve => {
            setTimeout(resolve, 100);
        });
    }
    
    async cancelAllOrders() {
        console.log('Canceling all open orders...');
        
        const orders = await this.getAllOpenOrders();
        const cancelPromises = [];
        
        for (const order of orders) {
            cancelPromises.push(this.cancelOrder(order.id));
        }
        
        await Promise.all(cancelPromises);
        console.log(`Canceled ${orders.length} orders`);
    }
    
    async closeAllPositions() {
        console.log('Closing all positions...');
        
        const positions = await this.getAllPositions();
        const closePromises = [];
        
        // Sort positions by loss (close losing positions first)
        positions.sort((a, b) => a.pnl - b.pnl);
        
        for (const position of positions) {
            closePromises.push(this.closePosition(position));
        }
        
        await Promise.all(closePromises);
        console.log(`Closed ${positions.length} positions`);
    }
    
    async closePosition(position) {
        console.log(`Closing position: ${position.symbol}`);
        
        try {
            // Market order to close position
            const order = {
                symbol: position.symbol,
                side: position.side === 'long' ? 'sell' : 'buy',
                quantity: position.quantity,
                type: 'market'
            };
            
            await this.placeOrder(order);
            
            // Remove from positions map
            this.positions.delete(position.id);
            
        } catch (error) {
            console.error(`Failed to close position ${position.symbol}:`, error);
            // Add to retry queue
            this.addToRetryQueue(position);
        }
    }
    
    async disableTrading() {
        console.log('Disabling all trading...');
        
        // Set global trading flag
        window.TRADING_ENABLED = false;
        
        // Disable UI elements
        document.querySelectorAll('.trading-button').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
        
        // Update status
        this.updateStatus('TRADING_DISABLED');
    }
    
    async saveEmergencyState() {
        const state = {
            timestamp: new Date().toISOString(),
            reason: this.emergencyReason,
            drawdown: this.currentDrawdown,
            balance: await this.getTotalBalance(),
            positions: Array.from(this.positions.values()),
            orders: Array.from(this.openOrders.values()),
            log: this.emergencyLog
        };
        
        // Save to local storage
        localStorage.setItem('emergencyState', JSON.stringify(state));
        
        // Send to backend
        try {
            await this.sendToBackend('/emergency/save', state);
        } catch (error) {
            console.error('Failed to save emergency state to backend:', error);
        }
    }
    
    async notifyEmergency(reason) {
        const message = `🚨 EMERGENCY STOP TRIGGERED\nReason: ${reason}\nDrawdown: ${(this.currentDrawdown * 100).toFixed(2)}%\nTime: ${new Date().toLocaleString()}`;
        
        // Send to all configured channels
        const notifications = [];
        
        if (this.emergencyContacts.email.length > 0) {
            notifications.push(this.sendEmailAlert(message));
        }
        
        if (this.emergencyContacts.sms.length > 0) {
            notifications.push(this.sendSMSAlert(message));
        }
        
        if (this.emergencyContacts.discord.length > 0) {
            notifications.push(this.sendDiscordAlert(message));
        }
        
        if (this.emergencyContacts.telegram.length > 0) {
            notifications.push(this.sendTelegramAlert(message));
        }
        
        // Browser notification
        this.showBrowserNotification('Emergency Stop', message);
        
        await Promise.all(notifications);
    }
    
    showEmergencyUI() {
        // Create emergency overlay
        const overlay = document.createElement('div');
        overlay.className = 'emergency-overlay';
        overlay.innerHTML = `
            <div class="emergency-modal">
                <div class="emergency-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>EMERGENCY STOP ACTIVATED</h2>
                </div>
                <div class="emergency-content">
                    <p>All trading has been halted due to risk limits being exceeded.</p>
                    <div class="emergency-stats">
                        <div class="stat">
                            <span class="label">Drawdown:</span>
                            <span class="value">${(this.currentDrawdown * 100).toFixed(2)}%</span>
                        </div>
                        <div class="stat">
                            <span class="label">Positions Closed:</span>
                            <span class="value">${this.positions.size}</span>
                        </div>
                        <div class="stat">
                            <span class="label">Orders Canceled:</span>
                            <span class="value">${this.openOrders.size}</span>
                        </div>
                    </div>
                    <div class="emergency-actions">
                        <button id="viewEmergencyLog" class="btn btn-secondary">View Log</button>
                        <button id="contactSupport" class="btn btn-warning">Contact Support</button>
                        <button id="acknowledgeEmergency" class="btn btn-primary">Acknowledge</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add event listeners
        document.getElementById('acknowledgeEmergency').addEventListener('click', () => {
            overlay.remove();
        });
        
        document.getElementById('viewEmergencyLog').addEventListener('click', () => {
            this.showEmergencyLog();
        });
    }
    
    showEmergencyLog() {
        const logModal = document.createElement('div');
        logModal.className = 'log-modal';
        
        const logContent = this.emergencyLog.map(entry => {
            return `
                <div class="log-entry">
                    <div class="log-time">${new Date(entry.timestamp).toLocaleString()}</div>
                    <div class="log-data">
                        <div>Balance: $${entry.balance.toLocaleString()}</div>
                        <div>Drawdown: ${(entry.drawdown * 100).toFixed(2)}%</div>
                        <div>Positions: ${entry.positions.length}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        logModal.innerHTML = `
            <div class="log-modal-content">
                <h3>Emergency Log</h3>
                <div class="log-entries">${logContent}</div>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        
        document.body.appendChild(logModal);
    }
    
    // Manual controls
    
    async manualEmergencyStop() {
        console.log('Manual emergency stop initiated');
        await this.triggerEmergencyStop('MANUAL_TRIGGER');
    }
    
    async pauseTrading() {
        console.log('Pausing trading...');
        this.botStatus = 'paused';
        
        document.dispatchEvent(new CustomEvent('pauseTrading', {
            detail: { reason: 'risk_management' }
        }));
    }
    
    async resumeTrading() {
        if (this.emergencyTriggered) {
            console.error('Cannot resume - emergency stop is active');
            return false;
        }
        
        if (this.currentDrawdown > this.thresholds.warning) {
            console.warn('Cannot resume - drawdown exceeds warning threshold');
            return false;
        }
        
        console.log('Resuming trading...');
        this.botStatus = 'running';
        
        document.dispatchEvent(new CustomEvent('resumeTrading'));
        
        return true;
    }
    
    async reduceRisk() {
        console.log('Reducing risk exposure...');
        
        // Close 50% of positions
        const positions = await this.getAllPositions();
        const toClose = Math.floor(positions.length / 2);
        
        for (let i = 0; i < toClose; i++) {
            await this.closePosition(positions[i]);
        }
        
        // Reduce position sizes for remaining
        for (let i = toClose; i < positions.length; i++) {
            await this.reducePosition(positions[i], 0.5);
        }
    }
    
    async reducePosition(position, percent) {
        const reduceQty = Math.floor(position.quantity * percent);
        
        if (reduceQty > 0) {
            const order = {
                symbol: position.symbol,
                side: position.side === 'long' ? 'sell' : 'buy',
                quantity: reduceQty,
                type: 'market'
            };
            
            await this.placeOrder(order);
            position.quantity -= reduceQty;
        }
    }
    
    // Utility methods
    
    playEmergencySound() {
        try {
            this.alertSound.play();
        } catch (error) {
            console.error('Failed to play emergency sound:', error);
        }
    }
    
    logEmergencyEvent(reason) {
        const event = {
            timestamp: new Date().toISOString(),
            reason: reason,
            drawdown: this.currentDrawdown,
            balance: this.getTotalBalance(),
            positions: this.positions.size,
            orders: this.openOrders.size
        };
        
        this.emergencyLog.push(event);
        console.error('Emergency Event:', event);
    }
    
    updateRiskDisplay() {
        const display = document.getElementById('riskLevelDisplay');
        if (display) {
            display.className = `risk-level ${this.riskLevel}`;
            display.textContent = `Risk: ${this.riskLevel.toUpperCase()}`;
        }
        
        const drawdownDisplay = document.getElementById('drawdownDisplay');
        if (drawdownDisplay) {
            drawdownDisplay.textContent = `Drawdown: ${(this.currentDrawdown * 100).toFixed(2)}%`;
            drawdownDisplay.className = this.currentDrawdown > this.thresholds.warning ? 'warning' : '';
        }
    }
    
    updateStatus(status) {
        this.status = status;
        
        document.dispatchEvent(new CustomEvent('emergencyStatusUpdate', {
            detail: { status }
        }));
    }
    
    // Mock methods for broker integration
    
    async getAllPositions() {
        // In production, fetch from brokers
        return Array.from(this.positions.values());
    }
    
    async getAllOpenOrders() {
        // In production, fetch from brokers
        return Array.from(this.openOrders.values());
    }
    
    async getUnrealizedPnL() {
        // Calculate unrealized P&L
        let totalPnL = 0;
        for (const [id, position] of this.positions) {
            totalPnL += position.unrealizedPnL || 0;
        }
        return totalPnL;
    }
    
    async getRealizedPnL() {
        // In production, fetch from brokers
        return 0;
    }
    
    async cancelOrder(orderId) {
        // In production, send to broker
        this.openOrders.delete(orderId);
        console.log(`Order ${orderId} canceled`);
    }
    
    async placeOrder(order) {
        // In production, send to broker
        console.log('Placing order:', order);
    }
    
    async sendToBackend(endpoint, data) {
        // In production, send to backend
        console.log(`Sending to ${endpoint}:`, data);
    }
    
    async sendEmailAlert(message) {
        console.log('Email alert:', message);
    }
    
    async sendSMSAlert(message) {
        console.log('SMS alert:', message);
    }
    
    async sendDiscordAlert(message) {
        console.log('Discord alert:', message);
    }
    
    async sendTelegramAlert(message) {
        console.log('Telegram alert:', message);
    }
    
    sendAlert(level, message) {
        console.log(`[${level}] ${message}`);
        
        // Show UI notification
        const notification = document.createElement('div');
        notification.className = `alert-notification ${level.toLowerCase()}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 5000);
    }
    
    showBrowserNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: 'assets/icons/emergency.png',
                badge: 'assets/icons/badge.png',
                requireInteraction: true
            });
        }
    }
    
    addToRetryQueue(position) {
        // Add failed operations to retry queue
        if (!this.retryQueue) {
            this.retryQueue = [];
        }
        this.retryQueue.push(position);
    }
    
    consolidatePositions() {
        console.log('Consolidating positions...');
        // Implement position consolidation logic
    }
    
    reduceExposure() {
        console.log('Reducing exposure...');
        // Implement exposure reduction logic
    }
    
    cancelAllPendingOrders() {
        console.log('Canceling pending orders...');
        // Implement order cancellation
    }
    
    disableNewOrders() {
        console.log('Disabling new orders...');
        window.NEW_ORDERS_ENABLED = false;
    }
    
    prepareClosureSequence() {
        console.log('Preparing position closure sequence...');
        // Implement closure sequence preparation
    }
    
    setupEventListeners() {
        // Emergency stop button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'emergencyStopBtn' || e.target.closest('#emergencyStopBtn')) {
                this.manualEmergencyStop();
            }
        });
        
        // Risk reduction button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'reduceRiskBtn' || e.target.closest('#reduceRiskBtn')) {
                this.reduceRisk();
            }
        });
        
        // Pause trading button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'pauseTradingBtn' || e.target.closest('#pauseTradingBtn')) {
                this.pauseTrading();
            }
        });
        
        // Resume trading button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'resumeTradingBtn' || e.target.closest('#resumeTradingBtn')) {
                this.resumeTrading();
            }
        });
        
        // Listen for position updates
        document.addEventListener('positionUpdate', (e) => {
            this.positions.set(e.detail.id, e.detail);
        });
        
        // Listen for order updates
        document.addEventListener('orderUpdate', (e) => {
            this.openOrders.set(e.detail.id, e.detail);
        });
        
        // Listen for balance updates
        document.addEventListener('balanceUpdate', (e) => {
            this.checkRiskLevels();
        });
    }
    
    cleanup() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        if (this.deepCheckInterval) {
            clearInterval(this.deepCheckInterval);
        }
    }
}

// Initialize emergency stop system when document is ready
if (typeof window !== 'undefined') {
    window.emergencyStop = null;
    
    document.addEventListener('DOMContentLoaded', () => {
        window.emergencyStop = new EmergencyStopSystem();
        
        // Expose to global scope for manual control
        window.triggerEmergencyStop = () => {
            window.emergencyStop.manualEmergencyStop();
        };
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmergencyStopSystem;
}