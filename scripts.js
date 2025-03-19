/* scripts.js - Versión mejorada con estilo Candy Crush y funcionalidades adicionales */

// =============================
// Configuración y Variables Globales
// =============================
const SHAPE_SIZE = 60;            // Tamaño de la figura (en píxeles)
const NUM_LANES = 4;              // Número de carriles
const GAME_AREA_HEIGHT = 500;     // Altura del área de juego (debe coincidir con CSS)
const TARGET_ZONE_HEIGHT = 60;    // Altura de la zona objetivo
const FALL_SPEED = 200;           // Velocidad de caída en píxeles por segundo

let bpmInput = document.getElementById("bpm");
let bpm = parseInt(bpmInput.value);

let fallingShapes = [];           // Figuras activas
let lastFrameTime = null;         // Para calcular deltaTime
let animationFrameId = null;      
let spawnIntervalId = null;       
let gameRunning = false;          
let hits = 0, misses = 0;         
let combo = 0;                    
let comboTimeout = null;          
let score = 0;                    

// Patrón de carriles (arreglo cíclico)
const drumPattern = [0, 1, 2, 1, 0, 1, 3, 1];
let patternIndex = 0;

// =============================
// Funciones Utilitarias
// =============================
function getSpawnInterval() {
  // Cada nota es una corchea: (60000 / BPM) / 2
  return (60000 / bpm) / 2;
}

// =============================
// Referencias DOM
// =============================
const gameArea = document.getElementById("game-area");
const targetZone = document.getElementById("target-zone");
const hitsDisplay = document.getElementById("hits");
const missesDisplay = document.getElementById("misses");

// =============================
// Creación de Elementos Visuales
// =============================
function createLaneElements() {
  // Divisores de carril
  for (let i = 1; i < NUM_LANES; i++) {
    const divider = document.createElement("div");
    divider.classList.add("lane-divider");
    divider.style.left = `${(i * 100) / NUM_LANES}%`;
    gameArea.appendChild(divider);
  }
  // Indicadores de teclas
  const keys = ['D', 'F', 'J', 'K'];
  for (let i = 0; i < NUM_LANES; i++) {
    const indicator = document.createElement("div");
    indicator.classList.add("lane-indicator");
    indicator.style.left = `${(i * 100) / NUM_LANES}%`;
    indicator.textContent = keys[i];
    gameArea.appendChild(indicator);
  }
  // Contador de combo
  const comboCounter = document.createElement("div");
  comboCounter.id = "combo-counter";
  comboCounter.textContent = "Combo: 0";
  gameArea.appendChild(comboCounter);
  // Cuenta regresiva
  const countdown = document.createElement("div");
  countdown.id = "countdown";
  gameArea.appendChild(countdown);
}

function createMobileControls() {
  const mobileControls = document.createElement("div");
  mobileControls.id = "mobile-controls";
  
  const keys = ['D', 'F', 'J', 'K'];
  keys.forEach((key, index) => {
    const button = document.createElement("div");
    button.classList.add("mobile-key");
    button.textContent = key;
    button.setAttribute("data-lane", index);
    
    button.addEventListener("touchstart", e => {
      e.preventDefault();
      checkForHit(index);
      button.classList.add("active");
    });
    button.addEventListener("touchend", () => button.classList.remove("active"));
    button.addEventListener("mousedown", () => {
      checkForHit(index);
      button.classList.add("active");
    });
    button.addEventListener("mouseup", () => button.classList.remove("active"));
    
    mobileControls.appendChild(button);
  });
  
  document.body.appendChild(mobileControls);
}

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
  
  document.getElementById("play-again").addEventListener("click", () => {
    popup.classList.remove("visible");
    resetGame();
    // startCountdown() se debe definir o comentar si no es necesario
    setTimeout(() => {
      if (typeof startCountdown === 'function') startCountdown();
    }, 500);
  });
}

// =============================
// Gestión de Sonidos
// =============================
let kickSound, hiHatSound, snareSound, tomSound, comboSound, errorSound, countdownSound, successSound;
let globalVolume = 1.0; // Volumen global predeterminado

