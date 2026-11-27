import { useCallback, useEffect, useState } from 'react';
import type { Puzzle } from '../types';
import { fetchTodayPuzzle, type TodayPuzzle } from '../lib/puzzles/fetchToday';

type Fetcher = Parameters<typeof fetchTodayPuzzle>[0];

export interface TodayPuzzleState {
  status: 'loading' | TodayPuzzle['status'];
  /** Set once status is 'ready'. */
  puzzle?: Puzzle;
  /** Fetch again, for the Retry button after an error. */
  retry: () => void;
}

/** Load today's puzzle once on mount; retry() fetches it again after an error. */
export function useTodayPuzzle(fetcher?: Fetcher): TodayPuzzleState {
  const [state, setState] = useState<TodayPuzzle | { status: 'loading' }>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchTodayPuzzle(fetcher).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => { cancelled = true; };
    // The fetcher is fixed for the life of the app, so only a retry refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return {
    status: state.status,
    puzzle: state.status === 'ready' ? state.puzzle : undefined,
    retry,
  };
}
