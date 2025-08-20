/**
 * AuraQuant Timezone Module
 * Comprehensive timezone management for AWST and global markets
 * Handles market hours, DST, session overlaps, and time conversions
 */

class TimezoneModule {
    constructor() {
        // Default timezone (Perth, Australia - AWST)
        this.localTimezone = 'Australia/Perth';
        this.displayFormat = '24h'; // or '12h'
        this.autoUpdate = true;
        this.updateInterval = null;
        this.clockIntervals = new Map();
        
        // Major market timezones
        this.marketTimezones = {
            // Australian markets
            AWST: { zone: 'Australia/Perth', name: 'Perth (AWST)', offset: 8, dst: false },
            AEST: { zone: 'Australia/Sydney', name: 'Sydney (AEST)', offset: 10, dst: true },
            ACST: { zone: 'Australia/Adelaide', name: 'Adelaide (ACST)', offset: 9.5, dst: true },
            AEST_BNE: { zone: 'Australia/Brisbane', name: 'Brisbane (AEST)', offset: 10, dst: false },
            
            // Asian markets
            JST: { zone: 'Asia/Tokyo', name: 'Tokyo (JST)', offset: 9, dst: false },
            HKT: { zone: 'Asia/Hong_Kong', name: 'Hong Kong (HKT)', offset: 8, dst: false },
            SGT: { zone: 'Asia/Singapore', name: 'Singapore (SGT)', offset: 8, dst: false },
            CST_CN: { zone: 'Asia/Shanghai', name: 'Shanghai (CST)', offset: 8, dst: false },
            IST: { zone: 'Asia/Kolkata', name: 'Mumbai (IST)', offset: 5.5, dst: false },
            KST: { zone: 'Asia/Seoul', name: 'Seoul (KST)', offset: 9, dst: false },
            
            // European markets
            GMT: { zone: 'Europe/London', name: 'London (GMT/BST)', offset: 0, dst: true },
            CET: { zone: 'Europe/Frankfurt', name: 'Frankfurt (CET/CEST)', offset: 1, dst: true },
            EET: { zone: 'Europe/Athens', name: 'Athens (EET)', offset: 2, dst: true },
            MSK: { zone: 'Europe/Moscow', name: 'Moscow (MSK)', offset: 3, dst: false },
            
            // American markets
            EST: { zone: 'America/New_York', name: 'New York (EST/EDT)', offset: -5, dst: true },
            CST_US: { zone: 'America/Chicago', name: 'Chicago (CST/CDT)', offset: -6, dst: true },
            MST: { zone: 'America/Denver', name: 'Denver (MST/MDT)', offset: -7, dst: true },
            PST: { zone: 'America/Los_Angeles', name: 'Los Angeles (PST/PDT)', offset: -8, dst: true },
            
            // Other major markets
            NZST: { zone: 'Pacific/Auckland', name: 'Auckland (NZST)', offset: 12, dst: true },
            GST: { zone: 'Asia/Dubai', name: 'Dubai (GST)', offset: 4, dst: false },
            BRT: { zone: 'America/Sao_Paulo', name: 'São Paulo (BRT)', offset: -3, dst: true },
            JST_JAKARTA: { zone: 'Asia/Jakarta', name: 'Jakarta (WIB)', offset: 7, dst: false }
        };
        
        // Market trading hours (in local market time)
        this.marketHours = {
            ASX: { // Australian Securities Exchange
                timezone: 'Australia/Sydney',
                preMarket: { start: '07:00', end: '10:00' },
                regular: { start: '10:00', end: '16:00' },
                afterHours: { start: '16:00', end: '19:00' },
                days: [1, 2, 3, 4, 5], // Mon-Fri
                name: 'Australian Securities Exchange'
            },
            NYSE: { // New York Stock Exchange
                timezone: 'America/New_York',
                preMarket: { start: '04:00', end: '09:30' },
                regular: { start: '09:30', end: '16:00' },
                afterHours: { start: '16:00', end: '20:00' },
                days: [1, 2, 3, 4, 5],
                name: 'New York Stock Exchange'
            },
            NASDAQ: { // NASDAQ
                timezone: 'America/New_York',
                preMarket: { start: '04:00', end: '09:30' },
                regular: { start: '09:30', end: '16:00' },
                afterHours: { start: '16:00', end: '20:00' },
                days: [1, 2, 3, 4, 5],
                name: 'NASDAQ'
            },
            LSE: { // London Stock Exchange
                timezone: 'Europe/London',
                preMarket: { start: '05:30', end: '08:00' },
                regular: { start: '08:00', end: '16:30' },
                afterHours: { start: '16:30', end: '20:00' },
                days: [1, 2, 3, 4, 5],
                name: 'London Stock Exchange'
            },
            TSE: { // Tokyo Stock Exchange
                timezone: 'Asia/Tokyo',
                morning: { start: '09:00', end: '11:30' },
                lunch: { start: '11:30', end: '12:30' },
                afternoon: { start: '12:30', end: '15:00' },
                days: [1, 2, 3, 4, 5],
                name: 'Tokyo Stock Exchange'
            },
            HKEX: { // Hong Kong Exchange
                timezone: 'Asia/Hong_Kong',
                morning: { start: '09:30', end: '12:00' },
                lunch: { start: '12:00', end: '13:00' },
                afternoon: { start: '13:00', end: '16:00' },
                afterHours: { start: '17:15', end: '03:00' }, // Night session
                days: [1, 2, 3, 4, 5],
                name: 'Hong Kong Exchange'
            },
            SSE: { // Shanghai Stock Exchange
                timezone: 'Asia/Shanghai',
                morning: { start: '09:30', end: '11:30' },
                lunch: { start: '11:30', end: '13:00' },
                afternoon: { start: '13:00', end: '15:00' },
                days: [1, 2, 3, 4, 5],
                name: 'Shanghai Stock Exchange'
            },
            SGX: { // Singapore Exchange
                timezone: 'Asia/Singapore',
                preMarket: { start: '08:30', end: '09:00' },
                regular: { start: '09:00', end: '17:00' },
                afterHours: { start: '18:00', end: '23:00' },
                days: [1, 2, 3, 4, 5],
                name: 'Singapore Exchange'
            },
            NSE: { // National Stock Exchange of India
                timezone: 'Asia/Kolkata',
                preMarket: { start: '09:00', end: '09:15' },
                regular: { start: '09:15', end: '15:30' },
                days: [1, 2, 3, 4, 5],
                name: 'NSE India'
            },
            FOREX: { // 24/5 Forex Market
                timezone: 'UTC',
                regular: { start: '00:00', end: '23:59' },
                days: [0, 1, 2, 3, 4], // Sun-Thu (closes Friday evening)
                sessions: {
                    sydney: {
                        timezone: 'Australia/Sydney',
                        start: '22:00',
                        end: '07:00',
                        name: 'Sydney Session'
                    },
                    tokyo: {
                        timezone: 'Asia/Tokyo',
                        start: '00:00',
                        end: '09:00',
                        name: 'Tokyo Session'
                    },
                    london: {
                        timezone: 'Europe/London',
                        start: '08:00',
                        end: '17:00',
                        name: 'London Session'
                    },
                    newyork: {
                        timezone: 'America/New_York',
                        start: '13:00',
                        end: '22:00',
                        name: 'New York Session'
                    }
                },
                name: 'Forex Market'
            },
            CRYPTO: { // 24/7 Crypto Markets
                timezone: 'UTC',
                regular: { start: '00:00', end: '23:59' },
                days: [0, 1, 2, 3, 4, 5, 6], // All days
                name: 'Cryptocurrency Market'
            }
        };
        
        // Market holidays (simplified - should be fetched from API)
        this.holidays = {
            US: [],
            AU: [],
            UK: [],
            JP: [],
            HK: [],
            CN: [],
            SG: [],
            IN: []
        };
        
        // FX session overlaps for best trading times
        this.sessionOverlaps = [
            { sessions: ['Tokyo', 'London'], time: '08:00-09:00 GMT', volatility: 'Medium' },
            { sessions: ['London', 'New York'], time: '13:00-17:00 GMT', volatility: 'High' },
            { sessions: ['Sydney', 'Tokyo'], time: '00:00-07:00 GMT', volatility: 'Low-Medium' }
        ];
        
        this.init();
    }
    
