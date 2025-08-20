/**
 * AuraQuant Backup Module
 * Automated backup, export/import, and recovery system
 * Protects trading data, configurations, and strategies
 */

class BackupModule {
    constructor() {
        this.backupEnabled = true;
        this.autoBackupInterval = 3600000; // 1 hour default
        this.maxBackups = 50;
        this.currentBackupId = null;
        this.backupTimer = null;
        
        // Backup configurations
        this.backupConfig = {
            autoBackup: true,
            interval: 'hourly', // hourly, daily, weekly
            time: '03:00', // For daily backups
            dayOfWeek: 1, // For weekly (1=Monday)
            compression: true,
            encryption: false,
            cloudSync: false,
            destinations: {
                local: true,
                cloud: false,
                export: false
            }
        };
        
        // Data categories to backup
        this.backupCategories = {
            settings: {
                enabled: true,
                name: 'Settings & Preferences',
                keys: [
                    'timezonePreferences',
                    'audioAlertPreferences',
                    'newsPreferences',
                    'calendarPreferences',
                    'socialConfigurations'
                ]
            },
            tradingData: {
                enabled: true,
                name: 'Trading Data',
                keys: [
                    'positions',
                    'orders',
                    'trades',
                    'portfolio',
                    'watchlists'
                ]
            },
            strategies: {
                enabled: true,
                name: 'Strategies & Bots',
                keys: [
                    'strategies',
                    'backtests',
                    'botConfigs',
                    'indicators',
                    'alerts'
                ]
            },
            charts: {
                enabled: true,
                name: 'Charts & Layouts',
                keys: [
                    'chartLayouts',
                    'drawings',
                    'indicators',
                    'templates'
                ]
            },
            history: {
                enabled: true,
                name: 'Historical Data',
                keys: [
                    'tradeHistory',
                    'performanceHistory',
                    'socialHistory',
                    'alertHistory'
                ]
            }
        };
        
        // Backup history
        this.backupHistory = [];
        
        // Recovery points
        this.recoveryPoints = [];
        
        this.init();
    }
    
