# `bluetooth.js` — Simple Explanation

A small module that lets the app talk to a real Bluetooth heart rate monitor (Polar strap, Garmin, Apple Watch, etc.) through the browser using the Web Bluetooth API. This way we can compare the camera-based rPPG reading against a real sensor.

## What it does, in plain words

1. The user clicks a "Connect HR Monitor" button.
2. The browser opens a device picker showing nearby heart rate devices.
3. The user picks one, the browser pairs with it.
4. The device starts pushing a new BPM value about once per second.
5. Our code hands each BPM to a callback the app provides — the UI just updates a number.

Disconnecting is one call and cleans up everything.

## The pieces

### `BleHeartRate` class

The only thing exported. You create one, give it two callbacks, and use it.

```js
const ble = new BleHeartRate(
  bpm   => console.log('new reading:', bpm),  // onReading
  state => console.log('status:', state)       // onStatus (optional)
);

await ble.connect();     // opens browser picker, connects, starts receiving
// ... readings flow into onReading ...
await ble.disconnect();  // stops and cleans up
```

Two read-only getters:
- `ble.connected` — `true` if a device is currently paired
- `ble.deviceName` — the name of the connected device, or `null`

### `connect()`

Does the setup in order:
1. Checks `navigator.bluetooth` exists (Safari / Firefox / iOS don't support it → throws a clear error).
2. Calls `requestDevice` with a filter for the standard Heart Rate service (`0x180D`) → this triggers the browser picker.
3. Connects to the device's GATT server.
4. Grabs the Heart Rate Measurement characteristic (`0x2A37`).
5. Subscribes to notifications so the device pushes readings automatically.
6. Also listens for unexpected disconnects so the UI doesn't get stuck.

It reports every step via `onStatus` (`"bt: scanning…"`, `"bt: connecting…"`, `"bt: connected — <name>"`) so the status line in the UI can mirror what's happening.

### `disconnect()`

Reverses everything: stops notifications, removes the listener, disconnects GATT. Safe to call even if the device already dropped.

### `parseHeartRate(dataView)`

Bluetooth heart rate monitors send data in a specific byte layout. This function decodes it:

- **Byte 0** is a flags byte. Bit 0 tells us whether the BPM value is stored as 1 byte or 2 bytes.
- **Byte 1** (and optionally byte 2) is the actual BPM.
- If the value is nonsense (0 or >= 300), it returns `null` and the reading is ignored.

That's the whole Bluetooth spec handling — most of it is just "read the flags byte, then read the next one or two bytes."

## Why it matters

Before this file, the app could only measure heart rate from the camera (rPPG). With `bluetooth.js`, the app can pull in a **ground-truth** reading from a real sensor at the same time — which is how the "improved" branch draws the camera vs. device comparison chart and evaluates how accurate the rPPG pipeline actually is.

## Browser support

Works in **Chrome** and **Edge** on desktop or Android. Does **not** work in Safari, Firefox, or anything on iOS — that's a platform limitation, not a code one.
