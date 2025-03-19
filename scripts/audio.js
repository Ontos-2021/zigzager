import { DEFAULT_VOLUME } from './config.js';

// Clase de gestión de audio
class AudioManager {
    constructor() {
        this.sounds = {};
        this.volume = DEFAULT_VOLUME / 100;
        this.context = null;
    }

    initAudioContext() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('Error al crear AudioContext:', e);
        }
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.sounds[name] = audioBuffer;
        } catch (error) {
            console.error(`Error loading sound ${name}:`, error);
        }
    }

    playSound(name) {
        if (!this.context || !this.sounds[name]) return;
        
        const source = this.context.createBufferSource();
        source.buffer = this.sounds[name];
        
        const gainNode = this.context.createGain();
        gainNode.gain.value = this.volume;
        
        source.connect(gainNode);
        gainNode.connect(this.context.destination);
        source.start(0);
    }

    setVolume(value) {
        this.volume = value / 100;
    }
}

export const audioManager = new AudioManager();

export function loadSounds() {
    audioManager.initAudioContext();
    // Cargar sonidos para el juego
    audioManager.loadSound('hit', 'assets/sounds/hit.mp3');
    audioManager.loadSound('miss', 'assets/sounds/miss.mp3');
    audioManager.loadSound('combo', 'assets/sounds/combo.mp3');
    audioManager.loadSound('background', 'assets/sounds/background.mp3');
}

export function playSound(soundName) {
    audioManager.playSound(soundName);
}

export function setVolume(value) {
    audioManager.setVolume(value);
}
