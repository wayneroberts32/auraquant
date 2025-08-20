/**
 * AuraQuant AI Module
 * Comprehensive AI integration with multiple providers
 * Supports ChatGPT, OpenAI, Claude, DeepSeek, Warp, Copilot
 */

class AIModule {
    constructor() {
        this.providers = {
            openai: {
                name: 'OpenAI GPT-4',
                endpoint: 'https://api.openai.com/v1',
                models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
                capabilities: ['chat', 'analysis', 'code', 'vision'],
                rateLimit: { requests: 500, window: 60000 },
                lastRequest: 0
            },
            chatgpt: {
                name: 'ChatGPT Plus',
                endpoint: 'https://api.openai.com/v1/chat/completions',
                models: ['gpt-4-turbo', 'gpt-4'],
                capabilities: ['chat', 'analysis', 'plugins'],
                rateLimit: { requests: 50, window: 3600000 },
                lastRequest: 0
            },
            claude: {
                name: 'Claude 3 Opus',
                endpoint: 'https://api.anthropic.com/v1',
                models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
                capabilities: ['chat', 'analysis', 'code', 'vision', 'long-context'],
                rateLimit: { requests: 1000, window: 60000 },
                lastRequest: 0
            },
            deepseek: {
                name: 'DeepSeek Coder',
                endpoint: 'https://api.deepseek.com/v1',
                models: ['deepseek-coder-33b', 'deepseek-chat'],
                capabilities: ['code', 'analysis', 'trading-specific'],
                rateLimit: { requests: 100, window: 60000 },
                lastRequest: 0
            },
            warp: {
                name: 'Warp AI',
                endpoint: 'wss://api.warp.dev/ai',
                models: ['warp-command', 'warp-explain'],
                capabilities: ['terminal', 'devops', 'automation'],
                rateLimit: { requests: 200, window: 60000 },
                lastRequest: 0
            },
            copilot: {
                name: 'GitHub Copilot',
                endpoint: 'https://api.github.com/copilot',
                models: ['copilot-chat', 'copilot-code'],
                capabilities: ['code', 'documentation', 'testing'],
                rateLimit: { requests: 100, window: 60000 },
                lastRequest: 0
            }
        };

        this.apiKeys = {};
        this.activeProvider = 'openai';
        this.conversationHistory = new Map();
        this.tradingContext = {};
        this.templates = this.initializeTemplates();
        this.customPrompts = new Map();
        this.responseCache = new Map();
        this.wsConnections = new Map();
        
        this.init();
    }

    async init() {
        await this.loadAPIKeys();
        await this.loadCustomPrompts();
        this.setupWebSocketConnections();
        this.initializeEventListeners();
        console.log('AI Module initialized with providers:', Object.keys(this.providers));
    }

    async loadAPIKeys() {
        // Load API keys from config or secure storage
        try {
            const config = await window.configManager?.getAIConfig();
            if (config) {
                this.apiKeys = {
                    openai: config.openai_api_key || '',
                    chatgpt: config.chatgpt_api_key || config.openai_api_key || '',
                    claude: config.claude_api_key || '',
                    deepseek: config.deepseek_api_key || '',
                    warp: config.warp_api_key || '',
                    copilot: config.github_token || ''
                };
            }
        } catch (error) {
            console.error('Error loading AI API keys:', error);
        }
    }

