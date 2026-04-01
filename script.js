// script.js
// This is the main controller of the demo.
// It connects everything together. 
// 1) Ask browser for camera access (getUserMedia)
// 2) Load MediaPipe Face Landmarker model
// 3) On each video frame:
//    - detect face landmarks
//    - compute forehead ROI rectangle
//    - read pixels from that ROI and compute mean green value
//    - store mean green value and timestamp into ring buffer
//    - every second, compute BPM estimate from last 10s of green signal
//    - draw landmarks, ROI box, and green signal plot on canvases


import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12";

import { cheekTrianglesFromLandmarks  } from "./roi.js";
import { getGreenMeanInTriangle } from "./green.js";
import { RingBuffer } from "./buffer.js";
import { estimateBpmFromWindow } from "./dsp.js";
import { drawOverlay, drawPlot } from "./ui.js";

// Grab elements from index.html using their IDs
const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const octx = overlay.getContext("2d"); // drawing context for overlay canvas 

const plot = document.getElementById("plot");
const pctx = plot.getContext("2d"); // drawing context for plot canvas 

const statusEl = document.getElementById("status");
const bpmEl = document.getElementById("bpm");

// Hidden canvas is not shown on screen.
// It is used to read pixel data from current video frame.
const frameCanvas = document.createElement("canvas");
const fctx = frameCanvas.getContext("2d", { willReadFrequently: true });

let landmarker; // MediaPipe Face Landmarker model object
let drawer; // MediaPipe helper for drawing landmarks

// Store last 10 seconds of samples, then resample them to a fixed rate (30fps)
const buf = new RingBuffer(10, 30); 

// Update BPM about once per second (not every single frame)
let lastBpmUpdateTs = 0;
let lastBpm = null;

async function init() {
  try {
    // Ask for camera access 
    statusEl.textContent = "status: requesting camera…";
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }, // front camera if possible
      audio: false,
    });

    // Attach stream to the video element
    video.srcObject = stream;

    // Wait until the video knows its width/height
    await new Promise((r) => (video.onloadedmetadata = r));
    await video.play();

    // Match canvas sizes to actual video resolution
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    frameCanvas.width = video.videoWidth;
    frameCanvas.height = video.videoHeight;

    // Load MediaPipe face landmark model
    statusEl.textContent = "status: loading MediaPipe model…";

    // FilesetResolver loads the WebAssembly files MediaPipe needs to run
    const files = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
    );

    // Create the FaceLandmarker object (pretrained model)
    landmarker = await FaceLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      },
      numFaces: 1,
      runningMode: "VIDEO", 
    });

    // DrawingUtils helps draw landmark dots
    drawer = new DrawingUtils(octx);

    statusEl.textContent = "status: running";

    // Start the loop that runs every frame
    requestAnimationFrame(loop);
  } catch (e) {
    // If something fails like camera blocked or model did not load
    console.error(e);
    statusEl.textContent = "error: " + e.message;
  }
}

function loop(ts) {
  /*
    loop(ts) is called repeatedly by the browser.
    ts = timestamp (in milliseconds automatically provided by browser.
    requestAnimationFrame tries to run around 60 times per second if possible.
  */

  // Run face landmark detection on the current video frame
  const res = landmarker?.detectForVideo(video, ts);

  // Clear overlay canvas so we redraw new landmarks and ROI
  octx.clearRect(0, 0, overlay.width, overlay.height);

  // If we got landmarks...
  if (res?.faceLandmarks?.length) {
    const lms = res.faceLandmarks[0];

    // Compute cheek ROI triangle from landmarks
    const roi = cheekTrianglesFromLandmarks(lms, overlay.width, overlay.height);
    // Draw the current video frame onto hidden canvas so we can read pixel values inside ROI
    if (rois) {
      fctx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);

    // Extract mean green value from the ROI in this frame
      const left = getGreenMeanInTriangle(fctx, rois.leftCheek, ts);
      const right = getGreenMeanInTriangle(fctx, rois.rightCheek, ts);

      if (left && right && Number.isFinite(left.g) && Number.isFinite(right.g)) {
        const g = (left.g + right.g) / 2;
        const t = left.t;

    // Add this sample to ring buffer (keep last 10 seoconds)
        buf.push(t, g);

    // Draw landmarks and ROI on overlay
    drawOverlay(octx, drawer, lms, roi);

    // Draw the signal trace (mean green vs time)
        const { y } = buf.values();
        drawPlot(pctx, plot.width, plot.height, y);

    // Update BPM once per second (not every frame)
        if ((ts - lastBpmUpdateTs) > 1000) {
          lastBpmUpdateTs = ts;

      // Get evenly spaced window for DSP
          const win = buf.values();

      // Estimate BPM using FFT and peak detection
          const bpm = estimateBpmFromWindow(win.y, 1 / win.dt);

      // Save the last good BPM so it does not flicker to null
          if (bpm != null && Number.isFinite(bpm)) {
            lastBpm = bpm;
      }
      // Show BPM on screen
          bpmEl.textContent = `bpm: ${lastBpm ? lastBpm.toFixed(0) : "—"}`;
      }
    }
//Draw landmarks on the overlay
// drawOverlay expects some ROI arg, so we pass a fake rec
    drawOverlay(octx, drawer, lms, { x: 0, y: 0, w: 0, h: 0 });
// Draw cheek triangle rois
    drawTriangle(octx, rois.leftCheek);
    drawTriangle(octx, rois.rightCheek);

          
  }
}
  // Schedule the next frame
  requestAnimationFrame(loop);
}
// draw function
function drawTriangle(ctx, tri) {
  ctx.beginPath();
  ctx.moveTo(tri.a.x, tri.a.y);
  ctx.lineTo(tri.b.x, tri.b.y);
  ctx.lineTo(tri.c.x, tri.c.y);
  ctx.closePath();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.stroke();

// Start everything
init();
