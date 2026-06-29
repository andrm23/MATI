/**
 * @file ui.js
 * @description Gestión de la interfaz de usuario y manipulación del DOM para el sistema MATI.
 * Centraliza las funciones de actualización visual de telemetría, gestión de colores
 * dinámicos para sensores y optimización de acceso a elementos mediante caché.
 */

/**
 * Formatea el tiempo siempre como MM:SS
 * @param {number} seconds - Segundos brutos
 */
function formatTelemetryTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const ss = s.toString().padStart(2, "0");
  
  if (h > 0) {
    const mm = m.toString().padStart(2, "0");
    return `${h}:${mm}:${ss}`;
  }
  
  return `${m}:${ss}`;
}

/**
 * Caché interna para almacenar referencias a elementos del DOM.
 * @type {Object.<string, HTMLElement>}
 */
const domCache = {};

/**
 * Obtiene un elemento del DOM por su ID, utilizando un sistema de caché para optimizar el rendimiento.
 * @param {string} id - Identificador del elemento.
 * @returns {HTMLElement} El elemento del DOM solicitado.
 */
function getEl(id) {
  if (!domCache[id]) domCache[id] = document.getElementById(id);
  return domCache[id];
}

/**
 * Restringe un valor numérico dentro de un rango definido.
 * @param {number} v - Valor de entrada.
 * @param {number} min - Límite inferior.
 * @param {number} max - Límite superior.
 * @returns {number} Valor restringido al rango [min, max].
 */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Realiza una interpolación lineal entre dos colores en formato hexadecimal.
 * @param {string} c1 - Color inicial (Hex).
 * @param {string} c2 - Color final (Hex).
 * @param {number} t - Factor de mezcla (0 a 1).
 * @returns {string} Color resultante en formato rgb().
 */
