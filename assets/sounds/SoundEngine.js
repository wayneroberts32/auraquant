/**
 * AuraQuant Sound Engine
 * Web Audio API synthesizer for generating alert sounds
 * Falls back to audio files if available
 */

class SoundEngine {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.soundConfig = null;
        this.masterVolume = 0.8;
        this.enabled = true;
        this.preset = 'normal';
        this.audioCache = new Map();
        this.isInitialized = false;
        
        // Effect nodes
        this.effects = {
            reverb: null,
            delay: null,
            compressor: null,
            filter: null
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load sound configuration
            await this.loadSoundConfig();
            
            // Setup effects chain
            this.setupEffects();
            
            // Preload audio files if available
            await this.preloadSounds();
            
            this.isInitialized = true;
            console.log('🔊 Sound Engine initialized');
            
        } catch (error) {
            console.error('Failed to initialize Sound Engine:', error);
        }
    }
    
    async loadSoundConfig() {
        try {
            const response = await fetch('/sounds/soundConfig.json');
            this.soundConfig = await response.json();
            console.log('Sound configuration loaded');
        } catch (error) {
            console.warn('Could not load sound config, using defaults');
            // Use embedded config as fallback
            this.soundConfig = this.getDefaultConfig();
        }
    }
    
    setupEffects() {
        // Create compressor for consistent volume
        this.effects.compressor = this.audioContext.createDynamicsCompressor();
        this.effects.compressor.threshold.value = -50;
        this.effects.compressor.knee.value = 40;
        this.effects.compressor.ratio.value = 12;
        this.effects.compressor.attack.value = 0;
        this.effects.compressor.release.value = 0.25;
        
        // Create filter
        this.effects.filter = this.audioContext.createBiquadFilter();
        this.effects.filter.type = 'lowpass';
        this.effects.filter.frequency.value = 20000;
        
        // Create reverb using convolver
        this.effects.reverb = this.audioContext.createConvolver();
        this.createReverbImpulse();
        
        // Create delay
        this.effects.delay = this.audioContext.createDelay(1.0);
        this.effects.delay.delayTime.value = 0.1;
        
        // Connect effects chain
        this.effects.compressor.connect(this.audioContext.destination);
    }
    
    createReverbImpulse() {
        const length = this.audioContext.sampleRate * 2;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        this.effects.reverb.buffer = impulse;
    }
    
    async preloadSounds() {
        if (!this.soundConfig) return;
        
        for (const [key, sound] of Object.entries(this.soundConfig.sounds)) {
            if (sound.fallback) {
                try {
                    const audio = new Audio(sound.fallback);
                    audio.preload = 'auto';
                    this.audioCache.set(key, audio);
                } catch (error) {
                    console.warn(`Could not preload ${sound.fallback}`);
                }
            }
        }
    }
    
    /**
     * Play a synthesized or pre-recorded alert sound
     * @param {string} soundName - Name of the sound (e.g., 'alert_up')
     * @param {Object} options - Playback options
     */
    async play(soundName, options = {}) {
        if (!this.enabled || !this.isInitialized) return;
        
        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        const soundDef = this.soundConfig?.sounds[soundName];
        if (!soundDef) {
            console.warn(`Sound ${soundName} not found`);
            return;
        }
        
        // Try to play audio file first if available
        if (this.audioCache.has(soundName)) {
            const audio = this.audioCache.get(soundName);
            audio.volume = this.masterVolume * (options.volume || 1);
            audio.currentTime = 0;
            audio.play().catch(e => {
                console.warn('Audio playback failed, using synthesizer');
                this.synthesize(soundName, options);
            });
        } else {
            // Synthesize sound
            this.synthesize(soundName, options);
        }
    }
    
    /**
     * Synthesize a sound using Web Audio API
     */
    synthesize(soundName, options = {}) {
        const soundDef = this.soundConfig.sounds[soundName];
        if (!soundDef || !soundDef.config) return;
        
        const config = soundDef.config;
        const preset = this.soundConfig.presets[this.preset] || {};
        
        // Apply preset modifiers
        const volume = config.volume * this.masterVolume * 
                      (preset.volumeMultiplier || 1) * 
                      (options.volume || 1);
        const duration = config.duration * (preset.durationMultiplier || 1);
        
        // Create oscillator for each frequency
        const frequencies = Array.isArray(config.frequency) ? config.frequency : [config.frequency];
        const startTime = this.audioContext.currentTime;
        
        frequencies.forEach((freq, index) => {
            if (freq === 0) return; // Skip silence
            
            const delay = (duration / frequencies.length) * index;
            this.createTone(freq, config, volume, duration / frequencies.length, startTime + delay);
        });
    }
    
    /**
     * Create a single tone
     */
    createTone(frequency, config, volume, duration, startTime) {
        // Create oscillator
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = config.waveform || 'sine';
        oscillator.frequency.value = frequency;
        
        // Create gain for envelope
        const gainNode = this.audioContext.createGain();
        const envelope = config.envelope || {};
        
        // Apply ADSR envelope
        const attack = envelope.attack || 0.01;
        const decay = envelope.decay || 0.1;
        const sustain = envelope.sustain || 0.5;
        const release = envelope.release || 0.2;
        
        // Set envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + attack);
        gainNode.gain.linearRampToValueAtTime(volume * sustain, startTime + attack + decay);
        gainNode.gain.setValueAtTime(volume * sustain, startTime + duration - release);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        // Apply effects if specified
        let outputNode = gainNode;
        
        if (config.effects) {
            // Apply reverb
            if (config.effects.reverb && this.effects.reverb) {
                const reverbGain = this.audioContext.createGain();
                reverbGain.gain.value = config.effects.reverb;
                
                gainNode.connect(reverbGain);
                reverbGain.connect(this.effects.reverb);
                this.effects.reverb.connect(this.effects.compressor);
            }
            
            // Apply delay
            if (config.effects.delay && this.effects.delay) {
                const delayGain = this.audioContext.createGain();
                delayGain.gain.value = config.effects.delay;
                
                gainNode.connect(delayGain);
                delayGain.connect(this.effects.delay);
                this.effects.delay.connect(this.effects.compressor);
            }
            
            // Apply filter
            if (config.effects.lowpass) {
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = config.effects.lowpass;
                
                gainNode.connect(filter);
                outputNode = filter;
            }
        }
        
        // Connect nodes
        oscillator.connect(gainNode);
        outputNode.connect(this.effects.compressor);
        
        // Start and stop
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }
    
    /**
     * Play a sequence of sounds
     */
    async playSequence(sounds, interval = 200) {
        for (const sound of sounds) {
            await this.play(sound);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
    
    /**
     * Play a sound with specific pattern
     */
    playPattern(soundName, pattern = 'single', count = 3) {
        const patterns = {
            single: () => this.play(soundName),
            double: () => {
                this.play(soundName);
                setTimeout(() => this.play(soundName), 150);
            },
            triple: () => {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => this.play(soundName), i * 150);
                }
            },
            rapid: () => {
                for (let i = 0; i < count; i++) {
                    setTimeout(() => this.play(soundName, { volume: 0.5 }), i * 50);
                }
            },
            escalating: () => {
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        this.play(soundName, { volume: 0.3 + (i * 0.2) });
                    }, i * 200);
                }
            }
        };
        
        const patternFunc = patterns[pattern] || patterns.single;
        patternFunc();
    }
    
    /**
     * Test all sounds
     */
    async testAllSounds() {
        console.log('Testing all alert sounds...');
        
        const sounds = Object.keys(this.soundConfig.sounds);
        for (const sound of sounds) {
            console.log(`Playing: ${sound}`);
            await this.play(sound);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('Sound test complete');
    }
    
    /**
     * Set master volume
     */
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * Set sound preset
     */
    setPreset(preset) {
        if (this.soundConfig?.presets[preset]) {
            this.preset = preset;
            console.log(`Sound preset changed to: ${preset}`);
        }
    }
    
    /**
     * Enable/disable sounds
     */
    toggle(enabled) {
        this.enabled = enabled;
        console.log(`Sounds ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get default configuration (embedded fallback)
     */
    getDefaultConfig() {
        return {
            sounds: {
                alert_up: {
                    name: "Price Up",
                    config: {
                        waveform: "sine",
                        frequency: [440, 550, 660],
                        duration: 0.5,
                        volume: 0.7,
                        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.2 }
                    }
                },
                alert_down: {
                    name: "Price Down",
                    config: {
                        waveform: "triangle",
                        frequency: [440, 330, 220],
                        duration: 0.5,
                        volume: 0.7,
                        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.2 }
                    }
                },
                alert_break: {
                    name: "Breakout",
                    config: {
                        waveform: "sawtooth",
                        frequency: [261.63, 329.63, 392, 523.25],
                        duration: 0.8,
                        volume: 0.8,
                        envelope: { attack: 0.01, decay: 0.05, sustain: 0.4, release: 0.3 }
                    }
                },
                alert_hot: {
                    name: "Hot Stock",
                    config: {
                        waveform: "square",
                        frequency: [880, 1760],
                        duration: 1.0,
                        volume: 0.9,
                        envelope: { attack: 0.001, decay: 0.05, sustain: 0.2, release: 0.1 }
                    }
                },
                alert_halt: {
                    name: "Trading Halt",
                    config: {
                        waveform: "sine",
                        frequency: [440, 0, 440, 0, 440],
                        duration: 1.5,
                        volume: 1.0,
                        envelope: { attack: 0.001, decay: 0.01, sustain: 0.9, release: 0.01 }
                    }
                },
                alert_warning: {
                    name: "Warning",
                    config: {
                        waveform: "triangle",
                        frequency: [587.33, 493.88],
                        duration: 0.6,
                        volume: 0.8,
                        envelope: { attack: 0.02, decay: 0.08, sustain: 0.5, release: 0.15 }
                    }
                }
            },
            presets: {
                normal: {},
                gentle: { volumeMultiplier: 0.5, durationMultiplier: 1.2 },
                aggressive: { volumeMultiplier: 1.2, durationMultiplier: 0.8 },
                minimal: { volumeMultiplier: 0.3, durationMultiplier: 0.5 }
            }
        };
    }
    
    /**
     * Create custom alert sound
     */
    createCustomSound(name, config) {
        if (!this.soundConfig) {
            this.soundConfig = this.getDefaultConfig();
        }
        
        this.soundConfig.sounds[name] = {
            name: config.name || name,
            config: config,
            custom: true
        };
        
        console.log(`Custom sound '${name}' created`);
    }
    
    /**
     * Get sound info
     */
    getSoundInfo(soundName) {
        return this.soundConfig?.sounds[soundName] || null;
    }
    
    /**
     * Get all available sounds
     */
    getAvailableSounds() {
        return Object.keys(this.soundConfig?.sounds || {});
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.audioCache.clear();
    }
}

// Initialize sound engine
let soundEngine;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        soundEngine = new SoundEngine();
        window.soundEngine = soundEngine;
    });
} else {
    soundEngine = new SoundEngine();
    window.soundEngine = soundEngine;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundEngine;
}