    initializeTemplates() {
        return {
            marketAnalysis: {
                name: 'Market Analysis',
                prompt: `Analyze the following market data and provide insights:
                Symbol: {symbol}
                Timeframe: {timeframe}
                Current Price: {price}
                Volume: {volume}
                Technical Indicators: {indicators}
                Recent News: {news}
                
                Provide:
                1. Technical analysis
                2. Sentiment analysis
                3. Key support/resistance levels
                4. Trading recommendation
                5. Risk assessment`,
                provider: 'openai'
            },
            strategyOptimization: {
                name: 'Strategy Optimization',
                prompt: `Optimize this trading strategy:
                Strategy: {strategy}
                Backtest Results: {results}
                Market Conditions: {conditions}
                
                Suggest:
                1. Parameter adjustments
                2. Entry/exit improvements
                3. Risk management enhancements
                4. Market condition filters
                5. Expected performance improvements`,
                provider: 'deepseek'
            },
            codeGeneration: {
                name: 'Pine Script Generation',
                prompt: `Generate Pine Script v5 code for:
                Strategy Name: {name}
                Description: {description}
                Entry Conditions: {entry}
                Exit Conditions: {exit}
                Risk Management: {risk}
                
                Requirements:
                - Include proper variable declarations
                - Add comments
                - Include backtesting parameters
                - Optimize for performance`,
                provider: 'copilot'
            },
            newsAnalysis: {
                name: 'News Sentiment Analysis',
                prompt: `Analyze news sentiment for trading:
                Headlines: {headlines}
                Symbol: {symbol}
                
                Provide:
                1. Overall sentiment score (-100 to 100)
                2. Key themes and topics
                3. Potential market impact
                4. Trading implications
                5. Risk factors`,
                provider: 'claude'
            },
            riskAssessment: {
                name: 'Portfolio Risk Assessment',
                prompt: `Assess portfolio risk:
                Positions: {positions}
                Market Conditions: {market}
                Account Balance: {balance}
                
                Analyze:
                1. Current risk exposure
                2. Correlation risks
                3. Suggested hedges
                4. Position sizing recommendations
                5. Risk/reward optimization`,
                provider: 'openai'
            },
            terminalCommand: {
                name: 'Terminal Command Generation',
                prompt: `Generate terminal command for:
                Task: {task}
                Platform: {platform}
                Context: {context}
                
                Provide:
                1. Complete command
                2. Explanation
                3. Prerequisites
                4. Alternative approaches`,
                provider: 'warp'
            }
        };
    }

    // Main query method with provider selection
    async query(prompt, options = {}) {
        const {
            provider = this.activeProvider,
            model = null,
            temperature = 0.7,
            maxTokens = 2000,
            stream = false,
            useCache = true,
            conversationId = null,
            template = null
        } = options;

        // Check cache
        const cacheKey = `${provider}-${prompt}-${JSON.stringify(options)}`;
        if (useCache && this.responseCache.has(cacheKey)) {
            const cached = this.responseCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 min cache
                return cached.response;
            }
        }

        // Apply template if specified
        let finalPrompt = prompt;
        if (template && this.templates[template]) {
            finalPrompt = this.applyTemplate(template, options.variables || {});
        }

        // Add trading context
        finalPrompt = this.enrichWithContext(finalPrompt);

        // Rate limiting
        if (!this.checkRateLimit(provider)) {
            throw new Error(`Rate limit exceeded for ${provider}`);
        }

