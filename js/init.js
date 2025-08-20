/**
 * AuraQuant Infinity - Frontend Initialization & Error Handler
 * Ensures smooth loading and handles backend connection issues
 */

(function() {
    'use strict';
    
    // Global error handler
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
        handleError(event.error, 'global');
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        handleError(event.reason, 'promise');
    });
    
    // Error handling function
    function handleError(error, source) {
        const errorInfo = {
            message: error?.message || 'Unknown error',
            stack: error?.stack || '',
            source: source,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        // Log to console in development
        if (window.Config?.DEBUG) {
            console.error('Error details:', errorInfo);
        }
        
        // Show user-friendly error message
        if (source === 'backend-connection') {
            showBackendError();
        }
    }
    
    // Show backend connection error
    function showBackendError() {
        const banner = document.getElementById('connection-status');
        if (banner) {
            banner.innerHTML = `
                <div class="alert alert-warning">
                    <strong>⚠️ Backend Connection Issue</strong>
                    <p>The trading backend is currently unavailable. Working in offline mode.</p>
                    <button onclick="retryBackendConnection()" class="btn btn-sm btn-primary">Retry Connection</button>
                </div>
            `;
            banner.style.display = 'block';
        }
    }
    
    // Initialize application
    window.initializeApp = async function() {
        console.log('🚀 Initializing AuraQuant Infinity...');
        
        try {
            // Step 1: Initialize configuration
            if (window.Config) {
                await window.Config.initialize();
                console.log('✅ Configuration loaded');
            } else {
                console.warn('⚠️ Config not found, using defaults');
                initializeDefaultConfig();
            }
            
            // Step 2: Check backend connectivity
            const backendStatus = await checkBackendConnection();
            updateConnectionStatus(backendStatus);
            
            // Step 3: Initialize core modules
            await initializeCoreModules();
            
            // Step 4: Setup authentication
            await setupAuthentication();
            
            // Step 5: Initialize UI components
            initializeUI();
            
            // Step 6: Start WebSocket connection if backend is available
            if (backendStatus.connected) {
                await initializeWebSocket();
            }
            
            // Step 7: Load user preferences
            loadUserPreferences();
            
            // Step 8: Start monitoring
            startHealthMonitoring();
            
            console.log('✅ AuraQuant Infinity initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            handleError(error, 'initialization');
            // Continue with limited functionality
            initializeOfflineMode();
        }
    };
    
    // Check backend connection
    async function checkBackendConnection() {
        try {
            const apiUrl = window.Config?.API_BASE_URL || 'https://auraquant-api-prod.onrender.com/api';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(`${apiUrl}/health`, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    connected: true,
                    latency: data.latency || 0,
                    version: data.version || 'unknown',
                    features: data.features || []
                };
            }
            
            return { connected: false, error: 'Backend returned error status' };
            
        } catch (error) {
            console.warn('Backend connection failed:', error.message);
            return { connected: false, error: error.message };
        }
    }
    
    // Update connection status in UI
    function updateConnectionStatus(status) {
        const statusElement = document.querySelector('.connection-indicator');
        if (statusElement) {
            if (status.connected) {
                statusElement.innerHTML = '🟢 Connected';
                statusElement.className = 'connection-indicator connected';
            } else {
                statusElement.innerHTML = '🔴 Offline';
                statusElement.className = 'connection-indicator disconnected';
            }
        }
        
        // Store status globally
        window.backendStatus = status;
    }
    
    // Initialize core modules
    async function initializeCoreModules() {
        const modules = [
            'websocket',
            'trading',
            'screener',
            'charts',
            'ai',
            'social',
            'backtest',
            'emergency',
            'audioAlerts'
        ];
        
        for (const moduleName of modules) {
            try {
                if (window[moduleName + 'Module']) {
                    console.log(`Initializing ${moduleName} module...`);
                    await window[moduleName + 'Module'].init?.();
                }
            } catch (error) {
                console.warn(`Failed to initialize ${moduleName}:`, error);
            }
        }
    }
    
    // Setup authentication
    async function setupAuthentication() {
        // Check for stored session
        const token = localStorage.getItem('auth_token');
        if (token && window.backendStatus?.connected) {
            try {
                // Validate token with backend
                const response = await fetch(`${window.Config.API_BASE_URL}/auth/validate`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    window.currentUser = userData;
                    showAuthenticatedUI();
                } else {
                    // Token invalid, clear it
                    localStorage.removeItem('auth_token');
                    showLoginUI();
                }
            } catch (error) {
                console.warn('Token validation failed:', error);
                showLoginUI();
            }
        } else {
            showLoginUI();
        }
    }
    
    // Initialize UI components
    function initializeUI() {
        // Setup navigation
        setupNavigation();
        
        // Initialize tooltips
        initializeTooltips();
        
        // Setup forms
        setupForms();
        
        // Initialize charts if available
        if (window.LightweightCharts) {
            initializeCharts();
        }
        
        // Setup clock
        startClock();
        
        // Initialize tabs
        initializeTabs();
    }
    
    // Setup navigation
    function setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const screen = this.dataset.screen;
                if (screen) {
                    showScreen(screen);
                }
            });
        });
    }
    
    // Show specific screen
    window.showScreen = function(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        // Show selected screen
        const targetScreen = document.getElementById(screenName + '-screen');
        if (targetScreen) {
            targetScreen.style.display = 'block';
            
            // Update active nav
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.dataset.screen === screenName) {
                    link.classList.add('active');
                }
            });
            
            // Trigger screen-specific initialization
            if (window[screenName + 'Init']) {
                window[screenName + 'Init']();
            }
        }
    };
    
    // Initialize WebSocket connection
    async function initializeWebSocket() {
        try {
            if (window.WebSocketManager) {
                await window.WebSocketManager.connect();
                console.log('✅ WebSocket connected');
            }
        } catch (error) {
            console.warn('WebSocket connection failed:', error);
            // Continue without real-time updates
        }
    }
    
    // Initialize offline mode
    function initializeOfflineMode() {
        console.log('🔌 Running in offline mode');
        
        // Disable features that require backend
        document.querySelectorAll('.requires-backend').forEach(element => {
            element.disabled = true;
            element.title = 'Feature requires backend connection';
        });
        
        // Show offline banner
        const banner = document.createElement('div');
        banner.className = 'offline-banner';
        banner.innerHTML = `
            <div class="alert alert-info">
                <strong>Offline Mode</strong> - Limited functionality available
                <button onclick="retryBackendConnection()" class="btn btn-sm btn-light ml-3">Retry</button>
            </div>
        `;
        document.body.insertBefore(banner, document.body.firstChild);
    }
    
    // Retry backend connection
    window.retryBackendConnection = async function() {
        console.log('Retrying backend connection...');
        const status = await checkBackendConnection();
        updateConnectionStatus(status);
        
        if (status.connected) {
            // Reload page to fully reinitialize
            window.location.reload();
        } else {
            alert('Backend still unavailable. Please try again later.');
        }
    };
    
    // Load user preferences
    function loadUserPreferences() {
        try {
            const preferences = JSON.parse(localStorage.getItem('user_preferences') || '{}');
            
            // Apply theme
            if (preferences.theme) {
                document.body.className = preferences.theme;
            }
            
            // Apply other preferences
            window.userPreferences = preferences;
            
        } catch (error) {
            console.warn('Failed to load preferences:', error);
        }
    }
    
    // Start health monitoring
    function startHealthMonitoring() {
        // Check backend health every 30 seconds
        setInterval(async () => {
            if (window.backendStatus?.connected) {
                const status = await checkBackendConnection();
                if (!status.connected && window.backendStatus.connected) {
                    // Backend went offline
                    console.warn('Backend connection lost');
                    updateConnectionStatus(status);
                    showBackendError();
                } else if (status.connected && !window.backendStatus.connected) {
                    // Backend came back online
                    console.log('Backend connection restored');
                    updateConnectionStatus(status);
                    window.location.reload(); // Reload to reinitialize
                }
            }
        }, 30000);
    }
    
    // Initialize tooltips
    function initializeTooltips() {
        // Simple tooltip implementation
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', function() {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip-popup';
                tooltip.textContent = this.dataset.tooltip;
                document.body.appendChild(tooltip);
                
                const rect = this.getBoundingClientRect();
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.bottom + 5) + 'px';
                
                this._tooltip = tooltip;
            });
            
            element.addEventListener('mouseleave', function() {
                if (this._tooltip) {
                    this._tooltip.remove();
                    delete this._tooltip;
                }
            });
        });
    }
    
    // Setup forms
    function setupForms() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        // Settings forms
        document.querySelectorAll('.settings-form').forEach(form => {
            form.addEventListener('submit', handleSettingsUpdate);
        });
    }
    
    // Handle login
    async function handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        try {
            if (!window.backendStatus?.connected) {
                // Offline demo mode
                window.currentUser = { username: credentials.username, demo: true };
                showAuthenticatedUI();
                return;
            }
            
            const response = await fetch(`${window.Config.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('auth_token', data.token);
                window.currentUser = data.user;
                showAuthenticatedUI();
            } else {
                alert('Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login service unavailable. Using demo mode.');
            window.currentUser = { username: credentials.username, demo: true };
            showAuthenticatedUI();
        }
    }
    
    // Show authenticated UI
    function showAuthenticatedUI() {
        document.getElementById('login-screen')?.style.display = 'none';
        document.getElementById('main-app')?.style.display = 'block';
        document.getElementById('username-display')?.textContent = window.currentUser?.username || 'User';
        
        // Initialize dashboard
        showScreen('dashboard');
    }
    
    // Show login UI
    function showLoginUI() {
        document.getElementById('login-screen')?.style.display = 'block';
        document.getElementById('main-app')?.style.display = 'none';
    }
    
    // Handle settings update
    async function handleSettingsUpdate(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const settings = Object.fromEntries(formData);
        
        // Save locally
        localStorage.setItem('user_settings', JSON.stringify(settings));
        
        // Sync with backend if available
        if (window.backendStatus?.connected) {
            try {
                await fetch(`${window.Config.API_BASE_URL}/settings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: JSON.stringify(settings)
                });
            } catch (error) {
                console.warn('Failed to sync settings:', error);
            }
        }
        
        alert('Settings saved successfully');
    }
    
    // Initialize charts
    function initializeCharts() {
        // This will be handled by charts.js module
        console.log('Charts ready for initialization');
    }
    
    // Start clock
    function startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { 
                timeZone: 'Australia/Perth',
                hour12: false 
            });
            
            const clockElement = document.getElementById('clock');
            if (clockElement) {
                clockElement.textContent = timeString + ' AWST';
            }
            
            // Update other timezone clocks
            const nyTime = now.toLocaleTimeString('en-US', { 
                timeZone: 'America/New_York',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const nyClockElement = document.getElementById('ny-clock');
            if (nyClockElement) {
                nyClockElement.textContent = 'NY: ' + nyTime;
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    // Initialize tabs
    function initializeTabs() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', function() {
                const tabGroup = this.dataset.tabGroup;
                const tabName = this.dataset.tab;
                
                // Hide all tabs in group
                document.querySelectorAll(`.tab-content[data-tab-group="${tabGroup}"]`).forEach(content => {
                    content.style.display = 'none';
                });
                
                // Show selected tab
                document.querySelector(`.tab-content[data-tab="${tabName}"]`)?.style.display = 'block';
                
                // Update active button
                document.querySelectorAll(`.tab-button[data-tab-group="${tabGroup}"]`).forEach(btn => {
                    btn.classList.remove('active');
                });
                this.classList.add('active');
            });
        });
    }
    
    // Initialize default config if Config module is missing
    function initializeDefaultConfig() {
        window.Config = {
            API_BASE_URL: 'https://auraquant-api-prod.onrender.com/api',
            WS_URL: 'wss://auraquant-api-prod.onrender.com/ws',
            ENVIRONMENT: 'production',
            DEBUG: false,
            PLATFORM: {
                NAME: 'AuraQuant Infinity',
                VERSION: '∞'
            }
        };
    }
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        // DOM already loaded
        initializeApp();
    }
    
})();
