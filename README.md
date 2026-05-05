# Streamind rPPG — React Native (Expo)

Native iOS/Android port of the Vite/React rPPG demo (`improved-react`
branch). Estimates heart rate (BPM) from the front-facing camera using
Google MLKit face detection, the POS chrominance algorithm, bandpass
filtering and FFT peak picking. Optionally pairs with a Bluetooth
heart-rate monitor (Polar, Garmin chest strap, etc.) over the standard
Heart Rate Service for side-by-side comparison.

## Stack

- Expo SDK 51 + Expo Router (file-based routes in `app/`)
- TypeScript (strict)
- `react-native-vision-camera` (frame processors) + `react-native-vision-camera-face-detector`
- `react-native-ble-plx`
- `react-native-svg` for the signal + comparison charts
- `react-native-reanimated` for the breathing animation
- `@react-native-async-storage/async-storage` for sessions + moods

This app uses native modules that **don't run in Expo Go**. You need a
custom dev client.

## First-time setup

```bash
npm install
npx expo prebuild              # generates ios/ + android/
npx expo run:ios               # or run:android
```

For cloud builds:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

## Permissions

Configured in `app.json`:

- iOS: `NSCameraUsageDescription`, `NSBluetoothAlwaysUsageDescription`
- Android: `CAMERA`, `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`

The app requests camera permission lazily on first session start and
Bluetooth permissions when the user taps "Connect HR Monitor".

## Project layout

```
app/
  _layout.tsx                  Theme + Session providers, status bar
  (tabs)/
    _layout.tsx                Bottom tabs (4 entries)
    index.tsx                  Monitor — camera + BPM + charts
    history.tsx                Session list with averages
    breathing.tsx              Box / 4-7-8 / calm patterns
    mood.tsx                   Mood log with optional BPM link
src/
  components/
    SignalPlot.tsx             SVG line chart with gradient fill
    ComparisonChart.tsx        rPPG vs BLE polylines (gaps on null)
  context/
    ThemeContext.tsx           system/light/dark + AsyncStorage
    SessionContext.tsx         sessions + moods + recent stats
  hooks/
    useRPPG.ts                 vision-camera frame processor + DSP
    useBleHeartRate.ts         react-native-ble-plx wrapper
  utils/
    rppg/{buffer,dsp,pos,roi,sample}.ts   pure algorithms
    ble.ts                                BLE wrapper class
    time.ts                               formatters
  theme.ts                     light/dark palette tokens
```

## Algorithm notes

`src/utils/rppg/dsp.ts`, `pos.ts`, and `buffer.ts` are direct ports of
the web app's pulse pipeline:

1. Per-frame mean RGB inside forehead + cheek ROIs.
2. RingBuffer resamples to 30 fps.
3. Sliding-window POS projection cancels motion/specular artefacts.
4. Polynomial detrend → biquad bandpass (0.87–3.0 Hz) → Hann + DFT.
5. SNR gate, continuity prior (Gaussian on prior frequency), and a
   3-sample median yield the final BPM.

The ROI module (`roi.ts`) is the only file that diverges from the web
version: MLKit returns a smaller landmark set than MediaPipe, so the
forehead box is derived from `bounds.top` + the eye-line midpoint, and
cheek boxes are sized from inter-ocular distance.

## Source app

The original Vite/React app remains on the `improved-react` branch.
This branch (`claude/react-native-expo-conversion-Zv6je`) replaces the
web codebase wholesale. See `CONVERSION_PLAN.md` for the conversion
log.