    init() {
        console.log('🌍 Initializing Timezone Module...');
        
        // Load user preferences
        this.loadPreferences();
        
        // Initialize UI components
        this.initializeUI();
        
        // Start clocks
        this.startClocks();
        
        // Update market status
        this.updateMarketStatus();
        
        // Set up auto-update
        if (this.autoUpdate) {
            this.startAutoUpdate();
        }
        
        console.log('✅ Timezone Module initialized');
    }
    
    // Get current time in specified timezone
    getCurrentTime(timezone = this.localTimezone) {
        try {
            const now = new Date();
            const options = {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: this.displayFormat === '12h'
            };
            
            return now.toLocaleString('en-US', options);
        } catch (error) {
            console.error(`Error getting time for ${timezone}:`, error);
            return new Date().toLocaleString();
        }
    }
    
    // Convert time between timezones
    convertTime(time, fromZone, toZone) {
        try {
            // Parse the input time
            const date = new Date(time);
            
            // Get the time in the target timezone
            const options = {
                timeZone: toZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: this.displayFormat === '12h'
            };
            
            return {
                formatted: date.toLocaleString('en-US', options),
                date: date,
                timestamp: date.getTime()
            };
        } catch (error) {
            console.error('Error converting time:', error);
            return null;
        }
    }
    
