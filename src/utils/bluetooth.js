// bluetooth.js
// Connect to any BLE heart-rate monitor (Polar, Garmin chest strap, etc.) via
// the Web Bluetooth API and the standard Heart Rate Service (0x180D / 0x2A37).
//
// Usage:
//   const ble = new BleHeartRate(bpm => console.log(bpm), status => ...);
//   await ble.connect();
//   await ble.disconnect();

const HR_SERVICE = 0x180D;
const HR_CHARACTERISTIC = 0x2A37;

/** True if the current browser exposes Web Bluetooth. */
export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export class BleHeartRate {
  /**
   * @param {(bpm: number) => void} onReading
   * @param {(state: string) => void} [onStatus]
   */
  constructor(onReading, onStatus) {
    this._onReading = onReading;
    this._onStatus = onStatus ?? (() => {});
    this._device = null;
    this._char = null;
    this._handler = null;
    this._disconnectHandler = null;
  }

  get connected() {
    return this._device?.gatt?.connected ?? false;
  }

  get deviceName() {
    return this._device?.name ?? null;
  }

  async connect() {
    if (!isBluetoothSupported()) {
      throw new Error(
        'Web Bluetooth is not available. Use Chrome or Edge on desktop/Android ' +
        '(not Safari, Firefox, or iOS).'
      );
    }

    this._onStatus('bt: scanning…');

    this._device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HR_SERVICE] }],
    });

    this._onStatus(`bt: connecting to ${this._device.name ?? 'device'}…`);

    this._disconnectHandler = () => {
      this._onStatus('bt: disconnected');
      this._char = null;
      this._handler = null;
    };
    this._device.addEventListener('gattserverdisconnected', this._disconnectHandler);

    const server = await this._device.gatt.connect();
    const service = await server.getPrimaryService(HR_SERVICE);
    this._char = await service.getCharacteristic(HR_CHARACTERISTIC);

    this._handler = (event) => {
      const bpm = parseHeartRate(event.target.value);
      if (bpm !== null) this._onReading(bpm);
    };

    this._char.addEventListener('characteristicvaluechanged', this._handler);
    await this._char.startNotifications();

    this._onStatus(`bt: connected — ${this._device.name ?? 'HR monitor'}`);
  }

  async disconnect() {
    if (this._char && this._handler) {
      try { await this._char.stopNotifications(); } catch (_) { /* ignore */ }
      this._char.removeEventListener('characteristicvaluechanged', this._handler);
    }
    if (this._device && this._disconnectHandler) {
      this._device.removeEventListener('gattserverdisconnected', this._disconnectHandler);
    }
    if (this._device?.gatt?.connected) {
      this._device.gatt.disconnect();
    }
    this._char = null;
    this._handler = null;
    this._disconnectHandler = null;
    this._onStatus('bt: disconnected');
  }
}

// Byte 0 = flags; bit 0 selects uint8 vs little-endian uint16 for the BPM value.
// Byte 1 (+ optional byte 2) = heart-rate value.
function parseHeartRate(dataView) {
  if (!dataView || dataView.byteLength < 2) return null;
  const flags = dataView.getUint8(0);
  const is16 = (flags & 0x01) !== 0;
  const bpm = is16
    ? dataView.getUint16(1, /* littleEndian */ true)
    : dataView.getUint8(1);
  return bpm > 0 && bpm < 300 ? bpm : null;
}
