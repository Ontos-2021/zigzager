import { GAME_SPEED, LANE_COUNT, BASE_POINTS, COMBO_MULTIPLIER, TARGET_ZONE_THRESHOLD } from './config.js';
import { playSound } from './audio.js';
import { createNote, removeNote, clearAllNotes, displayHitEffect } from './gameElements.js';

// Estado del juego
const gameState = {
    isRunning: false,
    isPaused: false,
    bpm: 120,
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    misses: 0,
    accuracy: 0,
    notes: [],
    lastNoteTime: 0,
    animationFrameId: null
};

// Inicializa la lógica del juego
export function initGameLogic() {
    resetGameState();
    updateScoreDisplay();
    updateStatsDisplay();
}

// Actualiza el estado del juego en cada frame
export function updateGameState() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    moveNotes();
    checkMissedNotes();
    generateNotes();
    
    // Solicitar el siguiente frame
    gameState.animationFrameId = requestAnimationFrame(updateGameState);
}

// Mueve las notas hacia abajo
function moveNotes() {
    const targetZone = document.getElementById('target-zone');
    const targetTop = targetZone.offsetTop;
    const targetHeight = targetZone.offsetHeight;
    
    for (const note of gameState.notes) {
        // Actualizar posición
        note.position += GAME_SPEED;
        note.element.style.top = `${note.position}px`;
        
        // Verificar si la nota está fuera de la pantalla
        if (note.position > window.innerHeight) {
            removeNote(note.element);
            gameState.notes = gameState.notes.filter(n => n !== note);
            
            // Contar como miss si no ha sido golpeada aún
            if (!note.hit) {
                registerMiss();
            }
        }
    }
}

// Verifica notas que pasaron la zona objetivo sin ser golpeadas
function checkMissedNotes() {
    const targetZone = document.getElementById('target-zone');
    const targetBottom = targetZone.offsetTop + targetZone.offsetHeight;
    
    for (const note of gameState.notes) {
        // Si la nota pasó completamente la zona objetivo sin ser golpeada
        if (!note.hit && note.position > targetBottom + 10) {
            registerMiss();
            note.hit = true; // Marcar como procesada para evitar múltiples miss
        }
    }
}

// Genera nuevas notas según el BPM
function generateNotes() {
    const now = Date.now();
    const noteInterval = 60000 / gameState.bpm;
    
    // Generar una nueva nota si ha pasado suficiente tiempo
    if (now - gameState.lastNoteTime >= noteInterval) {
        // Seleccionar un carril aleatorio
        const laneIndex = Math.floor(Math.random() * LANE_COUNT);
        
        // Crear la nota visual
        const noteElement = createNote(laneIndex);
        
        // Agregar la nota al estado del juego
        gameState.notes.push({
            element: noteElement,
            lane: laneIndex,
            position: 0,
            hit: false,
            timestamp: now
        });
        
        gameState.lastNoteTime = now;
    }
}

// Procesa el intento de golpear una nota
export function hitNote(laneIndex) {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    const targetZone = document.getElementById('target-zone');
    const targetTop = targetZone.offsetTop;
    const targetBottom = targetTop + targetZone.offsetHeight;
    
    // Buscar notas en el carril especificado que estén cerca de la zona objetivo
    const notesInLane = gameState.notes.filter(note => 
        note.lane === laneIndex && 
        !note.hit &&
        note.position >= targetTop - TARGET_ZONE_THRESHOLD &&
        note.position <= targetBottom + TARGET_ZONE_THRESHOLD
    );
    
    if (notesInLane.length > 0) {
        // Seleccionar la nota más cercana a la zona objetivo
        const hitNote = notesInLane.reduce((closest, note) => {
            const closestDist = Math.abs(closest.position - targetTop);
            const noteDist = Math.abs(note.position - targetTop);
            return noteDist < closestDist ? note : closest;
        }, notesInLane[0]);
        
        registerHit();
        hitNote.hit = true;
        
        // Efecto visual de acierto
        displayHitEffect(laneIndex);
        removeNote(hitNote.element);
        gameState.notes = gameState.notes.filter(n => n !== hitNote);
        
        // Reproducir sonido
        playSound('hit');
    } else {
        // No hay notas para golpear, contar como miss
        registerMiss();
    }
}