    // Get timezone offset in hours
    getTimezoneOffset(timezone, date = new Date()) {
        try {
            // Get UTC time
            const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
            // Get timezone time
            const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
            // Calculate offset in hours
            return (tzDate - utcDate) / 3600000;
        } catch (error) {
            console.error(`Error getting offset for ${timezone}:`, error);
            return 0;
        }
    }
    
    // Check if market is open
    isMarketOpen(market) {
        const marketInfo = this.marketHours[market];
        if (!marketInfo) return false;
        
        const now = new Date();
        const marketTime = new Date(now.toLocaleString('en-US', { timeZone: marketInfo.timezone }));
        
        const dayOfWeek = marketTime.getDay();
        const currentTime = marketTime.getHours() * 60 + marketTime.getMinutes();
        
        // Check if it's a trading day
        if (!marketInfo.days.includes(dayOfWeek)) return false;
        
        // Check if it's a holiday
        if (this.isHoliday(market, marketTime)) return false;
        
        // Check different sessions
        if (marketInfo.regular) {
            const [startHour, startMin] = marketInfo.regular.start.split(':').map(Number);
            const [endHour, endMin] = marketInfo.regular.end.split(':').map(Number);
            
            const sessionStart = startHour * 60 + startMin;
            const sessionEnd = endHour * 60 + endMin;
            
            if (currentTime >= sessionStart && currentTime < sessionEnd) {
                // Check for lunch break
                if (marketInfo.lunch) {
                    const [lunchStartHour, lunchStartMin] = marketInfo.lunch.start.split(':').map(Number);
                    const [lunchEndHour, lunchEndMin] = marketInfo.lunch.end.split(':').map(Number);
                    
                    const lunchStart = lunchStartHour * 60 + lunchStartMin;
                    const lunchEnd = lunchEndHour * 60 + lunchEndMin;
                    
                    if (currentTime >= lunchStart && currentTime < lunchEnd) {
                        return false; // Market is on lunch break
                    }
                }
                return true;
            }
        }
        
        // Check morning/afternoon sessions for Asian markets
        if (marketInfo.morning && marketInfo.afternoon) {
            const [morningStartHour, morningStartMin] = marketInfo.morning.start.split(':').map(Number);
            const [morningEndHour, morningEndMin] = marketInfo.morning.end.split(':').map(Number);
            const [afternoonStartHour, afternoonStartMin] = marketInfo.afternoon.start.split(':').map(Number);
            const [afternoonEndHour, afternoonEndMin] = marketInfo.afternoon.end.split(':').map(Number);
            
            const morningStart = morningStartHour * 60 + morningStartMin;
            const morningEnd = morningEndHour * 60 + morningEndMin;
            const afternoonStart = afternoonStartHour * 60 + afternoonStartMin;
            const afternoonEnd = afternoonEndHour * 60 + afternoonEndMin;
            
            if ((currentTime >= morningStart && currentTime < morningEnd) ||
                (currentTime >= afternoonStart && currentTime < afternoonEnd)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Get market session status
    getMarketSession(market) {
        const marketInfo = this.marketHours[market];
        if (!marketInfo) return 'Unknown';
        
        const now = new Date();
        const marketTime = new Date(now.toLocaleString('en-US', { timeZone: marketInfo.timezone }));
        const currentTime = marketTime.getHours() * 60 + marketTime.getMinutes();
        
        // Check if market is closed
        if (!this.isMarketOpen(market)) {
            // Check pre-market
            if (marketInfo.preMarket) {
                const [startHour, startMin] = marketInfo.preMarket.start.split(':').map(Number);
                const [endHour, endMin] = marketInfo.preMarket.end.split(':').map(Number);
                
                const preStart = startHour * 60 + startMin;
                const preEnd = endHour * 60 + endMin;
                
                if (currentTime >= preStart && currentTime < preEnd) {
                    return 'Pre-Market';
                }
            }
            
            // Check after-hours
            if (marketInfo.afterHours) {
                const [startHour, startMin] = marketInfo.afterHours.start.split(':').map(Number);
                const [endHour, endMin] = marketInfo.afterHours.end.split(':').map(Number);
                
                const afterStart = startHour * 60 + startMin;
                const afterEnd = endHour * 60 + endMin;
                
                // Handle after-hours that cross midnight
                if (afterEnd < afterStart) {
                    if (currentTime >= afterStart || currentTime < afterEnd) {
                        return 'After-Hours';
                    }
                } else {
                    if (currentTime >= afterStart && currentTime < afterEnd) {
                        return 'After-Hours';
                    }
                }
            }
            
            // Check lunch break
            if (marketInfo.lunch) {
                const [startHour, startMin] = marketInfo.lunch.start.split(':').map(Number);
                const [endHour, endMin] = marketInfo.lunch.end.split(':').map(Number);
                
                const lunchStart = startHour * 60 + startMin;
                const lunchEnd = endHour * 60 + endMin;
                
                if (currentTime >= lunchStart && currentTime < lunchEnd) {
                    return 'Lunch Break';
                }
            }
            
            return 'Closed';
        }
        
        return 'Open';
    }
    
    // Get time until market opens/closes
    getTimeUntilMarketEvent(market) {
        const marketInfo = this.marketHours[market];
        if (!marketInfo) return null;
        
        const now = new Date();
        const marketTime = new Date(now.toLocaleString('en-US', { timeZone: marketInfo.timezone }));
        const currentTime = marketTime.getHours() * 60 + marketTime.getMinutes();
        
        let nextEvent = null;
        let eventType = '';
        
        if (this.isMarketOpen(market)) {
            // Find next close
            if (marketInfo.regular) {
                const [endHour, endMin] = marketInfo.regular.end.split(':').map(Number);
                const closeTime = endHour * 60 + endMin;
                
                if (currentTime < closeTime) {
                    nextEvent = closeTime - currentTime;
                    eventType = 'closes';
                }
            } else if (marketInfo.afternoon) {
                const [endHour, endMin] = marketInfo.afternoon.end.split(':').map(Number);
                const closeTime = endHour * 60 + endMin;
                
                if (currentTime < closeTime) {
                    nextEvent = closeTime - currentTime;
                    eventType = 'closes';
                }
            }
        } else {
            // Find next open
            if (marketInfo.regular) {
                const [startHour, startMin] = marketInfo.regular.start.split(':').map(Number);
                const openTime = startHour * 60 + startMin;
                
                if (currentTime < openTime) {
                    nextEvent = openTime - currentTime;
                    eventType = 'opens';
                } else {
                    // Next day
                    nextEvent = (24 * 60 - currentTime) + openTime;
                    eventType = 'opens';
                }
            } else if (marketInfo.morning) {
                const [startHour, startMin] = marketInfo.morning.start.split(':').map(Number);
                const openTime = startHour * 60 + startMin;
                
                if (currentTime < openTime) {
                    nextEvent = openTime - currentTime;
                    eventType = 'opens';
                } else {
                    // Next day
                    nextEvent = (24 * 60 - currentTime) + openTime;
                    eventType = 'opens';
                }
            }
        }
        
        if (nextEvent !== null) {
            const hours = Math.floor(nextEvent / 60);
            const minutes = nextEvent % 60;
            
            return {
                hours,
                minutes,
                total: nextEvent,
                event: eventType,
                formatted: `${hours}h ${minutes}m`
            };
        }
        
        return null;
    }
    
    // Check if it's a holiday
    isHoliday(market, date = new Date()) {
        const dateStr = date.toISOString().split('T')[0];
        
        // Map markets to holiday calendars
        const calendarMap = {
            NYSE: 'US',
            NASDAQ: 'US',
            ASX: 'AU',
            LSE: 'UK',
            TSE: 'JP',
            HKEX: 'HK',
            SSE: 'CN',
            SGX: 'SG',
            NSE: 'IN'
        };
        
        const calendar = calendarMap[market];
        if (!calendar) return false;
        
        return this.holidays[calendar]?.includes(dateStr) || false;
    }
    
    // Get Forex session status
    getForexSessions() {
        const sessions = [];
        const now = new Date();
        
        if (this.marketHours.FOREX && this.marketHours.FOREX.sessions) {
            for (const [key, session] of Object.entries(this.marketHours.FOREX.sessions)) {
                const sessionTime = new Date(now.toLocaleString('en-US', { timeZone: session.timezone }));
                const currentTime = sessionTime.getHours() * 60 + sessionTime.getMinutes();
                
                const [startHour, startMin] = session.start.split(':').map(Number);
                const [endHour, endMin] = session.end.split(':').map(Number);
                
                const sessionStart = startHour * 60 + startMin;
                const sessionEnd = endHour * 60 + endMin;
                
                let isActive = false;
                
                // Handle sessions that cross midnight
                if (sessionEnd < sessionStart) {
                    isActive = currentTime >= sessionStart || currentTime < sessionEnd;
                } else {
                    isActive = currentTime >= sessionStart && currentTime < sessionEnd;
                }
                
                sessions.push({
                    name: session.name,
                    active: isActive,
                    timezone: session.timezone,
                    hours: `${session.start} - ${session.end}`
                });
            }
        }
        
        return sessions;
    }
    
    // Get session overlaps
    getSessionOverlaps() {
        const overlaps = [];
        const forexSessions = this.getForexSessions();
        
        // Check which sessions are currently active
        const activeSessions = forexSessions.filter(s => s.active).map(s => s.name.split(' ')[0]);
        
        // Find overlaps
        for (const overlap of this.sessionOverlaps) {
            const isActive = overlap.sessions.every(session => 
                activeSessions.some(active => active.toLowerCase().includes(session.toLowerCase()))
            );
            
            overlaps.push({
                ...overlap,
                active: isActive
            });
        }
        
        return overlaps;
    }
    
    // Convert market time to local time
    marketTimeToLocal(market, time) {
        const marketInfo = this.marketHours[market];
        if (!marketInfo) return null;
        
        return this.convertTime(time, marketInfo.timezone, this.localTimezone);
    }
    
    // Get all market times for a specific time
    getAllMarketTimes(localTime = new Date()) {
        const times = {};
        
        for (const [code, info] of Object.entries(this.marketTimezones)) {
            times[code] = {
                name: info.name,
                time: this.formatDateTime(localTime, info.zone, 'full')
            };
        }
        
        return times;
    }
    
    // Format date/time for display
    formatDateTime(date, timezone = this.localTimezone, format = 'full') {
        const options = {
            timeZone: timezone,
            hour12: this.displayFormat === '12h'
        };
        
        switch (format) {
            case 'full':
                Object.assign(options, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                });
                break;
            case 'date':
                Object.assign(options, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                break;
            case 'time':
                Object.assign(options, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                break;
            case 'short':
                Object.assign(options, {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                break;
        }
        
        return date.toLocaleString('en-US', options);
    }
    
    // Start clock displays
    startClocks() {
        const clockContainer = document.getElementById('timezone-clocks');
        if (!clockContainer) return;
        
        // Clear existing clocks
        clockContainer.innerHTML = '';
        this.clockIntervals.forEach(interval => clearInterval(interval));
        this.clockIntervals.clear();
        
        // Add clocks for major markets
        const majorMarkets = ['AWST', 'AEST', 'JST', 'HKT', 'GMT', 'EST'];
        
        majorMarkets.forEach(market => {
            const marketInfo = this.marketTimezones[market];
            if (!marketInfo) return;
            
            const clockDiv = document.createElement('div');
            clockDiv.className = 'market-clock';
            clockDiv.id = `clock-${market}`;
            clockDiv.innerHTML = `
                <div class="clock-label">${marketInfo.name}</div>
                <div class="clock-time">--:--:--</div>
                <div class="clock-date">--</div>
            `;
            
            clockContainer.appendChild(clockDiv);
            
            // Start updating this clock
            this.updateClock(market);
            const interval = setInterval(() => this.updateClock(market), 1000);
            this.clockIntervals.set(market, interval);
        });
    }
    
    // Update individual clock
    updateClock(market) {
        const marketInfo = this.marketTimezones[market];
        if (!marketInfo) return;
        
        const clockDiv = document.getElementById(`clock-${market}`);
        if (!clockDiv) return;
        
        const now = new Date();
        const timeDiv = clockDiv.querySelector('.clock-time');
        const dateDiv = clockDiv.querySelector('.clock-date');
        
        if (timeDiv) {
            timeDiv.textContent = this.formatDateTime(now, marketInfo.zone, 'time');
        }
        
        if (dateDiv) {
            dateDiv.textContent = this.formatDateTime(now, marketInfo.zone, 'date');
        }
    }
    
    // Update market status displays
    updateMarketStatus() {
        const statusContainer = document.getElementById('market-status');
        if (!statusContainer) return;
        
        const markets = ['ASX', 'NYSE', 'NASDAQ', 'LSE', 'TSE', 'HKEX', 'FOREX', 'CRYPTO'];
        const statuses = [];
        
        markets.forEach(market => {
            const isOpen = this.isMarketOpen(market);
            const session = this.getMarketSession(market);
            const timeUntil = this.getTimeUntilMarketEvent(market);
            
            statuses.push({
                market,
                name: this.marketHours[market]?.name || market,
                isOpen,
                session,
                timeUntil: timeUntil?.formatted || 'N/A',
                nextEvent: timeUntil?.event || ''
            });
        });
        
        // Update UI
        statusContainer.innerHTML = statuses.map(status => `
            <div class="market-status-item ${status.isOpen ? 'open' : 'closed'}">
                <div class="market-name">${status.market}</div>
                <div class="market-full-name">${status.name}</div>
                <div class="market-session ${status.session.toLowerCase().replace(/[\s-]/g, '-')}">
                    ${status.session}
                </div>
                ${status.timeUntil !== 'N/A' ? 
                    `<div class="market-timer">
                        <span class="timer-label">${status.nextEvent}</span>
                        <span class="timer-value">${status.timeUntil}</span>
                    </div>` : 
                    ''
                }
            </div>
        `).join('');
        
        // Update Forex sessions
        const forexContainer = document.getElementById('forex-sessions');
        if (forexContainer) {
            const forexSessions = this.getForexSessions();
            forexContainer.innerHTML = forexSessions.map(session => `
                <div class="forex-session ${session.active ? 'active' : 'inactive'}">
                    <div class="session-name">${session.name}</div>
                    <div class="session-hours">${session.hours}</div>
                    <div class="session-status">${session.active ? '🟢 Active' : '⚫ Inactive'}</div>
                </div>
            `).join('');
        }
    }
    
    // Start auto-update
    startAutoUpdate() {
        // Update every minute
        this.updateInterval = setInterval(() => {
            this.updateMarketStatus();
        }, 60000);
    }
    
    // Stop auto-update
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    // Set local timezone
    setLocalTimezone(timezone) {
        if (this.marketTimezones[timezone]) {
            this.localTimezone = this.marketTimezones[timezone].zone;
        } else {
            // Try to use it directly
            try {
                // Test if timezone is valid
                new Date().toLocaleString('en-US', { timeZone: timezone });
                this.localTimezone = timezone;
            } catch (error) {
                console.error('Invalid timezone:', timezone);
                return false;
            }
        }
        
        this.savePreferences();
        this.startClocks();
        this.updateMarketStatus();
        
        // Dispatch event for other modules
        document.dispatchEvent(new CustomEvent('timezoneChanged', {
            detail: { timezone: this.localTimezone }
        }));
        
        return true;
    }
    
    // Toggle time format
    toggleTimeFormat() {
        this.displayFormat = this.displayFormat === '24h' ? '12h' : '24h';
        this.savePreferences();
        this.startClocks();
        this.updateMarketStatus();
    }
    
    // Initialize UI
    initializeUI() {
        // Timezone selector
        const timezoneSelector = document.getElementById('timezone-selector');
        if (timezoneSelector) {
            // Populate options
            for (const [code, info] of Object.entries(this.marketTimezones)) {
                const option = document.createElement('option');
                option.value = info.zone;
                option.textContent = info.name;
                if (info.zone === this.localTimezone) {
                    option.selected = true;
                }
                timezoneSelector.appendChild(option);
            }
            
            timezoneSelector.addEventListener('change', (e) => {
                this.setLocalTimezone(e.target.value);
            });
        }
        
        // Time format toggle
        const formatToggle = document.getElementById('time-format-toggle');
        if (formatToggle) {
            formatToggle.textContent = this.displayFormat === '24h' ? '24H' : '12H';
            formatToggle.addEventListener('click', () => {
                this.toggleTimeFormat();
                formatToggle.textContent = this.displayFormat === '24h' ? '24H' : '12H';
            });
        }
        
        // Auto-update toggle
        const autoUpdateToggle = document.getElementById('auto-update-toggle');
        if (autoUpdateToggle) {
            autoUpdateToggle.checked = this.autoUpdate;
            autoUpdateToggle.addEventListener('change', (e) => {
                this.autoUpdate = e.target.checked;
                if (this.autoUpdate) {
                    this.startAutoUpdate();
                } else {
                    this.stopAutoUpdate();
                }
                this.savePreferences();
            });
        }
    }
    
    // Load user preferences
    loadPreferences() {
        const saved = localStorage.getItem('timezonePreferences');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                this.localTimezone = prefs.localTimezone || this.localTimezone;
                this.displayFormat = prefs.displayFormat || this.displayFormat;
                this.autoUpdate = prefs.autoUpdate !== undefined ? prefs.autoUpdate : this.autoUpdate;
            } catch (error) {
                console.error('Error loading timezone preferences:', error);
            }
        }
    }
    
    // Save user preferences
    savePreferences() {
        const prefs = {
            localTimezone: this.localTimezone,
            displayFormat: this.displayFormat,
            autoUpdate: this.autoUpdate
        };
        
        localStorage.setItem('timezonePreferences', JSON.stringify(prefs));
    }
    
    // Get market countdown timers
    getMarketCountdowns() {
        const countdowns = [];
        const markets = ['ASX', 'NYSE', 'LSE', 'TSE', 'HKEX'];
        
        for (const market of markets) {
            const timeUntil = this.getTimeUntilMarketEvent(market);
            if (timeUntil) {
                countdowns.push({
                    market,
                    name: this.marketHours[market]?.name || market,
                    event: timeUntil.event,
                    time: timeUntil.formatted
                });
            }
        }
        
        return countdowns.sort((a, b) => a.time.localeCompare(b.time));
    }
    
    // Calculate trading hours overlap
    getTradingOverlap(market1, market2) {
        const info1 = this.marketHours[market1];
        const info2 = this.marketHours[market2];
        
        if (!info1 || !info2) return null;
        
        // This would require complex calculation considering timezones
        // Simplified version for demonstration
        return {
            hasOverlap: false,
            overlapHours: 0
        };
    }
    
    // Get best trading times based on volatility
    getBestTradingTimes() {
        const times = [];
        const overlaps = this.getSessionOverlaps();
        
        for (const overlap of overlaps) {
            times.push({
                time: overlap.time,
                sessions: overlap.sessions.join(' & '),
                volatility: overlap.volatility,
                active: overlap.active
            });
        }
        
        return times;
    }
    
    // Clean up intervals
    destroy() {
        this.stopAutoUpdate();
        this.clockIntervals.forEach(interval => clearInterval(interval));
        this.clockIntervals.clear();
    }
}

// Initialize on page load
let timezoneModule;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        timezoneModule = new TimezoneModule();
        window.timezoneModule = timezoneModule;
    });
} else {
    timezoneModule = new TimezoneModule();
    window.timezoneModule = timezoneModule;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimezoneModule;
}