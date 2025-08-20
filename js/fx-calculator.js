/**
 * AuraQuant FX Calculator Module
 * Currency conversion, pip value calculation, margin requirements, position sizing
 */

class FXCalculator {
    constructor() {
        this.baseCurrency = 'USD';
        this.accountCurrency = 'USD';
        this.leverage = 100; // Default leverage 1:100
        this.exchangeRates = new Map();
        this.currencyPairs = new Map();
        this.lastUpdate = null;
        this.updateInterval = null;
        this.historicalRates = new Map();
        
        // Major currency pairs
        this.majorPairs = [
            'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
            'AUD/USD', 'USD/CAD', 'NZD/USD'
        ];
        
        // Cross pairs
        this.crossPairs = [
            'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/AUD',
            'EUR/CAD', 'GBP/CHF', 'AUD/JPY', 'CAD/JPY'
        ];
        
        // Exotic pairs
        this.exoticPairs = [
            'USD/SGD', 'USD/HKD', 'USD/MXN', 'USD/ZAR',
            'USD/THB', 'USD/TRY', 'USD/SEK', 'USD/NOK'
        ];
        
        // Crypto pairs
        this.cryptoPairs = [
            'BTC/USD', 'ETH/USD', 'BTC/EUR', 'ETH/EUR',
            'BTC/JPY', 'ETH/JPY', 'XRP/USD', 'LTC/USD'
        ];
        
        // Pip values (points)
        this.pipDecimals = {
            'JPY': 2,  // JPY pairs have 2 decimal places
            'default': 4  // Most pairs have 4 decimal places
        };
        
        this.init();
    }
    
    async init() {
        console.log('Initializing FX Calculator...');
        
        // Load saved rates
        this.loadSavedRates();
        
        // Fetch current rates
        await this.fetchExchangeRates();
        
        // Setup UI
        this.setupUI();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start auto-update
        this.startAutoUpdate();
        
        console.log('FX Calculator initialized');
    }
    
    loadSavedRates() {
        const saved = localStorage.getItem('fxRates');
        if (saved) {
            const data = JSON.parse(saved);
            data.rates.forEach(rate => {
                this.exchangeRates.set(rate.pair, rate);
            });
            this.lastUpdate = new Date(data.lastUpdate);
        } else {
            // Load default rates
            this.loadDefaultRates();
        }
    }
    
    loadDefaultRates() {
        const defaultRates = {
            'EUR/USD': { bid: 1.0850, ask: 1.0852, spread: 0.0002 },
            'GBP/USD': { bid: 1.2720, ask: 1.2722, spread: 0.0002 },
            'USD/JPY': { bid: 150.20, ask: 150.22, spread: 0.02 },
            'USD/CHF': { bid: 0.8810, ask: 0.8812, spread: 0.0002 },
            'AUD/USD': { bid: 0.6520, ask: 0.6522, spread: 0.0002 },
            'USD/CAD': { bid: 1.3510, ask: 1.3512, spread: 0.0002 },
            'NZD/USD': { bid: 0.5920, ask: 0.5922, spread: 0.0002 },
            'EUR/GBP': { bid: 0.8530, ask: 0.8532, spread: 0.0002 },
            'EUR/JPY': { bid: 163.00, ask: 163.02, spread: 0.02 },
            'GBP/JPY': { bid: 191.00, ask: 191.02, spread: 0.02 },
            'AUD/JPY': { bid: 97.80, ask: 97.82, spread: 0.02 },
            'BTC/USD': { bid: 65000, ask: 65100, spread: 100 },
            'ETH/USD': { bid: 3200, ask: 3205, spread: 5 }
        };
        
        Object.entries(defaultRates).forEach(([pair, rate]) => {
            this.exchangeRates.set(pair, {
                pair,
                ...rate,
                timestamp: new Date()
            });
        });
    }
    
    async fetchExchangeRates() {
        try {
            // In production, fetch from real API
            // For now, simulate with small random changes
            this.simulateRateChanges();
            
            this.lastUpdate = new Date();
            this.saveRates();
            
            // Update UI
            this.updateRatesDisplay();
            
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
        }
    }
    
