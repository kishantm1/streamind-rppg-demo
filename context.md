# Streaming rPPG Demo - Technical Context

## What is rPPG?

**rPPG (Remote Photoplethysmography)** is a non-contact optical technique for measuring heart rate by detecting subtle color changes in skin that occur with each heartbeat. Blood absorbs light differently when oxygenated, creating small variations in reflected light captured by a camera. This demo extracts the mean green channel intensity from a forehead region and processes it to estimate heart rate.

---

## Overall Architecture

This is a **purely browser-based, real-time system** with no backend server. The entire pipeline runs in JavaScript:

```
Camera Feed → Face Detection → ROI Extraction → Signal Processing → BPM Estimation → Display
```

### Technology Stack
- **Frontend**: Pure HTML5/JavaScript (no framework)
- **Face Detection**: MediaPipe Face Landmarker (pre-trained deep learning model)
- **Signal Processing**: Custom DSP algorithms (FFT, filtering)
- **Real-time Rendering**: HTML5 Canvas 2D
- **Deployment**: Static files (runs via VS Code Live Server or any HTTP server)

---

## Complete Data Flow

```
1. getUserMedia() → Webcam stream
2. requestAnimationFrame() loop (~60 FPS)
3. MediaPipe FaceLandmarker.detectForVideo()
   ↓
4. foreheadRectFromLandmarks() → ROI coordinates
5. Canvas pixel reading + getGreenMean()
   ↓
6. RingBuffer.push(timestamp, greenValue)
7. Signal resampling to 30 FPS (even grid)
   ↓
8. Every 1000ms:
   - estimateBpmFromWindow()
   - Display BPM
9. Real-time visualization:
   - Draw landmarks + green ROI box
   - Plot green signal trace
```

---

## File Architecture

| File | Purpose | Key Responsibilities |
|------|---------|----------------------|
| **index.html** | UI Layout | Defines video element, canvas layers, status text, BPM display, plot area |
| **script.js** | Main Controller | Orchestrates the entire pipeline: camera init, landmark detection loop, buffer management, UI updates |
| **roi.js** | ROI Computation | Converts MediaPipe landmarks to forehead rectangle (~11% of face height, 30% of face width) |
| **green.js** | Signal Extraction | Reads pixel data from ROI and computes mean green channel value per frame |
| **buffer.js** | Time-Series Management | Stores last 10 seconds of samples, resamples to 30 FPS with linear interpolation |
| **dsp.js** | Signal Processing & Heart Rate | Detrending, bandpass filtering (0.7-3.0 Hz), Hann windowing, FFT, peak detection, BPM conversion |
| **ui.js** | Visualization | Draws face landmarks, ROI rectangle, and plots the green signal trace |

---

## Key Algorithms & Signal Processing

### A. Face Landmark Detection (MediaPipe)
- Uses a pre-trained deep neural network
- Detects 478 facial landmarks (eyes, nose, mouth, face contours)
- Returns normalized coordinates (0-1 range)
- Model loaded from CDN: `@mediapipe/tasks-vision@0.10.12`

### B. ROI Extraction (roi.js)
```
1. Find bounding box of all face landmarks
2. Define forehead as:
   - Width: 30% of face width, centered horizontally
   - Height: 11% of face height, placed near top
   - Clamp to screen boundaries
```

### C. Green Channel Extraction (green.js)
```
1. Draw current video frame to hidden canvas
2. Use getImageData() to read RGBA pixel bytes
3. Iterate every 4th byte (green channel)
4. Compute mean across all pixels in ROI
5. Return (greenMean, timestamp) tuple
```

### D. Signal Buffering & Resampling (buffer.js)
```
Problem: Camera frame timestamps are irregular (frame rate fluctuates)
Solution: Circular buffer with linear interpolation

1. Store (timestamp, greenValue) pairs
2. Keep only last 10 seconds of data
3. When needed, resample to fixed 30 FPS grid:
   - For each target time point, find surrounding raw samples
   - Linearly interpolate green value
   - Output evenly-spaced array suitable for FFT
```

### E. Heart Rate Estimation (dsp.js) - Core Algorithm

**Step 1: Detrending**
- Remove DC component (subtract mean)
- Removes slow changes from lighting/auto-exposure

**Step 2: Bandpass Filtering**
- High-pass at 0.7 Hz (removes baseline drift, ~42 BPM minimum)
- Low-pass at 3.0 Hz (removes noise, ~180 BPM maximum)
- Both use 1st-order IIR filters (exponential smoothing)

**Step 3: Windowing**
- Apply Hann window to fade edges
- Reduces FFT artifacts from signal discontinuities

**Step 4: FFT**
```javascript
// Custom real FFT implementation
For each frequency bin k:
  - Sum cos and sin components over all samples
  - Magnitude = sqrt(real² + imag²)
```

