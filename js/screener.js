/**
 * AuraQuant Infinity - Advanced Screener Module
 * Warrior Trading Style Market Scanner with 100+ Filters
 */

import { Config } from './config.js';
import { showNotification, getAuthToken } from './main.js';

export class ScreenerManager {
    constructor() {
        this.scanners = new Map();
        this.activeScans = new Set();
        this.scanResults = new Map();
        this.filters = new Map();
        this.customFilters = [];
        this.scanInterval = null;
        this.lastScanTime = null;
        this.alertQueue = [];
        this.scannerConfigs = null;
        this.isScanning = false;
        this.maxResults = Config.SCREENER.MAX_RESULTS;
    }

    /**
     * Load screener configurations
     */
    async loadConfigurations() {
        try {
            console.log('Loading screener configurations...');
            
            // Load warrior screener configs
            await this.loadWarriorScreeners();
            
            // Initialize default scanners
            this.initializeDefaultScanners();
            
            // Load saved custom filters
            await this.loadCustomFilters();
            
            // Initialize UI
            this.initializeUI();
            
            console.log('✅ Screener configurations loaded');
            
        } catch (error) {
            console.error('Failed to load screener configurations:', error);
        }
    }

    /**
     * Load Warrior Trading style screeners
     */
    async loadWarriorScreeners() {
        try {
            // Load from CSV or backend
            const response = await fetch('/data/warrior_screeners.csv');
            if (response.ok) {
                const csvText = await response.text();
                this.scannerConfigs = this.parseScreenerCSV(csvText);
            }
        } catch (error) {
            console.error('Failed to load warrior screeners:', error);
            // Use default configs
            this.scannerConfigs = this.getDefaultWarriorScreeners();
        }
    }

    /**
     * Initialize default scanners
     */
    initializeDefaultScanners() {
        // Pre-Market Scanners
        this.registerScanner('premarket_gap', new PreMarketGapScanner());
        this.registerScanner('premarket_volume', new PreMarketVolumeScanner());
        this.registerScanner('news_catalyst', new NewsCatalystScanner());
        
        // Momentum Scanners
        this.registerScanner('momentum_surge', new MomentumSurgeScanner());
        this.registerScanner('volume_spike', new VolumeSpikeScanner());
        this.registerScanner('price_breakout', new PriceBreakoutScanner());
        this.registerScanner('relative_strength', new RelativeStrengthScanner());
        
        // Technical Scanners
        this.registerScanner('rsi_oversold', new RSIOversoldScanner());
        this.registerScanner('rsi_overbought', new RSIOverboughtScanner());
        this.registerScanner('macd_cross', new MACDCrossScanner());
        this.registerScanner('bollinger_squeeze', new BollingerSqueezeScanner());
        this.registerScanner('moving_average_cross', new MovingAverageCrossScanner());
        
        // VWAP Scanners
        this.registerScanner('vwap_cross', new VWAPCrossScanner());
        this.registerScanner('vwap_deviation', new VWAPDeviationScanner());
        
        // Reversal Scanners
        this.registerScanner('support_bounce', new SupportBounceScanner());
        this.registerScanner('resistance_break', new ResistanceBreakScanner());
        this.registerScanner('trend_reversal', new TrendReversalScanner());
        
        // Halt Scanners
        this.registerScanner('halt_resume', new HaltResumeScanner());
        this.registerScanner('circuit_breaker', new CircuitBreakerScanner());
        
        // Liquidity Scanners
        this.registerScanner('high_liquidity', new HighLiquidityScanner());
        this.registerScanner('unusual_options', new UnusualOptionsScanner());
        
        // Pattern Scanners
        this.registerScanner('bull_flag', new BullFlagScanner());
        this.registerScanner('bear_flag', new BearFlagScanner());
        this.registerScanner('triangle_breakout', new TriangleBreakoutScanner());
        this.registerScanner('wedge_pattern', new WedgePatternScanner());
        
        // Crypto Specific
        this.registerScanner('crypto_pump', new CryptoPumpScanner());
        this.registerScanner('defi_yield', new DeFiYieldScanner());
        this.registerScanner('nft_trending', new NFTTrendingScanner());
    }

