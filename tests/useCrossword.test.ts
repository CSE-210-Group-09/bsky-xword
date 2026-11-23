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

  it('reset clears the marks and the count', () => {
    const { result } = setup();
    typeAt(result, 0, 0, wrong(0, 0));
    act(() => result.current.checkPuzzle());
    act(() => result.current.reset());

    expect(result.current.incorrect.flat().some(Boolean)).toBe(false);
    expect(result.current.checkCount).toBe(0);
  });
});
