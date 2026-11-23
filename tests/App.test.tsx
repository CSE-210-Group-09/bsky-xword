import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { CURRENT_USER, INITIAL_FRIENDS } from '../lib/atproto/mockFriends';
import { getCurrentUserRank, rankLeaderboard } from '../lib/leaderboard';
import { EASY_PUZZLE } from '../lib/puzzles/puzzleData';
import { REVEAL_PENALTY_SECONDS } from '../hooks/useTimer';

const whiteCells = EASY_PUZZLE.solution.flatMap((line, row) =>
  line.flatMap((letter, col) => (letter === '#' ? [] : [{ row, col }])),
);
const cellAt = (container: HTMLElement, row: number, col: number) =>
  container.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`) as HTMLElement;

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('finishing the puzzle with a reveal (#27)', () => {
  it('counts the final reveal penalty in the timer, the frozen score and the rank', () => {
    const { container } = render(<App />);
    const [last, ...rest] = [...whiteCells].reverse();
    for (const { row, col } of rest) {
      fireEvent.click(cellAt(container, row, col));
      fireEvent.keyDown(window, { key: EASY_PUZZLE.solution[row][col] });
    }
    fireEvent.click(cellAt(container, last.row, last.col));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal square' }));

    // The clock never ticked, so the whole time is the reveal penalty.
    const total = REVEAL_PENALTY_SECONDS;
    const shown = `0:${String(total).padStart(2, '0')}`;
    expect(container.querySelector('.timer-box')?.textContent).toContain(shown);
    expect(container.querySelector('.stat-value')?.textContent).toContain(shown);

    act(() => { fireEvent.click(screen.getByRole('button', { name: /View.*Leaderboard/i })); });
    const notice = container.querySelector('.leaderboard-notice') as HTMLElement;
    const expectedRank = getCurrentUserRank(
      rankLeaderboard([...INITIAL_FRIENDS, { ...CURRENT_USER, timeSeconds: total }]).ranked,
    );
    expect(notice.textContent).toContain(`first completion of ${shown}`);
    expect(notice.textContent).toContain(`#${expectedRank}`);
  });
});

describe('saved progress (#29)', () => {
  const key = `bsky-xword:progress:${EASY_PUZZLE.date}`;
  const marks = () => EASY_PUZZLE.solution.map((line) => line.map(() => false));
  const progress = (overrides: Record<string, unknown>) => ({
    version: 1,
    date: EASY_PUZZLE.date,
    grid: EASY_PUZZLE.solution.map((line) => line.map(() => '')),
    revealed: marks(),
    incorrect: marks(),
    elapsedSeconds: 0,
    penaltySeconds: 0,
    revealCount: 0,
    checkCount: 0,
    completed: false,
    finalSeconds: null,
    ...overrides,
  });

  beforeEach(() => localStorage.clear());

  it('saves letters as they are typed', () => {
    const { container } = render(<App />);
    fireEvent.click(cellAt(container, 0, 0));
    fireEvent.keyDown(window, { key: 'q' });

    expect(JSON.parse(localStorage.getItem(key)!).grid[0][0]).toBe('Q');
  });

  it('picks up a solve in progress where it left off', () => {
    const grid = EASY_PUZZLE.solution.map((line) => line.map(() => ''));
    grid[1][0] = EASY_PUZZLE.solution[1][0];
    grid[0][0] = EASY_PUZZLE.solution[0][0];
    const revealed = marks();
    revealed[0][0] = true;
    localStorage.setItem(key, JSON.stringify(progress({
      grid, revealed, elapsedSeconds: 65, penaltySeconds: 10, revealCount: 1,
    })));
    const { container } = render(<App />);

    expect(cellAt(container, 1, 0).textContent).toContain(EASY_PUZZLE.solution[1][0]);
    expect(cellAt(container, 0, 0).className).toContain('revealed');
    expect(container.querySelector('.timer-box')?.textContent).toContain('1:15');
  });

  it('shows a finished puzzle as finished: time frozen, leaderboard available', () => {
    const grid = EASY_PUZZLE.solution.map((line) => line.map((l) => (l === '#' ? '' : l)));
    localStorage.setItem(key, JSON.stringify(progress({
      grid, elapsedSeconds: 80, penaltySeconds: 30, checkCount: 1, completed: true, finalSeconds: 110,
    })));
    const { container } = render(<App />);
    act(() => { vi.advanceTimersByTime(3000); });

    expect(container.querySelector('.timer-box')?.textContent).toContain('1:50');
    fireEvent.click(screen.getByRole('button', { name: /Friends Leaderboard/ }));
    expect(container.querySelector('.leaderboard-notice')?.textContent).toContain('first completion of 1:50');
  });

  it('clears progress saved for an earlier puzzle', () => {
    localStorage.setItem('bsky-xword:progress:2026-11-01', JSON.stringify(progress({ date: '2026-11-01' })));
    render(<App />);

    expect(localStorage.getItem('bsky-xword:progress:2026-11-01')).toBeNull();
  });
});