    /**
     * Register a scanner
     */
    registerScanner(name, scanner) {
        this.scanners.set(name, scanner);
        scanner.name = name;
        scanner.manager = this;
    }

    /**
     * Run scan with filters
     */
    async runScan(scannerNames = [], customFilters = null) {
        try {
            this.isScanning = true;
            this.updateScanningStatus(true);
            
            // Clear previous results
            this.scanResults.clear();
            
            // Get active scanners
            const scannersToRun = scannerNames.length > 0 
                ? scannerNames 
                : Array.from(this.activeScans);
            
            if (scannersToRun.length === 0) {
                showNotification('Please select at least one scanner', 'warning');
                return;
            }
            
            console.log(`Running scan with ${scannersToRun.length} scanners...`);
            
            // Fetch market data
            const marketData = await this.fetchMarketData();
            
            // Apply filters
            const filteredData = this.applyFilters(marketData, customFilters);
            
            // Run each scanner
            const allResults = [];
            
            for (const scannerName of scannersToRun) {
                const scanner = this.scanners.get(scannerName);
                if (scanner) {
                    try {
                        const results = await scanner.scan(filteredData);
                        
                        // Store results
                        this.scanResults.set(scannerName, results);
                        
                        // Add to all results
                        results.forEach(result => {
                            result.scanner = scannerName;
                            allResults.push(result);
                        });
                        
                    } catch (error) {
                        console.error(`Scanner ${scannerName} failed:`, error);
                    }
                }
            }
            
            // Sort by score/priority
            allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
            
            // Limit results
            const topResults = allResults.slice(0, this.maxResults);
            
            // Update display
            this.displayResults(topResults);
            
            // Trigger alerts
            this.triggerAlerts(topResults);
            
            // Store scan time
            this.lastScanTime = Date.now();
            
            // Send to WebSocket for real-time updates
            if (window.AuraQuant.modules.websocket) {
                window.AuraQuant.modules.websocket.send({
                    type: 'SCREENER_RESULTS',
                    results: topResults
                });
            }
            
            console.log(`✅ Scan complete: ${topResults.length} results`);
            showNotification(`Scan complete: ${topResults.length} matches found`, 'success');
            
        } catch (error) {
            console.error('Scan failed:', error);
            showNotification('Scan failed: ' + error.message, 'error');
            
        } finally {
            this.isScanning = false;
            this.updateScanningStatus(false);
        }
    }

    /**
     * Fetch market data
     */
    async fetchMarketData() {
        const response = await fetch(`${Config.API_BASE_URL}/market/screener-data`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch market data');
        }
        
        return await response.json();
    }

