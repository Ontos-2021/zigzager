/* scripts.js - Versión mejorada con estilo Candy Crush y funcionalidades adicionales */

// Configuración básica y variables globales
const SHAPE_SIZE = 60;            // Tamaño de la figura (en píxeles)
const NUM_LANES = 4;              // Número de carriles
const GAME_AREA_HEIGHT = 500;     // Altura del área de juego (debe coincidir con CSS)
const TARGET_ZONE_HEIGHT = 60;    // Altura de la zona objetivo
const FALL_SPEED = 200;           // Velocidad de caída en píxeles por segundo

// BPM (ajustable mediante el input)
let bpmInput = document.getElementById("bpm");
let bpm = parseInt(bpmInput.value);

// Variables de puntuación y desempeño
let fallingShapes = [];           // Arreglo que contendrá las figuras activas
let lastFrameTime = null;         // Para calcular deltaTime en la animación
let animationFrameId = null;      // ID del requestAnimationFrame
let spawnIntervalId = null;       // ID del setInterval para generar figuras
let gameRunning = false;          // Indicador del estado del juego
let hits = 0, misses = 0;         // Contadores de desempeño
let combo = 0;                    // Contador de combo
let comboTimeout = null;          // Timeout para resetear el combo
let score = 0;                    // Puntuación total

// Patrón rítmico predefinido (arreglo cíclico)
const drumPattern = [0, 1, 2, 1, 0, 1, 3, 1];
let patternIndex = 0;             // Índice actual del patrón

/**
 * Calcula el intervalo de aparición de cada figura basado en BPM.
 * Se asume que cada nota es una corchea: (60000 / BPM) / 2
 */
function getSpawnInterval() {
  return (60000 / bpm) / 2;
}

// Referencias a elementos del DOM
const gameArea = document.getElementById("game-area");
const targetZone = document.getElementById("target-zone");
const hitsDisplay = document.getElementById("hits");
const missesDisplay = document.getElementById("misses");

/** 
 * Crea los elementos visuales (divisores de carril, indicadores de tecla, contador de combo, cuenta regresiva)
 */
function createLaneElements() {
  // Crear divisores de carril
  for (let i = 1; i < NUM_LANES; i++) {
    const divider = document.createElement("div");
    divider.classList.add("lane-divider");
    divider.style.left = `${(i * 100) / NUM_LANES}%`;
    gameArea.appendChild(divider);
  }

  // Crear indicadores de teclas
  const keys = ['D', 'F', 'J', 'K'];
  for (let i = 0; i < NUM_LANES; i++) {
    const indicator = document.createElement("div");
    indicator.classList.add("lane-indicator");
    indicator.style.left = `${(i * 100) / NUM_LANES}%`;
    indicator.textContent = keys[i];
    gameArea.appendChild(indicator);
  }

  // Crear contador de combo
  const comboCounter = document.createElement("div");
  comboCounter.id = "combo-counter";
  comboCounter.textContent = "Combo: 0";
  gameArea.appendChild(comboCounter);

  // Crear elemento de cuenta regresiva
  const countdown = document.createElement("div");
  countdown.id = "countdown";
  gameArea.appendChild(countdown);
}

/**
 * Crea controles móviles para dispositivos táctiles
 */
function createMobileControls() {
  const mobileControls = document.createElement("div");
  mobileControls.id = "mobile-controls";
  
  const keys = ['D', 'F', 'J', 'K'];
  keys.forEach((key, index) => {
    const button = document.createElement("div");
    button.classList.add("mobile-key");
    button.textContent = key;
    button.setAttribute("data-lane", index);
    
    button.addEventListener("touchstart", function(e) {
      e.preventDefault();
      checkForHit(index);
      this.classList.add("active");
    });
    
    button.addEventListener("touchend", function() {
      this.classList.remove("active");
    });
    
    button.addEventListener("mousedown", function() {
      checkForHit(index);
      this.classList.add("active");
    });
    
    button.addEventListener("mouseup", function() {
      this.classList.remove("active");
    });
    
    mobileControls.appendChild(button);
  });
  
  document.body.appendChild(mobileControls);
}

/**
 * Crea ventana emergente de puntuación
 */
