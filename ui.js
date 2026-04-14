// ui.js
// This file only handles drawing things on canvases
// It does not do camera access or signal processing

import { roiTriangleFromRect } from "./roi.js";

// drawCircleROI draws a circle given a bounding box (x,y,w,h)
function drawCircleROI(ctx, roi) {
  const cx = roi.x + roi.w / 2;
  const cy = roi.y + roi.h / 2;
  const r = roi.w / 2;
  
  // Draw a circle using the arc method
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

// drawOverlay draws the face landmarks and ROIs on the overlay canvas
export function drawOverlay(ctx, drawer, landmarks, rois) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw landmarks
  if (drawer) {
    drawer.drawLandmarks(landmarks, { radius: 1 });
  }

  // FOREHEAD TRIANGLE
  if (rois?.forehead) {
    const [v1, v2, v3] = roiTriangleFromRect(rois.forehead);

    // Draw triangle
    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(v1.x, v1.y);
    ctx.lineTo(v2.x, v2.y);
    ctx.lineTo(v3.x, v3.y);
    ctx.closePath();
    ctx.stroke();
  }

  // CHEEKS (circles)
  if (rois?.cheeks?.leftCheek) {
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    drawCircleROI(ctx, rois.cheeks.leftCheek);
  }
  
  if (rois?.cheeks?.rightCheek) {
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    drawCircleROI(ctx, rois.cheeks.rightCheek);
  }
}

export function drawPlot(ctx, W, H, y) {
/*
  drawPlot draws the green trace over time. 
  It takes an array y (signal values) and draws a simple line plot.
  Inputs: 
    ctx = drawing context for the plot canvas
    W, H = plot canvas width/height
    y = array of signal values (mean green in ROI over time)
*/

  // Clear the plot canvas so we redraw fresh each time
  ctx.clearRect(0, 0, W, H);

  // If not enough points, nothing to draw
  if (!y || y.length < 2) return;

  // Find min and max so we can scale the signal to fit the plot window
  let min = Infinity, max = -Infinity;
  for (const v of y) { 
    if (v < min) 
      min = v; 
    if (v > max) 
      max = v; 
    }

  // Avoid divide-by-zero if signal is flat
  const span = (max - min) || 1;

  // Draw a line
  ctx.strokeStyle = "#7aa2ff"; // blue line color 
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < y.length; i++) {
    // x goes from left to right across the plot
    const x = (i / (y.length - 1)) * (W - 1);
    
    // Normalize y into 0-1
    const yn = (y[i] - min) / span;
    
    // Convert to screen coordinates (flip y so bigger values go upward)
    const py = (1 - yn) * (H - 1);        
    if (i === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();
}
