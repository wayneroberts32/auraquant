/**
 * AuraQuant Social Media Integration Module
 * Manages social media connections, posting, and monitoring
 * Supports Discord, Telegram, Twitter/X, and Email
 */

class SocialModule {
    constructor() {
        this.platforms = {
            discord: {
                name: 'Discord',
                icon: '💬',
                enabled: false,
                connected: false,
                config: {
                    webhookUrl: '',
                    botToken: '',
                    serverId: '',
                    channelId: '',
                    username: 'AuraQuant Bot',
                    avatarUrl: ''
                }
            },
            telegram: {
                name: 'Telegram',
                icon: '✈️',
                enabled: false,
                connected: false,
                config: {
                    botToken: '',
                    chatId: '',
                    channelUsername: '',
                    parseMode: 'HTML'
                }
            },
            twitter: {
                name: 'Twitter/X',
                icon: '🐦',
                enabled: false,
                connected: false,
                config: {
                    apiKey: '',
                    apiSecret: '',
                    accessToken: '',
                    accessSecret: '',
                    bearerToken: ''
                }
            },
            email: {
                name: 'Email',
                icon: '📧',
                enabled: false,
                connected: false,
                config: {
                    smtp: {
                        host: '',
                        port: 587,
                        secure: false,
                        auth: {
                            user: '',
                            pass: ''
                        }
                    },
                    from: '',
                    to: [],
                    cc: [],
                    bcc: []
                }
            }
        };
        
        this.messageTemplates = {
            trade: {
                name: 'Trade Execution',
                template: '🚀 Trade Alert\n\nAction: {action}\nSymbol: {symbol}\nQuantity: {quantity}\nPrice: ${price}\nTime: {time}\n\n{notes}'
            },
            signal: {
                name: 'Trading Signal',
                template: '📊 Signal Alert\n\nSignal: {signal}\nSymbol: {symbol}\nEntry: ${entry}\nStop Loss: ${stopLoss}\nTake Profit: ${takeProfit}\nConfidence: {confidence}%'
            },
            performance: {
                name: 'Daily Performance',
                template: '📈 Daily Performance\n\nP&L: ${pnl}\nReturn: {return}%\nWin Rate: {winRate}%\nTrades: {trades}\nTop Performer: {topSymbol} ({topReturn}%)'
            },
            alert: {
                name: 'Price Alert',
                template: '⚠️ Price Alert\n\n{symbol} has reached ${price}\nCondition: {condition}\nChange: {change}%\nVolume: {volume}'
            },
            news: {
                name: 'News Update',
                template: '📰 Breaking News\n\n{headline}\n\nSource: {source}\nSentiment: {sentiment}\n\n{link}'
            },
            system: {
                name: 'System Status',
                template: '🔧 System Update\n\nStatus: {status}\nMessage: {message}\nTime: {time}'
            }
        };
        
        this.postQueue = [];
        this.postHistory = [];
        this.rateLimits = {
            discord: { posts: 5, window: 60000 }, // 5 per minute
            telegram: { posts: 30, window: 60000 }, // 30 per minute
            twitter: { posts: 50, window: 900000 }, // 50 per 15 minutes
            email: { posts: 10, window: 60000 } // 10 per minute
        };
        
        this.autoPost = {
            enabled: false,
            schedule: {
                performance: { enabled: true, time: '16:00', days: [1,2,3,4,5] },
                signals: { enabled: true, realtime: true },
                trades: { enabled: true, realtime: true },
                news: { enabled: false, importance: 'high' }
            }
        };
        
        this.monitoring = {
            enabled: false,
            keywords: [],
            mentions: [],
            channels: []
        };
        
        this.init();
    }
    
    async init() {
        console.log('🌐 Initializing Social Module...');
        
        // Load saved configurations
        this.loadConfigurations();
        
        // Initialize UI
        this.initializeUI();
        
        // Test connections
        await this.testConnections();
        
        // Start queue processor
        this.startQueueProcessor();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start monitoring if enabled
        if (this.monitoring.enabled) {
            this.startMonitoring();
        }
        
        console.log('✅ Social Module initialized');
    }
    
    async testConnections() {
        for (const [platform, config] of Object.entries(this.platforms)) {
            if (config.enabled) {
                const connected = await this.testConnection(platform);
                config.connected = connected;
                this.updateConnectionStatus(platform, connected);
            }
        }
    }
    
