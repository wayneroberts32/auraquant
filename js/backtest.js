// Backtesting Module - Advanced strategy testing for AuraQuant
// Features: Strategy backtesting, walk-forward analysis, Monte Carlo simulation, optimization

class BacktestModule {
    constructor() {
        this.strategies = new Map();
        this.backtests = new Map();
        this.activeBacktest = null;
        this.historicalData = new Map();
        this.optimizations = new Map();
        
        // Backtest configuration
        this.config = {
            initialCapital: 100000,
            commission: 0.001, // 0.1%
            slippage: 0.0005, // 0.05%
            marginRequirement: 0.25, // 25% for margin trading
            maxPositionSize: 0.1, // 10% of capital per position
            includeCosts: true,
            pyramiding: 0, // Max number of same direction entries
            defaultQuantity: 100,
            currency: 'USD'
        };
        
        // Strategy templates
        this.strategyTemplates = {
            'movingAverageCrossover': {
                name: 'MA Crossover',
                description: 'Buy when fast MA crosses above slow MA',
                params: { fastPeriod: 20, slowPeriod: 50 },
                type: 'trend'
            },
            'rsiOversold': {
                name: 'RSI Oversold/Overbought',
                description: 'Buy oversold, sell overbought',
                params: { period: 14, oversold: 30, overbought: 70 },
                type: 'momentum'
            },
            'bollingerBands': {
                name: 'Bollinger Bands Squeeze',
                description: 'Trade breakouts from BB squeeze',
                params: { period: 20, stdDev: 2 },
                type: 'volatility'
            },
            'macdSignal': {
                name: 'MACD Signal Cross',
                description: 'Trade MACD signal line crosses',
                params: { fast: 12, slow: 26, signal: 9 },
                type: 'momentum'
            },
            'breakout': {
                name: 'Price Breakout',
                description: 'Buy on N-period high breakout',
                params: { period: 20, confirmBars: 2 },
                type: 'breakout'
            },
            'meanReversion': {
                name: 'Mean Reversion',
                description: 'Fade extreme moves',
                params: { period: 20, threshold: 2 },
                type: 'meanReversion'
            },
            'turtleTrading': {
                name: 'Turtle Trading System',
                description: 'Classic Turtle breakout system',
                params: { entry: 20, exit: 10, atrPeriod: 20 },
                type: 'trend'
            },
            'gridTrading': {
                name: 'Grid Trading',
                description: 'Place orders at regular intervals',
                params: { gridSize: 10, levels: 5 },
                type: 'grid'
            }
        };
        
        // Performance metrics
        this.metricsCalculators = {
            winRate: this.calculateWinRate,
            profitFactor: this.calculateProfitFactor,
            sharpeRatio: this.calculateSharpeRatio,
            sortinoRatio: this.calculateSortinoRatio,
            calmarRatio: this.calculateCalmarRatio,
            maxDrawdown: this.calculateMaxDrawdown,
            expectedValue: this.calculateExpectedValue,
            kellyPercent: this.calculateKellyPercent,
            var: this.calculateValueAtRisk,
            cvar: this.calculateConditionalVaR
        };
        
        this.init();
    }
    
    async init() {
        console.log('Initializing Backtest Module...');
        
        // Load saved strategies
        this.loadStrategies();
        
        // Load backtest history
        this.loadBacktestHistory();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('Backtest Module initialized');
    }
    
    loadStrategies() {
        const saved = localStorage.getItem('backtestStrategies');
        if (saved) {
            const strategies = JSON.parse(saved);
            strategies.forEach(strategy => {
                this.strategies.set(strategy.id, strategy);
            });
        }
    }
    
    loadBacktestHistory() {
        const saved = localStorage.getItem('backtestHistory');
        if (saved) {
            const history = JSON.parse(saved);
            history.forEach(backtest => {
                this.backtests.set(backtest.id, backtest);
            });
        }
    }
    
    createStrategy(name, code, params = {}) {
        const strategyId = `strategy_${Date.now()}`;
        
        const strategy = {
            id: strategyId,
            name,
            code,
            params,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            version: 1
        };
        
        // Compile strategy code
        try {
            strategy.compiled = this.compileStrategy(code);
            strategy.valid = true;
        } catch (error) {
            console.error('Strategy compilation failed:', error);
            strategy.error = error.message;
            strategy.valid = false;
        }
        
        this.strategies.set(strategyId, strategy);
        this.saveStrategies();
        
        return strategyId;
    }
    
    compileStrategy(code) {
        // Parse and compile strategy code
        // This would compile Pine Script or JavaScript strategy code
        
        // For now, create a function from the code string
        // In production, use a proper parser/compiler
        
        const strategyFunction = new Function('data', 'params', 'indicators', code);
        
        return strategyFunction;
    }
    
