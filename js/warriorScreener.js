/**
 * AuraQuant Warrior Screener Module
 * Parses and manages trading screeners from CSV data
 * Provides real-time filtering and alert management
 */

class WarriorScreener {
    constructor() {
        this.screeners = [];
        this.activeScreeners = new Map();
        this.alerts = new Map();
        this.filterCache = new Map();
        this.csvPath = '/data/warrior_screeners.csv';
        this.updateInterval = 5000; // 5 seconds
        this.updateTimer = null;
        
        // Performance tracking
        this.performance = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            averageReturn: 0
        };
        
        this.init();
    }
    
    async init() {
        console.log('🎯 Initializing Warrior Screener Module...');
        
        try {
            // Load screener data
            await this.loadScreeners();
            
            // Initialize UI
            this.initializeUI();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            console.log('✅ Warrior Screener initialized with', this.screeners.length, 'screeners');
            
        } catch (error) {
            console.error('Failed to initialize Warrior Screener:', error);
        }
    }
    
    /**
     * Load screeners from CSV file
     */
    async loadScreeners() {
        try {
            const response = await fetch(this.csvPath);
            const csvText = await response.text();
            this.screeners = this.parseCSV(csvText);
            
            // Index screeners by ID for quick access
            this.screeners.forEach(screener => {
                this.filterCache.set(screener.screener_id, this.parseFilters(screener.filters));
            });
            
        } catch (error) {
            console.error('Error loading screeners:', error);
            // Load default screeners as fallback
            this.loadDefaultScreeners();
        }
    }
    
    /**
     * Parse CSV data into screener objects
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const screeners = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = this.parseCSVLine(lines[i]);
            const screener = {};
            
            headers.forEach((header, index) => {
                let value = values[index];
                
                // Convert data types
                if (header === 'alert_enabled') {
                    value = value === 'true';
                } else if (header === 'min_volume' || header === 'min_price' || header === 'max_price') {
                    value = parseFloat(value);
                } else if (header === 'success_rate') {
                    value = parseFloat(value);
                }
                
                screener[header] = value;
            });
            
            screeners.push(screener);
        }
        
        return screeners;
    }
    
    /**
     * Parse a CSV line handling quoted values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }
    
    /**
     * Parse filter string into executable conditions
     */
    parseFilters(filterString) {
        if (!filterString) return [];
        
        const conditions = filterString.split(';');
        const filters = [];
        
        conditions.forEach(condition => {
            const match = condition.match(/([a-z_]+)([><=]+)(.+)/i);
            if (match) {
                filters.push({
                    field: match[1],
                    operator: match[2],
                    value: this.parseFilterValue(match[3]),
                    original: condition
                });
            }
        });
        
        return filters;
    }
    
    /**
     * Parse filter value into appropriate type
     */
    parseFilterValue(value) {
        // Check for multiplication
        if (value.includes('*')) {
            const parts = value.split('*');
            return { type: 'multiply', field: parts[0], factor: parseFloat(parts[1]) };
        }
        
        // Check for boolean
        if (value === 'true' || value === 'false') {
            return value === 'true';
        }
        
        // Check for number
        if (!isNaN(value)) {
            return parseFloat(value);
        }
        
        // Return as string
        return value;
    }
    
    /**
     * Activate a screener for real-time monitoring
     */
    activateScreener(screenerId) {
        const screener = this.screeners.find(s => s.screener_id === screenerId);
        if (!screener) {
            console.error(`Screener ${screenerId} not found`);
            return false;
        }
        
        if (this.activeScreeners.has(screenerId)) {
            console.log(`Screener ${screenerId} already active`);
            return true;
        }
        
        this.activeScreeners.set(screenerId, {
            screener: screener,
            lastRun: null,
            matches: [],
            alerts: []
        });
        
        console.log(`✅ Activated screener: ${screener.name}`);
        
        // Run immediately
        this.runScreener(screenerId);
        
        return true;
    }
    
    /**
     * Deactivate a screener
     */
    deactivateScreener(screenerId) {
        if (this.activeScreeners.delete(screenerId)) {
            console.log(`❌ Deactivated screener: ${screenerId}`);
            return true;
        }
        return false;
    }
    
    /**
     * Run a specific screener
     */
    async runScreener(screenerId) {
        const active = this.activeScreeners.get(screenerId);
        if (!active) return;
        
        const screener = active.screener;
        console.log(`Running screener: ${screener.name}`);
        
        try {
            // Get market data (mock for now)
            const marketData = await this.getMarketData(screener);
            
            // Apply filters
            const matches = this.applyFilters(marketData, screener);
            
            // Check for new alerts
            const newAlerts = this.checkForAlerts(matches, active.matches);
            
            // Update active screener data
            active.lastRun = Date.now();
            active.matches = matches;
            active.alerts = [...active.alerts, ...newAlerts];
            
            // Trigger alerts if enabled
            if (screener.alert_enabled && newAlerts.length > 0) {
                this.triggerAlerts(screener, newAlerts);
            }
            
            // Update UI
            this.updateScreenerUI(screenerId, matches, newAlerts);
            
        } catch (error) {
            console.error(`Error running screener ${screenerId}:`, error);
        }
    }
    
    /**
     * Apply filters to market data
     */
    applyFilters(marketData, screener) {
        const filters = this.filterCache.get(screener.screener_id);
        const matches = [];
        
        marketData.forEach(stock => {
            if (this.matchesFilters(stock, filters, screener)) {
                matches.push({
                    ...stock,
                    matchTime: Date.now(),
                    screenerId: screener.screener_id,
                    screenerName: screener.name
                });
            }
        });
        
        // Sort matches
        if (screener.sort_by) {
            matches.sort((a, b) => {
                const field = screener.sort_by.replace('_desc', '').replace('_asc', '');
                const desc = screener.sort_by.includes('_desc');
                
                if (desc) {
                    return b[field] - a[field];
                } else {
                    return a[field] - b[field];
                }
            });
        }
        
        return matches;
    }
    
    /**
     * Check if stock matches all filters
     */
    matchesFilters(stock, filters, screener) {
        // Check basic criteria
        if (stock.volume < screener.min_volume) return false;
        if (stock.price < screener.min_price || stock.price > screener.max_price) return false;
        
        // Check all filter conditions
        for (const filter of filters) {
            if (!this.evaluateFilter(stock, filter)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Evaluate a single filter condition
     */
    evaluateFilter(stock, filter) {
        let stockValue = stock[filter.field];
        let compareValue = filter.value;
        
        // Handle multiplication values
        if (typeof compareValue === 'object' && compareValue.type === 'multiply') {
            compareValue = stock[compareValue.field] * compareValue.factor;
        }
        
        // Evaluate based on operator
        switch (filter.operator) {
            case '>':
                return stockValue > compareValue;
            case '<':
                return stockValue < compareValue;
            case '>=':
                return stockValue >= compareValue;
            case '<=':
                return stockValue <= compareValue;
            case '=':
            case '==':
                return stockValue === compareValue;
            default:
                return false;
        }
    }
    
    /**
     * Check for new alerts
     */
    checkForAlerts(currentMatches, previousMatches) {
        const newAlerts = [];
        const previousSymbols = new Set(previousMatches.map(m => m.symbol));
        
        currentMatches.forEach(match => {
            if (!previousSymbols.has(match.symbol)) {
                newAlerts.push({
                    symbol: match.symbol,
                    price: match.price,
                    change: match.change_percent,
                    volume: match.volume,
                    timestamp: Date.now(),
                    screenerName: match.screenerName
                });
            }
        });
        
        return newAlerts;
    }
    
    /**
     * Trigger alerts for new matches
     */
    triggerAlerts(screener, alerts) {
        alerts.forEach(alert => {
            // Play sound
            if (window.soundEngine) {
                const soundMap = {
                    'high': 'alert_hot',
                    'medium': 'alert_up',
                    'low': 'alert_warning'
                };
                window.soundEngine.play(soundMap[screener.priority] || 'alert_up');
            }
            
            // Show notification
            this.showNotification(screener, alert);
            
            // Log alert
            console.log(`🚨 ALERT [${screener.name}]: ${alert.symbol} @ $${alert.price} (${alert.change}%)`);
            
            // Dispatch custom event
            document.dispatchEvent(new CustomEvent('screenerAlert', {
                detail: { screener, alert }
            }));
        });
    }
    
    /**
     * Show browser notification
     */
    showNotification(screener, alert) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`AuraQuant: ${screener.name}`, {
                body: `${alert.symbol} triggered at $${alert.price} (${alert.change}%)`,
                icon: '/icons/favicon-192x192.png',
                badge: '/icons/favicon-96x96.png',
                tag: `${screener.screener_id}-${alert.symbol}`,
                requireInteraction: screener.priority === 'high'
            });
            
            notification.onclick = () => {
                window.focus();
                this.openStockDetails(alert.symbol);
            };
        }
    }
    
    /**
     * Get market data (mock implementation)
     */
    async getMarketData(screener) {
        // This would connect to real market data API
        // For now, return mock data for testing
        
        return [
            {
                symbol: 'AAPL',
                price: 178.50,
                change_percent: 2.5,
                volume: 75000000,
                gap_percent: 1.2,
                premarket_volume: 2000000,
                relative_volume: 1.8,
                rsi: 65,
                vwap: 177.80,
                sma20: 175.00,
                sma50: 170.00,
                sma200: 160.00,
                avg_volume: 65000000
            },
            {
                symbol: 'TSLA',
                price: 245.30,
                change_percent: 5.2,
                volume: 120000000,
                gap_percent: 4.5,
                premarket_volume: 5000000,
                relative_volume: 3.2,
                rsi: 72,
                vwap: 243.50,
                sma20: 235.00,
                sma50: 225.00,
                sma200: 200.00,
                avg_volume: 95000000
            },
            {
                symbol: 'NVDA',
                price: 455.80,
                change_percent: 3.8,
                volume: 55000000,
                gap_percent: 2.1,
                premarket_volume: 3000000,
                relative_volume: 2.5,
                rsi: 68,
                vwap: 454.20,
                sma20: 445.00,
                sma50: 420.00,
                sma200: 380.00,
                avg_volume: 45000000
            }
        ];
    }
    
    /**
     * Get screener by category
     */
    getScreenersByCategory(category) {
        return this.screeners.filter(s => s.category === category);
    }
    
    /**
     * Get screeners by risk level
     */
    getScreenersByRisk(riskLevel) {
        return this.screeners.filter(s => s.risk_level === riskLevel);
    }
    
    /**
     * Get top performing screeners
     */
    getTopPerformers(limit = 10) {
        return [...this.screeners]
            .sort((a, b) => b.success_rate - a.success_rate)
            .slice(0, limit);
    }
    
    /**
     * Get screener statistics
     */
    getScreenerStats(screenerId) {
        const screener = this.screeners.find(s => s.screener_id === screenerId);
        if (!screener) return null;
        
        const active = this.activeScreeners.get(screenerId);
        
        return {
            screener: screener,
            isActive: !!active,
            lastRun: active?.lastRun,
            currentMatches: active?.matches.length || 0,
            totalAlerts: active?.alerts.length || 0,
            successRate: screener.success_rate,
            riskLevel: screener.risk_level,
            category: screener.category
        };
    }
    
    /**
     * Export screener results
     */
    exportResults(screenerId, format = 'csv') {
        const active = this.activeScreeners.get(screenerId);
        if (!active || !active.matches.length) {
            console.log('No results to export');
            return;
        }
        
        let content;
        let filename;
        let type;
        
        if (format === 'csv') {
            content = this.exportToCSV(active.matches);
            filename = `${active.screener.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
            type = 'text/csv';
        } else if (format === 'json') {
            content = JSON.stringify(active.matches, null, 2);
            filename = `${active.screener.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
            type = 'application/json';
        }
        
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * Export to CSV format
     */
    exportToCSV(matches) {
        if (!matches.length) return '';
        
        const headers = Object.keys(matches[0]).join(',');
        const rows = matches.map(match => 
            Object.values(match).map(v => 
                typeof v === 'string' && v.includes(',') ? `"${v}"` : v
            ).join(',')
        );
        
        return [headers, ...rows].join('\n');
    }
    
    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        this.updateTimer = setInterval(() => {
            this.activeScreeners.forEach((active, screenerId) => {
                this.runScreener(screenerId);
            });
        }, this.updateInterval);
        
        console.log('Real-time updates started');
    }
    
    /**
     * Stop real-time updates
     */
    stopRealTimeUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        console.log('Real-time updates stopped');
    }
    
    /**
     * Initialize UI components
     */
    initializeUI() {
        const container = document.getElementById('screener-panel');
        if (!container) return;
        
        container.innerHTML = `
            <div class="screener-header">
                <h3>Warrior Screeners</h3>
                <div class="screener-controls">
                    <select id="screener-selector" class="screener-select">
                        <option value="">Select a screener...</option>
                        ${this.screeners.map(s => 
                            `<option value="${s.screener_id}">${s.name} (${(s.success_rate * 100).toFixed(0)}%)</option>`
                        ).join('')}
                    </select>
                    <button id="activate-screener" class="btn-primary">Activate</button>
                    <button id="export-results" class="btn-secondary">Export</button>
                </div>
            </div>
            
            <div class="active-screeners" id="active-screeners-list"></div>
            
            <div class="screener-results" id="screener-results"></div>
            
            <div class="screener-stats" id="screener-stats"></div>
        `;
        
        // Add event listeners
        document.getElementById('screener-selector')?.addEventListener('change', (e) => {
            this.showScreenerDetails(e.target.value);
        });
        
        document.getElementById('activate-screener')?.addEventListener('click', () => {
            const screenerId = document.getElementById('screener-selector').value;
            if (screenerId) {
                this.activateScreener(screenerId);
                this.updateActiveScreenersUI();
            }
        });
        
        document.getElementById('export-results')?.addEventListener('click', () => {
            const screenerId = document.getElementById('screener-selector').value;
            if (screenerId) {
                this.exportResults(screenerId);
            }
        });
    }
    
    /**
     * Update screener UI with results
     */
    updateScreenerUI(screenerId, matches, newAlerts) {
        const resultsContainer = document.getElementById('screener-results');
        if (!resultsContainer) return;
        
        const screener = this.screeners.find(s => s.screener_id === screenerId);
        
        // Update results
        resultsContainer.innerHTML = `
            <h4>${screener.name} Results</h4>
            <div class="results-summary">
                <span>Matches: ${matches.length}</span>
                <span>New Alerts: ${newAlerts.length}</span>
                <span>Last Run: ${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="results-list">
                ${matches.slice(0, 10).map(match => `
                    <div class="result-item">
                        <span class="symbol">${match.symbol}</span>
                        <span class="price">$${match.price.toFixed(2)}</span>
                        <span class="change ${match.change_percent > 0 ? 'positive' : 'negative'}">
                            ${match.change_percent > 0 ? '+' : ''}${match.change_percent.toFixed(2)}%
                        </span>
                        <span class="volume">${(match.volume / 1000000).toFixed(1)}M</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Update active screeners UI
     */
    updateActiveScreenersUI() {
        const container = document.getElementById('active-screeners-list');
        if (!container) return;
        
        const activeList = Array.from(this.activeScreeners.entries());
        
        container.innerHTML = `
            <h4>Active Screeners (${activeList.length})</h4>
            ${activeList.map(([id, active]) => `
                <div class="active-screener-item">
                    <span class="name">${active.screener.name}</span>
                    <span class="matches">${active.matches.length} matches</span>
                    <button onclick="warriorScreener.deactivateScreener('${id}')">Stop</button>
                </div>
            `).join('')}
        `;
    }
    
    /**
     * Show screener details
     */
    showScreenerDetails(screenerId) {
        if (!screenerId) return;
        
        const stats = this.getScreenerStats(screenerId);
        if (!stats) return;
        
        const container = document.getElementById('screener-stats');
        if (!container) return;
        
        container.innerHTML = `
            <h4>Screener Details</h4>
            <div class="stats-grid">
                <div class="stat">
                    <label>Category:</label>
                    <span>${stats.category}</span>
                </div>
                <div class="stat">
                    <label>Success Rate:</label>
                    <span>${(stats.successRate * 100).toFixed(0)}%</span>
                </div>
                <div class="stat">
                    <label>Risk Level:</label>
                    <span class="risk-${stats.riskLevel}">${stats.riskLevel}</span>
                </div>
                <div class="stat">
                    <label>Description:</label>
                    <span>${stats.screener.description}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.quickScreenerMenu();
            }
        });
    }
    
    /**
     * Quick screener menu
     */
    quickScreenerMenu() {
        const topScreeners = this.getTopPerformers(5);
        const selected = prompt(
            'Quick Screener Selection:\n\n' +
            topScreeners.map((s, i) => 
                `${i + 1}. ${s.name} (${(s.success_rate * 100).toFixed(0)}%)`
            ).join('\n') +
            '\n\nEnter number (1-5):'
        );
        
        if (selected && topScreeners[selected - 1]) {
            this.activateScreener(topScreeners[selected - 1].screener_id);
        }
    }
    
    /**
     * Open stock details
     */
    openStockDetails(symbol) {
        // This would open detailed stock view
        console.log(`Opening details for ${symbol}`);
        document.dispatchEvent(new CustomEvent('openStock', { detail: { symbol } }));
    }
    
    /**
     * Load default screeners (fallback)
     */
    loadDefaultScreeners() {
        this.screeners = [
            {
                screener_id: 'DEFAULT_001',
                name: 'Basic Momentum',
                category: 'Momentum',
                description: 'Simple momentum scanner',
                filters: 'volume>1000000;price>5;change_percent>3',
                sort_by: 'volume_desc',
                alert_enabled: true,
                priority: 'medium',
                markets: 'US',
                time_frame: 'daily',
                risk_level: 'medium',
                min_volume: 1000000,
                min_price: 5,
                max_price: 100,
                success_rate: 0.60
            }
        ];
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.stopRealTimeUpdates();
        this.activeScreeners.clear();
        this.alerts.clear();
        this.filterCache.clear();
    }
}

// Initialize warrior screener
let warriorScreener;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        warriorScreener = new WarriorScreener();
        window.warriorScreener = warriorScreener;
    });
} else {
    warriorScreener = new WarriorScreener();
    window.warriorScreener = warriorScreener;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WarriorScreener;
}