    async testConnection(platform) {
        try {
            switch (platform) {
                case 'discord':
                    return await this.testDiscordConnection();
                case 'telegram':
                    return await this.testTelegramConnection();
                case 'twitter':
                    return await this.testTwitterConnection();
                case 'email':
                    return await this.testEmailConnection();
                default:
                    return false;
            }
        } catch (error) {
            console.error(`Error testing ${platform} connection:`, error);
            return false;
        }
    }
    
    async testDiscordConnection() {
        const config = this.platforms.discord.config;
        if (!config.webhookUrl && !config.botToken) return false;
        
        try {
            if (config.webhookUrl) {
                // Test webhook
                const response = await fetch(config.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: 'Connection test from AuraQuant',
                        username: config.username
                    })
                });
                return response.ok;
            }
            // Bot token test would require backend
            return true;
        } catch (error) {
            console.error('Discord connection test failed:', error);
            return false;
        }
    }
    
    async testTelegramConnection() {
        const config = this.platforms.telegram.config;
        if (!config.botToken) return false;
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getMe`);
            const data = await response.json();
            return data.ok;
        } catch (error) {
            console.error('Telegram connection test failed:', error);
            return false;
        }
    }
    
    async testTwitterConnection() {
        // Twitter API test requires backend due to CORS
        const config = this.platforms.twitter.config;
        return !!(config.bearerToken || (config.apiKey && config.apiSecret));
    }
    
    async testEmailConnection() {
        // Email test requires backend
        const config = this.platforms.email.config;
        return !!(config.smtp.host && config.smtp.auth.user);
    }
    
    async post(message, platforms = [], options = {}) {
        const targetPlatforms = platforms.length > 0 ? platforms : 
            Object.keys(this.platforms).filter(p => this.platforms[p].enabled);
        
        const posts = [];
        
        for (const platform of targetPlatforms) {
            if (!this.platforms[platform].connected) {
                console.warn(`${platform} is not connected`);
                continue;
            }
            
            // Check rate limit
            if (!this.checkRateLimit(platform)) {
                console.warn(`Rate limit exceeded for ${platform}`);
                this.queuePost(platform, message, options);
                continue;
            }
            
            // Format message for platform
            const formattedMessage = this.formatMessage(message, platform, options);
            
            // Send message
            const result = await this.sendMessage(platform, formattedMessage, options);
            posts.push(result);
            
            // Record in history
            this.recordPost(platform, message, result);
        }
        
        return posts;
    }
    
    formatMessage(message, platform, options = {}) {
        let formatted = message;
        
        // Apply template if specified
        if (options.template && this.messageTemplates[options.template]) {
            formatted = this.applyTemplate(options.template, options.data || {});
        }
        
        // Platform-specific formatting
        switch (platform) {
            case 'discord':
                formatted = this.formatDiscordMessage(formatted, options);
                break;
            case 'telegram':
                formatted = this.formatTelegramMessage(formatted, options);
                break;
            case 'twitter':
                formatted = this.formatTwitterMessage(formatted, options);
                break;
            case 'email':
                formatted = this.formatEmailMessage(formatted, options);
                break;
        }
        
        return formatted;
    }
    
    formatDiscordMessage(message, options = {}) {
        const embed = {
            content: options.content || '',
            embeds: [{
                title: options.title || 'AuraQuant Alert',
                description: message,
                color: options.color || 0x00ff00,
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'AuraQuant Trading Platform'
                }
            }]
        };
        
        // Add fields if provided
        if (options.fields) {
            embed.embeds[0].fields = options.fields;
        }
        
        // Add image if provided
        if (options.image) {
            embed.embeds[0].image = { url: options.image };
        }
        
        return embed;
    }
    
    formatTelegramMessage(message, options = {}) {
        // Convert to HTML format for Telegram
        let formatted = message
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
            .replace(/\*(.*?)\*/g, '<i>$1</i>') // Italic
            .replace(/`(.*?)`/g, '<code>$1</code>'); // Code
        
        // Add buttons if provided
        const replyMarkup = {};
        if (options.buttons) {
            replyMarkup.inline_keyboard = options.buttons.map(btn => [{
                text: btn.text,
                url: btn.url || undefined,
                callback_data: btn.data || undefined
            }]);
        }
        
        return {
            text: formatted,
            parse_mode: 'HTML',
            reply_markup: Object.keys(replyMarkup).length > 0 ? replyMarkup : undefined
        };
    }
    
    formatTwitterMessage(message, options = {}) {
        // Truncate for Twitter character limit
        let formatted = message;
        const maxLength = 280;
        
        if (formatted.length > maxLength) {
            formatted = formatted.substring(0, maxLength - 3) + '...';
        }
        
        // Add hashtags if provided
        if (options.hashtags) {
            const tags = options.hashtags.map(tag => `#${tag}`).join(' ');
            const availableSpace = maxLength - formatted.length - 1;
            if (tags.length <= availableSpace) {
                formatted += ' ' + tags;
            }
        }
        
        return formatted;
    }
    
    formatEmailMessage(message, options = {}) {
        return {
            subject: options.subject || 'AuraQuant Trading Alert',
            text: message,
            html: `
                <html>
                <body style="font-family: Arial, sans-serif;">
                    <h2>${options.title || 'AuraQuant Alert'}</h2>
                    <div style="white-space: pre-wrap;">${message}</div>
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        Sent from AuraQuant Trading Platform<br>
                        ${new Date().toLocaleString()}
                    </p>
                </body>
                </html>
            `
        };
    }
    
    async sendMessage(platform, message, options = {}) {
        try {
            switch (platform) {
                case 'discord':
                    return await this.sendDiscordMessage(message, options);
                case 'telegram':
                    return await this.sendTelegramMessage(message, options);
                case 'twitter':
                    return await this.sendTwitterMessage(message, options);
                case 'email':
                    return await this.sendEmailMessage(message, options);
                default:
                    throw new Error(`Unknown platform: ${platform}`);
            }
        } catch (error) {
            console.error(`Error sending to ${platform}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    async sendDiscordMessage(message, options = {}) {
        const config = this.platforms.discord.config;
        
        if (config.webhookUrl) {
            const response = await fetch(config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...message,
                    username: config.username,
                    avatar_url: config.avatarUrl
                })
            });
            
            return {
                success: response.ok,
                platform: 'discord',
                timestamp: Date.now()
            };
        }
        
        // Bot implementation would go here
        return { success: false, error: 'Bot not implemented' };
    }
    
    async sendTelegramMessage(message, options = {}) {
        const config = this.platforms.telegram.config;
        const chatId = options.chatId || config.chatId || config.channelUsername;
        
        if (!chatId) {
            throw new Error('No chat ID specified');
        }
        
        const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                ...message
            })
        });
        
        const data = await response.json();
        
        return {
            success: data.ok,
            platform: 'telegram',
            messageId: data.result?.message_id,
            timestamp: Date.now()
        };
    }
    
    async sendTwitterMessage(message, options = {}) {
        // Twitter API requires backend due to CORS and OAuth
        // This would normally call your backend API
        
        return {
            success: false,
            platform: 'twitter',
            error: 'Twitter posting requires backend implementation'
        };
    }
    
    async sendEmailMessage(message, options = {}) {
        // Email sending requires backend
        // This would normally call your backend API
        
        return {
            success: false,
            platform: 'email',
            error: 'Email sending requires backend implementation'
        };
    }
    
    applyTemplate(templateName, data) {
        const template = this.messageTemplates[templateName];
        if (!template) return '';
        
        let message = template.template;
        
        // Replace placeholders with data
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{${key}}`;
            message = message.replace(new RegExp(placeholder, 'g'), value);
        }
        
        // Remove any remaining placeholders
        message = message.replace(/\{[^}]+\}/g, '');
        
        return message;
    }
    
    checkRateLimit(platform) {
        const limit = this.rateLimits[platform];
        if (!limit) return true;
        
        const now = Date.now();
        const recentPosts = this.postHistory.filter(post => 
            post.platform === platform && 
            (now - post.timestamp) < limit.window
        );
        
        return recentPosts.length < limit.posts;
    }
    
    queuePost(platform, message, options) {
        this.postQueue.push({
            platform,
            message,
            options,
            timestamp: Date.now()
        });
    }
    
    startQueueProcessor() {
        setInterval(() => {
            this.processQueue();
        }, 5000); // Process every 5 seconds
    }
    
    async processQueue() {
        if (this.postQueue.length === 0) return;
        
        const now = Date.now();
        const toProcess = [];
        
        // Check which posts can be sent
        for (let i = this.postQueue.length - 1; i >= 0; i--) {
            const post = this.postQueue[i];
            
            if (this.checkRateLimit(post.platform)) {
                toProcess.push(post);
                this.postQueue.splice(i, 1);
            }
        }
        
        // Send queued posts
        for (const post of toProcess) {
            await this.post(post.message, [post.platform], post.options);
        }
    }
    
    recordPost(platform, message, result) {
        this.postHistory.push({
            platform,
            message,
            result,
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.postHistory.length > 1000) {
            this.postHistory = this.postHistory.slice(-500);
        }
        
        // Save to localStorage
        this.saveHistory();
    }
    
    setupEventListeners() {
        // Listen for trading events
        document.addEventListener('tradeExecuted', (e) => {
            if (this.autoPost.enabled && this.autoPost.schedule.trades.enabled) {
                this.post('', [], {
                    template: 'trade',
                    data: e.detail
                });
            }
        });
        
        document.addEventListener('signalGenerated', (e) => {
            if (this.autoPost.enabled && this.autoPost.schedule.signals.enabled) {
                this.post('', [], {
                    template: 'signal',
                    data: e.detail
                });
            }
        });
        
        document.addEventListener('priceAlert', (e) => {
            this.post('', [], {
                template: 'alert',
                data: e.detail
            });
        });
        
        document.addEventListener('breakingNews', (e) => {
            if (this.autoPost.enabled && this.autoPost.schedule.news.enabled) {
                this.post('', [], {
                    template: 'news',
                    data: e.detail
                });
            }
        });
    }
    
    startMonitoring() {
        // Monitor social platforms for mentions and keywords
        setInterval(() => {
            this.checkMentions();
        }, 60000); // Check every minute
    }
    
    async checkMentions() {
        // This would normally check each platform's API for mentions
        // For now, just a placeholder
        console.log('Checking social media mentions...');
    }
    
    // UI Methods
    initializeUI() {
        this.initializePlatformSettings();
        this.initializeTemplates();
        this.initializeAutoPost();
        this.initializeHistory();
    }
    
    initializePlatformSettings() {
        const container = document.getElementById('social-platforms');
        if (!container) return;
        
        for (const [platform, config] of Object.entries(this.platforms)) {
            const platformDiv = document.createElement('div');
            platformDiv.className = 'social-platform';
            platformDiv.innerHTML = `
                <div class="platform-header">
                    <span class="platform-icon">${config.icon}</span>
                    <span class="platform-name">${config.name}</span>
                    <label class="switch">
                        <input type="checkbox" ${config.enabled ? 'checked' : ''} 
                            onchange="socialModule.togglePlatform('${platform}', this.checked)">
                        <span class="slider"></span>
                    </label>
                    <span class="connection-status ${config.connected ? 'connected' : 'disconnected'}">
                        ${config.connected ? '✅' : '❌'}
                    </span>
                </div>
                <div class="platform-settings" id="${platform}-settings">
                    ${this.renderPlatformSettings(platform)}
                </div>
                <button onclick="socialModule.testConnection('${platform}')">Test Connection</button>
            `;
            
            container.appendChild(platformDiv);
        }
    }
    
    renderPlatformSettings(platform) {
        switch (platform) {
            case 'discord':
                return `
                    <input type="text" placeholder="Webhook URL" 
                        value="${this.platforms.discord.config.webhookUrl}"
                        onchange="socialModule.updateConfig('discord', 'webhookUrl', this.value)">
                    <input type="text" placeholder="Username" 
                        value="${this.platforms.discord.config.username}"
                        onchange="socialModule.updateConfig('discord', 'username', this.value)">
                `;
                
            case 'telegram':
                return `
                    <input type="password" placeholder="Bot Token" 
                        value="${this.platforms.telegram.config.botToken}"
                        onchange="socialModule.updateConfig('telegram', 'botToken', this.value)">
                    <input type="text" placeholder="Chat ID or @channel" 
                        value="${this.platforms.telegram.config.chatId}"
                        onchange="socialModule.updateConfig('telegram', 'chatId', this.value)">
                `;
                
            case 'twitter':
                return `
                    <input type="password" placeholder="Bearer Token" 
                        value="${this.platforms.twitter.config.bearerToken}"
                        onchange="socialModule.updateConfig('twitter', 'bearerToken', this.value)">
                `;
                
            case 'email':
                return `
                    <input type="text" placeholder="SMTP Host" 
                        value="${this.platforms.email.config.smtp.host}"
                        onchange="socialModule.updateEmailConfig('host', this.value)">
                    <input type="email" placeholder="From Address" 
                        value="${this.platforms.email.config.from}"
                        onchange="socialModule.updateConfig('email', 'from', this.value)">
                    <input type="text" placeholder="To Addresses (comma-separated)" 
                        value="${this.platforms.email.config.to.join(',')}"
                        onchange="socialModule.updateEmailTo(this.value)">
                `;
                
            default:
                return '';
        }
    }
    
    initializeTemplates() {
        const container = document.getElementById('message-templates');
        if (!container) return;
        
        for (const [key, template] of Object.entries(this.messageTemplates)) {
            const templateDiv = document.createElement('div');
            templateDiv.className = 'message-template';
            templateDiv.innerHTML = `
                <h4>${template.name}</h4>
                <textarea readonly>${template.template}</textarea>
                <button onclick="socialModule.useTemplate('${key}')">Use Template</button>
            `;
            
            container.appendChild(templateDiv);
        }
    }
    
    initializeAutoPost() {
        const container = document.getElementById('auto-post-settings');
        if (!container) return;
        
        container.innerHTML = `
            <label>
                <input type="checkbox" ${this.autoPost.enabled ? 'checked' : ''}
                    onchange="socialModule.toggleAutoPost(this.checked)">
                Enable Auto-Post
            </label>
            <div class="auto-post-schedules">
                ${Object.entries(this.autoPost.schedule).map(([key, config]) => `
                    <label>
                        <input type="checkbox" ${config.enabled ? 'checked' : ''}
                            onchange="socialModule.toggleAutoPostType('${key}', this.checked)">
                        ${key.charAt(0).toUpperCase() + key.slice(1)}
                    </label>
                `).join('')}
            </div>
        `;
    }
    
    initializeHistory() {
        const container = document.getElementById('post-history');
        if (!container) return;
        
        this.renderHistory();
    }
    
    renderHistory() {
        const container = document.getElementById('post-history');
        if (!container) return;
        
        const recent = this.postHistory.slice(-20).reverse();
        
        container.innerHTML = recent.map(post => `
            <div class="post-history-item ${post.result.success ? 'success' : 'failed'}">
                <span class="post-platform">${this.platforms[post.platform]?.icon}</span>
                <span class="post-message">${post.message.substring(0, 50)}...</span>
                <span class="post-time">${new Date(post.timestamp).toLocaleTimeString()}</span>
                <span class="post-status">${post.result.success ? '✅' : '❌'}</span>
            </div>
        `).join('');
    }
    
    // Public methods
    togglePlatform(platform, enabled) {
        this.platforms[platform].enabled = enabled;
        this.saveConfigurations();
        
        if (enabled) {
            this.testConnection(platform);
        }
    }
    
    updateConfig(platform, key, value) {
        if (key.includes('.')) {
            // Nested property
            const keys = key.split('.');
            let obj = this.platforms[platform].config;
            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
        } else {
            this.platforms[platform].config[key] = value;
        }
        
        this.saveConfigurations();
        this.testConnection(platform);
    }
    
    updateEmailConfig(key, value) {
        this.platforms.email.config.smtp[key] = value;
        this.saveConfigurations();
    }
    
    updateEmailTo(value) {
        this.platforms.email.config.to = value.split(',').map(e => e.trim());
        this.saveConfigurations();
    }
    
    toggleAutoPost(enabled) {
        this.autoPost.enabled = enabled;
        this.saveConfigurations();
    }
    
    toggleAutoPostType(type, enabled) {
        this.autoPost.schedule[type].enabled = enabled;
        this.saveConfigurations();
    }
    
    useTemplate(templateKey) {
        const template = this.messageTemplates[templateKey];
        if (!template) return;
        
        // Populate message composer
        const composer = document.getElementById('message-composer');
        if (composer) {
            composer.value = template.template;
        }
    }
    
    async sendCustomMessage() {
        const composer = document.getElementById('message-composer');
        const platformChecks = document.querySelectorAll('.platform-selector input:checked');
        
        if (!composer || platformChecks.length === 0) return;
        
        const message = composer.value;
        const platforms = Array.from(platformChecks).map(check => check.value);
        
        const results = await this.post(message, platforms);
        
        // Clear composer
        composer.value = '';
        
        // Update history
        this.renderHistory();
        
        // Show results
        results.forEach(result => {
            const notification = document.createElement('div');
            notification.className = `notification ${result.success ? 'success' : 'error'}`;
            notification.textContent = `${result.platform}: ${result.success ? 'Sent' : 'Failed'}`;
            document.body.appendChild(notification);
            
            setTimeout(() => notification.remove(), 3000);
        });
    }
    
    updateConnectionStatus(platform, connected) {
        const statusElement = document.querySelector(`#${platform}-settings + .connection-status`);
        if (statusElement) {
            statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
            statusElement.textContent = connected ? '✅' : '❌';
        }
    }
    
    getStatistics() {
        const stats = {
            totalPosts: this.postHistory.length,
            successRate: 0,
            platformBreakdown: {},
            recentActivity: []
        };
        
        // Calculate success rate
        const successful = this.postHistory.filter(p => p.result.success).length;
        stats.successRate = this.postHistory.length > 0 ? 
            (successful / this.postHistory.length * 100).toFixed(1) : 0;
        
        // Platform breakdown
        for (const platform of Object.keys(this.platforms)) {
            const platformPosts = this.postHistory.filter(p => p.platform === platform);
            stats.platformBreakdown[platform] = {
                total: platformPosts.length,
                successful: platformPosts.filter(p => p.result.success).length
            };
        }
        
        // Recent activity (last 24 hours)
        const dayAgo = Date.now() - 86400000;
        stats.recentActivity = this.postHistory.filter(p => p.timestamp > dayAgo);
        
        return stats;
    }
    
    exportHistory(format = 'json') {
        const data = this.postHistory;
        
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `social-history-${Date.now()}.json`;
            a.click();
        } else if (format === 'csv') {
            const csv = [
                ['Timestamp', 'Platform', 'Message', 'Success'].join(','),
                ...data.map(post => [
                    new Date(post.timestamp).toISOString(),
                    post.platform,
                    `"${post.message.replace(/"/g, '""')}"`,
                    post.result.success
                ].join(','))
            ].join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `social-history-${Date.now()}.csv`;
            a.click();
        }
    }
    
    // Storage methods
    loadConfigurations() {
        const saved = localStorage.getItem('socialConfigurations');
        if (saved) {
            try {
                const configs = JSON.parse(saved);
                
                // Merge saved configs with defaults
                for (const [platform, config] of Object.entries(configs.platforms || {})) {
                    if (this.platforms[platform]) {
                        Object.assign(this.platforms[platform], config);
                    }
                }
                
                if (configs.autoPost) {
                    Object.assign(this.autoPost, configs.autoPost);
                }
                
                if (configs.monitoring) {
                    Object.assign(this.monitoring, configs.monitoring);
                }
                
            } catch (error) {
                console.error('Error loading social configurations:', error);
            }
        }
        
        // Load history
        const history = localStorage.getItem('socialHistory');
        if (history) {
            try {
                this.postHistory = JSON.parse(history);
            } catch (error) {
                console.error('Error loading social history:', error);
            }
        }
    }
    
    saveConfigurations() {
        const configs = {
            platforms: this.platforms,
            autoPost: this.autoPost,
            monitoring: this.monitoring
        };
        
        localStorage.setItem('socialConfigurations', JSON.stringify(configs));
    }
    
    saveHistory() {
        // Keep only last 500 items in storage
        const toSave = this.postHistory.slice(-500);
        localStorage.setItem('socialHistory', JSON.stringify(toSave));
    }
    
    // Cleanup
    clearHistory() {
        this.postHistory = [];
        this.saveHistory();
        this.renderHistory();
    }
    
    reset() {
        // Reset configurations to defaults
        for (const platform of Object.values(this.platforms)) {
            platform.enabled = false;
            platform.connected = false;
        }
        
        this.autoPost.enabled = false;
        this.monitoring.enabled = false;
        this.postQueue = [];
        
        this.saveConfigurations();
        this.initializeUI();
    }
}

// Initialize on page load
let socialModule;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        socialModule = new SocialModule();
        window.socialModule = socialModule;
    });
} else {
    socialModule = new SocialModule();
    window.socialModule = socialModule;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialModule;
}