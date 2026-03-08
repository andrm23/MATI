// app.js
// Orquestador principal e inicialización de la interfaz

document.addEventListener("DOMContentLoaded", () => {
  // Inicializador los checkboxes de las gráficas
  buildMetricControls("metricControls1", chartMetricSets[0]);
  buildMetricControls("metricControls2", chartMetricSets[1]);
  buildMetricControls("metricControls3", chartMetricSets[2]);
  buildMetricControls("metricControls4", chartMetricSets[3]);
  
  // Dibujo del radar de fuerzas G en reposo
  draw(0, 0);
  
  // Refresh de los canvas de Chart.js vacíos
  refreshCharts();
});