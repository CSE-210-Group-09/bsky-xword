import type { CellPosition, Clue, Direction, Puzzle } from '../../types';
import { isBlack, isCellInClue } from '../../lib/puzzles/grid';
import { Cell } from './Cell';

interface GridProps {
  puzzle: Puzzle;
  grid: string[][];
  revealed: boolean[][];
  selectedCell: CellPosition;
  direction: Direction;
  activeClue: Clue | undefined;
  onCellClick: (r: number, c: number) => void;
}

export function Grid({ puzzle, grid, revealed, selectedCell, direction, activeClue, onCellClick }: GridProps) {
  return (
    <div className="grid">
      {grid.map((rowArr, r) =>
        rowArr.map((letter, c) => (
          <Cell
            key={`${r}-${c}`}
            row={r}
            col={c}
            letter={letter}
            number={puzzle.numbers[r][c]}
            black={isBlack(puzzle, r, c)}
            selected={selectedCell.row === r && selectedCell.col === c}
            highlighted={activeClue ? isCellInClue(activeClue, direction, r, c) : false}
            revealed={revealed[r][c]}
            onClick={() => onCellClick(r, c)}
          />
        ))
      )}
    </div>
  );
}
