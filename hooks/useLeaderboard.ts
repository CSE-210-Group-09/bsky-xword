import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../types/api';
import { fetchLeaderboard } from '../lib/atproto/leaderboardClient';

type Fetcher = Parameters<typeof fetchLeaderboard>[2];

interface Options {
  did?: string;
  date: string;
  /** Friend times stay hidden until the player finishes (ADR 0009), so fetch only then. */
  enabled: boolean;
  fetcher?: Fetcher;
}

export interface LeaderboardState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  entries: LeaderboardEntry[];
  /** The player's rank among the people they follow, or null if they are not listed. */
  rank: number | null;
  /** Fetch again: the Retry button, and opening the leaderboard tab. */
  refresh: () => void;
}

/** The friends leaderboard for the signed-in player, fetched once they have finished. */
export function useLeaderboard({ did, date, enabled, fetcher }: Options): LeaderboardState {
  const [status, setStatus] = useState<LeaderboardState['status']>('idle');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !did) return;
    let cancelled = false;
    setStatus('loading');
    fetchLeaderboard(did, date, fetcher).then((result) => {
      if (cancelled) return;
      if (result.status === 'ready') setEntries(result.entries);
      setStatus(result.status);
    });
    return () => { cancelled = true; };
    // The fetcher is fixed for the life of the app; refetch on retry, sign-in or a new date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, did, date, attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  const rank = entries.find((e) => e.isCurrentUser)?.rank ?? null;

  return { status: enabled && did ? status : 'idle', entries, rank, refresh };
}
