# Streamind rPPG — Mobile (Expo)

Wraps the existing React web app inside a native iOS/Android shell using
Expo's [DOM Components](https://docs.expo.dev/guides/dom-components/)
(`"use dom"`).

## How it works

```
mobile/
  App.js                native React Native shell (one full-screen view)
  dom/WebApp.jsx        "use dom" — renders the mobile React app in a WebView
  dom/MobileApp.jsx     Routes for Monitor / History / Breathing / Mood
  dom/MobileLayout.jsx  Layout without Header's auth bits
  dom/MobileHeader.jsx  Theme toggle only — no Supabase / no logout
  metro.config.js       watches ../src so the DOM bundle imports shared code
  app.json              Expo config + iOS/Android camera permissions
```

`dom/WebApp.jsx` carries the `"use dom"` directive at the top, so Expo
bundles everything it imports (the web pages, MediaPipe loader, etc.)
and renders the result inside `react-native-webview`. From React Native's
perspective it's just a component — `<WebApp />` — but it runs as real
DOM with `getUserMedia`, `<canvas>`, etc.

The mobile build deliberately **does not include Supabase or auth**: it
bypasses `src/App` (which routes through `Login` / `ProtectedRoute`) and
mounts `MobileApp` directly with its own `Routes`. Theme + session
history (localStorage) are kept.

## Setup

```bash
cd mobile
npm install
```

## Run

```bash
npm run ios        # iOS Simulator (Xcode required)
npm run android    # Android emulator
npm start          # generic dev menu
```

> **Note:** `"use dom"` requires a dev build, not Expo Go. The first iOS
> run will prompt to install the simulator build via `expo run:ios`. On a
> physical device use `eas build --profile development`.

## Camera notes

- iOS Simulator does **not** have a webcam — use a physical device to
  actually exercise the rPPG pipeline.
- Permissions are declared in `app.json` (`NSCameraUsageDescription` for
  iOS, `CAMERA` for Android). The WebView config in `App.js` sets
  `allowsInlineMediaPlayback: true` and
  `mediaPlaybackRequiresUserAction: false` so `getUserMedia` works.

## What's shared with the web app

`metro.config.js` adds the repo root to `watchFolders` so the DOM bundle
can import directly from `../src` — no duplication. Editing
`src/pages/Monitor/Monitor.jsx` updates both the web build (Vite) and
the mobile build (Metro) on the next reload.
