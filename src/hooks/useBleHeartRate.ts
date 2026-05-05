import { useCallback, useEffect, useRef, useState } from 'react';
import { BleHeartRate } from '../utils/ble';

export type BleHeartRateState = {
  bpm: number | null;
  connected: boolean;
  deviceName: string | null;
  status: string;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export function useBleHeartRate(): BleHeartRateState {
  const clientRef = useRef<BleHeartRate | null>(null);

  const [bpm, setBpm] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (clientRef.current) return clientRef.current;
    const client = new BleHeartRate(
      (next) => setBpm(next),
      (next) => {
        setStatus(next);
        if (next.startsWith('bt: connected')) setConnected(true);
        if (next === 'bt: disconnected') {
          setConnected(false);
          setBpm(null);
          setDeviceName(null);
        }
      },
    );
    clientRef.current = client;
    return client;
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const client = getClient();
      await client.connect();
      setDeviceName(client.deviceName);
      setConnected(client.connected);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, [getClient]);

  const disconnect = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    try {
      await client.disconnect();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, []);

  useEffect(() => {
    return () => {
      const client = clientRef.current;
      if (client?.connected) {
        client.disconnect().catch(() => {});
      }
    };
  }, []);

  return {
    bpm,
    connected,
    deviceName,
    status,
    error,
    connect,
    disconnect,
  };
}
