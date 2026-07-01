/**
 * @file comms.js
 * @description Gestión de comunicaciones de red y puente IPC con el backend de Python.
 * Maneja la recepción de datos vía WebSockets desde el hardware y el flujo de 
 * control para grabación y simulación (Demo).
 */

/**
 * Establece la conexión WebSocket con el hardware (ESP32).
 * Procesa los paquetes JSON entrantes, actualiza la UI y despacha datos a la API de Python.
 */
function connect() {
  document.getElementById("btn-history").classList.remove("active");
  isHistoryMode = false;
  const btnConnect = document.getElementById("btn-connect");
  const connIcon = document.getElementById("connect-status-icon");

  if (isDemoRunning) {
    stopDemo();
  }

  clearChartData();
  resetUiIndicators();


  const sliderContainer = document.getElementById('timeline-container');
  if (sliderContainer) sliderContainer.style.display = 'none';

  const ip = document.getElementById("ipInput").value;
  if (ws) ws.close();

  ws = new WebSocket(`ws://${ip}:81`);

  ws.onopen = () => {
    console.log("Conectado al ESP32/Hardware");
    if (!isRecording) startTime = performance.now();
    if (typeof setZoomEnabled === 'function') setZoomEnabled(false);
    btnConnect.classList.add("active");
    document.querySelector('.main-container').classList.remove('disconnected-state');

    if (connIcon) connIcon.src = "assets/menu-bar/connect-icon.svg"
  };

  ws.onclose = () => {
    btnConnect.classList.remove("active");
    if (!isDemoRunning && !isHistoryMode) document.querySelector('.main-container').classList.add('disconnected-state');
    if (connIcon) connIcon.src = "assets/menu-bar/disconnect-icon.svg"
  };


  ws.onerror = () => {
    btnConnect.classList.remove("active");
    if (!isDemoRunning && !isHistoryMode) document.querySelector('.main-container').classList.add('disconnected-state');
    if (connIcon) connIcon.src = "assets/menu-bar/disconnect-icon.svg"
  };

  ws.onmessage = (e) => {
    try {
      const j = JSON.parse(e.data);
      const d = {
        g: j.g || 0, x: j.x || 0, y: j.y || 0, phi: j.phi || 0,
        acel: j.acel || 0, fren: j.fren || 0,
        fi: j.fi || 0, fd: j.fd || 0, ti: j.ti || 0, td: j.td || 0,
        // tfi: Math.max(0, j.tfi || 0), tfd: Math.max(0, j.tfd || 0),
        // tti: Math.max(0, j.tti || 0), ttd: Math.max(0, j.ttd || 0),
        rpmFi: j.rpmFi || 0, rpmFd: j.rpmFd || 0, rpmTi: j.rpmTi || 0, rpmTd: j.rpmTd || 0,
      };

      updateUI(d);
      draw(d.x, d.y);

      const t_now = (performance.now() - startTime) / 1000;
      addTelemetrySample(d, t_now);

      if (isRecording && !isDemoRunning && window.pywebview) {
        d.Time = t_now;
        window.pywebview.api.push_real_data(d);
      }
    } catch (_) { }
  };
}

/**
 * Alterna el estado de grabación de telemetría.
 * Gestiona el temporizador visual y las llamadas a la API de inicio/parada de grabación.
 */
function toggleRecord() {
  if (!window.pywebview || !window.pywebview.api) return;

  const btnRec = document.getElementById("btnRec");
  const recTimer = document.getElementById("rec-timer");
  const recIcon = document.getElementById("rec-icon");

  if (!isRecording) {
    window.pywebview.api.start_record().then(console.log);

    isRecording = true;
    startTime = performance.now();
    clearChartData();

    btnRec.classList.add("active");
    recTimer.style.display = "block";

    if (recIcon) recIcon.src = "assets/menu-bar/stop-icon.svg";

    recTimerInt = setInterval(() => {
      const totalSeconds = (performance.now() - startTime) / 1000;
      recTimer.innerText = formatTelemetryTime(totalSeconds);
    }, 1000);

  } else {

    window.pywebview.api.stop_record().then((response) => {
      const modal = document.getElementById('csvModal');
      const msg = document.getElementById('csvModalMsg');
      if (modal && msg) {
        msg.innerHTML = `<b>Sesión:</b> ${response.session_id}<br><b>Ruta:</b> ${response.path}`;
        modal.style.display = 'block';
      }
    });

    isRecording = false;
    clearInterval(recTimerInt);

    btnRec.classList.remove("active");
    recTimer.style.display = "none";

  }
}

/**
 * Realiza el polling asíncrono de datos cuando el modo simulación (Demo) está activo.
 * Se comunica con el backend de Python para obtener datos sintéticos.
 */
function pollData() {
  if (!isDemoRunning) return;

  window.pywebview.api.get_latest_data().then((response) => {
    if (!isDemoRunning) return;
    if (response) {
      let payload = JSON.parse(response);
      if (payload && payload.d) {
        updateUI(payload.d);
        draw(payload.d.x, payload.d.y);
        addTelemetrySample(payload.d, payload.elapsed);
      }
    }
    setTimeout(pollData, 50);
  }).catch((err) => {
    console.error("Error IPC:", err);
    if (isDemoRunning) {
      setTimeout(pollData, 50);
    }
  });
}

function toggleDemo() {
  if (isDemoRunning) {
    stopDemo();
  } else {
    startDemo();
  }
}

function startDemo() {
  isDemoRunning = true;
  document.getElementById("btn-history").classList.remove("active");
  isHistoryMode = false;
  isHistoryMode = false;

  if (ws) {
    ws.close();
    ws = null;
  }

  clearChartData();
  resetUiIndicators();

  if (typeof setZoomEnabled === 'function') setZoomEnabled(false);

  const sliderContainer = document.getElementById('timeline-container');
  if (sliderContainer) sliderContainer.style.display = 'none';

  const btnDemo = document.getElementById("btn-demo");
  const demoIcon = document.getElementById("demo-icon");
  if (btnDemo) btnDemo.classList.add("active");
  document.querySelector('.main-container').classList.remove('disconnected-state');
  if (demoIcon) demoIcon.src = "assets/menu-bar/stop-icon.svg";

  if (window.pywebview && window.pywebview.api) {
    if (!isRecording) startTime = performance.now();
    window.pywebview.api.start_demo().then(() => {
      if (!loopActive && isDemoRunning) {
        loopActive = true;
        pollData();
      }
    });
  } else {
    console.error("La API de Python no está conectada.");
  }
}

function stopDemo() {
  isDemoRunning = false;
  loopActive = false;

  const btnDemo = document.getElementById("btn-demo");
  const demoIcon = document.getElementById("demo-icon");
  if (btnDemo) btnDemo.classList.remove("active");
  if (demoIcon) demoIcon.src = "assets/menu-bar/start-icon.svg";
  if (typeof ws === 'undefined' || !ws || ws.readyState !== WebSocket.OPEN) {
    document.querySelector('.main-container').classList.add('disconnected-state');
  }

  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.stop_demo();
  }
}