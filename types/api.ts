export interface HealthResponse {
  ok: true;
}

/** All API failures return this envelope with an appropriate HTTP status. */
export interface ApiError {
  error: { code: string; message: string };
}

/** One solver on the friends leaderboard (shape agreed in #30). */
export interface LeaderboardEntry {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  /** Time including penalties. */
  timeSeconds: number;
  /** Tied times share a rank: 1, 1, 3. */
  rank: number;
  isCurrentUser: boolean;
}

/** GET /api/leaderboard?did=&date= : solvers only, fastest first. */
export interface LeaderboardResponse {
  date: string;
  entries: LeaderboardEntry[];
}
