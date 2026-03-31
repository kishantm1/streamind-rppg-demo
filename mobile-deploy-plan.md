# Mobile Deployment Plan — WebView via Capacitor

## Why Capacitor?

Your app is pure HTML/JS with no build step. Capacitor wraps it in a native WebView and gives you access to native APIs (like the camera) on both iOS and Android with minimal changes.

---

## Steps

### 1. Initialize npm & install dependencies

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm install -D typescript
```

### 2. Create a `www/` directory for web assets

Capacitor requires `webDir` to be a subdirectory (not `.`). We'll create a `www/` folder and copy (or symlink) the web files into it:

```
www/
  index.html
  script.js
  roi.js
  green.js
  buffer.js
  dsp.js
  ui.js
```

Alternatively, add a simple copy script in `package.json`:

```json
"scripts": {
  "build": "mkdir -p www && cp index.html script.js roi.js green.js buffer.js dsp.js ui.js www/"
}
```

### 3. Create `capacitor.config.ts`

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rppg.demo",
  appName: "rPPG Demo",
  webDir: "www",
  server: {
    androidScheme: "https",
  },
};

export default config;
```

### 4. Add native platforms

```bash
npm run build          # copy web files into www/
npx cap add ios
npx cap add android
npx cap sync           # copy www/ into native projects
```

This creates `ios/` and `android/` directories with full native projects.

### 5. Camera permissions

Capacitor's WebView needs explicit permission entries:

- **iOS**: Add to `ios/App/App/Info.plist`:
  ```xml
  <key>NSCameraUsageDescription</key>
  <string>This app uses the camera to measure heart rate.</string>
  ```
- **Android**: Add to `android/app/src/main/AndroidManifest.xml`:
  ```xml
  <uses-permission android:name="android.permission.CAMERA" />
  ```

### 6. Run locally

```bash
# iOS (requires Xcode + iOS Simulator)
npx cap open ios

# Android (requires Android Studio + emulator or device)
npx cap open android
```

Or run directly on a connected device:

```bash
npx cap run ios
npx cap run android
```

---

## Prerequisites

| Tool            | Required for | Install                          |
|-----------------|-------------|----------------------------------|
| Node.js >= 18   | Both        | Already installed                |
| Xcode           | iOS         | Mac App Store                    |
| CocoaPods       | iOS         | `sudo gem install cocoapods`     |
| Android Studio  | Android     | https://developer.android.com    |

---

## What changes in the existing code?

**Nothing.** Your HTML/JS files stay exactly the same. Capacitor just copies them into a native shell that renders them in a WebView.

---

## After first sync workflow

When you edit web files, re-deploy with:

```bash
npm run build && npx cap sync
npx cap run ios   # or android
```
