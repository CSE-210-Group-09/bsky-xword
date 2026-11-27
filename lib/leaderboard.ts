import type { Friend, RankedFriend } from '../types';

/**
 * Ranks solvers by time; tied times share the earlier rank (1, 1, 3).
 * People who haven't solved are left out (ADR 0009).
 * The server does the real ranking (#42), this is just for the mock data until #43.
 */
export function rankLeaderboard(entries: Friend[]): RankedFriend[] {
  const solved = entries
    .filter((item): item is Friend & { timeSeconds: number } => item.timeSeconds !== null)
    .sort((a, b) => a.timeSeconds - b.timeSeconds);

  const ranked: RankedFriend[] = [];
  solved.forEach((item, index) => {
    const prev = ranked[index - 1];
    const rank = prev && prev.timeSeconds === item.timeSeconds ? prev.rank : index + 1;
    ranked.push({ ...item, rank });
  });

  return ranked;
}

/** The current user's rank, or null if they have not solved yet. */
export function getCurrentUserRank(ranked: RankedFriend[]): number | null {
  const match = ranked.find((e) => e.isCurrentUser);
  return match ? match.rank : null;
}
