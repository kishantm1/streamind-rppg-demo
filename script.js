// script.js
import {
  FaceLandmarker, FilesetResolver, DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12";
import { getRois } from "./roi.js";
import { getPosSignal } from "./green.js";
import { RingBuffer } from "./buffer.js";
import { estimateBpmFromWindow, resetDsp } from "./dsp.js";
import { drawOverlay, drawPlot } from "./ui.js";
import { BleHeartRate } from "./bluetooth.js";

// ── DOM ───────────────────────────────────────────────────────────────────────
const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const octx = overlay.getContext("2d");
const plot = document.getElementById("plot");
const pctx = plot.getContext("2d");
const chart = document.getElementById("chart");
const cctx = chart.getContext("2d");
const statusEl = document.getElementById("status");
const rppgValueEl = document.getElementById("rppg-value");
const bleValueEl = document.getElementById("ble-value");
const bleCard = document.getElementById("ble-card");
const btnBt = document.getElementById("btn-bt");
const btStatusEl = document.getElementById("bt-status");
const historyBody = document.getElementById("history-body");
const emptyRow = document.getElementById("empty-row");
const btnCopy = document.getElementById("btn-copy");
const btnClear = document.getElementById("btn-clear");
const btnSavePng = document.getElementById("btn-save-png");

const frameCanvas = document.createElement("canvas");
const fctx = frameCanvas.getContext("2d", { willReadFrequently: true });

// ── State ─────────────────────────────────────────────────────────────────────
let landmarker, drawer;
const buf = new RingBuffer(10, 30);

let lastBpmUpdateTs = 0;
let lastRppgBpm = null;
let lastBleBpm = null;
let readingIndex = 0;

const MIN_BUF_SECS = 9;
let hasWarmedUp = false;
let firstSampleTs = null;

// ── BLE ───────────────────────────────────────────────────────────────────────
const ble = new BleHeartRate(
  (bpm) => {
    lastBleBpm = bpm;
    bleValueEl.textContent = bpm;
  },
  (msg) => {
    btStatusEl.textContent = msg;
    bleCard.style.opacity = ble.connected ? "1" : "0.35";
    btnBt.innerHTML = ble.connected
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></svg> Disconnect`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></svg> Connect HR Monitor`;
    btnBt.classList.toggle("connected", ble.connected);
  }
);

btnBt.addEventListener("click", async () => {
  if (ble.connected) {
    await ble.disconnect();
    bleCard.style.opacity = "0.35";
    bleValueEl.textContent = "—";
    lastBleBpm = null;
  } else {
    try { await ble.connect(); }
    catch (e) { btStatusEl.textContent = "Error: " + e.message; }
  }
});

// ── Chart ─────────────────────────────────────────────────────────────────────
// Stores ALL session data (not just last 60s) so the PNG export shows the full session.
// We scroll the visible window to the last 120 seconds.
const CHART_VIEW_S = 120;
const allChartData = []; // { t, rppg, ble }

function pushChartPoint(rppg, bleBpm) {
  allChartData.push({ t: performance.now() / 1000, rppg, ble: bleBpm ?? null });
}

function drawChart() {
  const W = chart.width, H = chart.height;
  cctx.clearRect(0, 0, W, H);

  if (allChartData.length < 2) {
    // Show "waiting" message
    cctx.fillStyle = "rgba(255,255,255,0.15)";
    cctx.font = "13px system-ui";
    cctx.textAlign = "center";
    cctx.fillText("Waiting for data…", W / 2, H / 2);
    return;
  }

  const tNow = allChartData[allChartData.length - 1].t;
  const tMin = tNow - CHART_VIEW_S;

  // Collect visible values for Y scale
  const visible = allChartData.filter(d => d.t >= tMin);
  const vals = visible.flatMap(d => [d.rppg, d.ble]).filter(v => v != null);
  if (!vals.length) return;

  const yLo = Math.max(30, Math.min(...vals) - 10);
  const yHi = Math.min(200, Math.max(...vals) + 10);
  const ySpan = yHi - yLo || 1;

  const toX = t => ((t - tMin) / CHART_VIEW_S) * (W - 40) + 36;
  const toY = bpm => H - 20 - ((bpm - yLo) / ySpan) * (H - 30);

  // Grid lines + Y labels
  const step = ySpan > 60 ? 20 : 10;
  cctx.font = "10px system-ui";
  for (let bpm = Math.ceil(yLo / step) * step; bpm <= yHi; bpm += step) {
    const y = toY(bpm);
    cctx.strokeStyle = "rgba(255,255,255,0.07)";
    cctx.lineWidth = 1;
    cctx.beginPath(); cctx.moveTo(36, y); cctx.lineTo(W, y); cctx.stroke();
    cctx.fillStyle = "rgba(255,255,255,0.3)";
    cctx.textAlign = "right";
    cctx.fillText(bpm, 32, y + 4);
  }

  // X axis time labels
  cctx.fillStyle = "rgba(255,255,255,0.25)";
  cctx.textAlign = "center";
  cctx.font = "9px system-ui";
  for (let s = 0; s <= CHART_VIEW_S; s += 30) {
    const x = toX(tMin + s);
    cctx.fillText(`${s}s`, x, H - 4);
  }

  // Draw a series using only points within the visible window
  function series(key, color) {
    cctx.strokeStyle = color;
    cctx.lineWidth = 2;
    cctx.lineJoin = "round";
    cctx.beginPath();
    let pen = false;
    for (const d of allChartData) {
      if (d.t < tMin - 1) continue; // skip old points (with 1s buffer for smooth entry)
      if (d[key] == null) { pen = false; continue; }
      const x = toX(d.t), y = toY(d[key]);
      if (!pen) { cctx.moveTo(x, y); pen = true; } else cctx.lineTo(x, y);
    }
    cctx.stroke();

    // Dot at latest point
    const last = [...allChartData].reverse().find(d => d[key] != null);
    if (last && last.t >= tMin) {
      cctx.beginPath();
      cctx.arc(toX(last.t), toY(last[key]), 4, 0, Math.PI * 2);
      cctx.fillStyle = color;
      cctx.fill();
      // Value label next to dot
      cctx.fillStyle = color;
      cctx.font = "bold 11px system-ui";
      cctx.textAlign = "left";
      cctx.fillText(last[key].toFixed(0), toX(last.t) + 7, toY(last[key]) + 4);
    }
  }

  series("rppg", "#7aa2ff");
  if (allChartData.some(d => d.ble != null)) series("ble", "#4cda7e");
}

// Save chart as PNG
btnSavePng.addEventListener("click", () => {
  // Re-render on white background for clean PNG
  const offscreen = document.createElement("canvas");
  offscreen.width = chart.width;
  offscreen.height = chart.height;
  const octx2 = offscreen.getContext("2d");
  octx2.fillStyle = "#111";
  octx2.fillRect(0, 0, offscreen.width, offscreen.height);
  octx2.drawImage(chart, 0, 0);

  const a = document.createElement("a");
  a.download = `rppg-chart-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
  a.href = offscreen.toDataURL("image/png");
  a.click();
});

// ── History table ─────────────────────────────────────────────────────────────
function addHistoryRow(rppg, bleBpm) {
  readingIndex++;
  if (emptyRow?.parentNode) emptyRow.parentNode.removeChild(emptyRow);
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${readingIndex}</td>
    <td>${time}</td>
    <td>${rppg.toFixed(0)}</td>
    <td>${bleBpm != null ? bleBpm.toFixed(0) : "—"}</td>
  `;
  historyBody.insertBefore(tr, historyBody.firstChild);
  while (historyBody.rows.length > 500) historyBody.removeChild(historyBody.lastChild);
}

btnCopy.addEventListener("click", () => {
  const rows = Array.from(historyBody.rows);
  if (!rows.length || (rows.length === 1 && rows[0].id === "empty-row")) {
    alert("No data yet."); return;
  }
  const lines = ["#\tTime\trPPG\tBLE"];
  for (const r of [...rows].reverse()) {
    if (r.id === "empty-row") continue;
    lines.push(Array.from(r.cells).map(c => c.textContent.trim()).join("\t"));
  }
  navigator.clipboard.writeText(lines.join("\n"))
    .then(() => { btnCopy.textContent = "Copied!"; setTimeout(() => (btnCopy.textContent = "Copy as text"), 1800); })
    .catch(() => prompt("Copy:", lines.join("\n")));
});

btnClear.addEventListener("click", () => {
  historyBody.innerHTML =
    `<tr id="empty-row"><td colspan="4">No readings yet — stay still and wait ~9s</td></tr>`;
  readingIndex = 0;
  lastRppgBpm = null;
  hasWarmedUp = false;
  firstSampleTs = null;
  allChartData.length = 0;
  rppgValueEl.textContent = "—";
  drawChart(); // show the waiting message
  resetDsp();
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    // Draw the empty chart placeholder right away
    drawChart();

    statusEl.textContent = "status: requesting camera…";
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }, audio: false,
    });
    video.srcObject = stream;
    await new Promise(r => (video.onloadedmetadata = r));
    await video.play();

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    frameCanvas.width = video.videoWidth;
    frameCanvas.height = video.videoHeight;

    statusEl.textContent = "status: loading model…";
    const files = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
    );
    landmarker = await FaceLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
      },
      numFaces: 1, runningMode: "VIDEO",
    });
    drawer = new DrawingUtils(octx);
    statusEl.textContent = "status: running";
    requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);
    statusEl.textContent = "error: " + e.message;
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function loop(ts) {
  const res = landmarker?.detectForVideo(video, ts);
  octx.clearRect(0, 0, overlay.width, overlay.height);

  if (res?.faceLandmarks?.length) {
    const lms = res.faceLandmarks[0];
    const rois = getRois(lms, overlay.width, overlay.height);

    fctx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
    const { g, t } = getPosSignal(fctx, rois, ts);
    buf.push(t, g);
    if (firstSampleTs === null) firstSampleTs = ts;

    drawOverlay(octx, drawer, lms, rois);

    const { y } = buf.values();
    drawPlot(pctx, plot.width, plot.height, y);

    // BPM update every second
    if ((ts - lastBpmUpdateTs) > 1000) {
      lastBpmUpdateTs = ts;

      const win = buf.values();
      const bpm = estimateBpmFromWindow(win.y, 1 / win.dt);
      const elapsed = firstSampleTs !== null ? (ts - firstSampleTs) / 1000 : 0;
      if (elapsed >= MIN_BUF_SECS) hasWarmedUp = true;

      if (!hasWarmedUp) {
        const rem = Math.ceil(MIN_BUF_SECS - elapsed);
        rppgValueEl.textContent = `calibrating… (${rem}s)`;
        statusEl.textContent = `status: calibrating… (${rem}s)`;
      } else {
        if (bpm != null && Number.isFinite(bpm)) {
          lastRppgBpm = bpm;
          rppgValueEl.textContent = bpm.toFixed(0);
          statusEl.textContent = "status: running";
          addHistoryRow(bpm, lastBleBpm);
          pushChartPoint(bpm, lastBleBpm);
        } else {
          rppgValueEl.textContent = lastRppgBpm ? lastRppgBpm.toFixed(0) : "—";
          statusEl.textContent = "status: running";
          // Push a null rPPG point to keep BLE line continuous on chart
          if (lastBleBpm != null) pushChartPoint(null, lastBleBpm);
        }
        drawChart();
      }
    }
  }

  requestAnimationFrame(loop);
}

init();
