/**
 * AuraQuant Infinity - Performance Monitoring Dashboard
 * Real-time tracking of profits, drawdowns, and automatic mode switching
 */

window.PerformanceDashboard = class {
    constructor() {
        this.initialized = false;
        
        // Performance metrics
        this.metrics = {
            currentCapital: 500,
            initialCapital: 500,
            totalProfit: 0,
            totalLoss: 0,
            winRate: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            currentDrawdown: 0,
            dailyProfit: 0,
            weeklyProfit: 0,
            monthlyProfit: 0,
            roi: 0,
            trades: [],
            positions: []
        };
        
        // Growth targets
        this.targets = {
            week1: 4000,
            month1: 10000,
            year2025: 1000000,      // $1M
            year2026: 1000000000,   // $1B
            year2027: 1000000000000, // $1T
            year2028: Infinity       // ∞
        };
        
        // Trading modes
        this.modes = {
            current: 'paper',
            paperDaysProfit: 0,
            paperConsecutiveDays: 0,
            realMoneyAmount: 50,
            scalingLevel: 1
        };
        
        // Performance thresholds
        this.thresholds = {
            paperTradingDays: 3,
            paperDailyTarget: 1000,
            paperWinRate: 0.70,
            maxDrawdownLimit: 2, // 2% max
            emergencyStopDrawdown: 5, // 5% emergency
            scalingProfitTarget: 100 // 100% profit to scale
        };
        
        // Charts
        this.charts = {};
        
        // Update intervals
        this.updateInterval = null;
        this.chartInterval = null;
    }
    
    async initialize() {
        console.log('📊 Initializing Performance Dashboard...');
        
        // Create dashboard elements
        this.createDashboard();
        
        // Initialize charts
        this.initializeCharts();
        
        // Start real-time monitoring
        this.startMonitoring();
        
        // Connect to WebSocket for live updates
        this.connectWebSocket();
        
        this.initialized = true;
        console.log('✅ Performance Dashboard ready');
    }
    
    createDashboard() {
        // Find or create dashboard container
        let container = document.getElementById('performanceDashboard');
        if (!container) {
            container = document.createElement('div');
            container.id = 'performanceDashboard';
            container.className = 'performance-dashboard';
            document.body.appendChild(container);
        }
        
        container.innerHTML = `
            <div class="dashboard-header">
                <h2>🚀 Performance Monitor - Target: ∞</h2>
                <div class="mode-indicator">
                    <span class="mode-label">Mode:</span>
                    <span class="mode-value" id="currentMode">PAPER</span>
                    <span class="mode-progress" id="modeProgress"></span>
                </div>
            </div>
            
            <div class="metrics-grid">
                <!-- Capital & P&L -->
                <div class="metric-card capital-card">
                    <h3>💰 Capital</h3>
                    <div class="metric-value" id="currentCapital">$500</div>
                    <div class="metric-change" id="capitalChange">+0%</div>
                    <div class="progress-to-target">
                        <div class="target-label">Next Target:</div>
                        <div class="target-value" id="nextTarget">$4,000</div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="targetProgress"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Win Rate -->
                <div class="metric-card winrate-card">
                    <h3>🎯 Win Rate</h3>
                    <div class="metric-value" id="winRate">0%</div>
                    <div class="trades-count">
                        <span class="wins" id="winCount">0W</span>
                        <span class="losses" id="lossCount">0L</span>
                    </div>
                    <div class="profit-factor">
                        <span>Profit Factor:</span>
                        <span id="profitFactor">0.00</span>
                    </div>
                </div>
                
                <!-- Daily Performance -->
                <div class="metric-card daily-card">
                    <h3>📅 Today's Performance</h3>
                    <div class="metric-value" id="dailyProfit">$0</div>
                    <div class="metric-change" id="dailyChange">0%</div>
                    <div class="daily-target">
                        <span>Target: $1,000</span>
                        <div class="progress-bar mini">
                            <div class="progress-fill" id="dailyProgress"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Risk Metrics -->
                <div class="metric-card risk-card">
                    <h3>⚠️ Risk Status</h3>
                    <div class="drawdown-current">
                        <span>Drawdown:</span>
                        <span class="drawdown-value" id="currentDrawdown">0%</span>
                    </div>
                    <div class="drawdown-max">
                        <span>Max DD:</span>
                        <span class="drawdown-value" id="maxDrawdown">0%</span>
                    </div>
                    <div class="risk-indicator" id="riskStatus">
                        <span class="risk-level safe">SAFE</span>
                    </div>
                </div>
            </div>
            
            <!-- Charts Section -->
            <div class="charts-section">
                <div class="chart-container">
                    <h3>📈 Equity Curve</h3>
                    <canvas id="equityChart"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>📊 Daily Returns</h3>
                    <canvas id="returnsChart"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>🎯 Win/Loss Distribution</h3>
                    <canvas id="winLossChart"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>🚀 Growth Progress</h3>
                    <canvas id="growthChart"></canvas>
                </div>
            </div>
            
            <!-- Mode Transition Panel -->
            <div class="mode-transition-panel" id="modeTransition">
                <h3>🔄 Mode Transition Status</h3>
                <div class="transition-requirements">
                    <div class="requirement" id="reqDays">
                        <span class="req-icon">📅</span>
                        <span class="req-text">3 Consecutive Days: </span>
                        <span class="req-status" id="daysStatus">0/3</span>
                    </div>
                    <div class="requirement" id="reqProfit">
                        <span class="req-icon">💰</span>
                        <span class="req-text">Daily $1000+: </span>
                        <span class="req-status" id="profitStatus">❌</span>
                    </div>
                    <div class="requirement" id="reqWinRate">
                        <span class="req-icon">🎯</span>
                        <span class="req-text">70% Win Rate: </span>
                        <span class="req-status" id="winRateStatus">❌</span>
                    </div>
                </div>
                <button class="transition-btn" id="transitionBtn" disabled>
                    Not Ready for Real Money
                </button>
            </div>
            
            <!-- Active Positions -->
            <div class="positions-panel">
                <h3>📊 Active Positions</h3>
                <div class="positions-list" id="positionsList">
                    <div class="no-positions">No active positions</div>
                </div>
            </div>
            
            <!-- Trade History -->
            <div class="trade-history-panel">
                <h3>📜 Recent Trades</h3>
                <div class="trades-list" id="tradesList">
                    <div class="no-trades">No trades yet</div>
                </div>
            </div>
            
            <!-- Alerts Panel -->
            <div class="alerts-panel" id="alertsPanel">
                <h3>🔔 System Alerts</h3>
                <div class="alerts-list" id="alertsList"></div>
            </div>
        `;
        
        // Add styles
        this.injectStyles();
    }
    
    injectStyles() {
        const styleId = 'performance-dashboard-styles';
        if (document.getElementById(styleId)) return;
        
        const styles = document.createElement('style');
        styles.id = styleId;
        styles.innerHTML = `
            .performance-dashboard {
                position: fixed;
                top: 60px;
                right: 20px;
                width: 400px;
                max-height: calc(100vh - 80px);
                background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
                border: 1px solid #00d4ff;
                border-radius: 15px;
                padding: 20px;
                overflow-y: auto;
                z-index: 10000;
                box-shadow: 0 10px 40px rgba(0, 212, 255, 0.2);
                font-family: 'Orbitron', monospace;
            }
            
            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #00d4ff;
            }
            
            .dashboard-header h2 {
                margin: 0;
                font-size: 20px;
                background: linear-gradient(45deg, #00d4ff, #00ff88);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            
            .mode-indicator {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 15px;
                background: rgba(0, 212, 255, 0.1);
                border: 1px solid #00d4ff;
                border-radius: 20px;
            }
            
            .mode-value {
                font-weight: bold;
                color: #00ff88;
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .metric-card {
                background: rgba(0, 212, 255, 0.05);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 10px;
                padding: 15px;
            }
            
            .metric-card h3 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #00d4ff;
            }
            
            .metric-value {
                font-size: 24px;
                font-weight: bold;
                color: #fff;
                margin-bottom: 5px;
            }
            
            .metric-change {
                font-size: 14px;
                color: #00ff88;
            }
            
            .metric-change.negative {
                color: #ff3366;
            }
            
            .progress-bar {
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
                margin-top: 5px;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #00d4ff, #00ff88);
                border-radius: 3px;
                transition: width 0.3s ease;
            }
            
            .charts-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .chart-container {
                background: rgba(0, 212, 255, 0.05);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 10px;
                padding: 15px;
            }
            
            .chart-container h3 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #00d4ff;
            }
            
            .chart-container canvas {
                width: 100% !important;
                height: 150px !important;
            }
            
            .mode-transition-panel {
                background: rgba(255, 215, 0, 0.05);
                border: 1px solid rgba(255, 215, 0, 0.3);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
            }
            
            .transition-requirements {
                margin: 15px 0;
            }
            
            .requirement {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
                padding: 8px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 5px;
            }
            
            .req-icon {
                font-size: 20px;
            }
            
            .req-status {
                margin-left: auto;
                font-weight: bold;
            }
            
            .transition-btn {
                width: 100%;
                padding: 12px;
                background: linear-gradient(45deg, #666, #888);
                color: #fff;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: bold;
                cursor: not-allowed;
                transition: all 0.3s ease;
            }
            
            .transition-btn.ready {
                background: linear-gradient(45deg, #00d4ff, #00ff88);
                cursor: pointer;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            .positions-panel, .trade-history-panel {
                background: rgba(0, 212, 255, 0.05);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
            }
            
            .positions-list, .trades-list {
                max-height: 200px;
                overflow-y: auto;
            }
            
            .position-item, .trade-item {
                padding: 10px;
                margin-bottom: 8px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 5px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .position-profit {
                color: #00ff88;
                font-weight: bold;
            }
            
            .position-loss {
                color: #ff3366;
                font-weight: bold;
            }
            
            .alerts-panel {
                background: rgba(255, 51, 102, 0.05);
                border: 1px solid rgba(255, 51, 102, 0.3);
                border-radius: 10px;
                padding: 15px;
            }
            
            .alert-item {
                padding: 10px;
                margin-bottom: 8px;
                background: rgba(0, 0, 0, 0.3);
                border-left: 3px solid #ff3366;
                border-radius: 5px;
                animation: slideIn 0.3s ease;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(20px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .risk-indicator {
                margin-top: 10px;
                text-align: center;
            }
            
            .risk-level {
                padding: 5px 15px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 12px;
            }
            
            .risk-level.safe {
                background: rgba(0, 255, 136, 0.2);
                color: #00ff88;
                border: 1px solid #00ff88;
            }
            
            .risk-level.warning {
                background: rgba(255, 215, 0, 0.2);
                color: #ffd700;
                border: 1px solid #ffd700;
            }
            
            .risk-level.danger {
                background: rgba(255, 51, 102, 0.2);
                color: #ff3366;
                border: 1px solid #ff3366;
            }
            
            .dashboard-minimized {
                width: 80px;
                height: 80px;
                overflow: hidden;
            }
            
            .dashboard-minimized .dashboard-header h2 {
                font-size: 12px;
            }
            
            .dashboard-minimized > *:not(.dashboard-header) {
                display: none;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    initializeCharts() {
        // Initialize Chart.js charts
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 212, 255, 0.1)'
                    },
                    ticks: {
                        color: '#00d4ff'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 212, 255, 0.1)'
                    },
                    ticks: {
                        color: '#00d4ff'
                    }
                }
            }
        };
        
        // Equity Curve Chart
        const equityCtx = document.getElementById('equityChart');
        if (equityCtx) {
            this.charts.equity = new Chart(equityCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        borderColor: '#00ff88',
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        tension: 0.4
                    }]
                },
                options: chartOptions
            });
        }
        
        // Daily Returns Chart
        const returnsCtx = document.getElementById('returnsChart');
        if (returnsCtx) {
            this.charts.returns = new Chart(returnsCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: []
                    }]
                },
                options: chartOptions
            });
        }
        
        // Win/Loss Chart
        const winLossCtx = document.getElementById('winLossChart');
        if (winLossCtx) {
            this.charts.winLoss = new Chart(winLossCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Wins', 'Losses'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: ['#00ff88', '#ff3366']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        // Growth Progress Chart
        const growthCtx = document.getElementById('growthChart');
        if (growthCtx) {
            this.charts.growth = new Chart(growthCtx, {
                type: 'line',
                data: {
                    labels: ['Start', 'Week 1', 'Month 1', '2025', '2026', '2027', '2028'],
                    datasets: [{
                        label: 'Target',
                        data: [500, 4000, 10000, 1000000, 1000000000, 1000000000000, 1000000000000000],
                        borderColor: '#ffd700',
                        borderDash: [5, 5]
                    }, {
                        label: 'Actual',
                        data: [500],
                        borderColor: '#00ff88',
                        backgroundColor: 'rgba(0, 255, 136, 0.1)'
                    }]
                },
                options: {
                    ...chartOptions,
                    scales: {
                        ...chartOptions.scales,
                        y: {
                            ...chartOptions.scales.y,
                            type: 'logarithmic'
                        }
                    }
                }
            });
        }
    }
    
    startMonitoring() {
        // Update metrics every second
        this.updateInterval = setInterval(() => {
            this.updateMetrics();
            this.checkModeTransition();
            this.checkRiskLevels();
        }, 1000);
        
        // Update charts every 5 seconds
        this.chartInterval = setInterval(() => {
            this.updateCharts();
        }, 5000);
    }
    
    async updateMetrics() {
        try {
            // Fetch latest metrics from backend
            const response = await fetch(`${window.Config.API_BASE_URL}/performance/metrics`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.metrics = { ...this.metrics, ...data };
                this.renderMetrics();
            }
        } catch (error) {
            console.error('Failed to update metrics:', error);
        }
    }
    
    renderMetrics() {
        // Update capital
        const capitalEl = document.getElementById('currentCapital');
        if (capitalEl) {
            capitalEl.textContent = `$${this.formatNumber(this.metrics.currentCapital)}`;
        }
        
        // Update capital change
        const changeEl = document.getElementById('capitalChange');
        if (changeEl) {
            const change = ((this.metrics.currentCapital - this.metrics.initialCapital) / 
                           this.metrics.initialCapital * 100).toFixed(2);
            changeEl.textContent = `${change >= 0 ? '+' : ''}${change}%`;
            changeEl.className = change >= 0 ? 'metric-change' : 'metric-change negative';
        }
        
        // Update target progress
        this.updateTargetProgress();
        
        // Update win rate
        const winRateEl = document.getElementById('winRate');
        if (winRateEl) {
            winRateEl.textContent = `${(this.metrics.winRate * 100).toFixed(1)}%`;
        }
        
        // Update trade counts
        const wins = this.metrics.trades.filter(t => t.profit > 0).length;
        const losses = this.metrics.trades.filter(t => t.profit <= 0).length;
        
        document.getElementById('winCount').textContent = `${wins}W`;
        document.getElementById('lossCount').textContent = `${losses}L`;
        
        // Update profit factor
        document.getElementById('profitFactor').textContent = this.metrics.profitFactor.toFixed(2);
        
        // Update daily profit
        document.getElementById('dailyProfit').textContent = `$${this.formatNumber(this.metrics.dailyProfit)}`;
        document.getElementById('dailyChange').textContent = 
            `${this.metrics.dailyProfit >= 0 ? '+' : ''}${(this.metrics.dailyProfit / this.metrics.initialCapital * 100).toFixed(2)}%`;
        
        // Update daily progress
        const dailyProgress = (this.metrics.dailyProfit / 1000 * 100);
        document.getElementById('dailyProgress').style.width = `${Math.min(dailyProgress, 100)}%`;
        
        // Update drawdown
        document.getElementById('currentDrawdown').textContent = `${this.metrics.currentDrawdown.toFixed(2)}%`;
        document.getElementById('maxDrawdown').textContent = `${this.metrics.maxDrawdown.toFixed(2)}%`;
        
        // Update positions
        this.updatePositions();
        
        // Update trades
        this.updateTrades();
    }
    
    updateTargetProgress() {
        // Determine current target
        let nextTarget = this.targets.week1;
        let targetLabel = 'Week 1 Target';
        
        if (this.metrics.currentCapital >= this.targets.week1) {
            nextTarget = this.targets.month1;
            targetLabel = 'Month 1 Target';
        }
        if (this.metrics.currentCapital >= this.targets.month1) {
            nextTarget = this.targets.year2025;
            targetLabel = '2025 Target';
        }
        if (this.metrics.currentCapital >= this.targets.year2025) {
            nextTarget = this.targets.year2026;
            targetLabel = '2026 Target';
        }
        
        document.getElementById('nextTarget').textContent = `$${this.formatNumber(nextTarget)}`;
        
        const progress = (this.metrics.currentCapital / nextTarget * 100);
        document.getElementById('targetProgress').style.width = `${Math.min(progress, 100)}%`;
    }
    
    checkModeTransition() {
        if (this.modes.current === 'paper') {
            // Check paper trading requirements
            const daysMet = this.modes.paperConsecutiveDays >= this.thresholds.paperTradingDays;
            const profitMet = this.metrics.dailyProfit >= this.thresholds.paperDailyTarget;
            const winRateMet = this.metrics.winRate >= this.thresholds.paperWinRate;
            
            // Update UI
            document.getElementById('daysStatus').textContent = 
                `${this.modes.paperConsecutiveDays}/${this.thresholds.paperTradingDays}`;
            document.getElementById('profitStatus').textContent = profitMet ? '✅' : '❌';
            document.getElementById('winRateStatus').textContent = winRateMet ? '✅' : '❌';
            
            // Check if ready for transition
            if (daysMet && winRateMet) {
                const btn = document.getElementById('transitionBtn');
                btn.textContent = '🚀 Switch to Real Money ($50)';
                btn.disabled = false;
                btn.className = 'transition-btn ready';
                
                // Auto-switch if criteria met
                if (this.modes.paperConsecutiveDays === this.thresholds.paperTradingDays) {
                    this.transitionToRealMoney();
                }
            }
        } else if (this.modes.current === 'small_real') {
            // Check for scaling
            const profitPercent = ((this.metrics.currentCapital - this.modes.realMoneyAmount) / 
                                  this.modes.realMoneyAmount * 100);
            
            if (profitPercent >= this.thresholds.scalingProfitTarget) {
                this.scaleUp();
            }
        }
    }
    
    async transitionToRealMoney() {
        console.log('🔄 Transitioning to real money trading...');
        
        try {
            const response = await fetch(`${window.Config.API_BASE_URL}/trading/mode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    mode: 'small_real',
                    amount: this.modes.realMoneyAmount
                })
            });
            
            if (response.ok) {
                this.modes.current = 'small_real';
                document.getElementById('currentMode').textContent = 'REAL ($50)';
                this.showAlert('🎉 Switched to Real Money Trading! Starting with $50', 'success');
            }
        } catch (error) {
            console.error('Failed to transition:', error);
            this.showAlert('❌ Failed to switch modes', 'error');
        }
    }
    
    async scaleUp() {
        const newAmount = this.modes.realMoneyAmount * 2;
        console.log(`📈 Scaling up to $${newAmount}`);
        
        this.modes.realMoneyAmount = newAmount;
        this.modes.scalingLevel++;
        
        document.getElementById('currentMode').textContent = `REAL ($${newAmount})`;
        this.showAlert(`🚀 Scaled up! Now trading with $${newAmount}`, 'success');
    }
    
    checkRiskLevels() {
        const riskStatus = document.getElementById('riskStatus');
        const riskLevel = riskStatus.querySelector('.risk-level');
        
        if (this.metrics.currentDrawdown >= this.thresholds.emergencyStopDrawdown) {
            // Emergency stop
            riskLevel.textContent = 'EMERGENCY STOP';
            riskLevel.className = 'risk-level danger';
            this.triggerEmergencyStop();
        } else if (this.metrics.currentDrawdown >= this.thresholds.maxDrawdownLimit) {
            // Warning
            riskLevel.textContent = 'WARNING';
            riskLevel.className = 'risk-level warning';
            this.showAlert('⚠️ Approaching max drawdown limit', 'warning');
        } else {
            // Safe
            riskLevel.textContent = 'SAFE';
            riskLevel.className = 'risk-level safe';
        }
    }
    
    async triggerEmergencyStop() {
        console.error('🚨 EMERGENCY STOP TRIGGERED!');
        
        try {
            const response = await fetch(`${window.Config.API_BASE_URL}/trading/emergency-stop`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                this.showAlert('🚨 EMERGENCY STOP ACTIVATED - All positions closed', 'critical');
                this.modes.current = 'paper';
                document.getElementById('currentMode').textContent = 'PAPER (STOPPED)';
            }
        } catch (error) {
            console.error('Emergency stop failed:', error);
        }
    }
    
    updateCharts() {
        // Update equity curve
        if (this.charts.equity) {
            const labels = this.metrics.trades.map((t, i) => i + 1);
            const data = this.calculateEquityCurve();
            
            this.charts.equity.data.labels = labels;
            this.charts.equity.data.datasets[0].data = data;
            this.charts.equity.update();
        }
        
        // Update returns chart
        if (this.charts.returns) {
            const returns = this.calculateDailyReturns();
            const colors = returns.map(r => r >= 0 ? '#00ff88' : '#ff3366');
            
            this.charts.returns.data.labels = returns.map((r, i) => `Day ${i + 1}`);
            this.charts.returns.data.datasets[0].data = returns;
            this.charts.returns.data.datasets[0].backgroundColor = colors;
            this.charts.returns.update();
        }
        
        // Update win/loss chart
        if (this.charts.winLoss) {
            const wins = this.metrics.trades.filter(t => t.profit > 0).length;
            const losses = this.metrics.trades.filter(t => t.profit <= 0).length;
            
            this.charts.winLoss.data.datasets[0].data = [wins, losses];
            this.charts.winLoss.update();
        }
        
        // Update growth chart
        if (this.charts.growth) {
            this.charts.growth.data.datasets[1].data.push(this.metrics.currentCapital);
            this.charts.growth.update();
        }
    }
    
    calculateEquityCurve() {
        let equity = this.metrics.initialCapital;
        const curve = [equity];
        
        for (const trade of this.metrics.trades) {
            equity += trade.profit || 0;
            curve.push(equity);
        }
        
        return curve;
    }
    
    calculateDailyReturns() {
        // Group trades by day
        const dailyProfits = {};
        
        for (const trade of this.metrics.trades) {
            const day = new Date(trade.timestamp).toDateString();
            if (!dailyProfits[day]) {
                dailyProfits[day] = 0;
            }
            dailyProfits[day] += trade.profit || 0;
        }
        
        return Object.values(dailyProfits);
    }
    
    updatePositions() {
        const container = document.getElementById('positionsList');
        
        if (this.metrics.positions.length === 0) {
            container.innerHTML = '<div class="no-positions">No active positions</div>';
            return;
        }
        
        container.innerHTML = this.metrics.positions.map(pos => `
            <div class="position-item">
                <div>
                    <strong>${pos.symbol}</strong>
                    <span>${pos.action}</span>
                </div>
                <div class="${pos.profit >= 0 ? 'position-profit' : 'position-loss'}">
                    ${pos.profit >= 0 ? '+' : ''}$${Math.abs(pos.profit).toFixed(2)}
                </div>
            </div>
        `).join('');
    }
    
    updateTrades() {
        const container = document.getElementById('tradesList');
        const recentTrades = this.metrics.trades.slice(-5).reverse();
        
        if (recentTrades.length === 0) {
            container.innerHTML = '<div class="no-trades">No trades yet</div>';
            return;
        }
        
        container.innerHTML = recentTrades.map(trade => `
            <div class="trade-item">
                <div>
                    <strong>${trade.symbol}</strong>
                    <span>${new Date(trade.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="${trade.profit >= 0 ? 'position-profit' : 'position-loss'}">
                    ${trade.profit >= 0 ? '+' : ''}$${Math.abs(trade.profit).toFixed(2)}
                </div>
            </div>
        `).join('');
    }
    
    showAlert(message, type = 'info') {
        const alertsList = document.getElementById('alertsList');
        
        const alert = document.createElement('div');
        alert.className = 'alert-item';
        alert.innerHTML = `
            <div class="alert-time">${new Date().toLocaleTimeString()}</div>
            <div class="alert-message">${message}</div>
        `;
        
        alertsList.insertBefore(alert, alertsList.firstChild);
        
        // Keep only last 5 alerts
        while (alertsList.children.length > 5) {
            alertsList.removeChild(alertsList.lastChild);
        }
        
        // Play sound for critical alerts
        if (type === 'critical' && window.AuraQuant?.modules?.alerts) {
            window.AuraQuant.modules.alerts.play('emergency');
        }
    }
    
    connectWebSocket() {
        // Connect to WebSocket for real-time updates
        if (window.AuraQuant?.modules?.websocket) {
            window.AuraQuant.modules.websocket.on('performance_update', (data) => {
                this.metrics = { ...this.metrics, ...data };
                this.renderMetrics();
            });
            
            window.AuraQuant.modules.websocket.on('trade_executed', (trade) => {
                this.metrics.trades.push(trade);
                this.updateTrades();
                this.updateCharts();
            });
            
            window.AuraQuant.modules.websocket.on('position_update', (positions) => {
                this.metrics.positions = positions;
                this.updatePositions();
            });
        }
    }
    
    formatNumber(num) {
        if (num >= 1000000000000) {
            return (num / 1000000000000).toFixed(2) + 'T';
        } else if (num >= 1000000000) {
            return (num / 1000000000).toFixed(2) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        }
        return num.toFixed(2);
    }
    
    getAuthToken() {
        const session = localStorage.getItem('auraquant_session') || 
                       sessionStorage.getItem('auraquant_session');
        if (session) {
            return JSON.parse(session).token;
        }
        return null;
    }
    
    minimize() {
        const dashboard = document.getElementById('performanceDashboard');
        dashboard.classList.toggle('dashboard-minimized');
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.chartInterval) {
            clearInterval(this.chartInterval);
        }
        
        const dashboard = document.getElementById('performanceDashboard');
        if (dashboard) {
            dashboard.remove();
        }
    }
};

// Auto-initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.performanceDashboard = new PerformanceDashboard();
        // Dashboard will be initialized when main platform loads
    });
} else {
    window.performanceDashboard = new PerformanceDashboard();
}
