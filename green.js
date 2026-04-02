// green.js
// This file extracts one number per frame which is the average green value inside the ROI box. 
// Blood absorbs green light strongly so the pulse related color changes are strongest in green channel.

export function getGreenMean(frameCtx, roi, tsMs) {
  /* 
    Inputs:
      frameCtx = drawing context that contains the current video frame drawn onto it
      roi = rectangle {x, y, w, h} in pixels (not normalized)
      tsMs = timestamp from requestAnimationFrame (milliseconds)

    Output:
      g = mean green value in ROI for this frame
      t = timestamp in seconds
  */
  
  const { cx, cy, r } = roi;

  const x0 = cx - r;
  const y0 = cy - r;
  const size = r * 2;
  const img = frameCtx.getImageData(x0, y0, size, size).data;

  let sumG = 0;
  let count = 0;
  const r2 = r * r;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      // Distance from this pixel to the center of the circle
      const dx = col - r;
      const dy = row - r;

      // Skip pixels outside the circle
      if (dx * dx + dy * dy > r2) continue;

      // Each pixel is 4 bytes: R, G, B, A
      const idx = (row * size + col) * 4;
      sumG += img[idx + 1]; // green channel
      count++;
    }
  }

  // Average green value (guard against divide by zero)
  const g = count > 0 ? sumG / count : 0;

  // Convert ms to seconds
  const t = tsMs / 1000;

  return { g, t };
}