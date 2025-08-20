/**
 * AuraQuant - Advanced Honeypot Detection Module
 * Detects scam/honeypot tokens using multiple APIs
 * Version: 2.0.0
 */

class HoneypotDetector {
    constructor() {
        // API Configurations
        this.apis = {
            tokenSniffer: {
                url: 'https://tokensniffer.com/api/v2/tokens',
                key: localStorage.getItem('tokensniffer_api_key') || '',
                weight: 0.3,
                timeout: 3000,
                retries: 2
            },
            honeypotIs: {
                url: 'https://api.honeypot.is/v2/IsHoneypot',
                key: localStorage.getItem('honeypot_is_api_key') || '',
                weight: 0.25,
                timeout: 2500,
                retries: 2
            },
            goPlus: {
                url: 'https://api.gopluslabs.io/api/v1/token_security',
                key: localStorage.getItem('goplus_api_key') || '',
                weight: 0.25,
                timeout: 3000,
                retries: 3
            },
            dexTools: {
                url: 'https://api.dextools.io/v1/token',
                key: localStorage.getItem('dextools_api_key') || '',
                weight: 0.2,
                timeout: 3500,
                retries: 2
            },
            dexScreener: {
                url: 'https://api.dexscreener.com/latest/dex/tokens',
                key: '', // No API key required
                weight: 0.15,
                timeout: 2000,
                retries: 2
            },
            quickIntel: {
                url: 'https://api.quickintel.io/v1/assessment',
                key: localStorage.getItem('quickintel_api_key') || '',
                weight: 0.15,
                timeout: 2500,
                retries: 2
            }
        };

        // Detection thresholds
        this.thresholds = {
            critical: 0.8,   // > 80% risk = critical danger
            high: 0.6,       // > 60% risk = high danger
            medium: 0.4,     // > 40% risk = medium risk
            low: 0.2         // > 20% risk = low risk
        };

        // Cache configuration
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.maxCacheSize = 1000;

        // Blacklist/Whitelist
        this.blacklist = new Set(JSON.parse(localStorage.getItem('honeypot_blacklist') || '[]'));
        this.whitelist = new Set(JSON.parse(localStorage.getItem('honeypot_whitelist') || '[]'));

        // Detection patterns
        this.suspiciousPatterns = {
            contractCode: [
                /function\s+_transfer.*?onlyOwner/i,
                /modifier\s+onlyOwner.*?_transfer/i,
                /blacklist\[.*?\]\s*=\s*true/i,
                /require\(.*?!blacklisted/i,
                /function\s+pause\(\)/i,
                /selfdestruct\(/i,
                /delegatecall\(/i
            ],
            tokenName: [
                /elon/i, /musk/i, /doge/i, /shib/i, /moon/i,
                /rocket/i, /pump/i, /100x/i, /1000x/i,
                /scam/i, /rug/i, /honeypot/i
            ],
            liquidityPatterns: [
                { locked: false, weight: 0.3 },
                { lpRatio: 0.01, weight: 0.4 },  // < 1% liquidity
                { holders: 10, weight: 0.3 }      // < 10 holders
            ]
        };

        // Metrics
        this.metrics = {
            totalScans: 0,
            honeypotDetected: 0,
            falsePositives: 0,
            apiFailures: {},
            avgResponseTime: 0,
            lastUpdate: Date.now()
        };

        // Real-time monitoring
        this.monitoring = {
            active: false,
            watchlist: new Map(),
            interval: null,
            alertCallback: null
        };

        this.initializeModule();
    }

    async initializeModule() {
        console.log('🍯 Initializing Honeypot Detection Module...');
        
        // Load saved configurations
        this.loadConfigurations();
        
        // Test API connections
        await this.testAPIConnections();
        
        // Start cache cleanup
        this.startCacheCleanup();
        
        // Initialize monitoring if configured
        if (localStorage.getItem('honeypot_monitoring_enabled') === 'true') {
            this.startMonitoring();
        }

        console.log('✅ Honeypot Detection Module initialized');
    }

    /**
     * Main detection function - checks if token is honeypot
     */
    async detectHoneypot(tokenAddress, chain = 'ethereum') {
        this.metrics.totalScans++;
        const startTime = Date.now();

        try {
            // Check cache first
            const cacheKey = `${chain}:${tokenAddress}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log(`📦 Returning cached result for ${tokenAddress}`);
                return cached;
            }

            // Check blacklist/whitelist
            if (this.blacklist.has(tokenAddress)) {
                return this.createResult(tokenAddress, 1.0, 'BLACKLISTED', {
                    reason: 'Token is blacklisted',
                    severity: 'CRITICAL'
                });
            }

            if (this.whitelist.has(tokenAddress)) {
                return this.createResult(tokenAddress, 0.0, 'WHITELISTED', {
                    reason: 'Token is whitelisted',
                    severity: 'SAFE'
                });
            }

            // Parallel API calls with timeout
            const apiResults = await this.callAPIsInParallel(tokenAddress, chain);
            
            // Calculate combined risk score
            const riskAnalysis = this.calculateRiskScore(apiResults);
            
            // Get contract analysis if available
            const contractAnalysis = await this.analyzeContract(tokenAddress, chain);
            
            // Combine all analyses
            const finalResult = this.combineAnalyses(
                tokenAddress,
                riskAnalysis,
                contractAnalysis,
                apiResults
            );

            // Cache result
            this.addToCache(cacheKey, finalResult);

            // Update metrics
            const responseTime = Date.now() - startTime;
            this.updateMetrics(responseTime, finalResult);

            // Trigger alerts if needed
            if (finalResult.riskScore > this.thresholds.high) {
                this.triggerAlert(finalResult);
            }

            return finalResult;

        } catch (error) {
            console.error('❌ Honeypot detection error:', error);
            return this.createResult(tokenAddress, 0.5, 'ERROR', {
                error: error.message,
                severity: 'UNKNOWN'
            });
        }
    }

    /**
     * Call multiple APIs in parallel with timeout
     */
    async callAPIsInParallel(tokenAddress, chain) {
        const apiCalls = [];
        
        // TokenSniffer API
        if (this.apis.tokenSniffer.key) {
            apiCalls.push(
                this.callWithRetry(
                    () => this.checkTokenSniffer(tokenAddress, chain),
                    'tokenSniffer'
                )
            );
        }

        // Honeypot.is API
        if (this.apis.honeypotIs.key) {
            apiCalls.push(
                this.callWithRetry(
                    () => this.checkHoneypotIs(tokenAddress, chain),
                    'honeypotIs'
                )
            );
        }

        // GoPlus Labs API
        if (this.apis.goPlus.key) {
            apiCalls.push(
                this.callWithRetry(
                    () => this.checkGoPlus(tokenAddress, chain),
                    'goPlus'
                )
            );
        }

        // DexTools API
        if (this.apis.dexTools.key) {
            apiCalls.push(
                this.callWithRetry(
                    () => this.checkDexTools(tokenAddress, chain),
                    'dexTools'
                )
            );
        }

        // DexScreener API (no key required)
        apiCalls.push(
            this.callWithRetry(
                () => this.checkDexScreener(tokenAddress, chain),
                'dexScreener'
            )
        );

        // Quick Intel API
        if (this.apis.quickIntel.key) {
            apiCalls.push(
                this.callWithRetry(
                    () => this.checkQuickIntel(tokenAddress, chain),
                    'quickIntel'
                )
            );
        }

        // Execute all calls in parallel with timeout
        const results = await Promise.allSettled(apiCalls);
        
        return results
            .filter(r => r.status === 'fulfilled' && r.value)
            .map(r => r.value);
    }

    /**
     * TokenSniffer API check
     */
    async checkTokenSniffer(tokenAddress, chain) {
        const url = `${this.apis.tokenSniffer.url}/${chain}/${tokenAddress}`;
        const response = await this.fetchWithTimeout(url, {
            headers: {
                'Authorization': `Bearer ${this.apis.tokenSniffer.key}`,
                'Content-Type': 'application/json'
            }
        }, this.apis.tokenSniffer.timeout);

        const data = await response.json();
        
        return {
            source: 'TokenSniffer',
            riskScore: data.score ? (100 - data.score) / 100 : 0.5,
            issues: data.issues || [],
            details: {
                sellTax: data.sellTax,
                buyTax: data.buyTax,
                isHoneypot: data.is_honeypot,
                hasProxyCalls: data.has_proxy_calls,
                hasMintFunction: data.has_mint_function
            }
        };
    }

    /**
     * Honeypot.is API check
     */
    async checkHoneypotIs(tokenAddress, chain) {
        const params = new URLSearchParams({
            address: tokenAddress,
            chain: chain,
            simulateLiquidity: '1'
        });

        const response = await this.fetchWithTimeout(
            `${this.apis.honeypotIs.url}?${params}`,
            {
                headers: {
                    'X-API-KEY': this.apis.honeypotIs.key
                }
            },
            this.apis.honeypotIs.timeout
        );

        const data = await response.json();
        
        let riskScore = 0;
        if (data.honeypotResult?.isHoneypot) riskScore += 0.5;
        if (data.simulationResult?.sellTax > 50) riskScore += 0.3;
        if (data.simulationResult?.buyTax > 50) riskScore += 0.2;

        return {
            source: 'Honeypot.is',
            riskScore: Math.min(riskScore, 1),
            issues: data.honeypotReason ? [data.honeypotReason] : [],
            details: {
                sellTax: data.simulationResult?.sellTax,
                buyTax: data.simulationResult?.buyTax,
                transferTax: data.simulationResult?.transferTax,
                liquidity: data.pair?.liquidity
            }
        };
    }

    /**
     * GoPlus Labs Security API check
     */
    async checkGoPlus(tokenAddress, chain) {
        const chainId = this.getChainId(chain);
        const params = new URLSearchParams({
            contract_addresses: tokenAddress,
            chain_id: chainId
        });

        const response = await this.fetchWithTimeout(
            `${this.apis.goPlus.url}?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.apis.goPlus.key}`
                }
            },
            this.apis.goPlus.timeout
        );

        const data = await response.json();
        const result = data.result?.[tokenAddress.toLowerCase()];
        
        if (!result) return null;

        let riskScore = 0;
        const issues = [];

        // Check various risk factors
        if (result.is_honeypot === '1') {
            riskScore += 0.4;
            issues.push('Honeypot detected');
        }
        if (result.is_blacklisted === '1') {
            riskScore += 0.3;
            issues.push('Blacklisted token');
        }
        if (result.is_proxy === '1') {
            riskScore += 0.1;
            issues.push('Proxy contract');
        }
        if (result.is_mintable === '1') {
            riskScore += 0.1;
            issues.push('Mintable token');
        }
        if (result.can_take_back_ownership === '1') {
            riskScore += 0.2;
            issues.push('Ownership can be reclaimed');
        }
        if (parseInt(result.sell_tax) > 10) {
            riskScore += 0.2;
            issues.push(`High sell tax: ${result.sell_tax}%`);
        }

        return {
            source: 'GoPlus',
            riskScore: Math.min(riskScore, 1),
            issues,
            details: {
                sellTax: result.sell_tax,
                buyTax: result.buy_tax,
                isOpenSource: result.is_open_source === '1',
                holderCount: result.holder_count,
                lpHolders: result.lp_holders
            }
        };
    }

    /**
     * DexTools API check
     */
    async checkDexTools(tokenAddress, chain) {
        const response = await this.fetchWithTimeout(
            `${this.apis.dexTools.url}/${chain}/${tokenAddress}`,
            {
                headers: {
                    'X-API-KEY': this.apis.dexTools.key,
                    'Accept': 'application/json'
                }
            },
            this.apis.dexTools.timeout
        );

        const data = await response.json();
        
        let riskScore = 0;
        const issues = [];

        // Analyze DexTools audit data
        if (data.data?.audit) {
            const audit = data.data.audit;
            
            if (!audit.is_contract_renounced) {
                riskScore += 0.1;
                issues.push('Contract not renounced');
            }
            if (audit.is_honeypot) {
                riskScore += 0.5;
                issues.push('Honeypot flag');
            }
            if (audit.sell_tax > 10) {
                riskScore += 0.2;
                issues.push(`Sell tax: ${audit.sell_tax}%`);
            }
            if (!audit.liquidity_locked) {
                riskScore += 0.3;
                issues.push('Liquidity not locked');
            }
        }

        return {
            source: 'DexTools',
            riskScore: Math.min(riskScore, 1),
            issues,
            details: {
                score: data.data?.score,
                liquidity: data.data?.liquidity,
                volume24h: data.data?.volume_24h,
                holders: data.data?.holders
            }
        };
    }

    /**
     * DexScreener API check (free, no key required)
     */
    async checkDexScreener(tokenAddress, chain) {
        const response = await this.fetchWithTimeout(
            `${this.apis.dexScreener.url}/${tokenAddress}`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            },
            this.apis.dexScreener.timeout
        );

        const data = await response.json();
        
        if (!data.pairs || data.pairs.length === 0) {
            return {
                source: 'DexScreener',
                riskScore: 0.7, // No pairs found is suspicious
                issues: ['No trading pairs found'],
                details: {}
            };
        }

        const mainPair = data.pairs[0];
        let riskScore = 0;
        const issues = [];

        // Check liquidity
        const liquidity = parseFloat(mainPair.liquidity?.usd || 0);
        if (liquidity < 10000) {
            riskScore += 0.3;
            issues.push(`Low liquidity: $${liquidity.toFixed(2)}`);
        }

        // Check price change
        const priceChange = Math.abs(parseFloat(mainPair.priceChange?.h24 || 0));
        if (priceChange > 50) {
            riskScore += 0.2;
            issues.push(`High volatility: ${priceChange}% in 24h`);
        }

        // Check transaction count
        const txns = mainPair.txns?.h24?.buys + mainPair.txns?.h24?.sells || 0;
        if (txns < 100) {
            riskScore += 0.1;
            issues.push('Low transaction volume');
        }

        return {
            source: 'DexScreener',
            riskScore: Math.min(riskScore, 1),
            issues,
            details: {
                liquidity: liquidity,
                volume24h: mainPair.volume?.h24,
                priceChange24h: mainPair.priceChange?.h24,
                txCount24h: txns,
                fdv: mainPair.fdv
            }
        };
    }

    /**
     * Quick Intel API check
     */
    async checkQuickIntel(tokenAddress, chain) {
        const response = await this.fetchWithTimeout(
            this.apis.quickIntel.url,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apis.quickIntel.key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: tokenAddress,
                    chain: chain,
                    deepScan: true
                })
            },
            this.apis.quickIntel.timeout
        );

        const data = await response.json();
        
        return {
            source: 'QuickIntel',
            riskScore: data.riskScore || 0.5,
            issues: data.warnings || [],
            details: {
                aiScore: data.aiScore,
                communityScore: data.communityScore,
                technicalScore: data.technicalScore,
                recommendations: data.recommendations
            }
        };
    }

    /**
     * Analyze smart contract code
     */
    async analyzeContract(tokenAddress, chain) {
        try {
            // This would connect to Etherscan/BSCScan/etc API
            // For now, return pattern-based analysis
            
            const analysis = {
                hasRiskyFunctions: false,
                hasSuspiciousName: false,
                ownership: 'unknown',
                verified: false,
                proxyContract: false,
                pausable: false
            };

            // Check token name patterns (mock)
            const tokenName = await this.getTokenName(tokenAddress, chain);
            if (tokenName) {
                for (const pattern of this.suspiciousPatterns.tokenName) {
                    if (pattern.test(tokenName)) {
                        analysis.hasSuspiciousName = true;
                        break;
                    }
                }
            }

            return analysis;

        } catch (error) {
            console.error('Contract analysis error:', error);
            return null;
        }
    }

    /**
     * Calculate combined risk score from multiple sources
     */
    calculateRiskScore(apiResults) {
        if (apiResults.length === 0) {
            return { score: 0.5, confidence: 'LOW' };
        }

        let weightedSum = 0;
        let totalWeight = 0;
        const issues = new Set();

        for (const result of apiResults) {
            const apiConfig = this.apis[result.source.toLowerCase().replace(/\s+/g, '')] || 
                             { weight: 0.1 };
            
            weightedSum += result.riskScore * apiConfig.weight;
            totalWeight += apiConfig.weight;
            
            result.issues?.forEach(issue => issues.add(issue));
        }

        const score = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
        
        // Determine confidence based on number of sources
        let confidence = 'LOW';
        if (apiResults.length >= 4) confidence = 'HIGH';
        else if (apiResults.length >= 2) confidence = 'MEDIUM';

        return {
            score,
            confidence,
            sources: apiResults.length,
            issues: Array.from(issues)
        };
    }

    /**
     * Combine all analyses into final result
     */
    combineAnalyses(tokenAddress, riskAnalysis, contractAnalysis, apiResults) {
        let finalScore = riskAnalysis.score;
        const warnings = [...riskAnalysis.issues];
        
        // Adjust score based on contract analysis
        if (contractAnalysis) {
            if (contractAnalysis.hasSuspiciousName) {
                finalScore = Math.min(finalScore + 0.1, 1);
                warnings.push('Suspicious token name pattern');
            }
            if (!contractAnalysis.verified) {
                finalScore = Math.min(finalScore + 0.05, 1);
                warnings.push('Unverified contract');
            }
            if (contractAnalysis.proxyContract) {
                warnings.push('Proxy contract detected');
            }
        }

        // Determine severity
        let severity = 'SAFE';
        if (finalScore > this.thresholds.critical) severity = 'CRITICAL';
        else if (finalScore > this.thresholds.high) severity = 'HIGH';
        else if (finalScore > this.thresholds.medium) severity = 'MEDIUM';
        else if (finalScore > this.thresholds.low) severity = 'LOW';

        return this.createResult(tokenAddress, finalScore, severity, {
            confidence: riskAnalysis.confidence,
            warnings,
            apiResults,
            contractAnalysis,
            timestamp: Date.now(),
            recommendation: this.getRecommendation(finalScore)
        });
    }

    /**
     * Create standardized result object
     */
    createResult(tokenAddress, riskScore, severity, details) {
        return {
            tokenAddress,
            riskScore,
            severity,
            isHoneypot: riskScore > this.thresholds.high,
            canBuy: riskScore < this.thresholds.medium,
            canSell: riskScore < this.thresholds.high,
            details,
            checkedAt: new Date().toISOString()
        };
    }

    /**
     * Get recommendation based on risk score
     */
    getRecommendation(riskScore) {
        if (riskScore > this.thresholds.critical) {
            return '🚫 AVOID - Critical honeypot risk detected';
        } else if (riskScore > this.thresholds.high) {
            return '⚠️ HIGH RISK - Likely honeypot or scam';
        } else if (riskScore > this.thresholds.medium) {
            return '⚡ CAUTION - Medium risk, research thoroughly';
        } else if (riskScore > this.thresholds.low) {
            return '👀 LOW RISK - Appears safe but verify';
        } else {
            return '✅ SAFE - Low honeypot risk';
        }
    }

    /**
     * Monitoring functions
     */
    startMonitoring(interval = 60000) {
        if (this.monitoring.active) return;
        
        this.monitoring.active = true;
        this.monitoring.interval = setInterval(() => {
            this.checkWatchlist();
        }, interval);
        
        console.log('🔍 Honeypot monitoring started');
    }

    stopMonitoring() {
        if (!this.monitoring.active) return;
        
        this.monitoring.active = false;
        if (this.monitoring.interval) {
            clearInterval(this.monitoring.interval);
            this.monitoring.interval = null;
        }
        
        console.log('🛑 Honeypot monitoring stopped');
    }

    addToWatchlist(tokenAddress, chain = 'ethereum', alertThreshold = 0.6) {
        this.monitoring.watchlist.set(tokenAddress, {
            chain,
            alertThreshold,
            lastCheck: 0,
            lastScore: 0
        });
        
        // Save to localStorage
        this.saveWatchlist();
    }

    removeFromWatchlist(tokenAddress) {
        this.monitoring.watchlist.delete(tokenAddress);
        this.saveWatchlist();
    }

    async checkWatchlist() {
        const promises = [];
        
        for (const [token, config] of this.monitoring.watchlist) {
            promises.push(
                this.detectHoneypot(token, config.chain).then(result => {
                    const previousScore = config.lastScore;
                    config.lastScore = result.riskScore;
                    config.lastCheck = Date.now();
                    
                    // Check if alert needed
                    if (result.riskScore > config.alertThreshold) {
                        this.triggerAlert({
                            ...result,
                            watchlist: true,
                            previousScore
                        });
                    }
                    
                    return result;
                }).catch(error => {
                    console.error(`Failed to check ${token}:`, error);
                    return null;
                })
            );
        }
        
        await Promise.allSettled(promises);
    }

    /**
     * Alert system
     */
    triggerAlert(result) {
        const alert = {
            type: 'HONEYPOT_DETECTION',
            severity: result.severity,
            token: result.tokenAddress,
            score: result.riskScore,
            message: result.details.recommendation,
            timestamp: Date.now()
        };

        // Console alert
        console.warn('🚨 HONEYPOT ALERT:', alert);

        // UI notification
        if (window.showNotification) {
            window.showNotification(
                `Honeypot Alert: ${result.severity}`,
                alert.message,
                result.severity === 'CRITICAL' ? 'error' : 'warning'
            );
        }

        // Audio alert
        if (window.audioAlerts) {
            const sound = result.severity === 'CRITICAL' ? 'alarm' : 'warning';
            window.audioAlerts.play(sound);
        }

        // Webhook alert
        if (window.webhooksAdvanced) {
            window.webhooksAdvanced.send({
                type: 'honeypot_alert',
                priority: result.severity === 'CRITICAL' ? 'critical' : 'high',
                data: alert
            });
        }

        // Custom callback
        if (this.monitoring.alertCallback) {
            this.monitoring.alertCallback(alert);
        }

        // Log to metrics
        if (result.severity === 'CRITICAL' || result.severity === 'HIGH') {
            this.metrics.honeypotDetected++;
        }
    }

    /**
     * Utility functions
     */
    async fetchWithTimeout(url, options = {}, timeout = 5000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    async callWithRetry(fn, apiName, maxRetries = 2) {
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                console.warn(`API call failed (${apiName}), attempt ${i + 1}/${maxRetries + 1}`);
                
                if (i < maxRetries) {
                    await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
                }
            }
        }
        
        // Track API failure
        this.metrics.apiFailures[apiName] = 
            (this.metrics.apiFailures[apiName] || 0) + 1;
        
        throw lastError;
    }

    getChainId(chain) {
        const chainIds = {
            'ethereum': '1',
            'bsc': '56',
            'polygon': '137',
            'avalanche': '43114',
            'arbitrum': '42161',
            'optimism': '10',
            'fantom': '250',
            'cronos': '25'
        };
        return chainIds[chain.toLowerCase()] || '1';
    }

    async getTokenName(tokenAddress, chain) {
        // This would fetch from blockchain
        // Mock implementation
        return null;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    addToCache(key, data) {
        // Implement LRU cache
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of this.cache) {
                if (now - value.timestamp > this.cacheExpiry) {
                    this.cache.delete(key);
                }
            }
        }, 60000); // Clean every minute
    }

    /**
     * Configuration management
     */
    loadConfigurations() {
        // Load API keys
        for (const api in this.apis) {
            const savedKey = localStorage.getItem(`${api}_api_key`);
            if (savedKey) {
                this.apis[api].key = savedKey;
            }
        }

        // Load thresholds
        const savedThresholds = localStorage.getItem('honeypot_thresholds');
        if (savedThresholds) {
            Object.assign(this.thresholds, JSON.parse(savedThresholds));
        }

        // Load watchlist
        const savedWatchlist = localStorage.getItem('honeypot_watchlist');
        if (savedWatchlist) {
            const list = JSON.parse(savedWatchlist);
            list.forEach(item => {
                this.monitoring.watchlist.set(item.token, item.config);
            });
        }
    }

    saveConfigurations() {
        // Save thresholds
        localStorage.setItem('honeypot_thresholds', JSON.stringify(this.thresholds));
        
        // Save blacklist/whitelist
        localStorage.setItem('honeypot_blacklist', JSON.stringify([...this.blacklist]));
        localStorage.setItem('honeypot_whitelist', JSON.stringify([...this.whitelist]));
    }

    saveWatchlist() {
        const list = [];
        for (const [token, config] of this.monitoring.watchlist) {
            list.push({ token, config });
        }
        localStorage.setItem('honeypot_watchlist', JSON.stringify(list));
    }

    /**
     * Testing and validation
     */
    async testAPIConnections() {
        console.log('Testing API connections...');
        const results = {};

        for (const [name, config] of Object.entries(this.apis)) {
            if (!config.key && name !== 'dexScreener') {
                results[name] = 'NO_KEY';
                continue;
            }

            try {
                // Test with a known safe token (USDT on Ethereum)
                const testToken = '0xdac17f958d2ee523a2206206994597c13d831ec7';
                await this[`check${name.charAt(0).toUpperCase() + name.slice(1)}`](
                    testToken, 
                    'ethereum'
                );
                results[name] = 'OK';
            } catch (error) {
                results[name] = 'FAILED';
                console.error(`${name} test failed:`, error.message);
            }
        }

        console.log('API test results:', results);
        return results;
    }

    /**
     * Metrics and reporting
     */
    updateMetrics(responseTime, result) {
        // Update average response time
        this.metrics.avgResponseTime = 
            (this.metrics.avgResponseTime * (this.metrics.totalScans - 1) + responseTime) / 
            this.metrics.totalScans;

        // Update detection count
        if (result.isHoneypot) {
            this.metrics.honeypotDetected++;
        }

        this.metrics.lastUpdate = Date.now();

        // Save metrics periodically
        if (this.metrics.totalScans % 10 === 0) {
            this.saveMetrics();
        }
    }

    saveMetrics() {
        localStorage.setItem('honeypot_metrics', JSON.stringify(this.metrics));
    }

    getMetrics() {
        return {
            ...this.metrics,
            detectionRate: this.metrics.totalScans > 0 ? 
                (this.metrics.honeypotDetected / this.metrics.totalScans * 100).toFixed(2) + '%' : 
                '0%',
            uptime: Date.now() - this.metrics.lastUpdate
        };
    }

    /**
     * Public API
     */
    async checkToken(address, chain = 'ethereum') {
        return await this.detectHoneypot(address, chain);
    }

    async batchCheck(tokens, chain = 'ethereum') {
        const results = [];
        for (const token of tokens) {
            results.push(await this.detectHoneypot(token, chain));
            await this.delay(100); // Rate limiting
        }
        return results;
    }

    setAlertCallback(callback) {
        this.monitoring.alertCallback = callback;
    }

    addToBlacklist(tokenAddress) {
        this.blacklist.add(tokenAddress);
        this.saveConfigurations();
    }

    addToWhitelist(tokenAddress) {
        this.whitelist.add(tokenAddress);
        this.saveConfigurations();
    }

    updateThreshold(type, value) {
        if (this.thresholds[type] !== undefined) {
            this.thresholds[type] = value;
            this.saveConfigurations();
        }
    }

    updateAPIKey(apiName, key) {
        if (this.apis[apiName]) {
            this.apis[apiName].key = key;
            localStorage.setItem(`${apiName}_api_key`, key);
        }
    }

    clearCache() {
        this.cache.clear();
        console.log('Cache cleared');
    }

    exportReport() {
        return {
            metrics: this.getMetrics(),
            blacklist: [...this.blacklist],
            whitelist: [...this.whitelist],
            watchlist: [...this.monitoring.watchlist.entries()],
            thresholds: this.thresholds,
            apiStatus: Object.entries(this.apis).map(([name, config]) => ({
                name,
                hasKey: !!config.key,
                failures: this.metrics.apiFailures[name] || 0
            }))
        };
    }
}

// Initialize on load
let honeypotDetector;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        honeypotDetector = new HoneypotDetector();
        window.honeypotDetector = honeypotDetector;
    });
} else {
    honeypotDetector = new HoneypotDetector();
    window.honeypotDetector = honeypotDetector;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HoneypotDetector;
}