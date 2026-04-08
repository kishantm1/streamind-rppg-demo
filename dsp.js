// dsp.js
export function estimateBpmFromWindow(x, fs) {
  if (!x || x.length < 128 || !Number.isFinite(fs) || fs <= 0) return null;

  let y = x.slice();

  // Linear detrend: removes slow ramp caused by lighting changes
  y = detrend(y);

  const fHP = 0.8;  // (48 BPM floor)
  const fLP = 3.0;   // ~180 BPM

  // Apply filters twice (forward + backward) for zero-phase 2nd order effect
  y = filtfilt(y, fs, fHP, "high");
  y = filtfilt(y, fs, fLP, "low");

  // Pad to next power of 2 for FFT
  const N = nextPow2(y.length);
  const padded = new Array(N).fill(0);
  y.forEach((v, i) => (padded[i] = v));

  // Hann window
  const w = hann(y.length);
  const yw = padded.map((v, i) => (i < y.length ? v * w[i] : 0));

  const mag = fftMag(yw);

  const kMin = Math.max(1, Math.ceil(fHP * N / fs));
  const kMax = Math.min(mag.length - 1, Math.floor(fLP * N / fs));
  if (kMax <= kMin) return null;

  let bestK = -1;
  let bestVal = -Infinity;
  for (let k = kMin; k <= kMax; k++) {
    if (mag[k] > bestVal) {
      bestVal = mag[k];
      bestK = k;
    }
  }

  if (bestK <= 0) return null;

  const freqHz = (bestK * fs) / N;
  const bpm = freqHz * 60;

  if (bpm < 45 || bpm > 200) return null;

  return bpm;
}

// Zero-phase filter: apply forward then backward (doubles the filter order, removes phase shift)
function filtfilt(x, fs, fc, type) {
  const forward  = firstOrderFilter(x,           fs, fc, type);
  const backward = firstOrderFilter(forward.slice().reverse(), fs, fc, type);
  return backward.reverse();
}

function firstOrderFilter(x, fs, fc, type) {
  const dt = 1 / fs;
  const RC = 1 / (2 * Math.PI * fc);
  const y = new Array(x.length);

  if (type === "low") {
    const alpha = dt / (RC + dt);
    y[0] = x[0];
    for (let i = 1; i < x.length; i++) {
      y[i] = y[i - 1] + alpha * (x[i] - y[i - 1]);
    }
  } else {
    // high-pass
    const alpha = RC / (RC + dt);
    y[0] = 0;
    for (let i = 1; i < x.length; i++) {
      y[i] = alpha * (y[i - 1] + x[i] - x[i - 1]);
    }
  }
  return y;
}

function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function hann(N) {
  const w = new Array(N);
  if (N <= 1) { w[0] = 1; return w; }
  for (let n = 0; n < N; n++) {
    w[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)));
  }
  return w;
}

function fft(re, im) {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm;
        const vIm = re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe;
        re[i + j]           = uRe + vRe;
        im[i + j]           = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe;
        im[i + j + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm        = curRe * wIm + curIm * wRe;
        curRe        = nextRe;
      }
    }
  }
}

function detrend(x) {
  const N = x.length;
  // Fit a straight line through the signal and subtract it
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < N; i++) {
    sumX  += i;
    sumY  += x[i];
    sumXY += i * x[i];
    sumX2 += i * i;
  }
  const denom = N * sumX2 - sumX * sumX;
  const slope     = denom !== 0 ? (N * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / N;
  return x.map((v, i) => v - (slope * i + intercept));
}

function fftMag(x) {
  const N = x.length;
  const re = x.slice();
  const im = new Array(N).fill(0);
  fft(re, im);
  const K = Math.floor(N / 2) + 1;
  const mag = new Array(K);
  for (let k = 0; k < K; k++) {
    mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
  }
  return mag;
}