function mixHex(c1, c2, t) {
  const a = c1.match(/\w\w/g).map((x) => parseInt(x, 16));
  const b = c2.match(/\w\w/g).map((x) => parseInt(x, 16));
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${m[0]}, ${m[1]}, ${m[2]})`;
}

/**
 * Genera un color dinámico según la temperatura detectada.
 * Escala: 0-80°C (Azul a Naranja) | 80-120°C (Naranja a Rojo).
 * @param {number} value - Temperatura en grados Celsius.
 * @returns {string} Representación de color en formato rgb.
 */
function temperatureColor(value) {
  const v = clamp(value, 0, SENSOR_LIMITS.MAX_TEMP);
  if (v <= 80) {
    return mixHex("1e90ff", "ff9800", v / 80);
  }
  return mixHex("ff9800", "ff1f1f", (v - 80) / 40);
}

/**
 * Genera un color dinámico para la presión de neumáticos.
 * @param {number} value - Presión en PSI.
 * @returns {string} Representación de color (Blanco a Azul).
 */
// function pressureColor(value) {
//   const v = clamp(value, 0, SENSOR_LIMITS.MAX_PRESSURE);
//   return mixHex("ffffff", "0066ff", v / SENSOR_LIMITS.MAX_PRESSURE);
// }

/**
 * Actualiza los indicadores visuales tipo "cápsula" de valor positivo (Temperatura/Presión).
 * @param {string} barId - ID del elemento barra (relleno).
 * @param {string} txtId - ID del elemento de texto.
 * @param {number} val - Valor actual del sensor.
 * @param {number} maxVal - Valor máximo de la escala.
 * @param {Function} colorFn - Función para determinar el color según el valor.
 * @param {number} [decimals=1] - Cantidad de decimales a mostrar.
 */
function updatePositiveCapsule(barId, txtId, val, maxVal, colorFn, decimals = 1) {
  const bar = getEl(barId);
  const txt = getEl(txtId);
  const value = clamp(val, 0, maxVal);
  txt.innerText = value.toFixed(decimals);
  bar.style.height = `${(value / maxVal) * 100}%`;
  bar.style.background = colorFn(value);
}

/**
 * Actualiza las cápsulas de suspensión con comportamiento bidireccional (Compresión/Extensión).
 * @param {string} barId - ID del elemento barra.
 * @param {string} txtId - ID del elemento de texto.
 * @param {number} val - Recorrido de la suspensión.
 */
function updateSuspCapsule(barId, txtId, val) {
  const bar = getEl(barId);
  getEl(txtId).innerText = val.toFixed(1);

  const maxVal = SENSOR_LIMITS.MAX_SUSPENSION;
  let pct = (Math.abs(val) / maxVal) * 50;
  if (pct > 50) pct = 50;

  if (val >= 0) {
    bar.style.background = "var(--color-pos)";
    bar.style.bottom = "50%";
    bar.style.top = "auto";
  } else {
    bar.style.background = "var(--color-neg)";
    bar.style.top = "50%";
    bar.style.bottom = "auto";
  }
  bar.style.height = `${pct}%`;
}

/**
 * Actualiza la representación visual de los pedales (Freno/Acelerador).
 * @param {string} barId - ID del elemento barra.
 * @param {string} txtId - ID del elemento de texto.
 * @param {number} val - Valor de entrada del pedal.
 */
function updatePedal(barId, txtId, val) {
  const bar = getEl(barId);
  getEl(txtId).innerText = val.toFixed(1);
  let pct = Math.abs(val) * 10;
  if (pct > 100) pct = 100;
  bar.style.height = `${pct}%`;
}

function toggleModal() {
  const modal = document.getElementById("modalInfo");
  if (modal.style.display === "none") {
    modal.style.display = "flex";
  } else {
    modal.style.display = "none";
  }
}
/**
 * Función principal de actualización de la interfaz de usuario.
 * Procesa el objeto de telemetría completo y refresca todos los componentes visuales.
 * @param {Object} d - Objeto con los datos de telemetría (G, phi, fi, fd, etc.).
 */

function updateUI(d) {
  // G-Force Display
  getEl("g-total").innerText = d.g.toFixed(2);

  // Volante (Steering Wheel rotation)
  const deg = (d.phi / 10.0) * 180;
  getEl("steering-wheel").style.transform = `rotate(${deg}deg)`;
  getEl("phi-val").innerText = d.phi.toFixed(1);

  // Suspensión
  updateSuspCapsule("bar-fl", "val-fl", d.fi);
  updateSuspCapsule("bar-fr", "val-fr", d.fd);
  updateSuspCapsule("bar-rl", "val-rl", d.ti);
  updateSuspCapsule("bar-rr", "val-rr", d.td);

  // Temperaturas
  // updatePositiveCapsule("bar-tfi", "val-tfi", d.tfi, SENSOR_LIMITS.MAX_TEMP, temperatureColor);
  // updatePositiveCapsule("bar-tfd", "val-tfd", d.tfd, SENSOR_LIMITS.MAX_TEMP, temperatureColor);
  // updatePositiveCapsule("bar-tti", "val-tti", d.tti, SENSOR_LIMITS.MAX_TEMP, temperatureColor);
  // updatePositiveCapsule("bar-ttd", "val-ttd", d.ttd, SENSOR_LIMITS.MAX_TEMP, temperatureColor);

  // Presiones
  // updatePositiveCapsule("bar-pfi", "val-pfi", d.pfi, SENSOR_LIMITS.MAX_PRESSURE, pressureColor);
  // updatePositiveCapsule("bar-pfd", "val-pfd", d.pfd, SENSOR_LIMITS.MAX_PRESSURE, pressureColor);
  // updatePositiveCapsule("bar-pti", "val-pti", d.pti, SENSOR_LIMITS.MAX_PRESSURE, pressureColor);
  // updatePositiveCapsule("bar-ptd", "val-ptd", d.ptd, SENSOR_LIMITS.MAX_PRESSURE, pressureColor);

  // RPMs por rueda
  getEl("rpm-fi").innerText = Math.round(d.rpmFi || 0);
  getEl("rpm-fd").innerText = Math.round(d.rpmFd || 0);
  getEl("rpm-ti").innerText = Math.round(d.rpmTi || 0);
  getEl("rpm-td").innerText = Math.round(d.rpmTd || 0);

  // Pedales
  updatePedal("bar-brake", "val-brake", d.fren);
  updatePedal("bar-throttle", "val-throttle", d.acel);
}

function showUpdateNotification(data) {
  const version = data.version;
  const notes = data.changelog || "Mejoras generales de MATI.";

  const userChoice = confirm(`Nueva versión disponible: v${version}`);

  if (userChoice) {
    window.pywebview.api.open_releases_page();
  }
}

// Solicita la versión a Python y la pinta en el modal de información
window.addEventListener('pywebviewready', function () {
  window.pywebview.api.get_app_version().then(function (version) {
    const versionEl = document.getElementById('app-version');
    if (versionEl) {
      versionEl.innerText = "v" + version;
    }
  });
});

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#btn-tab-telemetry, #btn-tab-charts').forEach(el => el.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`btn-tab-${tabName}`).classList.add('active');

  if (tabName == 'charts') {
    charts.forEach(chart => {
      chart.resize();
      chart.update('none');
    });
  }
}

function toggleHistoryModal() {
  const modal = document.getElementById('modalHistory');
  const btnHistory = document.getElementById('btn-history');

  if (modal.style.display === 'none' || modal.style.display === '') {
    modal.style.display = 'flex';
    btnHistory.classList.add("active");
    updateHistoryList();
  } else {
    modal.style.display = 'none';
    if (!isHistoryMode) {
      btnHistory.classList.remove("active");
      if (!isDemoRunning && (typeof ws === 'undefined' || !ws || ws.readyState !== WebSocket.OPEN)) {
        document.querySelector('.main-container').classList.add('disconnected-state');
      }
    }
  }
}

/**
 * Solicita a Python las sesiones únicas guardadas en el archivo .mati.
 */
async function updateHistoryList() {
  const select = document.getElementById('historySessionSelect');

  const sessions = await window.pywebview.api.get_history_sessions();

  select.innerHTML = '<option value="">Selecciona una carrera...</option>';
  sessions.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });
}

async function loadHistoryData() {
  if (isDemoRunning) stopDemo(); // Detener demo antes de cargar
  isHistoryMode = true;
  const session = document.getElementById('historySessionSelect').value;
  const fileInput = document.getElementById('csvFileInput');

  if (fileInput.files.length > 0) {
    // Caso A: El usuario seleccionó un archivo local
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => processExternalCSV(e.target.result);
    reader.readAsText(file);
  } else if (session) {
    // Caso B: El usuario eligió una sesión de la DB encriptada
    const data = await window.pywebview.api.get_session_data(session);
    displayHistoricalData(data);
  } else {
    alert("Por favor selecciona una sesión o carga un archivo CSV.");
  }
}

/**
 * Procesa el CSV externo y lo convierte al formato de MATI.
 */
function processExternalCSV(text) {
  const lines = text.trim().split('\n');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 9) continue;
    data.push({
      time: parseFloat(cols[0]), g: parseFloat(cols[1]), phi: parseFloat(cols[2]),
      acel: parseFloat(cols[3]), fren: parseFloat(cols[4]), fi: parseFloat(cols[5]),
      fd: parseFloat(cols[6]), ti: parseFloat(cols[7]), td: parseFloat(cols[8]),
      // tfi: parseFloat(cols[9]), tfd: parseFloat(cols[10]), tti: parseFloat(cols[11]), ttd: parseFloat(cols[12])
    });
  }
  displayHistoricalData(data);
}

function displayHistoricalData(data) {
  if (data.length === 0) return;
  isHistoryMode = true;
  document.getElementById("btn-history").classList.add("active");
  if (data.length === 0) return alert("No hay datos en el archivo.");

  isHistoryMode = true;
  telemetrySeries.length = 0;
  data.forEach(d => telemetrySeries.push(d));
  document.querySelector('.main-container').classList.remove('disconnected-state');

  const maxTime = data[data.length - 1].time;

  charts.forEach(chart => {
    if (chart.options.plugins.zoom) {
      chart.options.plugins.zoom.limits.x.max = maxTime;
    }
    chart.options.scales.x.min = 0;
    chart.options.scales.x.max = 60;
    chart.update('none');
  });

  refreshCharts();
  switchTab('charts');
  toggleHistoryModal();

  const sliderContainer = document.getElementById('timeline-container');
  const slider = document.getElementById('historySlider');
  const timeLabel = document.getElementById('timeline-val');

  if (sliderContainer && slider) {
    sliderContainer.style.display = 'block';

    slider.max = Math.max(0, maxTime - 60);
    slider.value = 0;
    slider.style.setProperty('--slider-progress', '0%');

    timeLabel.innerText = `${formatTelemetryTime(0)} - ${formatTelemetryTime(60)}`;

    slider.oninput = function () {
      const start = parseFloat(this.value);
      
      let windowSize = 60;
      if (typeof charts !== 'undefined' && charts.length > 0 && charts[0].options.scales.x.max !== undefined) {
          windowSize = charts[0].options.scales.x.max - charts[0].options.scales.x.min;
      }
      
      const percent = (this.max > 0) ? (this.value / this.max) * 100 : 0;
      this.style.setProperty('--slider-progress', `${percent}%`);

      const end = start + windowSize;

      timeLabel.innerText = `${formatTelemetryTime(start)} - ${formatTelemetryTime(end)}`;

      charts.forEach(chart => {
        chart.options.scales.x.min = start;
        chart.options.scales.x.max = end;
        chart.update('none');
      });
    };
  }
}

/**
 * Limpia la selección del archivo CSV para permitir usar la DB de nuevo.
 */
function clearCSVSelection() {
  const fileInput = document.getElementById('csvFileInput');
  if (fileInput) {
    fileInput.value = ""; // Resetea el input
    console.log("Selección de CSV limpiada.");
  }
}

function resetUiIndicators() {
  const zeros = {
    g: 0, phi: 0, acel: 0, fren: 0,
    fi: 0, fd: 0, ti: 0, td: 0,
    tfi: 0, tfd: 0, tti: 0, ttd: 0,
    rpmFi: 0, rpmFd: 0, rpmTi: 0, rpmTd: 0
  }
  updateUI(zeros);
  // clearChartData();
}