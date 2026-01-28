// ui.js
// This file only handles drawing things on canvases
// It does not do camera access or signal processing

export function drawOverlay(octx, drawer, landmarks, roi) {
/* 
  drawOverlay draws the landmark dots and forehead ROI rectangle 
  Inputs:
    octx = canvas drawing context for overlay canvas
    drawer = MediaPipe helper that knows how to draw landmarks
    landmarks = array of face landmarks (dots)
    roi = rectangle object {x,y,w,h}
  */

  // Draw landmark dots on the face 
  drawer.drawLandmarks(landmarks, { radius: 1 });

  // Draw the ROI rectangle (green box)
  octx.strokeStyle = "#4caf50"; // green color
  octx.lineWidth = 2; // thickness of outline
  octx.strokeRect(roi.x, roi.y, roi.w, roi.h);
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
