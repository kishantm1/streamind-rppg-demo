// buffer.js
// Stores the last N seconds of signal samples (timestamp + value pairs).
// Converts unevenly-timed camera frames into an evenly-spaced array
// that the FFT in dsp.js can work with correctly.
//

export class RingBuffer {
  /**
   * @param {number} seconds   - How many seconds of history to keep (default 10)
   * @param {number} targetFps - Resampled output frame rate (default 30)
   */
  constructor(seconds = 10, targetFps = 30) {
    this.seconds = seconds;
    this.targetFps = targetFps;
    /** @type {Array<{t: number, g: number}>} */
    this.samples = [];
  }

  /**
   * Push a new (time, value) sample.
   * Automatically drops samples older than `this.seconds`.
   *
   * @param {number} t - Timestamp in seconds
   * @param {number} g - Signal value (POS output or green mean)
   */
  push(t, g) {
    this.samples.push({ t, g });
    const limit = t - this.seconds;
    while (this.samples.length > 0 && this.samples[0].t < limit) {
      this.samples.shift();
    }
  }

  /**
   * Return an evenly-spaced signal array by linear interpolation.
   *
   * @returns {{ y: number[], t0: number, dt: number, n: number }}
   *   y  - Resampled signal values
   *   t0 - Timestamp of first sample (seconds)
   *   dt - Time step = 1/targetFps (seconds)
   *   n  - Number of samples in y
   */
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
      const tg = t0 + i * dt; // target time on the even grid

      // Advance j until samples[j+1] >= tg
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

  /**
   * Effective sampling rate based on actual timestamps (Hz).
   * @returns {number}
   */
  get fs() {
    if (this.samples.length < 2) return 0;
    const duration = this.samples[this.samples.length - 1].t - this.samples[0].t;
    return duration <= 0 ? 0 : (this.samples.length - 1) / duration;
  }

  /** Raw stored samples (unevenly spaced). */
  getSamples() {
    return this.samples;
  }
}