        try {
            let response;
            
            switch (provider) {
                case 'openai':
                case 'chatgpt':
                    response = await this.queryOpenAI(finalPrompt, options);
                    break;
                case 'claude':
                    response = await this.queryClaude(finalPrompt, options);
                    break;
                case 'deepseek':
                    response = await this.queryDeepSeek(finalPrompt, options);
                    break;
                case 'warp':
                    response = await this.queryWarp(finalPrompt, options);
                    break;
                case 'copilot':
                    response = await this.queryCopilot(finalPrompt, options);
                    break;
                default:
                    throw new Error(`Unknown provider: ${provider}`);
            }

            // Update conversation history
            if (conversationId) {
                this.updateConversation(conversationId, prompt, response);
            }

            // Cache response
            if (useCache) {
                this.responseCache.set(cacheKey, {
                    response,
                    timestamp: Date.now()
                });
            }

            // Emit event
            this.emit('ai-response', {
                provider,
                prompt: finalPrompt,
                response,
                timestamp: Date.now()
            });

            return response;

        } catch (error) {
            console.error(`AI query error (${provider}):`, error);
            
            // Try fallback provider
            if (options.fallback !== false) {
                const fallbackProvider = this.getFallbackProvider(provider);
                if (fallbackProvider) {
                    console.log(`Falling back to ${fallbackProvider}`);
                    return this.query(prompt, { ...options, provider: fallbackProvider, fallback: false });
                }
            }
            
            throw error;
        }
    }

    // OpenAI/ChatGPT implementation
    async queryOpenAI(prompt, options = {}) {
        const {
            model = 'gpt-4-turbo-preview',
            temperature = 0.7,
            maxTokens = 2000,
            stream = false
        } = options;

        const apiKey = this.apiKeys.openai;
        if (!apiKey) throw new Error('OpenAI API key not configured');

        const requestBody = {
            model,
            messages: [
                {
                    role: 'system',
                    content: 'You are an advanced AI trading assistant with expertise in financial markets, technical analysis, and algorithmic trading.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature,
            max_tokens: maxTokens,
            stream
        };

        if (stream) {
            return this.streamOpenAI(requestBody, apiKey);
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            content: data.choices[0].message.content,
            model: data.model,
            usage: data.usage,
            provider: 'openai'
        };
    }

    // Claude implementation
    async queryClaude(prompt, options = {}) {
        const {
            model = 'claude-3-opus-20240229',
            temperature = 0.7,
            maxTokens = 4000
        } = options;

        const apiKey = this.apiKeys.claude;
        if (!apiKey) throw new Error('Claude API key not configured');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens: maxTokens,
                temperature,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                system: 'You are Claude, an advanced AI assistant specializing in financial markets and algorithmic trading. Provide detailed, accurate analysis while being helpful and safe.'
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            content: data.content[0].text,
            model: data.model,
            usage: data.usage,
            provider: 'claude'
        };
    }

    // DeepSeek implementation
    async queryDeepSeek(prompt, options = {}) {
        const {
            model = 'deepseek-coder-33b',
            temperature = 0.7,
            maxTokens = 2000
        } = options;

        const apiKey = this.apiKeys.deepseek;
        if (!apiKey) throw new Error('DeepSeek API key not configured');

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are DeepSeek, specialized in trading algorithms and financial code generation.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            content: data.choices[0].message.content,
            model: data.model,
            usage: data.usage,
            provider: 'deepseek'
        };
    }

    // Warp implementation (WebSocket-based)
    async queryWarp(prompt, options = {}) {
        const apiKey = this.apiKeys.warp;
        if (!apiKey) throw new Error('Warp API key not configured');

        return new Promise((resolve, reject) => {
            const ws = this.wsConnections.get('warp') || this.createWarpConnection();
            
            const requestId = this.generateRequestId();
            const timeout = setTimeout(() => {
                reject(new Error('Warp request timeout'));
            }, 30000);

            const handler = (event) => {
                const data = JSON.parse(event.data);
                if (data.requestId === requestId) {
                    clearTimeout(timeout);
                    ws.removeEventListener('message', handler);
                    
                    if (data.error) {
                        reject(new Error(data.error));
                    } else {
                        resolve({
                            content: data.response,
                            model: 'warp-command',
                            provider: 'warp'
                        });
                    }
                }
            };

            ws.addEventListener('message', handler);
            
            ws.send(JSON.stringify({
                type: 'query',
                requestId,
                prompt,
                apiKey,
                options
            }));
        });
    }

    // GitHub Copilot implementation
    async queryCopilot(prompt, options = {}) {
        const {
            model = 'copilot-chat',
            context = '',
            language = 'python'
        } = options;

        const token = this.apiKeys.copilot;
        if (!token) throw new Error('GitHub token not configured');

        // Copilot uses a different endpoint structure
        const response = await fetch('https://api.github.com/copilot/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.copilot-preview+json'
            },
            body: JSON.stringify({
                prompt,
                context,
                language,
                max_tokens: options.maxTokens || 500,
                temperature: options.temperature || 0.1
            })
        });

        if (!response.ok) {
            throw new Error(`Copilot API error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            content: data.choices[0].text,
            model: 'copilot',
            provider: 'copilot'
        };
    }

    // Streaming support for OpenAI
    async streamOpenAI(requestBody, apiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let content = '';

        const stream = new ReadableStream({
            async start(controller) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                controller.close();
                                return;
                            }
                            
                            try {
                                const parsed = JSON.parse(data);
                                const delta = parsed.choices[0].delta.content || '';
                                content += delta;
                                controller.enqueue(delta);
                            } catch (e) {
                                // Skip parse errors
                            }
                        }
                    }
                }
            }
        });

        return {
            stream,
            getContent: () => content,
            provider: 'openai'
        };
    }

    // Multi-provider comparison
    async compareProviders(prompt, providers = null) {
        const targetProviders = providers || Object.keys(this.providers);
        const results = {};
        
        const promises = targetProviders.map(async (provider) => {
            try {
                const start = Date.now();
                const response = await this.query(prompt, { provider, useCache: false });
                const duration = Date.now() - start;
                
                results[provider] = {
                    response,
                    duration,
                    success: true
                };
            } catch (error) {
                results[provider] = {
                    error: error.message,
                    success: false
                };
            }
        });

        await Promise.all(promises);
        
        return {
            results,
            comparison: this.analyzeResponses(results),
            recommendation: this.recommendProvider(results, prompt)
        };
    }

    // Analyze trading data with AI
    async analyzeMarketData(data) {
        const {
            symbol,
            timeframe = '1h',
            indicators = {},
            volume,
            price,
            news = []
        } = data;

        const analysis = await this.query('', {
            template: 'marketAnalysis',
            variables: {
                symbol,
                timeframe,
                price,
                volume,
                indicators: JSON.stringify(indicators),
                news: news.slice(0, 5).join('; ')
            }
        });

        return this.parseMarketAnalysis(analysis.content);
    }

    // Generate trading strategy
    async generateStrategy(requirements) {
        const {
            type = 'momentum',
            risk = 'medium',
            timeframe = '15m',
            indicators = [],
            description = ''
        } = requirements;

        const code = await this.query('', {
            template: 'codeGeneration',
            provider: 'copilot',
            variables: {
                name: `${type}_strategy_${Date.now()}`,
                description: description || `${type} strategy for ${timeframe} timeframe`,
                entry: `Based on ${indicators.join(', ')}`,
                exit: `Risk level: ${risk}`,
                risk: `Position sizing based on ${risk} risk`
            }
        });

        return {
            code: code.content,
            language: 'pinescript',
            version: 5
        };
    }

    // Intelligent order suggestions
    async suggestOrder(marketData, accountData) {
        const prompt = `
        Based on the following market and account data, suggest an optimal order:
        
        Market Data:
        - Symbol: ${marketData.symbol}
        - Current Price: ${marketData.price}
        - 24h Volume: ${marketData.volume}
        - RSI: ${marketData.rsi}
        - MACD: ${marketData.macd}
        
        Account Data:
        - Balance: ${accountData.balance}
        - Risk Percentage: ${accountData.riskPercent}%
        - Open Positions: ${accountData.positions}
        
        Suggest:
        1. Order type (market/limit)
        2. Entry price
        3. Stop loss
        4. Take profit levels
        5. Position size
        6. Risk/reward ratio
        `;

        const response = await this.query(prompt, {
            provider: 'openai',
            temperature: 0.3 // Lower temperature for more consistent suggestions
        });

        return this.parseOrderSuggestion(response.content);
    }

    // News sentiment analysis
    async analyzeNewsSentiment(headlines, symbol) {
        const analysis = await this.query('', {
            template: 'newsAnalysis',
            provider: 'claude',
            variables: {
                headlines: headlines.join('\n'),
                symbol
            }
        });

        return this.parseSentimentAnalysis(analysis.content);
    }

    // Parse analysis results
    parseMarketAnalysis(content) {
        // Extract structured data from AI response
        const analysis = {
            technical: {},
            sentiment: 0,
            levels: {
                support: [],
                resistance: []
            },
            recommendation: '',
            risk: ''
        };

        // Simple parsing logic (can be enhanced with more sophisticated NLP)
        const lines = content.split('\n');
        let section = '';
        
        for (const line of lines) {
            if (line.includes('Technical')) section = 'technical';
            else if (line.includes('Sentiment')) section = 'sentiment';
            else if (line.includes('Support')) section = 'support';
            else if (line.includes('Resistance')) section = 'resistance';
            else if (line.includes('Recommendation')) section = 'recommendation';
            else if (line.includes('Risk')) section = 'risk';
            
            // Extract values based on section
            if (section === 'sentiment' && line.match(/[-\d]+/)) {
                analysis.sentiment = parseInt(line.match(/[-\d]+/)[0]);
            } else if (section === 'support' && line.match(/[\d.]+/)) {
                analysis.levels.support.push(parseFloat(line.match(/[\d.]+/)[0]));
            } else if (section === 'resistance' && line.match(/[\d.]+/)) {
                analysis.levels.resistance.push(parseFloat(line.match(/[\d.]+/)[0]));
            }
        }

        analysis.recommendation = content.match(/(?:buy|sell|hold)/i)?.[0] || 'hold';
        analysis.risk = content.match(/(?:low|medium|high)/i)?.[0] || 'medium';

        return analysis;
    }

    parseOrderSuggestion(content) {
        const suggestion = {
            orderType: 'limit',
            entryPrice: 0,
            stopLoss: 0,
            takeProfits: [],
            positionSize: 0,
            riskReward: 0
        };

        // Extract values from AI response
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.includes('market') || line.includes('limit')) {
                suggestion.orderType = line.includes('market') ? 'market' : 'limit';
            }
            if (line.includes('Entry') && line.match(/[\d.]+/)) {
                suggestion.entryPrice = parseFloat(line.match(/[\d.]+/)[0]);
            }
            if (line.includes('Stop') && line.match(/[\d.]+/)) {
                suggestion.stopLoss = parseFloat(line.match(/[\d.]+/)[0]);
            }
            if (line.includes('Take') && line.match(/[\d.]+/g)) {
                suggestion.takeProfits = line.match(/[\d.]+/g).map(parseFloat);
            }
            if (line.includes('Position size') && line.match(/[\d.]+/)) {
                suggestion.positionSize = parseFloat(line.match(/[\d.]+/)[0]);
            }
            if (line.includes('Risk/reward') && line.match(/[\d.]+/)) {
                suggestion.riskReward = parseFloat(line.match(/[\d.]+/)[0]);
            }
        }

        return suggestion;
    }

    parseSentimentAnalysis(content) {
        const analysis = {
            score: 0,
            themes: [],
            impact: 'neutral',
            risks: []
        };

        // Extract sentiment score
        const scoreMatch = content.match(/[-\d]+(?:\.\d+)?/);
        if (scoreMatch) {
            analysis.score = parseFloat(scoreMatch[0]);
        }

        // Extract themes
        const themesMatch = content.match(/themes?:(.+?)(?:\n|$)/i);
        if (themesMatch) {
            analysis.themes = themesMatch[1].split(',').map(t => t.trim());
        }

        // Determine impact
        if (Math.abs(analysis.score) > 75) analysis.impact = 'high';
        else if (Math.abs(analysis.score) > 40) analysis.impact = 'medium';
        else analysis.impact = 'low';

        // Extract risks
        const risksSection = content.match(/risks?:(.+?)(?:\n\n|$)/is);
        if (risksSection) {
            analysis.risks = risksSection[1].split(/[,\n]/).map(r => r.trim()).filter(r => r);
        }

        return analysis;
    }

    // Context enrichment
    enrichWithContext(prompt) {
        const context = [];
        
        // Add current market conditions
        if (this.tradingContext.marketCondition) {
            context.push(`Current market condition: ${this.tradingContext.marketCondition}`);
        }
        
        // Add account status
        if (this.tradingContext.accountBalance) {
            context.push(`Account balance: $${this.tradingContext.accountBalance}`);
        }
        
        // Add active positions
        if (this.tradingContext.positions?.length > 0) {
            context.push(`Active positions: ${this.tradingContext.positions.length}`);
        }

        if (context.length > 0) {
            return `${prompt}\n\nContext:\n${context.join('\n')}`;
        }
        
        return prompt;
    }

    // Update trading context
    updateTradingContext(data) {
        Object.assign(this.tradingContext, data);
    }

    // Conversation management
    updateConversation(conversationId, prompt, response) {
        if (!this.conversationHistory.has(conversationId)) {
            this.conversationHistory.set(conversationId, []);
        }
        
        this.conversationHistory.get(conversationId).push({
            prompt,
            response,
            timestamp: Date.now()
        });

        // Limit conversation history
        const history = this.conversationHistory.get(conversationId);
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }
    }

    getConversation(conversationId) {
        return this.conversationHistory.get(conversationId) || [];
    }

    // Rate limiting
    checkRateLimit(provider) {
        const config = this.providers[provider];
        const now = Date.now();
        
        if (now - config.lastRequest < config.rateLimit.window / config.rateLimit.requests) {
            return false;
        }
        
        config.lastRequest = now;
        return true;
    }

    // Fallback provider selection
    getFallbackProvider(failedProvider) {
        const priorities = {
            openai: ['claude', 'deepseek', 'chatgpt'],
            claude: ['openai', 'deepseek', 'chatgpt'],
            deepseek: ['openai', 'claude', 'chatgpt'],
            chatgpt: ['openai', 'claude', 'deepseek'],
            warp: ['openai', 'claude'],
            copilot: ['deepseek', 'openai']
        };

        const fallbacks = priorities[failedProvider] || [];
        
        for (const provider of fallbacks) {
            if (this.apiKeys[provider]) {
                return provider;
            }
        }
        
        return null;
    }

    // WebSocket connections
    setupWebSocketConnections() {
        // Setup Warp WebSocket
        if (this.apiKeys.warp) {
            this.createWarpConnection();
        }
    }

    createWarpConnection() {
        const ws = new WebSocket('wss://api.warp.dev/ai');
        
        ws.addEventListener('open', () => {
            console.log('Warp AI WebSocket connected');
            ws.send(JSON.stringify({
                type: 'auth',
                apiKey: this.apiKeys.warp
            }));
        });

        ws.addEventListener('error', (error) => {
            console.error('Warp WebSocket error:', error);
        });

        ws.addEventListener('close', () => {
            console.log('Warp WebSocket disconnected');
            // Reconnect after delay
            setTimeout(() => {
                if (this.apiKeys.warp) {
                    this.createWarpConnection();
                }
            }, 5000);
        });

        this.wsConnections.set('warp', ws);
        return ws;
    }

    // Template management
    applyTemplate(templateName, variables) {
        const template = this.templates[templateName];
        if (!template) {
            throw new Error(`Template ${templateName} not found`);
        }

        let prompt = template.prompt;
        
        // Replace variables
        for (const [key, value] of Object.entries(variables)) {
            prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
        }
        
        return prompt;
    }

    addCustomPrompt(name, prompt, provider = 'openai') {
        this.customPrompts.set(name, { prompt, provider });
    }

    // Response analysis
    analyzeResponses(results) {
        const analysis = {
            fastest: null,
            mostDetailed: null,
            consensus: null,
            quality: {}
        };

        let minDuration = Infinity;
        let maxLength = 0;

        for (const [provider, result] of Object.entries(results)) {
            if (!result.success) continue;

            // Find fastest
            if (result.duration < minDuration) {
                minDuration = result.duration;
                analysis.fastest = provider;
            }

            // Find most detailed
            const length = result.response.content.length;
            if (length > maxLength) {
                maxLength = length;
                analysis.mostDetailed = provider;
            }

            // Assess quality (basic heuristic)
            analysis.quality[provider] = this.assessResponseQuality(result.response.content);
        }

        return analysis;
    }

    assessResponseQuality(content) {
        const metrics = {
            length: content.length,
            hasCode: /```[\s\S]*```/.test(content),
            hasNumbers: /\d+\.?\d*/.test(content),
            hasList: /^\s*[-*\d]+\./m.test(content),
            sentiment: this.quickSentiment(content)
        };

        // Simple quality score
        let score = 0;
        if (metrics.length > 100) score += 20;
        if (metrics.length > 500) score += 20;
        if (metrics.hasCode) score += 25;
        if (metrics.hasNumbers) score += 15;
        if (metrics.hasList) score += 20;

        return {
            score,
            metrics
        };
    }

    quickSentiment(text) {
        const positive = /(?:good|great|excellent|profit|gain|up|bullish)/gi;
        const negative = /(?:bad|poor|loss|down|bearish|risk)/gi;
        
        const posCount = (text.match(positive) || []).length;
        const negCount = (text.match(negative) || []).length;
        
        if (posCount > negCount) return 'positive';
        if (negCount > posCount) return 'negative';
        return 'neutral';
    }

    recommendProvider(results, prompt) {
        // Analyze prompt to determine best provider
        const promptLower = prompt.toLowerCase();
        
        if (promptLower.includes('code') || promptLower.includes('script')) {
            return 'copilot';
        }
        if (promptLower.includes('terminal') || promptLower.includes('command')) {
            return 'warp';
        }
        if (promptLower.includes('long') || promptLower.includes('detailed')) {
            return 'claude';
        }
        if (promptLower.includes('trading') || promptLower.includes('strategy')) {
            return 'deepseek';
        }
        
        // Default to OpenAI
        return 'openai';
    }

    // UI Integration helpers
    async showAIPanel(options = {}) {
        const panel = document.getElementById('ai-assistant-panel');
        if (!panel) return;

        panel.style.display = 'block';
        
        if (options.provider) {
            this.activeProvider = options.provider;
            this.updateProviderUI(options.provider);
        }

        if (options.template) {
            this.loadTemplate(options.template);
        }
    }

    updateProviderUI(provider) {
        const info = this.providers[provider];
        const statusEl = document.getElementById('ai-provider-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="provider-info">
                    <span class="provider-name">${info.name}</span>
                    <span class="provider-model">${info.models[0]}</span>
                    <div class="provider-capabilities">
                        ${info.capabilities.map(c => `<span class="capability">${c}</span>`).join('')}
                    </div>
                </div>
            `;
        }
    }

    loadTemplate(templateName) {
        const template = this.templates[templateName];
        if (!template) return;

        const inputEl = document.getElementById('ai-prompt-input');
        if (inputEl) {
            inputEl.value = template.prompt;
        }
    }

    // Event handling
    initializeEventListeners() {
        // Listen for trading events to update context
        document.addEventListener('position-opened', (e) => {
            this.updateTradingContext({
                positions: e.detail.positions
            });
        });

        document.addEventListener('market-update', (e) => {
            this.updateTradingContext({
                marketCondition: e.detail.condition
            });
        });
    }

    emit(event, data) {
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    }

    // Utility methods
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    clearCache() {
        this.responseCache.clear();
        console.log('AI response cache cleared');
    }

    getProviderStatus() {
        const status = {};
        
        for (const [provider, config] of Object.entries(this.providers)) {
            status[provider] = {
                name: config.name,
                available: !!this.apiKeys[provider],
                models: config.models,
                capabilities: config.capabilities
            };
        }
        
        return status;
    }

    // Export conversation
    exportConversation(conversationId, format = 'json') {
        const history = this.getConversation(conversationId);
        
        if (format === 'json') {
            return JSON.stringify(history, null, 2);
        } else if (format === 'markdown') {
            return history.map(h => 
                `**User:** ${h.prompt}\n\n**AI:** ${h.response.content}\n\n---\n\n`
            ).join('');
        }
        
        return history;
    }
}

// Initialize AI module
window.aiModule = new AIModule();

// Export for use in other modules
export default AIModule;