    async runBacktest(strategyId, options = {}) {
        const strategy = this.strategies.get(strategyId);
        if (!strategy || !strategy.valid) {
            throw new Error('Invalid strategy');
        }
        
        const backtestId = `backtest_${Date.now()}`;
        
        // Backtest configuration
        const config = {
            ...this.config,
            ...options,
            strategyId,
            symbol: options.symbol || 'AAPL',
            timeframe: options.timeframe || '1d',
            startDate: options.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            endDate: options.endDate || new Date(),
            benchmark: options.benchmark || 'SPY'
        };
        
        // Create backtest instance
        const backtest = {
            id: backtestId,
            strategyId,
            strategyName: strategy.name,
            config,
            status: 'running',
            progress: 0,
            startTime: new Date().toISOString(),
            trades: [],
            positions: [],
            equity: [config.initialCapital],
            drawdown: [],
            returns: [],
            metrics: {}
        };
        
        this.backtests.set(backtestId, backtest);
        this.activeBacktest = backtest;
        
        try {
            // Load historical data
            const data = await this.loadHistoricalData(
                config.symbol,
                config.timeframe,
                config.startDate,
                config.endDate
            );
            
            // Run the backtest
            await this.executeBacktest(backtest, strategy, data);
            
            // Calculate performance metrics
            backtest.metrics = this.calculateMetrics(backtest);
            
            // Generate report
            backtest.report = this.generateReport(backtest);
            
            backtest.status = 'completed';
            backtest.endTime = new Date().toISOString();
            
            // Save backtest results
            this.saveBacktestHistory();
            
            // Update UI
            this.displayResults(backtest);
            
        } catch (error) {
            console.error('Backtest failed:', error);
            backtest.status = 'failed';
            backtest.error = error.message;
        }
        
        return backtestId;
    }
    
    async loadHistoricalData(symbol, timeframe, startDate, endDate) {
        // Check cache first
        const cacheKey = `${symbol}_${timeframe}_${startDate}_${endDate}`;
        if (this.historicalData.has(cacheKey)) {
            return this.historicalData.get(cacheKey);
        }
        
        // Fetch from data provider
        let data;
        if (window.marketData && window.marketData.getHistoricalData) {
            data = await window.marketData.getHistoricalData(symbol, timeframe, startDate, endDate);
        } else {
            // Generate mock data for testing
            data = this.generateMockData(symbol, timeframe, startDate, endDate);
        }
        
        // Cache the data
        this.historicalData.set(cacheKey, data);
        
        return data;
    }
    
    generateMockData(symbol, timeframe, startDate, endDate) {
        const data = [];
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const interval = this.getIntervalMilliseconds(timeframe);
        
        let price = 100 + Math.random() * 50;
        let volume = 1000000;
        
        for (let time = start; time <= end; time += interval) {
            const volatility = 0.02;
            const trend = Math.sin(time / (interval * 100)) * 5;
            
            const open = price;
            const change = (Math.random() - 0.5) * volatility * price;
            const close = open + change + trend * 0.01;
            const high = Math.max(open, close) * (1 + Math.random() * volatility);
            const low = Math.min(open, close) * (1 - Math.random() * volatility);
            
            data.push({
                time: Math.floor(time / 1000),
                open,
                high,
                low,
                close,
                volume: volume * (0.5 + Math.random())
            });
            
            price = close;
        }
        
        return data;
    }
    
    getIntervalMilliseconds(timeframe) {
        const intervals = {
            '1m': 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '30m': 30 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000,
            '1w': 7 * 24 * 60 * 60 * 1000
        };
        
        return intervals[timeframe] || intervals['1d'];
    }
    
    async executeBacktest(backtest, strategy, data) {
        const config = backtest.config;
        let capital = config.initialCapital;
        let position = null;
        let trades = [];
        let equity = [capital];
        
        // Calculate indicators
        const indicators = this.calculateIndicators(data, strategy.params);
        
        // Execute strategy for each bar
        for (let i = 0; i < data.length; i++) {
            const bar = data[i];
            const prevBars = data.slice(Math.max(0, i - 100), i);
            
            // Update progress
            backtest.progress = (i / data.length) * 100;
            
            // Get strategy signals
            const signals = strategy.compiled(
                { current: bar, history: prevBars },
                strategy.params,
                indicators
            );
            
            // Process signals
            if (signals) {
                // Handle exit signals
                if (position && signals.exit) {
                    const trade = this.closePosition(position, bar, config);
                    trades.push(trade);
                    capital += trade.pnl;
                    position = null;
                }
                
                // Handle entry signals
                if (!position && signals.entry) {
                    const positionSize = this.calculatePositionSize(
                        capital,
                        bar.close,
                        signals.stopLoss,
                        config
                    );
                    
                    if (positionSize > 0) {
                        position = this.openPosition(
                            signals.entry,
                            bar,
                            positionSize,
                            signals.stopLoss,
                            signals.takeProfit,
                            config
                        );
                    }
                }
                
                // Handle position management
                if (position) {
                    // Check stop loss
                    if (position.stopLoss && bar.low <= position.stopLoss) {
                        const trade = this.closePosition(position, {
                            ...bar,
                            close: position.stopLoss
                        }, config);
                        trades.push(trade);
                        capital += trade.pnl;
                        position = null;
                    }
                    // Check take profit
                    else if (position.takeProfit && bar.high >= position.takeProfit) {
                        const trade = this.closePosition(position, {
                            ...bar,
                            close: position.takeProfit
                        }, config);
                        trades.push(trade);
                        capital += trade.pnl;
                        position = null;
                    }
                }
            }
            
            // Track equity
            const currentEquity = position ? 
                capital + this.getPositionValue(position, bar.close) :
                capital;
            equity.push(currentEquity);
        }
        
        // Close any remaining position
        if (position) {
            const lastBar = data[data.length - 1];
            const trade = this.closePosition(position, lastBar, config);
            trades.push(trade);
            capital += trade.pnl;
        }
        
        // Store results
        backtest.trades = trades;
        backtest.equity = equity;
        backtest.finalCapital = capital;
        backtest.totalReturn = ((capital - config.initialCapital) / config.initialCapital) * 100;
        
        // Calculate drawdown curve
        backtest.drawdown = this.calculateDrawdownCurve(equity);
        
        // Calculate returns
        backtest.returns = this.calculateReturns(equity);
    }
    
