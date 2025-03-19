import { LANE_COUNT, PLAYER_COLOR, TARGET_COLOR } from './config.js';

// Clase para gestionar elementos del juego
class GameElementsManager {
    constructor() {
        this.gameArea = null;
        this.targetZone = null;
        this.lanes = [];
        this.noteElements = [];
    }

    initialize() {
        this.gameArea = document.getElementById('game-area');
        this.targetZone = document.getElementById('target-zone');
        this.createLanes();
    }

    createLanes() {
        // Limpiar carriles existentes
        this.lanes = [];
        
        // Crear nuevos carriles
        for (let i = 0; i < LANE_COUNT; i++) {
            const lane = document.createElement('div');
            lane.className = 'lane';
            lane.id = `lane-${i}`;
            lane.style.width = `${100 / LANE_COUNT}%`;
            lane.style.left = `${(i * 100) / LANE_COUNT}%`;
            
            // Añadir indicador del carril
            const laneIndicator = document.createElement('div');
            laneIndicator.className = 'lane-indicator';
            lane.appendChild(laneIndicator);
            
            this.gameArea.appendChild(lane);
            this.lanes.push(lane);
        }
    }
    
    createNote(laneIndex) {
        const note = document.createElement('div');
        note.className = 'note';
        note.dataset.lane = laneIndex;
        note.style.backgroundColor = PLAYER_COLOR;
        
        // Posicionar la nota al inicio del carril
        note.style.left = `${(laneIndex * 100) / LANE_COUNT + (100 / LANE_COUNT / 2)}%`;
        note.style.top = '0%';
        
        this.gameArea.appendChild(note);
        this.noteElements.push(note);
        
        return note;
    }
    
    removeNote(note) {
        note.remove();
        const index = this.noteElements.indexOf(note);
        if (index > -1) {
            this.noteElements.splice(index, 1);
        }
    }
    
    clearAllNotes() {
        for (const note of this.noteElements) {
            note.remove();
        }
        this.noteElements = [];
    }
    
    displayHitEffect(laneIndex) {
        const effect = document.createElement('div');
        effect.className = 'hit-effect';
        effect.style.left = `${(laneIndex * 100) / LANE_COUNT + (100 / LANE_COUNT / 2)}%`;
        effect.style.top = `${this.targetZone.offsetTop}px`;
        
        this.gameArea.appendChild(effect);
        
        // Eliminar el efecto después de la animación
        setTimeout(() => {
            effect.remove();
        }, 300);
    }
}

export const elementsManager = new GameElementsManager();

export function createGameElements() {
    elementsManager.initialize();
}

export function createNote(laneIndex) {
    return elementsManager.createNote(laneIndex);
}

export function removeNote(note) {
    elementsManager.removeNote(note);
}

export function clearAllNotes() {
    elementsManager.clearAllNotes();
}

export function displayHitEffect(laneIndex) {
    elementsManager.displayHitEffect(laneIndex);
}