function createScorePopup() {
  const popup = document.createElement("div");
  popup.id = "score-popup";
  popup.innerHTML = `
    <h2>¡Juego terminado!</h2>
    <p>Puntuación: <span id="final-score">0</span></p>
    <p>Aciertos: <span id="final-hits">0</span></p>
    <p>Errores: <span id="final-misses">0</span></p>
    <p>Combo máx: <span id="max-combo">0</span></p>
    <button id="play-again">Jugar de nuevo</button>
  `;
  document.body.appendChild(popup);
  
  document.getElementById("play-again").addEventListener("click", function() {
    document.getElementById("score-popup").classList.remove("visible");
    resetGame();
    setTimeout(() => startCountdown(), 500);
  });
}

// Carga de sonidos para cada instrumento (ajusta las rutas según disponibilidad)
let kickSound, hiHatSound, snareSound, tomSound, comboSound, errorSound, countdownSound, successSound;

function loadSounds() {
  // Actualiza las rutas según la ubicación correcta de los archivos
  try {
    kickSound = new Audio('zigzager-visualizer/src/assets/sounds/kick.wav');
    hiHatSound = new Audio('zigzager-visualizer/src/assets/sounds/hihat.wav');
    snareSound = new Audio('zigzager-visualizer/src/assets/sounds/snare.wav');
    tomSound = new Audio('zigzager-visualizer/src/assets/sounds/tom.wav');
    comboSound = new Audio('zigzager-visualizer/src/assets/sounds/combo.wav');
    errorSound = new Audio('zigzager-visualizer/src/assets/sounds/error.wav');
    countdownSound = new Audio('zigzager-visualizer/src/assets/sounds/countdown.wav');
    successSound = new Audio('zigzager-visualizer/src/assets/sounds/success.wav');
    
    // Precarga para reducir latencia
    [kickSound, hiHatSound, snareSound, tomSound, comboSound, errorSound, countdownSound, successSound].forEach(sound => {
      sound.load();
    });
  } catch (e) {
    console.warn("No se pudieron cargar los sonidos:", e);
  }
}

/**
 * Reproduce el sonido correspondiente según el carril.
 * @param {number} lane - Número del carril (0 a 3).
 */
function playDrumSound(lane) {
  try {
    let sound;
    switch(lane) {
      case 0:
        sound = kickSound;
        break;
      case 1:
        sound = hiHatSound;
        break;
      case 2:
        sound = snareSound;
        break;
      case 3:
        sound = tomSound;
        break;
      default:
        return;
    }
    
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.warn("Error al reproducir sonido:", e));
    }
  } catch (e) {
    console.warn("Error en reproducción de audio:", e);
  }
}

/**
 * Reproduce sonido para eventos especiales.
 * @param {string} type - Tipo de sonido ('combo', 'error', etc.)
 */
function playGameSound(type) {
  try {
    let sound;
    switch(type) {
      case 'combo':
        sound = comboSound;
        break;
      case 'error':
        sound = errorSound;
        break;
      case 'countdown':
        sound = countdownSound;
        break;
      case 'success':
        sound = successSound;
        break;
      default:
        return;
    }
    
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.warn("Error al reproducir sonido:", e));
    }
  } catch (e) {
    console.warn("Error en reproducción de audio:", e);
  }
}

/**
 * Crea y añade una nueva figura en el carril definido por el patrón rítmico.
 */
function spawnShape() {
  const shapeEl = document.createElement("div");
  shapeEl.classList.add("falling-shape");
  
  // Seleccionar el carril según el patrón
  const lane = drumPattern[patternIndex];
  patternIndex = (patternIndex + 1) % drumPattern.length;
  
  // Añadir clase específica de carril para estilos diferentes
  shapeEl.classList.add(`lane-${lane}`);
  
  const laneWidth = gameArea.clientWidth / NUM_LANES;
  const xPos = lane * laneWidth + (laneWidth - SHAPE_SIZE) / 2;
  
  // Posición inicial por encima del área de juego
  const initialY = -SHAPE_SIZE;
  shapeEl.style.left = `${xPos}px`;
  shapeEl.style.top = `${initialY}px`;
  
  // Añadir evento de clic para dispositivos móviles
  shapeEl.addEventListener("click", function() {
    if (this.getBoundingClientRect().bottom >= targetZone.getBoundingClientRect().top &&
        this.getBoundingClientRect().top <= targetZone.getBoundingClientRect().bottom) {
      registerHit(this, lane);
    }
  });
  
  const shapeObj = { element: shapeEl, lane: lane, y: initialY };
  fallingShapes.push(shapeObj);
  gameArea.appendChild(shapeEl);
}

