/**
 * AuraQuant Economic Calendar Module
 * Tracks economic events, earnings releases, dividends, and market holidays
 * Provides alerts and filtering for important market events
 */

class CalendarModule {
    constructor() {
        this.events = [];
        this.filters = {
            importance: ['high', 'medium', 'low'],
            categories: [],
            countries: [],
            dateRange: 'week', // today, week, month
            searchTerm: ''
        };
        
        this.categories = [
            'Economic Data',
            'Central Bank',
            'Earnings',
            'Dividends',
            'IPO',
            'Options Expiry',
            'Bond Auctions',
            'Speeches',
            'Holidays',
            'Corporate Events'
        ];
        
        this.countries = {
            US: { name: 'United States', flag: '🇺🇸', currency: 'USD' },
            GB: { name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
            EU: { name: 'European Union', flag: '🇪🇺', currency: 'EUR' },
            JP: { name: 'Japan', flag: '🇯🇵', currency: 'JPY' },
            CN: { name: 'China', flag: '🇨🇳', currency: 'CNY' },
            AU: { name: 'Australia', flag: '🇦🇺', currency: 'AUD' },
            CA: { name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
            CH: { name: 'Switzerland', flag: '🇨🇭', currency: 'CHF' },
            NZ: { name: 'New Zealand', flag: '🇳🇿', currency: 'NZD' }
        };
        
        // Economic indicators configuration
        this.indicators = {
            // High importance
            'NFP': { name: 'Non-Farm Payrolls', importance: 'high', country: 'US' },
            'CPI': { name: 'Consumer Price Index', importance: 'high', country: 'US' },
            'GDP': { name: 'Gross Domestic Product', importance: 'high', country: 'US' },
            'FOMC': { name: 'FOMC Meeting', importance: 'high', country: 'US' },
            'ECB': { name: 'ECB Rate Decision', importance: 'high', country: 'EU' },
            'BOE': { name: 'BoE Rate Decision', importance: 'high', country: 'GB' },
            'BOJ': { name: 'BoJ Rate Decision', importance: 'high', country: 'JP' },
            
            // Medium importance
            'Retail Sales': { name: 'Retail Sales', importance: 'medium', country: 'US' },
            'PMI': { name: 'PMI', importance: 'medium', country: 'US' },
            'Unemployment': { name: 'Unemployment Rate', importance: 'medium', country: 'US' },
            'Housing Starts': { name: 'Housing Starts', importance: 'medium', country: 'US' },
            'Consumer Confidence': { name: 'Consumer Confidence', importance: 'medium', country: 'US' },
            
            // Low importance
            'Building Permits': { name: 'Building Permits', importance: 'low', country: 'US' },
            'Trade Balance': { name: 'Trade Balance', importance: 'low', country: 'US' },
            'Industrial Production': { name: 'Industrial Production', importance: 'low', country: 'US' }
        };
        
        this.updateInterval = null;
        this.alertSettings = {
            enabled: true,
            advanceNotice: 15, // minutes before event
            importance: ['high', 'medium']
        };
        
        this.init();
    }
    
    async init() {
        console.log('📅 Initializing Calendar Module...');
        
        // Load preferences
        this.loadPreferences();
        
        // Initialize UI
        this.initializeUI();
        
        // Fetch calendar events
        await this.fetchEvents();
        
        // Start auto-refresh
        this.startAutoRefresh();
        
        // Set up event alerts
        this.setupEventAlerts();
        
        console.log('✅ Calendar Module initialized');
    }
    
    async fetchEvents() {
        try {
            // Fetch from multiple sources
            const [economic, earnings, dividends, holidays] = await Promise.all([
                this.fetchEconomicEvents(),
                this.fetchEarnings(),
                this.fetchDividends(),
                this.fetchHolidays()
            ]);
            
            // Combine all events
            this.events = [
                ...economic,
                ...earnings,
                ...dividends,
                ...holidays
            ];
            
            // Sort by datetime
            this.events.sort((a, b) => a.datetime - b.datetime);
            
            // Render calendar
            this.renderCalendar();
            
        } catch (error) {
            console.error('Error fetching calendar events:', error);
        }
    }
    
    async fetchEconomicEvents() {
        try {
            // In production, fetch from API
            // For now, return sample data
            const events = [];
            const now = new Date();
            
            // Generate sample economic events
            for (let i = 0; i < 30; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() + Math.floor(Math.random() * 30));
                date.setHours(Math.floor(Math.random() * 24));
                date.setMinutes(Math.floor(Math.random() * 60));
                
                const indicators = Object.keys(this.indicators);
                const indicator = indicators[Math.floor(Math.random() * indicators.length)];
                const info = this.indicators[indicator];
                
                events.push({
                    id: `eco-${i}`,
                    type: 'economic',
                    category: 'Economic Data',
                    title: info.name,
                    datetime: date,
                    importance: info.importance,
                    country: info.country,
                    actual: null,
                    forecast: (Math.random() * 5).toFixed(1),
                    previous: (Math.random() * 5).toFixed(1),
                    description: `${info.name} release for ${this.countries[info.country].name}`
                });
            }
            
            return events;
            
        } catch (error) {
            console.error('Error fetching economic events:', error);
            return [];
        }
    }
    
    async fetchEarnings() {
        try {
            // Sample earnings data
            const companies = [
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
                'JPM', 'BAC', 'WMT', 'JNJ', 'PG', 'UNH', 'HD', 'DIS'
            ];
            
            const events = [];
            const now = new Date();
            
            for (let i = 0; i < 20; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() + Math.floor(Math.random() * 30));
                date.setHours(Math.random() > 0.5 ? 8 : 16); // Before or after market
                
                const symbol = companies[Math.floor(Math.random() * companies.length)];
                
                events.push({
                    id: `earn-${i}`,
                    type: 'earnings',
                    category: 'Earnings',
                    title: `${symbol} Earnings`,
                    symbol: symbol,
                    datetime: date,
                    importance: 'high',
                    timing: date.getHours() < 12 ? 'BMO' : 'AMC',
                    epsEstimate: (Math.random() * 5).toFixed(2),
                    revEstimate: `${(Math.random() * 100).toFixed(1)}B`,
                    description: `${symbol} Q${Math.ceil(Math.random() * 4)} earnings release`
                });
            }
            
            return events;
            
        } catch (error) {
            console.error('Error fetching earnings:', error);
            return [];
        }
    }
    
