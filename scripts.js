/* scripts.js */

/*
  Este script implementa la lógica del juego en el que aparecen figuras (bloques)
  que caen desde la parte superior en 4 carriles. El jugador debe presionar
  las teclas D, F, J o K (correspondientes a cada carril) cuando una figura
  se encuentre en la zona objetivo, obteniendo aciertos o, en caso contrario, errores.
*/

// Constantes para la configuración
const SHAPE_SIZE = 60;           // Tamaño (ancho y alto) de la figura en píxeles
const NUM_LANES = 4;             // Número de carriles en el juego
const GAME_AREA_HEIGHT = 500;    // Altura del área de juego (debe coincidir con CSS)
const TARGET_ZONE_HEIGHT = 50;   // Altura de la zona objetivo (según CSS)
const FALL_SPEED = 200;          // Velocidad de caída en píxeles por segundo
const SPAWN_INTERVAL = 1000;     // Intervalo para generar nuevas figuras (ms)

// Variables de control del juego
let fallingShapes = [];          // Array para almacenar las figuras activas
let lastFrameTime = null;        // Tiempo del último frame (para cálculos de delta)
let animationFrameId = null;     // ID del requestAnimationFrame
let spawnIntervalId = null;      // ID del setInterval para generar figuras
let gameRunning = false;         // Indicador de estado del juego
let hits = 0, misses = 0;        // Contadores de desempeño

// Referencias a elementos del DOM
const gameArea = document.getElementById("game-area");
const targetZone = document.getElementById("target-zone");
const hitsDisplay = document.getElementById("hits");
const missesDisplay = document.getElementById("misses");

// --- Funciones del juego ---

/**
 * Crea y añade una nueva figura en un carril aleatorio.
 */
function spawnShape() {
  // Crear el elemento de la figura
  const shapeEl = document.createElement("div");
  shapeEl.classList.add("falling-shape");
  
  // Seleccionar un carril aleatorio (0 a NUM_LANES-1)
  const lane = Math.floor(Math.random() * NUM_LANES);
  
  // Calcular la posición horizontal según el carril
  const laneWidth = gameArea.clientWidth / NUM_LANES;
  const xPos = lane * laneWidth + (laneWidth - SHAPE_SIZE) / 2;
  
  // Posición inicial (por encima del área de juego)
  const initialY = -SHAPE_SIZE;
  shapeEl.style.left = `${xPos}px`;
  shapeEl.style.top = `${initialY}px`;
  
  // Crear el objeto figura y almacenarlo en el array
  const shapeObj = {
    element: shapeEl,
    lane: lane,
    y: initialY
  };
  fallingShapes.push(shapeObj);
  
  // Añadir la figura al área de juego
  gameArea.appendChild(shapeEl);
}

/**
 * Función principal de actualización del juego.
 * Se utiliza requestAnimationFrame para actualizar la posición de las figuras.
 * @param {DOMHighResTimeStamp} timestamp - Marca de tiempo actual.
 */
function gameLoop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const deltaTime = (timestamp - lastFrameTime) / 1000; // Convertir a segundos
  lastFrameTime = timestamp;
  
  // Actualizar la posición de cada figura
  for (let i = fallingShapes.length - 1; i >= 0; i--) {
    const shape = fallingShapes[i];
    // Incrementar la posición vertical según la velocidad y deltaTime
    shape.y += FALL_SPEED * deltaTime;
    shape.element.style.top = `${shape.y}px`;
    
    // Si la figura supera el área de juego, se cuenta como error y se elimina
    if (shape.y > gameArea.clientHeight) {
      gameArea.removeChild(shape.element);
      fallingShapes.splice(i, 1);
      misses++;
      missesDisplay.textContent = misses;
    }
  }
  
  // Solicitar el siguiente frame si el juego sigue activo
  animationFrameId = requestAnimationFrame(gameLoop);
}

/**
 * Inicia el juego: activa el loop de animación y la generación periódica de figuras.
 */
function startGame() {
  if (!gameRunning) {
    gameRunning = true;
    lastFrameTime = null;
    animationFrameId = requestAnimationFrame(gameLoop);
    spawnIntervalId = setInterval(spawnShape, SPAWN_INTERVAL);
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
 * Reinicia el juego: detiene el juego, elimina todas las figuras y reinicia los contadores.
 */
function resetGame() {
  pauseGame();
  // Eliminar todas las figuras del área de juego
  fallingShapes.forEach(shape => {
    if (gameArea.contains(shape.element)) {
      gameArea.removeChild(shape.element);
    }
  });
  fallingShapes = [];
  // Reiniciar contadores y actualizar interfaz
  hits = 0;
  misses = 0;
  hitsDisplay.textContent = hits;
  missesDisplay.textContent = misses;
}

/**
 * Verifica si hay una figura en el carril especificado que se encuentre dentro de la zona objetivo.
 * Si se detecta, se elimina la figura y se registra un acierto; de lo contrario, se registra un error.
 * @param {number} lane - Número del carril (0 a NUM_LANES-1) correspondiente a la tecla presionada.
 */
function checkForHit(lane) {
  const laneWidth = gameArea.clientWidth / NUM_LANES;
  const targetZoneTop = gameArea.clientHeight - TARGET_ZONE_HEIGHT;
  let hitFound = false;
  
  // Recorrer las figuras para detectar si hay alguna en el carril indicado y en la zona objetivo
  for (let i = 0; i < fallingShapes.length; i++) {
    const shape = fallingShapes[i];
    if (shape.lane === lane) {
      // Se calcula el borde inferior de la figura
      const shapeBottom = shape.y + SHAPE_SIZE;
      // Si la figura se encuentra en la zona objetivo, se considera acierto
      if (shapeBottom >= targetZoneTop && shape.y <= gameArea.clientHeight) {
        hitFound = true;
        // Eliminar la figura de la pantalla y del array
        gameArea.removeChild(shape.element);
        fallingShapes.splice(i, 1);
        hits++;
        hitsDisplay.textContent = hits;
        break; // Solo se registra un acierto por pulsación
      }
    }
  }
  
  // Si no se encontró ninguna figura para capturar, se cuenta como error
  if (!hitFound) {
    misses++;
    missesDisplay.textContent = misses;
  }
}

/**
 * Mapea las teclas del teclado a los carriles del juego.
 * Las teclas asignadas son: D → carril 0, F → carril 1, J → carril 2, K → carril 3.
 */
document.addEventListener("keydown", function(e) {
  const key = e.key.toLowerCase();
  let lane = null;
  if (key === "d") {
    lane = 0;
  } else if (key === "f") {
    lane = 1;
  } else if (key === "j") {
    lane = 2;
  } else if (key === "k") {
    lane = 3;
  }
  
  // Si se presionó una tecla válida, se verifica la captura en ese carril
  if (lane !== null) {
    checkForHit(lane);
  }
});

// Asignar eventos a los botones de control
document.getElementById("start").addEventListener("click", startGame);
document.getElementById("pause").addEventListener("click", pauseGame);
document.getElementById("reset").addEventListener("click", resetGame);
