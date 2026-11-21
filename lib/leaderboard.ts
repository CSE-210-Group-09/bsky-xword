import type { Friend, RankedFriend } from '../types';

export interface Leaderboard {
  /** Solvers sorted by time, fastest first. */
  ranked: RankedFriend[];
  /** Entries with no time yet. */
  unranked: Friend[];
}

/** Ranks entries purely by time; tied times share the earlier rank. */
export function rankLeaderboard(entries: Friend[]): Leaderboard {
  const completed = entries
    .filter((item): item is Friend & { timeSeconds: number } => item.timeSeconds !== null)
    .sort((a, b) => a.timeSeconds - b.timeSeconds);

  const unranked = entries.filter((item) => item.timeSeconds === null);

  const ranked: RankedFriend[] = [];
  completed.forEach((item, index) => {
    const prev = ranked[index - 1];
    const rank = prev && prev.timeSeconds === item.timeSeconds ? prev.rank : index + 1;
    ranked.push({ ...item, rank });
  });

  return { ranked, unranked };
}

/** The current user's rank, or null if they have not solved yet. */
export function getCurrentUserRank(ranked: RankedFriend[]): number | null {
  const match = ranked.find((e) => e.isCurrentUser);
  return match ? match.rank : null;
}
