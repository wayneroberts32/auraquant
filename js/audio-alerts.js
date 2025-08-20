/**
 * AuraQuant Audio Alerts Module
 * Professional trading platform audio notification system
 * Supports multiple alert types, priorities, custom sounds, and quiet hours
 */

class AudioAlertsModule {
    constructor() {
        this.enabled = true;
        this.volume = 0.7;
        this.quietHours = { enabled: false, start: '22:00', end: '08:00' };
        this.audioContext = null;
        this.sounds = new Map();
        this.queue = [];
        this.isPlaying = false;
        this.lastAlertTime = {};
        this.alertCooldown = {};
        this.userPreferences = {};
        
        // Alert priorities (higher = more important)
        this.priorities = {
            CRITICAL: 5,    // System errors, emergency stops
            HIGH: 4,        // Trade fills, stop losses hit
            MEDIUM: 3,      // Signal triggers, price alerts
            LOW: 2,         // News updates, minor notifications
            INFO: 1         // General information
        };
        
        // Default sound library
        this.soundLibrary = {
            // Critical alerts
            emergency: { file: 'assets/sounds/emergency.mp3', priority: 5, volume: 1.0 },
            systemError: { file: 'assets/sounds/error.mp3', priority: 5, volume: 0.9 },
            
            // Trading alerts
            orderFilled: { file: 'assets/sounds/order-filled.mp3', priority: 4, volume: 0.8 },
            stopLoss: { file: 'assets/sounds/stop-loss.mp3', priority: 4, volume: 0.9 },
            takeProfit: { file: 'assets/sounds/take-profit.mp3', priority: 4, volume: 0.8 },
            positionOpened: { file: 'assets/sounds/position-open.mp3', priority: 3, volume: 0.7 },
            positionClosed: { file: 'assets/sounds/position-close.mp3', priority: 3, volume: 0.7 },
            
            // Market alerts
            priceAlert: { file: 'assets/sounds/price-alert.mp3', priority: 3, volume: 0.7 },
            volumeSpike: { file: 'assets/sounds/volume-spike.mp3', priority: 3, volume: 0.6 },
            breakout: { file: 'assets/sounds/breakout.mp3', priority: 4, volume: 0.8 },
            momentum: { file: 'assets/sounds/momentum.mp3', priority: 3, volume: 0.6 },
            
            // Scanner alerts
            scannerHit: { file: 'assets/sounds/scanner-hit.mp3', priority: 3, volume: 0.7 },
            gapUp: { file: 'assets/sounds/gap-up.mp3', priority: 3, volume: 0.7 },
            gapDown: { file: 'assets/sounds/gap-down.mp3', priority: 3, volume: 0.7 },
            haltResume: { file: 'assets/sounds/halt-resume.mp3', priority: 4, volume: 0.8 },
            
            // Bot alerts
            botStarted: { file: 'assets/sounds/bot-start.mp3', priority: 2, volume: 0.5 },
            botStopped: { file: 'assets/sounds/bot-stop.mp3', priority: 2, volume: 0.5 },
            botError: { file: 'assets/sounds/bot-error.mp3', priority: 4, volume: 0.8 },
            
            // News & social
            newsBreaking: { file: 'assets/sounds/breaking-news.mp3', priority: 3, volume: 0.7 },
            newsAlert: { file: 'assets/sounds/news.mp3', priority: 2, volume: 0.5 },
            socialMention: { file: 'assets/sounds/social.mp3', priority: 2, volume: 0.4 },
            
            // System notifications
            connection: { file: 'assets/sounds/connection.mp3', priority: 2, volume: 0.4 },
            disconnection: { file: 'assets/sounds/disconnection.mp3', priority: 3, volume: 0.6 },
            message: { file: 'assets/sounds/message.mp3', priority: 1, volume: 0.3 },
            success: { file: 'assets/sounds/success.mp3', priority: 2, volume: 0.5 },
            warning: { file: 'assets/sounds/warning.mp3', priority: 3, volume: 0.6 },
            
            // Custom tones
            bell: { file: 'assets/sounds/bell.mp3', priority: 2, volume: 0.5 },
            chime: { file: 'assets/sounds/chime.mp3', priority: 2, volume: 0.4 },
            ding: { file: 'assets/sounds/ding.mp3', priority: 2, volume: 0.4 },
            pop: { file: 'assets/sounds/pop.mp3', priority: 1, volume: 0.3 }
        };
        
        // Synthesized backup sounds
        this.synthSounds = {
            beep: { frequency: 800, duration: 200, type: 'sine' },
            alert: { frequency: 1000, duration: 300, type: 'square' },
            warning: { frequency: 600, duration: 400, type: 'sawtooth' },
            error: { frequency: 400, duration: 500, type: 'triangle' },
            success: { frequency: 1200, duration: 150, type: 'sine' }
        };
        
        this.init();
    }
    
