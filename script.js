// script.js
// This is the main controller of the demo.
// It connects everything together.
// 1) Ask browser for camera access (getUserMedia)
// 2) Load MediaPipe Face Landmarker model
// 3) On each video frame:
//    - detect face landmarks
//    - compute left and right cheek triangle ROIs
//    - read pixels from both cheek ROIs and compute mean green value
//    - average left and right cheek green values into one signal sample
//    - store mean green value and timestamp into ring buffer
//    - every second, compute BPM estimate from last 10s of green signal
//    - draw landmarks, cheek ROIs, and green signal plot on canvases

import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12";

import { cheekTrianglesFromLandmarks } from "./cheek_roi.js";
import { foreheadRectFromLandmarks, roiTriangleFromRect } from "./roi.js";
import { getGreenMeanInTriangle, getGreenMean } from "./green.js";
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

let landmarker = null; // MediaPipe Face Landmarker model object
let drawer = null; // MediaPipe helper for drawing landmarks

// Store last 10 seconds of samples, then resample them to a fixed rate (30fps)
const buf = new RingBuffer(10, 30);

// Update BPM about once per second (not every single frame)
let lastBpmUpdateTs = 0;
let lastBpm = null;

async function init() {
  try {
    // Make sure camera API exists in this browser/page context
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera API unavailable. Open with localhost or HTTPS.");
    }

    // Ask for camera access
    statusEl.textContent = "status: requesting camera…";

    // These help the webcam video actually display in the page
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }, // front camera if possible
      audio: false,
    });

    // Attach stream to the video element
    video.srcObject = stream;

    // Wait until the video knows its width/height
    await new Promise((resolve) => {
      video.onloadedmetadata = () => resolve();
    });
    await video.play();

    // Match canvas sizes to actual video resolution
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    frameCanvas.width = video.videoWidth;
    frameCanvas.height = video.videoHeight;

    // Give the plot a usable size
    plot.width = plot.clientWidth || 640;
    plot.height = plot.clientHeight || 160;

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
    // If something fails like camera blocked, insecure page, or model did not load
    console.error("init failed:", e);
    statusEl.textContent = "error: " + (e?.message || e);
  }
}

function loop(ts) {
  /*
  loop(ts) is called repeatedly by the browser.
  ts = timestamp (in milliseconds) automatically provided by browser.
  requestAnimationFrame tries to run around 60 times per second if possible.
  */

  try {
    // If the model is not ready yet, try again next frame
    if (!landmarker) {
      requestAnimationFrame(loop);
      return;
    }

    // Run face landmark detection on the current video frame
    const res = landmarker.detectForVideo(video, ts);

    // Clear overlay canvas so we redraw new landmarks and ROIs
    octx.clearRect(0, 0, overlay.width, overlay.height);

    // If we got landmarks...
    if (res?.faceLandmarks?.length) {
      const lms = res.faceLandmarks[0];

      // Compute left and right cheek triangle ROIs from landmarks
      const rois = cheekTrianglesFromLandmarks(
        lms,
        overlay.width,
        overlay.height
      );

      // Compute forehead ROI
      const foreheadRoi = foreheadRectFromLandmarks(lms, overlay.width, overlay.height);

      if (rois) {
        // Draw the current video frame onto hidden canvas
        // so we can read pixel values inside both cheek ROIs
        fctx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);

        // Extract mean green value from the left cheek triangle
        const left = getGreenMeanInTriangle(fctx, rois.leftCheek, ts);

        // Extract mean green value from the right cheek triangle
        const right = getGreenMeanInTriangle(fctx, rois.rightCheek, ts);

        // Extract mean green value from the forehead inverted triangle
        const forehead = getGreenMean(fctx, foreheadRoi, ts);

        // Only continue if all three samples are valid numbers
        if (
          left &&
          right &&
          forehead &&
          Number.isFinite(left.g) &&
          Number.isFinite(right.g) &&
          Number.isFinite(forehead.g)
        ) {
          // Average left cheek, right cheek, and forehead green values into one signal sample
          const g = (left.g + right.g + forehead.g) / 3;

          // Use the animation-frame timestamp in seconds as the sample time
          const t = ts / 1000;

          // Add this sample to ring buffer (keep last 10 seconds)
          buf.push(t, g);
        }

        // Draw landmarks and cheek ROIs on overlay
        drawOverlay(octx, drawer, lms, rois);

        // Draw the forehead inverted triangle
        const [v1, v2, v3] = roiTriangleFromRect(foreheadRoi);
        octx.strokeStyle = "#4caf50"; // green color
        octx.lineWidth = 2; // thickness of outline
        octx.beginPath();
        octx.moveTo(v1.x, v1.y);
        octx.lineTo(v2.x, v2.y);
        octx.lineTo(v3.x, v3.y);
        octx.closePath();
        octx.stroke();
      }
    }

    // Draw the signal trace (mean green vs time)
    const { y } = buf.values();
    drawPlot(pctx, plot.width, plot.height, y);

    // Update BPM once per second (not every frame)
    if ((ts - lastBpmUpdateTs) > 1000) {
      lastBpmUpdateTs = ts;

      // Get evenly spaced window for DSP
      const win = buf.values();

      // Only estimate BPM if buffer output looks valid
      if (win?.y?.length && Number.isFinite(win.dt) && win.dt > 0) {
        // Estimate BPM using FFT and peak detection
        const bpm = estimateBpmFromWindow(win.y, 1 / win.dt);

        // Save the last good BPM so it does not flicker to null
        if (bpm != null && Number.isFinite(bpm)) {
          lastBpm = bpm;
        }
      }

      // Show BPM on screen
      bpmEl.textContent = `bpm: ${lastBpm != null ? lastBpm.toFixed(0) : "--"}`;
    }
  } catch (e) {
    // If one frame fails, show error but keep trying on the next frame
    console.error("loop failed:", e);
    statusEl.textContent = "error: " + (e?.message || e);
  }

  // Schedule the next frame
  requestAnimationFrame(loop);
}

// Start everything
init();
