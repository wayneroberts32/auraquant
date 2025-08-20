/**
 * AuraQuant News Module
 * Real-time news aggregation, filtering, and sentiment analysis
 * Supports multiple news sources and intelligent categorization
 */

class NewsModule {
    constructor() {
        this.newsFeeds = new Map();
        this.articles = [];
        this.filters = {
            keywords: [],
            categories: [],
            sources: [],
            sentiment: 'all', // all, positive, negative, neutral
            timeRange: '24h' // 1h, 6h, 24h, 7d, 30d
        };
        
        this.categories = [
            'Market News',
            'Earnings',
            'IPO',
            'Mergers & Acquisitions',
            'Economic Data',
            'Central Banks',
            'Politics',
            'Technology',
            'Healthcare',
            'Energy',
            'Crypto',
            'Commodities',
            'Forex',
            'Breaking News',
            'Analysis'
        ];
        
        // News source configurations
        this.sources = {
            reuters: {
                name: 'Reuters',
                url: 'https://api.reuters.com/news',
                apiKey: '{{REUTERS_API_KEY}}',
                enabled: true,
                priority: 1
            },
            bloomberg: {
                name: 'Bloomberg',
                url: 'https://api.bloomberg.com/news',
                apiKey: '{{BLOOMBERG_API_KEY}}',
                enabled: true,
                priority: 1
            },
            marketwatch: {
                name: 'MarketWatch',
                url: 'https://api.marketwatch.com/news',
                apiKey: '{{MARKETWATCH_API_KEY}}',
                enabled: true,
                priority: 2
            },
            cnbc: {
                name: 'CNBC',
                url: 'https://api.cnbc.com/news',
                apiKey: '{{CNBC_API_KEY}}',
                enabled: true,
                priority: 2
            },
            wsj: {
                name: 'Wall Street Journal',
                url: 'https://api.wsj.com/news',
                apiKey: '{{WSJ_API_KEY}}',
                enabled: true,
                priority: 1
            },
            ft: {
                name: 'Financial Times',
                url: 'https://api.ft.com/news',
                apiKey: '{{FT_API_KEY}}',
                enabled: true,
                priority: 1
            },
            benzinga: {
                name: 'Benzinga',
                url: 'https://api.benzinga.com/api/v2.1/news',
                apiKey: '{{BENZINGA_API_KEY}}',
                enabled: true,
                priority: 3
            },
            alphavantage: {
                name: 'Alpha Vantage',
                url: 'https://www.alphavantage.co/query',
                apiKey: '{{ALPHA_VANTAGE_API_KEY}}',
                enabled: true,
                priority: 3
            },
            newsapi: {
                name: 'NewsAPI',
                url: 'https://newsapi.org/v2/everything',
                apiKey: '{{NEWS_API_KEY}}',
                enabled: true,
                priority: 3
            },
            reddit: {
                name: 'Reddit WSB',
                url: 'https://www.reddit.com/r/wallstreetbets/.json',
                apiKey: null,
                enabled: true,
                priority: 4
            },
            twitter: {
                name: 'Twitter/X',
                url: 'https://api.twitter.com/2/tweets/search/recent',
                apiKey: '{{TWITTER_BEARER_TOKEN}}',
                enabled: true,
                priority: 4
            }
        };
        
        // Sentiment analysis keywords
        this.sentimentKeywords = {
            positive: [
                'surge', 'soar', 'rally', 'gain', 'rise', 'boost', 'profit', 'growth',
                'bullish', 'upgrade', 'beat', 'exceed', 'breakthrough', 'record high',
                'optimistic', 'strong', 'outperform', 'buy', 'accumulate'
            ],
            negative: [
                'plunge', 'crash', 'fall', 'drop', 'decline', 'loss', 'bearish',
                'downgrade', 'miss', 'concern', 'risk', 'warning', 'sell-off',
                'pessimistic', 'weak', 'underperform', 'sell', 'avoid'
            ],
            urgent: [
                'breaking', 'alert', 'urgent', 'flash', 'just in', 'developing',
                'exclusive', 'confirmed', 'emergency', 'immediate'
            ]
        };
        
        this.updateInterval = null;
        this.alertKeywords = [];
        this.seenArticles = new Set();
        
        this.init();
    }
    
    async init() {
        console.log('📰 Initializing News Module...');
        
        // Load saved preferences
        this.loadPreferences();
        
        // Initialize UI
        this.initializeUI();
        
        // Start fetching news
        await this.fetchAllNews();
        
        // Set up auto-refresh
        this.startAutoRefresh();
        
        // Set up WebSocket for real-time news
        this.connectWebSocket();
        
        console.log('✅ News Module initialized');
    }
    
