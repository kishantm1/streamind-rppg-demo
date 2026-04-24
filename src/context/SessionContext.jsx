import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SessionContext = createContext()

export function SessionProvider({ children }) {
  const { user } = useAuth()

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

    if (user) {
      supabase
        .from('rppg_sessions')
        .insert({
          user_id: user.id,
          recorded_at: newSession.timestamp,
          avg_bpm: newSession.avgBpm,
          min_bpm: newSession.minBpm,
          max_bpm: newSession.maxBpm,
          duration_s: newSession.duration,
          ble_avg_bpm: newSession.bleAvgBpm ?? null,
          ble_min_bpm: newSession.bleMinBpm ?? null,
          ble_max_bpm: newSession.bleMaxBpm ?? null,
        })
        .then(({ error }) => {
          if (error) console.error('Supabase session insert failed:', error)
        })
    }

    return newSession
  }

  const clearSessions = () => {
    setSessions([])
    if (user) {
      supabase
        .from('rppg_sessions')
        .delete()
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Supabase session clear failed:', error)
        })
    }
  }

  const addMood = (mood) => {
    const newMood = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...mood,
    }
    setMoods((prev) => [newMood, ...prev].slice(0, 100))

    if (user) {
      supabase
        .from('rppg_moods')
        .insert({
          user_id: user.id,
          recorded_at: newMood.timestamp,
          mood: newMood.mood,
          note: newMood.note ?? null,
          bpm: newMood.bpm ?? null,
        })
        .then(({ error }) => {
          if (error) console.error('Supabase mood insert failed:', error)
        })
    }

    return newMood
  }

  const clearMoods = () => {
    setMoods([])
    if (user) {
      supabase
        .from('rppg_moods')
        .delete()
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Supabase mood clear failed:', error)
        })
    }
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
