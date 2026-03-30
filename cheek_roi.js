// cheek_roi.js

export function cheekCirclesFromLandmarks(landmarks, W, H) {
  // More stable cheek landmarks
  const LEFT = 234;
  const RIGHT = 454;
  const NOSE = 1;
  const CHIN = 152;

  const l = landmarks[LEFT];
  const r = landmarks[RIGHT];
  const n = landmarks[NOSE];
  const c = landmarks[CHIN];

  if (!l || !r || !n || !c) return null;

  // Convert to pixels
  const lx = l.x * W, ly = l.y * H;
  const rx = r.x * W, ry = r.y * H;
  const nx = n.x * W, ny = n.y * H;
  const cy = c.y * H;

  // Face size references
  const faceWidth = Math.abs(rx - lx);
  const faceHeight = Math.abs(cy - ny);

  // Better sizing
  const d = Math.max(12, faceWidth * 0.30);

  // Move cheeks slightly DOWN and toward center
  const verticalOffset = faceHeight * 0.15;
  const inward = faceWidth * 0.20;

  const leftCenter = {
    x: lx + inward,
    y: ly + verticalOffset,
  };

  const rightCenter = {
    x: rx - inward,
    y: ry + verticalOffset,
  };

  return {
    leftCheek: circleToBox(leftCenter.x, leftCenter.y, d, W, H),
    rightCheek: circleToBox(rightCenter.x, rightCenter.y, d, W, H),
  };
}

function circleToBox(cx, cy, d, W, H) {
  const r = d / 2;

  const x = clamp(cx - r, 0, W - d);
  const y = clamp(cy - r, 0, H - d);

  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(d),
    h: Math.round(d),
  };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}