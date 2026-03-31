// Green channel extraction from ROI
// Blood absorbs green light strongly, so pulse-related color changes are strongest in green channel

export function getGreenMean(frameCtx, roi, tsMs) {
  const { x, y, w, h } = roi

  // Read raw pixel data from ROI rectangle (RGBA format)
  const img = frameCtx.getImageData(x, y, w, h).data

  let sumG = 0
  const nPixels = w * h

  // Sum only the green channel (index 1 in RGBA)
  for (let i = 0; i < img.length; i += 4) {
    sumG += img[i + 1]
  }

  // Average green value
  const g = sumG / nPixels

  // Convert ms to seconds
  const t = tsMs / 1000

  return { g, t }
}
