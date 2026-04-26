import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { SessionProvider, useSession } from './SessionContext'

function wrapper({ children }) {
  return <SessionProvider>{children}</SessionProvider>
}

beforeEach(() => {
  localStorage.clear()
})

describe('SessionContext', () => {
  it('addSession writes to localStorage', async () => {
    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      result.current.addSession({
        avgBpm: 70,
        minBpm: 65,
        maxBpm: 75,
        duration: 10,
      })
    })

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].avgBpm).toBe(70)
  })

  it('addMood writes to localStorage', async () => {
    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      result.current.addMood({ mood: 'great', note: null, bpm: null })
    })

    expect(result.current.moods).toHaveLength(1)
    expect(result.current.moods[0].mood).toBe('great')
  })

  it('clearSessions and clearMoods empty state', async () => {
    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      result.current.addSession({ avgBpm: 70, minBpm: 65, maxBpm: 75, duration: 10 })
      result.current.addMood({ mood: 'good', note: null, bpm: null })
    })

    await act(async () => {
      result.current.clearSessions()
      result.current.clearMoods()
    })

    expect(result.current.sessions).toHaveLength(0)
    expect(result.current.moods).toHaveLength(0)
  })
})

describe('SessionContext hydration', () => {
  it('hydrates sessions and moods from localStorage on mount', () => {
    localStorage.setItem(
      'rppg-sessions',
      JSON.stringify([{ id: 1, avgBpm: 70, minBpm: 65, maxBpm: 75, duration: 10, timestamp: '2026-04-22T00:00:00Z' }])
    )
    localStorage.setItem(
      'rppg-moods',
      JSON.stringify([{ id: 1, mood: 'good', note: null, bpm: null, timestamp: '2026-04-22T00:00:00Z' }])
    )

    const { result } = renderHook(() => useSession(), { wrapper })
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.moods).toHaveLength(1)
  })
})
