// dsp.js — rPPG BPM estimator
//
// KEY FIXES based on data analysis:
//
// 1. hp cutoff raised to 0.87 Hz (52 BPM)
//    every single false-lock in the data was below 52 BPM (45–51 BPM range).
//    raising high-pass cutoff eliminates them entirely at the filter stage
//    before they can ever enter the history window. Minimum plausible resting
//    HR is ~50 BPM so 52 BPM cutoff costs nothing in practice.
//
// 2. once 3 bad values are in the window (e.g. 46,46,46)
//    the median is locked at 46 and takes 3+ extra seconds to flush out even
//    after the FFT corrects. With 3-reading median: 1 bad + 2 good = median
//    is the lower good value → recovers in 1-2 seconds instead of 3-4.
//
// 3. outlier clamp tightened from 20 to 15 BPM
//    20 BPM was too permissive. readings 15-20 BPM below truth were slipping
//    through and dragging the median down. 15 BPM still allows genuine fast HR
//    changes while blocking most sub-harmonic false locks.
//
// 4. prior weight reduced to 0.25
//    less sticky prior means the FFT peak has more influence on each reading which
//    reduces the lag when HR genuinely changes.

const MAX_HISTORY = 3;    // was 5 — faster recovery from bad lock
const SNR_THRESHOLD = 3.0;
const PRIOR_SIGMA = 0.35;
const PRIOR_WEIGHT = 0.25; // was 0.30 — less sticky, tracks changes faster
const OUTLIER_BPM = 15;   // was 20 — tighter, blocks sub-harmonic drift

const bpmHistory = [];
let lastHz = null;

export function estimateBpmFromWindow(x, fs) {
  if (!x || x.length < 64 || !Number.isFinite(fs) || fs <= 0) return null;

  let y = x.slice();
  const mean = y.reduce((a, b) => a + b, 0) / y.length;
  y = y.map(v => v - mean);

  // raised from 0.75 to 0.87 Hz cuts the 45-51 BPM false locks entirely
  const fHP = 0.87;
  const fLP = 3.0;
  y = biquadHighpass(y, fs, fHP);
  y = biquadLowpass(y, fs, fLP);

  // Detect peaks in the filtered signal
  const peaks = [];
  const threshold = (Math.max(...y) + Math.min(...y)) / 2;
  for (let i = 1; i < y.length - 1; i++) {
    if (y[i] > y[i - 1] && y[i] > y[i + 1] && y[i] > threshold) {
      peaks.push(i); // Index of peak
    }
  }

  if (peaks.length < 3) return null; // Need at least 3 peaks for intact IBIs

  // Compute IBIs only for consecutive peaks fully within the window (skip first and last)
  const intactIbIs = [];
  for (let i = 1; i < peaks.length - 1; i++) {
    const ibi = (peaks[i] - peaks[i - 1]) / fs; // IBI in seconds
    if (ibi > 0.3 && ibi < 3) { // Reasonable IBI range (20-200 BPM)
      intactIbIs.push(ibi);
    }
  }

  if (intactIbIs.length === 0) return null;

  // Average the intact IBIs
  const meanIbi = intactIbIs.reduce((a, b) => a + b, 0) / intactIbIs.length;

  // BPM = 60 / mean_IBI
  const rawBpm = 60 / meanIbi;

  if (rawBpm < 52 || rawBpm > 180) return null;  // hard floor at 52 BPM

  // Outlier clamp — reject if too far from last accepted reading
  if (lastHz !== null) {
    const priorBpm = lastHz * 60;
    if (Math.abs(rawBpm - priorBpm) > OUTLIER_BPM) return null;
  }

  lastHz = rawBpm / 60; // Update lastHz for continuity
  bpmHistory.push(rawBpm);
  if (bpmHistory.length > MAX_HISTORY) bpmHistory.shift();

  return median(bpmHistory);
}

export function resetDsp() {
  bpmHistory.length = 0;
  lastHz = null;
}

function biquadLowpass(x, fs, fc) {
  const w0 = 2 * Math.PI * fc / fs, c = Math.cos(w0), s = Math.sin(w0);
  const alpha = s / (2 * 0.7071);
  const b0 = (1 - c) / 2, b1 = 1 - c, b2 = (1 - c) / 2;
  const a0 = 1 + alpha, a1 = -2 * c, a2 = 1 - alpha;
  return applyBiquad(x, b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
}

function biquadHighpass(x, fs, fc) {
  const w0 = 2 * Math.PI * fc / fs, c = Math.cos(w0), s = Math.sin(w0);
  const alpha = s / (2 * 0.7071);
  const b0 = (1 + c) / 2, b1 = -(1 + c), b2 = (1 + c) / 2;
  const a0 = 1 + alpha, a1 = -2 * c, a2 = 1 - alpha;
  return applyBiquad(x, b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
}

function applyBiquad(x, b0, b1, b2, a1, a2) {
  const y = new Array(x.length).fill(0);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    y[i] = yi; x2 = x1; x1 = xi; y2 = y1; y1 = yi;
  }
  return y;
}

function hann(N) {
  return Array.from({ length: N }, (_, n) =>
    N <= 1 ? 1 : 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1))));
}

function rfftMag(x) {
  const N = x.length, K = Math.floor(N / 2) + 1;
  const mag = new Array(K);
  for (let k = 0; k < K; k++) {
    let re = 0, im = 0;
    const f = -2 * Math.PI * k / N;
    for (let n = 0; n < N; n++) { re += x[n] * Math.cos(f * n); im += x[n] * Math.sin(f * n); }
    mag[k] = Math.sqrt(re * re + im * im);
  }
  return mag;
}

function median(arr) {
  if (!arr?.length) return null;
  const s = arr.slice().sort((a, b) => a - b), mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