    init() {
        console.log('💾 Initializing Backup Module...');
        
        // Load backup configuration
        this.loadConfiguration();
        
        // Load backup history
        this.loadBackupHistory();
        
        // Initialize UI
        this.initializeUI();
        
        // Start auto-backup if enabled
        if (this.backupConfig.autoBackup) {
            this.startAutoBackup();
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('✅ Backup Module initialized');
    }
    
    // Create a full backup
    async createBackup(manual = false) {
        console.log('Creating backup...');
        
        const backupId = this.generateBackupId();
        const timestamp = Date.now();
        
        const backup = {
            id: backupId,
            timestamp,
            date: new Date(timestamp).toISOString(),
            type: manual ? 'manual' : 'auto',
            version: '1.0.0',
            categories: {},
            metadata: {
                platform: 'AuraQuant',
                browser: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                dataSize: 0
            }
        };
        
        // Collect data from each category
        for (const [category, config] of Object.entries(this.backupCategories)) {
            if (config.enabled) {
                backup.categories[category] = await this.backupCategory(config);
            }
        }
        
        // Calculate total data size
        backup.metadata.dataSize = this.calculateDataSize(backup);
        
        // Compress if enabled
        if (this.backupConfig.compression) {
            backup.compressed = true;
            backup.data = this.compressData(backup.categories);
            delete backup.categories;
        }
        
        // Encrypt if enabled
        if (this.backupConfig.encryption) {
            backup.encrypted = true;
            backup.data = await this.encryptData(backup.data || backup.categories);
        }
        
        // Store backup
        await this.storeBackup(backup);
        
        // Update history
        this.addToHistory(backup);
        
        // Clean old backups
        this.cleanOldBackups();
        
        // Trigger event
        this.triggerBackupComplete(backup);
        
        console.log(`✅ Backup created: ${backupId}`);
        
        return backup;
    }
    
    // Backup a specific category
    async backupCategory(config) {
        const data = {};
        
        for (const key of config.keys) {
            try {
                const value = localStorage.getItem(key);
                if (value) {
                    data[key] = JSON.parse(value);
                }
            } catch (error) {
                console.warn(`Failed to backup ${key}:`, error);
                data[key] = localStorage.getItem(key);
            }
        }
        
        return data;
    }
    
    // Restore from backup
    async restoreBackup(backupId) {
        console.log(`Restoring backup: ${backupId}`);
        
        const backup = await this.loadBackup(backupId);
        if (!backup) {
            throw new Error('Backup not found');
        }
        
        // Create recovery point before restore
        await this.createRecoveryPoint();
        
        let data = backup.categories || backup.data;
        
        // Decrypt if needed
        if (backup.encrypted) {
            data = await this.decryptData(data);
        }
        
        // Decompress if needed
        if (backup.compressed) {
            data = this.decompressData(data);
        }
        
        // Restore each category
        for (const [category, categoryData] of Object.entries(data)) {
            if (this.backupCategories[category]) {
                await this.restoreCategory(category, categoryData);
            }
        }
        
        // Reload modules
        this.reloadModules();
        
        // Trigger event
        this.triggerRestoreComplete(backup);
        
        console.log('✅ Backup restored successfully');
        
        return true;
    }
    
    // Restore a specific category
    async restoreCategory(category, data) {
        console.log(`Restoring category: ${category}`);
        
        for (const [key, value] of Object.entries(data)) {
            try {
                if (typeof value === 'object') {
                    localStorage.setItem(key, JSON.stringify(value));
                } else {
                    localStorage.setItem(key, value);
                }
            } catch (error) {
                console.error(`Failed to restore ${key}:`, error);
            }
        }
    }
    
    // Export backup to file
    async exportBackup(backupId) {
        const backup = await this.loadBackup(backupId);
        if (!backup) {
            throw new Error('Backup not found');
        }
        
        const filename = `auraquant_backup_${backup.date.replace(/[:.]/g, '-')}.json`;
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        
        console.log(`✅ Backup exported: ${filename}`);
    }
    
    // Import backup from file
    async importBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    
                    // Validate backup
                    if (!this.validateBackup(backup)) {
                        throw new Error('Invalid backup file');
                    }
                    
                    // Store imported backup
                    await this.storeBackup(backup);
                    
                    // Add to history
                    this.addToHistory(backup);
                    
                    console.log('✅ Backup imported successfully');
                    resolve(backup);
                    
                } catch (error) {
                    console.error('Import failed:', error);
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    // Validate backup structure
    validateBackup(backup) {
        if (!backup.id || !backup.timestamp || !backup.version) {
            return false;
        }
        
        if (!backup.categories && !backup.data) {
            return false;
        }
        
        return true;
    }
    
    // Create recovery point
    async createRecoveryPoint() {
        const recovery = await this.createBackup(true);
        recovery.type = 'recovery';
        
        this.recoveryPoints.push(recovery);
        
        // Keep only last 5 recovery points
        if (this.recoveryPoints.length > 5) {
            this.recoveryPoints.shift();
        }
        
        console.log('Recovery point created');
    }
    
    // Rollback to recovery point
    async rollbackToRecovery() {
        if (this.recoveryPoints.length === 0) {
            throw new Error('No recovery points available');
        }
        
        const recovery = this.recoveryPoints.pop();
        await this.restoreBackup(recovery.id);
        
        console.log('✅ Rolled back to recovery point');
    }
    
    // Store backup
    async storeBackup(backup) {
        const key = `backup_${backup.id}`;
        
        // Store in localStorage (for demo)
        try {
            localStorage.setItem(key, JSON.stringify(backup));
        } catch (error) {
            // Handle storage quota exceeded
            console.error('Storage error:', error);
            this.cleanOldBackups(true);
            localStorage.setItem(key, JSON.stringify(backup));
        }
        
        // Store in IndexedDB for larger data
        if (this.backupConfig.destinations.local) {
            await this.storeInIndexedDB(backup);
        }
        
        // Sync to cloud if enabled
        if (this.backupConfig.destinations.cloud && this.backupConfig.cloudSync) {
            await this.syncToCloud(backup);
        }
    }
    
    // Load backup
    async loadBackup(backupId) {
        const key = `backup_${backupId}`;
        
        // Try localStorage first
        const stored = localStorage.getItem(key);
        if (stored) {
            return JSON.parse(stored);
        }
        
        // Try IndexedDB
        return await this.loadFromIndexedDB(backupId);
    }
    
    // Store in IndexedDB
    async storeInIndexedDB(backup) {
        // IndexedDB implementation for larger storage
        // This is a placeholder - implement actual IndexedDB operations
        console.log('Storing in IndexedDB:', backup.id);
    }
    
    // Load from IndexedDB
    async loadFromIndexedDB(backupId) {
        // IndexedDB implementation
        console.log('Loading from IndexedDB:', backupId);
        return null;
    }
    
    // Sync to cloud
    async syncToCloud(backup) {
        // Cloud sync implementation
        console.log('Syncing to cloud:', backup.id);
        
        // This would typically call your backend API
        try {
            const response = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backup)
            });
            
