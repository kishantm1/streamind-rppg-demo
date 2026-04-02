// roi.js
// This file turns MediaPipe face landmarks into forehead rectangle
// MediaPipe gives us many face landmark points (x,y) in normalized coordinates (0 to 1).
// We compute a bounding box around the face and then take a small rectangle near the top center of that face box. 

export function foreheadRectFromLandmarks(landmarks, W, H) {
  const FOREHEAD_INDICES = [10, 338, 107, 151, 9, 8];
  let sumX = 0, sumY = 0;
  for (const i of FOREHEAD_INDICES) {
    sumX += landmarks[i].x;
    sumY += landmarks[i].y;
  }
  const cx = (sumX / FOREHEAD_INDICES.length) * W;
  const cy = (sumY / FOREHEAD_INDICES.length) * H;

  // Use face width to scale the circle size
  // landmarks 234 (left cheek) and 454 (right cheek) give a stable face width
  const faceW = Math.abs(landmarks[454].x - landmarks[234].x) * W;
  const r = Math.max(8, faceW * 0.22);

  return { cx: Math.round(cx), cy: Math.round(cy), r: Math.round(r) };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
