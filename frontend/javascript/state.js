// state.js
// Variables globales dinámicas
let ws = null;
let isRecording = false;
let startTime = 0;
let recTimerInt = null;
let isDemoRunning = false;
let loopActive = false;
let telemetrySeries = []; 
let trail = [];            

// Constantes de configuración estática
const COLORS = {
  g: "#00d1ff", phi: "#8b5cf6", acel: "#00cc66", fren: "#ff3333",
  fi: "#f59e0b", fd: "#f97316", ti: "#3b82f6", td: "#06b6d4",
  tfi: "#ff7849", tfd: "#ff8f4c", tti: "#ff5f55", ttd: "#ff3b47",
  pfi: "#8ab4ff", pfd: "#6fa0ff", pti: "#5a91ff", ptd: "#3f7fff",
};

const METRICS = [
  { key: "g", label: "Fuerza g" }, { key: "phi", label: "Giro" },
  { key: "acel", label: "Acelerador" }, { key: "fren", label: "Freno" },
  { key: "fi", label: "Suspensión FI" }, { key: "fd", label: "Suspensión FD" },
  { key: "ti", label: "Suspensión TI" }, { key: "td", label: "Suspensión TD" },
  { key: "tfi", label: "Temp FI" }, { key: "tfd", label: "Temp FD" },
  { key: "tti", label: "Temp TI" }, { key: "ttd", label: "Temp TD" },
  { key: "pfi", label: "Pres FI" }, { key: "pfd", label: "Pres FD" },
  { key: "pti", label: "Pres TI" }, { key: "ptd", label: "Pres TD" },
];

const chartMetricSets = [
  new Set(["g", "phi", "acel", "fren"]),
  new Set(["fi", "fd", "ti", "td"]),
  new Set(["tfi", "tfd", "tti", "ttd"]),
  new Set(["pfi", "pfd", "pti", "ptd"]),
];

const SENSOR_LIMITS = {
  MAX_TEMP: 120,
  MAX_PRESSURE: 40,
  MAX_SUSPENSION: 10
};