/**
 * @file app.js
 * @description Orquestador principal e inicialización de la interfaz de usuario.
 * Este script se encarga de coordinar la configuración inicial de los controles 
 * de métricas, la renderización del radar de fuerzas G y el refresco de los 
 * lienzos de gráficas al cargar la aplicación.
 */

/**
 * Evento de inicialización que se dispara cuando el DOM está completamente cargado.
 * Configura los componentes visuales y prepara el estado inicial del dashboard.
 */
document.addEventListener("DOMContentLoaded", () => {
  
  /** * Inicialización de los paneles de control de métricas.
   * Crea dinámicamente los checkboxes para cada una de las 4 gráficas del sistema,
   * utilizando los conjuntos de métricas predefinidos en el estado global.
   */
  buildMetricControls("metricControls1", chartMetricSets[0]);
  buildMetricControls("metricControls2", chartMetricSets[1]);
  buildMetricControls("metricControls3", chartMetricSets[2]);
  buildMetricControls("metricControls4", chartMetricSets[3]);
  
  /** * Inicialización del radar de fuerzas G.
   * Dibuja el estado de reposo (0,0) en el panel de aceleración lateral y longitudinal.
   */
  draw(0, 0);
  
  /** * Refresco inicial de los componentes de Chart.js.
   * Asegura que los lienzos (canvas) de telemetría se rendericen correctamente 
   * aunque no existan datos en el búfer de entrada al inicio.
   */
  refreshCharts();
});