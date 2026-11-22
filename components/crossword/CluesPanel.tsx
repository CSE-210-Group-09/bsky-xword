import type { Clue, Direction, Puzzle } from '../../types';

interface CluesPanelProps {
  clues: Puzzle['clues'];
  direction: Direction;
  activeClue: Clue | undefined;
  onClueClick: (clue: Clue, dir: Direction) => void;
}

const SECTIONS: { dir: Direction; title: string }[] = [
  { dir: 'across', title: 'Across' },
  { dir: 'down', title: 'Down' },
];

export function CluesPanel({ clues, direction, activeClue, onClueClick }: CluesPanelProps) {
  return (
    <>
      {SECTIONS.map(({ dir, title }) => (
        <div className="clue-section" key={dir}>
          <h3>{title}</h3>
          <ul className="clue-list">
            {clues[dir].map((clue) => {
              const isActive = direction === dir && activeClue?.number === clue.number;
              return (
                <li
                  key={`${dir}-${clue.number}`}
                  className={`clue-item ${isActive ? 'active' : ''}`}
                  onClick={() => onClueClick(clue, dir)}
                >
                  <span className="clue-number">{clue.number}.</span>
                  <span>{clue.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}