            if (!response.ok) {
                throw new Error('Cloud sync failed');
            }
            
        } catch (error) {
            console.error('Cloud sync error:', error);
        }
    }
    
    // Compress data
    compressData(data) {
        // Simple compression using JSON string
        // In production, use a real compression library like pako
        const json = JSON.stringify(data);
        return btoa(json); // Base64 encode as simple "compression"
    }
    
    // Decompress data
    decompressData(data) {
        const json = atob(data);
        return JSON.parse(json);
    }
    
    // Encrypt data
    async encryptData(data) {
        // Simple encryption placeholder
        // In production, use Web Crypto API or a library like CryptoJS
        const json = JSON.stringify(data);
        return btoa(json); // Base64 as placeholder
    }
    
    // Decrypt data
    async decryptData(data) {
        const json = atob(data);
        return JSON.parse(json);
    }
    
    // Calculate data size
    calculateDataSize(backup) {
        const json = JSON.stringify(backup);
        return new Blob([json]).size;
    }
    
    // Generate backup ID
    generateBackupId() {
        return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Add to history
    addToHistory(backup) {
        this.backupHistory.unshift({
            id: backup.id,
            date: backup.date,
            timestamp: backup.timestamp,
            type: backup.type,
            size: backup.metadata.dataSize,
            categories: Object.keys(backup.categories || {})
        });
        
        // Keep only recent history
        if (this.backupHistory.length > 100) {
            this.backupHistory = this.backupHistory.slice(0, 100);
        }
        
        this.saveBackupHistory();
        this.updateHistoryUI();
    }
    
    // Clean old backups
    cleanOldBackups(force = false) {
        const backups = this.getAllBackupKeys();
        
        if (backups.length <= this.maxBackups && !force) {
            return;
        }
        
        // Sort by timestamp
        backups.sort((a, b) => {
            const aTime = parseInt(a.split('_')[1]);
            const bTime = parseInt(b.split('_')[1]);
            return aTime - bTime;
        });
        
        // Remove oldest backups
        const toRemove = backups.slice(0, backups.length - this.maxBackups);
        
        toRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`Removed old backup: ${key}`);
        });
    }
    
    // Get all backup keys
    getAllBackupKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('backup_')) {
                keys.push(key);
            }
        }
        return keys;
    }
    
    // Start auto-backup
    startAutoBackup() {
        this.stopAutoBackup();
        
        const intervals = {
            'hourly': 3600000,      // 1 hour
            'daily': 86400000,      // 24 hours
            'weekly': 604800000     // 7 days
        };
        
        const interval = intervals[this.backupConfig.interval] || intervals.hourly;
        
        // Schedule next backup
        if (this.backupConfig.interval === 'daily') {
            this.scheduleDailyBackup();
        } else if (this.backupConfig.interval === 'weekly') {
            this.scheduleWeeklyBackup();
        } else {
            // Hourly backup
            this.backupTimer = setInterval(() => {
                this.createBackup(false);
            }, interval);
        }
        
        console.log(`Auto-backup started: ${this.backupConfig.interval}`);
    }
    
    // Schedule daily backup
    scheduleDailyBackup() {
        const now = new Date();
        const [hours, minutes] = this.backupConfig.time.split(':').map(Number);
        
        const scheduled = new Date();
        scheduled.setHours(hours, minutes, 0, 0);
        
        if (scheduled <= now) {
            scheduled.setDate(scheduled.getDate() + 1);
        }
        
        const delay = scheduled - now;
        
        setTimeout(() => {
            this.createBackup(false);
            this.startAutoBackup(); // Reschedule
        }, delay);
    }
    
    // Schedule weekly backup
    scheduleWeeklyBackup() {
        const now = new Date();
        const targetDay = this.backupConfig.dayOfWeek;
        const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
        
        const scheduled = new Date();
        scheduled.setDate(scheduled.getDate() + daysUntilTarget);
        
        const [hours, minutes] = this.backupConfig.time.split(':').map(Number);
        scheduled.setHours(hours, minutes, 0, 0);
        
        const delay = scheduled - now;
        
        setTimeout(() => {
            this.createBackup(false);
            this.startAutoBackup(); // Reschedule
        }, delay);
    }
    
    // Stop auto-backup
    stopAutoBackup() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            clearTimeout(this.backupTimer);
            this.backupTimer = null;
        }
    }
    
    // Reload modules after restore
    reloadModules() {
        // Trigger reload events for other modules
        document.dispatchEvent(new CustomEvent('backupRestored'));
        
        // Reload specific modules if they exist
        if (window.timezoneModule) {
            window.timezoneModule.loadPreferences();
        }
        
        if (window.audioAlerts) {
            window.audioAlerts.loadPreferences();
        }
        
        if (window.newsModule) {
            window.newsModule.loadPreferences();
        }
        
        // Reload page if needed
        // location.reload();
    }
    
    // Initialize UI
    initializeUI() {
        this.createBackupPanel();
        this.updateHistoryUI();
        this.updateSettingsUI();
    }
    
    // Create backup panel
    createBackupPanel() {
        const container = document.getElementById('backup-panel');
        if (!container) return;
        
        container.innerHTML = `
            <div class="backup-header">
                <h3>Data Backup & Recovery</h3>
                <div class="backup-status">
                    <span class="status-indicator ${this.backupConfig.autoBackup ? 'active' : ''}"></span>
                    <span class="status-text">
                        ${this.backupConfig.autoBackup ? 'Auto-backup enabled' : 'Auto-backup disabled'}
                    </span>
                </div>
            </div>
            
            <div class="backup-actions">
                <button class="btn-primary" onclick="backupModule.createBackup(true)">
                    💾 Create Backup Now
                </button>
                <button class="btn-secondary" onclick="backupModule.showRestoreDialog()">
                    📥 Restore Backup
                </button>
                <button class="btn-secondary" onclick="backupModule.showImportDialog()">
                    📁 Import Backup
                </button>
            </div>
            
            <div class="backup-stats">
                <div class="stat">
                    <span class="stat-label">Total Backups:</span>
                    <span class="stat-value" id="total-backups">0</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Last Backup:</span>
                    <span class="stat-value" id="last-backup">Never</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Storage Used:</span>
                    <span class="stat-value" id="storage-used">0 KB</span>
                </div>
            </div>
            
            <div class="backup-history" id="backup-history-list"></div>
        `;
    }
    
    // Update history UI
    updateHistoryUI() {
        const container = document.getElementById('backup-history-list');
        if (!container) return;
        
        if (this.backupHistory.length === 0) {
            container.innerHTML = '<div class="no-backups">No backups yet</div>';
            return;
        }
        
        container.innerHTML = this.backupHistory.slice(0, 10).map(backup => `
            <div class="backup-item">
                <div class="backup-info">
                    <span class="backup-type ${backup.type}">${backup.type}</span>
                    <span class="backup-date">${new Date(backup.timestamp).toLocaleString()}</span>
                    <span class="backup-size">${this.formatSize(backup.size)}</span>
                </div>
                <div class="backup-actions">
                    <button onclick="backupModule.restoreBackup('${backup.id}')">Restore</button>
                    <button onclick="backupModule.exportBackup('${backup.id}')">Export</button>
                    <button onclick="backupModule.deleteBackup('${backup.id}')">Delete</button>
                </div>
            </div>
        `).join('');
        
        // Update stats
        document.getElementById('total-backups').textContent = this.backupHistory.length;
        
        if (this.backupHistory.length > 0) {
            const lastBackup = this.backupHistory[0];
            document.getElementById('last-backup').textContent = 
                new Date(lastBackup.timestamp).toLocaleString();
        }
        
        // Calculate storage
        const storageUsed = this.calculateStorageUsed();
        document.getElementById('storage-used').textContent = this.formatSize(storageUsed);
    }
    
    // Update settings UI
    updateSettingsUI() {
        const container = document.getElementById('backup-settings');
        if (!container) return;
        
        container.innerHTML = `
            <div class="backup-settings">
                <h4>Backup Settings</h4>
                
                <label>
                    <input type="checkbox" id="auto-backup-toggle" 
                        ${this.backupConfig.autoBackup ? 'checked' : ''}
                        onchange="backupModule.toggleAutoBackup(this.checked)">
                    Enable Auto-Backup
                </label>
                
                <div class="setting-group">
                    <label>Backup Interval:</label>
                    <select id="backup-interval" onchange="backupModule.setInterval(this.value)">
                        <option value="hourly" ${this.backupConfig.interval === 'hourly' ? 'selected' : ''}>
                            Hourly
                        </option>
                        <option value="daily" ${this.backupConfig.interval === 'daily' ? 'selected' : ''}>
                            Daily
                        </option>
                        <option value="weekly" ${this.backupConfig.interval === 'weekly' ? 'selected' : ''}>
                            Weekly
                        </option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <label>Max Backups to Keep:</label>
                    <input type="number" value="${this.maxBackups}" min="5" max="100"
                        onchange="backupModule.setMaxBackups(this.value)">
                </div>
                
                <div class="setting-group">
                    <label>
                        <input type="checkbox" ${this.backupConfig.compression ? 'checked' : ''}
                            onchange="backupModule.toggleCompression(this.checked)">
                        Enable Compression
                    </label>
                </div>
                
                <div class="setting-group">
                    <label>
                        <input type="checkbox" ${this.backupConfig.encryption ? 'checked' : ''}
                            onchange="backupModule.toggleEncryption(this.checked)">
                        Enable Encryption
                    </label>
                </div>
                
                <div class="categories">
                    <h5>Data Categories:</h5>
                    ${Object.entries(this.backupCategories).map(([key, category]) => `
                        <label>
                            <input type="checkbox" ${category.enabled ? 'checked' : ''}
                                onchange="backupModule.toggleCategory('${key}', this.checked)">
                            ${category.name}
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Show restore dialog
    showRestoreDialog() {
        if (this.backupHistory.length === 0) {
            alert('No backups available to restore');
            return;
        }
        
        const selected = prompt('Enter backup ID to restore:', this.backupHistory[0].id);
        if (selected) {
            if (confirm('This will replace all current data. Continue?')) {
                this.restoreBackup(selected);
            }
        }
    }
    
    // Show import dialog
    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await this.importBackup(file);
                    alert('Backup imported successfully');
                    this.updateHistoryUI();
                } catch (error) {
                    alert('Import failed: ' + error.message);
                }
            }
        };
        
        input.click();
    }
    
    // Delete backup
    async deleteBackup(backupId) {
        if (!confirm('Delete this backup?')) return;
        
        const key = `backup_${backupId}`;
        localStorage.removeItem(key);
        
        // Remove from history
        this.backupHistory = this.backupHistory.filter(b => b.id !== backupId);
        this.saveBackupHistory();
        this.updateHistoryUI();
        
        console.log(`Backup deleted: ${backupId}`);
    }
    
    // Toggle auto-backup
    toggleAutoBackup(enabled) {
        this.backupConfig.autoBackup = enabled;
        
        if (enabled) {
            this.startAutoBackup();
        } else {
            this.stopAutoBackup();
        }
        
        this.saveConfiguration();
        this.updateHistoryUI();
    }
    
    // Set backup interval
    setInterval(interval) {
        this.backupConfig.interval = interval;
        this.saveConfiguration();
        
        if (this.backupConfig.autoBackup) {
            this.startAutoBackup();
        }
    }
    
    // Set max backups
    setMaxBackups(max) {
        this.maxBackups = parseInt(max);
        this.saveConfiguration();
        this.cleanOldBackups();
    }
    
    // Toggle compression
    toggleCompression(enabled) {
        this.backupConfig.compression = enabled;
        this.saveConfiguration();
    }
    
    // Toggle encryption
    toggleEncryption(enabled) {
        this.backupConfig.encryption = enabled;
        this.saveConfiguration();
    }
    
    // Toggle category
    toggleCategory(category, enabled) {
        if (this.backupCategories[category]) {
            this.backupCategories[category].enabled = enabled;
            this.saveConfiguration();
        }
    }
    
    // Calculate storage used
    calculateStorageUsed() {
        let total = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('backup_')) {
                const value = localStorage.getItem(key);
                total += new Blob([value]).size;
            }
        }
        
        return total;
    }
    
    // Format size
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Listen for critical events that trigger backup
        document.addEventListener('tradeExecuted', () => {
            if (this.backupConfig.autoBackup) {
                // Create backup after important trades
                setTimeout(() => this.createBackup(false), 5000);
            }
        });
        
        // Listen for emergency stop
        document.addEventListener('emergencyStop', () => {
            // Create immediate backup on emergency
            this.createBackup(true);
        });
    }
    
    // Trigger backup complete event
    triggerBackupComplete(backup) {
        document.dispatchEvent(new CustomEvent('backupComplete', {
            detail: { backup }
        }));
    }
    
    // Trigger restore complete event  
    triggerRestoreComplete(backup) {
        document.dispatchEvent(new CustomEvent('restoreComplete', {
            detail: { backup }
        }));
    }
    
    // Save configuration
    saveConfiguration() {
        localStorage.setItem('backupConfig', JSON.stringify({
            config: this.backupConfig,
            categories: this.backupCategories,
            maxBackups: this.maxBackups
        }));
    }
    
    // Load configuration
    loadConfiguration() {
        const saved = localStorage.getItem('backupConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.backupConfig = { ...this.backupConfig, ...config.config };
                this.backupCategories = { ...this.backupCategories, ...config.categories };
                this.maxBackups = config.maxBackups || this.maxBackups;
            } catch (error) {
                console.error('Error loading backup config:', error);
            }
        }
    }
    
    // Save backup history
    saveBackupHistory() {
        localStorage.setItem('backupHistory', JSON.stringify(this.backupHistory));
    }
    
    // Load backup history
    loadBackupHistory() {
        const saved = localStorage.getItem('backupHistory');
        if (saved) {
            try {
                this.backupHistory = JSON.parse(saved);
            } catch (error) {
                console.error('Error loading backup history:', error);
            }
        }
    }
    
    // Get backup statistics
    getStatistics() {
        return {
            totalBackups: this.backupHistory.length,
            autoBackupEnabled: this.backupConfig.autoBackup,
            storageUsed: this.calculateStorageUsed(),
            oldestBackup: this.backupHistory[this.backupHistory.length - 1],
            newestBackup: this.backupHistory[0],
            categoriesEnabled: Object.values(this.backupCategories).filter(c => c.enabled).length
        };
    }
    
    // Cleanup
    destroy() {
        this.stopAutoBackup();
    }
}

// Initialize on page load
let backupModule;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        backupModule = new BackupModule();
        window.backupModule = backupModule;
    });
} else {
    backupModule = new BackupModule();
    window.backupModule = backupModule;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackupModule;
}