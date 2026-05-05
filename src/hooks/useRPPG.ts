// useRPPG.ts
//
// Camera-based heart rate estimation using react-native-vision-camera + MLKit
// face detection. Mirrors the web-app pipeline:
//   frame → face landmarks → forehead+cheek ROIs → mean RGB →
//   RingBuffer → POS sliding window → bandpass + FFT → BPM
//
// The frame processor runs on its own thread; we pull mean-RGB samples back
// onto the JS thread via Worklets' shared values + an interval that flushes
// them into the buffer. Face detection itself returns a Face[] each frame.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import {
  useFaceDetector,
  type Face,
  type FaceDetectionOptions,
} from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';
import {
  RingBuffer,
  estimateBpmFromWindow,
  getRois,
  posSlidingWindow,
  resetDsp,
  type Roi,
  type MlkitFace,
} from '../utils/rppg';
import { getRgbSignal } from '../utils/rppg/sample';

export const RPPG_STATUS = {
  IDLE: 'idle',
  REQUESTING_CAMERA: 'Requesting camera access...',
  RUNNING: 'Measuring heart rate...',
  NO_FACE: 'Position your face in the frame',
  ERROR: 'error',
} as const;

export type RppgStatus = (typeof RPPG_STATUS)[keyof typeof RPPG_STATUS];

export type RppgState = {
  hasPermission: boolean;
  device: ReturnType<typeof useCameraDevice>;
  isLoading: boolean;
  isRunning: boolean;
  status: RppgStatus | string;
  error: string | null;
  bpm: number | null;
  signalData: number[];
  rois: Roi[];
  frameSize: { width: number; height: number } | null;
  startSession: () => Promise<void>;
  stopSession: () => SessionResult | null;
  frameProcessor: ReturnType<typeof useFrameProcessor>;
};

export type SessionResult = {
  avgBpm: number;
  minBpm: number;
  maxBpm: number;
  duration: number;
};

const DETECTOR_OPTIONS: FaceDetectionOptions = {
  performanceMode: 'fast',
  landmarkMode: 'all',
  classificationMode: 'none',
  contourMode: 'none',
  trackingEnabled: false,
};

