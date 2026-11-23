import type { Clue, Direction } from '../../types';

interface CurrentClueBarProps {
  activeClue: Clue | undefined;
  direction: Direction;
}

export function CurrentClueBar({ activeClue, direction }: CurrentClueBarProps) {
  return (
    <div className="current-clue-bar">
      {activeClue ? (
        <span>
          <strong>{activeClue.number} {direction.toUpperCase()}:</strong> {activeClue.text}
        </span>
      ) : (
        <span>Select a square to begin solving!</span>
      )}
    </div>
  );
}