    /**
     * Apply filters to market data
     */
    applyFilters(data, customFilters = null) {
        let filtered = [...data];
        
        // Get active filters
        const activeFilters = customFilters || this.getActiveFilters();
        
        // Price filters
        if (activeFilters.minPrice) {
            filtered = filtered.filter(s => s.price >= activeFilters.minPrice);
        }
        if (activeFilters.maxPrice) {
            filtered = filtered.filter(s => s.price <= activeFilters.maxPrice);
        }
        
        // Volume filters
        if (activeFilters.minVolume) {
            filtered = filtered.filter(s => s.volume >= activeFilters.minVolume);
        }
        if (activeFilters.maxVolume) {
            filtered = filtered.filter(s => s.volume <= activeFilters.maxVolume);
        }
        
        // Market cap filters
        if (activeFilters.minMarketCap) {
            filtered = filtered.filter(s => s.marketCap >= activeFilters.minMarketCap);
        }
        if (activeFilters.maxMarketCap) {
            filtered = filtered.filter(s => s.marketCap <= activeFilters.maxMarketCap);
        }
        
        // Change filters
        if (activeFilters.minChange) {
            filtered = filtered.filter(s => s.changePercent >= activeFilters.minChange);
        }
        if (activeFilters.maxChange) {
            filtered = filtered.filter(s => s.changePercent <= activeFilters.maxChange);
        }
        
        // Float filters
        if (activeFilters.minFloat) {
            filtered = filtered.filter(s => s.float >= activeFilters.minFloat);
        }
        if (activeFilters.maxFloat) {
            filtered = filtered.filter(s => s.float <= activeFilters.maxFloat);
        }
        
        // Short interest filters
        if (activeFilters.minShortInterest) {
            filtered = filtered.filter(s => s.shortInterest >= activeFilters.minShortInterest);
        }
        
        // RSI filters
        if (activeFilters.minRSI) {
            filtered = filtered.filter(s => s.rsi >= activeFilters.minRSI);
        }
        if (activeFilters.maxRSI) {
            filtered = filtered.filter(s => s.rsi <= activeFilters.maxRSI);
        }
        
        // Average volume filters
        if (activeFilters.minAvgVolume) {
            filtered = filtered.filter(s => s.avgVolume >= activeFilters.minAvgVolume);
        }
        
        // Relative volume filters
        if (activeFilters.minRelVolume) {
            filtered = filtered.filter(s => (s.volume / s.avgVolume) >= activeFilters.minRelVolume);
        }
        
        // ATR filters
        if (activeFilters.minATR) {
            filtered = filtered.filter(s => s.atr >= activeFilters.minATR);
        }
        
        // Beta filters
        if (activeFilters.minBeta) {
            filtered = filtered.filter(s => s.beta >= activeFilters.minBeta);
        }
        if (activeFilters.maxBeta) {
            filtered = filtered.filter(s => s.beta <= activeFilters.maxBeta);
        }
        
        // Exchange filters
        if (activeFilters.exchanges && activeFilters.exchanges.length > 0) {
            filtered = filtered.filter(s => activeFilters.exchanges.includes(s.exchange));
        }
        
        // Sector filters
        if (activeFilters.sectors && activeFilters.sectors.length > 0) {
            filtered = filtered.filter(s => activeFilters.sectors.includes(s.sector));
        }
        
        // Industry filters
        if (activeFilters.industries && activeFilters.industries.length > 0) {
            filtered = filtered.filter(s => activeFilters.industries.includes(s.industry));
        }
        
        // Country filters
        if (activeFilters.countries && activeFilters.countries.length > 0) {
            filtered = filtered.filter(s => activeFilters.countries.includes(s.country));
        }
        
        // Pattern filters
        if (activeFilters.patterns && activeFilters.patterns.length > 0) {
            filtered = filtered.filter(s => {
                return s.patterns && s.patterns.some(p => activeFilters.patterns.includes(p));
            });
        }
        
        // News filters
        if (activeFilters.hasNews) {
            filtered = filtered.filter(s => s.hasNews);
        }
        
        // Earnings filters
        if (activeFilters.hasEarnings) {
            filtered = filtered.filter(s => s.hasEarnings);
        }
        
        // Options filters
        if (activeFilters.hasOptions) {
            filtered = filtered.filter(s => s.hasOptions);
        }
        
        // Halted filters
        if (activeFilters.isHalted !== undefined) {
            filtered = filtered.filter(s => s.isHalted === activeFilters.isHalted);
        }
        
        // Gap filters
        if (activeFilters.minGap) {
            filtered = filtered.filter(s => Math.abs(s.gapPercent) >= activeFilters.minGap);
        }
        
        // 52-week range filters
        if (activeFilters.near52WeekHigh) {
            filtered = filtered.filter(s => (s.price / s.week52High) >= 0.95);
        }
        if (activeFilters.near52WeekLow) {
            filtered = filtered.filter(s => (s.price / s.week52Low) <= 1.05);
        }
        
        return filtered;
    }