function loadSounds() {
  try {
    kickSound = new Audio('zigzager-visualizer/src/assets/sounds/kick.wav');
    hiHatSound = new Audio('zigzager-visualizer/src/assets/sounds/hihat.wav');
    snareSound = new Audio('zigzager-visualizer/src/assets/sounds/snare.wav');
    tomSound = new Audio('zigzager-visualizer/src/assets/sounds/tom.wav');
    comboSound = new Audio('zigzager-visualizer/src/assets/sounds/combo.wav');
    errorSound = new Audio('zigzager-visualizer/src/assets/sounds/error.wav');
    countdownSound = new Audio('zigzager-visualizer/src/assets/sounds/countdown.wav');
    successSound = new Audio('zigzager-visualizer/src/assets/sounds/success.wav');
    
    const allSounds = [kickSound, hiHatSound, snareSound, tomSound, comboSound, errorSound, countdownSound, successSound];
    
    // Verificar soporte de audio
    if (!Audio) {
      console.warn("El navegador no soporta la reproducción de audio");
      return;
    }
    
    allSounds.forEach(sound => {
      sound.load();
      sound.volume = globalVolume;
    });
    
    // Inicializar control de volumen
    const volumeControl = document.getElementById("volume");
    if (volumeControl) {
      volumeControl.addEventListener("input", updateVolume);
      // Establecer volumen inicial
      globalVolume = volumeControl.value / 100;
      updateVolume();
    }
  } catch (e) {
    console.warn("No se pudieron cargar los sonidos:", e);
  }
}

function updateVolume() {
  const volumeControl = document.getElementById("volume");
  if (volumeControl) {
    globalVolume = volumeControl.value / 100;
    
    // Aplicar volumen a todos los sonidos
    [kickSound, hiHatSound, snareSound, tomSound, comboSound, errorSound, countdownSound, successSound]
      .filter(sound => sound)
      .forEach(sound => {
        sound.volume = globalVolume;
      });
  }
}

function playDrumSound(lane) {
  let sound;
  switch(lane) {
    case 0: sound = kickSound; break;
    case 1: sound = hiHatSound; break;
    case 2: sound = snareSound; break;
    case 3: sound = tomSound; break;
    default: return;
  }
  
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(e => console.warn("Error al reproducir sonido:", e));
  }
}

function playGameSound(type) {
  let sound;
  switch(type) {
    case 'combo': sound = comboSound; break;
    case 'error': sound = errorSound; break;
    case 'countdown': sound = countdownSound; break;
    case 'success': sound = successSound; break;
    default: return;
  }
  
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(e => console.warn("Error al reproducir sonido:", e));
  }
}

// =============================
// Lógica del Juego
// =============================
function spawnShape() {
  const shapeEl = document.createElement("div");
  shapeEl.classList.add("falling-shape");
  
  // Seleccionar el carril según el patrón
  const lane = drumPattern[patternIndex];
  patternIndex = (patternIndex + 1) % drumPattern.length;
  shapeEl.classList.add(`lane-${lane}`);
  
  const laneWidth = gameArea.clientWidth / NUM_LANES;
  const xPos = lane * laneWidth + (laneWidth - SHAPE_SIZE) / 2;
  
  // Posición inicial fuera del área de juego
  const initialY = -SHAPE_SIZE;
  shapeEl.style.left = `${xPos}px`;
  shapeEl.style.top = `${initialY}px`;
  
  // Permitir aciertos al hacer clic (ideal para móviles)
  shapeEl.addEventListener("click", () => {
    const targetRect = targetZone.getBoundingClientRect();
    const shapeRect = shapeEl.getBoundingClientRect();
    if (shapeRect.bottom >= targetRect.top && shapeRect.top <= targetRect.bottom) {
      registerHit(shapeEl, lane);
    }
  });
  
  const shapeObj = { element: shapeEl, lane: lane, y: initialY };
  fallingShapes.push(shapeObj);
  gameArea.appendChild(shapeEl);
  
  // Animación de entrada suave
  shapeEl.style.opacity = '0';
  shapeEl.style.transform = 'scale(0.8) translateY(-20px)';
  requestAnimationFrame(() => {
      shapeEl.style.opacity = '1';
      shapeEl.style.transform = 'scale(1) translateY(0)';
  });
}

