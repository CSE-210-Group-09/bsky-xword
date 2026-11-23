import { useEffect, useState } from 'react';
import type { CellPosition, Clue, Direction, Puzzle } from '../types';
import { emptyGrid, emptyMarks, findActiveClue, isBlack, isSolved, nextCell, prevCell } from '../lib/puzzles/grid';
import { REVEAL_PENALTY_SECONDS } from './useTimer';

interface Options {
  /** Ignore key presses, e.g. while the completion modal is open. */
  disabled: boolean;
  /** Called when the grid is solved; `assisted` is true for auto-fill. */
  onComplete: (assisted: boolean) => void;
  /** Called with the seconds to add when the player reveals a square. */
  onPenalty?: (seconds: number) => void;
}

/** Grid state, selection, direction, keyboard handling and completion detection. */
export function useCrossword(puzzle: Puzzle, { disabled, onComplete, onPenalty }: Options) {
  const size = puzzle.size;

  // Grid state: size x size array of strings (empty string for unfilled)
  const [grid, setGrid] = useState<string[][]>(() => emptyGrid(size));

  // Selected cell & direction
  const [selectedCell, setSelectedCell] = useState<CellPosition>({ row: 0, col: 0 });
  const [direction, setDirection] = useState<Direction>('across');

  // Revealed cells show their answer and can't be changed (ADR 0008: +10s each)
  const [revealed, setRevealed] = useState<boolean[][]>(() => emptyMarks(size));
  const [revealCount, setRevealCount] = useState(0);

  const [isCompleted, setIsCompleted] = useState(false);
  // Not read yet; reserved for marking assisted solves on the leaderboard.
  const [isAssisted, setIsAssisted] = useState(false);

  // Find active clue based on selected cell & direction
  const activeClue = findActiveClue(puzzle, selectedCell, direction);

  // Keyboard navigation & typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      const { row, col } = selectedCell;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        let c = col + 1;
        while (c < size && isBlack(puzzle, row, c)) c++;
        if (c < size) setSelectedCell({ row, col: c });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        let c = col - 1;
        while (c >= 0 && isBlack(puzzle, row, c)) c--;
        if (c >= 0) setSelectedCell({ row, col: c });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        let r = row + 1;
        while (r < size && isBlack(puzzle, r, col)) r++;
        if (r < size) setSelectedCell({ row: r, col });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        let r = row - 1;
        while (r >= 0 && isBlack(puzzle, r, col)) r--;
        if (r >= 0) setSelectedCell({ row: r, col });
      } else if (e.key === ' ' || e.key === 'Tab') {
        e.preventDefault();
        setDirection((prev) => (prev === 'across' ? 'down' : 'across'));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        const currentLetter = grid[row][col];
        if (revealed[row][col]) {
          setSelectedCell(prevCell(puzzle, selectedCell, direction));
        } else if (currentLetter !== '') {
          const newGrid = grid.map((rArr, rIdx) =>
            rArr.map((val, cIdx) => (rIdx === row && cIdx === col ? '' : val))
          );
          setGrid(newGrid);
        } else {
          const prev = prevCell(puzzle, selectedCell, direction);
          if (revealed[prev.row][prev.col]) {
            setSelectedCell(prev);
            return;
          }
          const newGrid = grid.map((rArr, rIdx) =>
            rArr.map((val, cIdx) => (rIdx === prev.row && cIdx === prev.col ? '' : val))
          );
          setGrid(newGrid);
          setSelectedCell(prev);
        }
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        if (revealed[row][col]) {
          setSelectedCell(nextCell(puzzle, selectedCell, direction));
          return;
        }
        const char = e.key.toUpperCase();
        const newGrid = grid.map((rArr, rIdx) =>
          rArr.map((val, cIdx) => (rIdx === row && cIdx === col ? char : val))
        );
        setGrid(newGrid);

        // Check if finished
        if (isSolved(puzzle, newGrid)) {
          setIsCompleted(true);
          onComplete(false);
        } else {
          setSelectedCell(nextCell(puzzle, selectedCell, direction));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [puzzle, selectedCell, direction, grid, revealed, size, disabled, onComplete]);

  // Cell click: select it, or toggle direction if already selected
  const selectCell = (r: number, c: number) => {
    if (isBlack(puzzle, r, c)) return;
    if (selectedCell.row === r && selectedCell.col === c) {
      setDirection((prev) => (prev === 'across' ? 'down' : 'across'));
    } else {
      setSelectedCell({ row: r, col: c });
    }
  };

  // Clue click: jump to the clue's first cell
  const selectClue = (clue: Clue, dir: Direction) => {
    setDirection(dir);
    setSelectedCell({ row: clue.row, col: clue.col });
  };

  // Reveal the selected cell's answer. A cell already revealed costs nothing.
  const revealCell = () => {
    const { row, col } = selectedCell;
    if (disabled || isCompleted || isBlack(puzzle, row, col) || revealed[row][col]) return;
    const newGrid = grid.map((rArr, rIdx) =>
      rArr.map((val, cIdx) => (rIdx === row && cIdx === col ? puzzle.solution[row][col] : val))
    );
    setGrid(newGrid);
    setRevealed(revealed.map((rArr, rIdx) => rArr.map((val, cIdx) => val || (rIdx === row && cIdx === col))));
    setRevealCount((prev) => prev + 1);
    onPenalty?.(REVEAL_PENALTY_SECONDS);
    if (isSolved(puzzle, newGrid)) {
      setIsCompleted(true);
      onComplete(false);
    }
  };

  // Quick Auto-Fill for testing
  const autoFill = () => {
    const solved = puzzle.solution.map((row) =>
      row.map((cell) => (cell === '#' ? '' : cell))
    );
    setGrid(solved);
    setIsAssisted(true);
    setIsCompleted(true);
    onComplete(true);
  };

  // Clear the grid for a reattempt
  const reset = () => {
    setGrid(emptyGrid(size));
    setRevealed(emptyMarks(size));
    setRevealCount(0);
    setIsCompleted(false);
    setIsAssisted(false);
    setSelectedCell({ row: 0, col: 0 });
    setDirection('across');
  };

  return {
    grid,
    revealed,
    revealCount,
    selectedCell,
    direction,
    activeClue,
    isCompleted,
    isAssisted,
    selectCell,
    selectClue,
    revealCell,
    autoFill,
    reset,
  };
}