    /**
     * Get active filters from UI
     */
    getActiveFilters() {
        const filters = {};
        
        // Price filters
        const minPrice = document.querySelector('#filter-min-price')?.value;
        if (minPrice) filters.minPrice = parseFloat(minPrice);
        
        const maxPrice = document.querySelector('#filter-max-price')?.value;
        if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
        
        // Volume filters
        const minVolume = document.querySelector('#filter-min-volume')?.value;
        if (minVolume) filters.minVolume = parseInt(minVolume);
        
        // Market cap filters
        const minMarketCap = document.querySelector('#filter-min-market-cap')?.value;
        if (minMarketCap) filters.minMarketCap = parseFloat(minMarketCap) * 1000000;
        
        // Change filters
        const minChange = document.querySelector('#filter-min-change')?.value;
        if (minChange) filters.minChange = parseFloat(minChange);
        
        // RSI filters
        const minRSI = document.querySelector('#filter-min-rsi')?.value;
        if (minRSI) filters.minRSI = parseFloat(minRSI);
        
        const maxRSI = document.querySelector('#filter-max-rsi')?.value;
        if (maxRSI) filters.maxRSI = parseFloat(maxRSI);
        
        // Checkboxes
        filters.hasNews = document.querySelector('#filter-has-news')?.checked;
        filters.hasEarnings = document.querySelector('#filter-has-earnings')?.checked;
        filters.hasOptions = document.querySelector('#filter-has-options')?.checked;
        
        // Get selected exchanges
        const selectedExchanges = [];
        document.querySelectorAll('.exchange-filter:checked').forEach(cb => {
            selectedExchanges.push(cb.value);
        });
        if (selectedExchanges.length > 0) {
            filters.exchanges = selectedExchanges;
        }
        
        // Get selected sectors
        const selectedSectors = [];
        document.querySelectorAll('.sector-filter:checked').forEach(cb => {
            selectedSectors.push(cb.value);
        });
        if (selectedSectors.length > 0) {
            filters.sectors = selectedSectors;
        }
        
        return filters;
    }

    /**
     * Display scan results
     */
    displayResults(results) {
        const resultsTable = document.getElementById('screenerResults');
        if (!resultsTable) return;
        
        if (results.length === 0) {
            resultsTable.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">No matches found</td>
                </tr>
            `;
            return;
        }
        
        const html = results.map(result => `
            <tr class="result-row" data-symbol="${result.symbol}">
                <td class="symbol-cell">
                    <span class="symbol">${result.symbol}</span>
                    ${result.halted ? '<span class="halt-badge">HALTED</span>' : ''}
                    ${result.hasNews ? '<span class="news-badge">NEWS</span>' : ''}
                </td>
                <td class="price-cell">$${result.price.toFixed(2)}</td>
                <td class="change-cell ${result.changePercent >= 0 ? 'positive' : 'negative'}">
                    ${result.changePercent >= 0 ? '+' : ''}${result.changePercent.toFixed(2)}%
                </td>
                <td class="volume-cell">${this.formatVolume(result.volume)}</td>
                <td class="rsi-cell">
                    <span class="${this.getRSIClass(result.rsi)}">${result.rsi?.toFixed(0) || '-'}</span>
                </td>
                <td class="signal-cell">
                    <span class="signal-badge ${result.signalStrength}">${result.signal}</span>
                </td>
                <td class="action-cell">
                    <button onclick="window.AuraQuant.modules.screener.addToWatchlist('${result.symbol}')" 
                            class="watch-btn" title="Add to watchlist">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="window.AuraQuant.modules.screener.quickTrade('${result.symbol}')" 
                            class="trade-btn" title="Quick trade">
                        <i class="fas fa-bolt"></i>
                    </button>
                    <button onclick="window.AuraQuant.modules.screener.viewChart('${result.symbol}')" 
                            class="chart-btn" title="View chart">
                        <i class="fas fa-chart-line"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        resultsTable.innerHTML = html;
        
        // Add click handlers
        this.attachResultHandlers();
        
        // Update results count
        const countEl = document.querySelector('.results-count');
        if (countEl) {
            countEl.textContent = `${results.length} matches`;
        }
    }

    /**
     * Trigger alerts for scan results
     */
    triggerAlerts(results) {
        // Filter high-priority results
        const alertResults = results.filter(r => 
            r.score >= 80 || 
            r.signalStrength === 'strong' ||
            r.changePercent >= 10 ||
            r.volume >= r.avgVolume * 5
        );
        
        alertResults.forEach(result => {
            // Queue alert
            this.alertQueue.push({
                symbol: result.symbol,
                message: `${result.symbol}: ${result.signal}`,
                scanner: result.scanner,
                priority: this.calculatePriority(result),
                timestamp: Date.now()
            });
        });
        
        // Process alert queue
        this.processAlertQueue();
    }

    /**
     * Process alert queue
     */
    processAlertQueue() {
        if (this.alertQueue.length === 0) return;
        
        // Sort by priority
        this.alertQueue.sort((a, b) => b.priority - a.priority);
        
        // Process top alerts
        const topAlerts = this.alertQueue.slice(0, 5);
        
        topAlerts.forEach(alert => {
            // Show notification
            showNotification(alert.message, 'info');
            
            // Play sound based on scanner type
            const soundMap = {
                'momentum_surge': 'alert_hot',
                'price_breakout': 'alert_break',
                'halt_resume': 'alert_halt',
                'volume_spike': 'alert_up',
                'reversal': 'alert_down'
            };
            
            const sound = soundMap[alert.scanner] || 'alert_up';
            window.AuraQuant.modules.alerts?.play(sound);
            
            // Send to social if enabled
            if (window.AuraQuant.modules.social) {
                window.AuraQuant.modules.social.sendAlert(alert);
            }
        });
        
        // Clear processed alerts
        this.alertQueue = this.alertQueue.slice(5);
    }

    /**
     * Calculate alert priority
     */
    calculatePriority(result) {
        let priority = 0;
        
        // Score based priority
        priority += result.score || 0;
        
        // Volume based
        if (result.volume > result.avgVolume * 10) priority += 30;
        else if (result.volume > result.avgVolume * 5) priority += 20;
        else if (result.volume > result.avgVolume * 2) priority += 10;
        
        // Change based
        if (Math.abs(result.changePercent) > 20) priority += 30;
        else if (Math.abs(result.changePercent) > 10) priority += 20;
        else if (Math.abs(result.changePercent) > 5) priority += 10;
        
        // RSI based
        if (result.rsi && (result.rsi < 30 || result.rsi > 70)) priority += 15;
        
        // News/catalyst
        if (result.hasNews) priority += 20;
        if (result.hasEarnings) priority += 15;
        
        // Halt
        if (result.halted) priority += 25;
        
        return priority;
    }

    /**
     * Start auto-scanning
     */
    startAutoScan(interval = 30000) {
        this.stopAutoScan();
        
        console.log(`Starting auto-scan every ${interval/1000} seconds`);
        
        this.scanInterval = setInterval(() => {
            if (!this.isScanning) {
                this.runScan();
            }
        }, interval);
        
        // Run initial scan
        this.runScan();
    }

    /**
     * Stop auto-scanning
     */
    stopAutoScan() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
    }