    simulateRateChanges() {
        for (const [pair, rate] of this.exchangeRates) {
            const change = (Math.random() - 0.5) * 0.001; // Small random change
            rate.bid += change;
            rate.ask += change;
            rate.change = change;
            rate.changePercent = (change / rate.bid) * 100;
            rate.timestamp = new Date();
            
            // Store historical
            if (!this.historicalRates.has(pair)) {
                this.historicalRates.set(pair, []);
            }
            
            this.historicalRates.get(pair).push({
                bid: rate.bid,
                ask: rate.ask,
                timestamp: rate.timestamp
            });
            
            // Keep only last 100 points
            const history = this.historicalRates.get(pair);
            if (history.length > 100) {
                history.shift();
            }
        }
    }
    
    saveRates() {
        const data = {
            rates: Array.from(this.exchangeRates.values()),
            lastUpdate: this.lastUpdate
        };
        localStorage.setItem('fxRates', JSON.stringify(data));
    }
    
    // Core Calculation Methods
    
    convertCurrency(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) {
            return amount;
        }
        
        // Try direct pair
        let pair = `${fromCurrency}/${toCurrency}`;
        let rate = this.exchangeRates.get(pair);
        
        if (rate) {
            return amount * rate.bid;
        }
        
        // Try inverse pair
        pair = `${toCurrency}/${fromCurrency}`;
        rate = this.exchangeRates.get(pair);
        
        if (rate) {
            return amount / rate.ask;
        }
        
