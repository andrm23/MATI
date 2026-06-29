/**
 * @file charts.js
 * @description Gestión de visualización gráfica de MATI. 
 * Controla el radar de fuerzas G mediante Canvas nativo y las gráficas temporales 
 * utilizando la librería Chart.js con soporte de zoom y pan.
 */

const canvas = document.getElementById("gPlot");
const ctx = canvas.getContext("2d");

/**
 * Ajusta las dimensiones del canvas del radar según el tamaño de la ventana.
 */
function resizeCanvas() {
  const size = Math.min(window.innerWidth * 0.33, 520);
  canvas.width = size;
  canvas.height = size;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/**
 * Renderiza el radar de fuerzas G y la estela (trail) de movimiento.
 * @param {number} x - Fuerza G lateral.
 * @param {number} y - Fuerza G longitudinal.
 */
function draw(x, y) {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const scale = w / 6;

  ctx.clearRect(0, 0, w, h);

  // Dibujo de ejes y círculos de referencia (1G, 2G, 3G)
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
  ctx.moveTo(0, cy); ctx.lineTo(w, cy);
  ctx.stroke();

  ctx.fillStyle = "#444";
  ctx.font = "12px Roboto Mono";
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, scale * i, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(`${i}G`, cx + 5, cy - scale * i + 12);
  }

  // Cálculo de posición actual y gestión de la estela
  const sx = cx + x * scale;
  const sy = cy - y * scale;
  trail.push({ x: sx, y: sy });
  if (trail.length > 50) trail.shift();

  // Renderizado de la estela
  if (trail.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,170,255,0.6)";
    ctx.lineWidth = 5;
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
  }

  // Punto indicador de posición actual
  ctx.beginPath();
  ctx.fillStyle = "#f0f0f0";
  ctx.arc(sx, sy, 8, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Define la configuración base para las instancias de Chart.js.
 * @returns {Object} Objeto de configuración con escalas y plugins de zoom.
 */
function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    scales: {
      x: {
        type: "linear",
        title: {
          display: true,
          text: "TIEMPO ᴍᴍ:ss",
          color: "#d0d0d0"
        },
        ticks: {
          color: "#adadad",
          callback: function (value) {
            if (typeof formatTelemetryTime === 'function') {
              return formatTelemetryTime(value);
            }
            return value;
          },
          font: {
            family: "'Roboto Mono', monospace",
            size: 10
          }
        },
        grid: { color: "#222" }
      },
      y: {
        title: { display: true, text: "Valor", color: "#d0d0d0" },
        ticks: { color: "#adadad" },
        grid: { color: "#222" }
      },
    },
    plugins: {
      legend: { display: false },
      zoom: {
        limits: {
          x: {
            min: 0, // No permitir scrollear a tiempo negativo
            minRange: 10, // Mínimo 10 segundos de zoom in (para evitar etiquetas sin decimales repetidas)
            maxRange: 60 // Máximo 60 segundos (1 minuto) de zoom out
          }
        },
        pan: {
          enabled: true,
          mode: 'x',
          onPan: syncCharts
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x',
          onZoom: syncCharts
        }
      }
    }
  };
}

/**
 * Sincroniza todas las gráficas y el slider con la ventana de zoom actual.
 * Llamada automáticamente por los eventos onZoom y onPan de Chart.js.
 */
function syncCharts({ chart }) {
  const min = chart.scales.x.min;
  const max = chart.scales.x.max;
  
  charts.forEach(c => {
    if (c !== chart) {
      c.options.scales.x.min = min;
      c.options.scales.x.max = max;
      c.update('none');
    }
  });

  const slider = document.getElementById('historySlider');
  const timeLabel = document.getElementById('timeline-val');
  if (slider && slider.parentElement.style.display !== 'none') {
    const windowSize = max - min;
    const absMax = chart.options.plugins.zoom.limits.x.max;
    if (absMax !== undefined) {
      slider.max = Math.max(0, absMax - windowSize);
    }
    slider.value = min;
    const percent = (slider.max > 0) ? (slider.value / slider.max) * 100 : 0;
    slider.style.setProperty('--slider-progress', `${percent}%`);
    
    if (typeof formatTelemetryTime === 'function') {
      timeLabel.innerText = `${formatTelemetryTime(min)} - ${formatTelemetryTime(max)}`;
    }
  }
}

// Inicialización de las 4 gráficas del dashboard
const charts = [1, 2, 3, 4].map((n) => new Chart(document.getElementById(`telemetryChart${n}`), {
  type: "line",
  data: { datasets: [] },
  options: chartOptions(),
}));

// Añadir evento para restablecer el zoom con doble clic
charts.forEach(chart => {
  if (chart.canvas) {
    chart.canvas.addEventListener('dblclick', () => {
      if (typeof isHistoryMode !== 'undefined' && isHistoryMode) {
        // En historial: mantener el punto de inicio actual pero reiniciar la ventana a 60s
        let currentMin = chart.options.scales.x.min || 0;
        let newMax = currentMin + 60;
        charts.forEach(c => {
          c.resetZoom('none');
          c.options.scales.x.min = currentMin;
          c.options.scales.x.max = newMax;
          c.update('none');
        });
        const slider = document.getElementById('historySlider');
        if (slider) slider.dispatchEvent(new Event('input'));
      } else {
        // En tiempo real: simplemente reiniciar el zoom para que el auto-scroll retome el control
        charts.forEach(c => c.resetZoom());
      }
    });
  }
});

