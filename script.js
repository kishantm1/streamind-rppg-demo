// script.js
import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12";

import { foreheadRectFromLandmarks } from "./roi.js";
import { cheekCirclesFromLandmarks } from "./forehead_cheek_circle_combined.js";
import { getGreenMean } from "./green.js";
import { RingBuffer } from "./buffer.js";
import { estimateBpmFromWindow } from "./dsp.js";
import { drawOverlay, drawPlot } from "./ui.js";

const video     = document.getElementById("video");
const overlay   = document.getElementById("overlay");
const octx      = overlay.getContext("2d");
const plot      = document.getElementById("plot");
const pctx      = plot.getContext("2d");
const statusEl  = document.getElementById("status");
const bpmEl     = document.getElementById("bpm");

const frameCanvas = document.createElement("canvas");
const fctx = frameCanvas.getContext("2d", { willReadFrequently: true });

let landmarker;
let drawer;

const buf = new RingBuffer(10, 30);
let lastBpmUpdateTs = 0;
let lastBpm = null;

async function init() {
  try {
    statusEl.textContent = "status: requesting camera…";
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    video.srcObject = stream;
    await new Promise((r) => (video.onloadedmetadata = r));
    await video.play();

    overlay.width  = video.videoWidth;
    overlay.height = video.videoHeight;
    frameCanvas.width  = video.videoWidth;
    frameCanvas.height = video.videoHeight;

    statusEl.textContent = "status: loading MediaPipe model…";
    const files = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
    );

    landmarker = await FaceLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      },
      numFaces: 1,
      runningMode: "VIDEO",
    });

    drawer = new DrawingUtils(octx);
    statusEl.textContent = "status: running";
    requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);
    statusEl.textContent = "error: " + e.message;
  }
}

function drawCircle(ctx, roi) {
  ctx.beginPath();
  ctx.arc(roi.cx, roi.cy, roi.r, 0, 2 * Math.PI);
  ctx.strokeStyle = "#4caf50";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function loop(ts) {
  const res = landmarker?.detectForVideo(video, ts);
  octx.clearRect(0, 0, overlay.width, overlay.height);

  if (res?.faceLandmarks?.length) {
    const lms = res.faceLandmarks[0];

    // Compute all three ROIs
    const foreheadRoi = foreheadRectFromLandmarks(lms, overlay.width, overlay.height);
    const cheekRois   = cheekCirclesFromLandmarks(lms, overlay.width, overlay.height);

    // Skip frame if cheek ROIs couldn't be computed
    if (!cheekRois) {
      requestAnimationFrame(loop);
      return;
    }

    // Draw video frame onto hidden canvas for pixel sampling
    fctx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);

    // Sample green channel from all three circles
    const gForehead   = getGreenMean(fctx, foreheadRoi,           ts);
    const gLeftCheek  = getGreenMean(fctx, cheekRois.leftCheek,   ts);
    const gRightCheek = getGreenMean(fctx, cheekRois.rightCheek,  ts);

    // Average all three into one signal
    const g = (gForehead.g + gLeftCheek.g + gRightCheek.g) / 3;
    const t = gForehead.t;
    buf.push(t, g);

    // Draw landmarks + all three circles
    drawOverlay(octx, drawer, lms, foreheadRoi);
    drawCircle(octx, foreheadRoi);
    drawCircle(octx, cheekRois.leftCheek);
    drawCircle(octx, cheekRois.rightCheek);

    // Plot the signal
    const { y } = buf.values();
    drawPlot(pctx, plot.width, plot.height, y);

    // Update BPM once per second
    if ((ts - lastBpmUpdateTs) > 1000) {
      lastBpmUpdateTs = ts;
      const win = buf.values();
      const bpm = estimateBpmFromWindow(win.y, 1 / win.dt);
      if (bpm != null && Number.isFinite(bpm)) lastBpm = bpm;
      bpmEl.textContent = `bpm: ${lastBpm ? lastBpm.toFixed(0) : "—"}`;
    }
  }

  requestAnimationFrame(loop);
}

init();