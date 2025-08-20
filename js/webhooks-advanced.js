/**
 * AuraQuant Advanced Webhooks Module
 * High-performance webhook system for Cloudflare-Render-Social Media integration
 * Optimized for lowest latency and maximum uptime
 */

import Constants from './constants.js';
import Helpers from './helpers.js';

class AdvancedWebhookManager {
    constructor() {
        // Endpoint configuration with multi-region failover
        this.endpoints = {
            // Render backend with geographic distribution
            backend: {
                primary: {
                    url: process.env.RENDER_BACKEND_URL || 'https://auraquant-backend.onrender.com',
                    region: 'us-west',
                    priority: 1
                },
                secondary: {
                    url: process.env.RENDER_BACKEND_EU || 'https://auraquant-eu.onrender.com',
                    region: 'eu-west',
                    priority: 2
                },
                fallback: {
                    url: process.env.BACKUP_BACKEND || 'https://auraquant-backup.herokuapp.com',
                    region: 'us-east',
                    priority: 3
                }
            },
            
            // Social media endpoints
            social: {
                telegram: {
                    url: Constants.API.SOCIAL.TELEGRAM,
                    token: null,
                    chatIds: [],
                    rateLimit: 30, // messages per second
                    priority: 'high'
                },
                discord: {
                    webhooks: [], // Multiple webhook URLs for redundancy
                    rateLimit: 5,
                    priority: 'medium'
                },
                twitter: {
                    url: Constants.API.SOCIAL.TWITTER,
                    bearer: null,
                    rateLimit: 300, // per 15 minutes
                    priority: 'low'
                },
                email: {
                    provider: 'sendgrid',
                    url: 'https://api.sendgrid.com/v3/mail/send',
                    apiKey: null,
                    fallbackProvider: 'ses',
                    priority: 'high'
                }
            }
        };

        // Performance configuration
        this.config = {
            // Request optimization
            batchSize: 100,
            batchInterval: 50, // ms - ultra low latency
            maxConcurrent: 20,
            compressionThreshold: 512, // bytes
            
            // Caching
            edgeCacheEnabled: true,
            edgeCacheTTL: 30000, // 30 seconds
            memoryCacheSize: 10000,
            
            // Circuit breaker
            circuitBreakerThreshold: 3,
            circuitBreakerTimeout: 15000,
            circuitBreakerHalfOpenRequests: 3,
            
            // Retry strategy
            retryAttempts: 3,
            retryBackoff: 'exponential',
            retryMaxDelay: 5000,
            
            // Connection pooling
            keepAlive: true,
            keepAliveTimeout: 60000,
            maxSockets: 50,
            
            // Rate limiting
            globalRateLimit: 1000, // requests per second
            burstAllowance: 200
        };

        // High-performance data structures
        this.requestQueue = [];
        this.priorityQueue = [];
        this.batchBuffer = new Map();
        this.activeRequests = new Map();
        this.connectionPool = new Map();
        
        // Circuit breakers per endpoint
        this.circuitBreakers = new Map();
        
        // Cache layers
        this.memoryCache = new Map();
        this.edgeCache = null;
        
        // Metrics with percentiles
        this.metrics = {
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                cached: 0
            },
            latency: {
                samples: [],
                p50: 0,
                p95: 0,
                p99: 0,
                min: Infinity,
                max: 0
            },
            throughput: {
                current: 0,
                peak: 0,
                average: 0
            },
            social: {
                telegram: { sent: 0, failed: 0 },
                discord: { sent: 0, failed: 0 },
                twitter: { sent: 0, failed: 0 },
                email: { sent: 0, failed: 0 }
            }
        };

        // Rate limiters
        this.rateLimiters = new Map();
        
        // Message deduplication
        this.messageHashes = new Set();
        this.deduplicationWindow = 5000; // 5 seconds
        
