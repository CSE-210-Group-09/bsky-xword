interface CellProps {
  letter: string;
  number: number | null;
  black: boolean;
  selected: boolean;
  /** In the active word (ignored when selected). */
  highlighted: boolean;
  onClick: () => void;
}

export function Cell({ letter, number, black, selected, highlighted, onClick }: CellProps) {
  return (
    <div
      className={`cell ${black ? 'black' : ''} ${
        selected ? 'selected' : highlighted ? 'highlighted' : ''
      }`}
      onClick={onClick}
    >
      {!black && number && <span className="cell-number">{number}</span>}
      {!black && <span className="cell-letter">{letter}</span>}
    </div>
  );
}
