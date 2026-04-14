// cheek_roi.js
// This file computes left and right cheek triangle ROIs from MediaPipe face landmarks

export function cheekRectsFromLandmarks(landmarks, W, H) {
  if (!landmarks || landmarks.length < 468) return null;
  if (!Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) {
    return null;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function toPx(index) {
    const lm = landmarks[index];
    if (!lm) return null;
    return {
      x: lm.x * W,
      y: lm.y * H,
    };
  }

  // Left cheek anchor landmarks
  const lOuter = toPx(234);
  const lInner = toPx(117);
  const lLower = toPx(206);

  // Right cheek anchor landmarks
  const rInner = toPx(346);
  const rOuter = toPx(454);
  const rLower = toPx(426);

  if (!lOuter || !lInner || !lLower || !rInner || !rOuter || !rLower) {
    return null;
  }

  // Build a cheek rectangle from the anchor spread
  const leftX = Math.min(lOuter.x, lInner.x);
  const leftW = Math.abs(lInner.x - lOuter.x);
  const leftTopY = Math.min(lOuter.y, lInner.y);
  const leftH = Math.max(8, lLower.y - leftTopY);

  const rightX = Math.min(rInner.x, rOuter.x);
  const rightW = Math.abs(rOuter.x - rInner.x);
  const rightTopY = Math.min(rInner.y, rOuter.y);
  const rightH = Math.max(8, rLower.y - rightTopY);

  const leftRect = {
    x: Math.round(clamp(leftX, 0, W - 1)),
    y: Math.round(clamp(leftTopY, 0, H - 1)),
    w: Math.round(clamp(leftW, 8, W)),
    h: Math.round(clamp(leftH, 8, H)),
  };

  const rightRect = {
    x: Math.round(clamp(rightX, 0, W - 1)),
    y: Math.round(clamp(rightTopY, 0, H - 1)),
    w: Math.round(clamp(rightW, 8, W)),
    h: Math.round(clamp(rightH, 8, H)),
  };

  return { leftRect, rightRect };
}

export function roiTriangleFromRect(roi) {
  if (!roi) return null;

  return [
    { x: roi.x, y: roi.y },
    { x: roi.x + roi.w, y: roi.y },
    { x: roi.x + roi.w / 2, y: roi.y + roi.h },
  ];
}

export function cheekTrianglesFromLandmarks(landmarks, W, H) {
  const rects = cheekRectsFromLandmarks(landmarks, W, H);
  if (!rects) return null;

  return {
    leftCheek: roiTriangleFromRect(rects.leftRect),
    rightCheek: roiTriangleFromRect(rects.rightRect),
  };
}
