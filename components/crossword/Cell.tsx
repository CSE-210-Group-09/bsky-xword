interface CellProps {
  row: number;
  col: number;
  letter: string;
  number: number | null;
  black: boolean;
  selected: boolean;
  /** In the active word (ignored when selected). */
  highlighted: boolean;
  /** Filled by Reveal square; shown with a corner mark. */
  revealed: boolean;
  /** Marked wrong by Check puzzle; shown with a red slash. */
  incorrect: boolean;
  onClick: () => void;
}

export function Cell({ row, col, letter, number, black, selected, highlighted, revealed, incorrect, onClick }: CellProps) {
  return (
    <div
      className={`cell ${black ? 'black' : ''} ${
        selected ? 'selected' : highlighted ? 'highlighted' : ''
      } ${revealed ? 'revealed' : ''} ${incorrect ? 'incorrect' : ''}`}
      data-row={row}
      data-col={col}
      onClick={onClick}
    >
      {!black && number && <span className="cell-number">{number}</span>}
      {!black && <span className="cell-letter">{letter}</span>}
    </div>
  );
}
