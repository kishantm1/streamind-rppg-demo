// dsp.ts — rPPG BPM estimator
//
// Key calibration notes:
//  - High-pass cutoff raised to 0.87 Hz (52 BPM) to eliminate sub-harmonic
//    false-locks in the 45–51 BPM range; minimum plausible resting HR is ~50 BPM
//    so this costs nothing in practice.
//  - Median window reduced to 3 readings for faster recovery from bad locks.
//  - Outlier clamp tightened to 15 BPM to block sub-harmonic drift while still
//    tracking genuine HR changes.
//  - Prior weight 0.25 keeps the FFT peak responsive without sticky lag.
//
// Module-level state (bpmHistory, lastHz) accumulates across calls; callers
// must invoke resetDsp() at the start of each session.

const MAX_HISTORY = 3;
const SNR_THRESHOLD = 3.0;
const PRIOR_SIGMA = 0.35;
const PRIOR_WEIGHT = 0.25;
const OUTLIER_BPM = 15;

const bpmHistory: number[] = [];
let lastHz: number | null = null;

export function estimateBpmFromWindow(x: number[], fs: number): number | null {
  if (!x || x.length < 64 || !Number.isFinite(fs) || fs <= 0) return null;

  // Remove slow drift (exposure/WB creep, posture shifts) before filtering.
  // A 2nd-order polynomial over the analysis window captures baseline wander
  // without representing anything near pulse frequencies.
  let y = detrendPoly(x);
  const mean = y.reduce((a, b) => a + b, 0) / y.length;
  y = y.map((v) => v - mean);

  const fHP = 0.87;
  const fLP = 3.0;
  y = biquadHighpass(y, fs, fHP);
  y = biquadLowpass(y, fs, fLP);

  const w = hann(y.length);
  const yw = y.map((v, i) => v * w[i]);
  const mag = rfftMag(yw);

  const kMin = Math.max(1, Math.ceil((fHP * y.length) / fs));
  const kMax = Math.min(mag.length - 2, Math.floor((fLP * y.length) / fs));
  if (kMax <= kMin) return null;

  const bandMag = mag.slice(kMin, kMax + 1);
  const noiseFloor = median(bandMag);
  const peakRaw = Math.max(...bandMag);
  if (noiseFloor === null || noiseFloor <= 0 || peakRaw / noiseFloor < SNR_THRESHOLD) return null;

  const weights = new Array<number>(kMax - kMin + 1).fill(1.0);
  if (lastHz !== null) {
    const kPrior = (lastHz * y.length) / fs;
    for (let k = kMin; k <= kMax; k++) {
      const diffHz = ((k - kPrior) * fs) / y.length;
      const gauss = Math.exp(-(diffHz * diffHz) / (2 * PRIOR_SIGMA * PRIOR_SIGMA));
      weights[k - kMin] = 1.0 - PRIOR_WEIGHT + PRIOR_WEIGHT * gauss;
    }
  }

  let bestK = kMin;
  let bestVal = -Infinity;
  for (let k = kMin; k <= kMax; k++) {
    const v = mag[k] * weights[k - kMin];
    if (v > bestVal) {
      bestVal = v;
      bestK = k;
    }
  }

  let freqHz: number;
  if (bestK > 0 && bestK < mag.length - 1) {
    const alpha = mag[bestK - 1];
    const beta = mag[bestK];
    const gamma = mag[bestK + 1];
    const denom = alpha - 2 * beta + gamma;
    const delta = denom !== 0 ? (0.5 * (alpha - gamma)) / denom : 0;
    freqHz = ((bestK + Math.max(-0.5, Math.min(0.5, delta))) * fs) / y.length;
  } else {
    freqHz = (bestK * fs) / y.length;
  }

  const rawBpm = freqHz * 60;
  if (rawBpm < 52 || rawBpm > 180) return null;

  if (lastHz !== null) {
    const priorBpm = lastHz * 60;
    if (Math.abs(rawBpm - priorBpm) > OUTLIER_BPM) return null;
  }

  lastHz = freqHz;
  bpmHistory.push(rawBpm);
  if (bpmHistory.length > MAX_HISTORY) bpmHistory.shift();

  return median(bpmHistory);
}

