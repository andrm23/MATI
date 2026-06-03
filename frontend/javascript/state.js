/**
 * @file state.js
 * @description Centralización del estado global y configuración estática de MATI.
 * Define las variables dinámicas de sesión, constantes de color para la identidad 
 * visual de sensores y los límites operacionales del hardware.
 */

// VARIABLES GLOBALES DINÁMICAS

/** * Instancia del WebSocket para la comunicación con el hardware (ESP32).
 * @type {WebSocket|null} 
 */
let ws = null;

/** * Estado de la grabación de telemetría en la base de datos local.
 * @type {boolean} 
 */
let isRecording = false;

/** * Marca de tiempo (timestamp) del inicio de la grabación.
 * @type {number} 
 */
let startTime = 0;

/** * Intervalo del cronómetro visual en la barra de controles.
 * @type {number|null} 
 */
let recTimerInt = null;

/** * Indica si el modo de simulación (Demo) está activo.
 * @type {boolean} 
 */
let isDemoRunning = false;

/** * Estado del bucle de procesamiento de datos entrantes.
 * @type {boolean} 
 */
let loopActive = false;

/** * Almacén de series temporales para la renderización de gráficas.
 * @type {Array<Object>} 
 */
let telemetrySeries = []; 

/** * Estela de puntos para la visualización del radar de fuerzas G.
 * @type {Array<Object>} 
 */
let trail = [];            

/** * Indica si estamos visualizando datos históricos (bloquea el auto-scroll). */
let isHistoryMode = false;
// CONSTANTES DE CONFIGURACIÓN ESTÁTICA

/**
 * Mapeo de colores hexadecimales por tipo de métrica.
 * Utilizado para mantener la consistencia entre gráficas e indicadores visuales.
 * @constant {Object}
 */
const COLORS = {
  g: "#00d1ff", phi: "#8b5cf6", acel: "#00cc66", fren: "#ff3333",
  fi: "#f59e0b", fd: "#f97316", ti: "#3b82f6", td: "#06b6d4",
  tfi: "#ff7849", tfd: "#ff8f4c", tti: "#ff5f55", ttd: "#ff3b47",
  // pfi: "#8ab4ff", pfd: "#6fa0ff", pti: "#5a91ff", ptd: "#3f7fff",
};

/**
 * Definición de métricas disponibles, incluyendo su clave técnica y etiqueta legible.
 * @constant {Array<{key: string, label: string}>}
 */
const METRICS = [
  // DINÁMICA VEHICULAR
  { key: "g",    label: "FG",      cat: "din" },
  { key: "phi",  label: "DIR",     cat: "din" },
  
  // CONTROLES (PEDALES)
  { key: "acel", label: "ACEL",    cat: "ctrl" },
  { key: "fren", label: "FREN",    cat: "ctrl" },
  
  // SUSPENSIÓN
  { key: "fi",   label: "SUSP FI", cat: "susp" },
  { key: "fd",   label: "SUSP FD", cat: "susp" },
  { key: "ti",   label: "SUSP TI", cat: "susp" },
  { key: "td",   label: "SUSP TD", cat: "susp" },
  
  // TEMPERATURAS
  { key: "tfi",  label: "TEMP FI", cat: "temp" },
  { key: "tfd",  label: "TEMP FD", cat: "temp" },
  { key: "tti",  label: "TEMP TI", cat: "temp" },
  { key: "ttd",  label: "TEMP TD", cat: "temp" }
];

/**
 * Conjuntos predefinidos de métricas para la visualización agrupada en las 4 gráficas del dashboard.
 * @constant {Array<Set<string>>}
 */
const chartMetricSets = [
  new Set(["g", "phi", "acel", "fren"]),
  new Set(["fi", "fd", "ti", "td"]),
  new Set(["tfi", "tfd", "tti", "ttd"]),
  new Set([])
  // new Set(["pfi", "pfd", "pti", "ptd"]),
];

/**
 * Límites de escalado y alertas para los sensores del vehículo.
 * @constant {Object}
 */
const SENSOR_LIMITS = {
  /** Límite superior de temperatura en grados Celsius. */
  MAX_TEMP: 120,
  /** Límite superior de presión en PSI. */
  // MAX_PRESSURE: 40,
  /** Recorrido máximo de suspensión en unidades relativas. */
  MAX_SUSPENSION: 10
};