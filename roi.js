// roi.js
// This file turns MediaPipe face landmarks into forehead rectangle
// MediaPipe gives us many face landmark points (x,y) in normalized coordinates (0 to 1).
// We compute a bounding box around the face and then take a small rectangle near the top center of that face box. 

export function foreheadRectFromLandmarks(landmarks, W, H) {
  /* 
    Inputs:
      landmarks = array of objects with normalized coordinates (lm.x, lm.y)
      W, H = video/canvas width and height in pixels
    Output:
      roi = {x, y, w, h} in pixels 
  */

  // find bounding box around all landmarks in normalized coordinates
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const lm of landmarks) {
    if (lm.x < minX) minX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y > maxY) maxY = lm.y;
  }

  // convert bounding box from normalized to pixels
  const x = minX * W;
  const y = minY * H;
  const w = (maxX - minX) * W;
  const h = (maxY - minY) * H;

  // define forehead ROI as larger strip near top center of face box
  // These fractions are hand tuned
  const roiH = Math.max(8, h * 0.30); // ROI height (30% of face height)
  const roiW = Math.max(8, w * 0.30); // ROI width (30% of face width)

  // Center it horizontally
  const roiX = clamp(x + (w - roiW) / 2, 0, W - roiW);

  // Place it near the top of the face box
  // This keeps top edge around 1% and bottom around ~31% (1% + 30%).
  const roiY = clamp(y + h * 0.01, 0, H - roiH);

  // Round to whole pixels
  return { x: Math.round(roiX), y: Math.round(roiY), w: Math.round(roiW), h: Math.round(roiH) };
}

// Return the triangle vertices used by ROI processing/drawing.
export function roiTriangleFromRect(roi) {
  return [
    { x: roi.x, y: roi.y },
    { x: roi.x + roi.w, y: roi.y },
    { x: roi.x + roi.w / 2, y: roi.y + roi.h },
  ];
}

// Clamp ensures values stay inside valid screen range
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
