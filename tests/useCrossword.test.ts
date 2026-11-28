import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCrossword } from '../hooks/useCrossword';
import { CHECK_PENALTY_SECONDS, REVEAL_PENALTY_SECONDS } from '../hooks/useTimer';
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

describe('check puzzle (#28)', () => {
  const wrong = (row: number, col: number) => (answer(row, col) === 'X' ? 'Y' : 'X');
  const typeAt = (result: ReturnType<typeof setup>['result'], row: number, col: number, letter: string) => {
    act(() => result.current.selectCell(row, col));
    press(letter);
  };

  it('marks only the wrong letters, counts the check, and charges the penalty', () => {
    const { result, onPenalty } = setup();
    typeAt(result, 0, 0, wrong(0, 0));
    typeAt(result, 0, 1, answer(0, 1));
    act(() => result.current.checkPuzzle());

    expect(result.current.incorrect[0][0]).toBe(true);
    expect(result.current.incorrect[0][1]).toBe(false);
    expect(result.current.checkCount).toBe(1);
    expect(onPenalty).toHaveBeenCalledWith(CHECK_PENALTY_SECONDS);
  });

  it('does not mark empty cells', () => {
    const { result } = setup();
    act(() => result.current.checkPuzzle());

    expect(result.current.incorrect.flat().some(Boolean)).toBe(false);
  });

  it('charges every check, even one that finds nothing', () => {
    const { result, onPenalty } = setup();
    act(() => result.current.checkPuzzle());
    act(() => result.current.checkPuzzle());

    expect(result.current.checkCount).toBe(2);
    expect(onPenalty).toHaveBeenCalledTimes(2);
  });

  it('clears a mark when the letter is typed over or deleted', () => {
    const { result } = setup();
    typeAt(result, 0, 0, wrong(0, 0));
    typeAt(result, 0, 1, wrong(0, 1));
    act(() => result.current.checkPuzzle());

    typeAt(result, 0, 0, answer(0, 0));
    expect(result.current.incorrect[0][0]).toBe(false);

    act(() => result.current.selectCell(0, 1));
    press('Backspace');
    expect(result.current.incorrect[0][1]).toBe(false);
  });

  it('clears a mark when the cell is revealed', () => {
    const { result } = setup();
    typeAt(result, 0, 0, wrong(0, 0));
    act(() => result.current.checkPuzzle());
    act(() => result.current.selectCell(0, 1));
    act(() => result.current.selectCell(0, 0));
    act(() => result.current.revealCell());

    expect(result.current.incorrect[0][0]).toBe(false);
  });

  it('does nothing once the puzzle is complete', () => {
    const { result, onPenalty } = setup();
    for (const { row, col } of whiteCells) typeAt(result, row, col, answer(row, col));
    act(() => result.current.checkPuzzle());

    expect(result.current.checkCount).toBe(0);
    expect(onPenalty).not.toHaveBeenCalled();
  });

});

describe('restoring saved progress (#29)', () => {
  const marks = () => EASY_PUZZLE.solution.map((line) => line.map(() => false));
  const restored = (completed: boolean) => {
    const grid = EASY_PUZZLE.solution.map((line) => line.map((l) => (l === '#' ? '' : completed ? l : '')));
    if (!completed) grid[0][0] = answer(0, 0) === 'X' ? 'Y' : 'X';
    const revealed = marks();
    revealed[0][1] = true;
    grid[0][1] = answer(0, 1);
    const incorrect = marks();
    incorrect[0][0] = !completed;
    return { grid, revealed, incorrect, revealCount: 1, checkCount: 1, completed };
  };

  it('starts from the saved grid, marks and counts', () => {
    const initial = restored(false);
    const { result } = renderHook(() =>
      useCrossword(EASY_PUZZLE, { disabled: false, onComplete: vi.fn(), initial }));

    expect(result.current.grid).toEqual(initial.grid);
    expect(result.current.revealed).toEqual(initial.revealed);
    expect(result.current.incorrect).toEqual(initial.incorrect);
    expect(result.current.revealCount).toBe(1);
    expect(result.current.checkCount).toBe(1);
    expect(result.current.isCompleted).toBe(false);
  });

  it('restores a finished puzzle as finished, without calling onComplete again', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useCrossword(EASY_PUZZLE, { disabled: false, onComplete, initial: restored(true) }));

    expect(result.current.isCompleted).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('a finished grid is locked (ADR 0008: one attempt)', () => {
  it('ignores typing and deleting after completion', () => {
    const { result } = setup();
    for (const { row, col } of whiteCells) {
      act(() => result.current.selectCell(row, col));
      press(answer(row, col));
    }
    expect(result.current.isCompleted).toBe(true);

    act(() => result.current.selectCell(0, 1));
    act(() => result.current.selectCell(0, 0));
    press(answer(0, 0) === 'X' ? 'Y' : 'X');
    press('Backspace');
    expect(result.current.grid[0][0]).toBe(answer(0, 0));
  });
});
