/**
 * AuraQuant Infinity - Main Application Entry Point
 * Professional Live Trading Platform
 */

// Global application instance
window.AuraQuant = {
    version: '∞',
    environment: 'production',
    initialized: false,
    modules: {},
    state: {
        user: null,
        authenticated: false,
        mode: 'paper', // 'paper' or 'live'
        balance: 500, // Starting balance in AUD
        target: 100000, // Target balance
        positions: [],
        orders: [],
        alerts: [],
        botActive: false,
        botVersion: 'v∞',
        drawdown: 0,
        maxDrawdown: 2, // 2% max drawdown enforcement
    }
};

/**
 * Initialize the AuraQuant platform
 */
async function initializePlatform() {
    try {
        console.log('🚀 AuraQuant Infinity Initializing...');
        
        // Check browser compatibility
        if (!checkBrowserCompatibility()) {
            throw new Error('Browser not supported. Please use a modern browser.');
        }
        
        // Load configuration
        await Config.initialize();
        
        // Initialize core modules
        window.AuraQuant.modules = {
            app: new App(),
            websocket: new WebSocketManager(),
            trading: new TradingManager(),
            charts: new ChartsManager(),
            screener: new ScreenerManager(),
            ai: new AIManager(),
            social: new SocialManager(),
            timezone: new TimezoneManager(),
            alerts: new AudioAlerts(),
            backup: new BackupManager()
        };
        
        // Initialize authentication handlers
        initializeAuthHandlers();
        
        // Initialize platform UI
        initializePlatformUI();
        
        // Start timezone updates
        window.AuraQuant.modules.timezone.startClock();
        
        // Check for saved session
        const savedSession = localStorage.getItem('auraquant_session');
        if (savedSession) {
            const session = JSON.parse(savedSession);
            if (session.token && !isTokenExpired(session.token)) {
                await autoLogin(session);
            }
        }
        
        // Initialize service worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.warn('Service Worker registration failed:', err);
            });
        }
        
        window.AuraQuant.initialized = true;
        console.log('✅ AuraQuant Infinity Ready');
        console.log('🔒 Security: Military-grade');
        console.log('📊 All systems operational');
        
    } catch (error) {
        console.error('❌ Platform initialization failed:', error);
        showErrorScreen(error.message);
    }
}

/**
 * Check browser compatibility
 */
function checkBrowserCompatibility() {
    const features = [
        'WebSocket' in window,
        'localStorage' in window,
        'Worker' in window,
        'Promise' in window,
        'fetch' in window
    ];
    
    return features.every(feature => feature);
}

/**
 * Initialize authentication handlers
 */
function initializeAuthHandlers() {
    // Platform login
    const platformLoginForm = document.getElementById('platformLoginForm');
    if (platformLoginForm) {
        platformLoginForm.addEventListener('submit', handlePlatformLogin);
    }
    
    // Bank login
    const bankLoginForm = document.getElementById('bankLoginForm');
    if (bankLoginForm) {
        bankLoginForm.addEventListener('submit', handleBankLogin);
    }
    
    // Broker login
    const brokerLoginForm = document.getElementById('brokerLoginForm');
    if (brokerLoginForm) {
        brokerLoginForm.addEventListener('submit', handleBrokerLogin);
    }
    
    // Login tab switching
    document.querySelectorAll('.login-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchLoginTab(tabName);
        });
    });
    
    // Forgot password link
    const forgotLink = document.querySelector('.forgot-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', handleForgotPassword);
    }
}

/**
 * Handle platform login
 */
