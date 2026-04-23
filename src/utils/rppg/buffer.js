// Ring buffer for storing time-series rPPG samples.
// Converts unevenly timed camera frames into an evenly-spaced signal
// (linear interpolation) that the FFT in dsp.js can process.

export class RingBuffer {
  constructor(seconds = 10, targetFps = 30) {
    this.seconds = seconds;
    this.targetFps = targetFps;
    /** @type {Array<{t: number, g: number}>} */
    this.samples = [];
  }

  push(t, g) {
    this.samples.push({ t, g });
    const limit = t - this.seconds;
    while (this.samples.length > 0 && this.samples[0].t < limit) {
      this.samples.shift();
    }
  }

  values() {
    if (this.samples.length < 2) {
      return { y: [], t0: 0, dt: 0, n: 0 };
    }

    const t0 = this.samples[0].t;
    const dt = 1 / this.targetFps;
    const tEnd = this.samples[this.samples.length - 1].t;

    let n = Math.floor((tEnd - t0) / dt) + 1;
    if (n < 2) n = 2;

    const y = [];
    let j = 0;

    for (let i = 0; i < n; i++) {
      const tg = t0 + i * dt;

      while (j < this.samples.length - 2 && this.samples[j + 1].t < tg) {
        j++;
      }

      const s0 = this.samples[j];
      const s1 = this.samples[j + 1];

      if (tg <= s0.t) { y.push(s0.g); continue; }
      if (tg >= s1.t) { y.push(s1.g); continue; }

      const denom = s1.t - s0.t;
      if (denom <= 0) {
        y.push(s0.g);
      } else {
        const a = (tg - s0.t) / denom;
        y.push(s0.g + a * (s1.g - s0.g));
      }
    }

    return { y, t0, dt, n };
  }

  get fs() {
    if (this.samples.length < 2) return 0;
    const duration = this.samples[this.samples.length - 1].t - this.samples[0].t;
    return duration <= 0 ? 0 : (this.samples.length - 1) / duration;
  }

  getSamples() {
    return this.samples;
  }

  clear() {
    this.samples = [];
  }
}
