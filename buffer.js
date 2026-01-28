// buffer.js
// This file stores the last N seconds of green-channel samples.
// It also converts unevenly timed samples into an evenly spaced signal array.
// This is important because FFT assumes samples are evenly spaced in time.

export class RingBuffer {
  constructor(seconds = 10, targetFps = 30) {
    /* 
    seconds = how many seconds of data we keep
    targetFps = the rate we want the final evenly spaced array to behave like

    samples = array of objects like: { t: timestamp_in_seconds, g: mean_green_value }
    */

    this.seconds = seconds;
    this.targetFps = targetFps;
    this.samples = []; 
  }

  push(t, g) {
    /*
      Add a new data point (t,g) into the buffer.
      Then we remove anything older than (t - seconds) so the buffer never grows forever.
    */
    this.samples.push({ t, g });

    const timeLimit = t - this.seconds;

    // Remove oldest samples until everything left is within the last N seconds 
    while (this.samples.length > 0 && this.samples[0].t < timeLimit) {
      this.samples.shift();
    }
  }

  values() {
    /* 
      Return an evenly spaced array y, sampled at targetFPS, covering our window.
      Output:
        y = evenly spaced array of mean green values
        t0 = timestamp of first sample in seconds
        dt = time step between samples in seconds (dt = 1/targetFps)
        n = number of samples in y

      We do interpolation because real camera frames are not perfectly spaced (frame rate fluctuates slightly).
    */
    if (this.samples.length < 2) {
      return { y: [], t0: 0, dt: 0, n: 0 };
    }

    const t0 = this.samples[0].t;
    const dt = 1 / this.targetFps;

    const tEnd = this.samples[this.samples.length - 1].t;

    // Number of evenly spaced points from t0 to tEnd
    let n = Math.floor((tEnd - t0) / dt) + 1;
    if (n < 2) n = 2;

    const y = [];
    let j = 0; // pointer into the original uneven samples

    for (let i = 0; i < n; i++) {
      const tg = t0 + i * dt; // target time on evenly spaced grid

      // Move j forwward until samples[j] and samples[j+1] surround tg
      while (j < this.samples.length - 2 && this.samples[j + 1].t < tg) {
        j++;
      }

      const s0 = this.samples[j];
      const s1 = this.samples[j + 1];

      // If tg is outside the bracket, just use nearest value
      if (tg <= s0.t) {
        y.push(s0.g);
        continue;
      }
      if (tg >= s1.t) {
        y.push(s1.g);
        continue;
      }

      // Linear interpolation between (t,g) points
      // "estimate g at time tg between s0 and s1"
      const denom = (s1.t - s0.t);
      if (denom <= 0) {
        y.push(s0.g); // fallback if timestamps are identical / weird
      } else {
        const a = (tg - s0.t) / denom; // goes from 0 to 1
        y.push(s0.g + a * (s1.g - s0.g));
      }
    }

    return { y, t0, dt, n };
  }

  get fs() {
    /*
      fs = effective sampling rate (how many frames per second we actually got)
      This is based on timestamps.
    */

    if (this.samples.length < 2) 
      return 0;

    const t0 = this.samples[0].t;
    const tEnd = this.samples[this.samples.length - 1].t;
    const duration = tEnd - t0;

    if (duration <= 0) return 0;

    // (samples - 1) intervals happened across 'duration' seconds
    return (this.samples.length - 1) / duration;
  }

  getSamples() {
    // Returns the raw stored samples (unevenly spaced)
    return this.samples;
  }
}
