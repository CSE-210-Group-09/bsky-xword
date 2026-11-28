import type { LeaderboardEntry } from '../../types/api';

/** What the client knows about the friends leaderboard after asking the server. */
export type LeaderboardResult = { status: 'ready'; entries: LeaderboardEntry[] } | { status: 'error' };

type Fetcher = (url: string) => Promise<Response>;

function isEntry(value: unknown): value is LeaderboardEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Partial<LeaderboardEntry>;
  return (
    typeof e.did === 'string' &&
    typeof e.handle === 'string' &&
    typeof e.timeSeconds === 'number' &&
    typeof e.rank === 'number' &&
    typeof e.isCurrentUser === 'boolean'
  );
}

/**
 * Ask the server for the friends leaderboard of one player on one date (ADR 0009).
 * Any failed or malformed response is reported as an error the player can retry.
 */
export async function fetchLeaderboard(
  did: string,
  date: string,
  fetcher: Fetcher = (url) => fetch(url),
): Promise<LeaderboardResult> {
  try {
    const query = new URLSearchParams({ did, date });
    const response = await fetcher(`/api/leaderboard?${query}`);
    if (!response.ok) return { status: 'error' };
    const body = (await response.json()) as { entries?: unknown };
    if (!Array.isArray(body.entries) || !body.entries.every(isEntry)) return { status: 'error' };
    return { status: 'ready', entries: body.entries };
  } catch {
    return { status: 'error' };
  }
}
