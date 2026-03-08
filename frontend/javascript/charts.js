// charts.js
// Renderizado de gráficas (Chart.js) y radar de fuerzas G (Canvas nativo)

const canvas = document.getElementById("gPlot");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const size = Math.min(window.innerWidth * 0.33, 520);
  canvas.width = size;
  canvas.height = size;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function draw(x, y) {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const scale = w / 6;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.stroke();

  ctx.fillStyle = "#444";
  ctx.font = "12px Roboto Mono";
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, scale * i, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(`${i}G`, cx + 5, cy - scale * i + 12);
  }

  const sx = cx + x * scale;
  const sy = cy - y * scale;
  trail.push({ x: sx, y: sy });
  if (trail.length > 50) trail.shift();

  if (trail.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,170,255,0.6)";
    ctx.lineWidth = 5;
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.shadowBlur = 100;
  ctx.arc(sx, sy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "TIME (s, ascendente)", color: "#d0d0d0" },
        ticks: { color: "#adadad" },
        grid: { color: "#222" },
      },
      y: {
        title: { display: true, text: "Valor", color: "#d0d0d0" },
        ticks: { color: "#adadad" },
        grid: { color: "#222" },
      },
    },
    plugins: {
      legend: { labels: { color: "#f2f2f2" } },
      zoom: {
        pan: { enabled: true, mode: "xy" },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "xy",
        },
      },
    },
  };
}

const charts = [1, 2, 3, 4].map((n) => new Chart(document.getElementById(`telemetryChart${n}`), {
  type: "line",
  data: { datasets: [] },
  options: chartOptions(),
}));

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

function refreshCharts() {
  const sorted = [...telemetrySeries].sort((a, b) => a.time - b.time);
  charts.forEach((chart, idx) => {
    chart.data.datasets = buildDatasets(telemetrySeries, chartMetricSets[idx]);
    chart.update("none");
  });
}

function addTelemetrySample(d, timeSeconds) {
  telemetrySeries.push({ time: timeSeconds, ...d });
  if (telemetrySeries.length > 2800) telemetrySeries.shift();

  charts.forEach((chart) => {
      chart.data.datasets.forEach((dataset) => {
        const key = dataset.metricKey;
        if (key){
          dataset.data.push({ x: timeSeconds, y: d[key]});
          if(dataset.data.length > 2800) dataset.data.shift(); 
        }
      });

      let xMax, xMin;
      if (timeSeconds <= 10) {
        xMax = 10; xMin = 0;
      } else if (timeSeconds <= 20) {
        xMax = Math.ceil(timeSeconds / 2) * 2; xMin = 0;
      } else if (timeSeconds <= 50) {
        xMax = Math.ceil(timeSeconds / 5) * 5; xMin = 0;
      } else if (timeSeconds <= 100) {
        xMax = Math.ceil(timeSeconds / 10) * 10; xMin = 0;
      } else {
        xMax = Math.ceil(timeSeconds / 20) * 20;
        xMin = Math.max(0, xMax - 120);
      }

      chart.options.scales.x.max = xMax;
      chart.options.scales.x.min = xMin;
      chart.update("none");
  });
}

function resetZoom(chartInstance) {
  chartInstance.resetZoom();
}

function clearChartData() {
  telemetrySeries.length = 0;
  refreshCharts();
}

function buildMetricControls(containerId, selectedMetrics) {
  const container = document.getElementById(containerId);
  METRICS.forEach((metric) => {
    const id = `${containerId}-${metric.key}`;
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.checked = selectedMetrics.has(metric.key);
    input.onchange = () => {
      if (input.checked) selectedMetrics.add(metric.key);
      else selectedMetrics.delete(metric.key);
      refreshCharts();
    };
    label.appendChild(input);
    label.append(metric.label);
    container.appendChild(label);
  });
}