export function resetDsp(): void {
  bpmHistory.length = 0;
  lastHz = null;
}

function biquadLowpass(x: number[], fs: number, fc: number): number[] {
  const w0 = (2 * Math.PI * fc) / fs;
  const c = Math.cos(w0);
  const s = Math.sin(w0);
  const alpha = s / (2 * 0.7071);
  const b0 = (1 - c) / 2;
  const b1 = 1 - c;
  const b2 = (1 - c) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * c;
  const a2 = 1 - alpha;
  return applyBiquad(x, b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
}

function biquadHighpass(x: number[], fs: number, fc: number): number[] {
  const w0 = (2 * Math.PI * fc) / fs;
  const c = Math.cos(w0);
  const s = Math.sin(w0);
  const alpha = s / (2 * 0.7071);
  const b0 = (1 + c) / 2;
  const b1 = -(1 + c);
  const b2 = (1 + c) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * c;
  const a2 = 1 - alpha;
  return applyBiquad(x, b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
}

function applyBiquad(
  x: number[],
  b0: number,
  b1: number,
  b2: number,
  a1: number,
  a2: number,
): number[] {
  const y = new Array<number>(x.length).fill(0);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    y[i] = yi;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = yi;
  }
  return y;
}

function hann(N: number): number[] {
  return Array.from({ length: N }, (_, n) =>
    N <= 1 ? 1 : 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1))),
  );
}

function rfftMag(x: number[]): number[] {
  const N = x.length;
  const K = Math.floor(N / 2) + 1;
  const mag = new Array<number>(K);
  for (let k = 0; k < K; k++) {
    let re = 0;
    let im = 0;
    const f = (-2 * Math.PI * k) / N;
    for (let n = 0; n < N; n++) {
      re += x[n] * Math.cos(f * n);
      im += x[n] * Math.sin(f * n);
    }
    mag[k] = Math.sqrt(re * re + im * im);
  }
  return mag;
}

function median(arr: number[]): number | null {
  if (!arr?.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Subtract the best-fit quadratic a·t² + b·t + c from y (t = sample index).
// Closed-form OLS via Cramer's rule on the 3×3 normal-equations matrix.
// Returns the input unchanged if the system is singular.
function detrendPoly(y: number[]): number[] {
  const N = y.length;
  if (N < 3) return y.slice();

  let s0 = N;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let q0 = 0;
  let q1 = 0;
  let q2 = 0;
  for (let i = 0; i < N; i++) {
    const t = i;
    const t2 = t * t;
    const v = y[i];
    s1 += t;
    s2 += t2;
    s3 += t2 * t;
    s4 += t2 * t2;
    q0 += v;
    q1 += v * t;
    q2 += v * t2;
  }

  const m11 = s2 * s4 - s3 * s3;
  const m12 = s1 * s4 - s2 * s3;
  const m13 = s1 * s3 - s2 * s2;
  const det = s0 * m11 - s1 * m12 + s2 * m13;
  if (Math.abs(det) < 1e-12) return y.slice();

  const detC = q0 * m11 - s1 * (q1 * s4 - q2 * s3) + s2 * (q1 * s3 - q2 * s2);
  const detB = s0 * (q1 * s4 - q2 * s3) - q0 * m12 + s2 * (s1 * q2 - s2 * q1);
  const detA = s0 * (s2 * q2 - s3 * q1) - s1 * (s1 * q2 - s2 * q1) + q0 * m13;

  const c = detC / det;
  const b = detB / det;
  const a = detA / det;

  const out = new Array<number>(N);
  for (let i = 0; i < N; i++) {
    out[i] = y[i] - (a * i * i + b * i + c);
  }
  return out;
}
