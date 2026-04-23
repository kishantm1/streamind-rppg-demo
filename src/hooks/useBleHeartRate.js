import { useCallback, useEffect, useRef, useState } from 'react'
import { BleHeartRate, isBluetoothSupported } from '../utils/bluetooth'

/**
 * React hook wrapping a single BleHeartRate client.
 * Exposes live BPM, connection state, status strings, and connect/disconnect actions.
 */
export function useBleHeartRate() {
  const clientRef = useRef(null)

  const [supported] = useState(() => isBluetoothSupported())
  const [bpm, setBpm] = useState(null)
  const [connected, setConnected] = useState(false)
  const [deviceName, setDeviceName] = useState(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)

  // Lazily construct the client; one instance per hook lifetime.
  const getClient = useCallback(() => {
    if (clientRef.current) return clientRef.current

    const onReading = (nextBpm) => setBpm(nextBpm)
    const onStatus = (nextStatus) => {
      setStatus(nextStatus)
      // The status string from the BLE module is authoritative about connection state.
      if (nextStatus.startsWith('bt: connected')) setConnected(true)
      if (nextStatus === 'bt: disconnected') {
        setConnected(false)
        setBpm(null)
        setDeviceName(null)
      }
    }

    clientRef.current = new BleHeartRate(onReading, onStatus)
    return clientRef.current
  }, [])

  const connect = useCallback(async () => {
    setError(null)
    if (!supported) {
      setError('Web Bluetooth is not available in this browser.')
      return
    }
    try {
      const client = getClient()
      await client.connect()
      setDeviceName(client.deviceName)
      setConnected(client.connected)
    } catch (err) {
      // User cancelling the device picker throws a DOMException — treat as no-op.
      if (err?.name === 'NotFoundError') {
        setStatus('')
        return
      }
      setError(err?.message ?? String(err))
    }
  }, [getClient, supported])

  const disconnect = useCallback(async () => {
    const client = clientRef.current
    if (!client) return
    try {
      await client.disconnect()
    } catch (err) {
      setError(err?.message ?? String(err))
    }
  }, [])

  useEffect(() => {
    return () => {
      const client = clientRef.current
      if (client?.connected) {
        client.disconnect().catch(() => {})
      }
    }
  }, [])

  return {
    supported,
    bpm,
    connected,
    deviceName,
    status,
    error,
    connect,
    disconnect,
  }
}
