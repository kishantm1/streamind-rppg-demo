// minimal MediaPipe Face Landmarker demo with a forehead ROI rectangle.

import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12";

const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const statusEl = document.getElementById("status");

let landmarker, drawer;

// very simple forehead box: take the face bounding box from landmarks,
// then pick a strip near the top-middle as the ROI.
function foreheadRectFromLandmarks(landmarks, W, H) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const lm of landmarks) {
    if (lm.x < minX) minX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y > maxY) maxY = lm.y;
  }
  const x = minX * W, y = minY * H;
  const w = (maxX - minX) * W, h = (maxY - minY) * H;

  // ROI: top ~20% of face box, centered ~40% width
  const roiH = Math.max(8, h * 0.20);
  const roiW = Math.max(8, w * 0.40);
  const roiX = Math.max(0, x + (w - roiW) / 2);
  const roiY = Math.max(0, y + h * 0.08); // a bit below hairline

  return { x: Math.round(roiX), y: Math.round(roiY), w: Math.round(roiW), h: Math.round(roiH) };
}

async function init() {
  try {
    statusEl.textContent = "status: requesting camera…";
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    video.srcObject = stream;
    await new Promise((r) => (video.onloadedmetadata = r));
    video.play();

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    statusEl.textContent = "status: loading model…";
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

    drawer = new DrawingUtils(ctx);
    statusEl.textContent = "status: running (move your face into view)";
    requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);
    statusEl.textContent = "error: " + e.message;
  }
}

function loop(ts) {
  const res = landmarker?.detectForVideo(video, ts);
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  if (res?.faceLandmarks?.length) {
    const lms = res.faceLandmarks[0];

    // draw a few landmarks so users see it’s tracking (keeping it light)
    drawer.drawLandmarks(lms, { radius: 1 });

    // compute & draw forehead ROI
    const roi = foreheadRectFromLandmarks(lms, overlay.width, overlay.height);
    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 2;
    ctx.strokeRect(roi.x, roi.y, roi.w, roi.h);
  }

  requestAnimationFrame(loop);
}

init();
