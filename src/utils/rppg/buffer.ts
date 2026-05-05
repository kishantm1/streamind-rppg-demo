// Ring buffer for storing time-series rPPG samples as raw RGB triples.
// Converts unevenly timed camera frames into an evenly-spaced signal
// (linear interpolation per channel) that the POS stage in pos.ts and the
// FFT in dsp.ts can process.

export type RgbSample = { t: number; r: number; g: number; b: number };

export type ResampledSignal = {
  R: number[];
  G: number[];
  B: number[];
  t0: number;
  dt: number;
  n: number;
};

export class RingBuffer {
  readonly seconds: number;
  readonly targetFps: number;
  private samples: RgbSample[] = [];

  constructor(seconds = 15, targetFps = 30) {
    this.seconds = seconds;
    this.targetFps = targetFps;
  }

  push(t: number, r: number, g: number, b: number): void {
    this.samples.push({ t, r, g, b });
    const limit = t - this.seconds;
    while (this.samples.length > 0 && this.samples[0].t < limit) {
      this.samples.shift();
    }
  }

  values(): ResampledSignal {
    if (this.samples.length < 2) {
      return { R: [], G: [], B: [], t0: 0, dt: 0, n: 0 };
    }

    const t0 = this.samples[0].t;
    const dt = 1 / this.targetFps;
    const tEnd = this.samples[this.samples.length - 1].t;

    let n = Math.floor((tEnd - t0) / dt) + 1;
    if (n < 2) n = 2;

    const R = new Array<number>(n);
    const G = new Array<number>(n);
    const B = new Array<number>(n);
    let j = 0;

    for (let i = 0; i < n; i++) {
      const tg = t0 + i * dt;

      while (j < this.samples.length - 2 && this.samples[j + 1].t < tg) {
        j++;
      }

      const s0 = this.samples[j];
      const s1 = this.samples[j + 1];

      if (tg <= s0.t) {
        R[i] = s0.r; G[i] = s0.g; B[i] = s0.b;
        continue;
      }
      if (tg >= s1.t) {
        R[i] = s1.r; G[i] = s1.g; B[i] = s1.b;
        continue;
      }

      const denom = s1.t - s0.t;
      if (denom <= 0) {
        R[i] = s0.r; G[i] = s0.g; B[i] = s0.b;
      } else {
        const a = (tg - s0.t) / denom;
        R[i] = s0.r + a * (s1.r - s0.r);
        G[i] = s0.g + a * (s1.g - s0.g);
        B[i] = s0.b + a * (s1.b - s0.b);
      }
    }

    return { R, G, B, t0, dt, n };
  }

  get fs(): number {
    if (this.samples.length < 2) return 0;
    const duration =
      this.samples[this.samples.length - 1].t - this.samples[0].t;
    return duration <= 0 ? 0 : (this.samples.length - 1) / duration;
  }

  getSamples(): readonly RgbSample[] {
    return this.samples;
  }

  clear(): void {
    this.samples = [];
  }
}