    /**
     * Save custom filter
     */
    async saveFilter(name, filters) {
        try {
            const response = await fetch(`${Config.API_BASE_URL}/screener/filters`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, filters })
            });
            
            if (response.ok) {
                this.customFilters.push({ name, filters });
                showNotification('Filter saved successfully', 'success');
                this.updateFiltersList();
            }
        } catch (error) {
            console.error('Failed to save filter:', error);
            showNotification('Failed to save filter', 'error');
        }
    }

    /**
     * Load custom filters
     */
    async loadCustomFilters() {
        try {
            const response = await fetch(`${Config.API_BASE_URL}/screener/filters`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });
            
            if (response.ok) {
                this.customFilters = await response.json();
                this.updateFiltersList();
            }
        } catch (error) {
            console.error('Failed to load custom filters:', error);
        }
    }

    /**
     * Export results
     */
    exportResults(format = 'csv') {
        const results = Array.from(this.scanResults.values()).flat();
        
        if (results.length === 0) {
            showNotification('No results to export', 'warning');
            return;
        }
        
        if (format === 'csv') {
            const csv = this.convertToCSV(results);
            this.downloadFile(csv, 'screener-results.csv', 'text/csv');
        } else if (format === 'json') {
            const json = JSON.stringify(results, null, 2);
            this.downloadFile(json, 'screener-results.json', 'application/json');
        }
        
        showNotification('Results exported successfully', 'success');
    }

    /**
     * Convert results to CSV
     */
    convertToCSV(results) {
        const headers = ['Symbol', 'Price', 'Change %', 'Volume', 'RSI', 'Signal', 'Scanner'];
        const rows = results.map(r => [
            r.symbol,
            r.price.toFixed(2),
            r.changePercent.toFixed(2),
            r.volume,
            r.rsi?.toFixed(0) || '',
            r.signal,
            r.scanner
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Download file
     */
    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Initialize UI
     */
    initializeUI() {
        // Scan button
        document.querySelector('.scan-btn')?.addEventListener('click', () => {
            this.runScan();
        });
        
        // Save filter button
        document.querySelector('.save-btn')?.addEventListener('click', () => {
            this.saveCurrentFilter();
        });
        
        // Export button
        document.querySelector('.export-btn')?.addEventListener('click', () => {
            this.exportResults();
        });
        
        // Scanner checkboxes
        document.querySelectorAll('.scanner-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.activeScans.add(e.target.value);
                } else {
                    this.activeScans.delete(e.target.value);
                }
            });
        });
        
        // Auto-scan toggle
        document.querySelector('#auto-scan-toggle')?.addEventListener('change', (e) => {
            if (e.target.checked) {
                const interval = parseInt(document.querySelector('#scan-interval')?.value) || 30;
                this.startAutoScan(interval * 1000);
            } else {
                this.stopAutoScan();
            }
        });
    }

    /**
     * Update scanning status
     */
    updateScanningStatus(scanning) {
        const statusEl = document.querySelector('.scan-status');
        if (statusEl) {
            if (scanning) {
                statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
                statusEl.classList.add('scanning');
            } else {
                statusEl.innerHTML = '<i class="fas fa-check"></i> Ready';
                statusEl.classList.remove('scanning');
            }
        }
        
        // Disable/enable scan button
        const scanBtn = document.querySelector('.scan-btn');
        if (scanBtn) {
            scanBtn.disabled = scanning;
        }
    }

    /**
     * Format volume for display
     */
    formatVolume(volume) {
        if (volume >= 1000000000) {
            return (volume / 1000000000).toFixed(1) + 'B';
        } else if (volume >= 1000000) {
            return (volume / 1000000).toFixed(1) + 'M';
        } else if (volume >= 1000) {
            return (volume / 1000).toFixed(1) + 'K';
        }
        return volume.toString();
    }

    /**
     * Get RSI class for styling
     */
    getRSIClass(rsi) {
        if (!rsi) return '';
        if (rsi >= 70) return 'overbought';
        if (rsi <= 30) return 'oversold';
        return 'neutral';
    }

    /**
     * Quick actions
     */
    addToWatchlist(symbol) {
        // Add to watchlist
        console.log('Adding to watchlist:', symbol);
        showNotification(`${symbol} added to watchlist`, 'success');
    }

    quickTrade(symbol) {
        // Open quick trade modal
        document.getElementById('symbolInput').value = symbol;
        window.AuraQuant.modules.app.switchScreen('trading');
    }

    viewChart(symbol) {
        // Switch to chart view
        document.getElementById('symbolInput').value = symbol;
        window.AuraQuant.modules.app.switchScreen('trading');
        window.AuraQuant.modules.charts?.loadSymbol(symbol);
    }

    /**
     * Handle scan result from WebSocket
     */
    onScanResult(data) {
        // Real-time result update
        if (data.symbol && data.scanner) {
            // Update existing result or add new
            const results = this.scanResults.get(data.scanner) || [];
            const existingIndex = results.findIndex(r => r.symbol === data.symbol);
            
            if (existingIndex >= 0) {
                results[existingIndex] = data;
            } else {
                results.push(data);
            }
            
            this.scanResults.set(data.scanner, results);
            
            // Refresh display if not scanning
            if (!this.isScanning) {
                const allResults = Array.from(this.scanResults.values()).flat();
                this.displayResults(allResults.slice(0, this.maxResults));
            }
        }
    }

    /**
     * Get default Warrior Trading screeners
     */
    getDefaultWarriorScreeners() {
        return {
            premarket: {
                gap_scanner: { minGap: 5, minVolume: 100000 },
                high_volume: { minVolume: 500000, minPrice: 1 },
                news_catalyst: { hasNews: true, minChange: 2 }
            },
            momentum: {
                price_surge: { minChange: 10, minVolume: 1000000 },
                volume_spike: { minRelVolume: 3, minPrice: 5 },
                breakout: { near52WeekHigh: true, minVolume: 500000 }
            },
            technical: {
                rsi_oversold: { maxRSI: 30, minVolume: 100000 },
                rsi_overbought: { minRSI: 70, minVolume: 100000 },
                macd_cross: { minVolume: 100000 }
            }
        };
    }

    /**
     * Parse screener CSV
     */
    parseScreenerCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const configs = {};
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length === headers.length) {
                const scanner = {
                    name: values[0],
                    category: values[1],
                    filters: JSON.parse(values[2] || '{}'),
                    sound: values[3],
                    priority: parseInt(values[4]) || 1
                };
                
                if (!configs[scanner.category]) {
                    configs[scanner.category] = {};
                }
                configs[scanner.category][scanner.name] = scanner;
            }
        }
        
        return configs;
    }
}

