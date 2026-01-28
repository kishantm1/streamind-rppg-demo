# Streamind Health rPPG Demo

This is a starter browswer demo that estimates heart rate (BPM) from a webcam feed using the following:
- MediaPipe Face Landmarker for face tracking
- A forehead ROI (green box)
- Mean green-channel signal extraction
- 10s ring buffer and band pass filtering
- FFT peak picking to estimate BPM

## Requirements
- VS Code
- VS Code extension: Live Server (by Ritwick Dey)

## How to Run
1. Clone this repo
2. Open the folder in VS Code
3. Right click index.html and then click "Open with Live Server"
4. In the browser, allow cammera access

## You should see the following:
- live video
- face landmark dots and a green forehead ROI box
- live signal trace (green-channel intensity over time)
- BPM updating about once per second

## Files 
- index.html: page layout (video, overlay canvas, plot, text)
- script.js: main loop (camera -> face landmarks -> ROI -> green channel signal -> buffer -> BPM)
- roi.js: landmarks -> forehead rectangle (region of interest)
- green.js: ROI pixels -> mean green value
- buffer.js: ring buffer and resampling onto an even time grid
- dsp.js: Preprocess (detrend and band-pass filter) -> FFT -> peak picking -> BPM
- ui.js: drawing helpers (overlay + plot)