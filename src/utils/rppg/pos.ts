// pos.ts — Sliding-window Plane-Orthogonal-to-Skin (POS) pulse extraction.
//
// Reference: Wang, W., den Brinker, A.C., Stuijk, S., de Haan, G. (2017).
// Algorithmic Principles of Remote-PPG. IEEE Trans. Biomed. Eng. 64(7).

const DEFAULT_WINDOW_SEC = 1.6;

export function posSlidingWindow(
  R: number[],
  G: number[],
  B: number[],
  fs: number,
  windowSec: number = DEFAULT_WINDOW_SEC,
): number[] {
  const N = R.length;
  const out = new Array<number>(N).fill(0);

  if (N === 0 || !(fs > 0)) return out;

  const winLen = Math.max(2, Math.round(windowSec * fs));
  if (N < winLen) return out;

  for (let end = winLen; end <= N; end++) {
    const start = end - winLen;

    let rMean = 0;
    let gMean = 0;
    let bMean = 0;
    for (let i = start; i < end; i++) {
      rMean += R[i];
      gMean += G[i];
      bMean += B[i];
    }
    rMean /= winLen;
    gMean /= winLen;
    bMean /= winLen;

    if (rMean < 1e-6 || gMean < 1e-6 || bMean < 1e-6) continue;

    const S1 = new Array<number>(winLen);
    const S2 = new Array<number>(winLen);
    let s1Mean = 0;
    let s2Mean = 0;
    for (let i = 0; i < winLen; i++) {
      const rn = R[start + i] / rMean;
      const gn = G[start + i] / gMean;
      const bn = B[start + i] / bMean;
      const s1 = gn - bn;
      const s2 = -2 * rn + gn + bn;
      S1[i] = s1;
      S2[i] = s2;
      s1Mean += s1;
      s2Mean += s2;
    }
    s1Mean /= winLen;
    s2Mean /= winLen;

    let s1Var = 0;
    let s2Var = 0;
    for (let i = 0; i < winLen; i++) {
      const d1 = S1[i] - s1Mean;
      const d2 = S2[i] - s2Mean;
      s1Var += d1 * d1;
      s2Var += d2 * d2;
    }
    const s1Std = Math.sqrt(s1Var / winLen);
    const s2Std = Math.sqrt(s2Var / winLen);
    if (s2Std < 1e-9) continue;

    const alpha = s1Std / s2Std;
    const hMean = s1Mean + alpha * s2Mean;

    for (let i = 0; i < winLen; i++) {
      out[start + i] += S1[i] + alpha * S2[i] - hMean;
    }
  }

  return out;
}