/**
 * Construye los objetos de datos para Chart.js basados en las métricas seleccionadas.
 * @param {Array} sorted - Datos de telemetría ordenados por tiempo.
 * @param {Set} selectedMetrics - Conjunto de claves de métricas a mostrar.
 * @returns {Array} Listado de datasets configurados.
 */
function buildDatasets(sorted, selectedMetrics) {
  const datasets = [];
  selectedMetrics.forEach((metricKey) => {
    const metric = METRICS.find((m) => m.key === metricKey);
    if (!metric) return;
    datasets.push({
      metricKey: metricKey,
      label: metric.label,
      data: sorted.map((row) => ({ x: row.time, y: row[metricKey] })),
      borderColor: COLORS[metricKey] || "#cccccc",
      pointRadius: 0,
      tension: 0.16,
      borderWidth: 2,
    });
  });
  return datasets;
}

/**
 * Refresca el contenido visual de todas las gráficas activas.
 */
function refreshCharts() {
  charts.forEach((chart, idx) => {
    chart.data.datasets = buildDatasets(telemetrySeries, chartMetricSets[idx]);
    chart.update("none");
  });
}

/**
 * Agrega una muestra de telemetría y gestiona el desplazamiento automático del eje X.
 * @param {Object} d - Datos del sensor.
 * @param {number} timeSeconds - Tiempo transcurrido en segundos.
 */
function addTelemetrySample(d, timeSeconds) {
  if (isHistoryMode) return;

  telemetrySeries.push({ time: timeSeconds, ...d });
  if (telemetrySeries.length > 2800) telemetrySeries.shift();

  charts.forEach((chart, idx) => {
    if (!chart) return;

    if (chart.data.datasets && chart.data.datasets.length > 0) {
      chart.data.datasets.forEach((dataset) => {
        const key = dataset.metricKey;
        if (key && d[key] !== undefined) {
          dataset.data.push({ x: timeSeconds, y: d[key] });
          if (dataset.data.length > 2800) dataset.data.shift();
        }
      });
    }

    let xMax, xMin;
    if (timeSeconds <= 60) {
      xMax = 60; 
      xMin = 0;
    } else {
      xMax = timeSeconds;
      xMin = timeSeconds - 60; // Ventana estricta de 60 segundos
    }

    if (chart.options.plugins && chart.options.plugins.zoom) {
      chart.options.plugins.zoom.limits.x.max = xMax;
    }

    if (!chart.isZoomedOrPanned || !chart.isZoomedOrPanned()) {
      chart.options.scales.x.max = xMax;
      chart.options.scales.x.min = xMin;
    }

    chart.update("none");
  });
}

/**
 * Restablece el nivel de zoom de una gráfica específica.
 * @param {Object} chartInstance - Instancia de Chart.js a resetear.
 */
function resetZoom(chartInstance) {
  chartInstance.resetZoom();
}

/**
 * Limpia el búfer de datos de telemetría y vacía las gráficas.
 */
function clearChartData() {
  telemetrySeries.length = 0;

  charts.forEach(chart => {
    if (!chart) return;

    // vaciado del dataset
    chart.data.datasets.forEach(dataset => {
      dataset.data = [];
    });

    // Reinicio del eje X
    chart.options.scales.x.min = 0;
    chart.options.scales.x.max = 10; // Rango inicial de 10 segundos

    chart.update('none');
  });

  // Reset del radar de Gs
  trail.length = 0;
  draw(0, 0);

  if (typeof resetUiIndicators === 'function') resetUiIndicators();
}

/**
 * Crea dinámicamente los controles (checkboxes) para activar/desactivar métricas.
 * @param {string} containerId - ID del contenedor HTML.
 * @param {Set} selectedMetrics - Conjunto de métricas vinculadas al contenedor.
 */
function buildMetricControls(containerId, selectedMetrics) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const categorias = {
    din: "DIN",
    ctrl: "CTRL",
    susp: "SUSP",
    temp: "TEMP"
  };

  Object.keys(categorias).forEach(catKey => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "metric-group";

    const catMetrics = METRICS.filter(m => m.cat === catKey);

    catMetrics.forEach(metric => {
      const btn = document.createElement("button");
      btn.innerText = metric.label;
      btn.className = "metric-btn";

      const metricColor = COLORS[metric.key] || "#444";
      btn.style.setProperty('--btn-color', metricColor);

      if (selectedMetrics.has(metric.key)) {
        btn.classList.add("active");
      }

      btn.onclick = () => {
        if (selectedMetrics.has(metric.key)) {
          selectedMetrics.delete(metric.key);
          btn.classList.remove("active");
        } else {
          selectedMetrics.add(metric.key);
          btn.classList.add("active");
        }
        refreshCharts();
      };
      groupDiv.appendChild(btn);
    });

    if (catMetrics.length > 0) container.appendChild(groupDiv);
  });
}