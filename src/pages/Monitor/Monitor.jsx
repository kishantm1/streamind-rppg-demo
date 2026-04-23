import { useEffect, useRef, useState } from 'react'
import { useRPPG } from '../../hooks/useRPPG'
import { useBleHeartRate } from '../../hooks/useBleHeartRate'
import { useSession } from '../../context/SessionContext'
import { SignalPlot } from '../../components/SignalPlot'
import { ComparisonChart } from '../../components/ComparisonChart'
import './Monitor.css'

const COMPARISON_WINDOW = 120  // seconds of history shown in the chart

function Monitor() {
  const {
    videoRef,
    overlayRef,
    isLoading,
    status,
    bpm,
    signalData,
    startSession,
    stopSession,
    isRunning,
    error
  } = useRPPG()

  const ble = useBleHeartRate()
  const { addSession } = useSession()

  const [sessionSaved, setSessionSaved] = useState(false)
  const [comparison, setComparison] = useState([])
  const bleHistoryRef = useRef([])

  // Sample both streams once per second while the session is running.
  useEffect(() => {
    if (!isRunning) return

    const startedAt = Date.now()
    const id = setInterval(() => {
      const sample = {
        t: (Date.now() - startedAt) / 1000,
        rppg: typeof bpm === 'number' ? bpm : null,
        ble: typeof ble.bpm === 'number' ? ble.bpm : null,
      }
      if (sample.ble !== null) bleHistoryRef.current.push(sample.ble)
      setComparison(prev => {
        const next = [...prev, sample]
        return next.length > COMPARISON_WINDOW ? next.slice(-COMPARISON_WINDOW) : next
      })
    }, 1000)

    return () => clearInterval(id)
  }, [isRunning, bpm, ble.bpm])

  const handleStartStop = async () => {
    if (isRunning) {
      const sessionData = stopSession()
      if (sessionData && sessionData.avgBpm) {
        const bleReadings = bleHistoryRef.current
        if (bleReadings.length > 0) {
          sessionData.bleAvgBpm = Math.round(
            bleReadings.reduce((a, b) => a + b, 0) / bleReadings.length
          )
          sessionData.bleMinBpm = Math.round(Math.min(...bleReadings))
          sessionData.bleMaxBpm = Math.round(Math.max(...bleReadings))
        }
        addSession(sessionData)
        setSessionSaved(true)
        setTimeout(() => setSessionSaved(false), 3000)
      }
      bleHistoryRef.current = []
      setComparison([])
    } else {
      setSessionSaved(false)
      bleHistoryRef.current = []
      setComparison([])
      await startSession()
    }
  }

  const handleBleToggle = async () => {
    if (ble.connected) {
      await ble.disconnect()
    } else {
      await ble.connect()
    }
  }

  const getBpmClass = () => {
    if (!bpm) return ''
    if (bpm < 60) return 'bpm--low'
    if (bpm > 100) return 'bpm--high'
    return 'bpm--normal'
  }

  const bleButtonLabel = ble.connected
    ? 'Disconnect'
    : !ble.supported
      ? 'Bluetooth unavailable'
      : 'Connect HR Monitor'

  const bleStatusText = ble.error
    ? ble.error
    : ble.status || (ble.supported
      ? 'Works in Chrome / Edge on desktop or Android'
      : 'Open this page in Chrome or Edge to pair a device')

  return (
    <div className="monitor">
      <div className="monitor__header">
        <h1 className="monitor__title">Heart Rate Monitor</h1>
        <p className="monitor__subtitle">
          Position your face in the frame for accurate readings
        </p>
      </div>

      <div className="monitor__content">
        {/* rPPG BPM Display */}
        <div className={`bpm-display ${isRunning && bpm ? 'bpm-display--active' : ''}`}>
          <div className="bpm-display__ring">
            <div className={`bpm-display__inner ${getBpmClass()}`}>
              {bpm ? (
                <>
                  <span className="bpm-display__value">{bpm}</span>
                  <span className="bpm-display__unit">BPM</span>
                </>
              ) : (
                <span className="bpm-display__placeholder">--</span>
              )}
            </div>
          </div>
          <p className="bpm-display__label">
            {bpm ? 'rPPG (camera)' : 'Heart Rate'}
          </p>
        </div>

        {/* BLE Card */}
        <div className={`ble-card ${ble.connected ? 'ble-card--connected' : ''}`}>
          <div className="ble-card__header">
            <span className="ble-card__title">BLE Device</span>
            {ble.deviceName && (
              <span className="ble-card__device">{ble.deviceName}</span>
            )}
          </div>
          <div className="ble-card__value">
            {ble.bpm ? (
              <>
                <span className="ble-card__bpm">{ble.bpm}</span>
                <span className="ble-card__unit">BPM</span>
              </>
            ) : (
              <span className="ble-card__placeholder">--</span>
            )}
          </div>
          <button
            className={`ble-card__button ${ble.connected ? 'ble-card__button--connected' : ''}`}
            onClick={handleBleToggle}
            disabled={!ble.supported}
            aria-label={bleButtonLabel}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
            </svg>
            {bleButtonLabel}
          </button>
          <p className="ble-card__status">{bleStatusText}</p>
        </div>

        {/* Video Feed */}
        <div className="video-container">
          <div className="video-wrapper">
            <video
              ref={videoRef}
              className="video-feed"
              autoPlay
              playsInline
              muted
              aria-label="Camera feed for heart rate detection"
            />
            <canvas
              ref={overlayRef}
              className="video-overlay"
              aria-hidden="true"
            />
            {!isRunning && (
              <div className="video-placeholder">
                <svg
                  className="video-placeholder__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span>Camera Preview</span>
              </div>
            )}
          </div>
        </div>

        {/* Signal Plot */}
        <div className="signal-container">
          <h3 className="signal-container__title">PPG Signal</h3>
          <SignalPlot data={signalData} width={320} height={120} />
        </div>

        {/* Comparison Chart */}
        <div className="comparison-container">
          <h3 className="signal-container__title">Camera vs Device</h3>
          <ComparisonChart data={comparison} width={320} height={140} />
        </div>

        {/* Status */}
        <div className="status-container">
          {error ? (
            <p className="status-text status-text--error">{error}</p>
          ) : (
            <p className={`status-text ${isRunning ? 'status-text--active' : ''}`}>
              {isLoading && <span className="status-spinner" aria-hidden="true" />}
              {status}
            </p>
          )}
          {sessionSaved && (
            <p className="status-text status-text--success animate-fade-in">
              Session saved to history
            </p>
          )}
        </div>

        {/* Control Button */}
        <button
          className={`control-button ${isRunning ? 'control-button--stop' : 'control-button--start'}`}
          onClick={handleStartStop}
          disabled={isLoading}
          aria-label={isRunning ? 'Stop monitoring session' : 'Start monitoring session'}
        >
          {isLoading ? (
            <>
              <span className="control-button__spinner" aria-hidden="true" />
              Loading...
            </>
          ) : isRunning ? (
            <>
              <svg
                className="control-button__icon"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop Session
            </>
          ) : (
            <>
              <svg
                className="control-button__icon"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Start Session
            </>
          )}
        </button>

        {/* Instructions */}
        <div className="instructions">
          <h3 className="instructions__title">Tips for accurate readings</h3>
          <ul className="instructions__list">
            <li>Ensure good lighting on your face</li>
            <li>Stay still during measurement</li>
            <li>Face the camera directly</li>
            <li>Wait 10-15 seconds for stable readings</li>
            <li>Pair a BLE heart rate monitor to compare against a real sensor</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Monitor
