/**
 * @file csv_parser.js
 * @description Gestión del historial de telemetría y parseo de archivos CSV. 
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
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => processExternalCSV(e.target.result);
    reader.readAsText(file);
  } else if (session) {
    const data = await window.pywebview.api.get_session_data(session);
    displayHistoricalData(data);
  } else {
    alert("Por favor selecciona una sesión o carga un archivo CSV.");
  }
}

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
  if (typeof setZoomEnabled === 'function') setZoomEnabled(true);
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

function clearCSVSelection() {
  const fileInput = document.getElementById('csvFileInput');
  if (fileInput) {
    fileInput.value = "";
    console.log("Selección de CSV limpiada.");
  }
}
