/**
 * AuraQuant Infinity - Main Application Controller
 * Manages the overall application state and initialization
 */

(function() {
    'use strict';
    
    // Main Application Object
    window.app = {
        version: '1.0.0',
        initialized: false,
        currentScreen: 'dashboard',
        user: null,
        settings: {},
        modules: {},
        
        // Initialize the application
        init: async function() {
            if (this.initialized) return;
            
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
        },
        
        // Initialize configuration
        initConfig: async function() {
            console.log('Loading configuration...');
            if (window.Config && window.Config.initialize) {
                try {
                    await window.Config.initialize();
                } catch (error) {
                    console.warn('Config initialization failed, using defaults:', error);
                }
            }
        },
        
        // Setup event listeners
        setupEventListeners: function() {
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
            document.getElementById('pauseBot')?.addEventListener('click', () => this.pauseBot());
            document.getElementById('resumeBot')?.addEventListener('click', () => this.resumeBot());
            document.getElementById('stopBot')?.addEventListener('click', () => this.stopBot());
            
            // Trading mode toggle
            document.getElementById('tradingModeToggle')?.addEventListener('click', () => this.toggleTradingMode());
            
            // Bot version selector
            document.getElementById('botVersionSelector')?.addEventListener('change', (e) => this.changeBotVersion(e));
            
            // Logout button
            document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        },
        
        // Initialize UI
        initUI: function() {
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
        },
        
        // Check authentication
        checkAuth: function() {
            const token = localStorage.getItem('auth_token');
            const savedUser = localStorage.getItem('user_data');
            
            if (token && savedUser) {
                this.user = JSON.parse(savedUser);
                this.showMainPlatform();
            } else {
                this.showLoginScreen();
            }
        },
        
        // Initialize modules
        initModules: async function() {
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
                    if (window[moduleName + 'Module'] || window[moduleName + 'Manager']) {
                        console.log(`Initializing ${moduleName}...`);
                        const module = window[moduleName + 'Module'] || window[moduleName + 'Manager'];
                        if (module && module.init) {
                            await module.init();
                            this.modules[moduleName] = module;
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to initialize ${moduleName}:`, error);
                }
            }
        },
        
        // Handle login
        handleLogin: async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            // For demo, accept any credentials
            console.log('Logging in...');
            
            // Mock user data
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
        },
        
        // Show main platform
        showMainPlatform: function() {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainPlatform').style.display = 'block';
            
            // Update user display
            const balanceElement = document.getElementById('accountBalance');
            if (balanceElement) {
                balanceElement.textContent = '$100,000.00';
            }
        },
        
        // Show login screen
        showLoginScreen: function() {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('mainPlatform').style.display = 'none';
        },
        
        // Handle tab switching
        handleTabSwitch: function(e) {
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
            if (formId) {
                document.getElementById(formId)?.classList.add('active');
            }
        },
        
        // Handle navigation
        handleNavigation: function(e) {
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
        },
        
        // Initialize specific screen
        initScreen: function(screen) {
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
        },
        
        // Update clocks
        updateClocks: function() {
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
        },
        
        // Initialize tooltips
        initTooltips: function() {
            document.querySelectorAll('[title]').forEach(element => {
                const title = element.getAttribute('title');
                element.setAttribute('data-tooltip', title);
                element.removeAttribute('title');
            });
        },
        
        // Initialize charts
        initCharts: function() {
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
        },
        
        // Generate sample candle data
        generateSampleCandleData: function() {
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
        },
        
        // Initialize floating panels
        initFloatingPanels: function() {
            document.querySelectorAll('.minimize-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const panel = e.target.closest('.floating-panel');
                    if (panel) {
                        panel.classList.toggle('minimized');
                    }
                });
            });
        },
        
        // Bot control functions
        pauseBot: function() {
            console.log('Pausing bot...');
            document.getElementById('pauseBot').style.display = 'none';
            document.getElementById('resumeBot').style.display = 'inline-block';
            this.showNotification('Bot paused', 'warning');
        },
        
        resumeBot: function() {
            console.log('Resuming bot...');
            document.getElementById('pauseBot').style.display = 'inline-block';
            document.getElementById('resumeBot').style.display = 'none';
            this.showNotification('Bot resumed', 'success');
        },
        
        stopBot: function() {
            if (confirm('Are you sure you want to stop the bot?')) {
                console.log('Stopping bot...');
                this.showNotification('Bot stopped', 'error');
            }
        },
        
        // Toggle trading mode
        toggleTradingMode: function() {
            const toggle = document.getElementById('tradingModeToggle');
            const paperMode = toggle.querySelector('.paper-mode');
            const liveMode = toggle.querySelector('.live-mode');
            
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
        },
        
        // Change bot version
        changeBotVersion: function(e) {
            const version = e.target.value;
            console.log('Changing bot version to:', version);
            this.showNotification(`Bot version changed to ${version}`, 'info');
        },
        
        // Show notification
        showNotification: function(message, type = 'info') {
            console.log(`[${type.toUpperCase()}] ${message}`);
            // TODO: Implement visual notification
        },
        
        // Start real-time updates
        startRealtimeUpdates: function() {
            // Update market data every 5 seconds
            setInterval(() => {
                this.updateMarketData();
            }, 5000);
            
            // Update bot status every 10 seconds
            setInterval(() => {
                this.updateBotStatus();
            }, 10000);
        },
        
        // Update market data
        updateMarketData: function() {
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
        },
        
        // Update bot status
        updateBotStatus: function() {
            const statusText = document.getElementById('botActivityStatus');
            if (statusText) {
                const statuses = ['Analyzing...', 'Scanning markets...', 'Evaluating positions...', 'Monitoring trades...'];
                statusText.textContent = statuses[Math.floor(Math.random() * statuses.length)];
            }
        },
        
        // Logout
        logout: function() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
                this.user = null;
                this.showLoginScreen();
            }
        },
        
        // Handle initialization error
        handleInitError: function(error) {
            console.error('Initialization error:', error);
            // Continue with limited functionality
            this.showLoginScreen();
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.app.init());
    } else {
        // DOM already loaded
        window.app.init();
    }
    
})();
