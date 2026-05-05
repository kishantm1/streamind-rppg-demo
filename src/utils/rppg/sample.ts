// sample.ts
// Per-frame ROI colour extraction for the RN app.
//
// On the web app this lived in green.js and read pixels from a canvas
// (frameCtx.getImageData). In RN under react-native-vision-camera, the
// frame processor receives a Frame object whose pixel format depends on
// the device. We expose a generic helper that takes any function capable
// of returning a mean RGB for a rectangle, averages across all ROIs, and
// emits the same {r, g, b, t} triple the buffer expects.

import type { Roi } from './roi';

export type RgbMean = { r: number; g: number; b: number };

export type RoiSampler = (roi: Roi) => RgbMean | null;

export function getRgbSignal(
  sampler: RoiSampler,
  rois: Roi[],
  tsMs: number,
): { r: number; g: number; b: number; t: number } | null {
  const means: RgbMean[] = [];
  for (const roi of rois) {
    const m = sampler(roi);
    if (m && m.r >= 1 && m.g >= 1 && m.b >= 1) means.push(m);
  }
  if (means.length === 0) return null;

  let r = 0;
  let g = 0;
  let b = 0;
  for (const m of means) {
    r += m.r;
    g += m.g;
    b += m.b;
  }
  const k = means.length;
  return { r: r / k, g: g / k, b: b / k, t: tsMs / 1000 };
}
