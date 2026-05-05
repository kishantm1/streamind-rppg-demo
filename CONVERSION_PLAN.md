# React → React Native (Expo) Conversion Plan

**Source branch:** `improved-react` (Vite + React 18, Web Bluetooth, MediaPipe FaceLandmarker)
**Target branch:** `claude/react-native-expo-conversion-Zv6je` (this branch, branched off `improved-react`)
**Target stack:** Expo SDK 51 + TypeScript + Expo Router + custom dev client (not Expo Go)

---

## Decisions (locked in via earlier Q&A)

| Question | Choice |
|---|---|
| Native scope | **Custom dev client** via `npx expo prebuild` + EAS Build. Required for BLE + frame processors. |
| Camera + face detection | **react-native-vision-camera** + **react-native-vision-camera-face-detector** (Google MLKit). |
| BLE | **react-native-ble-plx** — keep BPM comparison feature. |
| Routing + charts | **Expo Router** (file-based) + **react-native-svg** (`<Polyline>`). |

---

## What stays the same (pure JS, lifts directly)

These have no DOM/canvas/browser dependencies and copy over verbatim with `.ts` extensions and JSDoc → TS types:

- `src/utils/rppg/buffer.js` — RingBuffer
- `src/utils/rppg/dsp.js` — POS pulse → bandpass → FFT → BPM (with continuity prior)
- `src/utils/rppg/pos.js` — sliding-window POS chrominance projection
- Algorithm logic in `src/utils/rppg/roi.js` (keeps the MediaPipe landmark indices) — only the input shape changes (MLKit returns a different landmark set; we'll either remap or fall back to a face-bounding-box derived ROI; see Tradeoffs below)

## What gets rewritten (DOM / Web API → native)

| Web concept | RN replacement |
|---|---|
| `<video>` + `getUserMedia` | `<Camera>` from react-native-vision-camera |
| `canvas.getImageData` per frame | vision-camera **frame processor** (worklet) — direct `Frame` pixel access via `react-native-fast-tflite`-style plugins, or via `vision-camera-face-detector`'s landmark output + a separate average-RGB plugin |
| `requestAnimationFrame` loop | vision-camera frame processor runs on its own JS thread |
| MediaPipe FaceLandmarker (478 pts) | MLKit face contours / landmarks via `react-native-vision-camera-face-detector` (smaller landmark set: bounds, eyes, nose, mouth, cheek points, smile probability). Forehead ROI derived from face bounds + eye line; cheeks from cheek-position landmarks. |
| Web Bluetooth (`navigator.bluetooth`) | `react-native-ble-plx` — same Heart Rate Service `0x180D` / characteristic `0x2A37` |
| `localStorage` | `@react-native-async-storage/async-storage` |
| `<canvas>` charts | `react-native-svg` `<Polyline>` for traces, `<Line>` for grid |
| react-router v6 (`<Routes>`, `NavLink`) | Expo Router `app/_layout.tsx` + `app/(tabs)/*.tsx` |
| CSS files + CSS variables | `StyleSheet.create` + a `useTheme()` hook returning palette objects |
| Window media-query for dark mode | `useColorScheme()` from `react-native` |
| `lucide-react` icons | `lucide-react-native` (same names) |

## What gets dropped or deferred

- `index.html`, `vite.config.js`, `vitest.config.js`, `dist/`, `node_modules/` — replaced by Expo build chain
- `script.js`, `ui.js`, `roi.js` (root-level legacy) — superseded by `src/utils/rppg/*` already on the branch
- `supabase-rppg-sessions.sql`, `bluetooth-explained.md`, `mobile-deploy-plan.md` — keep as historical context, not used by RN app
- DPR-aware canvas scaling (RN handles pixel density automatically)
- The `lockCameraSettings` Web exposure-lock helper — vision-camera exposes `exposure`, `focus`, `whiteBalance` props directly on `<Camera>`; we'll set `format.autoFocusSystem='manual'` + fixed exposure/whiteBalance after a 2s settle

---

## Target file layout

```
/                                 (root of new RN app, replaces Vite root)
  app.json                        Expo config — appId, plugins, permissions
  app.config.ts                   (optional) dynamic Expo config
  babel.config.js                 expo-router + reanimated plugins
  tsconfig.json                   strict, with paths
  package.json                    new deps (see below)
  index.ts                        Expo Router entry
  app/
    _layout.tsx                   Root layout — providers (Theme, Session) + <Stack/Tabs>
    (tabs)/
      _layout.tsx                 Bottom tab navigator (4 tabs)
      index.tsx                   Monitor tab (was /pages/Monitor)
      history.tsx                 History tab
      breathing.tsx               Breathing tab
      mood.tsx                    Mood tab
  src/
    components/
      SignalPlot.tsx              SVG <Polyline>
      ComparisonChart.tsx         SVG <Polyline> x2 + legend
      BpmDisplay.tsx              Concentric rings + value
      BleCard.tsx                 Connect/disconnect button + status
    hooks/
      useRPPG.ts                  vision-camera + face detector + DSP loop
      useBleHeartRate.ts          react-native-ble-plx wrapper
      useThemePalette.ts          {colors, ...} keyed by useColorScheme()
    context/
      SessionContext.tsx          AsyncStorage-backed sessions + moods
      ThemeContext.tsx            Manual override on top of useColorScheme()
    utils/
      rppg/
        buffer.ts                 (port)
        dsp.ts                    (port)
        pos.ts                    (port)
        roi.ts                    (port — adapted to MLKit landmark shape)
        index.ts
      ble.ts                      react-native-ble-plx wrapper class
      time.ts                     formatTimestamp + formatDuration helpers (shared by History/Mood)
    theme.ts                      Color tokens (teal/calm/warning + dark/light)
```

The legacy web files (`index.html`, `script.js`, `dist/`, `node_modules/`, `vite.config.js`, root-level `*.js` modules, `src/main.jsx`, `src/App.jsx`, `src/pages/*`, `src/components/*/*.css`) are deleted in this conversion. The original code remains on the `improved-react` branch.

---

## New `package.json` dependencies

```jsonc
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-status-bar": "~1.12.0",
    "expo-splash-screen": "~0.27.0",
    "expo-linking": "~6.3.0",
    "expo-constants": "~16.0.0",
    "expo-system-ui": "~3.0.0",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "react-native-reanimated": "~3.10.1",        // required by vision-camera frame processors
    "react-native-worklets-core": "1.3.3",        // worklet runtime for frame processors
    "react-native-vision-camera": "^4.5.0",
    "react-native-vision-camera-face-detector": "^1.7.1",
    "react-native-ble-plx": "^3.2.0",
    "@react-native-async-storage/async-storage": "1.23.1",
    "react-native-svg": "15.2.0",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "3.31.1",
    "react-native-gesture-handler": "~2.16.1",
    "lucide-react-native": "^0.344.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.45",
    "typescript": "~5.3.3",
    "@babel/core": "^7.24.0"
  }
}
```

`app.json` plugins/permissions:

- `react-native-vision-camera` plugin → `cameraPermissionText`
- `react-native-ble-plx` plugin (or manual) → BLE + location permissions
- iOS `NSCameraUsageDescription`, `NSBluetoothAlwaysUsageDescription`
- Android `CAMERA`, `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION` (pre-Android 12)

---

## Algorithm port — the only non-trivial bit

The web app does:
```
frame → drawImage → getImageData(roi) → mean RGB → RingBuffer → POS → bandpass → FFT → BPM
```

In RN with vision-camera, the frame processor runs in a worklet and gives us a `Frame` object with raw pixel buffers. We have two viable shapes:

**Approach A (preferred):** Use `vision-camera-face-detector` to get face bounds + landmarks per frame. From that, compute the same forehead/cheek ROI rectangles in pixels. Sample mean RGB inside each ROI using a small custom frame-processor plugin (≈30 lines of native code) OR by cropping with `react-native-vision-camera`'s built-in pixel access (`frame.toArrayBuffer()` available in v4). Push `(t, r, g, b)` into the RingBuffer on the JS thread via `runOnJS`.

**Approach B (fallback if `frame.toArrayBuffer()` perf is too slow):** Drop face landmarks per frame; instead sample at 30 fps using a fixed forehead rectangle anchored to the most recent face-bounds detection (which can run at 5–10 fps).

We will start with **Approach A**; the frame processor reads pixels at the same 30 fps the web app targets. The DSP layer (`buffer`, `pos`, `dsp`) is unchanged.

### MLKit landmark mapping
MediaPipe gives 478 dense landmarks; MLKit gives `LEFT_EYE`, `RIGHT_EYE`, `NOSE_BASE`, `MOUTH_*`, `LEFT_CHEEK`, `RIGHT_CHEEK`, plus a face bounds rect and contour points.
- **Forehead ROI:** bounds.top → eye-line midpoint, narrowed to ~50% bounds width, centered on between-eyes midpoint.
- **Left/right cheek ROI:** small box around `LEFT_CHEEK`/`RIGHT_CHEEK` landmarks, sized as a fraction of inter-ocular distance.

This won't match the per-pixel ROI tightness of MediaPipe but is close enough for the POS algorithm's purposes; the ROI shape matters less than getting consistent, brow-free skin patches.

---

## BLE port

Same service/characteristic UUIDs (`0x180D` / `0x2A37`). The byte-parsing function in `bluetooth.js` lifts directly. The lifecycle wrapper changes from Web Bluetooth event listeners to react-native-ble-plx's `monitorCharacteristicForDevice` subscription. Permissions: must request runtime Bluetooth permissions on Android 12+ before scanning.

---

## Charts port

`SignalPlot` and `ComparisonChart` become SVG-based. Same auto-scaling math, same colors (`#14b8a6`, `#f59e0b`). Replace per-frame canvas redraw with a memoized `<Polyline points={...}/>`. For the comparison chart's "gap on null" behavior we split into multiple `<Polyline>` segments per non-null run.

---

## Storage port

`localStorage.getItem/setItem` → `AsyncStorage.getItem/setItem`. Wrapped in a small async-loader pattern inside `SessionContext` since AsyncStorage is async. UI shows nothing until first load resolves (matches current behavior — no flash).

---

## Tradeoffs / things I'm explicitly NOT doing in v1

1. **Not porting unit tests.** `src/context/SessionContext.test.jsx` uses Vitest + happy-dom; an RN port would need jest-expo + a fresh test setup. Out of scope here unless asked.
2. **Not building the iOS/Android binaries.** This branch lands the source. The user runs `npx expo prebuild && eas build --profile development --platform ios|android` to produce the dev client.
3. **Not preserving the Vite app on this branch.** The whole web app is removed in favor of the RN app. The `improved-react` branch still has it.
4. **MediaPipe is replaced, not ported.** Running MediaPipe Tasks-Vision WASM in RN is possible (via an embedded WebView) but defeats the purpose of going native. MLKit faces give us comparable forehead/cheek ROI quality with native perf.

---

## Implementation order

1. Delete legacy web app files (Vite/React source, `dist/`, `node_modules/`, root `.js` modules).
2. Write new `package.json`, `app.json`, `babel.config.js`, `tsconfig.json`, `index.ts`.
3. Port pure-JS rPPG utils to `src/utils/rppg/*.ts`.
4. Port BLE wrapper to `src/utils/ble.ts`.
5. Port + adapt `SessionContext`, `ThemeContext`.
6. Build SVG `SignalPlot`, `ComparisonChart`.
7. Build `useBleHeartRate` and `useRPPG` hooks.
8. Build the 4 tab screens.
9. Wire up `app/_layout.tsx` + `app/(tabs)/_layout.tsx`.
10. Commit and push to `claude/react-native-expo-conversion-Zv6je`.

The user can then run:
```bash
npm install
npx expo prebuild
npx expo run:ios      # or run:android
# or for cloud builds:
eas build --profile development --platform ios
```
