// roi.ts
// Computes forehead + cheek ROIs from MLKit face-detector output.
//
// MediaPipe (web app) provided 478 dense landmarks; MLKit gives a smaller
// set: a face bounds rectangle plus per-feature landmark points
// (LEFT_EYE, RIGHT_EYE, NOSE_BASE, MOUTH_*, LEFT_CHEEK, RIGHT_CHEEK).
// We build ROI rectangles geometrically from those.

export type Roi = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: 'forehead' | 'left-cheek' | 'right-cheek';
};

export type FaceBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FacePoint = { x: number; y: number };

export type MlkitFace = {
  bounds: FaceBounds;
  // Pixel-space coordinates in the source frame.
  leftEye?: FacePoint;
  rightEye?: FacePoint;
  noseBase?: FacePoint;
  leftCheek?: FacePoint;
  rightCheek?: FacePoint;
};

const PAD = 0.08;

/**
 * Build [forehead, leftCheek, rightCheek] ROIs from a MLKit face detection.
 *
 * Frame width/height (W, H) is used only for clamping — the face landmarks
 * are already in pixel space.
 */
export function getRois(face: MlkitFace, W: number, H: number): Roi[] {
  const rois: Roi[] = [];

  const forehead = computeForehead(face);
  if (forehead) rois.push(clamp({ ...forehead, label: 'forehead' }, W, H));

  const left = computeCheekRoi(face.leftCheek, face, 'left-cheek');
  if (left) rois.push(clamp(left, W, H));

  const right = computeCheekRoi(face.rightCheek, face, 'right-cheek');
  if (right) rois.push(clamp(right, W, H));

  return rois;
}

function computeForehead(face: MlkitFace): Omit<Roi, 'label'> | null {
  const { bounds, leftEye, rightEye } = face;
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  // Forehead vertical span: from face top to ~25% above the eye line.
  // Falls back to the top quarter of the bounds when no eye landmarks.
  const eyeY =
    leftEye && rightEye
      ? (leftEye.y + rightEye.y) / 2
      : bounds.y + bounds.height * 0.35;

  const top = bounds.y + bounds.height * 0.05;
  const bottom = eyeY - bounds.height * 0.18;
  if (bottom <= top) return null;

  // Horizontal span: ~50% of face width, centered on between-eyes midpoint.
  const cx =
    leftEye && rightEye ? (leftEye.x + rightEye.x) / 2 : bounds.x + bounds.width / 2;
  const halfW = bounds.width * 0.25;

  let x = cx - halfW;
  let y = top;
  let w = halfW * 2;
  let h = bottom - top;

  const px = w * PAD;
  const py = h * PAD;
  x -= px;
  y -= py;
  w += 2 * px;
  h += 2 * py;

  return { x, y, w, h };
}

function computeCheekRoi(
  cheek: FacePoint | undefined,
  face: MlkitFace,
  label: Roi['label'],
): Roi | null {
  if (!cheek) return null;

  // Box size scales with inter-ocular distance (or falls back to face width).
  const eyeDist =
    face.leftEye && face.rightEye
      ? Math.hypot(
          face.leftEye.x - face.rightEye.x,
          face.leftEye.y - face.rightEye.y,
        )
      : face.bounds.width * 0.4;
  const half = Math.max(8, eyeDist * 0.22);

  return {
    x: cheek.x - half,
    y: cheek.y - half * 0.7,
    w: half * 2,
    h: half * 1.4,
    label,
  };
}

function clamp(roi: Roi, W: number, H: number): Roi {
  let { x, y, w, h } = roi;
  x = Math.max(0, x);
  y = Math.max(0, y);
  w = Math.min(w, W - x);
  h = Math.min(h, H - y);
  w = Math.max(w, 8);
  h = Math.max(h, 8);
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
    label: roi.label,
  };
}