**Step 5: Peak Detection**
- Find strongest magnitude in frequency range [0.7 Hz, 3.0 Hz]
- Convert bin index to frequency: `freqHz = (binIndex × samplingRate) / fftSize`
- Convert to BPM: `bpm = freqHz × 60`
- Sanity check: reject if BPM < 35 or > 220

---

## Real-Time Processing Loop

```javascript
requestAnimationFrame(loop) executes approximately 60 times per second:

loop(timestamp) {
  1. Run face detection on current video frame
  2. Extract forehead ROI coordinates
  3. Read green channel intensity from ROI
  4. Add sample to 10-second ring buffer
  5. Draw face landmarks + ROI box to overlay canvas
  6. Draw signal trace to plot canvas

  IF (1+ seconds elapsed since last BPM update):
    7. Get evenly-resampled signal (10 seconds, 30 FPS)
    8. Estimate BPM using FFT + peak detection
    9. Display BPM on screen (with fallback to last valid value)
}
```

---

## Signal Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    BROWSER-BASED rPPG PIPELINE                   │
└──────────────────────────────────────────────────────────────────┘

   Camera (WebRTC)
        ↓
   [video element]
        ↓
   MediaPipe FaceLandmarker
   (478 landmarks)
        ↓
   ROI Calculation (roi.js)
   [forehead box: 11% height, 30% width]
        ↓
   Canvas getImageData()
   [read RGBA pixels from ROI]
        ↓
   Green Channel Extraction (green.js)
   [compute mean of green bytes]
        ↓
   RingBuffer Push (buffer.js)
   [store (timestamp, greenValue) for 10 seconds]
        ↓
   ┌─────────────────────────────────────────┐
   │  Every frame (~60 FPS):                 │
   │  - Visualize landmarks + ROI            │
   │  - Plot signal trace                    │
   └─────────────────────────────────────────┘
        ↓
   ┌─────────────────────────────────────────┐
   │  Every ~1 second:                       │
   │  - Resample to 30 FPS grid              │
   │  - Detrend (subtract mean)              │
   │  - Bandpass filter (0.7-3.0 Hz)         │
   │  - Apply Hann window                    │
   │  - Compute FFT                          │
   │  - Find frequency peak                  │
   │  - Convert to BPM                       │
   └─────────────────────────────────────────┘
        ↓
   Display BPM (updates once/sec)
```

---

## Design Decisions & Trade-offs

| Decision | Reason |
|----------|--------|
| Green channel only | Blood absorption strongest in green; reduces R and B noise |
| 10-second buffer | Balance: long enough for stable frequency (0.1 Hz resolution), short enough for responsiveness |
| 30 FPS resampling | Good frequency resolution (0.1 Hz per bin), low computational cost |
| 1st-order IIR filters | Computationally cheap, sufficient for simple bandpass filtering |
| Custom FFT (not FFT.js lib) | Minimal dependency, educational clarity |
| BPM range 35-220 | Physiologically realistic human heart rate bounds |
| Update BPM every 1s | Avoid flickering from noise, provide responsive feedback |
| Linear interpolation | Simple, sufficient for smooth signal reconstruction |

---

## Dependencies & External Resources

```javascript
// From CDN:
- @mediapipe/tasks-vision@0.10.12
  - FaceLandmarker model (float16, ~15MB)
  - FilesetResolver (WebAssembly)
  - DrawingUtils (visualization helper)

// Local modules (pure JavaScript):
- roi.js
- green.js
- buffer.js
- dsp.js
- ui.js
```

---

## Performance Characteristics

- **Real-time capability**: ~60 FPS video processing + ~1 FPS BPM updates
- **Latency**: ~100-200ms (camera + MediaPipe inference + rendering)
- **Memory**: ~2-3 MB (video buffers + model weights in WASM)
- **CPU**: Modest (single-threaded JavaScript, runs on most laptops/phones)
- **Bandwidth**: Initial model download (~15MB), then streaming video only

---

## Strengths & Limitations

### Strengths
- No backend required (pure browser)
- Privacy-preserving (video stays local)
- Real-time responsiveness
- Educational code (well-commented, clear algorithm flow)
- Uses robust face detection (MediaPipe)
- Proper signal processing (filtering, FFT)

### Limitations
- Accuracy depends on lighting, skin tone, motion artifacts
- Requires stable face positioning
- Single-threaded, no WebWorker optimization
- Custom FFT (O(N²)) slower than FFT.js library
- Limited to one person per frame
- No motion/artifact detection or quality metrics

---

## Summary

This is a browser-based physiological signal processing demo combining:
1. **Computer Vision** (MediaPipe face tracking)
2. **Real-time Signal Acquisition** (pixel reading + buffering)
3. **Digital Signal Processing** (filtering, FFT, peak detection)
4. **Biomedical Engineering** (rPPG principles + BPM estimation)

The system handles real-world challenges (irregular frame rates, signal drift) and displays results in a clean, minimal UI.
