import { Puzzle } from "@/lib/crossword";

/** A tiny, answer-free silhouette of the grid. */
export default function GridThumb({ puzzle, size = 72 }: { puzzle: Puzzle; size?: number }) {
  return (
    <div className="thumb" style={{ width: size, height: size }} aria-hidden>
      {puzzle.grid.join("").split("").map((ch, i) => (
        <i key={i} className={ch === "#" ? "blk" : ""} />
      ))}
    </div>
  );
}
