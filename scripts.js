/* scripts.js */

/*
  Esta versión integra mejoras de UX y UI, manteniendo la lógica musical del juego.
  Las figuras caen según un patrón rítmico de batería y se reproducen sonidos
  al capturarlas en los carriles correspondientes (0: bombo, 1: hi-hat, 2: caja, 3: tom).
  Además, se implementan animaciones visuales para aciertos y errores.
*/

// Configuración básica y variables globales
const SHAPE_SIZE = 60;            // Tamaño de la figura (en píxeles)
const NUM_LANES = 4;              // Número de carriles
const GAME_AREA_HEIGHT = 500;     // Altura del área de juego (debe coincidir con CSS)
const TARGET_ZONE_HEIGHT = 50;    // Altura de la zona objetivo
const FALL_SPEED = 200;           // Velocidad de caída en píxeles por segundo

// BPM (ajustable mediante el input)
let bpmInput = document.getElementById("bpm");
let bpm = parseInt(bpmInput.value);

/**
 * Calcula el intervalo de aparición de cada figura basado en BPM.
 * Se asume que cada nota es una corchea: (60000 / BPM) / 2
 */
function getSpawnInterval() {
  return (60000 / bpm) / 2;
}

// Patrón rítmico predefinido (arreglo cíclico)
const drumPattern = [0, 1, 2, 1, 0, 1, 3, 1];
let patternIndex = 0;  // Índice actual del patrón

// Variables de control del juego
let fallingShapes = [];         // Arreglo que contendrá las figuras activas
let lastFrameTime = null;       // Para calcular deltaTime en la animación
let animationFrameId = null;    // ID del requestAnimationFrame
let spawnIntervalId = null;     // ID del setInterval para generar figuras
let gameRunning = false;        // Indicador del estado del juego
let hits = 0, misses = 0;       // Contadores de desempeño

// Referencias a elementos del DOM
const gameArea = document.getElementById("game-area");
const targetZone = document.getElementById("target-zone");
const hitsDisplay = document.getElementById("hits");
const missesDisplay = document.getElementById("misses");

// Carga de sonidos para cada instrumento (ajusta las rutas según disponibilidad)
const kickSound = new Audio('sounds/kick.wav');      // Carril 0
const hiHatSound = new Audio('sounds/hihat.wav');      // Carril 1
const snareSound = new Audio('sounds/snare.wav');      // Carril 2
const tomSound = new Audio('sounds/tom.wav');          // Carril 3

/**
 * Reproduce el sonido correspondiente según el carril.
 * @param {number} lane - Número del carril (0 a 3).
 */
function playDrumSound(lane) {
  switch(lane) {
    case 0:
      kickSound.currentTime = 0;
      kickSound.play();
      break;
    case 1:
      hiHatSound.currentTime = 0;
      hiHatSound.play();
      break;
    case 2:
      snareSound.currentTime = 0;
      snareSound.play();
      break;
    case 3:
      tomSound.currentTime = 0;
      tomSound.play();
      break;
    default:
      break;
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
  
  const laneWidth = gameArea.clientWidth / NUM_LANES;
  const xPos = lane * laneWidth + (laneWidth - SHAPE_SIZE) / 2;
  
  // Posición inicial por encima del área de juego
  const initialY = -SHAPE_SIZE;
  shapeEl.style.left = `${xPos}px`;
  shapeEl.style.top = `${initialY}px`;
  
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
      animateError();
      gameArea.removeChild(shape.element);
      fallingShapes.splice(i, 1);
      misses++;
      missesDisplay.textContent = misses;
    }
  }
  
  animationFrameId = requestAnimationFrame(gameLoop);
}

/**
 * Inicia el juego: activa la animación y genera figuras según el intervalo calculado.
 */
function startGame() {
  bpm = parseInt(bpmInput.value);
  if (!gameRunning) {
    gameRunning = true;
    lastFrameTime = null;
    animationFrameId = requestAnimationFrame(gameLoop);
    spawnIntervalId = setInterval(spawnShape, getSpawnInterval());
  }
}

/**
 * Pausa el juego: detiene el loop de animación y la generación de figuras.
 */
function pauseGame() {
  gameRunning = false;
  cancelAnimationFrame(animationFrameId);
  clearInterval(spawnIntervalId);
}

/**
 * Reinicia el juego: detiene la animación, elimina figuras y reinicia contadores.
 */
function resetGame() {
  pauseGame();
  fallingShapes.forEach(shape => {
    if (gameArea.contains(shape.element)) {
      gameArea.removeChild(shape.element);
    }
  });
  fallingShapes = [];
  hits = 0;
  misses = 0;
  hitsDisplay.textContent = hits;
  missesDisplay.textContent = misses;
  patternIndex = 0;
}

/**
 * Verifica si hay una figura en el carril indicado (por la tecla presionada)
 * dentro de la zona objetivo. Si es así, reproduce el sonido, anima el acierto y elimina la figura.
 * Si no, registra un error y anima.
 * @param {number} lane - Número del carril (0 a 3).
 */
function checkForHit(lane) {
  const targetZoneTop = gameArea.clientHeight - TARGET_ZONE_HEIGHT;
  let hitFound = false;
  
  for (let i = 0; i < fallingShapes.length; i++) {
    const shape = fallingShapes[i];
    if (shape.lane === lane) {
      const shapeBottom = shape.y + SHAPE_SIZE;
      if (shapeBottom >= targetZoneTop && shape.y <= gameArea.clientHeight) {
        hitFound = true;
        animateHit();
        playDrumSound(lane);
        gameArea.removeChild(shape.element);
        fallingShapes.splice(i, 1);
        hits++;
        hitsDisplay.textContent = hits;
        break;
      }
    }
  }
  
  if (!hitFound) {
    animateError();
    misses++;
    missesDisplay.textContent = misses;
  }
}

/**
 * Aplica animación de acierto (pulso verde) a la zona objetivo.
 */
function animateHit() {
  targetZone.classList.add('hit-animation');
  targetZone.addEventListener('animationend', () => {
    targetZone.classList.remove('hit-animation');
  }, { once: true });
}

/**
 * Aplica animación de error (temblor rojo) a la zona objetivo.
 */
function animateError() {
  targetZone.classList.add('error-animation');
  targetZone.addEventListener('animationend', () => {
    targetZone.classList.remove('error-animation');
  }, { once: true });
}

/**
 * Mapea las teclas D, F, J, K a los carriles 0 a 3 respectivamente.
 */
document.addEventListener("keydown", function(e) {
  const key = e.key.toLowerCase();
  let lane = null;
  if (key === "d") lane = 0;
  else if (key === "f") lane = 1;
  else if (key === "j") lane = 2;
  else if (key === "k") lane = 3;
  
  if (lane !== null) {
    checkForHit(lane);
  }
});

// Eventos de botones
document.getElementById("start").addEventListener("click", startGame);
document.getElementById("pause").addEventListener("click", pauseGame);
document.getElementById("reset").addEventListener("click", resetGame);