function gameLoop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const deltaTime = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  
  fallingShapes.forEach((shape, index) => {
    shape.y += FALL_SPEED * deltaTime;
    shape.element.style.top = `${shape.y}px`;
    
    // Si la figura excede el área, se registra error y se elimina
    if (shape.y > gameArea.clientHeight) {
      registerMiss();
      if (gameArea.contains(shape.element)) {
        gameArea.removeChild(shape.element);
      }
      fallingShapes.splice(index, 1);
    }
  });
  
  animationFrameId = requestAnimationFrame(gameLoop);
}

function registerHit(shapeElement, lane, timingRating = 'PERFECTO', accuracy = 1.0) {
  // Animar y reproducir sonido
  shapeElement.classList.add("shape-hit");
  playDrumSound(lane);
  
  setTimeout(() => {
    if (gameArea.contains(shapeElement)) {
      gameArea.removeChild(shapeElement);
    }
  }, 300);
  
  // Eliminar de la lista de figuras
  fallingShapes = fallingShapes.filter(shape => shape.element !== shapeElement);
  
  // Actualizar puntuación y combo
  hits++;
  hitsDisplay.textContent = hits;
  combo++;
  updateCombo();
  
  // Calcular puntos basados en la precisión del hit
  const basePoints = 100;
  const accuracyMultiplier = Math.pow(accuracy, 2) * 1.5; // Premia más la precisión
  const comboMultiplier = 1 + (combo * 0.1);
  const hitPoints = Math.floor(basePoints * accuracyMultiplier * comboMultiplier);
  score += hitPoints;
  
  // Actualizar el marcador de puntuación si existe
  const scoreDisplay = document.getElementById("score");
  if (scoreDisplay) {
    scoreDisplay.textContent = score;
  }
  
  animateHit();
  showPointsIndicator(hitPoints, lane, timingRating);
  
  clearTimeout(comboTimeout);
  comboTimeout = setTimeout(() => {
    combo = 0;
    updateCombo();
  }, 2000);
}

function registerMiss() {
  misses++;
  missesDisplay.textContent = misses;
  combo = 0;
  updateCombo();
  animateError();
  playGameSound('error');
}

function updateCombo() {
  const comboCounter = document.getElementById("combo-counter");
  if (!comboCounter) return; // Verificar que el elemento existe
  
  comboCounter.textContent = `Combo: ${combo}`;
  
  // Remover clase anterior y reinicializar animación
  comboCounter.classList.remove("combo-active");
  void comboCounter.offsetWidth;
  comboCounter.classList.add("combo-active");
  
  if (combo >= 10) {
    comboCounter.style.color = "#FF4081";
    comboCounter.style.fontWeight = "bold";
    comboCounter.style.fontSize = "1.2em";
    comboCounter.style.boxShadow = "0 0 10px rgba(255, 64, 129, 0.7)";
    if (combo % 5 === 0) playGameSound('combo');
  } else if (combo >= 5) {
    comboCounter.style.color = "#FF9800";
    comboCounter.style.fontWeight = "bold";
    comboCounter.style.fontSize = "1.1em";
    comboCounter.style.boxShadow = "0 0 5px rgba(255, 152, 0, 0.5)";
  } else {
    comboCounter.style.color = "var(--color-primario)";
    comboCounter.style.fontWeight = "normal";
    comboCounter.style.fontSize = "1em";
    comboCounter.style.boxShadow = "none";
  }
}

function animateHit() {
  targetZone.classList.add("hit-animation");
  setTimeout(() => targetZone.classList.remove("hit-animation"), 300);
}

function animateError() {
  targetZone.classList.add("error-animation");
  setTimeout(() => targetZone.classList.remove("error-animation"), 600);
}

