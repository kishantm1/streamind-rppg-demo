// ble.ts
// react-native-ble-plx wrapper around the standard Bluetooth Heart Rate
// Service (0x180D / 0x2A37). Mirrors the API of the web app's bluetooth.js
// (connect / disconnect, deviceName, status callbacks) so the React Native
// hook in useBleHeartRate.ts can stay close to its web sibling.

import {
  BleManager,
  Device,
  Subscription,
  Characteristic,
  State,
} from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_CHARACTERISTIC = '00002a37-0000-1000-8000-00805f9b34fb';

let manager: BleManager | null = null;
function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

export type StatusCb = (state: string) => void;
export type ReadingCb = (bpm: number) => void;

async function ensureAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const sdk =
    typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

  const required: string[] =
    sdk >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const result = await PermissionsAndroid.requestMultiple(required as any);
  return required.every((p) => result[p as keyof typeof result] === PermissionsAndroid.RESULTS.GRANTED);
}

export class BleHeartRate {
  private _device: Device | null = null;
  private _sub: Subscription | null = null;
  private _disconnectSub: Subscription | null = null;
  private readonly _onReading: ReadingCb;
  private readonly _onStatus: StatusCb;

  constructor(onReading: ReadingCb, onStatus?: StatusCb) {
    this._onReading = onReading;
    this._onStatus = onStatus ?? (() => {});
  }

  get connected(): boolean {
    return !!this._device;
  }

  get deviceName(): string | null {
    return this._device?.name ?? this._device?.localName ?? null;
  }

  async connect(): Promise<void> {
    const granted = await ensureAndroidPermissions();
    if (!granted) {
      throw new Error('Bluetooth permissions denied.');
    }

    const mgr = getManager();
    const state = await mgr.state();
    if (state !== State.PoweredOn) {
      throw new Error('Bluetooth is not powered on. Enable Bluetooth and try again.');
    }

    this._onStatus('bt: scanning…');

    const device = await scanForFirstHrDevice(mgr);

    this._onStatus(`bt: connecting to ${device.name ?? 'device'}…`);

    const connected = await device.connect({ requestMTU: 64 });
    await connected.discoverAllServicesAndCharacteristics();
    this._device = connected;

    this._disconnectSub = connected.onDisconnected(() => {
      this._cleanup();
      this._onStatus('bt: disconnected');
    });

    this._sub = connected.monitorCharacteristicForService(
      HR_SERVICE,
      HR_CHARACTERISTIC,
      (err, characteristic) => {
        if (err || !characteristic) return;
        const bpm = parseHeartRate(characteristic);
        if (bpm !== null) this._onReading(bpm);
      },
    );

    this._onStatus(`bt: connected — ${connected.name ?? 'HR monitor'}`);
  }

  async disconnect(): Promise<void> {
    const device = this._device;
    this._cleanup();
    if (device) {
      try {
        await device.cancelConnection();
      } catch {
        /* already disconnected */
      }
    }
    this._onStatus('bt: disconnected');
  }

  private _cleanup(): void {
    this._sub?.remove();
    this._disconnectSub?.remove();
    this._sub = null;
    this._disconnectSub = null;
    this._device = null;
  }
}

function scanForFirstHrDevice(mgr: BleManager, timeoutMs = 15_000): Promise<Device> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      mgr.stopDeviceScan();
      reject(new Error('No heart-rate monitor found within 15s.'));
    }, timeoutMs);

    mgr.startDeviceScan([HR_SERVICE], null, (err, device) => {
      if (err) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        mgr.stopDeviceScan();
        reject(err);
        return;
      }
      if (device && !resolved) {
        resolved = true;
        clearTimeout(timer);
        mgr.stopDeviceScan();
        resolve(device);
      }
    });
  });
}

// Byte 0 = flags; bit 0 selects uint8 vs little-endian uint16 for the BPM value.
function parseHeartRate(characteristic: Characteristic): number | null {
  const value = characteristic.value;
  if (!value) return null;
  const bytes = base64ToBytes(value);
  if (bytes.length < 2) return null;
  const flags = bytes[0];
  const is16 = (flags & 0x01) !== 0;
  const bpm = is16 ? bytes[1] | (bytes[2] << 8) : bytes[1];
  return bpm > 0 && bpm < 300 ? bpm : null;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64ToBytes(str: string): Uint8Array {
  const clean = str.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let acc = 0;
  let outIdx = 0;
  for (let i = 0; i < clean.length; i++) {
    const v = B64.indexOf(clean[i]);
    if (v < 0) continue;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[outIdx++] = (acc >> bits) & 0xff;
    }
  }
  return out.subarray(0, outIdx);
}