        // Try cross rate through USD
        if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
            const toUSD = this.convertCurrency(amount, fromCurrency, 'USD');
            return this.convertCurrency(toUSD, 'USD', toCurrency);
        }
        
        console.error(`Cannot convert ${fromCurrency} to ${toCurrency}`);
        return null;
    }
    
    calculatePipValue(pair, lotSize, accountCurrency = 'USD') {
        const [base, quote] = pair.split('/');
        const rate = this.exchangeRates.get(pair);
        
        if (!rate) {
            console.error(`Rate not found for ${pair}`);
            return null;
        }
        
        // Standard lot = 100,000 units
        // Mini lot = 10,000 units
        // Micro lot = 1,000 units
        const units = lotSize * 100000;
        
        let pipValue;
        
        // Determine pip size
        const pipSize = quote === 'JPY' || base === 'JPY' ? 0.01 : 0.0001;
        
        if (quote === accountCurrency) {
            // Quote currency is the account currency
            pipValue = units * pipSize;
        } else if (base === accountCurrency) {
            // Base currency is the account currency
            pipValue = (units * pipSize) / rate.bid;
        } else {
            // Cross rate needed
            pipValue = units * pipSize;
            pipValue = this.convertCurrency(pipValue, quote, accountCurrency);
        }
        
        return pipValue;
    }
    
    calculateRequiredMargin(pair, lotSize, leverage = 100) {
        const [base, quote] = pair.split('/');
        const rate = this.exchangeRates.get(pair);
        
        if (!rate) {
            console.error(`Rate not found for ${pair}`);
            return null;
        }
        
        const units = lotSize * 100000;
        const notionalValue = units * rate.bid;
        const requiredMargin = notionalValue / leverage;
        
        // Convert to account currency if needed
        if (base !== this.accountCurrency) {
            return this.convertCurrency(requiredMargin, base, this.accountCurrency);
        }
        
        return requiredMargin;
    }
    
    calculatePositionSize(riskAmount, stopLossPips, pair) {
        const pipValue = this.calculatePipValue(pair, 1, this.accountCurrency);
        
        if (!pipValue) {
            console.error('Cannot calculate pip value');
            return null;
        }
        
        // Position size in lots
        const positionSize = riskAmount / (stopLossPips * pipValue);
        
        return {
            lots: positionSize,
            units: positionSize * 100000,
            pipValue: pipValue,
            riskAmount: riskAmount,
            stopLossPips: stopLossPips
        };
    }
    
    calculateProfitLoss(pair, lotSize, entryPrice, exitPrice, side = 'buy') {
        const pips = this.calculatePips(pair, entryPrice, exitPrice, side);
        const pipValue = this.calculatePipValue(pair, lotSize, this.accountCurrency);
        
        if (!pipValue) {
            return null;
        }
        
        return {
            pips: pips,
            profit: pips * pipValue,
            profitPercent: (pips * pipValue) / (this.calculateRequiredMargin(pair, lotSize, this.leverage)) * 100
        };
    }
    
    calculatePips(pair, entryPrice, exitPrice, side = 'buy') {
        const [base, quote] = pair.split('/');
        const multiplier = quote === 'JPY' || base === 'JPY' ? 100 : 10000;
        
        let pips;
        if (side === 'buy') {
            pips = (exitPrice - entryPrice) * multiplier;
        } else {
            pips = (entryPrice - exitPrice) * multiplier;
        }
        
        return pips;
    }
    
    calculateSpread(pair) {
        const rate = this.exchangeRates.get(pair);
        if (!rate) return null;
        
        const [base, quote] = pair.split('/');
        const multiplier = quote === 'JPY' || base === 'JPY' ? 100 : 10000;
        
        return (rate.ask - rate.bid) * multiplier;
    }
    
    calculateSwap(pair, lotSize, days, swapRate) {
        // Swap calculation (simplified)
        const notionalValue = this.calculateRequiredMargin(pair, lotSize, 1); // No leverage
        const dailySwap = (notionalValue * swapRate) / 365;
        
        return dailySwap * days;
    }
    
    // Risk Management Calculations
    
    calculateRiskRewardRatio(stopLossPips, takeProfitPips) {
        return takeProfitPips / stopLossPips;
    }
    
    calculateBreakeven(pair, lotSize, commission, spread) {
        const pipValue = this.calculatePipValue(pair, lotSize, this.accountCurrency);
        const spreadCost = spread * pipValue;
        const totalCost = commission + spreadCost;
        
        return totalCost / pipValue; // Breakeven in pips
    }
    
    calculateKellyPercent(winRate, avgWin, avgLoss) {
        // Kelly Criterion: f = (p * b - q) / b
        // where f = fraction to bet, p = win probability, q = loss probability, b = odds
        const q = 1 - winRate;
        const b = avgWin / avgLoss;
        const kelly = (winRate * b - q) / b;
        
        // Apply Kelly fraction (usually 25% of full Kelly)
        return Math.max(0, Math.min(kelly * 0.25, 0.02)); // Cap at 2% risk
    }
    
    // Correlation Analysis
    
    calculateCorrelation(pair1, pair2, periods = 20) {
        const history1 = this.historicalRates.get(pair1);
        const history2 = this.historicalRates.get(pair2);
        
        if (!history1 || !history2 || history1.length < periods) {
            return null;
        }
        
        // Get returns
        const returns1 = this.calculateReturns(history1, periods);
        const returns2 = this.calculateReturns(history2, periods);
        
        // Calculate correlation
        const correlation = this.pearsonCorrelation(returns1, returns2);
        
        return correlation;
    }
    
    calculateReturns(history, periods) {
        const returns = [];
        for (let i = 1; i < Math.min(periods, history.length); i++) {
            const return_i = (history[i].bid - history[i-1].bid) / history[i-1].bid;
            returns.push(return_i);
        }
        return returns;
    }
    
    pearsonCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        if (n === 0) return 0;
        
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
            sumY2 += y[i] * y[i];
        }
        
        const correlation = (n * sumXY - sumX * sumY) / 
            Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        return correlation;
    }
    
    // UI Methods
    
    setupUI() {
        this.createCalculatorPanel();
        this.updateRatesDisplay();
    }
    
    createCalculatorPanel() {
        const panel = document.getElementById('fx-calculator-screen');
        if (!panel) return;
        
        panel.innerHTML = `
            <div class="fx-calculator-container">
                <!-- Currency Converter -->
                <div class="card converter-card">
                    <h3>Currency Converter</h3>
                    <div class="converter-inputs">
                        <div class="input-group">
                            <input type="number" id="fromAmount" value="1000" step="0.01">
                            <select id="fromCurrency">
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="JPY">JPY</option>
                                <option value="AUD">AUD</option>
                                <option value="CAD">CAD</option>
                                <option value="CHF">CHF</option>
                                <option value="NZD">NZD</option>
                            </select>
                        </div>
                        <button class="swap-btn" id="swapCurrencies">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                        <div class="input-group">
                            <input type="number" id="toAmount" readonly>
                            <select id="toCurrency">
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                                <option value="GBP">GBP</option>
                                <option value="JPY">JPY</option>
                                <option value="AUD">AUD</option>
                                <option value="CAD">CAD</option>
                                <option value="CHF">CHF</option>
                                <option value="NZD">NZD</option>
                            </select>
                        </div>
                    </div>
                    <div class="exchange-rate-display">
                        <span id="exchangeRateDisplay">1 USD = 0.9217 EUR</span>
                    </div>
                </div>
                
                <!-- Pip Value Calculator -->
                <div class="card pip-calculator">
                    <h3>Pip Value Calculator</h3>
                    <div class="calculator-form">
                        <div class="form-group">
                            <label>Currency Pair</label>
                            <select id="pipPair">
                                ${this.generatePairOptions()}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Lot Size</label>
                            <input type="number" id="pipLotSize" value="1" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Account Currency</label>
                            <select id="pipAccountCurrency">
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" id="calculatePipValue">Calculate</button>
                        <div class="result-display">
                            <label>Pip Value:</label>
                            <span id="pipValueResult">$10.00</span>
                        </div>
                    </div>
                </div>
                
                <!-- Position Size Calculator -->
                <div class="card position-calculator">
                    <h3>Position Size Calculator</h3>
                    <div class="calculator-form">
                        <div class="form-group">
                            <label>Account Balance</label>
                            <input type="number" id="accountBalance" value="10000" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Risk Percentage</label>
                            <input type="number" id="riskPercentage" value="2" step="0.1" max="100">
                        </div>
                        <div class="form-group">
                            <label>Stop Loss (pips)</label>
                            <input type="number" id="stopLossPips" value="50" step="1">
                        </div>
                        <div class="form-group">
                            <label>Currency Pair</label>
                            <select id="positionPair">
                                ${this.generatePairOptions()}
                            </select>
                        </div>
                        <button class="btn btn-primary" id="calculatePosition">Calculate</button>
                        <div class="results-grid">
                            <div class="result-item">
                                <label>Risk Amount:</label>
                                <span id="riskAmountResult">$200</span>
                            </div>
                            <div class="result-item">
                                <label>Position Size:</label>
                                <span id="positionSizeResult">0.4 lots</span>
                            </div>
                            <div class="result-item">
                                <label>Units:</label>
                                <span id="unitsResult">40,000</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Margin Calculator -->
                <div class="card margin-calculator">
                    <h3>Margin Calculator</h3>
                    <div class="calculator-form">
                        <div class="form-group">
                            <label>Currency Pair</label>
                            <select id="marginPair">
                                ${this.generatePairOptions()}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Lot Size</label>
                            <input type="number" id="marginLotSize" value="1" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Leverage</label>
                            <select id="leverageSelect">
                                <option value="10">1:10</option>
                                <option value="30">1:30</option>
                                <option value="50">1:50</option>
                                <option value="100" selected>1:100</option>
                                <option value="200">1:200</option>
                                <option value="500">1:500</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" id="calculateMargin">Calculate</button>
                        <div class="result-display">
                            <label>Required Margin:</label>
                            <span id="marginResult">$1,000.00</span>
                        </div>
                    </div>
                </div>
                
                <!-- Profit/Loss Calculator -->
                <div class="card pnl-calculator">
                    <h3>Profit/Loss Calculator</h3>
                    <div class="calculator-form">
                        <div class="form-group">
                            <label>Currency Pair</label>
                            <select id="pnlPair">
                                ${this.generatePairOptions()}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Position</label>
                            <select id="positionSide">
                                <option value="buy">Buy/Long</option>
                                <option value="sell">Sell/Short</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Lot Size</label>
                            <input type="number" id="pnlLotSize" value="1" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Entry Price</label>
                            <input type="number" id="entryPrice" value="1.0850" step="0.00001">
                        </div>
                        <div class="form-group">
                            <label>Exit Price</label>
                            <input type="number" id="exitPrice" value="1.0900" step="0.00001">
                        </div>
                        <button class="btn btn-primary" id="calculatePnL">Calculate</button>
                        <div class="results-grid">
                            <div class="result-item">
                                <label>Pips:</label>
                                <span id="pipsResult">50</span>
                            </div>
                            <div class="result-item">
                                <label>Profit/Loss:</label>
                                <span id="pnlResult" class="profit">+$500.00</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Live Rates Display -->
                <div class="card rates-display">
                    <h3>Live Exchange Rates</h3>
                    <div class="rates-grid" id="liveRatesGrid">
                        <!-- Rates will be populated here -->
                    </div>
                    <div class="last-update">
                        Last Update: <span id="lastUpdateTime"></span>
                    </div>
                </div>
                
                <!-- Correlation Matrix -->
                <div class="card correlation-matrix">
                    <h3>Currency Correlation</h3>
                    <div class="matrix-container" id="correlationMatrix">
                        <!-- Correlation matrix will be displayed here -->
                    </div>
                </div>
            </div>
        `;
    }
    
    generatePairOptions() {
        const allPairs = [
            ...this.majorPairs,
            ...this.crossPairs,
            ...this.exoticPairs,
            ...this.cryptoPairs
        ];
        
        return allPairs.map(pair => 
            `<option value="${pair}">${pair}</option>`
        ).join('');
    }
    
    updateRatesDisplay() {
        const grid = document.getElementById('liveRatesGrid');
        if (!grid) return;
        
        const ratesHTML = Array.from(this.exchangeRates.entries())
            .slice(0, 12) // Show first 12 pairs
            .map(([pair, rate]) => {
                const changeClass = rate.change >= 0 ? 'up' : 'down';
                const arrow = rate.change >= 0 ? '▲' : '▼';
                
                return `
                    <div class="rate-card">
                        <div class="pair-name">${pair}</div>
                        <div class="bid-ask">
                            <span class="bid">${rate.bid.toFixed(this.getDecimals(pair))}</span>
                            <span class="separator">/</span>
                            <span class="ask">${rate.ask.toFixed(this.getDecimals(pair))}</span>
                        </div>
                        <div class="change ${changeClass}">
                            <span class="arrow">${arrow}</span>
                            <span class="percent">${Math.abs(rate.changePercent || 0).toFixed(2)}%</span>
                        </div>
                        <div class="spread">Spread: ${this.calculateSpread(pair)?.toFixed(1)} pips</div>
                    </div>
                `;
            }).join('');
        
        grid.innerHTML = ratesHTML;
        
        // Update timestamp
        const timeDisplay = document.getElementById('lastUpdateTime');
        if (timeDisplay) {
            timeDisplay.textContent = this.lastUpdate ? 
                this.lastUpdate.toLocaleTimeString() : 'Never';
        }
    }
    
    getDecimals(pair) {
        const [base, quote] = pair.split('/');
        if (quote === 'JPY' || base === 'JPY') {
            return 2;
        }
        if (pair.includes('BTC') || pair.includes('ETH')) {
            return 0;
        }
        return 4;
    }
    
    displayCorrelationMatrix() {
        const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'];
        const matrix = document.getElementById('correlationMatrix');
        if (!matrix) return;
        
        let html = '<table class="correlation-table"><thead><tr><th></th>';
        
        // Headers
        pairs.forEach(pair => {
            html += `<th>${pair}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        // Rows
        pairs.forEach(pair1 => {
            html += `<tr><th>${pair1}</th>`;
            pairs.forEach(pair2 => {
                if (pair1 === pair2) {
                    html += '<td class="correlation-cell perfect">1.00</td>';
                } else {
                    const correlation = this.calculateCorrelation(pair1, pair2, 20) || 0;
                    const cellClass = this.getCorrelationClass(correlation);
                    html += `<td class="correlation-cell ${cellClass}">${correlation.toFixed(2)}</td>`;
                }
            });
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        matrix.innerHTML = html;
    }
    
    getCorrelationClass(correlation) {
        const abs = Math.abs(correlation);
        if (abs > 0.8) return 'strong';
        if (abs > 0.5) return 'medium';
        if (abs > 0.2) return 'weak';
        return 'none';
    }
    
    setupEventListeners() {
        // Currency converter
        document.addEventListener('input', (e) => {
            if (e.target.id === 'fromAmount') {
                this.updateConversion();
            }
        });
        
        document.addEventListener('change', (e) => {
            if (e.target.id === 'fromCurrency' || e.target.id === 'toCurrency') {
                this.updateConversion();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (e.target.id === 'swapCurrencies' || e.target.closest('#swapCurrencies')) {
                this.swapCurrencies();
            }
            
            if (e.target.id === 'calculatePipValue') {
                this.displayPipValue();
            }
            
            if (e.target.id === 'calculatePosition') {
                this.displayPositionSize();
            }
            
            if (e.target.id === 'calculateMargin') {
                this.displayMargin();
            }
            
            if (e.target.id === 'calculatePnL') {
                this.displayPnL();
            }
        });
        
        // Update rates when switching to FX calculator screen
        document.addEventListener('click', (e) => {
            if (e.target.dataset.screen === 'fx-calculator') {
                this.fetchExchangeRates();
                this.displayCorrelationMatrix();
            }
        });
    }
    
    updateConversion() {
        const fromAmount = parseFloat(document.getElementById('fromAmount')?.value) || 0;
        const fromCurrency = document.getElementById('fromCurrency')?.value;
        const toCurrency = document.getElementById('toCurrency')?.value;
        
        if (!fromCurrency || !toCurrency) return;
        
        const result = this.convertCurrency(fromAmount, fromCurrency, toCurrency);
        
        const toAmountInput = document.getElementById('toAmount');
        if (toAmountInput && result !== null) {
            toAmountInput.value = result.toFixed(2);
        }
        
        // Update exchange rate display
        const rateDisplay = document.getElementById('exchangeRateDisplay');
        if (rateDisplay) {
            const rate = this.convertCurrency(1, fromCurrency, toCurrency);
            if (rate !== null) {
                rateDisplay.textContent = `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
            }
        }
    }
    
    swapCurrencies() {
        const fromCurrency = document.getElementById('fromCurrency');
        const toCurrency = document.getElementById('toCurrency');
        
        if (fromCurrency && toCurrency) {
            const temp = fromCurrency.value;
            fromCurrency.value = toCurrency.value;
            toCurrency.value = temp;
            
            this.updateConversion();
        }
    }
    
    displayPipValue() {
        const pair = document.getElementById('pipPair')?.value;
        const lotSize = parseFloat(document.getElementById('pipLotSize')?.value) || 1;
        const accountCurrency = document.getElementById('pipAccountCurrency')?.value || 'USD';
        
        const pipValue = this.calculatePipValue(pair, lotSize, accountCurrency);
        
        const result = document.getElementById('pipValueResult');
        if (result && pipValue !== null) {
            result.textContent = `${accountCurrency === 'USD' ? '$' : accountCurrency} ${pipValue.toFixed(2)}`;
        }
    }
    
    displayPositionSize() {
        const balance = parseFloat(document.getElementById('accountBalance')?.value) || 10000;
        const riskPercent = parseFloat(document.getElementById('riskPercentage')?.value) || 2;
        const stopLossPips = parseFloat(document.getElementById('stopLossPips')?.value) || 50;
        const pair = document.getElementById('positionPair')?.value;
        
        const riskAmount = balance * (riskPercent / 100);
        const result = this.calculatePositionSize(riskAmount, stopLossPips, pair);
        
        if (result) {
            document.getElementById('riskAmountResult').textContent = `$${riskAmount.toFixed(2)}`;
            document.getElementById('positionSizeResult').textContent = `${result.lots.toFixed(2)} lots`;
            document.getElementById('unitsResult').textContent = result.units.toLocaleString();
        }
    }
    
    displayMargin() {
        const pair = document.getElementById('marginPair')?.value;
        const lotSize = parseFloat(document.getElementById('marginLotSize')?.value) || 1;
        const leverage = parseFloat(document.getElementById('leverageSelect')?.value) || 100;
        
        const margin = this.calculateRequiredMargin(pair, lotSize, leverage);
        
        const result = document.getElementById('marginResult');
        if (result && margin !== null) {
            result.textContent = `$${margin.toFixed(2)}`;
        }
    }
    
    displayPnL() {
        const pair = document.getElementById('pnlPair')?.value;
        const side = document.getElementById('positionSide')?.value;
        const lotSize = parseFloat(document.getElementById('pnlLotSize')?.value) || 1;
        const entryPrice = parseFloat(document.getElementById('entryPrice')?.value);
        const exitPrice = parseFloat(document.getElementById('exitPrice')?.value);
        
        const result = this.calculateProfitLoss(pair, lotSize, entryPrice, exitPrice, side);
        
        if (result) {
            document.getElementById('pipsResult').textContent = result.pips.toFixed(1);
            
            const pnlElement = document.getElementById('pnlResult');
            pnlElement.textContent = `${result.profit >= 0 ? '+' : ''}$${result.profit.toFixed(2)}`;
            pnlElement.className = result.profit >= 0 ? 'profit' : 'loss';
        }
    }
    
    startAutoUpdate() {
        // Update rates every 30 seconds
        this.updateInterval = setInterval(() => {
            this.fetchExchangeRates();
        }, 30000);
    }
    
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize FX Calculator when document is ready
if (typeof window !== 'undefined') {
    window.fxCalculator = null;
    
    document.addEventListener('DOMContentLoaded', () => {
        window.fxCalculator = new FXCalculator();
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FXCalculator;
}