    async fetchDividends() {
        try {
            // Sample dividend data
            const events = [];
            const now = new Date();
            
            for (let i = 0; i < 10; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() + Math.floor(Math.random() * 30));
                
                const symbols = ['AAPL', 'MSFT', 'JNJ', 'PG', 'KO', 'PEP', 'XOM', 'CVX'];
                const symbol = symbols[Math.floor(Math.random() * symbols.length)];
                
                events.push({
                    id: `div-${i}`,
                    type: 'dividend',
                    category: 'Dividends',
                    title: `${symbol} Ex-Dividend`,
                    symbol: symbol,
                    datetime: date,
                    importance: 'low',
                    amount: (Math.random() * 2).toFixed(2),
                    yield: (Math.random() * 5).toFixed(2),
                    description: `${symbol} ex-dividend date`
                });
            }
            
            return events;
            
        } catch (error) {
            console.error('Error fetching dividends:', error);
            return [];
        }
    }
    
    async fetchHolidays() {
        try {
            // Sample holiday data
            const holidays = [
                { name: "New Year's Day", date: '2024-01-01', markets: ['US', 'EU', 'GB'] },
                { name: 'Martin Luther King Day', date: '2024-01-15', markets: ['US'] },
                { name: "Presidents' Day", date: '2024-02-19', markets: ['US'] },
                { name: 'Good Friday', date: '2024-03-29', markets: ['US', 'EU', 'GB'] },
                { name: 'Memorial Day', date: '2024-05-27', markets: ['US'] },
                { name: 'Independence Day', date: '2024-07-04', markets: ['US'] },
                { name: 'Labor Day', date: '2024-09-02', markets: ['US'] },
                { name: 'Thanksgiving', date: '2024-11-28', markets: ['US'] },
                { name: 'Christmas', date: '2024-12-25', markets: ['US', 'EU', 'GB'] }
            ];
            
            const events = holidays.map((holiday, i) => ({
                id: `hol-${i}`,
                type: 'holiday',
                category: 'Holidays',
                title: holiday.name,
                datetime: new Date(holiday.date),
                importance: 'high',
                markets: holiday.markets,
                description: `Market holiday: ${holiday.markets.join(', ')}`
            }));
            
            return events.filter(e => e.datetime > new Date());
            
        } catch (error) {
            console.error('Error fetching holidays:', error);
            return [];
        }
    }
    
    filterEvents() {
        let filtered = [...this.events];
        
        // Filter by date range
        const now = new Date();
        const endDate = new Date();
        
        switch (this.filters.dateRange) {
            case 'today':
                endDate.setDate(endDate.getDate() + 1);
                break;
            case 'week':
                endDate.setDate(endDate.getDate() + 7);
                break;
            case 'month':
                endDate.setMonth(endDate.getMonth() + 1);
                break;
        }
        
        filtered = filtered.filter(event => 
            event.datetime >= now && event.datetime <= endDate
        );
        
        // Filter by importance
        if (this.filters.importance.length < 3) {
            filtered = filtered.filter(event => 
                this.filters.importance.includes(event.importance)
            );
        }
        
        // Filter by categories
        if (this.filters.categories.length > 0) {
            filtered = filtered.filter(event => 
                this.filters.categories.includes(event.category)
            );
        }
        
        // Filter by countries
        if (this.filters.countries.length > 0) {
            filtered = filtered.filter(event => 
                event.country && this.filters.countries.includes(event.country)
            );
        }
        
        // Filter by search term
        if (this.filters.searchTerm) {
            const term = this.filters.searchTerm.toLowerCase();
            filtered = filtered.filter(event => 
                event.title.toLowerCase().includes(term) ||
                event.description?.toLowerCase().includes(term) ||
                event.symbol?.toLowerCase().includes(term)
            );
        }
        
        return filtered;
    }
    
    renderCalendar() {
        const container = document.getElementById('calendar-container');
        if (!container) return;
        
        const filtered = this.filterEvents();
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="no-events">No events match your filters</div>';
            return;
        }
        
        // Group events by date
        const grouped = {};
        filtered.forEach(event => {
            const dateKey = event.datetime.toDateString();
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(event);
        });
        
        // Render grouped events
        let html = '';
        
        for (const [date, events] of Object.entries(grouped)) {
            html += `
                <div class="calendar-date-group">
                    <h3 class="calendar-date">${this.formatDate(new Date(date))}</h3>
                    <div class="calendar-events">
                        ${events.map(event => this.renderEvent(event)).join('')}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Attach event listeners
        this.attachEventListeners();
    }
    
    renderEvent(event) {
        const icon = this.getEventIcon(event.type);
        const importanceClass = `importance-${event.importance}`;
        const countryFlag = event.country ? this.countries[event.country]?.flag || '' : '';
        
        return `
            <div class="calendar-event ${event.type} ${importanceClass}" data-id="${event.id}">
                <div class="event-time">
                    ${event.datetime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                </div>
                <div class="event-icon">${icon}</div>
                <div class="event-content">
                    <div class="event-header">
                        <span class="event-title">${event.title}</span>
                        ${countryFlag ? `<span class="event-country">${countryFlag}</span>` : ''}
                        ${event.symbol ? `<span class="event-symbol">${event.symbol}</span>` : ''}
                    </div>
                    ${this.renderEventDetails(event)}
                </div>
                <div class="event-actions">
                    <button class="btn-alert" onclick="calendarModule.toggleAlert('${event.id}')">
                        🔔
                    </button>
                    <button class="btn-info" onclick="calendarModule.showEventInfo('${event.id}')">
                        ℹ️
                    </button>
                </div>
            </div>
        `;
    }
    
    renderEventDetails(event) {
        switch (event.type) {
            case 'economic':
                return `
                    <div class="event-details">
                        <span class="detail">Prev: ${event.previous || '-'}</span>
                        <span class="detail">Forecast: ${event.forecast || '-'}</span>
                        <span class="detail">Actual: ${event.actual || '-'}</span>
                    </div>
                `;
                
            case 'earnings':
                return `
                    <div class="event-details">
                        <span class="detail">EPS Est: $${event.epsEstimate || '-'}</span>
                        <span class="detail">Rev Est: $${event.revEstimate || '-'}</span>
                        <span class="detail">${event.timing}</span>
                    </div>
                `;
                
            case 'dividend':
                return `
                    <div class="event-details">
                        <span class="detail">Amount: $${event.amount || '-'}</span>
                        <span class="detail">Yield: ${event.yield || '-'}%</span>
                    </div>
                `;
                
            case 'holiday':
                return `
                    <div class="event-details">
                        <span class="detail">Markets: ${event.markets?.join(', ') || '-'}</span>
                    </div>
                `;
                
            default:
                return '';
        }
    }
    
    getEventIcon(type) {
        const icons = {
            economic: '📊',
            earnings: '💰',
            dividend: '💵',
            holiday: '🏖️',
            ipo: '🚀',
            speech: '🎤',
            bond: '📜',
            options: '📈'
        };
        
        return icons[type] || '📅';
    }
    
    formatDate(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
    }
    
    setupEventAlerts() {
        // Check for upcoming events every minute
        setInterval(() => {
            if (!this.alertSettings.enabled) return;
            
            const now = new Date();
            const alertTime = new Date(now.getTime() + this.alertSettings.advanceNotice * 60000);
            
            this.events.forEach(event => {
                // Check if event is within alert window
                if (event.datetime > now && event.datetime <= alertTime) {
                    // Check if we should alert for this importance
                    if (this.alertSettings.importance.includes(event.importance)) {
                        // Check if we haven't already alerted
                        if (!event.alerted) {
                            this.triggerEventAlert(event);
                            event.alerted = true;
                        }
                    }
                }
            });
        }, 60000);
    }
    
    triggerEventAlert(event) {
        // Audio alert
        if (window.audioAlerts) {
            window.audioAlerts.play('priceAlert', {
                message: `Upcoming event: ${event.title}`,
                priority: event.importance === 'high' ? 4 : 3
            });
        }
        
        // Visual notification
        const notification = document.createElement('div');
        notification.className = `calendar-notification ${event.importance}`;
        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-icon">${this.getEventIcon(event.type)}</span>
                <span class="notification-time">
                    In ${this.alertSettings.advanceNotice} minutes
                </span>
            </div>
            <div class="notification-title">${event.title}</div>
            ${event.description ? `
                <div class="notification-description">${event.description}</div>
            ` : ''}
            <button onclick="this.parentElement.remove()">Dismiss</button>
        `;
        
        const container = document.getElementById('calendar-notifications') || document.body;
        container.appendChild(notification);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 30000);
    }
    
    toggleAlert(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            event.alertEnabled = !event.alertEnabled;
            
            // Update UI
            const btn = document.querySelector(`[data-id="${eventId}"] .btn-alert`);
            if (btn) {
                btn.classList.toggle('active', event.alertEnabled);
            }
        }
    }
    
    showEventInfo(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal calendar-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${event.title}</h2>
                    <button onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p><strong>Type:</strong> ${event.category}</p>
                    <p><strong>Date/Time:</strong> ${event.datetime.toLocaleString()}</p>
                    <p><strong>Importance:</strong> ${event.importance}</p>
                    ${event.country ? `
                        <p><strong>Country:</strong> ${this.countries[event.country].name}</p>
                    ` : ''}
                    ${event.description ? `
                        <p><strong>Description:</strong> ${event.description}</p>
                    ` : ''}
                    ${this.renderEventDetails(event)}
                </div>
                <div class="modal-footer">
                    <button onclick="calendarModule.addToWatchlist('${event.id}')">
                        Add to Watchlist
                    </button>
                    <button onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    addToWatchlist(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event && event.symbol) {
            // Add symbol to watchlist
            console.log(`Adding ${event.symbol} to watchlist`);
            
            // Trigger event for other modules
            document.dispatchEvent(new CustomEvent('addToWatchlist', {
                detail: { symbol: event.symbol }
            }));
        }
    }
    
    startAutoRefresh() {
        // Refresh events every 5 minutes
        this.updateInterval = setInterval(() => {
            this.fetchEvents();
        }, 300000);
    }
    
    stopAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    // UI Initialization
    initializeUI() {
        this.initializeFilters();
        this.initializeSearch();
        this.initializeAlertSettings();
    }
    
    initializeFilters() {
        // Date range selector
        const dateRange = document.getElementById('calendar-date-range');
        if (dateRange) {
            dateRange.value = this.filters.dateRange;
            dateRange.addEventListener('change', (e) => {
                this.filters.dateRange = e.target.value;
                this.renderCalendar();
                this.savePreferences();
            });
        }
        
        // Importance checkboxes
        const importanceContainer = document.getElementById('calendar-importance');
        if (importanceContainer) {
            ['high', 'medium', 'low'].forEach(level => {
                const label = document.createElement('label');
                label.innerHTML = `
                    <input type="checkbox" value="${level}" 
                        ${this.filters.importance.includes(level) ? 'checked' : ''}>
                    ${level.charAt(0).toUpperCase() + level.slice(1)}
                `;
                
                label.querySelector('input').addEventListener('change', (e) => {
                    if (e.target.checked) {
                        if (!this.filters.importance.includes(level)) {
                            this.filters.importance.push(level);
                        }
                    } else {
                        this.filters.importance = this.filters.importance.filter(l => l !== level);
                    }
                    this.renderCalendar();
                    this.savePreferences();
                });
                
                importanceContainer.appendChild(label);
            });
        }
        
        // Category selector
        const categoryContainer = document.getElementById('calendar-categories');
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
                        if (!this.filters.categories.includes(category)) {
                            this.filters.categories.push(category);
                        }
                    } else {
                        this.filters.categories = this.filters.categories.filter(c => c !== category);
                    }
                    this.renderCalendar();
                    this.savePreferences();
                });
                
                categoryContainer.appendChild(label);
            });
        }
        
        // Country selector
        const countryContainer = document.getElementById('calendar-countries');
        if (countryContainer) {
            Object.entries(this.countries).forEach(([code, country]) => {
                const label = document.createElement('label');
                label.innerHTML = `
                    <input type="checkbox" value="${code}"
                        ${this.filters.countries.includes(code) ? 'checked' : ''}>
                    ${country.flag} ${country.name}
                `;
                
                label.querySelector('input').addEventListener('change', (e) => {
                    if (e.target.checked) {
                        if (!this.filters.countries.includes(code)) {
                            this.filters.countries.push(code);
                        }
                    } else {
                        this.filters.countries = this.filters.countries.filter(c => c !== code);
                    }
                    this.renderCalendar();
                    this.savePreferences();
                });
                
                countryContainer.appendChild(label);
            });
        }
    }
    
    initializeSearch() {
        const searchInput = document.getElementById('calendar-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.searchTerm = e.target.value;
                this.renderCalendar();
            });
        }
    }
    
    initializeAlertSettings() {
        // Alert toggle
        const alertToggle = document.getElementById('calendar-alerts-enabled');
        if (alertToggle) {
            alertToggle.checked = this.alertSettings.enabled;
            alertToggle.addEventListener('change', (e) => {
                this.alertSettings.enabled = e.target.checked;
                this.savePreferences();
            });
        }
        
        // Advance notice
        const advanceNotice = document.getElementById('calendar-advance-notice');
        if (advanceNotice) {
            advanceNotice.value = this.alertSettings.advanceNotice;
            advanceNotice.addEventListener('change', (e) => {
                this.alertSettings.advanceNotice = parseInt(e.target.value);
                this.savePreferences();
            });
        }
    }
    
    attachEventListeners() {
        // Add any additional event listeners after rendering
    }
    
    // Export functionality
    exportCalendar(format = 'ics') {
        const filtered = this.filterEvents();
        
        if (format === 'ics') {
            let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AuraQuant//Calendar//EN\n';
            
            filtered.forEach(event => {
                const start = event.datetime.toISOString().replace(/[-:]/g, '').replace('.000', '');
                const end = new Date(event.datetime.getTime() + 3600000).toISOString()
                    .replace(/[-:]/g, '').replace('.000', '');
                
                icsContent += 'BEGIN:VEVENT\n';
                icsContent += `DTSTART:${start}\n`;
                icsContent += `DTEND:${end}\n`;
                icsContent += `SUMMARY:${event.title}\n`;
                icsContent += `DESCRIPTION:${event.description || ''}\n`;
                icsContent += `UID:${event.id}@auraquant.com\n`;
                icsContent += 'END:VEVENT\n';
            });
            
            icsContent += 'END:VCALENDAR';
            
            const blob = new Blob([icsContent], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `calendar-export-${Date.now()}.ics`;
            a.click();
        }
    }
    
    // Preferences
    loadPreferences() {
        const saved = localStorage.getItem('calendarPreferences');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                this.filters = { ...this.filters, ...prefs.filters };
                this.alertSettings = { ...this.alertSettings, ...prefs.alertSettings };
            } catch (error) {
                console.error('Error loading calendar preferences:', error);
            }
        }
    }
    
    savePreferences() {
        const prefs = {
            filters: this.filters,
            alertSettings: this.alertSettings
        };
        
        localStorage.setItem('calendarPreferences', JSON.stringify(prefs));
    }
    
    // Public methods
    clearFilters() {
        this.filters = {
            importance: ['high', 'medium', 'low'],
            categories: [],
            countries: [],
            dateRange: 'week',
            searchTerm: ''
        };
        this.renderCalendar();
        this.savePreferences();
    }
    
    getUpcomingEvents(minutes = 60) {
        const now = new Date();
        const future = new Date(now.getTime() + minutes * 60000);
        
        return this.events.filter(event => 
            event.datetime > now && event.datetime <= future
        );
    }
    
    getEventsBySymbol(symbol) {
        return this.events.filter(event => 
            event.symbol === symbol
        );
    }
    
    // Cleanup
    destroy() {
        this.stopAutoRefresh();
        this.events = [];
    }
}

// Initialize on page load
let calendarModule;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        calendarModule = new CalendarModule();
        window.calendarModule = calendarModule;
    });
} else {
    calendarModule = new CalendarModule();
    window.calendarModule = calendarModule;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarModule;
}