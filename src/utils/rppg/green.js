// green.js
// Extracts a pulse signal from one or more skin ROIs using the POS method.
//
// Each ROI is projected onto two skin-orthogonal chrominance channels (S1, S2)
// and combined into a single per-frame sample. Averaging across multiple ROIs
// (forehead + cheeks) boosts SNR because the pulse is correlated across skin
// regions while motion/lighting noise is not.
//
// Reference: Wang, W., den Brinker, A.C., Stuijk, S., de Haan, G. (2017).
// Algorithmic Principles of Remote-PPG. IEEE Trans. Biomed. Eng. 64(7).

/**
 * Extract a composite POS sample from all provided ROIs.
 *
 * @param {CanvasRenderingContext2D} frameCtx - Context with current frame drawn
 * @param {Array<{x,y,w,h}>}         rois     - Array of ROI rectangles
 * @param {number}                   tsMs     - requestAnimationFrame timestamp (ms)
 * @returns {{ g: number, t: number }}
 */
export function getPosSignal(frameCtx, rois, tsMs) {
  const posValues = [];

  for (const roi of rois) {
    const val = posForRoi(frameCtx, roi);
    if (val !== null) posValues.push(val);
  }

  const g = posValues.length > 0
    ? posValues.reduce((a, b) => a + b, 0) / posValues.length
    : 0;

  return { g, t: tsMs / 1000 };
}

function posForRoi(frameCtx, roi) {
  const { x, y, w, h } = roi;
  if (w <= 0 || h <= 0) return null;

  const img = frameCtx.getImageData(x, y, w, h).data;
  const n = w * h;
  if (n === 0) return null;

  let sumR = 0, sumG = 0, sumB = 0;
  for (let i = 0; i < img.length; i += 4) {
    sumR += img[i];
    sumG += img[i + 1];
    sumB += img[i + 2];
  }

  const R = sumR / n;
  const G = sumG / n;
  const B = sumB / n;

  if (R < 1 || G < 1 || B < 1) return null;

  // POS chrominance projection (Wang 2017): normalise by G, then
  // compose S1 + S2 as a causal single-sample approximation.
  const C1 = R / G;
  const C2 = B / G;
  const S1 = C1 - 1;
  const S2 = C1 + C2 - 2;

  return S1 + S2;
}

// Legacy single-ROI export — raw green-channel mean. Kept for callers that
// don't need multi-ROI POS.
export function getGreenMean(frameCtx, roi, tsMs) {
  const { x, y, w, h } = roi;
  const img = frameCtx.getImageData(x, y, w, h).data;
  let sumG = 0;
  const n = w * h;
  for (let i = 0; i < img.length; i += 4) sumG += img[i + 1];
  return { g: sumG / n, t: tsMs / 1000 };
}
