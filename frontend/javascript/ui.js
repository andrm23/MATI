// ui.js
// Manipulación del DOM y actualización visual de los sensores

const domCache = {};

function getEl(id) {
  if (!domCache[id]) domCache[id] = document.getElementById(id);
  return domCache[id];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function mixHex(c1, c2, t) {
  const a = c1.match(/\w\w/g).map((x) => parseInt(x, 16));
  const b = c2.match(/\w\w/g).map((x) => parseInt(x, 16));
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${m[0]}, ${m[1]}, ${m[2]})`;
}

function temperatureColor(value) {
  const v = clamp(value, 0, SENSOR_LIMITS.MAX_TEMP);
  if (v <= 80) {
    return mixHex("1e90ff", "ff9800", v / 80); 
  }
  return mixHex("ff9800", "ff1f1f", (v - 80) / 40); 
}

function pressureColor(value) {
  const v = clamp(value, 0, SENSOR_LIMITS.MAX_PRESSURE);
  return mixHex("ffffff", "0066ff", v / SENSOR_LIMITS.MAX_PRESSURE);
}

function updatePositiveCapsule(barId, txtId, val, maxVal, colorFn, decimals = 1) {
  const bar = getEl(barId);
  const txt = getEl(txtId);
  const value = clamp(val, 0, maxVal);
  txt.innerText = value.toFixed(decimals);
  bar.style.height = `${(value / maxVal) * 100}%`;
  bar.style.background = colorFn(value);
}

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

function updatePedal(barId, txtId, val) {
  const bar = getEl(barId);
  getEl(txtId).innerText = val.toFixed(1);
  let pct = Math.abs(val) * 10;
  if (pct > 100) pct = 100;
  bar.style.height = `${pct}%`;
}

function updateUI(d) {
  getEl("g-total").innerText = d.g.toFixed(2);

  const deg = (d.phi / 10.0) * 180;
  getEl("steering-wheel").style.transform = `rotate(${deg}deg)`;
  getEl("phi-val").innerText = d.phi.toFixed(1);

  updateSuspCapsule("bar-fl", "val-fl", d.fi);
  updateSuspCapsule("bar-fr", "val-fr", d.fd);
  updateSuspCapsule("bar-rl", "val-rl", d.ti);
  updateSuspCapsule("bar-rr", "val-rr", d.td);

  updatePositiveCapsule("bar-tfi", "val-tfi", d.tfi, SENSOR_LIMITS.MAX_TEMP, temperatureColor);
  updatePositiveCapsule("bar-tfd", "val-tfd", d.tfd, SENSOR_LIMITS.MAX_TEMP, temperatureColor);
  updatePositiveCapsule("bar-tti", "val-tti", d.tti, SENSOR_LIMITS.MAX_TEMP, temperatureColor);
  updatePositiveCapsule("bar-ttd", "val-ttd", d.ttd, SENSOR_LIMITS.MAX_TEMP, temperatureColor);

  updatePositiveCapsule("bar-pfi", "val-pfi", d.pfi, SENSOR_LIMITS.MAX_PRESSURE, pressureColor);
  updatePositiveCapsule("bar-pfd", "val-pfd", d.pfd, SENSOR_LIMITS.MAX_PRESSURE, pressureColor);
  updatePositiveCapsule("bar-pti", "val-pti", d.pti, SENSOR_LIMITS.MAX_PRESSURE, pressureColor);
  updatePositiveCapsule("bar-ptd", "val-ptd", d.ptd, SENSOR_LIMITS.MAX_PRESSURE, pressureColor);

  getEl("rpm-fi").innerText = Math.round(d.rpmFi || 0);
  getEl("rpm-fd").innerText = Math.round(d.rpmFd || 0);
  getEl("rpm-ti").innerText = Math.round(d.rpmTi || 0);
  getEl("rpm-td").innerText = Math.round(d.rpmTd || 0);

  updatePedal("bar-brake", "val-brake", d.fren);
  updatePedal("bar-throttle", "val-throttle", d.acel);
}