function showPointsIndicator(points, lane, timingRating = null) {
  const indicator = document.createElement("div");
  indicator.classList.add("points-indicator");
  
  // Agregar información sobre el timing
  if (timingRating) {
    indicator.innerHTML = `
      <span class="timing-rating ${timingRating.toLowerCase()}">${timingRating}</span>
      <span class="points-value">+${points}</span>
    `;
  } else {
    indicator.textContent = `+${points}`;
  }
  
  const laneWidth = gameArea.clientWidth / NUM_LANES;
  const xPos = lane * laneWidth + laneWidth / 2;
  const targetTop = targetZone.getBoundingClientRect().top;
  indicator.style.cssText = `
      position: absolute;
      left: ${xPos}px;
      top: ${targetTop - 30}px;
      font-weight: bold;
      color: white;
      text-shadow: 0 0 5px rgba(0,0,0,0.5);
      font-size: ${12 + Math.min(points/100, 8)}px;
      opacity: 0;
      transform: translateY(0) scale(0.8);
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 100;
  `;
  
  gameArea.appendChild(indicator);
  
  requestAnimationFrame(() => {
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateY(-20px) scale(1)';
  });
  
  setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateY(-40px) scale(0.8)';
      setTimeout(() => gameArea.removeChild(indicator), 500);
  }, 800);
}

// =============================
// Control del Juego
// =============================
function startGame() {
  if (gameState !== 'playing') return;
  if (!gameRunning) {
    gameRunning = true;
    createLaneElements();
    createMobileControls();
    loadSounds();
    
    // Usar deltaTime para hacer el rendering más consistente en diferentes dispositivos
    spawnIntervalId = setInterval(spawnShape, getSpawnInterval());
    lastFrameTime = null;
    animationFrameId = requestAnimationFrame(gameLoop);
    
    // Inicializar displays de puntuación
    updateUI();
  }
}

function pauseGame() {
  if (gameState !== 'playing') return;
  gameRunning = false;
  clearInterval(spawnIntervalId);
  cancelAnimationFrame(animationFrameId);
}

function resetGame() {
  gameRunning = false;
  clearInterval(spawnIntervalId);
  cancelAnimationFrame(animationFrameId);
  
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
  updateUI();
}

// =============================
// Gestión de Eventos
// =============================
document.getElementById("start").addEventListener("click", startGame);
document.getElementById("pause").addEventListener("click", pauseGame);
document.getElementById("reset").addEventListener("click", resetGame);

function checkForHit(lane) {
  const targetRect = targetZone.getBoundingClientRect();
  for (let shape of fallingShapes) {
    if (shape.lane === lane) {
      const shapeRect = shape.element.getBoundingClientRect();
      if (shapeRect.bottom >= targetRect.top && shapeRect.top <= targetRect.bottom) {
        // Calcular precisión del hit
        const targetCenter = targetRect.top + targetRect.height / 2;
        const shapeCenter = shapeRect.top + shapeRect.height / 2;
        const distance = Math.abs(targetCenter - shapeCenter);
        const accuracy = 1 - (distance / (targetRect.height / 2));
        
        let timingRating;
        if (accuracy > 0.8) {
          timingRating = 'PERFECTO';
        } else if (shapeCenter < targetCenter) {
          timingRating = 'TEMPRANO';
        } else {
          timingRating = 'TARDE';
        }
        
        registerHit(shape.element, lane, timingRating, accuracy);
        break;
      }
    }
  }
}

// Teclado: Mapea teclas D, F, J, K a los carriles 0,1,2,3
document.addEventListener("keydown", e => {
  let lane;
  switch(e.code) {
    case "KeyD": lane = 0; break;
    case "KeyF": lane = 1; break;
    case "KeyJ": lane = 2; break;
    case "KeyK": lane = 3; break;
    default: return;
  }
  checkForHit(lane);
});

