import { describe, it, expect } from 'vitest'
import { getRois, foreheadRectFromLandmarks } from './roi'

// Build a synthetic 478-landmark array (MediaPipe FaceLandmarker indices)
// Place all landmarks at (0.5, 0.5) by default, then override the ones we care
// about so the resulting rectangles are well-defined.
function makeLandmarks(overrides = {}) {
  const lms = new Array(478).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0 }))
  for (const [idx, pt] of Object.entries(overrides)) {
    lms[Number(idx)] = { z: 0, ...pt }
  }
  return lms
}

describe('getRois', () => {
  // A coherent face: forehead landmarks near top-center, cheek landmarks
  // on left/right at mid-height.
  const W = 640
  const H = 480

  function syntheticFace() {
    const o = {}
    // Brow-top ridge (indices 70,63,105,66,107,336,296,334,293,300) at y=0.30
    for (const i of [70, 63, 105, 66, 107, 336, 296, 334, 293, 300]) {
      o[i] = { x: 0.35 + 0.3 * Math.random() * 0, y: 0.30 } // jitter-free
    }
    // Mid-forehead (54,68,104,69,108,151,337,299,333,298) at y=0.22
    for (const i of [54, 68, 104, 69, 108, 151, 337, 299, 333, 298]) {
      o[i] = { x: 0.4 + (i % 7) * 0.02, y: 0.22 }
    }
    // Left cheek (117,118,101,36,205,187,123) around (0.30, 0.55)
    for (const i of [117, 118, 101, 36, 205, 187, 123]) {
      o[i] = { x: 0.30, y: 0.55 }
    }
    // Right cheek (346,347,330,266,425,411,352) around (0.70, 0.55)
    for (const i of [346, 347, 330, 266, 425, 411, 352]) {
      o[i] = { x: 0.70, y: 0.55 }
    }
    return makeLandmarks(o)
  }

  it('returns three labeled ROIs', () => {
    const rois = getRois(syntheticFace(), W, H)
    expect(rois).toHaveLength(3)
    expect(rois[0].label).toBe('forehead')
    expect(rois[1].label).toBe('left-cheek')
    expect(rois[2].label).toBe('right-cheek')
  })

  it('each ROI fits inside the canvas bounds', () => {
    const rois = getRois(syntheticFace(), W, H)
    for (const r of rois) {
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.x + r.w).toBeLessThanOrEqual(W)
      expect(r.y + r.h).toBeLessThanOrEqual(H)
      expect(r.w).toBeGreaterThanOrEqual(8)
      expect(r.h).toBeGreaterThanOrEqual(8)
    }
  })

  it('forehead sits above both cheeks', () => {
    const [forehead, left, right] = getRois(syntheticFace(), W, H)
    expect(forehead.y + forehead.h).toBeLessThanOrEqual(left.y + 5)
    expect(forehead.y + forehead.h).toBeLessThanOrEqual(right.y + 5)
  })

  it('left cheek is to the left of right cheek', () => {
    const [, left, right] = getRois(syntheticFace(), W, H)
    expect(left.x).toBeLessThan(right.x)
  })

  it('legacy foreheadRectFromLandmarks returns the forehead ROI', () => {
    const r = foreheadRectFromLandmarks(syntheticFace(), W, H)
    expect(r.label).toBe('forehead')
  })
})