/**
 * Loop principal de animación del juego.
 * Actualiza la posición de cada figura según deltaTime.
 * @param {DOMHighResTimeStamp} timestamp - Marca de tiempo actual.
 */
function gameLoop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const deltaTime = (timestamp - lastFrameTime) / 1000; // en segundos
  lastFrameTime = timestamp;
  
  for (let i = fallingShapes.length - 1; i >= 0; i--) {
    const shape = fallingShapes[i];
    shape.y += FALL_SPEED * deltaTime;
    shape.element.style.top = `${shape.y}px`;
    
    // Si la figura excede el área de juego, se registra un error
    if (shape.y > gameArea.clientHeight) {
      registerMiss();
      gameArea.removeChild(shape.element);
      fallingShapes.splice(i, 1);
    }
  }
  
  animationFrameId = requestAnimationFrame(gameLoop);
}

/**
 * Registra un acierto cuando se golpea una figura correctamente
 * @param {HTMLElement} shapeElement - Elemento DOM de la figura
 * @param {number} lane - Carril al que pertenece la figura
 */
function registerHit(shapeElement, lane) {
  // Animar figura
  shapeElement.classList.add("shape-hit");
  
  // Reproducir sonido
  playDrumSound(lane);
  
  // Eliminar la figura después de la animación
  setTimeout(() => {
    if (gameArea.contains(shapeElement)) {
      gameArea.removeChild(shapeElement);
    }
  }, 300);
  
  // Eliminar objeto del array
  const index = fallingShapes.findIndex(shape => shape.element === shapeElement);
  if (index !== -1) {
    fallingShapes.splice(index, 1);
  }
  
  // Incrementar contadores
  hits++;
  hitsDisplay.textContent = hits;
  
  // Aumentar combo
  combo++;
  updateCombo();
  
  // Calcular puntuación con bonificación por combo
  const basePoints = 100;
  const comboMultiplier = 1 + (combo * 0.1);
  const hitPoints = Math.floor(basePoints * comboMultiplier);
  score += hitPoints;
  
  // Mostrar animación de acierto
  animateHit();
  
  // Mostrar indicador de puntos
  showPointsIndicator(hitPoints, lane);
  
  // Reiniciar temporizador de combo
  clearTimeout(comboTimeout);
  comboTimeout = setTimeout(() => {
    combo = 0;
    updateCombo();
  }, 2000);
}

/**
 * Registra un error cuando se falla o cuando una figura sale del área de juego
 */
function registerMiss() {
  misses++;
  missesDisplay.textContent = misses;
  combo = 0;
  updateCombo();
  animateError();
  playGameSound('error');
}

/**
 * Actualiza el contador de combo visible
 */
function updateCombo() {
    const comboCounter = document.getElementById("combo-counter");
    comboCounter.textContent = `Combo: ${combo}`;
    
    // Estilo para combos grandes
    if (combo >= 10) {
        comboCounter.style.color = "#FF4081";
        comboCounter.style.fontWeight = "bold";
        comboCounter.style.fontSize = "1.2em";
        comboCounter.style.boxShadow = "0 0 10px rgba(255, 64, 129, 0.7)";
        
        if (combo % 5 === 0) {
            playGameSound('combo');
        }
    } else if (combo >= 5) {
        comboCounter.style.color = "#FF9800";
        comboCounter.style.fontWeight = "bold";
        comboCounter.style.fontSize = "1.1em";
        comboCounter.style.boxShadow = "0 0 5px rgba(255, 152, 0, 0.5)";
    } else {
        // Para combos menores revertir estilos
        comboCounter.style.color = "var(--color-primario)";
        comboCounter.style.fontWeight = "normal";
        comboCounter.style.fontSize = "1em";
        comboCounter.style.boxShadow = "none";
    }
}

/**
 * Animación para indicar un acierto.
 */
function animateHit() {
  // Ejemplo: aplicar una clase que active una animación en la zona objetivo.
  targetZone.classList.add("hit-animation");
  setTimeout(() => {
    targetZone.classList.remove("hit-animation");
  }, 300);
}

