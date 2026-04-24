import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Mock supabase-js client that SessionContext imports via ../lib/supabase
const insertMock = vi.fn(() => Promise.resolve({ error: null }))
const deleteChain = {
  delete: vi.fn(() => deleteChain),
  eq: vi.fn(() => Promise.resolve({ error: null })),
}
const fromMock = vi.fn(() => ({
  insert: insertMock,
  ...deleteChain,
}))

vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args) => fromMock(...args) },
}))

// Controllable auth mock
let currentUser = null
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}))

import { SessionProvider, useSession } from './SessionContext'

function wrapper({ children }) {
  return <SessionProvider>{children}</SessionProvider>
}

beforeEach(() => {
  localStorage.clear()
  insertMock.mockClear()
  fromMock.mockClear()
  deleteChain.delete.mockClear()
  deleteChain.eq.mockClear()
  currentUser = null
})

describe('SessionContext dual-write (signed in)', () => {
  it('addSession writes to localStorage AND Supabase with the right mapping', async () => {
    currentUser = { id: 'user-123' }
    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      result.current.addSession({
        avgBpm: 85,
        minBpm: 80,
        maxBpm: 92,
        duration: 20,
        bleAvgBpm: 88,
        bleMinBpm: 82,
        bleMaxBpm: 95,
      })
    })

    // localStorage updated
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].avgBpm).toBe(85)

    // Supabase insert called with correct payload
    expect(fromMock).toHaveBeenCalledWith('rppg_sessions')
    expect(insertMock).toHaveBeenCalledTimes(1)
    const payload = insertMock.mock.calls[0][0]
    expect(payload).toMatchObject({
      user_id: 'user-123',
      avg_bpm: 85,
      min_bpm: 80,
      max_bpm: 92,
      duration_s: 20,
      ble_avg_bpm: 88,
      ble_min_bpm: 82,
      ble_max_bpm: 95,
    })
    expect(typeof payload.recorded_at).toBe('string')
  })

  it('addMood writes to localStorage AND Supabase with the right mapping', async () => {
    currentUser = { id: 'user-123' }
    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      result.current.addMood({
        mood: 'good',
        note: 'feeling ok',
        bpm: 72,
      })
    })

    expect(result.current.moods).toHaveLength(1)
    expect(result.current.moods[0].mood).toBe('good')

    expect(fromMock).toHaveBeenCalledWith('rppg_moods')
    expect(insertMock).toHaveBeenCalledTimes(1)
    const payload = insertMock.mock.calls[0][0]
    expect(payload).toMatchObject({
      user_id: 'user-123',
      mood: 'good',
      note: 'feeling ok',
      bpm: 72,
    })
    expect(typeof payload.recorded_at).toBe('string')
  })

  it('addMood handles null note/bpm', async () => {
    currentUser = { id: 'user-123' }
    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      result.current.addMood({ mood: 'okay', note: null, bpm: null })
    })

    const payload = insertMock.mock.calls[0][0]
    expect(payload.note).toBeNull()
    expect(payload.bpm).toBeNull()
  })

  it('clearSessions + clearMoods mirror deletes to Supabase', async () => {
    currentUser = { id: 'user-123' }
    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      result.current.clearSessions()
      result.current.clearMoods()
    })

    expect(fromMock).toHaveBeenCalledWith('rppg_sessions')
    expect(fromMock).toHaveBeenCalledWith('rppg_moods')
    expect(deleteChain.delete).toHaveBeenCalledTimes(2)
    expect(deleteChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })
})

describe('SessionContext (signed out)', () => {
  it('addSession still writes to localStorage but skips Supabase', async () => {
    currentUser = null
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
    expect(insertMock).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('addMood still writes to localStorage but skips Supabase', async () => {
    currentUser = null
    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      result.current.addMood({ mood: 'great', note: null, bpm: null })
    })

    expect(result.current.moods).toHaveLength(1)
    expect(insertMock).not.toHaveBeenCalled()
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
