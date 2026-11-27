import { describe, expect, it } from 'vitest';
import { getCurrentUserRank, rankLeaderboard } from '../lib/leaderboard';
import type { Friend } from '../types';

const friend = (handle: string, timeSeconds: number | null, isCurrentUser = false): Friend => ({
  did: `did:plc:${handle}`,
  handle,
  timeSeconds,
  isCurrentUser,
});

describe('rankLeaderboard', () => {
  it('leaves out people who have not solved', () => {
    const ranked = rankLeaderboard([friend('a', 40), friend('b', null), friend('me', 50, true)]);

    expect(ranked.map((e) => e.handle)).toEqual(['a', 'me']);
  });

  it('sorts by time and gives ties the same rank', () => {
    const ranked = rankLeaderboard([friend('c', 90), friend('a', 30), friend('b', 30)]);

    expect(ranked.map((e) => [e.handle, e.rank])).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 3],
    ]);
  });
});

describe('getCurrentUserRank', () => {
  it('returns your rank, or null before you solve', () => {
    expect(getCurrentUserRank(rankLeaderboard([friend('a', 30), friend('me', 45, true)]))).toBe(2);
    expect(getCurrentUserRank(rankLeaderboard([friend('a', 30), friend('me', null, true)]))).toBeNull();
  });
});
