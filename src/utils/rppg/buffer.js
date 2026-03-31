// Ring buffer for storing time-series data
// Converts unevenly timed samples to evenly spaced signal for FFT

export class RingBuffer {
  constructor(seconds = 10, targetFps = 30) {
    this.seconds = seconds
    this.targetFps = targetFps
    this.samples = []
  }

  push(t, g) {
    this.samples.push({ t, g })

    const timeLimit = t - this.seconds

    // Remove old samples
    while (this.samples.length > 0 && this.samples[0].t < timeLimit) {
      this.samples.shift()
    }
  }

  values() {
    if (this.samples.length < 2) {
      return { y: [], t0: 0, dt: 0, n: 0 }
    }

    const t0 = this.samples[0].t
    const dt = 1 / this.targetFps
    const tEnd = this.samples[this.samples.length - 1].t

    let n = Math.floor((tEnd - t0) / dt) + 1
    if (n < 2) n = 2

    const y = []
    let j = 0

    for (let i = 0; i < n; i++) {
      const tg = t0 + i * dt

      while (j < this.samples.length - 2 && this.samples[j + 1].t < tg) {
        j++
      }

      const s0 = this.samples[j]
      const s1 = this.samples[j + 1]

      if (tg <= s0.t) {
        y.push(s0.g)
        continue
      }
      if (tg >= s1.t) {
        y.push(s1.g)
        continue
      }

      // Linear interpolation
      const denom = s1.t - s0.t
      if (denom <= 0) {
        y.push(s0.g)
      } else {
        const a = (tg - s0.t) / denom
        y.push(s0.g + a * (s1.g - s0.g))
      }
    }

    return { y, t0, dt, n }
  }

  get fs() {
    if (this.samples.length < 2) return 0

    const t0 = this.samples[0].t
    const tEnd = this.samples[this.samples.length - 1].t
    const duration = tEnd - t0

    if (duration <= 0) return 0

    return (this.samples.length - 1) / duration
  }

  getSamples() {
    return this.samples
  }

  clear() {
    this.samples = []
  }
}
