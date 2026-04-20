// ui.js — drawing helpers

const ROI_COLORS = ["#4caf50", "#ff9800", "#2196f3"]; // green, orange, blue

export function drawOverlay(octx, drawer, landmarks, rois) {
  drawer.drawLandmarks(landmarks, { radius: 1 });

  const arr = Array.isArray(rois) ? rois : [rois];
  for (let i = 0; i < arr.length; i++) {
    const roi = arr[i];
    const color = ROI_COLORS[i % ROI_COLORS.length];

    octx.strokeStyle = color;
    octx.lineWidth = 2;
    octx.strokeRect(roi.x, roi.y, roi.w, roi.h);

    if (roi.label) {
      octx.fillStyle = color;
      octx.font = "11px system-ui, sans-serif";
      octx.fillText(roi.label, roi.x + 2, Math.max(roi.y - 3, 10));
    }
  }
}

export function drawPlot(ctx, W, H, y) {
  ctx.clearRect(0, 0, W, H);
  if (!y || y.length < 2) return;

  let min = Infinity, max = -Infinity;
  for (const v of y) { if (v < min) min = v; if (v > max) max = v; }
  const span = (max - min) || 1;

  // Faint centre line
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

  ctx.strokeStyle = "#7aa2ff";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < y.length; i++) {
    const x = (i / (y.length - 1)) * (W - 1);
    const py = (1 - (y[i] - min) / span) * (H - 4) + 2;
    if (i === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
  }
  ctx.stroke();
}