async function handlePlatformLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const remember = document.querySelector('input[type="checkbox"]').checked;
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        submitBtn.disabled = true;
        
        // Authenticate with backend
        const response = await fetch(`${Config.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error('Invalid credentials');
        }
        
        const data = await response.json();
        
        // Store session
        window.AuraQuant.state.user = data.user;
        window.AuraQuant.state.authenticated = true;
        
        if (remember) {
            localStorage.setItem('auraquant_session', JSON.stringify({
                token: data.token,
                user: data.user
            }));
        } else {
            sessionStorage.setItem('auraquant_session', JSON.stringify({
                token: data.token,
                user: data.user
            }));
        }
        
        // Initialize platform
        await initializePlatformModules(data.token);
        
        // Show main platform
        showMainPlatform();
        
        // Play success sound
        window.AuraQuant.modules.alerts.play('success');
        
    } catch (error) {
        console.error('Login failed:', error);
        showNotification('Login failed: ' + error.message, 'error');
        
        // Reset button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Launch Platform';
        submitBtn.disabled = false;
    }
}

/**
 * Handle NAB bank login
 */
async function handleBankLogin(e) {
    e.preventDefault();
    
    const nabId = e.target.querySelector('input[type="text"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    
    try {
        // Connect to NAB API (simulated for now)
        const response = await fetch(`${Config.API_BASE_URL}/auth/bank/nab`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ nabId, password })
        });
        
        if (!response.ok) {
            throw new Error('Failed to connect NAB account');
        }
        
        const data = await response.json();
        
        // Store bank connection
        window.AuraQuant.state.bankConnected = true;
        window.AuraQuant.state.bankAccount = data.account;
        
        showNotification('NAB account connected successfully', 'success');
        
        // Switch to platform login
        switchLoginTab('platform');
        
    } catch (error) {
        console.error('Bank connection failed:', error);
        showNotification('Failed to connect NAB account', 'error');
    }
}

/**
 * Handle broker login
 */
async function handleBrokerLogin(e) {
    e.preventDefault();
    
    const broker = e.target.querySelector('.broker-select').value;
    const apiKey = e.target.querySelector('input[type="text"]').value;
    const apiSecret = e.target.querySelector('input[type="password"]').value;
    
    try {
        // Connect to broker API
        const response = await fetch(`${Config.API_BASE_URL}/auth/broker/${broker}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ apiKey, apiSecret })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to connect ${broker} account`);
        }
        
        const data = await response.json();
        
        // Store broker connection
        if (!window.AuraQuant.state.brokers) {
            window.AuraQuant.state.brokers = {};
        }
        window.AuraQuant.state.brokers[broker] = {
            connected: true,
            account: data.account
        };
        
        showNotification(`${broker.toUpperCase()} account connected successfully`, 'success');
        
        // Switch to platform login
        switchLoginTab('platform');
        
    } catch (error) {
        console.error('Broker connection failed:', error);
        showNotification(`Failed to connect ${broker} account`, 'error');
    }
}

/**
 * Switch login tab
 */
function switchLoginTab(tabName) {
    // Update tabs
    document.querySelectorAll('.login-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update forms
    document.querySelectorAll('.login-form').forEach(form => {
        form.classList.toggle('active', 
            form.id === `${tabName}LoginForm`);
    });
}

/**
 * Handle forgot password
 */
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = prompt('Enter your email address:');
    if (!email) return;
    
    try {
        const response = await fetch(`${Config.API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        if (response.ok) {
            showNotification('Password reset link sent to your email', 'success');
        } else {
            throw new Error('Failed to send reset link');
        }
    } catch (error) {
        console.error('Password reset failed:', error);
        showNotification('Failed to send password reset link', 'error');
    }
}

/**
 * Initialize platform UI components
 */
function initializePlatformUI() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const screen = e.currentTarget.dataset.screen;
            window.AuraQuant.modules.app.switchScreen(screen);
        });
    });
    
    // Mode toggle (Paper/Live)
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = btn.classList.contains('paper') ? 'paper' : 'live';
            switchTradingMode(mode);
        });
    });
    
    // Bot controls
    document.querySelector('.start-bot')?.addEventListener('click', startBot);
    document.querySelector('.stop-bot')?.addEventListener('click', stopBot);
    document.querySelector('.emergency-stop')?.addEventListener('click', emergencyStop);
    
    // Manual override
    document.querySelector('.manual-override')?.addEventListener('click', toggleManualOverride);
    
    // Social hub
    initializeSocialHub();
    
    // API modal
    initializeAPIModal();
    
    // Settings
    document.querySelector('.save-settings')?.addEventListener('click', saveSettings);
    
    // Backup
    document.querySelector('.backup-now')?.addEventListener('click', () => {
        window.AuraQuant.modules.backup.backupNow();
    });
}

/**
 * Initialize platform modules after authentication
 */
