import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCrossword } from '../hooks/useCrossword';
import { REVEAL_PENALTY_SECONDS } from '../hooks/useTimer';
import { EASY_PUZZLE } from '../lib/puzzles/puzzleData';

const answer = (row: number, col: number) => EASY_PUZZLE.solution[row][col];
const whiteCells = EASY_PUZZLE.solution.flatMap((line, row) =>
  line.flatMap((letter, col) => (letter === '#' ? [] : [{ row, col }])),
);

afterEach(cleanup);

function setup() {
  const onComplete = vi.fn();
  const onPenalty = vi.fn();
  const hook = renderHook(() => useCrossword(EASY_PUZZLE, { disabled: false, onComplete, onPenalty }));
  return { ...hook, onComplete, onPenalty };
}

const press = (key: string) => act(() => { fireEvent.keyDown(window, { key }); });

describe('reveal square (#27)', () => {
  it('fills the selected cell with its answer, marks it revealed, and charges the penalty', () => {
    const { result, onPenalty } = setup();
    act(() => result.current.selectCell(0, 1));
    act(() => result.current.revealCell());

    expect(result.current.grid[0][1]).toBe(answer(0, 1));
    expect(result.current.revealed[0][1]).toBe(true);
    expect(result.current.revealCount).toBe(1);
    expect(onPenalty).toHaveBeenCalledWith(REVEAL_PENALTY_SECONDS);
  });

  it('charges nothing for a cell that is already revealed', () => {
    const { result, onPenalty } = setup();
    act(() => result.current.revealCell());
    act(() => result.current.revealCell());

    expect(result.current.revealCount).toBe(1);
    expect(onPenalty).toHaveBeenCalledTimes(1);
  });

  it('still counts a reveal of a cell the player already got right', () => {
    const { result, onPenalty } = setup();
    press(answer(0, 0));
    act(() => result.current.selectCell(0, 0));
    act(() => result.current.revealCell());

    expect(result.current.revealed[0][0]).toBe(true);
    expect(onPenalty).toHaveBeenCalledTimes(1);
  });

  it('locks a revealed cell against typing and deleting', () => {
    const { result } = setup();
    act(() => result.current.revealCell());
    const wrong = answer(0, 0) === 'X' ? 'Y' : 'X';

    act(() => result.current.selectCell(0, 1)); // move away and back, in case selection moved
    act(() => result.current.selectCell(0, 0));
    press(wrong);
    expect(result.current.grid[0][0]).toBe(answer(0, 0));

    act(() => result.current.selectCell(0, 1));
    act(() => result.current.selectCell(0, 0));
    press('Backspace');
    expect(result.current.grid[0][0]).toBe(answer(0, 0));
  });

  it('completes the puzzle when it reveals the last missing letter', () => {
    const { result, onComplete } = setup();
    const [last, ...rest] = [...whiteCells].reverse();
    for (const { row, col } of rest) {
      act(() => result.current.selectCell(row, col));
      press(answer(row, col));
    }
    expect(onComplete).not.toHaveBeenCalled();

    act(() => result.current.selectCell(last.row, last.col));
    act(() => result.current.revealCell());

    expect(result.current.isCompleted).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does nothing once the puzzle is complete', () => {
    const { result, onPenalty } = setup();
    for (const { row, col } of whiteCells) {
      act(() => result.current.selectCell(row, col));
      press(answer(row, col));
    }
    act(() => result.current.revealCell());

    expect(result.current.revealCount).toBe(0);
    expect(onPenalty).not.toHaveBeenCalled();
  });
});
