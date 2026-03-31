import { useState, useEffect, useCallback, useRef } from 'react'
import './Breathing.css'

// Breathing patterns configuration
const BREATHING_PATTERNS = {
  box: {
    name: 'Box Breathing',
    description: 'Equal timing for calm focus',
    phases: [
      { name: 'Inhale', duration: 4 },
      { name: 'Hold', duration: 4 },
      { name: 'Exhale', duration: 4 },
      { name: 'Hold', duration: 4 }
    ],
    color: 'var(--calm-500)'
  },
  relaxing: {
    name: '4-7-8 Technique',
    description: 'Deep relaxation pattern',
    phases: [
      { name: 'Inhale', duration: 4 },
      { name: 'Hold', duration: 7 },
      { name: 'Exhale', duration: 8 }
    ],
    color: 'var(--teal-500)'
  },
  calm: {
    name: 'Calm Breathing',
    description: 'Simple and soothing',
    phases: [
      { name: 'Inhale', duration: 4 },
      { name: 'Exhale', duration: 6 }
    ],
    color: 'var(--calm-400)'
  }
}

function Breathing() {
  const [selectedPattern, setSelectedPattern] = useState('box')
  const [isRunning, setIsRunning] = useState(false)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [cycleCount, setCycleCount] = useState(0)
  const [totalSessionTime, setTotalSessionTime] = useState(0)

  const intervalRef = useRef(null)
  const pattern = BREATHING_PATTERNS[selectedPattern]
  const currentPhase = pattern.phases[currentPhaseIndex]

  // Calculate the scale for the breathing circle based on phase
  const getCircleScale = useCallback(() => {
    if (!isRunning) return 1

    const phaseName = currentPhase.name.toLowerCase()
    const progress = 1 - (timeRemaining / currentPhase.duration)

    if (phaseName === 'inhale') {
      // Scale from 1 to 1.5 during inhale
      return 1 + (0.5 * progress)
    } else if (phaseName === 'exhale') {
      // Scale from 1.5 to 1 during exhale
      return 1.5 - (0.5 * progress)
    } else {
      // Hold - maintain current scale
      const prevPhase = pattern.phases[(currentPhaseIndex - 1 + pattern.phases.length) % pattern.phases.length]
      return prevPhase.name.toLowerCase() === 'inhale' ? 1.5 : 1
    }
  }, [isRunning, currentPhase, timeRemaining, currentPhaseIndex, pattern.phases])

  // Get animation class based on current phase
  const getAnimationClass = useCallback(() => {
    if (!isRunning) return ''

    const phaseName = currentPhase.name.toLowerCase()
    if (phaseName === 'inhale') return 'breathing-in'
    if (phaseName === 'exhale') return 'breathing-out'
    return 'breathing-hold'
  }, [isRunning, currentPhase])

  // Start the breathing exercise
  const handleStart = useCallback(() => {
    setIsRunning(true)
    setCurrentPhaseIndex(0)
    setTimeRemaining(pattern.phases[0].duration)
    setCycleCount(0)
    setTotalSessionTime(0)
  }, [pattern.phases])

  // Pause the exercise
  const handlePause = useCallback(() => {
    setIsRunning(false)
  }, [])

  // Resume the exercise
  const handleResume = useCallback(() => {
    setIsRunning(true)
  }, [])

  // Reset everything
  const handleReset = useCallback(() => {
    setIsRunning(false)
    setCurrentPhaseIndex(0)
    setTimeRemaining(0)
    setCycleCount(0)
    setTotalSessionTime(0)
  }, [])

  // Change pattern
  const handlePatternChange = useCallback((patternKey) => {
    handleReset()
    setSelectedPattern(patternKey)
  }, [handleReset])

  // Timer logic
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0.1) {
          // Move to next phase
          const nextPhaseIndex = (currentPhaseIndex + 1) % pattern.phases.length

          // Check if we completed a full cycle
          if (nextPhaseIndex === 0) {
            setCycleCount((c) => c + 1)
          }

          setCurrentPhaseIndex(nextPhaseIndex)
          return pattern.phases[nextPhaseIndex].duration
        }
        return prev - 0.1
      })

      setTotalSessionTime((prev) => prev + 0.1)
    }, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, currentPhaseIndex, pattern.phases])

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate total cycle duration
  const getCycleDuration = () => {
    return pattern.phases.reduce((sum, phase) => sum + phase.duration, 0)
  }

  return (
    <div className="breathing-page">
      <header className="breathing-header">
        <h1>Breathing Exercise</h1>
        <p className="breathing-subtitle">Take a moment to breathe and find your calm</p>
      </header>

      {/* Pattern Selector */}
      <div className="pattern-selector">
        {Object.entries(BREATHING_PATTERNS).map(([key, p]) => (
          <button
            key={key}
            className={`pattern-card ${selectedPattern === key ? 'active' : ''}`}
            onClick={() => handlePatternChange(key)}
            disabled={isRunning}
            aria-pressed={selectedPattern === key}
          >
            <span className="pattern-name">{p.name}</span>
            <span className="pattern-description">{p.description}</span>
            <span className="pattern-timing">
              {p.phases.map((phase) => `${phase.duration}s`).join(' - ')}
            </span>
          </button>
        ))}
      </div>

      {/* Main Breathing Circle */}
      <div className="breathing-container">
        <div
          className={`breathing-circle-wrapper ${getAnimationClass()}`}
          style={{
            '--phase-duration': `${currentPhase.duration}s`,
            '--circle-scale': getCircleScale()
          }}
        >
          <div className="breathing-circle-outer">
            <div className="breathing-circle-inner">
              <div className="breathing-content">
                {isRunning ? (
                  <>
                    <span className="phase-name">{currentPhase.name}</span>
                    <span className="phase-timer">{Math.ceil(timeRemaining)}</span>
                  </>
                ) : (
                  <>
                    <span className="phase-name">Ready</span>
                    <span className="phase-instruction">Press Start</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Decorative rings */}
          <div className="breathing-ring ring-1"></div>
          <div className="breathing-ring ring-2"></div>
          <div className="breathing-ring ring-3"></div>
        </div>

        {/* Progress indicator */}
        {isRunning && (
          <div className="phase-indicators">
            {pattern.phases.map((phase, index) => (
              <div
                key={index}
                className={`phase-indicator ${index === currentPhaseIndex ? 'active' : ''} ${index < currentPhaseIndex ? 'completed' : ''}`}
                aria-label={`${phase.name} phase ${index === currentPhaseIndex ? '(current)' : ''}`}
              >
                <span className="indicator-dot"></span>
                <span className="indicator-label">{phase.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="breathing-controls">
        {!isRunning && timeRemaining === 0 ? (
          <button
            className="control-button primary"
            onClick={handleStart}
            aria-label="Start breathing exercise"
          >
            <svg className="control-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Start
          </button>
        ) : isRunning ? (
          <button
            className="control-button secondary"
            onClick={handlePause}
            aria-label="Pause breathing exercise"
          >
            <svg className="control-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
            Pause
          </button>
        ) : (
          <button
            className="control-button primary"
            onClick={handleResume}
            aria-label="Resume breathing exercise"
          >
            <svg className="control-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Resume
          </button>
        )}

        {(isRunning || timeRemaining > 0 || cycleCount > 0) && (
          <button
            className="control-button tertiary"
            onClick={handleReset}
            aria-label="Reset breathing exercise"
          >
            <svg className="control-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Reset
          </button>
        )}
      </div>

      {/* Session Stats */}
      {(cycleCount > 0 || totalSessionTime > 0) && (
        <div className="session-stats">
          <div className="stat">
            <span className="stat-value">{cycleCount}</span>
            <span className="stat-label">Cycles</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatTime(totalSessionTime)}</span>
            <span className="stat-label">Session Time</span>
          </div>
          <div className="stat">
            <span className="stat-value">{getCycleDuration()}s</span>
            <span className="stat-label">Per Cycle</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="breathing-instructions">
        <h3>How to Practice</h3>
        <ol>
          <li>Find a comfortable seated position</li>
          <li>Select a breathing pattern above</li>
          <li>Press Start and follow the visual guide</li>
          <li>Breathe in through your nose, out through your mouth</li>
          <li>Continue for at least 3-5 cycles</li>
        </ol>
      </div>
    </div>
  )
}

export default Breathing