async function initializePlatformModules(token) {
    // Connect WebSocket
    await window.AuraQuant.modules.websocket.connect(token);
    
    // Initialize trading module
    await window.AuraQuant.modules.trading.initialize();
    
    // Load user settings
    await loadUserSettings();
    
    // Start market data stream
    await window.AuraQuant.modules.websocket.subscribeToMarketData();
    
    // Initialize charts
    window.AuraQuant.modules.charts.initializeCharts();
    
    // Load screener configurations
    await window.AuraQuant.modules.screener.loadConfigurations();
    
    // Connect AI models
    await window.AuraQuant.modules.ai.connectModels();
    
    // Initialize social connections
    await window.AuraQuant.modules.social.initialize();
    
    // Start auto-backup
    window.AuraQuant.modules.backup.startAutoBackup();
}

/**
 * Show main platform
 */
function showMainPlatform() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainPlatform').classList.add('active');
    
    // Update user info
    document.querySelector('.username').textContent = 
        window.AuraQuant.state.user?.name || 'User';
    
    // Load dashboard
    window.AuraQuant.modules.app.loadDashboard();
}

/**
 * Switch trading mode
 */
async function switchTradingMode(mode) {
    if (mode === 'live' && !confirm('⚠️ WARNING: Switching to LIVE trading mode. Real money will be at risk. Continue?')) {
        return;
    }
    
    window.AuraQuant.state.mode = mode;
    
    // Update UI
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', 
            (btn.classList.contains('paper') && mode === 'paper') ||
            (btn.classList.contains('live') && mode === 'live'));
    });
    
    // Update bot indicator
    const indicator = document.querySelector('.bot-indicator');
    if (mode === 'live') {
        indicator.style.background = '#ff3366';
    }
    
    // Notify modules
    window.AuraQuant.modules.trading.setMode(mode);
    window.AuraQuant.modules.websocket.send({
        type: 'MODE_CHANGE',
        mode: mode
    });
    
    showNotification(`Switched to ${mode.toUpperCase()} trading mode`, 'info');
}

/**
 * Start trading bot
 */
async function startBot() {
    try {
        // Check drawdown before starting
        if (window.AuraQuant.state.drawdown >= window.AuraQuant.state.maxDrawdown) {
            throw new Error('Cannot start bot: Maximum drawdown reached');
        }
        
        // Start bot
        const response = await fetch(`${Config.API_BASE_URL}/bot/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                version: window.AuraQuant.state.botVersion,
                mode: window.AuraQuant.state.mode
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to start bot');
        }
        
        window.AuraQuant.state.botActive = true;
        
        // Update UI
        document.querySelector('.start-bot').disabled = true;
        document.querySelector('.stop-bot').disabled = false;
        document.querySelector('.bot-indicator').classList.add('active');
        
        showNotification('Trading bot started', 'success');
        window.AuraQuant.modules.alerts.play('bot_start');
        
    } catch (error) {
        console.error('Failed to start bot:', error);
        showNotification(error.message, 'error');
    }
}

/**
 * Stop trading bot
 */
async function stopBot() {
    try {
        const response = await fetch(`${Config.API_BASE_URL}/bot/stop`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to stop bot');
        }
        
        window.AuraQuant.state.botActive = false;
        
        // Update UI
        document.querySelector('.start-bot').disabled = false;
        document.querySelector('.stop-bot').disabled = true;
        document.querySelector('.bot-indicator').classList.remove('active');
        
        showNotification('Trading bot stopped', 'info');
        
    } catch (error) {
        console.error('Failed to stop bot:', error);
        showNotification(error.message, 'error');
    }
}

/**
 * Emergency stop - immediately close all positions and stop bot
 */
async function emergencyStop() {
    if (!confirm('⚠️ EMERGENCY STOP: This will immediately close all positions and stop the bot. Continue?')) {
        return;
    }
    
    try {
        // Stop bot
        await stopBot();
        
        // Close all positions
        await window.AuraQuant.modules.trading.closeAllPositions();
        
        // Cancel all orders
        await window.AuraQuant.modules.trading.cancelAllOrders();
        
        // Send emergency notification
        await window.AuraQuant.modules.social.broadcastEmergency('Emergency stop activated');
        
        showNotification('EMERGENCY STOP ACTIVATED', 'error');
        window.AuraQuant.modules.alerts.play('emergency');
        
    } catch (error) {
        console.error('Emergency stop failed:', error);
        alert('CRITICAL ERROR: Emergency stop failed! ' + error.message);
    }
}

/**
 * Toggle manual override
 */
function toggleManualOverride() {
    window.AuraQuant.state.manualOverride = !window.AuraQuant.state.manualOverride;
    
    if (window.AuraQuant.state.manualOverride) {
        showNotification('Manual override ENABLED - Bot suggestions only', 'warning');
    } else {
        showNotification('Manual override DISABLED - Bot trading resumed', 'info');
    }
}

/**
 * Initialize social hub
 */
function initializeSocialHub() {
    const socialItems = document.querySelectorAll('.social-item');
    
    socialItems.forEach(item => {
        item.addEventListener('click', () => {
            const platform = item.className.split(' ')[1];
            window.AuraQuant.modules.social.openCompose(platform);
        });
    });
}

/**
 * Initialize API modal
 */
function initializeAPIModal() {
    const addApiBtn = document.querySelector('.add-api-btn');
    const apiModal = document.getElementById('apiModal');
    const apiForm = document.getElementById('apiForm');
    const cancelBtn = document.querySelector('.cancel-btn');
    
    addApiBtn?.addEventListener('click', () => {
        apiModal.classList.add('active');
    });
    
    cancelBtn?.addEventListener('click', () => {
        apiModal.classList.remove('active');
    });
    
    apiForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAPIConnection(e.target);
        apiModal.classList.remove('active');
    });
}

/**
 * Save API connection
 */
async function saveAPIConnection(form) {
    const apiType = form.querySelector('#apiType').value;
    const apiKey = form.querySelector('input[type="text"]').value;
    const apiSecret = form.querySelector('input[type="password"]').value;
    const additional = form.querySelector('input[placeholder*="Additional"]').value;
    
    try {
        const response = await fetch(`${Config.API_BASE_URL}/api/connections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                type: apiType,
                apiKey,
                apiSecret,
                additional
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save API connection');
        }
        
        showNotification(`${apiType.toUpperCase()} API connected successfully`, 'success');
        
        // Reload API list
        window.AuraQuant.modules.app.loadAPIManagement();
        
    } catch (error) {
        console.error('Failed to save API:', error);
        showNotification('Failed to save API connection', 'error');
    }
}

