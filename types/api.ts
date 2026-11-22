import type { Puzzle } from './index.js';

export interface HealthResponse {
  ok: true;
}

/** All API failures return this envelope with an appropriate HTTP status. */
export interface ApiError {
  error: { code: string; message: string };
}

/** GET /api/puzzle/today. Includes the solution: answers are checked client-side (ADR 0006). */
export type PuzzleResponse = Puzzle;
