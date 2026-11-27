import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../src/App';
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
    const { container } = render(<Game puzzle={EASY_PUZZLE} />);
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