/**
 * Animación para indicar un error.
 */
function animateError() {
  // Ejemplo: aplicar una clase que active una animación de error en la zona objetivo.
  targetZone.classList.add("error-animation");
  setTimeout(() => {
    targetZone.classList.remove("error-animation");
  }, 600);
}

/**
 * Muestra un indicador visual de puntos obtenidos.
 * @param {number} points - Puntos obtenidos
 * @param {number} lane - Carril donde ocurrió el acierto
 */
function showPointsIndicator(points, lane) {
  const indicator = document.createElement("div");
  indicator.classList.add("points-indicator");
  indicator.textContent = `+${points}`;
  
  // Posicionar el indicador cerca del centro del carril
  const laneWidth = gameArea.clientWidth / NUM_LANES;
  const xPos = lane * laneWidth + laneWidth / 2;
  indicator.style.left = `${xPos}px`;
  indicator.style.top = `${targetZone.getBoundingClientRect().top - 30}px`;
  indicator.style.position = "absolute";
  indicator.style.fontWeight = "bold";
  indicator.style.color = "white";
  indicator.style.textShadow = "1px 1px 2px black";
  
  gameArea.appendChild(indicator);
  setTimeout(() => {
    if(gameArea.contains(indicator)){
      gameArea.removeChild(indicator);
    }
  }, 1000);
}

function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        createLaneElements();
        createMobileControls();
        loadSounds();
        // Start spawning shapes based on BPM
        spawnIntervalId = setInterval(spawnShape, getSpawnInterval());
        lastFrameTime = null;
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function pauseGame() {
    gameRunning = false;
    clearInterval(spawnIntervalId);
    cancelAnimationFrame(animationFrameId);
}

function resetGame() {
    gameRunning = false;
    clearInterval(spawnIntervalId);
    cancelAnimationFrame(animationFrameId);
    
    // Remove all shapes
    fallingShapes.forEach(shape => {
      if (gameArea.contains(shape.element)) {
          gameArea.removeChild(shape.element);
      }
    });
    fallingShapes = [];
    
    hits = 0;
    misses = 0;
    combo = 0;
    score = 0;
    hitsDisplay.textContent = hits;
    missesDisplay.textContent = misses;
    updateCombo();
}

// Attach event listeners to control buttons
document.getElementById("start").addEventListener("click", startGame);
document.getElementById("pause").addEventListener("click", pauseGame);
document.getElementById("reset").addEventListener("click", resetGame);

function checkForHit(lane) {
    // Obtener las dimensiones de la zona objetivo
    const targetRect = targetZone.getBoundingClientRect();
    
    // Buscar la primera figura del carril que se encuentre dentro de la zona objetivo
    for (let i = 0; i < fallingShapes.length; i++) {
        const shape = fallingShapes[i];
        if (shape.lane === lane) {
            const shapeRect = shape.element.getBoundingClientRect();
            // Verificar si la figura se encuentra dentro de la zona objetivo verticalmente
            if (shapeRect.bottom >= targetRect.top && shapeRect.top <= targetRect.bottom) {
                // Se detecta un acierto
                registerHit(shape.element, lane);
                break;
            }
        }
    }
}

// ----- Reconocimiento mediante teclado -----
document.addEventListener("keydown", function(e) {
    let lane;
    // Mapea las teclas D, F, J, K a los carriles 0, 1, 2, 3 respectivamente
    switch(e.code) {
        case "KeyD":
            lane = 0;
            break;
        case "KeyF":
            lane = 1;
            break;
        case "KeyJ":
            lane = 2;
            break;
        case "KeyK":
            lane = 3;
            break;
        default:
            return; // Ignorar otras teclas
    }
    checkForHit(lane);
});

// ----- Para smartphones: Detecta click en el área de juego -----
// Si el usuario hace click en la zona vacía (no sobre una figura), se calcula el carril
gameArea.addEventListener("click", function(e) {
    // Si el click se hace directamente sobre el área de juego y no en un elemento hijo (como la figura)
    if (e.target === gameArea) {
        const rect = gameArea.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const laneWidth = rect.width / NUM_LANES;
        const lane = Math.floor(clickX / laneWidth);
        checkForHit(lane);
    }
});