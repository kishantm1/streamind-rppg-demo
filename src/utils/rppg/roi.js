// roi.js
// Computes three skin ROIs from MediaPipe face landmarks:
//   [0] forehead   — tight strip between brow-top ridge and mid-forehead
//   [1] left-cheek — hull of the left cheekbone landmarks
//   [2] right-cheek— hull of the right cheekbone landmarks
//
// The forehead box is clamped:
//   - bottom edge: hard-clamped above the lowest brow-top landmark so
//                  eyebrows never enter the ROI
//   - top edge:    built from mid-forehead points (151 and neighbours) —
//                  landmark 10 (hairline) is intentionally excluded

const PAD = 0.08; // fraction of landmark-hull span to pad outward

/**
 * @param {Array}  landmarks - MediaPipe 478-point landmarks (normalised [0,1])
 * @param {number} W         - canvas width in pixels
 * @param {number} H         - canvas height in pixels
 * @returns {Array<{x:number, y:number, w:number, h:number, label:string}>}
 */
export function getRois(landmarks, W, H) {
  const browTopIdx = [70, 63, 105, 66, 107, 336, 296, 334, 293, 300];
  const midForeheadIdx = [54, 68, 104, 69, 108, 151, 337, 299, 333, 298];
  const foreheadIdx = [...browTopIdx, ...midForeheadIdx];

  // Viewer's left = face's anatomical right, per MediaPipe convention
  const leftCheekIdx = [117, 118, 101, 36, 205, 187, 123];
  const rightCheekIdx = [346, 347, 330, 266, 425, 411, 352];

  const fhRoi = roiFromIndices(landmarks, foreheadIdx, W, H, 'forehead');

  // Hard-clamp bottom edge to the lowest brow-top landmark
  let maxBrowY = -Infinity;
  for (const idx of browTopIdx) {
    const lm = landmarks[idx];
    if (lm && lm.y > maxBrowY) maxBrowY = lm.y;
  }
  const browYpx = maxBrowY * H;
  if (fhRoi.y + fhRoi.h > browYpx) {
    fhRoi.h = Math.max(8, Math.round(browYpx - fhRoi.y));
  }

  return [
    fhRoi,
    roiFromIndices(landmarks, leftCheekIdx, W, H, 'left-cheek'),
    roiFromIndices(landmarks, rightCheekIdx, W, H, 'right-cheek'),
  ];
}

function roiFromIndices(landmarks, indices, W, H, label) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const idx of indices) {
    const lm = landmarks[idx];
    if (!lm) continue;
    if (lm.x < minX) minX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y > maxY) maxY = lm.y;
  }

  let x = minX * W;
  let y = minY * H;
  let w = (maxX - minX) * W;
  let h = (maxY - minY) * H;

  const px = w * PAD;
  const py = h * PAD;
  x -= px; y -= py;
  w += 2 * px; h += 2 * py;

  x = Math.max(0, x);
  y = Math.max(0, y);
  w = Math.min(w, W - x);
  h = Math.min(h, H - y);

  w = Math.max(w, 8);
  h = Math.max(h, 8);

  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
    label,
  };
}

// Legacy single-ROI export — returns just the forehead box.
export function foreheadRectFromLandmarks(landmarks, W, H) {
  return getRois(landmarks, W, H)[0];
}
