import data from '../../puzzles/2026-11-18.json';
import { parsePuzzle } from './parse';

/** Static prototype fixture. The daily API will choose the file by Pacific date. */
export const EASY_PUZZLE = parsePuzzle(data, '2026-11-18');