    async init() {
        console.log('🔊 Initializing Audio Alerts Module...');
        
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Load user preferences
        this.loadPreferences();
        
        // Preload all sounds
        await this.preloadSounds();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize UI controls
        this.initializeUI();
        
        console.log('✅ Audio Alerts Module initialized');
    }
    
    async preloadSounds() {
        console.log('Loading audio files...');
        const loadPromises = [];
        
        for (const [name, config] of Object.entries(this.soundLibrary)) {
            loadPromises.push(this.loadSound(name, config.file));
        }
        
        try {
            await Promise.all(loadPromises);
            console.log(`✅ Loaded ${loadPromises.length} audio files`);
        } catch (error) {
            console.error('Error loading audio files:', error);
            // Fall back to synthesized sounds
            this.useSynthesizedSounds = true;
        }
    }
    
    async loadSound(name, url) {
        try {
            const audio = new Audio(url);
            audio.preload = 'auto';
            
            return new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', () => {
                    this.sounds.set(name, audio);
                    resolve();
                }, { once: true });
                
                audio.addEventListener('error', (e) => {
                    console.warn(`Failed to load ${name}: ${url}`);
                    reject(e);
                }, { once: true });
                
                // Trigger load
                audio.load();
            });
        } catch (error) {
            console.error(`Error loading sound ${name}:`, error);
        }
    }
    
    play(alertType, options = {}) {
        // Check if alerts are enabled
        if (!this.enabled) return;
        
        // Check quiet hours
        if (this.isQuietHours()) {
            console.log('🔇 Alert suppressed during quiet hours');
            return;
        }
        
        // Check cooldown
        if (this.isOnCooldown(alertType)) {
            console.log(`⏳ Alert ${alertType} on cooldown`);
            return;
        }
        
        // Get alert configuration
        const config = this.soundLibrary[alertType] || this.soundLibrary.message;
        const priority = options.priority || config.priority || this.priorities.LOW;
        const volume = options.volume || config.volume || this.volume;
        
        // Add to queue
        this.queue.push({
            type: alertType,
            priority,
            volume,
            timestamp: Date.now(),
            message: options.message,
            repeat: options.repeat || 1,
            delay: options.delay || 0
        });
        
        // Sort queue by priority
        this.queue.sort((a, b) => b.priority - a.priority);
        
        // Process queue
        this.processQueue();
    }
    
    async processQueue() {
        if (this.isPlaying || this.queue.length === 0) return;
        
        this.isPlaying = true;
        const alert = this.queue.shift();
        
        // Wait for delay if specified
        if (alert.delay > 0) {
            await this.sleep(alert.delay);
        }
        
        // Play the alert
        for (let i = 0; i < alert.repeat; i++) {
            await this.playSound(alert);
            if (i < alert.repeat - 1) {
                await this.sleep(200); // Pause between repeats
            }
        }
        
        // Update last alert time
        this.lastAlertTime[alert.type] = Date.now();
        
        // Show visual notification
        if (alert.message) {
            this.showVisualNotification(alert);
        }
        
        this.isPlaying = false;
        
        // Process next in queue
        if (this.queue.length > 0) {
            this.processQueue();
        }
    }
    
    async playSound(alert) {
        try {
            const audio = this.sounds.get(alert.type);
            
            if (audio) {
                // Use cloned audio for concurrent playback
                const clone = audio.cloneNode();
                clone.volume = alert.volume * this.volume;
                
                return new Promise((resolve) => {
                    clone.addEventListener('ended', resolve, { once: true });
                    clone.play().catch(e => {
                        console.error('Audio playback failed:', e);
                        // Fall back to synthesized sound
                        this.playSynthesized(alert.type);
                        resolve();
                    });
                });
            } else {
                // Use synthesized sound as fallback
                await this.playSynthesized(alert.type);
            }
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }
    
    async playSynthesized(type) {
        if (!this.audioContext) return;
        
        // Get synth parameters
        const params = this.synthSounds[type] || this.synthSounds.beep;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = params.frequency;
        oscillator.type = params.type;
        
        gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, 
            this.audioContext.currentTime + params.duration / 1000);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + params.duration / 1000);
        
        return new Promise(resolve => {
            setTimeout(resolve, params.duration);
        });
    }
    
    showVisualNotification(alert) {
        // Browser notification
        if (Notification.permission === 'granted') {
            new Notification('AuraQuant Alert', {
                body: alert.message,
                icon: 'assets/logo.png',
                badge: 'assets/badge.png',
                tag: alert.type,
                requireInteraction: alert.priority >= this.priorities.HIGH
            });
        }
        
        // In-app notification
        const notification = document.createElement('div');
        notification.className = `audio-alert-notification priority-${alert.priority}`;
        notification.innerHTML = `
            <div class="alert-icon">🔔</div>
            <div class="alert-content">
                <div class="alert-type">${this.formatAlertType(alert.type)}</div>
                <div class="alert-message">${alert.message || ''}</div>
                <div class="alert-time">${new Date().toLocaleTimeString()}</div>
            </div>
        `;
        
        const container = document.getElementById('alert-notifications') || document.body;
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    formatAlertType(type) {
        return type.replace(/([A-Z])/g, ' $1').trim()
            .replace(/^./, str => str.toUpperCase());
    }
    
    isQuietHours() {
        if (!this.quietHours.enabled) return false;
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const [startHour, startMin] = this.quietHours.start.split(':').map(Number);
        const [endHour, endMin] = this.quietHours.end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        
        if (startTime <= endTime) {
            return currentTime >= startTime && currentTime < endTime;
        } else {
            // Handles overnight quiet hours
            return currentTime >= startTime || currentTime < endTime;
        }
    }
    
    isOnCooldown(alertType) {
        const cooldown = this.alertCooldown[alertType] || 0;
        const lastAlert = this.lastAlertTime[alertType] || 0;
        
        return (Date.now() - lastAlert) < cooldown;
    }
    
    setCooldown(alertType, milliseconds) {
        this.alertCooldown[alertType] = milliseconds;
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.savePreferences();
    }
    
    setQuietHours(enabled, start, end) {
        this.quietHours = { enabled, start, end };
        this.savePreferences();
    }
    
    toggle() {
        this.enabled = !this.enabled;
        this.savePreferences();
        
        const btn = document.getElementById('audio-toggle-btn');
        if (btn) {
            btn.textContent = this.enabled ? '🔊' : '🔇';
            btn.classList.toggle('muted', !this.enabled);
        }
    }
    
    test(alertType = 'success') {
        console.log(`Testing alert: ${alertType}`);
        this.play(alertType, {
            message: `Test alert: ${this.formatAlertType(alertType)}`,
            priority: this.priorities.MEDIUM
        });
    }
    
    testAll() {
        console.log('Testing all alert sounds...');
        let delay = 0;
        
        for (const alertType of Object.keys(this.soundLibrary)) {
            setTimeout(() => {
                this.test(alertType);
            }, delay);
            delay += 2000; // 2 seconds between each sound
        }
    }
    
    setupEventListeners() {
        // Listen for various trading events
        document.addEventListener('orderFilled', (e) => {
            this.play('orderFilled', {
                message: `Order filled: ${e.detail.symbol} ${e.detail.side} ${e.detail.quantity}`,
                priority: this.priorities.HIGH
            });
        });
        
        document.addEventListener('stopLossTriggered', (e) => {
            this.play('stopLoss', {
                message: `Stop loss triggered: ${e.detail.symbol}`,
                priority: this.priorities.HIGH,
                repeat: 2
            });
        });
        
        document.addEventListener('priceAlert', (e) => {
            this.play('priceAlert', {
                message: `Price alert: ${e.detail.symbol} ${e.detail.condition} ${e.detail.price}`,
                priority: this.priorities.MEDIUM
            });
        });
        
        document.addEventListener('scannerHit', (e) => {
            this.play('scannerHit', {
                message: `Scanner hit: ${e.detail.scanner} - ${e.detail.symbol}`,
                priority: this.priorities.MEDIUM
            });
        });
        
        document.addEventListener('breakingNews', (e) => {
            this.play('newsBreaking', {
                message: e.detail.headline,
                priority: this.priorities.MEDIUM
            });
        });
        
        document.addEventListener('botError', (e) => {
            this.play('botError', {
                message: `Bot error: ${e.detail.error}`,
                priority: this.priorities.HIGH,
                repeat: 3
            });
        });
        
        document.addEventListener('emergencyStop', (e) => {
            this.play('emergency', {
                message: 'EMERGENCY STOP ACTIVATED!',
                priority: this.priorities.CRITICAL,
                repeat: 5,
                volume: 1.0
            });
        });
        
        // WebSocket connection events
        document.addEventListener('wsConnected', () => {
            this.play('connection', {
                message: 'WebSocket connected',
                priority: this.priorities.LOW
            });
        });
        
        document.addEventListener('wsDisconnected', () => {
            this.play('disconnection', {
                message: 'WebSocket disconnected',
                priority: this.priorities.MEDIUM
            });
        });
    }
    
    initializeUI() {
        // Volume control
        const volumeSlider = document.getElementById('audio-volume-slider');
        if (volumeSlider) {
            volumeSlider.value = this.volume * 100;
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value / 100);
            });
        }
        
        // Toggle button
        const toggleBtn = document.getElementById('audio-toggle-btn');
        if (toggleBtn) {
            toggleBtn.textContent = this.enabled ? '🔊' : '🔇';
            toggleBtn.addEventListener('click', () => this.toggle());
        }
        
        // Quiet hours controls
        const quietHoursCheckbox = document.getElementById('quiet-hours-enabled');
        const quietHoursStart = document.getElementById('quiet-hours-start');
        const quietHoursEnd = document.getElementById('quiet-hours-end');
        
        if (quietHoursCheckbox) {
            quietHoursCheckbox.checked = this.quietHours.enabled;
            quietHoursCheckbox.addEventListener('change', (e) => {
                this.setQuietHours(
                    e.target.checked,
                    quietHoursStart?.value || this.quietHours.start,
                    quietHoursEnd?.value || this.quietHours.end
                );
            });
        }
        
        if (quietHoursStart) {
            quietHoursStart.value = this.quietHours.start;
            quietHoursStart.addEventListener('change', (e) => {
                this.setQuietHours(
                    this.quietHours.enabled,
                    e.target.value,
                    this.quietHours.end
                );
            });
        }
        
        if (quietHoursEnd) {
            quietHoursEnd.value = this.quietHours.end;
            quietHoursEnd.addEventListener('change', (e) => {
                this.setQuietHours(
                    this.quietHours.enabled,
                    this.quietHours.start,
                    e.target.value
                );
            });
        }
        
        // Test buttons
        const testBtn = document.getElementById('test-audio-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.test());
        }
        
        const testAllBtn = document.getElementById('test-all-audio-btn');
        if (testAllBtn) {
            testAllBtn.addEventListener('click', () => this.testAll());
        }
        
        // Alert type selector for custom sounds
        const alertTypeSelector = document.getElementById('alert-type-selector');
        if (alertTypeSelector) {
            // Populate options
            for (const type of Object.keys(this.soundLibrary)) {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = this.formatAlertType(type);
                alertTypeSelector.appendChild(option);
            }
            
            // Custom sound upload
            const customSoundUpload = document.getElementById('custom-sound-upload');
            if (customSoundUpload) {
                customSoundUpload.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (file && file.type.startsWith('audio/')) {
                        const url = URL.createObjectURL(file);
                        const alertType = alertTypeSelector.value;
                        
                        await this.loadSound(alertType, url);
                        this.userPreferences[alertType] = url;
                        this.savePreferences();
                        
                        console.log(`Custom sound loaded for ${alertType}`);
                    }
                });
            }
        }
    }
    
    loadPreferences() {
        const saved = localStorage.getItem('audioAlertPreferences');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                this.enabled = prefs.enabled ?? true;
                this.volume = prefs.volume ?? 0.7;
                this.quietHours = prefs.quietHours || this.quietHours;
                this.alertCooldown = prefs.cooldowns || {};
                this.userPreferences = prefs.userPreferences || {};
                
                // Load custom sounds
                for (const [type, url] of Object.entries(this.userPreferences)) {
                    this.loadSound(type, url);
                }
            } catch (error) {
                console.error('Error loading audio preferences:', error);
            }
        }
    }
    
    savePreferences() {
        const prefs = {
            enabled: this.enabled,
            volume: this.volume,
            quietHours: this.quietHours,
            cooldowns: this.alertCooldown,
            userPreferences: this.userPreferences
        };
        
        localStorage.setItem('audioAlertPreferences', JSON.stringify(prefs));
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Advanced alert patterns
    playPattern(pattern, interval = 500) {
        const patterns = {
            urgent: ['error', 'error', 'error'],
            success: ['success', 'chime'],
            warning: ['warning', 'warning'],
            notification: ['ding'],
            attention: ['bell', 'bell', 'bell']
        };
        
        const sequence = patterns[pattern] || patterns.notification;
        
        sequence.forEach((sound, index) => {
            setTimeout(() => {
                this.play(sound);
            }, index * interval);
        });
    }
    
    // Voice alerts using speech synthesis
    speak(message, options = {}) {
        if (!window.speechSynthesis) return;
        
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = this.volume;
        utterance.lang = options.lang || 'en-US';
        
        // Select voice
        const voices = speechSynthesis.getVoices();
        if (options.voice) {
            const voice = voices.find(v => v.name === options.voice);
            if (voice) utterance.voice = voice;
        }
        
        speechSynthesis.speak(utterance);
    }
    
    // Alert statistics
    getStatistics() {
        const stats = {
            totalAlerts: Object.values(this.lastAlertTime).length,
            alertsByType: {},
            recentAlerts: [],
            queueLength: this.queue.length
        };
        
        // Count alerts by type
        for (const [type, time] of Object.entries(this.lastAlertTime)) {
            stats.alertsByType[type] = (stats.alertsByType[type] || 0) + 1;
            
            // Recent alerts (last hour)
            if (Date.now() - time < 3600000) {
                stats.recentAlerts.push({
                    type,
                    time: new Date(time).toLocaleTimeString()
                });
            }
        }
        
        return stats;
    }
    
    // Clear alert queue
    clearQueue() {
        this.queue = [];
        console.log('Alert queue cleared');
    }
    
    // Reset all settings
    reset() {
        this.enabled = true;
        this.volume = 0.7;
        this.quietHours = { enabled: false, start: '22:00', end: '08:00' };
        this.alertCooldown = {};
        this.userPreferences = {};
        this.lastAlertTime = {};
        this.clearQueue();
        this.savePreferences();
        console.log('Audio alerts reset to defaults');
    }
}

// Initialize on page load
let audioAlerts;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        audioAlerts = new AudioAlertsModule();
        window.audioAlerts = audioAlerts;
    });
} else {
    audioAlerts = new AudioAlertsModule();
    window.audioAlerts = audioAlerts;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioAlertsModule;
}