        this.init();
    }

    async init() {
        await this.loadConfiguration();
        await this.setupEdgeOptimization();
        await this.initializeConnectionPools();
        this.startBatchProcessor();
        this.startMetricsCollector();
        this.startHealthMonitor();
        console.log('Advanced Webhook Manager initialized with edge optimization');
    }

    // ===========================
    // Configuration Loading
    // ===========================

    async loadConfiguration() {
        // Load API keys and tokens
        this.endpoints.social.telegram.token = await this.getSecureConfig('TELEGRAM_BOT_TOKEN');
        this.endpoints.social.telegram.chatIds = await this.getSecureConfig('TELEGRAM_CHAT_IDS', []);
        
        const discordWebhooks = await this.getSecureConfig('DISCORD_WEBHOOKS', []);
        this.endpoints.social.discord.webhooks = Array.isArray(discordWebhooks) ? discordWebhooks : [discordWebhooks];
        
        this.endpoints.social.twitter.bearer = await this.getSecureConfig('TWITTER_BEARER_TOKEN');
        this.endpoints.social.email.apiKey = await this.getSecureConfig('SENDGRID_API_KEY');
    }

    async getSecureConfig(key, defaultValue = null) {
        // Try multiple sources for configuration
        return localStorage.getItem(key) || 
               process.env[key] || 
               await this.fetchFromKV(key) || 
               defaultValue;
    }

    async fetchFromKV(key) {
        // Cloudflare KV storage for secrets
        if (typeof window !== 'undefined' && window.CLOUDFLARE_KV) {
            try {
                return await window.CLOUDFLARE_KV.get(key);
            } catch (error) {
                console.error('KV fetch error:', error);
            }
        }
        return null;
    }

    // ===========================
    // Edge Optimization (Cloudflare)
    // ===========================

    async setupEdgeOptimization() {
        // Setup Cloudflare Workers for edge computing
        if (typeof window !== 'undefined') {
            // Register service worker
            if ('serviceWorker' in navigator) {
                try {
                    await navigator.serviceWorker.register('/sw-webhooks.js');
                    console.log('Edge service worker registered');
                } catch (error) {
                    console.warn('Service worker registration failed:', error);
                }
            }

            // Initialize edge cache
            this.edgeCache = {
                get: async (key) => {
                    if (typeof caches !== 'undefined') {
                        const cache = await caches.open('webhook-cache-v1');
                        const response = await cache.match(key);
                        return response ? await response.json() : null;
                    }
                    return null;
                },
                put: async (key, value, ttl = 30000) => {
                    if (typeof caches !== 'undefined') {
                        const cache = await caches.open('webhook-cache-v1');
                        const response = new Response(JSON.stringify(value), {
                            headers: {
                                'Cache-Control': `max-age=${ttl / 1000}`,
                                'X-Cached-At': new Date().toISOString()
                            }
                        });
                        await cache.put(key, response);
                    }
                }
            };
        }
    }

    // ===========================
    // Connection Pool Management
    // ===========================

    async initializeConnectionPools() {
        // Create persistent connections for each endpoint
        const endpoints = [
            ...Object.values(this.endpoints.backend),
            ...Object.values(this.endpoints.social).filter(e => e.url)
        ];

        for (const endpoint of endpoints) {
            if (endpoint.url) {
                this.createConnectionPool(endpoint.url);
            }
        }
    }

    createConnectionPool(url) {
        const pool = {
            connections: [],
            available: [],
            busy: new Set(),
            maxConnections: 5,
            url
        };

        // Pre-create connections
        for (let i = 0; i < pool.maxConnections; i++) {
            const conn = this.createPersistentConnection(url);
            pool.connections.push(conn);
            pool.available.push(conn);
        }

        this.connectionPool.set(url, pool);
    }

    createPersistentConnection(url) {
        // Create a reusable connection with keep-alive
        return {
            url,
            inUse: false,
            created: Date.now(),
            lastUsed: null,
            requestCount: 0
        };
    }

    getConnection(url) {
        const pool = this.connectionPool.get(url);
        if (!pool) return null;

        const conn = pool.available.pop();
        if (conn) {
            pool.busy.add(conn);
            conn.inUse = true;
            conn.lastUsed = Date.now();
            return conn;
        }

        return null;
    }

    releaseConnection(url, conn) {
        const pool = this.connectionPool.get(url);
        if (!pool) return;

        pool.busy.delete(conn);
        pool.available.push(conn);
        conn.inUse = false;
        conn.requestCount++;
    }

    // ===========================
    // Ultra-Fast Request Execution
    // ===========================

    async send(endpoint, payload, options = {}) {
        const startTime = performance.now();
        const requestId = Helpers.generateUUID();

        try {
            // Deduplication check
            if (!options.skipDedup && this.isDuplicate(payload)) {
                return { cached: true, message: 'Duplicate request filtered' };
            }

            // Check cache layers
            const cached = await this.checkCache(endpoint, payload);
            if (cached && options.cache !== false) {
                this.recordMetrics(startTime, 'cache');
                return cached;
            }

            // Circuit breaker check
            if (this.isCircuitOpen(endpoint)) {
                // Try fallback endpoint
                const fallback = this.getFallbackEndpoint(endpoint);
                if (fallback) {
                    endpoint = fallback;
                } else {
                    throw new Error('Circuit breaker open, no fallback available');
                }
            }

            // Priority routing
            if (options.priority === 'critical') {
                return await this.executeCritical(endpoint, payload, requestId);
            } else if (options.batch !== false && this.shouldBatch(endpoint)) {
                return await this.addToBatch(endpoint, payload, requestId);
            } else {
                return await this.executeRequest(endpoint, payload, requestId, options);
            }

        } catch (error) {
            this.handleError(endpoint, error, requestId);
            throw error;
        } finally {
            this.recordMetrics(startTime, 'request');
        }
    }

    async executeCritical(endpoint, payload, requestId) {
        // Critical path - bypass all queues
        const request = {
            id: requestId,
            endpoint,
            payload,
            priority: 'critical',
            attempt: 0
        };

        // Use multiple endpoints simultaneously for critical messages
        const promises = [];
        
        // Send to primary
        promises.push(this.executeRequest(endpoint, payload, requestId, { timeout: 2000 }));
        
        // Send to secondary if available
        const secondary = this.getSecondaryEndpoint(endpoint);
        if (secondary) {
            promises.push(this.executeRequest(secondary, payload, requestId + '-secondary', { timeout: 2000 }));
        }

        // Race for first successful response
        return Promise.race(promises);
    }

    async executeRequest(endpoint, payload, requestId, options = {}) {
        const timeout = options.timeout || 5000;
        let attempt = 0;
        let lastError;

        while (attempt <= this.config.retryAttempts) {
            try {
                // Get connection from pool
                const conn = this.getConnection(endpoint);
                
                // Prepare optimized request
                const requestOptions = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Request-ID': requestId,
                        'X-Priority': options.priority || 'normal',
                        ...this.getAuthHeaders(endpoint)
                    },
                    body: this.optimizePayload(payload),
                    signal: AbortSignal.timeout(timeout),
                    keepalive: true
                };

                // Add compression for large payloads
                if (requestOptions.body.length > this.config.compressionThreshold) {
                    requestOptions.headers['Content-Encoding'] = 'gzip';
                    requestOptions.body = await this.compress(requestOptions.body);
                }

                // Execute request
                const response = await fetch(endpoint, requestOptions);
                
                // Release connection
                if (conn) this.releaseConnection(endpoint, conn);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                
                // Cache successful response
                await this.cacheResponse(endpoint, payload, data);
                
                // Reset circuit breaker
                this.resetCircuitBreaker(endpoint);
                
                this.metrics.requests.successful++;
                return data;

            } catch (error) {
                lastError = error;
                attempt++;
                
                // Circuit breaker logic
                this.recordFailure(endpoint);
                
                // Exponential backoff
                if (attempt <= this.config.retryAttempts) {
                    const delay = Math.min(
                        100 * Math.pow(2, attempt),
                        this.config.retryMaxDelay
                    );
                    await Helpers.sleep(delay);
                }
            }
        }

        this.metrics.requests.failed++;
        throw lastError;
    }

    // ===========================
    // Batch Processing
    // ===========================

    startBatchProcessor() {
        setInterval(() => {
            this.processBatches();
        }, this.config.batchInterval);
    }

    async addToBatch(endpoint, payload, requestId) {
        return new Promise((resolve, reject) => {
            if (!this.batchBuffer.has(endpoint)) {
                this.batchBuffer.set(endpoint, []);
            }

            this.batchBuffer.get(endpoint).push({
                payload,
                requestId,
                resolve,
                reject,
                timestamp: Date.now()
            });

            // Process immediately if batch is full
            if (this.batchBuffer.get(endpoint).length >= this.config.batchSize) {
                this.processBatch(endpoint);
            }
        });
    }

    async processBatches() {
        for (const [endpoint, batch] of this.batchBuffer.entries()) {
            if (batch.length > 0) {
                await this.processBatch(endpoint);
            }
        }
    }

    async processBatch(endpoint) {
        const batch = this.batchBuffer.get(endpoint) || [];
        if (batch.length === 0) return;

        this.batchBuffer.set(endpoint, []);

        try {
            const batchPayload = {
                batch: batch.map(item => ({
                    id: item.requestId,
                    data: item.payload
                }))
            };

            const response = await this.executeRequest(
                endpoint + '/batch',
                batchPayload,
                'batch-' + Date.now()
            );

            // Resolve individual promises
            response.results?.forEach((result, index) => {
                if (batch[index]) {
                    if (result.success) {
                        batch[index].resolve(result.data);
                    } else {
                        batch[index].reject(new Error(result.error));
                    }
                }
            });
        } catch (error) {
            // Reject all items in batch
            batch.forEach(item => item.reject(error));
        }
    }

    // ===========================
    // Social Media Broadcasting
    // ===========================

    async broadcastToSocial(type, data, options = {}) {
        const platforms = options.platforms || ['telegram', 'discord', 'twitter', 'email'];
        const priority = options.priority || 'normal';
        
        // Parallel broadcasting with timeout
        const promises = platforms.map(platform => 
            this.sendToSocialPlatform(platform, type, data, priority)
                .catch(error => ({ platform, error: error.message }))
        );

        const results = await Promise.allSettled(promises);
        
        return results.map((result, index) => ({
            platform: platforms[index],
            success: result.status === 'fulfilled',
            result: result.value || result.reason
        }));
    }

    async sendToSocialPlatform(platform, type, data, priority = 'normal') {
        // Check rate limit
        if (!this.checkRateLimit(platform)) {
            throw new Error(`Rate limit exceeded for ${platform}`);
        }

        const formatter = this.getFormatter(platform);
        const message = formatter(type, data);

        switch (platform) {
            case 'telegram':
                return await this.sendToTelegram(message, priority);
            case 'discord':
                return await this.sendToDiscord(message, priority);
            case 'twitter':
                return await this.sendToTwitter(message, priority);
            case 'email':
                return await this.sendEmail(message, priority);
            default:
                throw new Error(`Unknown platform: ${platform}`);
        }
    }

    async sendToTelegram(message, priority) {
        const { token, chatIds } = this.endpoints.social.telegram;
        if (!token || chatIds.length === 0) return;

        const url = `${this.endpoints.social.telegram.url}${token}/sendMessage`;
        
        // Send to all chat IDs in parallel
        const promises = chatIds.map(chatId => 
            this.send(url, {
                chat_id: chatId,
                text: message.text,
                parse_mode: 'HTML',
                reply_markup: message.buttons
            }, { priority, cache: false })
        );

        const results = await Promise.allSettled(promises);
        this.metrics.social.telegram.sent += results.filter(r => r.status === 'fulfilled').length;
        this.metrics.social.telegram.failed += results.filter(r => r.status === 'rejected').length;
        
        return results;
    }

    async sendToDiscord(message, priority) {
        const webhooks = this.endpoints.social.discord.webhooks;
        if (webhooks.length === 0) return;

        // Use first available webhook (implement round-robin in production)
        const webhook = webhooks[0];
        
        const payload = {
            content: message.content,
            embeds: message.embeds || [],
            username: 'AuraQuant',
            avatar_url: 'https://auraquant.com/logo.png'
        };

        try {
            const result = await this.send(webhook, payload, { priority, cache: false });
            this.metrics.social.discord.sent++;
            return result;
        } catch (error) {
            this.metrics.social.discord.failed++;
            throw error;
        }
    }

    async sendToTwitter(message, priority) {
        const bearer = this.endpoints.social.twitter.bearer;
        if (!bearer) return;

        try {
            const result = await this.send(
                this.endpoints.social.twitter.url,
                { text: message.text },
                {
                    priority,
                    cache: false,
                    headers: { 'Authorization': `Bearer ${bearer}` }
                }
            );
            this.metrics.social.twitter.sent++;
            return result;
        } catch (error) {
            this.metrics.social.twitter.failed++;
            throw error;
        }
    }

    async sendEmail(message, priority) {
        const apiKey = this.endpoints.social.email.apiKey;
        if (!apiKey) return;

        const payload = {
            personalizations: [{
                to: message.recipients || [{ email: 'alerts@auraquant.com' }],
                subject: message.subject
            }],
            from: { email: 'noreply@auraquant.com', name: 'AuraQuant' },
            content: [{
                type: 'text/html',
                value: message.html || message.text
            }]
        };

        try {
            const result = await this.send(
                this.endpoints.social.email.url,
                payload,
                {
                    priority,
                    cache: false,
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                }
            );
            this.metrics.social.email.sent++;
            return result;
        } catch (error) {
            this.metrics.social.email.failed++;
            
            // Try fallback email provider
            if (this.endpoints.social.email.fallbackProvider === 'ses') {
                return await this.sendViaSES(message);
            }
            
            throw error;
        }
    }

    // ===========================
    // Message Formatting
    // ===========================

    getFormatter(platform) {
        const formatters = {
            telegram: (type, data) => this.formatTelegramMessage(type, data),
            discord: (type, data) => this.formatDiscordMessage(type, data),
            twitter: (type, data) => this.formatTwitterMessage(type, data),
            email: (type, data) => this.formatEmailMessage(type, data)
        };
        return formatters[platform] || ((type, data) => ({ type, data }));
    }

    formatTelegramMessage(type, data) {
        const templates = {
            trade: `🔔 <b>Trade Executed</b>
Symbol: ${data.symbol}
Side: ${data.side === 'buy' ? '🟢 BUY' : '🔴 SELL'}
Price: $${Helpers.formatPrice(data.price)}
Quantity: ${data.quantity}
Total: $${Helpers.formatCurrency(data.total)}`,
            
            alert: `⚠️ <b>Alert</b>: ${data.message}`,
            
            position: `📊 <b>Position Update</b>
${data.symbol}: ${data.pnl >= 0 ? '✅' : '❌'} ${Helpers.formatCurrency(data.pnl)}`
        };

        return {
            text: templates[type] || JSON.stringify(data),
            buttons: type === 'trade' ? {
                inline_keyboard: [[
                    { text: '📊 Chart', url: `https://auraquant.com/chart/${data.symbol}` }
                ]]
            } : undefined
        };
    }

    formatDiscordMessage(type, data) {
        const colors = {
            trade: data.side === 'buy' ? 0x00ff00 : 0xff0000,
            alert: 0xffff00,
            position: data.pnl >= 0 ? 0x00ff00 : 0xff0000
        };

        return {
            content: '',
            embeds: [{
                title: type.charAt(0).toUpperCase() + type.slice(1),
                color: colors[type] || 0x0099ff,
                fields: Object.entries(data).map(([key, value]) => ({
                    name: key,
                    value: String(value),
                    inline: true
                })),
                timestamp: new Date().toISOString()
            }]
        };
    }

    formatTwitterMessage(type, data) {
        const templates = {
            trade: `${data.side === 'buy' ? '🟢' : '🔴'} ${data.symbol} ${data.side.toUpperCase()} @ $${data.price}`,
            alert: `⚠️ ${data.symbol}: ${data.message}`,
            position: `📊 ${data.symbol} P&L: ${data.pnl >= 0 ? '+' : ''}$${data.pnl}`
        };
        
        let text = templates[type] || `${type}: ${data.symbol}`;
        
        // Add hashtags
        text += ` #Trading #${data.symbol.replace(/[^A-Z]/g, '')}`;
        
        // Ensure within Twitter limit
        if (text.length > 280) {
            text = text.substring(0, 277) + '...';
        }
        
        return { text };
    }

    formatEmailMessage(type, data) {
        return {
            subject: `AuraQuant ${type}: ${data.symbol}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <h2>AuraQuant Trading ${type}</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        ${Object.entries(data).map(([key, value]) => `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;"><strong>${key}:</strong></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${value}</td>
                            </tr>
                        `).join('')}
                    </table>
                    <p style="margin-top: 20px;">
                        <a href="https://auraquant.com" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
                    </p>
                </div>
            `
        };
    }

    // ===========================
    // Performance Optimization
    // ===========================

    optimizePayload(payload) {
        // Convert to JSON and optimize
        let json = JSON.stringify(payload);
        
        // Remove null values and empty strings
        json = json.replace(/,"[^"]+":null/g, '');
        json = json.replace(/,"[^"]+":""/g, '');
        
        return json;
    }

    async compress(data) {
        // Use CompressionStream API if available
        if (typeof CompressionStream !== 'undefined') {
            const cs = new CompressionStream('gzip');
            const writer = cs.writable.getWriter();
            writer.write(new TextEncoder().encode(data));
            writer.close();
            
            const chunks = [];
            const reader = cs.readable.getReader();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            
            return new Blob(chunks);
        }
        
        // Fallback to no compression
        return data;
    }

    // ===========================
    // Caching System
    // ===========================

    async checkCache(endpoint, payload) {
        const key = this.getCacheKey(endpoint, payload);
        
        // Check memory cache first (fastest)
        const memCached = this.memoryCache.get(key);
        if (memCached && Date.now() - memCached.timestamp < this.config.edgeCacheTTL) {
            this.metrics.requests.cached++;
            return memCached.data;
        }
        
        // Check edge cache (Cloudflare)
        if (this.edgeCache && this.config.edgeCacheEnabled) {
            const edgeCached = await this.edgeCache.get(key);
            if (edgeCached) {
                // Populate memory cache
                this.memoryCache.set(key, {
                    data: edgeCached,
                    timestamp: Date.now()
                });
                this.metrics.requests.cached++;
                return edgeCached;
            }
        }
        
        return null;
    }

    async cacheResponse(endpoint, payload, response) {
        const key = this.getCacheKey(endpoint, payload);
        
        // Memory cache
        this.memoryCache.set(key, {
            data: response,
            timestamp: Date.now()
        });
        
        // Limit memory cache size
        if (this.memoryCache.size > this.config.memoryCacheSize) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }
        
        // Edge cache
        if (this.edgeCache && this.config.edgeCacheEnabled) {
            await this.edgeCache.put(key, response, this.config.edgeCacheTTL);
        }
    }

    getCacheKey(endpoint, payload) {
        return `${endpoint}:${Helpers.hashString(JSON.stringify(payload))}`;
    }

    // ===========================
    // Circuit Breaker
    // ===========================

    isCircuitOpen(endpoint) {
        const breaker = this.circuitBreakers.get(endpoint);
        if (!breaker) return false;
        
        if (breaker.state === 'open') {
            if (Date.now() - breaker.lastFailure > this.config.circuitBreakerTimeout) {
                breaker.state = 'half-open';
                breaker.halfOpenRequests = 0;
            } else {
                return true;
            }
        }
        
        if (breaker.state === 'half-open') {
            return breaker.halfOpenRequests >= this.config.circuitBreakerHalfOpenRequests;
        }
        
        return false;
    }

    recordFailure(endpoint) {
        let breaker = this.circuitBreakers.get(endpoint);
        if (!breaker) {
            breaker = { failures: 0, state: 'closed', lastFailure: 0, halfOpenRequests: 0 };
            this.circuitBreakers.set(endpoint, breaker);
        }
        
        breaker.failures++;
        breaker.lastFailure = Date.now();
        
        if (breaker.state === 'half-open') {
            breaker.halfOpenRequests++;
            if (breaker.halfOpenRequests >= this.config.circuitBreakerHalfOpenRequests) {
                breaker.state = 'open';
            }
        } else if (breaker.failures >= this.config.circuitBreakerThreshold) {
            breaker.state = 'open';
            console.warn(`Circuit breaker opened for ${endpoint}`);
        }
    }

    resetCircuitBreaker(endpoint) {
        const breaker = this.circuitBreakers.get(endpoint);
        if (breaker) {
            breaker.failures = 0;
            breaker.state = 'closed';
            breaker.halfOpenRequests = 0;
        }
    }

    // ===========================
    // Rate Limiting
    // ===========================

    checkRateLimit(platform) {
        const limiter = this.getRateLimiter(platform);
        const now = Date.now();
        
        // Token bucket algorithm
        const timePassed = now - limiter.lastRefill;
        const tokensToAdd = (timePassed / 1000) * limiter.rate;
        
        limiter.tokens = Math.min(limiter.capacity, limiter.tokens + tokensToAdd);
        limiter.lastRefill = now;
        
        if (limiter.tokens >= 1) {
            limiter.tokens--;
            return true;
        }
        
        return false;
    }

    getRateLimiter(platform) {
        if (!this.rateLimiters.has(platform)) {
            const config = this.endpoints.social[platform];
            this.rateLimiters.set(platform, {
                tokens: config.rateLimit || 10,
                capacity: config.rateLimit || 10,
                rate: config.rateLimit || 10,
                lastRefill: Date.now()
            });
        }
        return this.rateLimiters.get(platform);
    }

    // ===========================
    // Deduplication
    // ===========================

    isDuplicate(payload) {
        const hash = Helpers.hashString(JSON.stringify(payload));
        
        if (this.messageHashes.has(hash)) {
            return true;
        }
        
        this.messageHashes.add(hash);
        
        // Clean old hashes
        setTimeout(() => {
            this.messageHashes.delete(hash);
        }, this.deduplicationWindow);
        
        return false;
    }

    // ===========================
    // Metrics & Monitoring
    // ===========================

    startMetricsCollector() {
        setInterval(() => {
            this.calculateMetrics();
        }, 1000);
    }

    calculateMetrics() {
        // Calculate latency percentiles
        if (this.metrics.latency.samples.length > 0) {
            const sorted = [...this.metrics.latency.samples].sort((a, b) => a - b);
            const len = sorted.length;
            
            this.metrics.latency.p50 = sorted[Math.floor(len * 0.5)];
            this.metrics.latency.p95 = sorted[Math.floor(len * 0.95)];
            this.metrics.latency.p99 = sorted[Math.floor(len * 0.99)];
            this.metrics.latency.min = sorted[0];
            this.metrics.latency.max = sorted[len - 1];
            
            // Keep only last 1000 samples
            if (this.metrics.latency.samples.length > 1000) {
                this.metrics.latency.samples = this.metrics.latency.samples.slice(-1000);
            }
        }
        
        // Calculate throughput
        const total = this.metrics.requests.total;
        const time = Date.now() / 1000; // seconds since epoch
        this.metrics.throughput.average = total / time;
        
        // Emit metrics event
        this.emit('metrics-update', this.getMetrics());
    }

    recordMetrics(startTime, type) {
        const latency = performance.now() - startTime;
        
        this.metrics.latency.samples.push(latency);
        this.metrics.requests.total++;
        
        if (this.metrics.throughput.current > this.metrics.throughput.peak) {
            this.metrics.throughput.peak = this.metrics.throughput.current;
        }
    }

    getMetrics() {
        return {
            requests: this.metrics.requests,
            latency: {
                p50: `${this.metrics.latency.p50.toFixed(2)}ms`,
                p95: `${this.metrics.latency.p95.toFixed(2)}ms`,
                p99: `${this.metrics.latency.p99.toFixed(2)}ms`,
                min: `${this.metrics.latency.min.toFixed(2)}ms`,
                max: `${this.metrics.latency.max.toFixed(2)}ms`
            },
            throughput: {
                current: `${this.metrics.throughput.current}/s`,
                peak: `${this.metrics.throughput.peak}/s`,
                average: `${this.metrics.throughput.average.toFixed(2)}/s`
            },
            social: this.metrics.social,
            cache: {
                hitRate: this.metrics.requests.total > 0 
                    ? `${(this.metrics.requests.cached / this.metrics.requests.total * 100).toFixed(2)}%`
                    : '0%',
                memorySize: this.memoryCache.size
            }
        };
    }

    // ===========================
    // Health Monitoring
    // ===========================

    startHealthMonitor() {
        // Monitor backend health
        setInterval(() => {
            this.checkEndpointHealth();
        }, 30000);
        
        // Monitor social platforms
        setInterval(() => {
            this.checkSocialHealth();
        }, 60000);
    }

    async checkEndpointHealth() {
        const endpoints = Object.values(this.endpoints.backend);
        
        for (const endpoint of endpoints) {
            try {
                const start = performance.now();
                const response = await fetch(endpoint.url + '/health', {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000)
                });
                
                const latency = performance.now() - start;
                
                if (response.ok) {
                    console.log(`${endpoint.region} healthy (${latency.toFixed(0)}ms)`);
                } else {
                    console.warn(`${endpoint.region} unhealthy: ${response.status}`);
                }
            } catch (error) {
                console.error(`${endpoint.region} unreachable:`, error.message);
            }
        }
    }

    async checkSocialHealth() {
        const platforms = Object.keys(this.endpoints.social);
        
        for (const platform of platforms) {
            const config = this.endpoints.social[platform];
            const isConfigured = 
                (platform === 'telegram' && config.token) ||
                (platform === 'discord' && config.webhooks.length > 0) ||
                (platform === 'twitter' && config.bearer) ||
                (platform === 'email' && config.apiKey);
                
            if (isConfigured) {
                console.log(`${platform} configured and ready`);
            } else {
                console.warn(`${platform} not configured`);
            }
        }
    }

    // ===========================
    // Utility Methods
    // ===========================

    getFallbackEndpoint(primary) {
        // Get fallback based on priority
        const backends = Object.values(this.endpoints.backend)
            .sort((a, b) => a.priority - b.priority);
            
        const currentIndex = backends.findIndex(b => b.url === primary);
        
        if (currentIndex >= 0 && currentIndex < backends.length - 1) {
            return backends[currentIndex + 1].url;
        }
        
        return null;
    }

    getSecondaryEndpoint(primary) {
        const backends = Object.values(this.endpoints.backend)
            .filter(b => b.url !== primary)
            .sort((a, b) => a.priority - b.priority);
            
        return backends[0]?.url || null;
    }

    getAuthHeaders(endpoint) {
        // Determine auth headers based on endpoint
        const token = localStorage.getItem('auth_token');
        
        return {
            'Authorization': `Bearer ${token}`,
            'X-API-Version': '2.0'
        };
    }

    shouldBatch(endpoint) {
        // Determine if endpoint supports batching
        const batchablePatterns = [
            '/metrics',
            '/logs',
            '/analytics',
            '/events'
        ];
        
        return batchablePatterns.some(pattern => endpoint.includes(pattern));
    }

    handleError(endpoint, error, requestId) {
        console.error(`Request ${requestId} to ${endpoint} failed:`, error);
        
        // Emit error event
        this.emit('webhook-error', {
            endpoint,
            error: error.message,
            requestId,
            timestamp: Date.now()
        });
    }

    emit(event, data) {
        document.dispatchEvent(new CustomEvent(`webhook-${event}`, { detail: data }));
    }

    // ===========================
    // Public API
    // ===========================

    async testConnection(target = 'all') {
        const results = {};
        
        if (target === 'all' || target === 'backend') {
            for (const [name, config] of Object.entries(this.endpoints.backend)) {
                try {
                    const start = performance.now();
                    await fetch(config.url + '/health', { signal: AbortSignal.timeout(3000) });
                    results[name] = {
                        success: true,
                        latency: performance.now() - start
                    };
                } catch (error) {
                    results[name] = {
                        success: false,
                        error: error.message
                    };
                }
            }
        }
        
        if (target === 'all' || target === 'social') {
            for (const platform of Object.keys(this.endpoints.social)) {
                results[platform] = await this.testSocialPlatform(platform);
            }
        }
        
        return results;
    }

    async testSocialPlatform(platform) {
        try {
            const testMessage = {
                type: 'test',
                message: `Test from AuraQuant at ${new Date().toISOString()}`,
                symbol: 'TEST'
            };
            
            await this.sendToSocialPlatform(platform, 'test', testMessage);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getStatus() {
        return {
            endpoints: {
                backend: Object.entries(this.endpoints.backend).map(([name, config]) => ({
                    name,
                    url: config.url,
                    region: config.region,
                    circuitBreaker: this.circuitBreakers.get(config.url)?.state || 'closed'
                })),
                social: Object.entries(this.endpoints.social).map(([name, config]) => ({
                    name,
                    configured: !!(config.token || config.webhooks?.length || config.bearer || config.apiKey),
                    rateLimit: this.getRateLimiter(name).tokens
                }))
            },
            metrics: this.getMetrics(),
            queues: {
                batch: Array.from(this.batchBuffer.entries()).map(([endpoint, items]) => ({
                    endpoint,
                    size: items.length
                })),
                active: this.activeRequests.size
            }
        };
    }
}

// Create singleton instance
const webhookManager = new AdvancedWebhookManager();

// Attach to window for global access
window.webhookManagerAdvanced = webhookManager;

// Export for module usage
export default webhookManager;