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

import { foreheadTriFromLandmarks } from "./roi.js";
import { cheekCirclesFromLandmarks } from "./cheek_roi.js";
import { getGreenMean } from "./green.js";
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
    // Run MediaPipe face landmark detection on current video frame
    const res = landmarker?.detectForVideo(video, ts);

    // Clear overlay canvas (where we draw landmarks and ROI box)
    octx.clearRect(0, 0, overlay.width, overlay.height);

    // If no face detected, skip rest of loop and wait for next frame
    if (!res?.faceLandmarks?.length) {
      requestAnimationFrame(loop);
      return;
    }

    // Get the landmarks for the first detected face
    const lms = res.faceLandmarks[0];

    // draw frame ONCE
    fctx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);

    // ROI COMPUTATION
    const foreheadROI = foreheadTriFromLandmarks(lms, overlay.width, overlay.height);
    const cheekROIs = cheekCirclesFromLandmarks(lms, overlay.width, overlay.height);

    // CHEEK SIGNAL
    let gCheek = 0;
    let count = 0;

    if (cheekROIs?.leftCheek) {
      gCheek += getGreenMean(fctx, cheekROIs.leftCheek, ts).g;
      count++;
    }

    if (cheekROIs?.rightCheek) {
      gCheek += getGreenMean(fctx, cheekROIs.rightCheek, ts).g;
      count++;
    }

    // Average the two cheeks if both are available
    gCheek = count ? gCheek / count : 0;

    // FOREHEAD SIGNAL
    const { g: gForehead, t } = getGreenMean(fctx, foreheadROI, ts);

    // FUSION
    const g = 0.5 * gCheek + 0.5 * gForehead;

    buf.push(t, g);

    // DRAWING
    drawOverlay(octx, drawer, lms, {
      forehead: foreheadROI,
      cheeks: cheekROIs
    });

    // Draw the green signal plot at the bottom
    const { y } = buf.values();
    drawPlot(pctx, plot.width, plot.height, y);


    // BPM ESTIMATION (every second or so, not every frame)
    if ((ts - lastBpmUpdateTs) > 1000) {
      lastBpmUpdateTs = ts;

      // Estimate BPM from the last 10 seconds of green signal
      const win = buf.values();
      const bpm = estimateBpmFromWindow(win.y, 1 / win.dt);

      // Only update BPM if it's a valid number, otherwise keep last BPM
      if (bpm != null && Number.isFinite(bpm)) {
        lastBpm = bpm;
      }

      // Update BPM display
      bpmEl.textContent = `bpm: ${lastBpm ? lastBpm.toFixed(0) : "—"}`;
    }

    requestAnimationFrame(loop);
  }


// Start everything
init();
