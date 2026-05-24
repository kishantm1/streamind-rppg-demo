import { describe, it, expect, beforeEach } from 'vitest'
import { estimateBpmFromWindow, resetDsp } from './dsp'

function sineWave({ bpm, fs, durationSec }) {
  const f = bpm / 60
  const n = Math.floor(fs * durationSec)
  const x = new Array(n)
  for (let i = 0; i < n; i++) {
    x[i] = Math.sin(2 * Math.PI * f * (i / fs))
  }
  return x
}

describe('estimateBpmFromWindow', () => {
  beforeEach(() => resetDsp())

  it('returns null for short signals', () => {
    expect(estimateBpmFromWindow([1, 2, 3], 30)).toBeNull()
  })

  it('returns null for invalid fs', () => {
    const x = sineWave({ bpm: 75, fs: 30, durationSec: 10 })
    expect(estimateBpmFromWindow(x, 0)).toBeNull()
    expect(estimateBpmFromWindow(x, NaN)).toBeNull()
  })

  it('recovers a known BPM from a clean sine wave (75 BPM)', () => {
    const x = sineWave({ bpm: 75, fs: 30, durationSec: 10 })
    const bpm = estimateBpmFromWindow(x, 30)
    expect(bpm).not.toBeNull()
    expect(Math.abs(bpm - 75)).toBeLessThan(2)
  })

  it('recovers a different BPM from a clean sine wave (120 BPM)', () => {
    const x = sineWave({ bpm: 120, fs: 30, durationSec: 10 })
    const bpm = estimateBpmFromWindow(x, 30)
    expect(bpm).not.toBeNull()
    expect(Math.abs(bpm - 120)).toBeLessThan(2)
  })

  it('never reports a BPM below the 52 BPM hard floor', () => {
    // Try several sub-floor inputs; the function must return either null
    // (highpass + SNR gate killed it) or some bpm >= 52 (peak shifted up),
    // but never a value below 52.
    for (const bpm of [20, 30, 40, 48]) {
      const x = sineWave({ bpm, fs: 30, durationSec: 10 })
      const out = estimateBpmFromWindow(x, 30)
      if (out !== null) expect(out).toBeGreaterThanOrEqual(52)
      resetDsp()
    }
  })

  it('returns null on pure DC input (no oscillation)', () => {
    const dc = new Array(300).fill(0.5)
    expect(estimateBpmFromWindow(dc, 30)).toBeNull()
  })

  it('resetDsp clears history so first reading is unanchored', () => {
    // Seed with one estimate
    const a = sineWave({ bpm: 75, fs: 30, durationSec: 10 })
    estimateBpmFromWindow(a, 30)
    // Without reset, switching to 130 BPM would be clamped by OUTLIER_BPM=15
    // After reset, it should be free to lock onto the new peak
    resetDsp()
    const b = sineWave({ bpm: 130, fs: 30, durationSec: 10 })
    const bpm = estimateBpmFromWindow(b, 30)
    expect(bpm).not.toBeNull()
    expect(Math.abs(bpm - 130)).toBeLessThan(2)
  })
})
