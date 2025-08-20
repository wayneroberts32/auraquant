// Charts Module - Advanced TradingView-style charting for AuraQuant
// Features: Candlestick charts, technical indicators, drawing tools, multiple timeframes

class ChartsModule {
    constructor() {
        this.charts = new Map();
        this.indicators = new Map();
        this.drawings = new Map();
        this.activeChart = null;
        this.theme = 'dark';
        this.crosshair = { x: 0, y: 0, visible: false };
        
        // Chart configurations
        this.config = {
            defaultTimeframe: '5m',
            defaultChartType: 'candlestick',
            showVolume: true,
            showGrid: true,
            showLegend: true,
            autoScale: true,
            logarithmic: false,
            percentScale: false
        };
        
        // Available timeframes
        this.timeframes = {
            '1s': { label: '1 Second', seconds: 1 },
            '5s': { label: '5 Seconds', seconds: 5 },
            '10s': { label: '10 Seconds', seconds: 10 },
            '30s': { label: '30 Seconds', seconds: 30 },
            '1m': { label: '1 Minute', seconds: 60 },
            '3m': { label: '3 Minutes', seconds: 180 },
            '5m': { label: '5 Minutes', seconds: 300 },
            '15m': { label: '15 Minutes', seconds: 900 },
            '30m': { label: '30 Minutes', seconds: 1800 },
            '1h': { label: '1 Hour', seconds: 3600 },
            '2h': { label: '2 Hours', seconds: 7200 },
            '4h': { label: '4 Hours', seconds: 14400 },
            '6h': { label: '6 Hours', seconds: 21600 },
            '12h': { label: '12 Hours', seconds: 43200 },
            '1d': { label: '1 Day', seconds: 86400 },
            '3d': { label: '3 Days', seconds: 259200 },
            '1w': { label: '1 Week', seconds: 604800 },
            '1M': { label: '1 Month', seconds: 2592000 }
        };
        
        // Chart types
        this.chartTypes = {
            candlestick: { name: 'Candlestick', renderer: 'renderCandlestick' },
            ohlc: { name: 'OHLC', renderer: 'renderOHLC' },
            line: { name: 'Line', renderer: 'renderLine' },
            area: { name: 'Area', renderer: 'renderArea' },
            bars: { name: 'Bars', renderer: 'renderBars' },
            heikinAshi: { name: 'Heikin-Ashi', renderer: 'renderHeikinAshi' },
            renko: { name: 'Renko', renderer: 'renderRenko' },
            rangeBar: { name: 'Range Bars', renderer: 'renderRangeBars' },
            kagi: { name: 'Kagi', renderer: 'renderKagi' },
            pointFigure: { name: 'Point & Figure', renderer: 'renderPointFigure' }
        };
        
        // Technical indicators registry
        this.indicatorRegistry = {
            // Trend Indicators
            sma: { name: 'Simple Moving Average', type: 'overlay', params: { period: 20 } },
            ema: { name: 'Exponential Moving Average', type: 'overlay', params: { period: 20 } },
            wma: { name: 'Weighted Moving Average', type: 'overlay', params: { period: 20 } },
            vwap: { name: 'VWAP', type: 'overlay', params: {} },
            bollinger: { name: 'Bollinger Bands', type: 'overlay', params: { period: 20, stdDev: 2 } },
            ichimoku: { name: 'Ichimoku Cloud', type: 'overlay', params: { conversion: 9, base: 26, span: 52 } },
            psar: { name: 'Parabolic SAR', type: 'overlay', params: { start: 0.02, increment: 0.02, max: 0.2 } },
            supertrend: { name: 'Supertrend', type: 'overlay', params: { period: 10, multiplier: 3 } },
            
            // Momentum Indicators
            rsi: { name: 'RSI', type: 'panel', params: { period: 14 } },
            macd: { name: 'MACD', type: 'panel', params: { fast: 12, slow: 26, signal: 9 } },
            stochastic: { name: 'Stochastic', type: 'panel', params: { k: 14, d: 3, smooth: 3 } },
            cci: { name: 'CCI', type: 'panel', params: { period: 20 } },
            momentum: { name: 'Momentum', type: 'panel', params: { period: 10 } },
            roc: { name: 'Rate of Change', type: 'panel', params: { period: 10 } },
            williams: { name: 'Williams %R', type: 'panel', params: { period: 14 } },
            tsi: { name: 'True Strength Index', type: 'panel', params: { long: 25, short: 13, signal: 13 } },
            
            // Volume Indicators
            volume: { name: 'Volume', type: 'panel', params: {} },
            obv: { name: 'On Balance Volume', type: 'panel', params: {} },
            vwma: { name: 'Volume Weighted MA', type: 'overlay', params: { period: 20 } },
            mfi: { name: 'Money Flow Index', type: 'panel', params: { period: 14 } },
            chaikin: { name: 'Chaikin Money Flow', type: 'panel', params: { period: 20 } },
            accumulation: { name: 'Accumulation/Distribution', type: 'panel', params: {} },
            pvt: { name: 'Price Volume Trend', type: 'panel', params: {} },
            
            // Volatility Indicators
            atr: { name: 'Average True Range', type: 'panel', params: { period: 14 } },
            keltner: { name: 'Keltner Channels', type: 'overlay', params: { period: 20, multiplier: 2 } },
            donchian: { name: 'Donchian Channels', type: 'overlay', params: { period: 20 } },
            adx: { name: 'ADX', type: 'panel', params: { period: 14 } },
            vix: { name: 'Volatility Index', type: 'panel', params: { period: 20 } }
        };
        
        // Drawing tools
        this.drawingTools = {
            trendLine: { name: 'Trend Line', icon: '📈' },
            horizontalLine: { name: 'Horizontal Line', icon: '➖' },
            verticalLine: { name: 'Vertical Line', icon: '│' },
            ray: { name: 'Ray', icon: '↗' },
            channel: { name: 'Channel', icon: '⫽' },
            fibonacci: { name: 'Fibonacci Retracement', icon: '🔢' },
            fibonacciExtension: { name: 'Fibonacci Extension', icon: '📊' },
            pitchfork: { name: 'Pitchfork', icon: '⚡' },
            gann: { name: 'Gann Fan', icon: '📐' },
            elliott: { name: 'Elliott Wave', icon: '〰️' },
            rectangle: { name: 'Rectangle', icon: '▭' },
            circle: { name: 'Circle', icon: '○' },
            arrow: { name: 'Arrow', icon: '→' },
            text: { name: 'Text', icon: 'T' },
            brush: { name: 'Brush', icon: '✏️' }
        };
        
        this.init();
    }
    
