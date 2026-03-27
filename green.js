// green.js
// This file extracts one number per frame which is the average green value inside the ROI box. 
// Blood absorbs green light strongly so the pulse related color changes are strongest in green channel.

import { roiTriangleFromRect } from "./roi.js";

//export function getGreenMean(frameCtx, roi, tsMs) {
  /* 
    Inputs:
      frameCtx = drawing context that contains the current video frame drawn onto it
      roi = rectangle {x, y, w, h} in pixels (not normalized)
      tsMs = timestamp from requestAnimationFrame (milliseconds)

    Output:
      g = mean green value in ROI for this frame
      t = timestamp in seconds
  */
  
  //const { x, y, w, h } = roi;

  // read raw pixel data from the ROI rectangle
  // Each pixel is 4 bytes: R,G,B,A
  //const img = frameCtx.getImageData(x, y, w, h).data;

  //let sumG = 0;
  //const nPixels = w * h;

  // Loop through pixels and sum only the green channel
  //for (let i = 0; i < img.length; i += 4) {
    //sumG += img[i + 1];
  //}

  // Average green value
  //const g = sumG / nPixels;

  // Convert ms to seconds 
  //const t = tsMs / 1000; 

  //return { g, t };
//}

export function getGreenMean(frameCtx, roi, tsMs) {
  const { x, y, w, h } = roi;
  const img = frameCtx.getImageData(x, y, w, h).data;
  
  let sumG = 0;
  let count = 0;

  const [v1, v2, v3] = roiTriangleFromRect(roi);

  // Function to check if point (px, py) is inside triangle
  function isPointInTriangle(px, py, v1, v2, v3) {
    const d1 = (px - v2.x) * (v1.y - v2.y) - (v1.x - v2.x) * (py - v2.y);
    const d2 = (px - v3.x) * (v2.y - v3.y) - (v2.x - v3.x) * (py - v3.y);
    const d3 = (px - v1.x) * (v3.y - v1.y) - (v3.x - v1.x) * (py - v1.y);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos);
  }
  
  // Loop through pixels in the bounding box
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (isPointInTriangle(px, py, v1, v2, v3)) {
        const index = ((py - y) * w + (px - x)) * 4;
        sumG += img[index + 1]; // Green channel
        count++;
      }
    }
  }
  
  const g = count > 0 ? sumG / count : 0;
  const t = tsMs / 1000;
  
  return { g, t };
}