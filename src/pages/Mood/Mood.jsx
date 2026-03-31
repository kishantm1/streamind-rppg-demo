import { useState } from 'react'
import { Heart, Trash2, Smile, MessageSquare } from 'lucide-react'
import { useSession } from '../../context/SessionContext'
import './Mood.css'

const MOOD_OPTIONS = [
  { emoji: '\u{1F60A}', label: 'Great', value: 'great' },
  { emoji: '\u{1F642}', label: 'Good', value: 'good' },
  { emoji: '\u{1F610}', label: 'Okay', value: 'okay' },
  { emoji: '\u{1F614}', label: 'Low', value: 'low' },
  { emoji: '\u{1F622}', label: 'Sad', value: 'sad' }
]

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
 * Get the emoji for a mood value
 * @param {string} value - Mood value
 * @returns {string} Emoji character
 */
function getMoodEmoji(value) {
  const mood = MOOD_OPTIONS.find(m => m.value === value)
  return mood ? mood.emoji : '\u{1F610}'
}

/**
 * Get the label for a mood value
 * @param {string} value - Mood value
 * @returns {string} Mood label
 */
function getMoodLabel(value) {
  const mood = MOOD_OPTIONS.find(m => m.value === value)
  return mood ? mood.label : 'Unknown'
}

function Mood() {
  const { moods, addMood, clearMoods, sessions } = useSession()
  const [selectedMood, setSelectedMood] = useState(null)
  const [note, setNote] = useState('')
  const [linkBpm, setLinkBpm] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Get the most recent session's BPM
  const lastSession = sessions.length > 0 ? sessions[0] : null
  const lastBpm = lastSession ? Math.round(lastSession.avgBpm) : null

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!selectedMood) return

    addMood({
      mood: selectedMood,
      note: note.trim() || null,
      bpm: linkBpm && lastBpm ? lastBpm : null
    })

    // Reset form
    setSelectedMood(null)
    setNote('')
    setLinkBpm(false)

    // Show success message
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  const handleClearMoods = () => {
    clearMoods()
    setShowConfirm(false)
  }

  return (
    <div className="mood">
      <header className="mood__header">
        <h1 className="mood__title">
          <Smile size={24} strokeWidth={2} />
          Mood Tracker
        </h1>
        {moods.length > 0 && (
          <button
            className="mood__clear-btn"
            onClick={() => setShowConfirm(true)}
            aria-label="Clear all moods"
          >
            <Trash2 size={18} strokeWidth={2} />
            Clear
          </button>
        )}
      </header>

      {/* Mood Entry Form */}
      <form className="mood__form" onSubmit={handleSubmit}>
        <div className="mood__form-card">
          <h2 className="mood__form-title">How are you feeling?</h2>
          <p className="mood__form-subtitle">Take a moment to check in with yourself</p>

          {/* Mood Selector */}
          <div className="mood__selector" role="radiogroup" aria-label="Select your mood">
            {MOOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`mood__option ${selectedMood === option.value ? 'mood__option--selected' : ''}`}
                onClick={() => setSelectedMood(option.value)}
                aria-checked={selectedMood === option.value}
                role="radio"
              >
                <span className="mood__option-emoji" aria-hidden="true">
                  {option.emoji}
                </span>
                <span className="mood__option-label">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Note Textarea */}
          <div className="mood__note-wrapper">
            <label htmlFor="mood-note" className="mood__note-label">
              <MessageSquare size={16} strokeWidth={2} />
              Add a note (optional)
            </label>
            <textarea
              id="mood-note"
              className="mood__note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              maxLength={500}
            />
            <span className="mood__note-count">{note.length}/500</span>
          </div>

          {/* Link BPM Option */}
          {lastBpm && (
            <label className="mood__bpm-link">
              <input
                type="checkbox"
                checked={linkBpm}
                onChange={(e) => setLinkBpm(e.target.checked)}
                className="mood__bpm-checkbox"
              />
              <span className="mood__bpm-checkmark"></span>
              <Heart size={16} strokeWidth={2} className="mood__bpm-icon" />
              <span className="mood__bpm-text">
                Link with last heart rate reading ({lastBpm} BPM)
              </span>
            </label>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="mood__submit-btn"
            disabled={!selectedMood}
          >
            Save Mood Entry
          </button>
        </div>
      </form>

      {/* Success Message */}
      {showSuccess && (
        <div className="mood__success" role="status" aria-live="polite">
          Mood entry saved!
        </div>
      )}

      {/* Recent Moods */}
      {moods.length > 0 ? (
        <section className="mood__recent">
          <h2 className="mood__recent-title">Recent Entries</h2>
          <div className="mood__list">
            {moods.map((entry) => (
              <article key={entry.id} className="mood-entry">
                <div className="mood-entry__emoji" aria-label={getMoodLabel(entry.mood)}>
                  {getMoodEmoji(entry.mood)}
                </div>
                <div className="mood-entry__content">
                  <div className="mood-entry__header">
                    <span className="mood-entry__label">{getMoodLabel(entry.mood)}</span>
                    <span className="mood-entry__time">{formatTimestamp(entry.timestamp)}</span>
                  </div>
                  {entry.note && (
                    <p className="mood-entry__note">{entry.note}</p>
                  )}
                  {entry.bpm && (
                    <div className="mood-entry__bpm">
                      <Heart size={14} strokeWidth={2} />
                      <span>{entry.bpm} BPM</span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className="mood__empty">
          <div className="mood__empty-icon">
            <Smile size={48} strokeWidth={1.5} />
          </div>
          <h2 className="mood__empty-title">No mood entries yet</h2>
          <p className="mood__empty-text">
            Start tracking how you feel to discover patterns in your emotional well-being.
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="mood__modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="mood__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="mood__modal-title">Clear All Moods?</h3>
            <p className="mood__modal-text">
              This will permanently delete all your mood entries. This action cannot be undone.
            </p>
            <div className="mood__modal-actions">
              <button
                className="mood__modal-btn mood__modal-btn--cancel"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="mood__modal-btn mood__modal-btn--confirm"
                onClick={handleClearMoods}
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

export default Mood