    calculateIndicators(data, params) {
        const indicators = {};
        
        // SMA
        if (params.smaPeriod) {
            indicators.sma = this.calculateSMA(data, params.smaPeriod);
        }
        
        // EMA
        if (params.emaPeriod) {
            indicators.ema = this.calculateEMA(data, params.emaPeriod);
        }
        
        // RSI
        if (params.rsiPeriod) {
            indicators.rsi = this.calculateRSI(data, params.rsiPeriod);
        }
        
        // MACD
        if (params.macdFast && params.macdSlow) {
            indicators.macd = this.calculateMACD(data, params.macdFast, params.macdSlow, params.macdSignal);
        }
        
        // Bollinger Bands
        if (params.bbPeriod) {
            indicators.bollingerBands = this.calculateBollingerBands(data, params.bbPeriod, params.bbStdDev || 2);
        }
        
        // ATR
        if (params.atrPeriod) {
            indicators.atr = this.calculateATR(data, params.atrPeriod);
        }
        
        // Stochastic
        if (params.stochPeriod) {
            indicators.stochastic = this.calculateStochastic(data, params.stochPeriod);
        }
        
        // Volume indicators
        indicators.volume = data.map(d => d.volume);
        indicators.vwap = this.calculateVWAP(data);
        
        return indicators;
    }
    
