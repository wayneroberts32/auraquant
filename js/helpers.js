/**
 * AuraQuant Helpers Module
 * Utility functions for formatting, calculations, validation, and data manipulation
 */

import Constants from './constants.js';

class Helpers {
    // ===========================
    // Number Formatting
    // ===========================

    /**
     * Format number as currency
     */
    static formatCurrency(value, currency = 'USD', locale = 'en-US') {
        if (value === null || value === undefined || isNaN(value)) return '$0.00';
        
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    /**
     * Format number with precision
     */
    static formatNumber(value, decimals = 2, locale = 'en-US') {
        if (value === null || value === undefined || isNaN(value)) return '0';
        
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }

    /**
     * Format large numbers with abbreviations (K, M, B, T)
     */
    static formatLargeNumber(value) {
        if (value === null || value === undefined || isNaN(value)) return '0';
        
        const absValue = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        
        if (absValue >= 1e12) return sign + (absValue / 1e12).toFixed(2) + 'T';
        if (absValue >= 1e9) return sign + (absValue / 1e9).toFixed(2) + 'B';
        if (absValue >= 1e6) return sign + (absValue / 1e6).toFixed(2) + 'M';
        if (absValue >= 1e3) return sign + (absValue / 1e3).toFixed(2) + 'K';
        
        return sign + absValue.toFixed(2);
    }

    /**
     * Format percentage with + or - sign
     */
    static formatPercent(value, decimals = 2, includeSign = true) {
        if (value === null || value === undefined || isNaN(value)) return '0.00%';
        
        const formatted = value.toFixed(decimals) + '%';
        if (includeSign && value > 0) {
            return '+' + formatted;
        }
        return formatted;
    }

    /**
     * Format crypto amount with appropriate decimals
     */
    static formatCrypto(value, symbol = 'BTC') {
        if (value === null || value === undefined || isNaN(value)) return '0';
        
        // Different cryptocurrencies need different decimal places
        const decimals = {
            'BTC': 8,
            'ETH': 6,
            'USDT': 2,
            'USDC': 2,
            'BNB': 4,
            'SOL': 4,
            'DOGE': 4,
            'SHIB': 0
        };
        
        const precision = decimals[symbol] || 8;
        return parseFloat(value).toFixed(precision);
    }

    /**
     * Format price based on value magnitude
     */
    static formatPrice(value) {
        if (value === null || value === undefined || isNaN(value)) return '0';
        
        const absValue = Math.abs(value);
        
        if (absValue >= 1000) return value.toFixed(2);
        if (absValue >= 1) return value.toFixed(4);
        if (absValue >= 0.01) return value.toFixed(6);
        return value.toFixed(8);
    }

    // ===========================
    // Date & Time Formatting
    // ===========================

    /**
     * Format date to locale string
     */
    static formatDate(date, format = 'full') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const formats = {
            full: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
            date: { year: 'numeric', month: '2-digit', day: '2-digit' },
            custom: { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        };
        
        return d.toLocaleString('en-US', formats[format] || formats.full);
    }

    /**
     * Format timestamp to relative time (e.g., "2 hours ago")
     */
    static formatRelativeTime(timestamp) {
        if (!timestamp) return '';
        
        const now = Date.now();
        const then = new Date(timestamp).getTime();
        const diff = now - then;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return days === 1 ? '1 day ago' : `${days} days ago`;
        if (hours > 0) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
        if (minutes > 0) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
        if (seconds > 0) return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
        return 'just now';
    }

    /**
     * Convert to AWST (Australian Western Standard Time)
     */
    static toAWST(date) {
        if (!date) date = new Date();
        
        const d = new Date(date);
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const awst = new Date(utc + (3600000 * 8)); // AWST is UTC+8
        
        return awst;
    }

    /**
     * Format duration in seconds to readable string
     */
    static formatDuration(seconds) {
        if (!seconds || seconds < 0) return '0s';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        
        return parts.join(' ');
    }

    /**
     * Get market session based on time
     */
    static getMarketSession(timezone = 'America/New_York') {
        const now = new Date();
        const options = { timeZone: timezone, hour12: false };
        const timeStr = now.toLocaleTimeString('en-US', options);
        const [hours, minutes] = timeStr.split(':').map(Number);
        const currentMinutes = hours * 60 + minutes;
        
        // NYSE hours (in ET)
        const preMarket = { start: 4 * 60, end: 9.5 * 60 };
        const regular = { start: 9.5 * 60, end: 16 * 60 };
        const afterHours = { start: 16 * 60, end: 20 * 60 };
        
        if (currentMinutes >= preMarket.start && currentMinutes < preMarket.end) {
            return { session: 'pre-market', icon: '🌅' };
        } else if (currentMinutes >= regular.start && currentMinutes < regular.end) {
            return { session: 'regular', icon: '☀️' };
        } else if (currentMinutes >= afterHours.start && currentMinutes < afterHours.end) {
            return { session: 'after-hours', icon: '🌆' };
        } else {
            return { session: 'closed', icon: '🌙' };
        }
    }

    // ===========================
    // Trading Calculations
    // ===========================

    /**
     * Calculate position size based on risk
     */
    static calculatePositionSize(accountBalance, riskPercent, entryPrice, stopLoss) {
        if (!accountBalance || !riskPercent || !entryPrice || !stopLoss) return 0;
        
        const riskAmount = accountBalance * (riskPercent / 100);
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        
        if (riskPerShare === 0) return 0;
        
        return Math.floor(riskAmount / riskPerShare);
    }

    /**
     * Calculate risk/reward ratio
     */
    static calculateRiskReward(entryPrice, stopLoss, takeProfit) {
        if (!entryPrice || !stopLoss || !takeProfit) return 0;
        
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = Math.abs(takeProfit - entryPrice);
        
        if (risk === 0) return 0;
        
        return (reward / risk).toFixed(2);
    }

    /**
     * Calculate profit/loss
     */
    static calculatePnL(entryPrice, exitPrice, quantity, side = 'long') {
        if (!entryPrice || !exitPrice || !quantity) return 0;
        
        if (side === 'long') {
            return (exitPrice - entryPrice) * quantity;
        } else {
            return (entryPrice - exitPrice) * quantity;
        }
    }

    /**
     * Calculate percentage change
     */
    static calculatePercentChange(oldValue, newValue) {
        if (!oldValue || oldValue === 0) return 0;
        return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
    }

    /**
     * Calculate moving average
     */
    static calculateMA(values, period) {
        if (!values || values.length < period) return null;
        
        const sum = values.slice(-period).reduce((a, b) => a + b, 0);
        return sum / period;
    }

    /**
     * Calculate RSI (Relative Strength Index)
     */
    static calculateRSI(prices, period = 14) {
        if (!prices || prices.length < period + 1) return null;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i <= period; i++) {
            const diff = prices[i] - prices[i - 1];
            if (diff > 0) {
                gains += diff;
            } else {
                losses -= diff;
            }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Calculate Bollinger Bands
     */
    static calculateBollingerBands(prices, period = 20, multiplier = 2) {
        if (!prices || prices.length < period) return null;
        
        const ma = this.calculateMA(prices, period);
        const squaredDiffs = prices.slice(-period).map(price => Math.pow(price - ma, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
        const stdDev = Math.sqrt(variance);
        
        return {
            upper: ma + (stdDev * multiplier),
            middle: ma,
            lower: ma - (stdDev * multiplier)
        };
    }

    /**
     * Calculate pip value for forex
     */
    static calculatePipValue(pair, lotSize = 100000, price) {
        const standardPairs = ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD'];
        const yenPairs = ['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY'];
        
        if (standardPairs.includes(pair)) {
            return (0.0001 * lotSize);
        } else if (yenPairs.includes(pair)) {
            return (0.01 * lotSize) / price;
        } else {
            // For other pairs, use standard calculation
            return (0.0001 * lotSize) / price;
        }
    }

    /**
     * Calculate margin requirement
     */
    static calculateMargin(price, quantity, leverage = 1) {
        if (!price || !quantity || !leverage) return 0;
        return (price * quantity) / leverage;
    }

    // ===========================
    // Data Validation
    // ===========================

    /**
     * Validate email address
     */
    static isValidEmail(email) {
        if (!email) return false;
        return Constants.REGEX.EMAIL.test(email);
    }

    /**
     * Validate phone number
     */
    static isValidPhone(phone) {
        if (!phone) return false;
        return Constants.REGEX.PHONE.test(phone);
    }

    /**
     * Validate trading symbol
     */
    static isValidSymbol(symbol, type = 'stock') {
        if (!symbol) return false;
        
        const patterns = Constants.VALIDATION.SYMBOL;
        
        switch (type.toLowerCase()) {
            case 'stock':
                return patterns.STOCK.test(symbol);
            case 'forex':
                return patterns.FOREX.test(symbol);
            case 'crypto':
                return patterns.CRYPTO.test(symbol);
            case 'option':
                return patterns.OPTION.test(symbol);
            default:
                return false;
        }
    }

    /**
     * Validate order parameters
     */
    static validateOrder(order) {
        const errors = [];
        
        if (!order.symbol) errors.push('Symbol is required');
        if (!order.quantity || order.quantity <= 0) errors.push('Invalid quantity');
        if (!order.side || !['buy', 'sell'].includes(order.side)) errors.push('Invalid side');
        if (!order.type) errors.push('Order type is required');
        
        if (order.type === 'limit' && !order.price) {
            errors.push('Price is required for limit orders');
        }
        
        if (order.type === 'stop' && !order.stopPrice) {
            errors.push('Stop price is required for stop orders');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate API key format
     */
    static isValidApiKey(key, provider) {
        if (!key || !provider) return false;
        
        const patterns = Constants.VALIDATION.API_KEYS;
        
        if (patterns[provider.toUpperCase()]) {
            return patterns[provider.toUpperCase()].test(key);
        }
        
        // Generic validation for unknown providers
        return key.length >= 20 && key.length <= 128;
    }

    /**
     * Validate password strength
     */
    static validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[@$!%*?&]/.test(password);
        
        const strength = {
            valid: false,
            score: 0,
            feedback: []
        };
        
        if (password.length < minLength) {
            strength.feedback.push(`Password must be at least ${minLength} characters`);
        } else {
            strength.score += 20;
        }
        
        if (!hasUpperCase) {
            strength.feedback.push('Include at least one uppercase letter');
        } else {
            strength.score += 20;
        }
        
        if (!hasLowerCase) {
            strength.feedback.push('Include at least one lowercase letter');
        } else {
            strength.score += 20;
        }
        
        if (!hasNumber) {
            strength.feedback.push('Include at least one number');
        } else {
            strength.score += 20;
        }
        
        if (!hasSpecialChar) {
            strength.feedback.push('Include at least one special character (@$!%*?&)');
        } else {
            strength.score += 20;
        }
        
        strength.valid = strength.score === 100;
        
        return strength;
    }

    // ===========================
    // Data Transformation
    // ===========================

    /**
     * Convert OHLC data to candlestick format
     */
    static toCandlestickData(data) {
        if (!data || !Array.isArray(data)) return [];
        
        return data.map(item => ({
            time: item.timestamp || item.time || item.date,
            open: parseFloat(item.open || item.o),
            high: parseFloat(item.high || item.h),
            low: parseFloat(item.low || item.l),
            close: parseFloat(item.close || item.c),
            volume: parseFloat(item.volume || item.v || 0)
        }));
    }

    /**
     * Group data by time period
     */
    static groupByPeriod(data, period = 'day') {
        if (!data || !Array.isArray(data)) return {};
        
        const grouped = {};
        
        data.forEach(item => {
            const date = new Date(item.timestamp || item.time || item.date);
            let key;
            
            switch (period) {
                case 'minute':
                    key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
                    break;
                case 'hour':
                    key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
                    break;
                case 'day':
                    key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                    break;
                case 'week':
                    const week = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
                    key = `${date.getFullYear()}-W${week}`;
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${date.getMonth()}`;
                    break;
                default:
                    key = date.toISOString();
            }
            
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
        });
        
        return grouped;
    }

    /**
     * Aggregate OHLCV data
     */
    static aggregateOHLCV(data) {
        if (!data || !Array.isArray(data) || data.length === 0) return null;
        
        const sorted = data.sort((a, b) => a.time - b.time);
        
        return {
            open: sorted[0].open,
            high: Math.max(...data.map(d => d.high)),
            low: Math.min(...data.map(d => d.low)),
            close: sorted[sorted.length - 1].close,
            volume: data.reduce((sum, d) => sum + d.volume, 0)
        };
    }

    /**
     * Convert timeframe string to milliseconds
     */
    static timeframeToMs(timeframe) {
        const tf = Constants.TIMEFRAMES[timeframe];
        return tf ? tf.seconds * 1000 : 60000; // Default to 1 minute
    }

    // ===========================
    // Array & Object Utilities
    // ===========================

    /**
     * Deep clone an object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        
        return cloned;
    }

    /**
     * Merge objects deeply
     */
    static deepMerge(target, source) {
        const output = Object.assign({}, target);
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }

    /**
     * Check if value is plain object
     */
    static isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Chunk array into smaller arrays
     */
    static chunkArray(array, size) {
        if (!array || !Array.isArray(array)) return [];
        
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        
        return chunks;
    }

    /**
     * Remove duplicates from array
     */
    static uniqueArray(array, key = null) {
        if (!array || !Array.isArray(array)) return [];
        
        if (key) {
            const seen = new Set();
            return array.filter(item => {
                const value = item[key];
                if (seen.has(value)) return false;
                seen.add(value);
                return true;
            });
        }
        
        return [...new Set(array)];
    }

    /**
     * Sort array of objects by key
     */
    static sortByKey(array, key, order = 'asc') {
        if (!array || !Array.isArray(array)) return [];
        
        return array.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (order === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }

    // ===========================
    // DOM Utilities
    // ===========================

    /**
     * Create DOM element with attributes
     */
    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on')) {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof HTMLElement) {
                element.appendChild(child);
            }
        });
        
        return element;
    }

    /**
     * Add/remove CSS classes conditionally
     */
    static toggleClass(element, className, condition) {
        if (!element || !className) return;
        
        if (condition) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }

    /**
     * Show notification toast
     */
    static showNotification(message, type = 'info', duration = 3000) {
        const notification = this.createElement('div', {
            className: `notification notification-${type}`,
            style: {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '15px 20px',
                borderRadius: '5px',
                zIndex: 10000,
                animation: 'slideIn 0.3s ease'
            }
        }, [message]);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // ===========================
    // Network & API Utilities
    // ===========================

    /**
     * Make API request with retry logic
     */
    static async fetchWithRetry(url, options = {}, maxRetries = 3) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx)
                if (error.message && error.message.includes('HTTP 4')) {
                    throw error;
                }
                
                // Wait before retrying (exponential backoff)
                if (i < maxRetries - 1) {
                    await this.sleep(Math.pow(2, i) * 1000);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Build URL with query parameters
     */
    static buildUrl(base, params = {}) {
        const url = new URL(base);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        });
        
        return url.toString();
    }

    /**
     * Parse query parameters from URL
     */
    static parseQueryParams(url) {
        const params = {};
        const searchParams = new URL(url).searchParams;
        
        searchParams.forEach((value, key) => {
            params[key] = value;
        });
        
        return params;
    }

    // ===========================
    // Performance Utilities
    // ===========================

    /**
     * Debounce function calls
     */
    static debounce(func, delay = 300) {
        let timeoutId;
        
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle function calls
     */
    static throttle(func, limit = 100) {
        let inThrottle;
        
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Memoize function results
     */
    static memoize(func) {
        const cache = new Map();
        
        return function (...args) {
            const key = JSON.stringify(args);
            
            if (cache.has(key)) {
                return cache.get(key);
            }
            
            const result = func.apply(this, args);
            cache.set(key, result);
            
            // Limit cache size
            if (cache.size > 100) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            
            return result;
        };
    }

    // ===========================
    // Storage Utilities
    // ===========================

    /**
     * Safe localStorage get with JSON parse
     */
    static getStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Safe localStorage set with JSON stringify
     */
    static setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    }

    /**
     * Get storage size in bytes
     */
    static getStorageSize() {
        let size = 0;
        
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                size += localStorage[key].length + key.length;
            }
        }
        
        return size;
    }

    /**
     * Clear old storage items
     */
    static cleanupStorage(daysOld = 30) {
        const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        
        Object.keys(localStorage).forEach(key => {
            try {
                const item = JSON.parse(localStorage.getItem(key));
                if (item && item.timestamp && item.timestamp < cutoff) {
                    localStorage.removeItem(key);
                }
            } catch {
                // Skip items that aren't JSON or don't have timestamp
            }
        });
    }

    // ===========================
    // Crypto & Security
    // ===========================

    /**
     * Generate UUID v4
     */
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Hash string using SHA-256
     */
    static async hashString(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Generate random string
     */
    static generateRandomString(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    /**
     * Encrypt sensitive data (basic)
     */
    static encrypt(text, key) {
        // Simple XOR encryption for demo - use proper encryption in production
        let encrypted = '';
        for (let i = 0; i < text.length; i++) {
            encrypted += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(encrypted);
    }

    /**
     * Decrypt sensitive data (basic)
     */
    static decrypt(encrypted, key) {
        // Simple XOR decryption for demo - use proper encryption in production
        const text = atob(encrypted);
        let decrypted = '';
        for (let i = 0; i < text.length; i++) {
            decrypted += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return decrypted;
    }

    // ===========================
    // Misc Utilities
    // ===========================

    /**
     * Sleep/delay function
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Copy text to clipboard
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                return true;
            } catch (err) {
                console.error('Failed to copy:', err);
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }

    /**
     * Download data as file
     */
    static downloadFile(data, filename, type = 'application/json') {
        const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Get browser info
     */
    static getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';
        
        if (ua.indexOf('Chrome') > -1) {
            browser = 'Chrome';
            version = ua.match(/Chrome\/(\d+)/)[1];
        } else if (ua.indexOf('Safari') > -1) {
            browser = 'Safari';
            version = ua.match(/Version\/(\d+)/)[1];
        } else if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
            version = ua.match(/Firefox\/(\d+)/)[1];
        } else if (ua.indexOf('Edge') > -1) {
            browser = 'Edge';
            version = ua.match(/Edge\/(\d+)/)[1];
        }
        
        return {
            browser,
            version,
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language,
            onLine: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled
        };
    }

    /**
     * Check if running on mobile device
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Get screen dimensions
     */
    static getScreenInfo() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelRatio: window.devicePixelRatio || 1,
            orientation: screen.orientation?.type || 'unknown'
        };
    }

    /**
     * Detect color scheme preference
     */
    static getColorScheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * Parse error for display
     */
    static parseError(error) {
        if (typeof error === 'string') {
            return error;
        }
        
        if (error.response?.data?.message) {
            return error.response.data.message;
        }
        
        if (error.message) {
            return error.message;
        }
        
        return 'An unknown error occurred';
    }

    /**
     * Validate and sanitize HTML
     */
    static sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }
}

// Export the Helpers class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Helpers;
} else {
    window.Helpers = Helpers;
}

export default Helpers;