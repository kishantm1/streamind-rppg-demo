// green.js
// Per-frame ROI colour extraction. Averages R, G, B means across all supplied
// ROIs and returns them as raw triples — POS projection now happens over a
// sliding window in pos.js, not per frame.

/**
 * Extract per-frame ROI-averaged RGB means.
 *
 * @param {CanvasRenderingContext2D} frameCtx - Context with current frame drawn
 * @param {Array<{x,y,w,h}>}         rois     - Array of ROI rectangles
 * @param {number}                   tsMs     - requestAnimationFrame timestamp (ms)
 * @returns {{ r: number, g: number, b: number, t: number } | null}
 */
export function getRgbSignal(frameCtx, rois, tsMs) {
  const roiMeans = []

  for (const roi of rois) {
    const mean = rgbMeanForRoi(frameCtx, roi)
    if (mean !== null) roiMeans.push(mean)
  }

  if (roiMeans.length === 0) return null

  let r = 0, g = 0, b = 0
  for (const m of roiMeans) { r += m.r; g += m.g; b += m.b }
  const k = roiMeans.length
  return { r: r / k, g: g / k, b: b / k, t: tsMs / 1000 }
}

function rgbMeanForRoi(frameCtx, roi) {
  const { x, y, w, h } = roi
  if (w <= 0 || h <= 0) return null

  const img = frameCtx.getImageData(x, y, w, h).data
  const n = w * h
  if (n === 0) return null

  let sumR = 0, sumG = 0, sumB = 0
  for (let i = 0; i < img.length; i += 4) {
    sumR += img[i]
    sumG += img[i + 1]
    sumB += img[i + 2]
  }

  const r = sumR / n, g = sumG / n, b = sumB / n
  if (r < 1 || g < 1 || b < 1) return null
  return { r, g, b }
}

// Legacy single-ROI export — raw green-channel mean. Kept for callers that
// don't need multi-ROI RGB.
export function getGreenMean(frameCtx, roi, tsMs) {
  const { x, y, w, h } = roi
  const img = frameCtx.getImageData(x, y, w, h).data
  let sumG = 0
  const n = w * h
  for (let i = 0; i < img.length; i += 4) sumG += img[i + 1]
  return { g: sumG / n, t: tsMs / 1000 }
}
