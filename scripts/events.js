import { LANE_KEYS } from './config.js';
import { hitNote, startGame, pauseGame, resetGame, getGameState } from './gameLogic.js';
import { setVolume } from './audio.js';

// Configurar todos los eventos de la aplicación
export function setupEventListeners() {
    // Eventos de teclado
    document.addEventListener('keydown', handleKeyDown);
    
    // Botones del juego
    document.getElementById('start').addEventListener('click', handleStartGame);
    document.getElementById('pause').addEventListener('click', handlePauseGame);
    document.getElementById('reset').addEventListener('click', handleResetGame);
    
    // Controles de la pantalla de bienvenida
    document.getElementById('start-game').addEventListener('click', handleWelcomeStart);
    document.getElementById('how-to-play').addEventListener('click', showTutorial);
    document.getElementById('close-tutorial').addEventListener('click', closeTutorial);
    
    // Controles de la pantalla de pausa
    document.getElementById('resume').addEventListener('click', handleResumeGame);
    document.getElementById('restart').addEventListener('click', handleResetGame);
    document.getElementById('exit').addEventListener('click', handleExitGame);
    
    // Controles de configuración
    document.getElementById('bpm').addEventListener('change', handleBpmChange);
    document.getElementById('volume').addEventListener('input', handleVolumeChange);
}

// Manejador de eventos de teclado
function handleKeyDown(event) {
    // Buscar qué carril corresponde a la tecla presionada
    const laneIndex = LANE_KEYS.indexOf(event.code);
    
    if (laneIndex !== -1) {
        hitNote(laneIndex);
        
        // Efecto visual de pulsación de tecla
        const lane = document.getElementById(`lane-${laneIndex}`);
        if (lane) {
            const indicator = lane.querySelector('.lane-indicator');
            if (indicator) {
                indicator.classList.add('active');
                setTimeout(() => {
                    indicator.classList.remove('active');
                }, 100);
            }
        }
    }
    
    // Teclas especiales
    switch (event.code) {
        case 'Space':
            // Alternar entre inicio y pausa
            toggleStartPause();
            event.preventDefault();
            break;
        case 'Escape':
            // Mostrar/ocultar menú de pausa
            handleEscapeKey();
            event.preventDefault();
            break;
    }
}

// Alternar entre inicio y pausa con la tecla espaciadora
function toggleStartPause() {
    const gameState = getGameState();
    
    if (!gameState.isRunning) {
        handleStartGame();
    } else if (!gameState.isPaused) {
        handlePauseGame();
    } else {
        handleResumeGame();
    }
}

// Control del menú de pausa con la tecla Escape
function handleEscapeKey() {
    const pauseScreen = document.getElementById('pause-screen');
    const gameState = getGameState();
    
    if (gameState.isRunning && !gameState.isPaused) {
        // Pausar el juego
        handlePauseGame();
    } else if (pauseScreen && !pauseScreen.classList.contains('hidden')) {
        // Cerrar el menú de pausa y reanudar
        handleResumeGame();
    }
}

// Botón iniciar
function handleStartGame() {
    const bpmInput = document.getElementById('bpm');
    const bpm = parseInt(bpmInput.value) || 120;
    
    startGame(bpm);
    
    // Actualizar UI
    document.getElementById('start').classList.add('hidden');
    document.getElementById('pause').classList.remove('hidden');
    
    // Cerrar pantalla de bienvenida si está abierta
    document.getElementById('welcome-screen').classList.add('hidden');
}

// Botón pausar
function handlePauseGame() {
    pauseGame();
    
    // Mostrar pantalla de pausa
    document.getElementById('pause-screen').classList.remove('hidden');
}

// Botón reanudar
function handleResumeGame() {
    // Ocultar pantalla de pausa
    document.getElementById('pause-screen').classList.add('hidden');
    
    // Reanudar juego
    startGame();
}

// Botón resetear
function handleResetGame() {
    resetGame();
    
    // Actualizar UI
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('start').classList.remove('hidden');
    document.getElementById('pause').classList.add('hidden');
}

// Botón salir
function handleExitGame() {
    resetGame();
    
    // Mostrar pantalla de bienvenida
    document.getElementById('welcome-screen').classList.remove('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('start').classList.remove('hidden');
    document.getElementById('pause').classList.add('hidden');
}

// Cambio de BPM
function handleBpmChange(event) {
    const bpm = parseInt(event.target.value) || 120;
    // Limitar BPM al rango permitido
    event.target.value = Math.max(40, Math.min(300, bpm));
}

// Cambio de volumen
function handleVolumeChange(event) {
    const volume = parseInt(event.target.value);
    setVolume(volume);
}

// Comenzar desde pantalla de bienvenida
function handleWelcomeStart() {
    document.getElementById('welcome-screen').classList.add('hidden');
}

// Mostrar tutorial
function showTutorial() {
    document.getElementById('tutorial').classList.remove('hidden');
}

// Cerrar tutorial
function closeTutorial() {
    document.getElementById('tutorial').classList.add('hidden');
}
