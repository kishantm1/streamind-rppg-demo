// cheek_roi.js
// This file turns MediaPipe face landmarks into cheek triangle ROIs.
// MediaPipe gives us many face landmark points (x,y) in normalized coordinates (0 to 1).
// We pick a few landmarks on each cheek, convert them to pixel coordinates,
// and build one inverted triangle on the left cheek and one on the right cheek.

export function cheekTrianglesFromLandmarks(landmarks, W, H) {
  /*
  Inputs:
  landmarks = array of objects with normalized coordinates (lm.x, lm.y)
  W, H = video/canvas width and height in pixels

  Output:
  {
    leftCheek:  { a:{x,y}, b:{x,y}, c:{x,y} },
    rightCheek: { a:{x,y}, b:{x,y}, c:{x,y} }
  }

  a and b are the two upper corners of the triangle
  c is the bottom point, so the triangle points downward
  */

  // Make sure we actually got landmarks
  if (!landmarks || landmarks.length < 468) return null;

  // Convert one normalized landmark to pixel coordinates
  function toPx(lm) {
    return {
      x: lm.x * W,
      y: lm.y * H,
    };
  }

  // Clamp ensures values stay inside valid screen range
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // Clamp a whole point to stay inside the image
  function clampPoint(p) {
    return {
      x: clamp(p.x, 0, W - 1),
      y: clamp(p.y, 0, H - 1),
    };
  }

  // ---------------------------
  // Choose landmarks for left cheek
  // ---------------------------
  // These are hand-tuned starter landmarks.
  // You can change them later if the triangles sit too high, too low,
  // too close to the nose, or too close to the jaw.

  const leftUpperOuter = toPx(landmarks[234]); // outer side of left cheek
  const leftUpperInner = toPx(landmarks[117]); // inner side of left cheek
  const leftLowerBase = toPx(landmarks[206]);  // lower part of left cheek

  // ---------------------------
  // Choose landmarks for right cheek
  // ---------------------------

  const rightUpperInner = toPx(landmarks[346]); // inner side of right cheek
  const rightUpperOuter = toPx(landmarks[454]); // outer side of right cheek
  const rightLowerBase = toPx(landmarks[426]);  // lower part of right cheek

  // ---------------------------
  // Build inverted triangles
  // ---------------------------
  // a and b form the top edge of the triangle
  // c is the lower point
  // We nudge c slightly downward so the triangle covers a bit more cheek area

  const leftCheek = {
    a: clampPoint(leftUpperOuter),
    b: clampPoint(leftUpperInner),
    c: clampPoint({
      x: leftLowerBase.x,
      y: leftLowerBase.y + 6,
    }),
  };

  const rightCheek = {
    a: clampPoint(rightUpperInner),
    b: clampPoint(rightUpperOuter),
    c: clampPoint({
      x: rightLowerBase.x,
      y: rightLowerBase.y + 6,
    }),
  };

  // Return both cheek triangle ROIs
  return {
    leftCheek,
    rightCheek,
  };
}
