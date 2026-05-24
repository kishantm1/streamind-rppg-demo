import { describe, it, expect } from 'vitest'
import { RingBuffer } from './buffer'

describe('RingBuffer', () => {
  it('returns empty values when fewer than 2 samples', () => {
    const b = new RingBuffer(10, 30)
    expect(b.values()).toEqual({ y: [], t0: 0, dt: 0, n: 0 })
    b.push(0, 1)
    expect(b.values().y).toEqual([])
  })

  it('drops samples older than the window', () => {
    const b = new RingBuffer(1, 30) // 1 second window
    b.push(0, 1)
    b.push(0.5, 2)
    b.push(1.2, 3)
    // 0 is now > 1 second old → dropped
    expect(b.getSamples().map(s => s.g)).toEqual([2, 3])
  })

  it('resamples linearly to the target fps grid', () => {
    const b = new RingBuffer(10, 30)
    // Unevenly-spaced samples
    b.push(0, 0)
    b.push(1, 10) // linear ramp
    const { y, dt, n } = b.values()
    expect(dt).toBeCloseTo(1 / 30, 6)
    expect(n).toBe(y.length)
    // First value should be 0
    expect(y[0]).toBeCloseTo(0, 6)
    // Last value should be near 10
    expect(y[y.length - 1]).toBeCloseTo(10, 1)
    // Mid value should be roughly half
    expect(y[Math.floor(y.length / 2)]).toBeGreaterThan(4)
    expect(y[Math.floor(y.length / 2)]).toBeLessThan(6)
  })

  it('fs reflects actual sample rate', () => {
    const b = new RingBuffer(10, 30)
    for (let i = 0; i < 31; i++) b.push(i / 30, i)
    expect(b.fs).toBeCloseTo(30, 0)
  })
})