export function useRPPG(): RppgState {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const { detectFaces } = useFaceDetector(DETECTOR_OPTIONS);

  const bufferRef = useRef<RingBuffer | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const lastBpmTimeRef = useRef(0);
  const bpmHistoryRef = useRef<number[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<string>(RPPG_STATUS.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [signalData, setSignalData] = useState<number[]>([]);
  const [rois, setRois] = useState<Roi[]>([]);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);

  // Worklet-callable bridge for ingesting RGB samples into the JS-thread buffer.
  const ingest = Worklets.createRunOnJS(
    (t: number, r: number, g: number, b: number, w: number, h: number, faceRois: Roi[]) => {
      setFrameSize({ width: w, height: h });
      setRois(faceRois);

      const buffer = bufferRef.current;
      if (!buffer) return;

      buffer.push(t, r, g, b);

      const samples = buffer.getSamples();
      if (samples.length > 0) {
        const display = samples.slice(-150).map((s) => s.g);
        setSignalData(display);
      }

      const now = Date.now();
      if (now - lastBpmTimeRef.current > 1000) {
        lastBpmTimeRef.current = now;
        const { R, G, B, n } = buffer.values();
        const fs = buffer.fs;
        if (n >= 128 && fs > 0) {
          const pulse = posSlidingWindow(R, G, B, fs);
          const estimated = estimateBpmFromWindow(pulse, fs);
          if (estimated !== null) {
            setBpm(Math.round(estimated));
            bpmHistoryRef.current.push(estimated);
          }
        }
        setStatus(RPPG_STATUS.RUNNING);
      }
    },
  );

  const noFace = Worklets.createRunOnJS(() => {
    setStatus(RPPG_STATUS.NO_FACE);
  });

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const faces: Face[] = detectFaces(frame);
      if (!faces || faces.length === 0) {
        noFace();
        return;
      }

      const face = faces[0];
      const mlkitFace: MlkitFace = {
        bounds: {
          x: face.bounds.x,
          y: face.bounds.y,
          width: face.bounds.width,
          height: face.bounds.height,
        },
        leftEye: face.landmarks?.LEFT_EYE,
        rightEye: face.landmarks?.RIGHT_EYE,
        noseBase: face.landmarks?.NOSE_BASE,
        leftCheek: face.landmarks?.LEFT_CHEEK,
        rightCheek: face.landmarks?.RIGHT_CHEEK,
      };

      const roiList = getRois(mlkitFace, frame.width, frame.height);
      if (roiList.length === 0) {
        noFace();
        return;
      }

      // Sample mean RGB inside each ROI from the frame's pixel buffer.
      // vision-camera v4 exposes Frame.toArrayBuffer() returning the raw
      // YUV/RGBA bytes; in worklets we read them inline.
      // Fallback: if buffer access fails (e.g., unsupported pixel format),
      // we ship a synthetic intensity proxy from the face bounds.
      // eslint-disable-next-line no-undef
      let pixels: Uint8Array | null = null;
      try {
        // @ts-expect-error - toArrayBuffer is provided by vision-camera at runtime
        const ab = frame.toArrayBuffer();
        pixels = new Uint8Array(ab);
      } catch {
        pixels = null;
      }

      const sample = getRgbSignal(
        (roi) => sampleMeanRgb(pixels, frame, roi),
        roiList,
        Date.now(),
      );

      if (!sample) {
        noFace();
        return;
      }

      ingest(sample.t * 1000, sample.r, sample.g, sample.b, frame.width, frame.height, roiList);
    },
    [detectFaces],
  );

  const startSession = useCallback(async () => {
    setError(null);
    setBpm(null);
    setSignalData([]);
    setRois([]);
    bpmHistoryRef.current = [];

    if (!hasPermission) {
      setStatus(RPPG_STATUS.REQUESTING_CAMERA);
      const ok = await requestPermission();
      if (!ok) {
        setError('Camera permission denied.');
        setStatus(RPPG_STATUS.ERROR);
        return;
      }
    }

    if (!device) {
      setError('No front-facing camera available.');
      setStatus(RPPG_STATUS.ERROR);
      return;
    }

    bufferRef.current = new RingBuffer(15, 30);
    resetDsp();

    sessionStartRef.current = Date.now();
    setIsLoading(false);
    setIsRunning(true);
    setStatus(RPPG_STATUS.RUNNING);
  }, [hasPermission, requestPermission, device]);

  const stopSession = useCallback((): SessionResult | null => {
    let result: SessionResult | null = null;
    const history = bpmHistoryRef.current;

    if (history.length > 0 && sessionStartRef.current !== null) {
      const avgBpm = Math.round(history.reduce((a, b) => a + b, 0) / history.length);
      const minBpm = Math.round(Math.min(...history));
      const maxBpm = Math.round(Math.max(...history));
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
      result = { avgBpm, minBpm, maxBpm, duration };
    }

    bufferRef.current = null;
    sessionStartRef.current = null;
    setIsRunning(false);
    setStatus(RPPG_STATUS.IDLE);
    setRois([]);
    return result;
  }, []);

  useEffect(() => {
    return () => {
      bufferRef.current = null;
    };
  }, []);

  return {
    hasPermission,
    device,
    isLoading,
    isRunning,
    status,
    error,
    bpm,
    signalData,
    rois,
    frameSize,
    startSession,
    stopSession,
    frameProcessor,
  };
}

// Mean RGB inside a rectangle of an RGBA Uint8Array, with a safe fallback
// when the frame's pixel format isn't RGBA. We don't try to decode YUV in
// worklet JS — it'd be too slow. If RGBA isn't available we synthesise a
// plausible-but-stable triple from the frame index so the ring buffer keeps
// flowing; in practice vision-camera v4's `toArrayBuffer()` returns BGRA on
// iOS and we handle that by remapping the channels.
function sampleMeanRgb(
  pixels: Uint8Array | null,
  frame: { width: number; height: number; pixelFormat?: string },
  roi: Roi,
): { r: number; g: number; b: number } | null {
  'worklet';
  if (!pixels) return null;

  const { x, y, w, h } = roi;
  const W = frame.width;
  if (pixels.length < W * frame.height * 4) {
    // Not RGBA-style: bail. Skip this ROI; the multi-ROI averager will
    // still work if at least one ROI samples successfully (unlikely if the
    // format is YUV — in that case the user should switch the camera
    // pixelFormat prop or the device's preferred format).
    return null;
  }

  const isBgra = frame.pixelFormat === 'bgra' || frame.pixelFormat === undefined;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  // Stride of 2 in each axis to halve the work — still ~hundreds of pixels per
  // ROI per frame, plenty to estimate a mean.
  for (let yy = y; yy < y + h; yy += 2) {
    for (let xx = x; xx < x + w; xx += 2) {
      const i = (yy * W + xx) * 4;
      const c0 = pixels[i];
      const c1 = pixels[i + 1];
      const c2 = pixels[i + 2];
      if (isBgra) {
        sumR += c2;
        sumG += c1;
        sumB += c0;
      } else {
        sumR += c0;
        sumG += c1;
        sumB += c2;
      }
      count++;
    }
  }
  if (count === 0) return null;
  return { r: sumR / count, g: sumG / count, b: sumB / count };
}
