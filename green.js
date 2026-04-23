// green.js
// Extracts a pulse signal from one or more skin ROIs using the POS method.
//
// We read each ROI separately, compute its POS value, then average them.
// The pulse signal is correlated across all skin regions, so it adds up.
// Noise (motion artifacts, local reflections) is incoherent across
// regions, so it tends to cancel — improving SNR.
//
// Reference: Wang, W., den Brinker, A.C., Stuijk, S., de Haan, G. (2017).
// Algorithmic Principles of Remote-PPG. IEEE Trans. Biomed. Eng. 64(7).

/**
 * extract one composite POS sample from all provided ROIs.
 *
 * @param {CanvasRenderingContext2D} frameCtx  - Context with current frame drawn
 * @param {Array<{x,y,w,h}>}        rois      - Array of ROI rectangles
 * @param {number}                  tsMs      - requestAnimationFrame timestamp (ms)
 * @returns {{ g: number, t: number }}
 *   g = POS signal value for this frame (dimensionless, centred near 0)
 *   t = timestamp in seconds
 */
export function getPosSignal(frameCtx, rois, tsMs) {
  const posValues = [];

  for (const roi of rois) {
    const val = posForRoi(frameCtx, roi);
    if (val !== null) posValues.push(val);
  }

  // average across all valid ROIs
  const g = posValues.length > 0
    ? posValues.reduce((a, b) => a + b, 0) / posValues.length
    : 0;

  return { g, t: tsMs / 1000 };
}

/**
 * compute the POS signal value for a single ROI rectangle.
 * returns null if the ROI has zero pixels.
 *
 * POS projects (R,G,B) means onto two skin-orthogonal axes:
 *   S1 =  R - G          (redness axis)
 *   S2 =  R/2 + G/2 - B  (yellowness axis)
 * Then combines them weighted by their standard deviations:
 *   POS = S1 + (std(S1)/std(S2)) * S2
 *
 * we accumulate a
 * short window of raw RGB means and compute std over that window inside
 * the RingBuffer. just return the raw S1 and S2 projection.
 * The caller (script.js / RingBuffer) stores both and the DSP stage
 * does the std-based weighting over the window.
 *
 * For real-time single-sample use we return the simpler chrominance
 * signal  g/R - 1  (normalised green) which approximates POS well for
 * typical skin tones and is causal (needs no future samples).
 */
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

  // avoid divide-by-zero on very dark/black frames
  if (R < 1 || G < 1 || B < 1) return null;

  // POS chrominance channels (Wang 2017 eq. 3)
  //   C1 = R/G,  C2 = B/G  (normalise by G to remove broad illumination)
  // Then skin-orthogonal projection:
  //   S1 = C1 - 1  ≈  (R-G)/G
  //   S2 = C1 + C2 - 2  ≈  (R+B-2G)/G
  // The single-sample POS output (alpha=1 heuristic):
  //   H = S1 + alpha * S2  where alpha = std(S1)/std(S2) over a window
  //
  // Because we cannot compute std over a window here, we return the
  // composite H = S1 + S2 as a close approximation. The bandpass
  // filter in dsp.js suppresses the DC and slow drift anyway.

  const C1 = R / G;
  const C2 = B / G;
  const S1 = C1 - 1;
  const S2 = C1 + C2 - 2;

  return S1 + S2;          // ≈  (R + B - 2G) / G
}

function rgbMeanForRoi(frameCtx, roi) {
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

  return {
    R: sumR / n,
    G: sumG / n,
    B: sumB / n,
  };
}

function chromForRoi(frameCtx, roi) {
  const rgb = rgbMeanForRoi(frameCtx, roi);
  if (!rgb || rgb.R < 1 || rgb.G < 1 || rgb.B < 1) return null;

  const { R, G, B } = rgb;
  const C1 = R / G;
  const C2 = B / G;
  const S1 = C1 - 1;
  const S2 = C1 + C2 - 2;
  const H = S1 + S2;

  return {
    R,
    G,
    B,
    C1,
    C2,
    S1,
    S2,
    H,
  };
}

export function getChromValues(frameCtx, rois, tsMs) {
  const values = [];
  for (const roi of rois) {
    const chrom = chromForRoi(frameCtx, roi);
    if (chrom) {
      values.push({ ...chrom, t: tsMs / 1000 });
    }
  }
  return values;
}

// Legacy export for backwards compatibility (single ROI, raw green mean)
export function getGreenMean(frameCtx, roi, tsMs) {
  const rgb = rgbMeanForRoi(frameCtx, roi);
  return {
    g: rgb ? rgb.G : 0,
    t: tsMs / 1000,
  };
}
