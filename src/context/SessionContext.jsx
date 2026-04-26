import { createContext, useContext, useState, useEffect } from 'react'

const SessionContext = createContext()

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('rppg-sessions')
    return saved ? JSON.parse(saved) : []
  })

  const [moods, setMoods] = useState(() => {
    const saved = localStorage.getItem('rppg-moods')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('rppg-sessions', JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    localStorage.setItem('rppg-moods', JSON.stringify(moods))
  }, [moods])

  const addSession = (session) => {
    const newSession = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...session,
    }
    setSessions((prev) => [newSession, ...prev].slice(0, 100))
    return newSession
  }

  const clearSessions = () => {
    setSessions([])
  }

  const addMood = (mood) => {
    const newMood = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...mood,
    }
    setMoods((prev) => [newMood, ...prev].slice(0, 100))
    return newMood
  }

  const clearMoods = () => {
    setMoods([])
  }

  const getRecentStats = () => {
    const recent = sessions.slice(0, 10)
    if (recent.length === 0) return null
    const avgBpm = recent.reduce((sum, s) => sum + s.avgBpm, 0) / recent.length
    const minBpm = Math.min(...recent.map((s) => s.minBpm || s.avgBpm))
    const maxBpm = Math.max(...recent.map((s) => s.maxBpm || s.avgBpm))
    return { avgBpm, minBpm, maxBpm, count: recent.length }
  }

  return (
    <SessionContext.Provider
      value={{
        sessions,
        addSession,
        clearSessions,
        moods,
        addMood,
        clearMoods,
        getRecentStats,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}
