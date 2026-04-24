// pos.js — Sliding-window Plane-Orthogonal-to-Skin (POS) pulse extraction.
//
// Reference: Wang, W., den Brinker, A.C., Stuijk, S., de Haan, G. (2017).
// Algorithmic Principles of Remote-PPG. IEEE Trans. Biomed. Eng. 64(7).
//
// The per-frame POS approximation in green.js fed a single projected scalar
// into the buffer. The full algorithm operates on a sliding window:
//   1. Inside each window, normalise each channel by its temporal mean.
//   2. Project onto two chrominance axes S1 = Gn - Bn, S2 = -2Rn + Gn + Bn.
//   3. Mix as h = S1 + (std(S1)/std(S2))·S2 — the std ratio is what actually
//      cancels motion/specular reflection, and it is window-local.
//   4. Overlap-add the detrended h back into the output signal.
//
// This is materially more robust than S1+S2 because alpha adapts to each
// window's lighting and motion characteristics.

const DEFAULT_WINDOW_SEC = 1.6

/**
 * Apply sliding-window POS to evenly-sampled ROI-mean RGB signals.
 *
 * @param {number[]} R  - red channel means, evenly sampled at `fs` Hz
 * @param {number[]} G  - green channel means
 * @param {number[]} B  - blue channel means
 * @param {number}   fs - sample rate in Hz
 * @param {number}  [windowSec=1.6] - sliding window length in seconds
 * @returns {number[]} pulse signal of length R.length
 */
export function posSlidingWindow(R, G, B, fs, windowSec = DEFAULT_WINDOW_SEC) {
  const N = R.length
  const out = new Array(N).fill(0)

  if (N === 0 || !(fs > 0)) return out

  const winLen = Math.max(2, Math.round(windowSec * fs))
  if (N < winLen) return out

  for (let end = winLen; end <= N; end++) {
    const start = end - winLen

    let rMean = 0, gMean = 0, bMean = 0
    for (let i = start; i < end; i++) {
      rMean += R[i]; gMean += G[i]; bMean += B[i]
    }
    rMean /= winLen; gMean /= winLen; bMean /= winLen

    if (rMean < 1e-6 || gMean < 1e-6 || bMean < 1e-6) continue

    const S1 = new Array(winLen)
    const S2 = new Array(winLen)
    let s1Mean = 0, s2Mean = 0
    for (let i = 0; i < winLen; i++) {
      const rn = R[start + i] / rMean
      const gn = G[start + i] / gMean
      const bn = B[start + i] / bMean
      const s1 = gn - bn
      const s2 = -2 * rn + gn + bn
      S1[i] = s1; S2[i] = s2
      s1Mean += s1; s2Mean += s2
    }
    s1Mean /= winLen; s2Mean /= winLen

    let s1Var = 0, s2Var = 0
    for (let i = 0; i < winLen; i++) {
      const d1 = S1[i] - s1Mean, d2 = S2[i] - s2Mean
      s1Var += d1 * d1; s2Var += d2 * d2
    }
    const s1Std = Math.sqrt(s1Var / winLen)
    const s2Std = Math.sqrt(s2Var / winLen)
    if (s2Std < 1e-9) continue

    const alpha = s1Std / s2Std
    const hMean = s1Mean + alpha * s2Mean

    for (let i = 0; i < winLen; i++) {
      out[start + i] += S1[i] + alpha * S2[i] - hMean
    }
  }

  return out
}