    async init() {
        console.log('Initializing Charts Module...');
        
        // Load saved configurations
        this.loadConfig();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize default chart
        await this.createChart('main', {
            container: 'mainChart',
            symbol: 'AAPL',
            timeframe: this.config.defaultTimeframe,
            type: this.config.defaultChartType
        });
        
        console.log('Charts Module initialized');
    }
    
    loadConfig() {
        const saved = localStorage.getItem('chartsConfig');
        if (saved) {
            this.config = { ...this.config, ...JSON.parse(saved) };
        }
    }
    
    saveConfig() {
        localStorage.setItem('chartsConfig', JSON.stringify(this.config));
    }
    
    async createChart(id, options) {
        const container = document.getElementById(options.container);
        if (!container) {
            console.error(`Container ${options.container} not found`);
            return null;
        }
        
        // Create chart instance using Lightweight Charts
        const chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                backgroundColor: this.theme === 'dark' ? '#0d0e17' : '#ffffff',
                textColor: this.theme === 'dark' ? '#9ca3af' : '#191919',
                fontSize: 12,
                fontFamily: "'Inter', sans-serif"
            },
            grid: {
                vertLines: {
                    visible: this.config.showGrid,
                    color: this.theme === 'dark' ? '#1f2937' : '#e0e0e0',
                    style: 1
                },
                horzLines: {
                    visible: this.config.showGrid,
                    color: this.theme === 'dark' ? '#1f2937' : '#e0e0e0',
                    style: 1
                }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    color: '#6b7280',
                    width: 1,
                    style: 2,
                    labelVisible: true
                },
                horzLine: {
                    color: '#6b7280',
                    width: 1,
                    style: 2,
                    labelVisible: true
                }
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2
                }
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: true,
                barSpacing: 12
            },
            watermark: {
                color: 'rgba(107, 114, 128, 0.1)',
                visible: true,
                text: options.symbol,
                fontSize: 48,
                horzAlign: 'center',
                vertAlign: 'center'
            }
        });
        
        // Create main price series based on chart type
        let mainSeries;
        switch (options.type) {
            case 'candlestick':
                mainSeries = chart.addCandlestickSeries({
                    upColor: '#10b981',
                    downColor: '#ef4444',
                    borderUpColor: '#10b981',
                    borderDownColor: '#ef4444',
                    wickUpColor: '#10b981',
                    wickDownColor: '#ef4444'
                });
                break;
            case 'line':
                mainSeries = chart.addLineSeries({
                    color: '#3b82f6',
                    lineWidth: 2,
                    priceLineVisible: true,
                    lastValueVisible: true,
                    crosshairMarkerVisible: true
                });
                break;
            case 'area':
                mainSeries = chart.addAreaSeries({
                    topColor: 'rgba(59, 130, 246, 0.4)',
                    bottomColor: 'rgba(59, 130, 246, 0.01)',
                    lineColor: '#3b82f6',
                    lineWidth: 2
                });
                break;
            default:
                mainSeries = chart.addCandlestickSeries();
        }
        
        // Add volume series if enabled
        let volumeSeries = null;
        if (this.config.showVolume) {
            volumeSeries = chart.addHistogramSeries({
                color: '#374151',
                priceFormat: {
                    type: 'volume'
                },
                priceScaleId: '',
                scaleMargins: {
                    top: 0.8,
                    bottom: 0
                }
            });
        }
        
        // Store chart instance
        const chartInstance = {
            id,
            chart,
            mainSeries,
            volumeSeries,
            indicators: new Map(),
            drawings: [],
            symbol: options.symbol,
            timeframe: options.timeframe,
            type: options.type,
            data: [],
            container: options.container
        };
        
        this.charts.set(id, chartInstance);
        this.activeChart = chartInstance;
        
        // Load initial data
        await this.loadChartData(chartInstance);
        
        // Setup real-time updates
        this.setupRealtimeUpdates(chartInstance);
        
        // Handle resize
        this.setupResizeObserver(chartInstance);
        
        return chartInstance;
    }
    
    async loadChartData(chartInstance) {
        try {
            // Fetch historical data
            const data = await this.fetchHistoricalData(
                chartInstance.symbol,
                chartInstance.timeframe
            );
            
            if (!data || data.length === 0) {
                // Generate mock data for testing
                data = this.generateMockData(chartInstance.symbol, chartInstance.timeframe);
            }
            
            // Store data
            chartInstance.data = data;
            
            // Update main series
            if (chartInstance.type === 'line' || chartInstance.type === 'area') {
                const lineData = data.map(d => ({
                    time: d.time,
                    value: d.close
                }));
                chartInstance.mainSeries.setData(lineData);
            } else {
                chartInstance.mainSeries.setData(data);
            }
            
            // Update volume series
            if (chartInstance.volumeSeries) {
                const volumeData = data.map(d => ({
                    time: d.time,
                    value: d.volume,
                    color: d.close >= d.open ? '#10b98133' : '#ef444433'
                }));
                chartInstance.volumeSeries.setData(volumeData);
            }
            
            // Fit content
            chartInstance.chart.timeScale().fitContent();
            
        } catch (error) {
            console.error('Error loading chart data:', error);
        }
    }
    
    async fetchHistoricalData(symbol, timeframe) {
        // This would connect to your data provider
        // For now, returning null to trigger mock data generation
        
        if (window.marketData && window.marketData.getHistoricalData) {
            return await window.marketData.getHistoricalData(symbol, timeframe);
        }
        
        return null;
    }
    
    generateMockData(symbol, timeframe) {
        const data = [];
        const now = Math.floor(Date.now() / 1000);
        const interval = this.timeframes[timeframe].seconds;
        const points = 500;
        
        let lastClose = 100 + Math.random() * 50;
        let lastVolume = 1000000;
        
        for (let i = points; i > 0; i--) {
            const time = now - (i * interval);
            const volatility = 0.02;
            const trend = Math.sin(i / 50) * 5;
            
            const open = lastClose;
            const change = (Math.random() - 0.5) * volatility * open;
            const close = open + change + trend * 0.1;
            const high = Math.max(open, close) * (1 + Math.random() * volatility);
            const low = Math.min(open, close) * (1 - Math.random() * volatility);
            const volume = lastVolume * (0.5 + Math.random());
            
            data.push({
                time,
                open,
                high,
                low,
                close,
                volume
            });
            
            lastClose = close;
            lastVolume = volume;
        }
        
        return data;
    }
    
    setupRealtimeUpdates(chartInstance) {
        // Subscribe to WebSocket updates
        if (window.wsManager) {
            window.wsManager.subscribe(`price.${chartInstance.symbol}`, (data) => {
                this.updateChartRealtime(chartInstance, data);
            });
        }
        
        // Fallback: Simulate real-time updates for demo
        const updateInterval = this.timeframes[chartInstance.timeframe].seconds * 1000;
        
        chartInstance.realtimeInterval = setInterval(() => {
            const lastBar = chartInstance.data[chartInstance.data.length - 1];
            if (!lastBar) return;
            
            const now = Math.floor(Date.now() / 1000);
            const isNewBar = now - lastBar.time >= this.timeframes[chartInstance.timeframe].seconds;
            
            if (isNewBar) {
                // Create new bar
                const newBar = {
                    time: now,
                    open: lastBar.close,
                    high: lastBar.close,
                    low: lastBar.close,
                    close: lastBar.close,
                    volume: Math.random() * 1000000
                };
                
                chartInstance.data.push(newBar);
                chartInstance.mainSeries.update(newBar);
                
                if (chartInstance.volumeSeries) {
                    chartInstance.volumeSeries.update({
                        time: newBar.time,
                        value: newBar.volume,
                        color: newBar.close >= newBar.open ? '#10b98133' : '#ef444433'
                    });
                }
            } else {
                // Update current bar
                const change = (Math.random() - 0.5) * lastBar.close * 0.001;
                lastBar.close += change;
                lastBar.high = Math.max(lastBar.high, lastBar.close);
                lastBar.low = Math.min(lastBar.low, lastBar.close);
                lastBar.volume += Math.random() * 10000;
                
                chartInstance.mainSeries.update(lastBar);
                
                if (chartInstance.volumeSeries) {
                    chartInstance.volumeSeries.update({
                        time: lastBar.time,
                        value: lastBar.volume,
                        color: lastBar.close >= lastBar.open ? '#10b98133' : '#ef444433'
                    });
                }
            }
            
            // Update indicators
            this.updateIndicators(chartInstance);
            
        }, 1000); // Update every second
    }
    
    updateChartRealtime(chartInstance, data) {
        const currentTime = Math.floor(Date.now() / 1000);
        const lastBar = chartInstance.data[chartInstance.data.length - 1];
        
        if (!lastBar) return;
        
        const timeframe = this.timeframes[chartInstance.timeframe].seconds;
        const isNewBar = currentTime - lastBar.time >= timeframe;
        
        if (isNewBar) {
            const newBar = {
                time: currentTime,
                open: data.price,
                high: data.price,
                low: data.price,
                close: data.price,
                volume: data.volume || 0
            };
            
            chartInstance.data.push(newBar);
            chartInstance.mainSeries.update(newBar);
        } else {
            lastBar.close = data.price;
            lastBar.high = Math.max(lastBar.high, data.price);
            lastBar.low = Math.min(lastBar.low, data.price);
            lastBar.volume += data.volume || 0;
            
            chartInstance.mainSeries.update(lastBar);
        }
        
        // Update volume
        if (chartInstance.volumeSeries && data.volume) {
            chartInstance.volumeSeries.update({
                time: lastBar.time,
                value: lastBar.volume,
                color: lastBar.close >= lastBar.open ? '#10b98133' : '#ef444433'
            });
        }
        
        // Update indicators
        this.updateIndicators(chartInstance);
    }
    
    addIndicator(chartId, indicatorType, params = {}) {
        const chartInstance = this.charts.get(chartId);
        if (!chartInstance) return null;
        
        const indicatorConfig = this.indicatorRegistry[indicatorType];
        if (!indicatorConfig) {
            console.error(`Unknown indicator: ${indicatorType}`);
            return null;
        }
        
        const indicatorParams = { ...indicatorConfig.params, ...params };
        const indicatorId = `${indicatorType}_${Date.now()}`;
        
        let series;
        if (indicatorConfig.type === 'overlay') {
            // Add to main chart
            series = this.createIndicatorSeries(chartInstance.chart, indicatorType, indicatorParams);
        } else {
            // Create new panel
            series = this.createIndicatorPanel(chartInstance.chart, indicatorType, indicatorParams);
        }
        
        const indicator = {
            id: indicatorId,
            type: indicatorType,
            params: indicatorParams,
            series,
            config: indicatorConfig
        };
        
        chartInstance.indicators.set(indicatorId, indicator);
        
        // Calculate and display indicator
        this.calculateIndicator(chartInstance, indicator);
        
        return indicatorId;
    }
    
    createIndicatorSeries(chart, type, params) {
        const colors = {
            sma: '#fbbf24',
            ema: '#f59e0b',
            wma: '#f97316',
            bollinger: { upper: '#60a5fa', middle: '#3b82f6', lower: '#60a5fa' },
            vwap: '#8b5cf6'
        };
        
        if (type === 'bollinger') {
            return {
                upper: chart.addLineSeries({ color: colors.bollinger.upper, lineWidth: 1 }),
                middle: chart.addLineSeries({ color: colors.bollinger.middle, lineWidth: 2 }),
                lower: chart.addLineSeries({ color: colors.bollinger.lower, lineWidth: 1 })
            };
        }
        
        return chart.addLineSeries({
            color: colors[type] || '#6b7280',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false
        });
    }
    
    createIndicatorPanel(chart, type, params) {
        // For panel indicators like RSI, MACD, etc.
        // These would be added as separate panes below the main chart
        
        const panelConfig = {
            rsi: { height: 100, colors: { line: '#f59e0b', overbought: '#ef4444', oversold: '#10b981' } },
            macd: { height: 120, colors: { macd: '#3b82f6', signal: '#ef4444', histogram: '#6b7280' } },
            volume: { height: 80, colors: { up: '#10b981', down: '#ef4444' } }
        };
        
        const config = panelConfig[type] || { height: 100, colors: { line: '#6b7280' } };
        
        if (type === 'macd') {
            return {
                macd: chart.addLineSeries({ color: config.colors.macd, lineWidth: 2 }),
                signal: chart.addLineSeries({ color: config.colors.signal, lineWidth: 2 }),
                histogram: chart.addHistogramSeries({ color: config.colors.histogram })
            };
        }
        
        return chart.addLineSeries({
            color: config.colors.line,
            lineWidth: 2
        });
    }
    
    calculateIndicator(chartInstance, indicator) {
        const data = chartInstance.data;
        if (!data || data.length === 0) return;
        
        let values;
        
        switch (indicator.type) {
            case 'sma':
                values = this.calculateSMA(data, indicator.params.period);
                break;
            case 'ema':
                values = this.calculateEMA(data, indicator.params.period);
                break;
            case 'rsi':
                values = this.calculateRSI(data, indicator.params.period);
                break;
            case 'macd':
                values = this.calculateMACD(data, indicator.params);
                break;
            case 'bollinger':
                values = this.calculateBollinger(data, indicator.params);
                break;
            case 'volume':
                values = data.map(d => ({ time: d.time, value: d.volume }));
                break;
            default:
                console.warn(`Indicator ${indicator.type} calculation not implemented`);
                return;
        }
        
        // Update series with calculated values
        if (indicator.type === 'bollinger' && values.upper) {
            indicator.series.upper.setData(values.upper);
            indicator.series.middle.setData(values.middle);
            indicator.series.lower.setData(values.lower);
        } else if (indicator.type === 'macd' && values.macd) {
            indicator.series.macd.setData(values.macd);
            indicator.series.signal.setData(values.signal);
            indicator.series.histogram.setData(values.histogram);
        } else if (values) {
            indicator.series.setData(values);
        }
    }
    
    calculateSMA(data, period) {
        const result = [];
        
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].close;
            }
            result.push({
                time: data[i].time,
                value: sum / period
            });
        }
        
        return result;
    }
    
    calculateEMA(data, period) {
        const result = [];
        const multiplier = 2 / (period + 1);
        
        // Calculate initial SMA
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i].close;
        }
        let ema = sum / period;
        
        result.push({
            time: data[period - 1].time,
            value: ema
        });
        
        // Calculate EMA for remaining data
        for (let i = period; i < data.length; i++) {
            ema = (data[i].close - ema) * multiplier + ema;
            result.push({
                time: data[i].time,
                value: ema
            });
        }
        
        return result;
    }
    
    calculateRSI(data, period) {
        const result = [];
        let gains = 0;
        let losses = 0;
        
        // Calculate initial average gain/loss
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
        let rs = avgGain / avgLoss;
        let rsi = 100 - (100 / (1 + rs));
        
        result.push({
            time: data[period].time,
            value: rsi
        });
        
        // Calculate RSI for remaining data
        for (let i = period + 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            
            if (change > 0) {
                avgGain = (avgGain * (period - 1) + change) / period;
                avgLoss = (avgLoss * (period - 1)) / period;
            } else {
                avgGain = (avgGain * (period - 1)) / period;
                avgLoss = (avgLoss * (period - 1) - change) / period;
            }
            
            rs = avgGain / avgLoss;
            rsi = 100 - (100 / (1 + rs));
            
            result.push({
                time: data[i].time,
                value: rsi
            });
        }
        
        return result;
    }
    
    calculateMACD(data, params) {
        const ema12 = this.calculateEMA(data, params.fast);
        const ema26 = this.calculateEMA(data, params.slow);
        
        const macdLine = [];
        const startIdx = params.slow - 1;
        
        for (let i = 0; i < ema12.length; i++) {
            const idx = i + (params.slow - params.fast);
            if (idx >= 0 && idx < ema26.length) {
                macdLine.push({
                    time: ema12[i].time,
                    value: ema12[i].value - ema26[idx].value
                });
            }
        }
        
        const signalLine = this.calculateEMAFromValues(macdLine, params.signal);
        
        const histogram = [];
        for (let i = 0; i < signalLine.length; i++) {
            const macdIdx = macdLine.findIndex(m => m.time === signalLine[i].time);
            if (macdIdx !== -1) {
                histogram.push({
                    time: signalLine[i].time,
                    value: macdLine[macdIdx].value - signalLine[i].value
                });
            }
        }
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram
        };
    }
    
    calculateEMAFromValues(values, period) {
        const result = [];
        const multiplier = 2 / (period + 1);
        
        if (values.length < period) return result;
        
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += values[i].value;
        }
        let ema = sum / period;
        
        result.push({
            time: values[period - 1].time,
            value: ema
        });
        
        for (let i = period; i < values.length; i++) {
            ema = (values[i].value - ema) * multiplier + ema;
            result.push({
                time: values[i].time,
                value: ema
            });
        }
        
        return result;
    }
    
    calculateBollinger(data, params) {
        const sma = this.calculateSMA(data, params.period);
        const upper = [];
        const middle = sma;
        const lower = [];
        
        for (let i = 0; i < sma.length; i++) {
            const dataIdx = i + params.period - 1;
            let sum = 0;
            
            for (let j = 0; j < params.period; j++) {
                const diff = data[dataIdx - j].close - sma[i].value;
                sum += diff * diff;
            }
            
            const stdDev = Math.sqrt(sum / params.period);
            
            upper.push({
                time: sma[i].time,
                value: sma[i].value + (stdDev * params.stdDev)
            });
            
            lower.push({
                time: sma[i].time,
                value: sma[i].value - (stdDev * params.stdDev)
            });
        }
        
        return { upper, middle, lower };
    }
    
    updateIndicators(chartInstance) {
        chartInstance.indicators.forEach(indicator => {
            this.calculateIndicator(chartInstance, indicator);
        });
    }
    
    removeIndicator(chartId, indicatorId) {
        const chartInstance = this.charts.get(chartId);
        if (!chartInstance) return;
        
        const indicator = chartInstance.indicators.get(indicatorId);
        if (!indicator) return;
        
        // Remove series from chart
        if (indicator.series) {
            if (indicator.type === 'bollinger') {
                chartInstance.chart.removeSeries(indicator.series.upper);
                chartInstance.chart.removeSeries(indicator.series.middle);
                chartInstance.chart.removeSeries(indicator.series.lower);
            } else if (indicator.type === 'macd') {
                chartInstance.chart.removeSeries(indicator.series.macd);
                chartInstance.chart.removeSeries(indicator.series.signal);
                chartInstance.chart.removeSeries(indicator.series.histogram);
            } else {
                chartInstance.chart.removeSeries(indicator.series);
            }
        }
        
        chartInstance.indicators.delete(indicatorId);
    }
    
    changeTimeframe(chartId, timeframe) {
        const chartInstance = this.charts.get(chartId);
        if (!chartInstance || !this.timeframes[timeframe]) return;
        
        chartInstance.timeframe = timeframe;
        
        // Clear real-time interval
        if (chartInstance.realtimeInterval) {
            clearInterval(chartInstance.realtimeInterval);
        }
        
        // Reload data with new timeframe
        this.loadChartData(chartInstance);
        
        // Re-setup real-time updates
        this.setupRealtimeUpdates(chartInstance);
    }
    
    changeChartType(chartId, type) {
        const chartInstance = this.charts.get(chartId);
        if (!chartInstance || !this.chartTypes[type]) return;
        
        chartInstance.type = type;
        
        // Remove old series
        chartInstance.chart.removeSeries(chartInstance.mainSeries);
        
        // Create new series with appropriate type
        // This is simplified - full implementation would handle all chart types
        let newSeries;
        switch (type) {
            case 'line':
                newSeries = chartInstance.chart.addLineSeries({
                    color: '#3b82f6',
                    lineWidth: 2
                });
                const lineData = chartInstance.data.map(d => ({
                    time: d.time,
                    value: d.close
                }));
                newSeries.setData(lineData);
                break;
            case 'area':
                newSeries = chartInstance.chart.addAreaSeries({
                    topColor: 'rgba(59, 130, 246, 0.4)',
                    bottomColor: 'rgba(59, 130, 246, 0.01)',
                    lineColor: '#3b82f6'
                });
                const areaData = chartInstance.data.map(d => ({
                    time: d.time,
                    value: d.close
                }));
                newSeries.setData(areaData);
                break;
            default:
                newSeries = chartInstance.chart.addCandlestickSeries({
                    upColor: '#10b981',
                    downColor: '#ef4444'
                });
                newSeries.setData(chartInstance.data);
        }
        
        chartInstance.mainSeries = newSeries;
        
        // Recalculate indicators
        this.updateIndicators(chartInstance);
    }
    
    startDrawing(chartId, tool) {
        const chartInstance = this.charts.get(chartId);
        if (!chartInstance || !this.drawingTools[tool]) return;
        
        chartInstance.drawingMode = tool;
        chartInstance.drawingInProgress = true;
        
        // Add drawing event listeners
        const container = document.getElementById(chartInstance.container);
        container.style.cursor = 'crosshair';
        
        // Implementation would handle mouse events for drawing
        // This is a placeholder for the drawing functionality
    }
    
    setupEventListeners() {
        // Chart control events
        document.addEventListener('changeTimeframe', (e) => {
            this.changeTimeframe(e.detail.chartId, e.detail.timeframe);
        });
        
        document.addEventListener('changeChartType', (e) => {
            this.changeChartType(e.detail.chartId, e.detail.type);
        });
        
        document.addEventListener('addIndicator', (e) => {
            this.addIndicator(e.detail.chartId, e.detail.indicator, e.detail.params);
        });
        
        document.addEventListener('removeIndicator', (e) => {
            this.removeIndicator(e.detail.chartId, e.detail.indicatorId);
        });
        
        document.addEventListener('startDrawing', (e) => {
            this.startDrawing(e.detail.chartId, e.detail.tool);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.activeChart) return;
            
            // Ctrl+Z: Undo
            if (e.ctrlKey && e.key === 'z') {
                this.undo();
            }
            // Ctrl+Y: Redo
            else if (e.ctrlKey && e.key === 'y') {
                this.redo();
            }
            // Delete: Remove selected drawing
            else if (e.key === 'Delete') {
                this.deleteSelectedDrawing();
            }
            // Escape: Cancel drawing
            else if (e.key === 'Escape') {
                this.cancelDrawing();
            }
        });
    }
    
    setupResizeObserver(chartInstance) {
        const container = document.getElementById(chartInstance.container);
        
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                chartInstance.chart.applyOptions({ width, height });
            }
        });
        
        resizeObserver.observe(container);
        
        // Store observer for cleanup
        chartInstance.resizeObserver = resizeObserver;
    }
    
    takeSnapshot(chartId) {
        const chartInstance = this.charts.get(chartId);
        if (!chartInstance) return null;
        
        // Implementation would capture chart as image
        const snapshot = {
            id: Date.now(),
            symbol: chartInstance.symbol,
            timeframe: chartInstance.timeframe,
            timestamp: new Date().toISOString(),
            indicators: Array.from(chartInstance.indicators.keys()),
            drawings: chartInstance.drawings.length
        };
        
        // Save to localStorage
        const snapshots = JSON.parse(localStorage.getItem('chartSnapshots') || '[]');
        snapshots.push(snapshot);
        localStorage.setItem('chartSnapshots', JSON.stringify(snapshots));
        
        return snapshot;
    }
    
    saveChartTemplate(chartId, name) {
        const chartInstance = this.charts.get(chartId);
        if (!chartInstance) return null;
        
        const template = {
            name,
            type: chartInstance.type,
            indicators: Array.from(chartInstance.indicators.values()).map(ind => ({
                type: ind.type,
                params: ind.params
            })),
            settings: {
                showVolume: this.config.showVolume,
                showGrid: this.config.showGrid
            }
        };
        
        const templates = JSON.parse(localStorage.getItem('chartTemplates') || '[]');
        templates.push(template);
        localStorage.setItem('chartTemplates', JSON.stringify(templates));
        
        return template;
    }
    
    loadChartTemplate(chartId, templateName) {
        const chartInstance = this.charts.get(chartId);
        if (!chartInstance) return;
        
        const templates = JSON.parse(localStorage.getItem('chartTemplates') || '[]');
        const template = templates.find(t => t.name === templateName);
        
        if (!template) return;
        
        // Clear existing indicators
        chartInstance.indicators.forEach((ind, id) => {
            this.removeIndicator(chartId, id);
        });
        
        // Apply template
        this.changeChartType(chartId, template.type);
        
        template.indicators.forEach(ind => {
            this.addIndicator(chartId, ind.type, ind.params);
        });
        
        this.config = { ...this.config, ...template.settings };
        this.saveConfig();
    }
    
    exportChart(chartId, format = 'png') {
        const chartInstance = this.charts.get(chartId);
        if (!chartInstance) return;
        
        // Implementation would export chart in specified format
        console.log(`Exporting chart ${chartId} as ${format}`);
    }
    
    syncCharts(sourceChartId, targetChartIds) {
        const sourceChart = this.charts.get(sourceChartId);
        if (!sourceChart) return;
        
        // Sync crosshair and time scale across charts
        targetChartIds.forEach(targetId => {
            const targetChart = this.charts.get(targetId);
            if (targetChart) {
                // Sync time scale
                sourceChart.chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
                    targetChart.chart.timeScale().setVisibleLogicalRange(range);
                });
                
                // Sync crosshair
                sourceChart.chart.subscribeCrosshairMove(param => {
                    targetChart.chart.setCrosshairPosition(param.point, param.time, targetChart.mainSeries);
                });
            }
        });
    }
    
    cleanup() {
        // Clean up all charts
        this.charts.forEach(chartInstance => {
            if (chartInstance.realtimeInterval) {
                clearInterval(chartInstance.realtimeInterval);
            }
            if (chartInstance.resizeObserver) {
                chartInstance.resizeObserver.disconnect();
            }
            chartInstance.chart.remove();
        });
        
        this.charts.clear();
    }
}

// Initialize charts module when document is ready
if (typeof window !== 'undefined') {
    window.chartsModule = null;
    
    document.addEventListener('DOMContentLoaded', () => {
        // Load Lightweight Charts library if not already loaded
        if (!window.LightweightCharts) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
            script.onload = () => {
                window.chartsModule = new ChartsModule();
            };
            document.head.appendChild(script);
        } else {
            window.chartsModule = new ChartsModule();
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartsModule;
}