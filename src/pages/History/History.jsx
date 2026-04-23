import { useState } from 'react'
import { Heart, Trash2, Calendar, Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { useSession } from '../../context/SessionContext'
import './History.css'

/**
 * Format a timestamp into a human-readable string
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted date string
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const oneDay = 24 * 60 * 60 * 1000

  // Check if it's today
  if (diff < oneDay && date.getDate() === now.getDate()) {
    return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }

  // Check if it's yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }

  // Check if it's within the last week
  if (diff < 7 * oneDay) {
    return date.toLocaleDateString([], {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Otherwise, show full date
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit'
  })
}

/**
 * Format duration in seconds to a readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (secs === 0) {
    return `${mins}m`
  }
  return `${mins}m ${secs}s`
}

function History() {
  const { sessions, clearSessions, getRecentStats } = useSession()
  const [showConfirm, setShowConfirm] = useState(false)

  const stats = getRecentStats()

  const handleClearHistory = () => {
    clearSessions()
    setShowConfirm(false)
  }

  return (
    <div className="history">
      <header className="history__header">
        <h1 className="history__title">
          <Calendar size={24} strokeWidth={2} />
          Session History
        </h1>
        {sessions.length > 0 && (
          <button
            className="history__clear-btn"
            onClick={() => setShowConfirm(true)}
            aria-label="Clear all history"
          >
            <Trash2 size={18} strokeWidth={2} />
            Clear
          </button>
        )}
      </header>

      {/* Stats Card */}
      {stats && (
        <div className="history__stats">
          <h2 className="history__stats-title">Recent Averages</h2>
          <p className="history__stats-subtitle">Based on your last {stats.count} sessions</p>
          <div className="history__stats-grid">
            <div className="stat-item">
              <div className="stat-item__icon stat-item__icon--avg">
                <Heart size={20} strokeWidth={2} />
              </div>
              <div className="stat-item__content">
                <span className="stat-item__value">{Math.round(stats.avgBpm)}</span>
                <span className="stat-item__label">Avg BPM</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-item__icon stat-item__icon--min">
                <TrendingDown size={20} strokeWidth={2} />
              </div>
              <div className="stat-item__content">
                <span className="stat-item__value">{Math.round(stats.minBpm)}</span>
                <span className="stat-item__label">Min BPM</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-item__icon stat-item__icon--max">
                <TrendingUp size={20} strokeWidth={2} />
              </div>
              <div className="stat-item__content">
                <span className="stat-item__value">{Math.round(stats.maxBpm)}</span>
                <span className="stat-item__label">Max BPM</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session List */}
      {sessions.length > 0 ? (
        <div className="history__list">
          {sessions.map((session) => (
            <article key={session.id} className="session-card">
              <div className="session-card__header">
                <span className="session-card__date">
                  {formatTimestamp(session.timestamp)}
                </span>
                <span className="session-card__duration">
                  {formatDuration(session.duration)}
                </span>
              </div>
              <div className="session-card__body">
                <div className="session-card__bpm">
                  <Heart size={24} strokeWidth={2} className="session-card__heart-icon" />
                  <span className="session-card__bpm-value">{Math.round(session.avgBpm)}</span>
                  <span className="session-card__bpm-label">BPM</span>
                </div>
                <div className="session-card__range">
                  <Activity size={16} strokeWidth={2} />
                  <span>
                    {session.minBpm ? Math.round(session.minBpm) : '--'} - {session.maxBpm ? Math.round(session.maxBpm) : '--'} BPM
                  </span>
                </div>
              </div>
              {typeof session.bleAvgBpm === 'number' && (
                <div className="session-card__ble">
                  <span className="session-card__ble-label">BLE</span>
                  <span className="session-card__ble-value">{session.bleAvgBpm}</span>
                  <span className="session-card__ble-unit">BPM avg</span>
                  {typeof session.bleMinBpm === 'number' && typeof session.bleMaxBpm === 'number' && (
                    <span className="session-card__ble-range">
                      ({session.bleMinBpm}–{session.bleMaxBpm})
                    </span>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="history__empty">
          <div className="history__empty-icon">
            <Heart size={48} strokeWidth={1.5} />
          </div>
          <h2 className="history__empty-title">No sessions yet</h2>
          <p className="history__empty-text">
            Start monitoring your heart rate to see your history here.
            Each session will be saved automatically.
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="history__modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="history__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="history__modal-title">Clear History?</h3>
            <p className="history__modal-text">
              This will permanently delete all your session history. This action cannot be undone.
            </p>
            <div className="history__modal-actions">
              <button
                className="history__modal-btn history__modal-btn--cancel"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="history__modal-btn history__modal-btn--confirm"
                onClick={handleClearHistory}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default History