    async fetchAllNews() {
        const promises = [];
        
        for (const [sourceId, source] of Object.entries(this.sources)) {
            if (source.enabled) {
                promises.push(this.fetchNewsFromSource(sourceId, source));
            }
        }
        
        try {
            const results = await Promise.allSettled(promises);
            
            // Combine all articles
            const allArticles = [];
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    allArticles.push(...result.value);
                }
            });
            
            // Process and store articles
            this.processArticles(allArticles);
            
            // Update UI
            this.renderNews();
            
        } catch (error) {
            console.error('Error fetching news:', error);
        }
    }
    
    async fetchNewsFromSource(sourceId, source) {
        try {
            const params = this.buildQueryParams(sourceId);
            const url = `${source.url}?${params}`;
            
            const response = await fetch(url, {
                headers: source.apiKey ? {
                    'Authorization': `Bearer ${source.apiKey}`,
                    'X-API-Key': source.apiKey
                } : {}
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Parse articles based on source format
            return this.parseSourceArticles(sourceId, data);
            
        } catch (error) {
            console.error(`Error fetching from ${source.name}:`, error);
            return [];
        }
    }
    
    parseSourceArticles(sourceId, data) {
        const articles = [];
        
        switch (sourceId) {
            case 'newsapi':
                if (data.articles) {
                    data.articles.forEach(article => {
                        articles.push({
                            id: this.generateArticleId(article.url),
                            source: this.sources[sourceId].name,
                            title: article.title,
                            description: article.description,
                            url: article.url,
                            imageUrl: article.urlToImage,
                            publishedAt: new Date(article.publishedAt),
                            author: article.author,
                            content: article.content,
                            category: this.categorizeArticle(article),
                            sentiment: this.analyzeSentiment(article),
                            relevance: this.calculateRelevance(article)
                        });
                    });
                }
                break;
                
            case 'benzinga':
                if (data.data) {
                    data.data.forEach(article => {
                        articles.push({
                            id: this.generateArticleId(article.url),
                            source: this.sources[sourceId].name,
                            title: article.title,
                            description: article.teaser,
                            url: article.url,
                            imageUrl: article.image,
                            publishedAt: new Date(article.created),
                            author: article.author,
                            tickers: article.stocks,
                            category: this.categorizeArticle(article),
                            sentiment: this.analyzeSentiment(article),
                            relevance: this.calculateRelevance(article)
                        });
                    });
                }
                break;
                
            case 'reddit':
                if (data.data && data.data.children) {
                    data.data.children.forEach(post => {
                        const article = post.data;
                        articles.push({
                            id: this.generateArticleId(article.permalink),
                            source: 'Reddit WSB',
                            title: article.title,
                            description: article.selftext?.substring(0, 200),
                            url: `https://reddit.com${article.permalink}`,
                            publishedAt: new Date(article.created_utc * 1000),
                            author: article.author,
                            upvotes: article.ups,
                            comments: article.num_comments,
                            category: 'Social Sentiment',
                            sentiment: this.analyzeSentiment({ title: article.title, content: article.selftext }),
                            relevance: this.calculateRelevance({ title: article.title })
                        });
                    });
                }
                break;
                
            // Add more source parsers as needed
        }
        
        return articles;
    }
    
    processArticles(articles) {
        // Remove duplicates
        const uniqueArticles = articles.filter(article => {
            if (this.seenArticles.has(article.id)) {
                return false;
            }
            this.seenArticles.add(article.id);
            return true;
        });
        
        // Sort by relevance and time
        uniqueArticles.sort((a, b) => {
            // Priority sort first
            const priorityA = this.sources[this.getSourceId(a.source)]?.priority || 999;
            const priorityB = this.sources[this.getSourceId(b.source)]?.priority || 999;
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            
            // Then by relevance
            if (Math.abs(a.relevance - b.relevance) > 0.1) {
                return b.relevance - a.relevance;
            }
            
            // Finally by time
            return b.publishedAt - a.publishedAt;
        });
        
        // Add to articles array
        this.articles = [...uniqueArticles, ...this.articles];
        
        // Limit total articles
        if (this.articles.length > 1000) {
            this.articles = this.articles.slice(0, 1000);
        }
        
        // Check for alerts
        this.checkAlerts(uniqueArticles);
    }
    
    categorizeArticle(article) {
        const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();
        
        // Category keywords mapping
        const categoryKeywords = {
            'Earnings': ['earnings', 'revenue', 'profit', 'eps', 'quarter', 'guidance'],
            'IPO': ['ipo', 'initial public offering', 'debut', 'listing'],
            'Mergers & Acquisitions': ['merger', 'acquisition', 'buyout', 'takeover', 'deal'],
            'Economic Data': ['gdp', 'inflation', 'unemployment', 'jobs', 'cpi', 'pce'],
            'Central Banks': ['fed', 'federal reserve', 'ecb', 'boe', 'boj', 'rate', 'powell'],
            'Politics': ['election', 'president', 'congress', 'senate', 'policy', 'government'],
            'Technology': ['tech', 'software', 'ai', 'artificial intelligence', 'chip', 'semiconductor'],
            'Healthcare': ['pharma', 'drug', 'fda', 'vaccine', 'medical', 'biotech'],
            'Energy': ['oil', 'gas', 'renewable', 'solar', 'wind', 'energy', 'opec'],
            'Crypto': ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi', 'nft'],
            'Commodities': ['gold', 'silver', 'copper', 'wheat', 'corn', 'commodity'],
            'Forex': ['forex', 'currency', 'dollar', 'euro', 'yen', 'pound', 'fx']
        };
        
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }
        
        return 'Market News';
    }
    
    analyzeSentiment(article) {
        const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();
        
        let positiveScore = 0;
        let negativeScore = 0;
        
        // Count sentiment keywords
        this.sentimentKeywords.positive.forEach(keyword => {
            if (text.includes(keyword)) positiveScore++;
        });
        
        this.sentimentKeywords.negative.forEach(keyword => {
            if (text.includes(keyword)) negativeScore++;
        });
        
        // Calculate sentiment
        if (positiveScore > negativeScore * 1.5) {
            return 'positive';
        } else if (negativeScore > positiveScore * 1.5) {
            return 'negative';
        } else {
            return 'neutral';
        }
    }
    
    calculateRelevance(article) {
        let score = 0;
        const text = `${article.title} ${article.description || ''}`.toLowerCase();
        
        // Check filter keywords
        this.filters.keywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
                score += 2;
            }
        });
        
        // Check alert keywords
        this.alertKeywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
                score += 3;
            }
        });
        
        // Check urgent keywords
        this.sentimentKeywords.urgent.forEach(keyword => {
            if (text.includes(keyword)) {
                score += 1;
            }
        });
        
        // Normalize score (0-1)
        return Math.min(score / 10, 1);
    }
    
    checkAlerts(articles) {
        articles.forEach(article => {
            // Check if article matches alert criteria
            const shouldAlert = this.alertKeywords.some(keyword => {
                const text = `${article.title} ${article.description || ''}`.toLowerCase();
                return text.includes(keyword.toLowerCase());
            });
            
            if (shouldAlert) {
                // Trigger alert
                this.triggerNewsAlert(article);
            }
            
            // Check for breaking news
            if (article.title.toLowerCase().includes('breaking') || 
                article.relevance > 0.8) {
                this.triggerBreakingNews(article);
            }
        });
    }
    
    triggerNewsAlert(article) {
        // Dispatch event for audio alert
        document.dispatchEvent(new CustomEvent('newsAlert', {
            detail: {
                headline: article.title,
                source: article.source,
                url: article.url,
                category: article.category
            }
        }));
        
        // Show notification
        this.showNotification(article, 'alert');
    }
    
    triggerBreakingNews(article) {
        // Dispatch event for breaking news
        document.dispatchEvent(new CustomEvent('breakingNews', {
            detail: {
                headline: article.title,
                source: article.source,
                url: article.url,
                category: article.category
            }
        }));
        
        // Show notification
        this.showNotification(article, 'breaking');
    }
    
    showNotification(article, type = 'normal') {
        const notification = document.createElement('div');
        notification.className = `news-notification ${type}`;
        notification.innerHTML = `
            <div class="news-notification-header">
                <span class="news-source">${article.source}</span>
                <span class="news-time">${this.formatTime(article.publishedAt)}</span>
            </div>
            <div class="news-notification-title">${article.title}</div>
            <div class="news-notification-actions">
                <button onclick="window.open('${article.url}', '_blank')">Read More</button>
                <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
            </div>
        `;
        
        const container = document.getElementById('news-notifications') || document.body;
        container.appendChild(notification);
        
        // Auto-remove after 10 seconds for normal, 30 seconds for breaking
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, type === 'breaking' ? 30000 : 10000);
    }
    
    filterArticles() {
        let filtered = [...this.articles];
        
        // Filter by time range
        const now = Date.now();
        const timeRanges = {
            '1h': 3600000,
            '6h': 21600000,
            '24h': 86400000,
            '7d': 604800000,
            '30d': 2592000000
        };
        
        const maxAge = timeRanges[this.filters.timeRange];
        if (maxAge) {
            filtered = filtered.filter(article => 
                (now - article.publishedAt.getTime()) < maxAge
            );
        }
        
        // Filter by keywords
        if (this.filters.keywords.length > 0) {
            filtered = filtered.filter(article => {
                const text = `${article.title} ${article.description || ''}`.toLowerCase();
                return this.filters.keywords.some(keyword => 
                    text.includes(keyword.toLowerCase())
                );
            });
        }
        
        // Filter by categories
        if (this.filters.categories.length > 0) {
            filtered = filtered.filter(article => 
                this.filters.categories.includes(article.category)
            );
        }
        
        // Filter by sources
        if (this.filters.sources.length > 0) {
            filtered = filtered.filter(article => 
                this.filters.sources.includes(article.source)
            );
        }
        
        // Filter by sentiment
        if (this.filters.sentiment !== 'all') {
            filtered = filtered.filter(article => 
                article.sentiment === this.filters.sentiment
            );
        }
        
        return filtered;
    }
    
    renderNews() {
        const container = document.getElementById('news-container');
        if (!container) return;
        
        const filtered = this.filterArticles();
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="no-news">No news articles match your filters</div>';
            return;
        }
        
        container.innerHTML = filtered.slice(0, 50).map(article => `
            <div class="news-article ${article.sentiment}" data-id="${article.id}">
                <div class="news-header">
                    <span class="news-source">${article.source}</span>
                    <span class="news-category">${article.category}</span>
                    <span class="news-time">${this.formatTime(article.publishedAt)}</span>
                </div>
                <h3 class="news-title">
                    <a href="${article.url}" target="_blank">${article.title}</a>
                </h3>
                ${article.description ? `
                    <p class="news-description">${article.description}</p>
                ` : ''}
                <div class="news-footer">
                    <span class="news-sentiment sentiment-${article.sentiment}">
                        ${this.getSentimentIcon(article.sentiment)}
                    </span>
                    ${article.tickers ? `
                        <span class="news-tickers">
                            ${article.tickers.map(t => `<span class="ticker">${t}</span>`).join('')}
                        </span>
                    ` : ''}
                    <span class="news-relevance">
                        Relevance: ${Math.round(article.relevance * 100)}%
                    </span>
                </div>
            </div>
        `).join('');
    }
    
    getSentimentIcon(sentiment) {
        const icons = {
            positive: '📈 Bullish',
            negative: '📉 Bearish',
            neutral: '➖ Neutral'
        };
        return icons[sentiment] || icons.neutral;
    }
    
    formatTime(date) {
        const now = Date.now();
        const diff = now - date.getTime();
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        return date.toLocaleDateString();
    }
    
    connectWebSocket() {
        // Connect to news WebSocket for real-time updates
        if (window.wsModule) {
            window.wsModule.subscribe('news', 'news-updates', (data) => {
                if (data.articles) {
                    this.processArticles(data.articles);
                    this.renderNews();
                }
            });
        }
    }
    
    startAutoRefresh() {
        // Refresh news every 5 minutes
        this.updateInterval = setInterval(() => {
            this.fetchAllNews();
        }, 300000);
    }
    
    stopAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    // UI Methods
    initializeUI() {
        // Initialize filter controls
        this.initializeFilters();
        
        // Initialize search
        this.initializeSearch();
        
        // Initialize alert settings
        this.initializeAlerts();
    }
    
    initializeFilters() {
        // Time range selector
        const timeRange = document.getElementById('news-time-range');
        if (timeRange) {
            timeRange.value = this.filters.timeRange;
            timeRange.addEventListener('change', (e) => {
                this.filters.timeRange = e.target.value;
                this.renderNews();
                this.savePreferences();
            });
        }
        
        // Category checkboxes
        const categoryContainer = document.getElementById('news-categories');
        if (categoryContainer) {
            this.categories.forEach(category => {
                const label = document.createElement('label');
                label.innerHTML = `
                    <input type="checkbox" value="${category}" 
                        ${this.filters.categories.includes(category) ? 'checked' : ''}>
                    ${category}
                `;
                
                label.querySelector('input').addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.filters.categories.push(category);
                    } else {
                        this.filters.categories = this.filters.categories.filter(c => c !== category);
                    }
                    this.renderNews();
                    this.savePreferences();
                });
                
                categoryContainer.appendChild(label);
            });
        }
        
        // Sentiment filter
        const sentiment = document.getElementById('news-sentiment');
        if (sentiment) {
            sentiment.value = this.filters.sentiment;
            sentiment.addEventListener('change', (e) => {
                this.filters.sentiment = e.target.value;
                this.renderNews();
                this.savePreferences();
            });
        }
    }
    
    initializeSearch() {
        const searchInput = document.getElementById('news-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                this.filters.keywords = keywords;
                this.renderNews();
            });
        }
    }
    
    initializeAlerts() {
        const alertInput = document.getElementById('news-alert-keywords');
        if (alertInput) {
            alertInput.value = this.alertKeywords.join(', ');
            alertInput.addEventListener('change', (e) => {
                this.alertKeywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                this.savePreferences();
            });
        }
    }
    
    // Helper methods
    generateArticleId(url) {
        // Generate unique ID from URL
        return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }
    
    getSourceId(sourceName) {
        for (const [id, source] of Object.entries(this.sources)) {
            if (source.name === sourceName) return id;
        }
        return null;
    }
    
    buildQueryParams(sourceId) {
        const params = new URLSearchParams();
        
        switch (sourceId) {
            case 'newsapi':
                params.append('q', this.filters.keywords.join(' OR ') || 'stocks');
                params.append('sortBy', 'publishedAt');
                params.append('language', 'en');
                params.append('pageSize', '50');
                break;
                
            case 'benzinga':
                params.append('token', this.sources[sourceId].apiKey);
                params.append('pageSize', '50');
                if (this.filters.keywords.length > 0) {
                    params.append('tickers', this.filters.keywords.join(','));
                }
                break;
                
            // Add more source-specific params
        }
        
        return params.toString();
    }
    
    // Preferences
    loadPreferences() {
        const saved = localStorage.getItem('newsPreferences');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                this.filters = { ...this.filters, ...prefs.filters };
                this.alertKeywords = prefs.alertKeywords || [];
                
                // Load enabled sources
                if (prefs.sources) {
                    Object.keys(prefs.sources).forEach(sourceId => {
                        if (this.sources[sourceId]) {
                            this.sources[sourceId].enabled = prefs.sources[sourceId];
                        }
                    });
                }
            } catch (error) {
                console.error('Error loading news preferences:', error);
            }
        }
    }
    
    savePreferences() {
        const prefs = {
            filters: this.filters,
            alertKeywords: this.alertKeywords,
            sources: {}
        };
        
        // Save enabled state for each source
        Object.keys(this.sources).forEach(sourceId => {
            prefs.sources[sourceId] = this.sources[sourceId].enabled;
        });
        
        localStorage.setItem('newsPreferences', JSON.stringify(prefs));
    }
    
    // Public methods
    addAlertKeyword(keyword) {
        if (!this.alertKeywords.includes(keyword)) {
            this.alertKeywords.push(keyword);
            this.savePreferences();
        }
    }
    
    removeAlertKeyword(keyword) {
        this.alertKeywords = this.alertKeywords.filter(k => k !== keyword);
        this.savePreferences();
    }
    
    toggleSource(sourceId) {
        if (this.sources[sourceId]) {
            this.sources[sourceId].enabled = !this.sources[sourceId].enabled;
            this.savePreferences();
            this.fetchAllNews();
        }
    }
    
    clearFilters() {
        this.filters = {
            keywords: [],
            categories: [],
            sources: [],
            sentiment: 'all',
            timeRange: '24h'
        };
        this.renderNews();
        this.savePreferences();
    }
    
    exportNews(format = 'csv') {
        const filtered = this.filterArticles();
        
        if (format === 'csv') {
            const csv = [
                ['Date', 'Source', 'Category', 'Title', 'URL', 'Sentiment'].join(','),
                ...filtered.map(article => [
                    article.publishedAt.toISOString(),
                    article.source,
                    article.category,
                    `"${article.title.replace(/"/g, '""')}"`,
                    article.url,
                    article.sentiment
                ].join(','))
            ].join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `news-export-${Date.now()}.csv`;
            a.click();
        }
    }
    
    // Cleanup
    destroy() {
        this.stopAutoRefresh();
        this.seenArticles.clear();
        this.articles = [];
    }
}

// Initialize on page load
let newsModule;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        newsModule = new NewsModule();
        window.newsModule = newsModule;
    });
} else {
    newsModule = new NewsModule();
    window.newsModule = newsModule;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewsModule;
}