import { useState } from 'react'
import { useRPPG } from '../../hooks/useRPPG'
import { useSession } from '../../context/SessionContext'
import { SignalPlot } from '../../components/SignalPlot'
import './Monitor.css'

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

  const { addSession } = useSession()
  const [sessionSaved, setSessionSaved] = useState(false)

  const handleStartStop = async () => {
    if (isRunning) {
      const sessionData = stopSession()
      if (sessionData && sessionData.avgBpm) {
        addSession(sessionData)
        setSessionSaved(true)
        setTimeout(() => setSessionSaved(false), 3000)
      }
    } else {
      setSessionSaved(false)
      await startSession()
    }
  }

  const getBpmClass = () => {
    if (!bpm) return ''
    if (bpm < 60) return 'bpm--low'
    if (bpm > 100) return 'bpm--high'
    return 'bpm--normal'
  }

  return (
    <div className="monitor">
      <div className="monitor__header">
        <h1 className="monitor__title">Heart Rate Monitor</h1>
        <p className="monitor__subtitle">
          Position your face in the frame for accurate readings
        </p>
      </div>

      <div className="monitor__content">
        {/* BPM Display */}
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
            {bpm ? 'Current Heart Rate' : 'Heart Rate'}
          </p>
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
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Monitor
