/**
 * AuraQuant Infinity - Main Application Controller
 * Manages the overall application state and initialization
 */

// Define App as a proper ES6 class
class App {
    constructor() {
        this.version = '1.0.0';
        this.initialized = false;
        this.currentScreen = 'dashboard';
        this.user = null;
        this.settings = {};
        this.modules = {};
    }
    
    // Initialize the application
    async init() {
        if (this.initialized) {
            console.log('App already initialized');
            return;
        }
        
        console.log('🚀 Initializing AuraQuant Application...');
        
        try {
            // Initialize configuration
            if (window.Config) {
                await this.initConfig();
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI
            this.initUI();
            
            // Check authentication
            this.checkAuth();
            
            // Initialize modules
            await this.initModules();
            
            // Start real-time updates
            this.startRealtimeUpdates();
            
            this.initialized = true;
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleInitError(error);
        }
    }
    
    // Initialize configuration
    async initConfig() {
        console.log('Loading configuration...');
        if (window.Config && window.Config.initialize) {
            try {
                await window.Config.initialize();
            } catch (error) {
                console.warn('Config initialization failed, using defaults:', error);
            }
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTabSwitch(e));
        });
        
        // Login forms
        const platformLogin = document.getElementById('platformLogin');
        if (platformLogin) {
            platformLogin.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleNavigation(e));
        });
        
        // Bot controls
        const pauseBot = document.getElementById('pauseBot');
        if (pauseBot) pauseBot.addEventListener('click', () => this.pauseBot());
        
        const resumeBot = document.getElementById('resumeBot');
        if (resumeBot) resumeBot.addEventListener('click', () => this.resumeBot());
        
        const stopBot = document.getElementById('stopBot');
        if (stopBot) stopBot.addEventListener('click', () => this.stopBot());
        
        // Trading mode toggle
        const tradingModeToggle = document.getElementById('tradingModeToggle');
        if (tradingModeToggle) tradingModeToggle.addEventListener('click', () => this.toggleTradingMode());
        
        // Bot version selector
        const botVersionSelector = document.getElementById('botVersionSelector');
        if (botVersionSelector) botVersionSelector.addEventListener('change', (e) => this.changeBotVersion(e));
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
    }
    
    // Initialize UI
    initUI() {
        // Update clocks
        this.updateClocks();
        setInterval(() => this.updateClocks(), 1000);
        
        // Initialize tooltips
        this.initTooltips();
        
        // Setup charts if available
        if (window.LightweightCharts) {
            this.initCharts();
        }
        
        // Initialize floating panels
        this.initFloatingPanels();
    }
    
    // Check authentication
    checkAuth() {
        const token = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('user_data');
        
        if (token && savedUser) {
            try {
                this.user = JSON.parse(savedUser);
                this.showMainPlatform();
            } catch (e) {
                console.error('Error parsing user data:', e);
                this.showLoginScreen();
            }
        } else {
            this.showLoginScreen();
        }
    }
    
    // Initialize modules
    async initModules() {
        const moduleList = [
            'websocket',
            'trading',
            'screener',
            'charts',
            'ai',
            'social',
            'backtest'
        ];
        
        for (const moduleName of moduleList) {
            try {
                const moduleObj = window[moduleName + 'Module'] || window[moduleName + 'Manager'] || window[moduleName];
                if (moduleObj && typeof moduleObj.init === 'function') {
                    console.log(`Initializing ${moduleName}...`);
                    await moduleObj.init();
                    this.modules[moduleName] = moduleObj;
                }
            } catch (error) {
                console.warn(`Failed to initialize ${moduleName}:`, error);
            }
        }
    }
    
    // Handle login
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        console.log('Logging in...');
        
        // Mock user data for demo
        this.user = {
            id: 'user_' + Date.now(),
            email: email,
            name: email.split('@')[0],
            demo: true
        };
        
        // Save to localStorage if remember me is checked
        if (rememberMe) {
            localStorage.setItem('auth_token', 'demo_token_' + Date.now());
            localStorage.setItem('user_data', JSON.stringify(this.user));
        }
        
        // Show main platform
        this.showMainPlatform();
        
        // Try to connect to backend
        if (window.Config && window.Config.API_BASE_URL) {
            try {
                const response = await fetch(`${window.Config.API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.user = data.user;
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                }
            } catch (error) {
                console.warn('Backend login failed, using demo mode:', error);
            }
        }
    }
    
    // Show main platform
    showMainPlatform() {
        const loginScreen = document.getElementById('loginScreen');
        const mainPlatform = document.getElementById('mainPlatform');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainPlatform) mainPlatform.style.display = 'block';
        
        // Update user display
        const balanceElement = document.getElementById('accountBalance');
        if (balanceElement) {
            balanceElement.textContent = '$100,000.00';
        }
    }
    
    // Show login screen
    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const mainPlatform = document.getElementById('mainPlatform');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (mainPlatform) mainPlatform.style.display = 'none';
    }
    
    // Handle tab switching
    handleTabSwitch(e) {
        const tabBtn = e.currentTarget;
        const tabName = tabBtn.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        tabBtn.classList.add('active');
        
        // Show corresponding form
        document.querySelectorAll('.login-form').forEach(form => {
            form.classList.remove('active');
        });
        
        const formMap = {
            'platform': 'platformLogin',
            'bank': 'bankLogin',
            'broker': 'brokerLogin'
        };
        
        const formId = formMap[tabName];
        const form = document.getElementById(formId);
        if (form) form.classList.add('active');
    }
    
    // Handle navigation
    handleNavigation(e) {
        const tab = e.currentTarget;
        const screen = tab.dataset.screen;
        
        if (!screen) return;
        
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(t => {
            t.classList.remove('active');
        });
        tab.classList.add('active');
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => {
            s.style.display = 'none';
        });
        
        // Show selected screen
        const screenElement = document.getElementById(screen + '-screen');
        if (screenElement) {
            screenElement.style.display = 'block';
            this.currentScreen = screen;
            
            // Trigger screen-specific initialization
            this.initScreen(screen);
        }
    }
    
    // Initialize specific screen
    initScreen(screen) {
        switch(screen) {
            case 'trading':
                if (this.modules.charts) {
                    this.modules.charts.refresh();
                }
                break;
            case 'screener':
                if (this.modules.screener) {
                    this.modules.screener.refresh();
                }
                break;
            case 'ai-center':
                if (this.modules.ai) {
                    this.modules.ai.refresh();
                }
                break;
        }
    }
    
    // Update clocks
    updateClocks() {
        try {
            const now = new Date();
            
            // AWST time
            const awstTime = now.toLocaleTimeString('en-US', {
                timeZone: 'Australia/Perth',
                hour12: false
            });
            
            const awstElement = document.querySelector('#awstTime span');
            if (awstElement) {
                awstElement.textContent = awstTime + ' AWST';
            }
            
            // NY time
            const nyTime = now.toLocaleTimeString('en-US', {
                timeZone: 'America/New_York',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const nyElement = document.querySelector('#marketTime span');
            if (nyElement) {
                nyElement.textContent = 'NY: ' + nyTime;
            }
        } catch (error) {
            console.warn('Error updating clocks:', error);
        }
    }
    
    // Initialize tooltips
    initTooltips() {
        document.querySelectorAll('[title]').forEach(element => {
            const title = element.getAttribute('title');
            element.setAttribute('data-tooltip', title);
            element.removeAttribute('title');
        });
    }
    
    // Initialize charts
    initCharts() {
        const chartContainer = document.getElementById('tradingChart');
        if (chartContainer && window.LightweightCharts) {
            try {
                const chart = window.LightweightCharts.createChart(chartContainer, {
                    width: chartContainer.clientWidth,
                    height: 400,
                    layout: {
                        backgroundColor: '#1a1a1a',
                        textColor: '#ffffff'
                    },
                    grid: {
                        vertLines: { color: '#2a2a2a' },
                        horzLines: { color: '#2a2a2a' }
                    }
                });
                
                const candlestickSeries = chart.addCandlestickSeries();
                
                // Add sample data
                const sampleData = this.generateSampleCandleData();
                candlestickSeries.setData(sampleData);
                
                this.chart = chart;
            } catch (error) {
                console.warn('Failed to initialize chart:', error);
            }
        }
    }
    
    // Generate sample candle data
    generateSampleCandleData() {
        const data = [];
        const now = Date.now();
        let price = 100;
        
        for (let i = 100; i >= 0; i--) {
            const time = (now - i * 60000) / 1000;
            const open = price;
            const change = (Math.random() - 0.5) * 2;
            price += change;
            const close = price;
            const high = Math.max(open, close) + Math.random();
            const low = Math.min(open, close) - Math.random();
            
            data.push({
                time: time,
                open: open,
                high: high,
                low: low,
                close: close
            });
        }
        
        return data;
    }
    
    // Initialize floating panels
    initFloatingPanels() {
        const panels = document.querySelectorAll('.floating-panel');
        panels.forEach(panel => {
            const minimizeBtn = panel.querySelector('.minimize-btn');
            if (minimizeBtn) {
                minimizeBtn.addEventListener('click', () => {
                    panel.classList.toggle('minimized');
                });
            }
        });
    }
    
    // Bot control functions
    pauseBot() {
        console.log('Pausing bot...');
        const pauseBtn = document.getElementById('pauseBot');
        const resumeBtn = document.getElementById('resumeBot');
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'inline-block';
        this.showNotification('Bot paused', 'info');
    }
    
    resumeBot() {
        console.log('Resuming bot...');
        const pauseBtn = document.getElementById('pauseBot');
        const resumeBtn = document.getElementById('resumeBot');
        if (pauseBtn) pauseBtn.style.display = 'inline-block';
        if (resumeBtn) resumeBtn.style.display = 'none';
        this.showNotification('Bot resumed', 'success');
    }
    
    stopBot() {
        if (confirm('Are you sure you want to stop the bot?')) {
            console.log('Stopping bot...');
            this.showNotification('Bot stopped', 'error');
        }
    }
    
    // Toggle trading mode
    toggleTradingMode() {
        const toggle = document.getElementById('tradingModeToggle');
        if (!toggle) return;
        
        const paperMode = toggle.querySelector('.paper-mode');
        const liveMode = toggle.querySelector('.live-mode');
        
        if (paperMode && liveMode) {
            if (paperMode.classList.contains('active')) {
                if (confirm('Switch to LIVE trading? This will use real money!')) {
                    paperMode.classList.remove('active');
                    liveMode.classList.add('active');
                    this.showNotification('Switched to LIVE trading', 'warning');
                }
            } else {
                paperMode.classList.add('active');
                liveMode.classList.remove('active');
                this.showNotification('Switched to PAPER trading', 'success');
            }
        }
    }
    
    // Change bot version
    changeBotVersion(e) {
        const version = e.target.value;
        console.log('Changing bot version to:', version);
        this.showNotification(`Bot version changed to ${version}`, 'info');
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Create visual notification if container exists
        const container = document.getElementById('notifications');
        if (container) {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            container.appendChild(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }
    
    // Start real-time updates
    startRealtimeUpdates() {
        // Update market data every 5 seconds
        setInterval(() => {
            this.updateMarketData();
        }, 5000);
        
        // Update bot status every 10 seconds
        setInterval(() => {
            this.updateBotStatus();
        }, 10000);
    }
    
    // Update market data
    updateMarketData() {
        // Simulate market data updates
        const balance = document.getElementById('accountBalance');
        if (balance) {
            const currentValue = parseFloat(balance.textContent.replace(/[$,]/g, ''));
            const change = (Math.random() - 0.5) * 100;
            const newValue = currentValue + change;
            balance.textContent = '$' + newValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        
        const pnl = document.getElementById('dailyPnL');
        if (pnl) {
            const change = (Math.random() - 0.3) * 500;
            pnl.textContent = (change >= 0 ? '+' : '') + '$' + change.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            pnl.className = change >= 0 ? 'value positive' : 'value negative';
        }
    }
    
    // Update bot status
    updateBotStatus() {
        const statusText = document.getElementById('botActivityStatus');
        if (statusText) {
            const statuses = ['Analyzing...', 'Scanning markets...', 'Evaluating positions...', 'Monitoring trades...'];
            statusText.textContent = statuses[Math.floor(Math.random() * statuses.length)];
        }
    }
    
    // Logout
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            this.user = null;
            this.showLoginScreen();
        }
    }
    
    // Handle initialization error
    handleInitError(error) {
        console.error('Initialization error:', error);
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'platform-error';
        errorDiv.innerHTML = `
            <h2>Platform Initialization Error</h2>
            <p>There was an error loading the platform. Please refresh the page.</p>
            <p>Error: ${error.message}</p>
            <button onclick="location.reload()">Refresh Page</button>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Make App available globally
window.App = App;

// Create a single instance
window.app = new App();

// Ensure App is available globally even before DOM loads
console.log('App class created and instance available globally');

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing App...');
        window.app.init();
    });
} else {
    // DOM already loaded
    console.log('DOM already loaded, initializing App...');
    setTimeout(function() {
        window.app.init();
    }, 0);
}
