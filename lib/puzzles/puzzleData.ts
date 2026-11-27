import data from '../../puzzles/2026-11-18.json';
import { parsePuzzle } from './parse';

/** Fixture for tests. The app itself loads today's puzzle from /api/puzzle/today (#35). */
export const EASY_PUZZLE = parsePuzzle(data, '2026-11-18');
