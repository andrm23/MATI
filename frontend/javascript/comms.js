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
  if (isDemoRunning) stopDemo();
  
  const ip = document.getElementById("ipInput").value;
  if (ws) ws.close();
  ws = new WebSocket(`ws://${ip}:81`);
  
  ws.onopen = () => console.log("Conectado al ESP32/Hardware");
  ws.onmessage = (e) => {
    try {
      const j = JSON.parse(e.data);
      const d = {
        g: j.g || 0, x: j.x || 0, y: j.y || 0, phi: j.phi || 0,
        acel: j.acel || 0, fren: j.fren || 0,
        fi: j.fi || 0, fd: j.fd || 0, ti: j.ti || 0, td: j.td || 0,
        tfi: Math.max(0, j.tfi || 0), tfd: Math.max(0, j.tfd || 0),
        tti: Math.max(0, j.tti || 0), ttd: Math.max(0, j.ttd || 0),
        // pfi: Math.max(0, j.pfi || 0), pfd: Math.max(0, j.pfd || 0),
        // pti: Math.max(0, j.pti || 0), ptd: Math.max(0, j.ptd || 0),
        rpmFi: j.rpmFi || 0, rpmFd: j.rpmFd || 0, rpmTi: j.rpmTi || 0, rpmTd: j.rpmTd || 0,
      };
      
      updateUI(d);
      draw(d.x, d.y);
      
      const t_now = isRecording ? (performance.now() - startTime) / 1000 : performance.now() / 1000;
      addTelemetrySample(d, t_now);

      // Envío de datos al API de Python para persistencia en SQLite
      if (isRecording && !isDemoRunning && window.pywebview) {
         d.Time = t_now; 
         window.pywebview.api.push_real_data(d);
      }
    } catch (_) {}
  };
}

/**
 * Alterna el estado de grabación de telemetría.
 * Gestiona el temporizador visual y las llamadas a la API de inicio/parada de grabación.
 */
function toggleRecord() {
  if (!window.pywebview || !window.pywebview.api) {
    console.error("Error: La API de Python no está conectada.");
    return;
  }

  const btnRec = document.getElementById("btnRec");
  const recTimer = document.getElementById("rec-timer");

  if (!isRecording) {
    window.pywebview.api.start_record().then(console.log);
    
    isRecording = true;
    startTime = performance.now();
    
    btnRec.innerHTML = "STOP";
    btnRec.classList.add("recording");
    recTimer.style.display = "block";
    
    recTimerInt = setInterval(() => {
      const s = Math.floor((performance.now() - startTime) / 1000);
      const m = Math.floor(s / 60);
      const ss = s % 60;
      recTimer.innerText = `${m}:${ss.toString().padStart(2, "0")}`;
    }, 1000);
  } else {
    window.pywebview.api.stop_record().then((mensaje) => {
       alert(mensaje); 
    });
    
    isRecording = false;
    clearInterval(recTimerInt);
    btnRec.innerHTML = "REC";
    btnRec.classList.remove("recording");
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
    setTimeout(pollData, 50);
  });
}

/**
 * Alterna el estado de la simulación de telemetría (Demo).
 */
function toggleDemo() {
  const btnElements = document.getElementsByTagName("button");
  let btnDemo = Array.from(btnElements).find(b => b.innerText.includes("DEMO") || b.innerText.includes("STOP DEMO"));

  if (isDemoRunning) {
    stopDemo();
    if (btnDemo) btnDemo.innerText = "DEMO";
  } else {
    startDemo();
    if (btnDemo) btnDemo.innerText = "STOP DEMO";
  }
}

/**
 * Inicializa el modo de demostración a través de la API de Python.
 */
function startDemo() {
  if (window.pywebview && window.pywebview.api) {
    if (!isRecording) startTime = performance.now();
    window.pywebview.api.start_demo().then(() => {
      isDemoRunning = true;
      if (!loopActive) {
        loopActive = true;
        pollData(); 
      }
    });
  } else {
    console.error("La API de Python no está conectada.");
  }
}

/**
 * Finaliza el modo de demostración.
 */
function stopDemo() {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.stop_demo().then(() => {
      isDemoRunning = false;
      loopActive = false;
    });
  }
}