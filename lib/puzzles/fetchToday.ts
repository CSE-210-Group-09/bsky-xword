import type { Puzzle } from '../../types';

/** What the client knows about today's puzzle after asking the server (ADR 0007). */
export type TodayPuzzle =
  | { status: 'ready'; puzzle: Puzzle }
  | { status: 'missing' }
  | { status: 'error' };

type Fetcher = (url: string) => Promise<Response>;

/** True when a value has the shape the solver needs from GET /api/puzzle/today. */
function isPuzzle(value: unknown): value is Puzzle {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Partial<Puzzle>;
  return (
    typeof p.date === 'string' &&
    typeof p.size === 'number' &&
    Array.isArray(p.solution) && p.solution.length === p.size &&
    Array.isArray(p.numbers) &&
    typeof p.clues === 'object' && p.clues !== null &&
    Array.isArray(p.clues.across) && Array.isArray(p.clues.down)
  );
}

/**
 * Ask the server for today's puzzle. A 404 means no puzzle has been published for
 * today; anything else that fails (a server error, a network failure, or a body that
 * is not a puzzle) is reported as an error the player can retry.
 */
export async function fetchTodayPuzzle(fetcher: Fetcher = (url) => fetch(url)): Promise<TodayPuzzle> {
  try {
    const response = await fetcher('/api/puzzle/today');
    if (response.status === 404) return { status: 'missing' };
    if (!response.ok) return { status: 'error' };
    const body: unknown = await response.json();
    return isPuzzle(body) ? { status: 'ready', puzzle: body } : { status: 'error' };
  } catch {
    return { status: 'error' };
  }
}
