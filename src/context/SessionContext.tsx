import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Session = {
  id: number;
  timestamp: string;
  avgBpm: number;
  minBpm?: number;
  maxBpm?: number;
  duration: number;
  bleAvgBpm?: number;
  bleMinBpm?: number;
  bleMaxBpm?: number;
};

export type Mood = {
  id: number;
  timestamp: string;
  mood: string;
  note: string | null;
  bpm: number | null;
};

export type RecentStats = {
  avgBpm: number;
  minBpm: number;
  maxBpm: number;
  count: number;
};

type SessionContextValue = {
  ready: boolean;
  sessions: Session[];
  moods: Mood[];
  addSession: (s: Omit<Session, 'id' | 'timestamp'>) => Session;
  clearSessions: () => void;
  addMood: (m: Omit<Mood, 'id' | 'timestamp'>) => Mood;
  clearMoods: () => void;
  getRecentStats: () => RecentStats | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const SESSIONS_KEY = 'rppg-sessions';
const MOODS_KEY = 'rppg-moods';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(SESSIONS_KEY), AsyncStorage.getItem(MOODS_KEY)])
      .then(([s, m]) => {
        if (s) {
          try {
            setSessions(JSON.parse(s));
          } catch {}
        }
        if (m) {
          try {
            setMoods(JSON.parse(m));
          } catch {}
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)).catch(() => {});
  }, [sessions, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(MOODS_KEY, JSON.stringify(moods)).catch(() => {});
  }, [moods, ready]);

  const addSession = useCallback<SessionContextValue['addSession']>((data) => {
    const next: Session = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...data,
    };
    setSessions((prev) => [next, ...prev].slice(0, 100));
    return next;
  }, []);

  const clearSessions = useCallback(() => setSessions([]), []);

  const addMood = useCallback<SessionContextValue['addMood']>((data) => {
    const next: Mood = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...data,
    };
    setMoods((prev) => [next, ...prev].slice(0, 100));
    return next;
  }, []);

  const clearMoods = useCallback(() => setMoods([]), []);

  const getRecentStats = useCallback<SessionContextValue['getRecentStats']>(() => {
    const recent = sessions.slice(0, 10);
    if (recent.length === 0) return null;
    const avgBpm = recent.reduce((sum, s) => sum + s.avgBpm, 0) / recent.length;
    const minBpm = Math.min(...recent.map((s) => s.minBpm ?? s.avgBpm));
    const maxBpm = Math.max(...recent.map((s) => s.maxBpm ?? s.avgBpm));
    return { avgBpm, minBpm, maxBpm, count: recent.length };
  }, [sessions]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ready,
      sessions,
      moods,
      addSession,
      clearSessions,
      addMood,
      clearMoods,
      getRecentStats,
    }),
    [ready, sessions, moods, addSession, clearSessions, addMood, clearMoods, getRecentStats],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