// Para smartphones: se detecta click en el área de juego
gameArea.addEventListener("click", e => {
  if (e.target === gameArea) {
    const rect = gameArea.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const laneWidth = rect.width / NUM_LANES;
    const lane = Math.floor(clickX / laneWidth);
    checkForHit(lane);
  }
});

// New Game State Management
let gameState = 'welcome'; // welcome, tutorial, playing, paused, ended

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const tutorialScreen = document.getElementById('tutorial');
const pauseScreen = document.getElementById('pause-screen');
const startGameBtn = document.getElementById('start-game');
const howToPlayBtn = document.getElementById('how-to-play');
const closeTutorialBtn = document.getElementById('close-tutorial');
const resumeBtn = document.getElementById('resume');
const restartBtn = document.getElementById('restart');
const exitBtn = document.getElementById('exit');

// Event Listeners for New UI
startGameBtn.addEventListener('click', () => {
    welcomeScreen.classList.add('hidden');
    gameState = 'playing';
    startGame();
});

howToPlayBtn.addEventListener('click', () => {
    welcomeScreen.classList.add('hidden');
    tutorialScreen.classList.remove('hidden');
    gameState = 'tutorial';
});

closeTutorialBtn.addEventListener('click', () => {
    tutorialScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
    gameState = 'welcome';
});

// Pause Game Management
document.getElementById('pause').addEventListener('click', () => {
    if (gameState === 'playing') {
        pauseGame();
        pauseScreen.classList.remove('hidden');
        gameState = 'paused';
    }
});

resumeBtn.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    gameState = 'playing';
    startGame();
});

restartBtn.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    resetGame();
    startGame();
    gameState = 'playing';
});

exitBtn.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    resetGame();
    welcomeScreen.classList.remove('hidden');
    gameState = 'welcome';
});

function updateUI() {
    // Update all UI elements based on game state
    hitsDisplay.textContent = hits;
    missesDisplay.textContent = misses;
    
    const comboCounter = document.getElementById('combo-counter');
    if (comboCounter) comboCounter.textContent = `Combo: ${combo}`;
    
    const scoreDisplay = document.getElementById('score');
    if (scoreDisplay) scoreDisplay.textContent = score;
    
    const accuracyDisplay = document.getElementById('accuracy');
    if (accuracyDisplay) {
        const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;
        accuracyDisplay.textContent = `${accuracy}%`;
    }
}

// Implementación de la función startCountdown
function startCountdown() {
  const countdownEl = document.getElementById("countdown");
  gameState = 'countdown';
  
  // Reset game state
  resetGame();
  
  // Mostrar elemento de cuenta atrás
  countdownEl.style.display = "flex";
  countdownEl.style.opacity = "1";
  
  // Secuencia de cuenta atrás: 3, 2, 1, ¡YA!
  const countValues = [3, 2, 1, "¡YA!"];
  let currentIndex = 0;
  
  function showNextCount() {
    if (currentIndex < countValues.length) {
      countdownEl.textContent = countValues[currentIndex];
      countdownEl.classList.add("countdown-animation");
      
      // Reproducir sonido para cada número
      playGameSound('countdown');
      
      setTimeout(() => {
        countdownEl.classList.remove("countdown-animation");
        currentIndex++;
        setTimeout(showNextCount, 300); // Pequeña pausa entre animaciones
      }, 700); // Duración de cada número
    } else {
      // Cuenta atrás terminada, iniciar juego
      countdownEl.style.opacity = "0";
      setTimeout(() => {
        countdownEl.style.display = "none";
        gameState = 'playing';
        startGame();
      }, 500);
    }
  }
  
  // Comenzar secuencia
  showNextCount();
}

// Actualizar el gestor de BPM para que los cambios tengan efecto inmediatamente
bpmInput.addEventListener("change", function() {
  bpm = parseInt(this.value);
  
  // Si el juego está en marcha, actualizar el intervalo de generación
  if (gameRunning && spawnIntervalId) {
    clearInterval(spawnIntervalId);
    spawnIntervalId = setInterval(spawnShape, getSpawnInterval());
  }
});