// Registra un acierto
function registerHit() {
    gameState.hits++;
    gameState.combo++;
    
    if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
    }
    
    // Calcular puntos con multiplicador de combo
    const points = Math.floor(BASE_POINTS * (1 + (gameState.combo * COMBO_MULTIPLIER)));
    gameState.score += points;
    
    // Efectos visuales del combo
    updateComboDisplay();
    
    // Actualizar estadísticas
    calculateAccuracy();
    updateScoreDisplay();
    updateStatsDisplay();
    
    // Efectos especiales para combos grandes
    if (gameState.combo % 10 === 0) {
        playSound('combo');
    }
}

// Registra un fallo
function registerMiss() {
    gameState.misses++;
    gameState.combo = 0; // Romper el combo
    
    calculateAccuracy();
    updateComboDisplay();
    updateStatsDisplay();
    
    // Reproducir sonido de error
    playSound('miss');
}

// Calcula la precisión actual
function calculateAccuracy() {
    const total = gameState.hits + gameState.misses;
    gameState.accuracy = total > 0 ? Math.floor((gameState.hits / total) * 100) : 0;
}

// Actualiza el display de combo
function updateComboDisplay() {
    const comboDisplay = document.getElementById('combo-display');
    const comboNumber = document.getElementById('combo-number');
    
    comboNumber.textContent = gameState.combo;
    
    if (gameState.combo > 0) {
        comboDisplay.classList.add('active');
        
        // Clases adicionales para combos grandes
        if (gameState.combo >= 50) {
            comboDisplay.classList.add('mega-combo');
        } else if (gameState.combo >= 20) {
            comboDisplay.classList.add('super-combo');
        } else {
            comboDisplay.classList.remove('super-combo');
            comboDisplay.classList.remove('mega-combo');
        }
    } else {
        comboDisplay.classList.remove('active');
        comboDisplay.classList.remove('super-combo');
        comboDisplay.classList.remove('mega-combo');
    }
}

// Actualiza el marcador de puntuación
function updateScoreDisplay() {
    const scoreDisplay = document.getElementById('score-display');
    scoreDisplay.textContent = gameState.score;
}

// Actualiza las estadísticas del jugador
function updateStatsDisplay() {
    document.getElementById('hits').textContent = gameState.hits;
    document.getElementById('misses').textContent = gameState.misses;
    document.getElementById('accuracy').textContent = `${gameState.accuracy}%`;
    document.getElementById('max-combo').textContent = gameState.maxCombo;
}

// Inicia el juego
export function startGame(bpm = 120) {
    if (gameState.isRunning && !gameState.isPaused) return;
    
    if (gameState.isPaused) {
        // Reanudar juego pausado
        gameState.isPaused = false;
    } else {
        // Iniciar nuevo juego
        resetGameState();
        gameState.bpm = bpm;
        gameState.isRunning = true;
    }
    
    updateGameState();
}

// Pausa el juego
export function pauseGame() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    gameState.isPaused = true;
    cancelAnimationFrame(gameState.animationFrameId);
}

// Reinicia el juego
export function resetGame() {
    cancelAnimationFrame(gameState.animationFrameId);
    clearAllNotes();
    resetGameState();
    updateScoreDisplay();
    updateStatsDisplay();
    updateComboDisplay();
}

// Restablece el estado del juego
function resetGameState() {
    gameState.isRunning = false;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.combo = 0;
    gameState.maxCombo = 0;
    gameState.hits = 0;
    gameState.misses = 0;
    gameState.accuracy = 0;
    gameState.notes = [];
    gameState.lastNoteTime = 0;
}

// Getter para el estado del juego
export function getGameState() {
    return { ...gameState }; // Retorna una copia para evitar modificaciones directas
}