/**
 * Save settings
 */
async function saveSettings() {
    const settings = {
        maxDrawdown: document.querySelector('input[value="2"]').value,
        positionSize: document.querySelector('input[value="10"]').value,
        emailAlerts: document.querySelector('input[type="checkbox"][checked]').checked,
        // ... collect all settings
    };
    
    try {
        const response = await fetch(`${Config.API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            showNotification('Settings saved successfully', 'success');
        }
    } catch (error) {
        console.error('Failed to save settings:', error);
        showNotification('Failed to save settings', 'error');
    }
}

/**
 * Load user settings
 */
async function loadUserSettings() {
    try {
        const response = await fetch(`${Config.API_BASE_URL}/settings`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (response.ok) {
            const settings = await response.json();
            window.AuraQuant.state.settings = settings;
            applySettings(settings);
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

/**
 * Apply settings to UI
 */
function applySettings(settings) {
    // Apply theme, notifications, etc.
    if (settings.darkMode === false) {
        document.body.classList.add('light-mode');
    }
    
    window.AuraQuant.state.maxDrawdown = settings.maxDrawdown || 2;
    window.AuraQuant.modules.alerts.setVolume(settings.soundVolume || 0.5);
}

/**
 * Get auth token
 */
function getAuthToken() {
    const session = localStorage.getItem('auraquant_session') || 
                   sessionStorage.getItem('auraquant_session');
    if (session) {
        return JSON.parse(session).token;
    }
    return null;
}

/**
 * Check if token is expired
 */
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
}

/**
 * Auto login with saved session
 */
async function autoLogin(session) {
    try {
        window.AuraQuant.state.user = session.user;
        window.AuraQuant.state.authenticated = true;
        
        await initializePlatformModules(session.token);
        showMainPlatform();
        
        console.log('✅ Auto-login successful');
    } catch (error) {
        console.error('Auto-login failed:', error);
        localStorage.removeItem('auraquant_session');
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * Get notification icon
 */
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

/**
 * Show error screen
 */
function showErrorScreen(message) {
    document.body.innerHTML = `
        <div class="error-screen">
            <h1>Platform Error</h1>
            <p>${message}</p>
            <button onclick="location.reload()">Reload</button>
        </div>
    `;
}

// Initialize platform when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlatform);
} else {
    initializePlatform();
}

// Export for modules