import { describe, it, expect } from 'vitest'
import { getPosSignal, getGreenMean } from './green'

// Stub canvas context: every pixel in any requested rectangle is the same
// (r,g,b,255). Lets us drive the POS / green-mean math from JS land.
function makeFrameCtx(r, g, b) {
  return {
    getImageData(_x, _y, w, h) {
      const len = w * h * 4
      const data = new Uint8ClampedArray(len)
      for (let i = 0; i < len; i += 4) {
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = 255
      }
      return { data, width: w, height: h }
    },
  }
}

describe('getPosSignal', () => {
  const rois = [
    { x: 0, y: 0, w: 4, h: 4 },
    { x: 0, y: 0, w: 4, h: 4 },
  ]

  it('returns a numeric g and t/1000 timestamp', () => {
    const ctx = makeFrameCtx(180, 120, 90)
    const out = getPosSignal(ctx, rois, 2000)
    expect(out.t).toBeCloseTo(2.0, 6)
    expect(typeof out.g).toBe('number')
    expect(Number.isFinite(out.g)).toBe(true)
  })

  it('produces value matching analytic POS combination S1+S2 = (2R+B-3G)/G', () => {
    // From the code: C1=R/G, C2=B/G, S1=C1-1, S2=C1+C2-2, return S1+S2
    //   = (R-G)/G + (R+B-2G)/G  =  (2R + B - 3G) / G
    const R = 180, G = 120, B = 90
    const expected = (2 * R + B - 3 * G) / G
    const ctx = makeFrameCtx(R, G, B)
    const { g } = getPosSignal(ctx, rois, 0)
    expect(g).toBeCloseTo(expected, 5)
  })

  it('returns 0 when all ROIs are too dark (rejected)', () => {
    const ctx = makeFrameCtx(0, 0, 0)
    const { g } = getPosSignal(ctx, rois, 0)
    expect(g).toBe(0)
  })

  it('handles empty ROI list by returning g=0', () => {
    const ctx = makeFrameCtx(180, 120, 90)
    const { g } = getPosSignal(ctx, [], 1000)
    expect(g).toBe(0)
  })
})

describe('getGreenMean (legacy)', () => {
  it('returns the mean green value over a uniform region', () => {
    const ctx = makeFrameCtx(10, 130, 50)
    const { g, t } = getGreenMean(ctx, { x: 0, y: 0, w: 4, h: 4 }, 5000)
    expect(g).toBeCloseTo(130, 6)
    expect(t).toBeCloseTo(5, 6)
  })
})
