// ROI (Region of Interest) calculation from face landmarks
// Computes forehead rectangle from MediaPipe face landmarks

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

export function foreheadRectFromLandmarks(landmarks, W, H) {
  // Find bounding box around all landmarks in normalized coordinates
  let minX = 1, minY = 1, maxX = 0, maxY = 0

  for (const lm of landmarks) {
    if (lm.x < minX) minX = lm.x
    if (lm.y < minY) minY = lm.y
    if (lm.x > maxX) maxX = lm.x
    if (lm.y > maxY) maxY = lm.y
  }

  // Convert bounding box from normalized to pixels
  const x = minX * W
  const y = minY * H
  const w = (maxX - minX) * W
  const h = (maxY - minY) * H

  // Define forehead ROI as small strip near top center of face box
  const roiH = Math.max(8, h * 0.11) // 11% of face height
  const roiW = Math.max(8, w * 0.30) // 30% of face width

  // Center horizontally
  const roiX = clamp(x + (w - roiW) / 2, 0, W - roiW)

  // Place near top of face box
  const roiY = clamp(y + h * 0.01, 0, H - roiH)

  return {
    x: Math.round(roiX),
    y: Math.round(roiY),
    w: Math.round(roiW),
    h: Math.round(roiH)
  }
}