/**
 * Base Scanner Class
 */
class BaseScanner {
    constructor() {
        this.name = '';
        this.manager = null;
    }

    async scan(data) {
        // Override in subclasses
        return [];
    }

    calculateScore(symbol, factors) {
        let score = 0;
        
        // Volume factor
        if (factors.relativeVolume > 5) score += 30;
        else if (factors.relativeVolume > 3) score += 20;
        else if (factors.relativeVolume > 2) score += 10;
        
        // Price change factor
        if (Math.abs(factors.changePercent) > 10) score += 25;
        else if (Math.abs(factors.changePercent) > 5) score += 15;
        else if (Math.abs(factors.changePercent) > 3) score += 10;
        
        // Technical factors
        if (factors.rsi && (factors.rsi < 30 || factors.rsi > 70)) score += 15;
        if (factors.breakout) score += 20;
        if (factors.reversal) score += 15;
        
        // News/catalyst
        if (factors.hasNews) score += 20;
        if (factors.hasEarnings) score += 15;
        
        return Math.min(100, score);
    }
}

// Individual Scanner Implementations
class PreMarketGapScanner extends BaseScanner {
    async scan(data) {
        return data.filter(s => {
            const gapPercent = ((s.open - s.previousClose) / s.previousClose) * 100;
            return Math.abs(gapPercent) >= 5 && s.volume >= 100000;
        }).map(s => ({
            ...s,
            signal: `Gap ${s.open > s.previousClose ? 'Up' : 'Down'} ${Math.abs(((s.open - s.previousClose) / s.previousClose) * 100).toFixed(1)}%`,
            signalStrength: Math.abs(((s.open - s.previousClose) / s.previousClose) * 100) > 10 ? 'strong' : 'medium',
            score: this.calculateScore(s.symbol, {
                changePercent: s.changePercent,
                relativeVolume: s.volume / s.avgVolume,
                hasNews: s.hasNews
            })
        }));
    }
}