    calculateSMA(data, period) {
        const sma = [];
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].close;
            }
            sma.push(sum / period);
        }
        return sma;
    }
    
    calculateEMA(data, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        
        // Initial SMA
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i].close;
        }
        let emaValue = sum / period;
        ema.push(emaValue);
        
        // Calculate EMA
        for (let i = period; i < data.length; i++) {
            emaValue = (data[i].close - emaValue) * multiplier + emaValue;
            ema.push(emaValue);
        }
        
        return ema;
    }
    
    calculateRSI(data, period) {
        const rsi = [];
        let gains = 0;
        let losses = 0;
        
        // Initial average gain/loss
        for (let i = 1; i <= period; i++) {
            const change = data[i].close - data[i - 1].close;
            if (change > 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }
        
        let avgGain = gains / period;
        let avgLoss = losses / period;
        
        // Calculate RSI
        for (let i = period; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            
            if (change > 0) {
                avgGain = (avgGain * (period - 1) + change) / period;
                avgLoss = (avgLoss * (period - 1)) / period;
            } else {
                avgGain = (avgGain * (period - 1)) / period;
                avgLoss = (avgLoss * (period - 1) - change) / period;
            }
            
            const rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
        
        return rsi;
    }
    
    calculateMACD(data, fastPeriod, slowPeriod, signalPeriod) {
        const fastEMA = this.calculateEMA(data, fastPeriod);
        const slowEMA = this.calculateEMA(data, slowPeriod);
        
        const macdLine = [];
        const offset = slowPeriod - fastPeriod;
        
        for (let i = 0; i < fastEMA.length - offset; i++) {
            macdLine.push(fastEMA[i + offset] - slowEMA[i]);
        }
        
        const signalLine = this.calculateEMAFromValues(macdLine, signalPeriod);
        
        const histogram = [];
        for (let i = 0; i < signalLine.length; i++) {
            histogram.push(macdLine[i + signalPeriod - 1] - signalLine[i]);
        }
        
        return { macdLine, signalLine, histogram };
    }
    
    calculateEMAFromValues(values, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        
        let sum = 0;
        for (let i = 0; i < period && i < values.length; i++) {
            sum += values[i];
        }
        let emaValue = sum / Math.min(period, values.length);
        ema.push(emaValue);
        
        for (let i = period; i < values.length; i++) {
            emaValue = (values[i] - emaValue) * multiplier + emaValue;
            ema.push(emaValue);
        }
        
        return ema;
    }
    
    calculateBollingerBands(data, period, stdDev) {
        const sma = this.calculateSMA(data, period);
        const upper = [];
        const lower = [];
        
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                const diff = data[i - j].close - sma[i - period + 1];
                sum += diff * diff;
            }
            const std = Math.sqrt(sum / period);
            
            upper.push(sma[i - period + 1] + std * stdDev);
            lower.push(sma[i - period + 1] - std * stdDev);
        }
        
        return { upper, middle: sma, lower };
    }
    
    calculateATR(data, period) {
        const tr = [];
        
        // Calculate True Range
        for (let i = 1; i < data.length; i++) {
            const high = data[i].high;
            const low = data[i].low;
            const prevClose = data[i - 1].close;
            
            tr.push(Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            ));
        }
        
        // Calculate ATR
        const atr = [];
        let sum = 0;
        
        for (let i = 0; i < period && i < tr.length; i++) {
            sum += tr[i];
        }
        atr.push(sum / Math.min(period, tr.length));
        
        for (let i = period; i < tr.length; i++) {
            const atrValue = (atr[atr.length - 1] * (period - 1) + tr[i]) / period;
            atr.push(atrValue);
        }
        
        return atr;
    }
    
    calculateStochastic(data, period) {
        const k = [];
        const d = [];
        
        for (let i = period - 1; i < data.length; i++) {
            let highest = data[i].high;
            let lowest = data[i].low;
            
            for (let j = 1; j < period; j++) {
                highest = Math.max(highest, data[i - j].high);
                lowest = Math.min(lowest, data[i - j].low);
            }
            
            const kValue = ((data[i].close - lowest) / (highest - lowest)) * 100;
            k.push(kValue);
            
            if (k.length >= 3) {
                const dValue = (k[k.length - 1] + k[k.length - 2] + k[k.length - 3]) / 3;
                d.push(dValue);
            }
        }
        
        return { k, d };
    }
    
    calculateVWAP(data) {
        const vwap = [];
        let cumulativeVolume = 0;
        let cumulativeVolumePrice = 0;
        
        for (let i = 0; i < data.length; i++) {
            const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
            cumulativeVolumePrice += typicalPrice * data[i].volume;
            cumulativeVolume += data[i].volume;
            
            vwap.push(cumulativeVolumePrice / cumulativeVolume);
        }
        
        return vwap;
    }
    
    calculatePositionSize(capital, price, stopLoss, config) {
        // Risk-based position sizing
        const riskAmount = capital * (config.riskPerTrade || 0.02); // 2% risk per trade
        
        if (stopLoss) {
            const riskPerShare = Math.abs(price - stopLoss);
            return Math.floor(riskAmount / riskPerShare);
        }
        
        // Default position sizing
        return Math.floor((capital * config.maxPositionSize) / price);
    }
    
    openPosition(side, bar, quantity, stopLoss, takeProfit, config) {
        const entryPrice = bar.close;
        const commission = config.includeCosts ? entryPrice * quantity * config.commission : 0;
        const slippage = config.includeCosts ? entryPrice * config.slippage : 0;
        
        return {
            side,
            entryTime: bar.time,
            entryPrice: entryPrice + slippage,
            quantity,
            stopLoss,
            takeProfit,
            commission,
            value: quantity * (entryPrice + slippage) + commission
        };
    }
    
    closePosition(position, bar, config) {
        const exitPrice = bar.close;
        const commission = config.includeCosts ? exitPrice * position.quantity * config.commission : 0;
        const slippage = config.includeCosts ? exitPrice * config.slippage : 0;
        
        const exitValue = position.quantity * (exitPrice - slippage) - commission;
        const pnl = position.side === 'long' ? 
            exitValue - position.value :
            position.value - exitValue;
        
        return {
            ...position,
            exitTime: bar.time,
            exitPrice: exitPrice - slippage,
            exitValue,
            pnl,
            pnlPercent: (pnl / position.value) * 100,
            duration: bar.time - position.entryTime,
            commission: position.commission + commission
        };
    }
    
    getPositionValue(position, currentPrice) {
        return position.side === 'long' ?
            (currentPrice - position.entryPrice) * position.quantity :
            (position.entryPrice - currentPrice) * position.quantity;
    }
    
    calculateDrawdownCurve(equity) {
        const drawdown = [];
        let peak = equity[0];
        
        for (let i = 0; i < equity.length; i++) {
            if (equity[i] > peak) {
                peak = equity[i];
            }
            
            const dd = peak > 0 ? ((peak - equity[i]) / peak) * 100 : 0;
            drawdown.push(dd);
        }
        
        return drawdown;
    }
    
    calculateReturns(equity) {
        const returns = [];
        
        for (let i = 1; i < equity.length; i++) {
            const ret = ((equity[i] - equity[i - 1]) / equity[i - 1]) * 100;
            returns.push(ret);
        }
        
        return returns;
    }
    
    calculateMetrics(backtest) {
        const trades = backtest.trades;
        const returns = backtest.returns;
        const equity = backtest.equity;
        
        if (trades.length === 0) {
            return {
                totalTrades: 0,
                winRate: 0,
                profitFactor: 0,
                sharpeRatio: 0,
                maxDrawdown: 0
            };
        }
        
        const winners = trades.filter(t => t.pnl > 0);
        const losers = trades.filter(t => t.pnl < 0);
        
        const metrics = {
            // Basic metrics
            totalTrades: trades.length,
            winners: winners.length,
            losers: losers.length,
            winRate: (winners.length / trades.length) * 100,
            
            // P&L metrics
            grossProfit: winners.reduce((sum, t) => sum + t.pnl, 0),
            grossLoss: Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0)),
            netProfit: trades.reduce((sum, t) => sum + t.pnl, 0),
            
            // Trade statistics
            avgWin: winners.length > 0 ? 
                winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length : 0,
            avgLoss: losers.length > 0 ? 
                Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0)) / losers.length : 0,
            largestWin: winners.length > 0 ? 
                Math.max(...winners.map(t => t.pnl)) : 0,
            largestLoss: losers.length > 0 ? 
                Math.min(...losers.map(t => t.pnl)) : 0,
            
            // Risk metrics
            profitFactor: losers.length > 0 ?
                winners.reduce((sum, t) => sum + t.pnl, 0) / 
                Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0)) : 
                winners.reduce((sum, t) => sum + t.pnl, 0),
            
            // Advanced metrics
            sharpeRatio: this.calculateSharpeRatio(returns),
            sortinoRatio: this.calculateSortinoRatio(returns),
            calmarRatio: this.calculateCalmarRatio(backtest),
            maxDrawdown: Math.max(...backtest.drawdown),
            maxDrawdownDuration: this.calculateMaxDrawdownDuration(backtest.drawdown),
            
            // Statistical metrics
            expectancy: this.calculateExpectancy(trades),
            kellyPercent: this.calculateKellyPercent(trades),
            payoffRatio: winners.length > 0 && losers.length > 0 ?
                (winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length) /
                (Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0)) / losers.length) : 0,
            
            // Time metrics
            avgTradeDuration: trades.reduce((sum, t) => sum + t.duration, 0) / trades.length,
            timeInMarket: this.calculateTimeInMarket(trades, backtest.config),
            
            // Risk-adjusted returns
            totalReturn: backtest.totalReturn,
            annualizedReturn: this.calculateAnnualizedReturn(backtest),
            volatility: this.calculateVolatility(returns),
            
            // Consecutive trades
            maxConsecutiveWins: this.calculateMaxConsecutive(trades, true),
            maxConsecutiveLosses: this.calculateMaxConsecutive(trades, false),
            
            // Recovery metrics
            recoveryFactor: backtest.netProfit / Math.max(...backtest.drawdown),
            profitToMaxDrawdown: backtest.netProfit / (Math.max(...backtest.drawdown) / 100 * backtest.config.initialCapital)
        };
        
        return metrics;
    }
    
    calculateWinRate(trades) {
        if (trades.length === 0) return 0;
        const winners = trades.filter(t => t.pnl > 0);
        return (winners.length / trades.length) * 100;
    }
    
    calculateProfitFactor(trades) {
        const winners = trades.filter(t => t.pnl > 0);
        const losers = trades.filter(t => t.pnl < 0);
        
        const grossProfit = winners.reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));
        
        return grossLoss > 0 ? grossProfit / grossLoss : grossProfit;
    }
    
    calculateSharpeRatio(returns) {
        if (returns.length === 0) return 0;
        
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        
        // Annualized Sharpe ratio (assuming daily returns)
        return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    }
    
    calculateSortinoRatio(returns) {
        if (returns.length === 0) return 0;
        
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const negativeReturns = returns.filter(r => r < 0);
        
        if (negativeReturns.length === 0) return avgReturn > 0 ? Infinity : 0;
        
        const downside = Math.sqrt(
            negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length
        );
        
        return downside > 0 ? (avgReturn / downside) * Math.sqrt(252) : 0;
    }
    
    calculateCalmarRatio(backtest) {
        const annualizedReturn = this.calculateAnnualizedReturn(backtest);
        const maxDrawdown = Math.max(...backtest.drawdown);
        
        return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : annualizedReturn;
    }
    
    calculateMaxDrawdown(equity) {
        let maxDrawdown = 0;
        let peak = equity[0];
        
        for (let i = 1; i < equity.length; i++) {
            if (equity[i] > peak) {
                peak = equity[i];
            }
            
            const drawdown = ((peak - equity[i]) / peak) * 100;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        
        return maxDrawdown;
    }
    
    calculateMaxDrawdownDuration(drawdown) {
        let maxDuration = 0;
        let currentDuration = 0;
        
        for (let i = 0; i < drawdown.length; i++) {
            if (drawdown[i] > 0) {
                currentDuration++;
                if (currentDuration > maxDuration) {
                    maxDuration = currentDuration;
                }
            } else {
                currentDuration = 0;
            }
        }
        
        return maxDuration;
    }
    
    calculateExpectancy(trades) {
        if (trades.length === 0) return 0;
        
        const avgPnl = trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length;
        const avgInvestment = trades.reduce((sum, t) => sum + t.value, 0) / trades.length;
        
        return avgInvestment > 0 ? (avgPnl / avgInvestment) * 100 : 0;
    }
    
    calculateExpectedValue(trades) {
        if (trades.length === 0) return 0;
        
        const winners = trades.filter(t => t.pnl > 0);
        const losers = trades.filter(t => t.pnl < 0);
        
        const winRate = winners.length / trades.length;
        const avgWin = winners.length > 0 ? 
            winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length : 0;
        const avgLoss = losers.length > 0 ? 
            Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0)) / losers.length : 0;
        
        return (winRate * avgWin) - ((1 - winRate) * avgLoss);
    }
    
    calculateKellyPercent(trades) {
        if (trades.length === 0) return 0;
        
        const winners = trades.filter(t => t.pnl > 0);
        const losers = trades.filter(t => t.pnl < 0);
        
        if (winners.length === 0 || losers.length === 0) return 0;
        
        const winRate = winners.length / trades.length;
        const avgWin = winners.reduce((sum, t) => sum + t.pnlPercent, 0) / winners.length;
        const avgLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnlPercent, 0)) / losers.length;
        
        const kelly = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
        
        // Apply Kelly fraction (typically 25% of full Kelly)
        return Math.max(0, Math.min(25, kelly * 25));
    }
    
    calculateValueAtRisk(returns, confidence = 0.95) {
        if (returns.length === 0) return 0;
        
        const sorted = [...returns].sort((a, b) => a - b);
        const index = Math.floor((1 - confidence) * sorted.length);
        
        return sorted[index] || sorted[0];
    }
    
    calculateConditionalVaR(returns, confidence = 0.95) {
        if (returns.length === 0) return 0;
        
        const var95 = this.calculateValueAtRisk(returns, confidence);
        const tail = returns.filter(r => r <= var95);
        
        return tail.length > 0 ? 
            tail.reduce((sum, r) => sum + r, 0) / tail.length : var95;
    }
    
    calculateAnnualizedReturn(backtest) {
        const days = (new Date(backtest.config.endDate) - new Date(backtest.config.startDate)) / (1000 * 60 * 60 * 24);
        const years = days / 365;
        
        return ((Math.pow(backtest.finalCapital / backtest.config.initialCapital, 1 / years) - 1) * 100);
    }
    
    calculateVolatility(returns) {
        if (returns.length === 0) return 0;
        
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        
        // Annualized volatility
        return Math.sqrt(variance) * Math.sqrt(252);
    }
    
    calculateTimeInMarket(trades, config) {
        if (trades.length === 0) return 0;
        
        const totalTime = new Date(config.endDate) - new Date(config.startDate);
        const timeInTrades = trades.reduce((sum, t) => sum + t.duration, 0);
        
        return (timeInTrades / totalTime) * 100;
    }
    
    calculateMaxConsecutive(trades, wins) {
        let maxConsecutive = 0;
        let currentConsecutive = 0;
        
        for (const trade of trades) {
            if ((wins && trade.pnl > 0) || (!wins && trade.pnl < 0)) {
                currentConsecutive++;
                if (currentConsecutive > maxConsecutive) {
                    maxConsecutive = currentConsecutive;
                }
            } else {
                currentConsecutive = 0;
            }
        }
        
        return maxConsecutive;
    }
    
    async optimizeStrategy(strategyId, options = {}) {
        const strategy = this.strategies.get(strategyId);
        if (!strategy) throw new Error('Strategy not found');
        
        const optimizationId = `opt_${Date.now()}`;
        
        const optimization = {
            id: optimizationId,
            strategyId,
            status: 'running',
            parameters: options.parameters || this.getDefaultOptimizationParams(strategy),
            method: options.method || 'grid', // grid, genetic, random
            metric: options.metric || 'sharpeRatio',
            results: [],
            bestResult: null,
            startTime: new Date().toISOString()
        };
        
        this.optimizations.set(optimizationId, optimization);
        
        try {
            if (optimization.method === 'grid') {
                await this.runGridOptimization(optimization, strategy, options);
            } else if (optimization.method === 'genetic') {
                await this.runGeneticOptimization(optimization, strategy, options);
            } else if (optimization.method === 'random') {
                await this.runRandomOptimization(optimization, strategy, options);
            }
            
            optimization.status = 'completed';
            optimization.endTime = new Date().toISOString();
            
            // Display results
            this.displayOptimizationResults(optimization);
            
        } catch (error) {
            console.error('Optimization failed:', error);
            optimization.status = 'failed';
            optimization.error = error.message;
        }
        
        return optimizationId;
    }
    
    getDefaultOptimizationParams(strategy) {
        // Define parameter ranges for optimization
        const defaults = {
            smaPeriod: { min: 10, max: 50, step: 5 },
            emaPeriod: { min: 10, max: 50, step: 5 },
            rsiPeriod: { min: 10, max: 20, step: 2 },
            rsiOversold: { min: 20, max: 40, step: 5 },
            rsiOverbought: { min: 60, max: 80, step: 5 },
            stopLoss: { min: 0.01, max: 0.05, step: 0.01 },
            takeProfit: { min: 0.02, max: 0.10, step: 0.02 }
        };
        
        // Filter based on strategy parameters
        const params = {};
        for (const [key, value] of Object.entries(defaults)) {
            if (strategy.params.hasOwnProperty(key)) {
                params[key] = value;
            }
        }
        
        return params;
    }
    
    async runGridOptimization(optimization, strategy, options) {
        const parameterSets = this.generateGridParameters(optimization.parameters);
        
        for (let i = 0; i < parameterSets.length; i++) {
            const params = parameterSets[i];
            
            // Update progress
            optimization.progress = (i / parameterSets.length) * 100;
            
            // Create modified strategy
            const testStrategy = {
                ...strategy,
                params: { ...strategy.params, ...params }
            };
            
            // Run backtest
            const backtestId = await this.runBacktest(testStrategy.id, {
                ...options,
                silent: true // Don't display individual results
            });
            
            const backtest = this.backtests.get(backtestId);
            
            // Store result
            const result = {
                params,
                metrics: backtest.metrics,
                score: backtest.metrics[optimization.metric]
            };
            
            optimization.results.push(result);
            
            // Update best result
            if (!optimization.bestResult || result.score > optimization.bestResult.score) {
                optimization.bestResult = result;
            }
        }
    }
    
    generateGridParameters(parameters) {
        const sets = [];
        const keys = Object.keys(parameters);
        
        const generateCombinations = (index, current) => {
            if (index === keys.length) {
                sets.push({ ...current });
                return;
            }
            
            const key = keys[index];
            const param = parameters[key];
            
            for (let value = param.min; value <= param.max; value += param.step) {
                current[key] = value;
                generateCombinations(index + 1, current);
            }
        };
        
        generateCombinations(0, {});
        
        return sets;
    }
    
    async runMonteCarloSimulation(backtestId, options = {}) {
        const backtest = this.backtests.get(backtestId);
        if (!backtest) throw new Error('Backtest not found');
        
        const numSimulations = options.simulations || 1000;
        const results = [];
        
        for (let i = 0; i < numSimulations; i++) {
            // Randomize trade order
            const shuffledTrades = this.shuffleArray([...backtest.trades]);
            
            // Calculate equity curve for shuffled trades
            let capital = backtest.config.initialCapital;
            const equity = [capital];
            
            for (const trade of shuffledTrades) {
                capital += trade.pnl;
                equity.push(capital);
            }
            
            // Calculate metrics
            const drawdown = this.calculateDrawdownCurve(equity);
            const returns = this.calculateReturns(equity);
            
            results.push({
                finalCapital: capital,
                maxDrawdown: Math.max(...drawdown),
                sharpeRatio: this.calculateSharpeRatio(returns),
                totalReturn: ((capital - backtest.config.initialCapital) / backtest.config.initialCapital) * 100
            });
        }
        
        // Calculate statistics
        const stats = {
            mean: {},
            median: {},
            percentile5: {},
            percentile95: {},
            worstCase: {},
            bestCase: {}
        };
        
        const metrics = ['finalCapital', 'maxDrawdown', 'sharpeRatio', 'totalReturn'];
        
        for (const metric of metrics) {
            const values = results.map(r => r[metric]).sort((a, b) => a - b);
            
            stats.mean[metric] = values.reduce((sum, v) => sum + v, 0) / values.length;
            stats.median[metric] = values[Math.floor(values.length / 2)];
            stats.percentile5[metric] = values[Math.floor(values.length * 0.05)];
            stats.percentile95[metric] = values[Math.floor(values.length * 0.95)];
            stats.worstCase[metric] = values[0];
            stats.bestCase[metric] = values[values.length - 1];
        }
        
        return {
            simulations: numSimulations,
            results,
            statistics: stats
        };
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    generateReport(backtest) {
        const report = {
            summary: {
                strategy: backtest.strategyName,
                symbol: backtest.config.symbol,
                timeframe: backtest.config.timeframe,
                period: `${backtest.config.startDate.toISOString().split('T')[0]} to ${backtest.config.endDate.toISOString().split('T')[0]}`,
                initialCapital: backtest.config.initialCapital,
                finalCapital: backtest.finalCapital,
                totalReturn: backtest.totalReturn.toFixed(2) + '%'
            },
            performance: backtest.metrics,
            trades: backtest.trades.map(t => ({
                ...t,
                entryTime: new Date(t.entryTime * 1000).toISOString(),
                exitTime: new Date(t.exitTime * 1000).toISOString(),
                pnl: t.pnl.toFixed(2),
                pnlPercent: t.pnlPercent.toFixed(2) + '%'
            })),
            monthlyReturns: this.calculateMonthlyReturns(backtest),
            yearlyReturns: this.calculateYearlyReturns(backtest)
        };
        
        return report;
    }
    
    calculateMonthlyReturns(backtest) {
        // Group returns by month
        const monthly = {};
        const startDate = new Date(backtest.config.startDate);
        
        for (let i = 0; i < backtest.returns.length; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthly[monthKey]) {
                monthly[monthKey] = [];
            }
            
            monthly[monthKey].push(backtest.returns[i]);
        }
        
        // Calculate monthly returns
        const monthlyReturns = {};
        for (const [month, returns] of Object.entries(monthly)) {
            const compoundReturn = returns.reduce((acc, r) => acc * (1 + r / 100), 1);
            monthlyReturns[month] = ((compoundReturn - 1) * 100).toFixed(2);
        }
        
        return monthlyReturns;
    }
    
    calculateYearlyReturns(backtest) {
        // Group returns by year
        const yearly = {};
        const startDate = new Date(backtest.config.startDate);
        
        for (let i = 0; i < backtest.returns.length; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const year = date.getFullYear();
            
            if (!yearly[year]) {
                yearly[year] = [];
            }
            
            yearly[year].push(backtest.returns[i]);
        }
        
        // Calculate yearly returns
        const yearlyReturns = {};
        for (const [year, returns] of Object.entries(yearly)) {
            const compoundReturn = returns.reduce((acc, r) => acc * (1 + r / 100), 1);
            yearlyReturns[year] = ((compoundReturn - 1) * 100).toFixed(2);
        }
        
        return yearlyReturns;
    }
    
    displayResults(backtest) {
        // Update UI with backtest results
        const container = document.getElementById('backtestResults');
        if (!container) return;
        
        container.innerHTML = `
            <div class="backtest-summary">
                <h3>${backtest.strategyName}</h3>
                <div class="metrics-grid">
                    <div class="metric">
                        <span class="label">Total Return</span>
                        <span class="value ${backtest.totalReturn >= 0 ? 'positive' : 'negative'}">
                            ${backtest.totalReturn.toFixed(2)}%
                        </span>
                    </div>
                    <div class="metric">
                        <span class="label">Win Rate</span>
                        <span class="value">${backtest.metrics.winRate.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="label">Profit Factor</span>
                        <span class="value">${backtest.metrics.profitFactor.toFixed(2)}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Sharpe Ratio</span>
                        <span class="value">${backtest.metrics.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Max Drawdown</span>
                        <span class="value negative">${backtest.metrics.maxDrawdown.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="label">Total Trades</span>
                        <span class="value">${backtest.metrics.totalTrades}</span>
                    </div>
                </div>
            </div>
            
            <div class="equity-chart" id="equityChart"></div>
            <div class="drawdown-chart" id="drawdownChart"></div>
            <div class="trades-table" id="tradesTable"></div>
        `;
        
        // Draw equity curve
        this.drawEquityCurve(backtest.equity, 'equityChart');
        
        // Draw drawdown chart
        this.drawDrawdownChart(backtest.drawdown, 'drawdownChart');
        
        // Display trades table
        this.displayTradesTable(backtest.trades, 'tradesTable');
    }
    
    drawEquityCurve(equity, containerId) {
        // This would use a charting library to draw the equity curve
        console.log('Drawing equity curve:', equity.length, 'points');
    }
    
    drawDrawdownChart(drawdown, containerId) {
        // This would use a charting library to draw the drawdown chart
        console.log('Drawing drawdown chart:', drawdown.length, 'points');
    }
    
    displayTradesTable(trades, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const html = `
            <table class="trades-table">
                <thead>
                    <tr>
                        <th>Entry Time</th>
                        <th>Exit Time</th>
                        <th>Side</th>
                        <th>Entry Price</th>
                        <th>Exit Price</th>
                        <th>Quantity</th>
                        <th>P&L</th>
                        <th>P&L %</th>
                    </tr>
                </thead>
                <tbody>
                    ${trades.slice(0, 50).map(trade => `
                        <tr class="${trade.pnl >= 0 ? 'win' : 'loss'}">
                            <td>${new Date(trade.entryTime * 1000).toLocaleString()}</td>
                            <td>${new Date(trade.exitTime * 1000).toLocaleString()}</td>
                            <td>${trade.side}</td>
                            <td>$${trade.entryPrice.toFixed(2)}</td>
                            <td>$${trade.exitPrice.toFixed(2)}</td>
                            <td>${trade.quantity}</td>
                            <td class="${trade.pnl >= 0 ? 'positive' : 'negative'}">
                                $${trade.pnl.toFixed(2)}
                            </td>
                            <td class="${trade.pnl >= 0 ? 'positive' : 'negative'}">
                                ${trade.pnlPercent.toFixed(2)}%
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
    }
    
    displayOptimizationResults(optimization) {
        console.log('Optimization complete:', optimization);
        console.log('Best parameters:', optimization.bestResult.params);
        console.log('Best score:', optimization.bestResult.score);
    }
    
    exportResults(backtestId, format = 'csv') {
        const backtest = this.backtests.get(backtestId);
        if (!backtest) return;
        
        if (format === 'csv') {
            this.exportToCSV(backtest);
        } else if (format === 'json') {
            this.exportToJSON(backtest);
        } else if (format === 'pdf') {
            this.exportToPDF(backtest);
        }
    }
    
    exportToCSV(backtest) {
        const csv = [
            ['Strategy', backtest.strategyName],
            ['Symbol', backtest.config.symbol],
            ['Period', `${backtest.config.startDate} to ${backtest.config.endDate}`],
            ['Initial Capital', backtest.config.initialCapital],
            ['Final Capital', backtest.finalCapital],
            ['Total Return', backtest.totalReturn],
            [''],
            ['Trade #', 'Entry Time', 'Exit Time', 'Side', 'Entry Price', 'Exit Price', 'Quantity', 'P&L', 'P&L %'],
            ...backtest.trades.map((t, i) => [
                i + 1,
                new Date(t.entryTime * 1000).toISOString(),
                new Date(t.exitTime * 1000).toISOString(),
                t.side,
                t.entryPrice,
                t.exitPrice,
                t.quantity,
                t.pnl,
                t.pnlPercent
            ])
        ];
        
        const csvContent = csv.map(row => row.join(',')).join('\n');
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backtest_${backtest.id}.csv`;
        a.click();
    }
    
    exportToJSON(backtest) {
        const json = JSON.stringify(backtest.report, null, 2);
        
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backtest_${backtest.id}.json`;
        a.click();
    }
    
    exportToPDF(backtest) {
        // This would use a PDF generation library
        console.log('Exporting to PDF:', backtest.id);
    }
    
    saveStrategies() {
        const strategies = Array.from(this.strategies.values());
        localStorage.setItem('backtestStrategies', JSON.stringify(strategies));
    }
    
    saveBacktestHistory() {
        const history = Array.from(this.backtests.values()).slice(-100); // Keep last 100
        localStorage.setItem('backtestHistory', JSON.stringify(history));
    }
    
    setupEventListeners() {
        document.addEventListener('runBacktest', (e) => {
            this.runBacktest(e.detail.strategyId, e.detail.options);
        });
        
        document.addEventListener('optimizeStrategy', (e) => {
            this.optimizeStrategy(e.detail.strategyId, e.detail.options);
        });
        
        document.addEventListener('exportBacktest', (e) => {
            this.exportResults(e.detail.backtestId, e.detail.format);
        });
    }
}

// Initialize backtest module when document is ready
if (typeof window !== 'undefined') {
    window.backtestModule = null;
    
    document.addEventListener('DOMContentLoaded', () => {
        window.backtestModule = new BacktestModule();
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BacktestModule;
}