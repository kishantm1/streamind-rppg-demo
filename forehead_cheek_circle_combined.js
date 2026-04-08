// forehead_cheek_circle_combined.js
export function cheekCirclesFromLandmarks(landmarks, W, H) {
  const LEFT = 234;
  const RIGHT = 454;
  const NOSE = 1;
  const CHIN = 152;
  const l = landmarks[LEFT];
  const r = landmarks[RIGHT];
  const n = landmarks[NOSE];
  const c = landmarks[CHIN];
  if (!l || !r || !n || !c) return null;

  const lx = l.x * W, ly = l.y * H;
  const rx = r.x * W, ry = r.y * H;
  const nx = n.x * W, ny = n.y * H;
  const cy = c.y * H;

  const faceWidth  = Math.abs(rx - lx);
  const faceHeight = Math.abs(cy - ny);

  const d = Math.max(12, faceWidth * 0.30);
  const verticalOffset = faceHeight * 0.15;
  const inward = faceWidth * 0.20;

  return {
    leftCheek:  { cx: Math.round(lx + inward), cy: Math.round(ly + verticalOffset), r: Math.round(d / 2) },
    rightCheek: { cx: Math.round(rx - inward), cy: Math.round(ry + verticalOffset), r: Math.round(d / 2) },
  };
}