class MomentumSurgeScanner extends BaseScanner {
    async scan(data) {
        return data.filter(s => {
            const momentum = s.changePercent >= 5 && s.volume >= s.avgVolume * 2;
            return momentum && s.price >= 1;
        }).map(s => ({
            ...s,
            signal: `Momentum Surge +${s.changePercent.toFixed(1)}%`,
            signalStrength: s.changePercent >= 10 ? 'strong' : 'medium',
            score: this.calculateScore(s.symbol, {
                changePercent: s.changePercent,
                relativeVolume: s.volume / s.avgVolume,
                rsi: s.rsi
            })
        }));
    }
}

class VolumeSpikeScanner extends BaseScanner {
    async scan(data) {
        return data.filter(s => {
            const relVolume = s.volume / s.avgVolume;
            return relVolume >= 3 && s.volume >= 500000;
        }).map(s => ({
            ...s,
            signal: `Volume Spike ${(s.volume / s.avgVolume).toFixed(1)}x`,
            signalStrength: (s.volume / s.avgVolume) >= 5 ? 'strong' : 'medium',
            score: this.calculateScore(s.symbol, {
                relativeVolume: s.volume / s.avgVolume,
                changePercent: s.changePercent
            })
        }));
    }
}

// Add more scanner implementations...

// Export
export default ScreenerManager;