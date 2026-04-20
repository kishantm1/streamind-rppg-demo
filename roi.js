// roi.js
// computes three skin ROIs from MediaPipe face landmarks:
//   1. Forehead   — tight strip between eyebrow ridge and mid-forehead skin
//   2. Left cheek — landmarks on the left cheekbone
//   3. Right cheek— landmarks on the right cheekbone
//
// The forehead box is deliberately kept short vertically:
//   - Bottom edge: clamped to just above the brow-top landmarks so eyebrows stay out
//   - Top edge:    built from mid-forehead points (151 and neighbours) — not landmark
//                  10 which sits near the hairline
//
// MediaPipe FaceLandmarker 478-point indices used:
//   Brow-top ridge  : 70,63,105,66,107  (left)  336,296,334,293,300 (right)
//   Mid-forehead    : 54,68,104,69,108,151,337,299,333,298
//   Left cheek      : 117,118,101,36,205,187,123
//   Right cheek     : 346,347,330,266,425,411,352

// How much to pad each ROI outward from its landmark hull (fraction of span).
// Smaller = tighter box, less risk of drifting off skin.
const PAD = 0.08;

/**
 * Returns an array of ROI rectangles in pixel coordinates.
 *   [0] = forehead, [1] = left-cheek, [2] = right-cheek
 *
 * @param {Array}  landmarks  - Array of {x,y,z} in normalised [0,1] coords
 * @param {number} W          - Canvas / video width  in pixels
 * @param {number} H          - Canvas / video height in pixels
 * @returns {Array<{x,y,w,h,label}>}
 */
export function getRois(landmarks, W, H) {
  // Brow-top ridge points — used both as part of the forehead hull and as a
  // hard lower-boundary clamp so the box never drops onto the eyebrows.
  const browTopIdx = [70, 63, 105, 66, 107, 336, 296, 334, 293, 300];

  // Mid-forehead skin strip — excludes landmark 10 (hairline) intentionally.
  const midForeheadIdx = [54, 68, 104, 69, 108, 151, 337, 299, 333, 298];

  // Full set used to size the box: brow-top (bottom boundary) + mid-forehead (top boundary)
  const foreheadIdx = [...browTopIdx, ...midForeheadIdx];

  // Left cheek (viewer's left = face's anatomical right)
  const leftCheekIdx = [117, 118, 101, 36, 205, 187, 123];

  // Right cheek
  const rightCheekIdx = [346, 347, 330, 266, 425, 411, 352];

  // Build forehead box from the combined hull
  const fhRoi = roiFromIndices(landmarks, foreheadIdx, W, H, 'forehead');

  // Hard-clamp the bottom edge: find the lowest (max-y) brow-top point and
  // make sure the box bottom does not go below it.
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

/**
 * Build a padded axis-aligned bounding box from a subset of landmark indices.
 * Clamps to canvas bounds and enforces a minimum 8×8 pixel size.
 */
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

  // Convert normalised → pixels
  let x = minX * W;
  let y = minY * H;
  let w = (maxX - minX) * W;
  let h = (maxY - minY) * H;

  // Expand by PAD fraction on all sides
  const px = w * PAD;
  const py = h * PAD;
  x -= px; y -= py;
  w += 2 * px; h += 2 * py;

  // Clamp to canvas bounds
  x = Math.max(0, x);
  y = Math.max(0, y);
  w = Math.min(w, W - x);
  h = Math.min(h, H - y);

  // Enforce a minimum size so getImageData never receives 0×0
  w = Math.max(w, 8);
  h = Math.max(h, 8);

  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), label };
}

// Legacy single-ROI export — kept so nothing breaks if still imported elsewhere
export function foreheadRectFromLandmarks(landmarks, W, H) {
  return getRois(landmarks, W, H)[0];
}
