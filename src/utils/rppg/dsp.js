// Digital Signal Processing for BPM estimation
// Steps: detrend -> bandpass filter -> window -> FFT -> peak detection

// Hann window to reduce spectral leakage
function hann(N) {
  const w = new Array(N)
  if (N <= 1) {
    for (let i = 0; i < N; i++) w[i] = 1
    return w
  }
  for (let n = 0; n < N; n++) {
    w[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)))
  }
  return w
}

// Real FFT magnitude computation
function rfftMag(x) {
  const N = x.length
  const K = Math.floor(N / 2) + 1
  const mag = new Array(K).fill(0)

  for (let k = 0; k < K; k++) {
    let re = 0, im = 0
    for (let n = 0; n < N; n++) {
      const ang = (-2 * Math.PI * k * n) / N
      re += x[n] * Math.cos(ang)
      im += x[n] * Math.sin(ang)
    }
    mag[k] = Math.sqrt(re * re + im * im)
  }
  return mag
}

// First-order low-pass filter
function firstorderlowpass(x, fs, fc) {
  const dt = 1 / fs
  const RC = 1 / (2 * Math.PI * fc)
  const alpha = dt / (RC + dt)

  const y = new Array(x.length)
  y[0] = x[0]
  for (let i = 1; i < x.length; i++) {
    y[i] = y[i - 1] + alpha * (x[i] - y[i - 1])
  }
  return y
}

// First-order high-pass filter
function firstorderhighpass(x, fs, fc) {
  const dt = 1 / fs
  const RC = 1 / (2 * Math.PI * fc)
  const alpha = RC / (RC + dt)

  const y = new Array(x.length)
  y[0] = 0
  for (let i = 1; i < x.length; i++) {
    y[i] = alpha * (y[i - 1] + x[i] - x[i - 1])
  }
  return y
}

export function estimateBpmFromWindow(x, fs) {
  // Need enough samples and valid sampling rate
  if (!x || x.length < 128 || !Number.isFinite(fs) || fs <= 0) return null

  let y = x.slice()

  // Remove mean (center signal around 0)
  const mean = y.reduce((a, b) => a + b, 0) / y.length
  y = y.map(v => v - mean)

  // Bandpass filtering: 0.7 Hz (42 BPM) to 3.0 Hz (180 BPM)
  const fHP = 0.7
  const fLP = 3.0
  y = firstorderhighpass(y, fs, fHP)
  y = firstorderlowpass(y, fs, fLP)

  // Apply Hann window
  const w = hann(y.length)
  const yw = y.map((v, i) => v * w[i])

  // FFT magnitude spectrum
  const mag = rfftMag(yw)

  // Find peak between fHP and fLP
  const kMin = Math.max(1, Math.floor(fHP * y.length / fs))
  const kMax = Math.min(mag.length - 1, Math.floor(fLP * y.length / fs))

  if (kMax <= kMin) return null

  let bestK = -1
  let bestVal = -Infinity

  for (let k = kMin; k <= kMax; k++) {
    if (mag[k] > bestVal) {
      bestVal = mag[k]
      bestK = k
    }
  }

  if (bestK <= 0) return null

  // Convert FFT index to frequency (Hz) to BPM
  const freqHz = (bestK * fs) / y.length
  const bpm = freqHz * 60

  // Sanity check
  if (bpm < 35 || bpm > 220) return null

  return bpm
}
