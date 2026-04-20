// bluetooth.js
// this helps the model connect to any Bluetooth LE heart rate monitor (Garmin, Polar, Apple Watch,
// chest straps, etc.) using the Web Bluetooth API and the standard Heart Rate
// Service (UUID 0x180D / Characteristic 0x2A37).
//
// the device pushes a new reading automatically (typically once per second).
// We parse the value according to the BT spec and call a user-supplied callback.
//
// Usage:
//   import { BleHeartRate } from './bluetooth.js';
//   const ble = new BleHeartRate(bpm => console.log('HR:', bpm));
//   await ble.connect();   // triggers browser device-picker dialog
//   await ble.disconnect();

// Standard Bluetooth GATT UUIDs for the Heart Rate service
const HR_SERVICE = 0x180D;
const HR_CHARACTERISTIC = 0x2A37;

export class BleHeartRate {
    /**
     * @param {(bpm: number) => void} onReading  - Called each time a new HR value arrives
     * @param {(state: string) => void} onStatus - Called with status strings for the UI
     */
    constructor(onReading, onStatus) {
        this._onReading = onReading;
        this._onStatus = onStatus ?? (() => { });
        this._device = null;
        this._char = null;
        this._handler = null;
    }

    /** Returns true if currently connected */
    get connected() {
        return this._device?.gatt?.connected ?? false;
    }

    /** Returns the device name once connected, else null */
    get deviceName() {
        return this._device?.name ?? null;
    }

    /**
     * Open the browser Bluetooth device picker, connect, and start receiving
     * heart rate notifications. Resolves when the first notification handler
     * is registered (before the first reading arrives).
     */
    async connect() {
        if (!navigator.bluetooth) {
            throw new Error(
                'Web Bluetooth is not available. Use Chrome or Edge on desktop/Android ' +
                '(not Safari, Firefox, or iOS).'
            );
        }

        this._onStatus('bt: scanning…');

        // Request a device that advertises the Heart Rate service
        this._device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE] }],
        });

        this._onStatus(`bt: connecting to ${this._device.name ?? 'device'}…`);

        // Listen for unexpected disconnections
        this._device.addEventListener('gattserverdisconnected', () => {
            this._onStatus('bt: disconnected');
            this._char = null;
            this._handler = null;
        });

        const server = await this._device.gatt.connect();
        const service = await server.getPrimaryService(HR_SERVICE);
        this._char = await service.getCharacteristic(HR_CHARACTERISTIC);

        // Build the notification handler and keep a reference so we can remove it
        this._handler = (event) => {
            const bpm = parseHeartRate(event.target.value);
            if (bpm !== null) this._onReading(bpm);
        };

        this._char.addEventListener('characteristicvaluechanged', this._handler);
        await this._char.startNotifications();

        this._onStatus(`bt: connected — ${this._device.name ?? 'HR monitor'}`);
    }

    /** Stop notifications and disconnect cleanly. */
    async disconnect() {
        if (this._char && this._handler) {
            try {
                await this._char.stopNotifications();
            } catch (_) { /* ignore if already disconnected */ }
            this._char.removeEventListener('characteristicvaluechanged', this._handler);
        }
        if (this._device?.gatt?.connected) {
            this._device.gatt.disconnect();
        }
        this._char = null;
        this._handler = null;
        this._onStatus('bt: disconnected');
    }
}

// Byte 0 = flags:
//   bit 0 : 0 = HR value is uint8, 1 = HR value is uint16
//   bit 3 : energy expended present
//   bit 4 : RR-interval present
// Byte 1 (+ optional byte 2) = heart rate value

function parseHeartRate(dataView) {
    if (!dataView || dataView.byteLength < 2) return null;
    const flags = dataView.getUint8(0);
    const is16 = (flags & 0x01) !== 0;
    const bpm = is16 ? dataView.getUint16(1, /*littleEndian=*/true)
        : dataView.getUint8(1);
    return bpm > 0 && bpm < 300 ? bpm : null;
}
