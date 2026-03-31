import { useState, useRef, useCallback, useEffect } from 'react'
import {
  foreheadRectFromLandmarks,
  getGreenMean,
  RingBuffer,
  estimateBpmFromWindow
} from '../utils/rppg'

// Status constants
const STATUS = {
  IDLE: 'idle',
  REQUESTING_CAMERA: 'Requesting camera access...',
  LOADING_MODEL: 'Loading face detection model...',
  RUNNING: 'Measuring heart rate...',
  NO_FACE: 'Position your face in the frame',
  ERROR: 'error'
}

export function useRPPG() {
  // Refs
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const streamRef = useRef(null)
  const landmarkerRef = useRef(null)
  const animationRef = useRef(null)
  const bufferRef = useRef(null)
  const lastBpmTimeRef = useRef(0)
  const sessionStartRef = useRef(null)
  const bpmHistoryRef = useRef([])

  // State
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState(STATUS.IDLE)
  const [bpm, setBpm] = useState(null)
  const [signalData, setSignalData] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState(null)

  // Initialize MediaPipe FaceLandmarker
  const initializeLandmarker = useCallback(async () => {
    try {
      // Dynamic import from CDN
      const vision = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12'
      )

      const { FaceLandmarker, FilesetResolver } = vision

      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
      )

      const faceLandmarker = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          runningMode: 'VIDEO',
          numFaces: 1
        }
      )

      return faceLandmarker
    } catch (err) {
      console.error('Failed to initialize FaceLandmarker:', err)
      throw new Error('Failed to load face detection model')
    }
  }, [])

  // Initialize camera stream
  const initializeCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      return stream
    } catch (err) {
      console.error('Failed to access camera:', err)
      throw new Error('Camera access denied. Please allow camera permissions.')
    }
  }, [])

  // Detection loop
  const runDetectionLoop = useCallback(() => {
    const video = videoRef.current
    const overlay = overlayRef.current
    const landmarker = landmarkerRef.current
    const buffer = bufferRef.current

    if (!video || !overlay || !landmarker || !buffer) return

    const overlayCtx = overlay.getContext('2d')
    if (!overlayCtx) return

    // Create offscreen canvas for pixel extraction
    const frameCanvas = document.createElement('canvas')
    frameCanvas.width = video.videoWidth
    frameCanvas.height = video.videoHeight
    const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true })

    const processFrame = (timestamp) => {
      if (!videoRef.current || !landmarkerRef.current) return

      const W = video.videoWidth
      const H = video.videoHeight

      // Draw current frame to offscreen canvas
      frameCtx.drawImage(video, 0, 0, W, H)

      // Clear overlay
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height)

      // Run face detection
      const results = landmarker.detectForVideo(video, timestamp)

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0]
        setStatus(STATUS.RUNNING)

        // Draw face mesh on overlay
        drawFaceMesh(overlayCtx, landmarks, W, H)

        // Get forehead ROI
        const roi = foreheadRectFromLandmarks(landmarks, W, H)

        // Draw ROI rectangle
        drawROI(overlayCtx, roi)

        // Extract green channel mean
        const { g, t } = getGreenMean(frameCtx, roi, timestamp)
        buffer.push(t, g)

        // Update signal data for visualization
        const samples = buffer.getSamples()
        if (samples.length > 0) {
          // Get last 150 samples for display
          const displaySamples = samples.slice(-150).map((s) => s.g)
          setSignalData(displaySamples)
        }

        // Compute BPM every second
        const now = performance.now()
        if (now - lastBpmTimeRef.current > 1000) {
          lastBpmTimeRef.current = now
          const { y } = buffer.values()
          const fs = buffer.fs

          if (y.length >= 128 && fs > 0) {
            const estimatedBpm = estimateBpmFromWindow(y, fs)
            if (estimatedBpm !== null) {
              setBpm(Math.round(estimatedBpm))
              bpmHistoryRef.current.push(estimatedBpm)
            }
          }
        }
      } else {
        setStatus(STATUS.NO_FACE)
      }

      animationRef.current = requestAnimationFrame(processFrame)
    }

    animationRef.current = requestAnimationFrame(processFrame)
  }, [])

  // Draw face mesh
  const drawFaceMesh = (ctx, landmarks, W, H) => {
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.4)' // teal-500 with transparency
    ctx.lineWidth = 1

    // Draw face oval
    const faceOvalIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
      378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
      162, 21, 54, 103, 67, 109, 10
    ]

    ctx.beginPath()
    for (let i = 0; i < faceOvalIndices.length; i++) {
      const idx = faceOvalIndices[i]
      const lm = landmarks[idx]
      const x = lm.x * W
      const y = lm.y * H
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    // Draw key points
    ctx.fillStyle = 'rgba(14, 165, 233, 0.6)' // calm-500 with transparency
    const keyPoints = [33, 133, 362, 263, 1, 61, 291, 199] // Eyes, nose, mouth corners

    for (const idx of keyPoints) {
      const lm = landmarks[idx]
      ctx.beginPath()
      ctx.arc(lm.x * W, lm.y * H, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Draw ROI rectangle
  const drawROI = (ctx, roi) => {
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)' // Green for ROI
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(roi.x, roi.y, roi.w, roi.h)
    ctx.setLineDash([])

    // Fill with semi-transparent
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'
    ctx.fillRect(roi.x, roi.y, roi.w, roi.h)
  }

  // Start session
  const startSession = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      setBpm(null)
      setSignalData([])
      bpmHistoryRef.current = []

      // Initialize buffer
      bufferRef.current = new RingBuffer(10, 30)

      // Request camera
      setStatus(STATUS.REQUESTING_CAMERA)
      const stream = await initializeCamera()
      streamRef.current = stream

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = resolve
        })
        await videoRef.current.play()

        // Set overlay dimensions to match video
        if (overlayRef.current) {
          overlayRef.current.width = videoRef.current.videoWidth
          overlayRef.current.height = videoRef.current.videoHeight
        }
      }

      // Load face landmarker
      setStatus(STATUS.LOADING_MODEL)
      landmarkerRef.current = await initializeLandmarker()

      // Start detection
      sessionStartRef.current = Date.now()
      setIsRunning(true)
      setIsLoading(false)
      runDetectionLoop()
    } catch (err) {
      setError(err.message)
      setStatus(STATUS.ERROR)
      setIsLoading(false)
      stopSession()
    }
  }, [initializeCamera, initializeLandmarker, runDetectionLoop])

  // Stop session and return session data
  const stopSession = useCallback(() => {
    // Stop animation loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    // Calculate session stats
    let sessionData = null
    const bpmHistory = bpmHistoryRef.current

    if (bpmHistory.length > 0 && sessionStartRef.current) {
      const avgBpm = Math.round(
        bpmHistory.reduce((a, b) => a + b, 0) / bpmHistory.length
      )
      const minBpm = Math.round(Math.min(...bpmHistory))
      const maxBpm = Math.round(Math.max(...bpmHistory))
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000)

      sessionData = { avgBpm, minBpm, maxBpm, duration }
    }

    // Reset state
    setIsRunning(false)
    setStatus(STATUS.IDLE)
    bufferRef.current = null
    sessionStartRef.current = null

    return sessionData
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close()
      }
    }
  }, [])

  return {
    videoRef,
    overlayRef,
    isLoading,
    status,
    bpm,
    signalData,
    startSession,
    stopSession,
    isRunning,
    error
  }
}
