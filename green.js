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
  
  const { x, y, w, h } = roi;

  // read raw pixel data from the ROI rectangle
  // Each pixel is 4 bytes: R,G,B,A
  const img = frameCtx.getImageData(x, y, w, h).data;

  let sumG = 0;
  const nPixels = w * h;

  // Loop through pixels and sum only the green channel
  for (let i = 0; i < img.length; i += 4) {
    sumG += img[i + 1];
  }

  // Average green value
  const g = sumG / nPixels;

  // Convert ms to seconds 
  const t = tsMs / 1000; 

  return { g, t };
}
