"use client";

import { useMemo, useState } from "react";
import { buildPuzzle } from "@/lib/crossword";

const SIZE = 5;

/** Placeholder for the future constructor: edits a local grid, can't publish yet. */
export default function Create() {
  const [grid, setGrid] = useState<string[][]>(() => Array.from({ length: SIZE }, () => Array(SIZE).fill(" ")));
  const [blockMode, setBlockMode] = useState(false);
  const [symmetric, setSymmetric] = useState(true);
  const [cursor, setCursor] = useState({ r: 0, c: 0 });
  const [title, setTitle] = useState("");
  const [clues, setClues] = useState<Record<string, string>>({});

  // Treat empty squares as "." so numbering works before letters are filled in.
  const puzzle = useMemo(
    () =>
      buildPuzzle({
        id: "draft", title, author: "", date: "", difficulty: "Easy", likes: 0, tags: [],
        grid: grid.map((row) => row.map((ch) => (ch === "#" ? "#" : ch === " " ? "." : ch)).join("")),
        clues: {},
      }),
    [grid, title]
  );

  const setCell = (r: number, c: number, v: string) =>
    setGrid((g) => {
      const n = g.map((row) => [...row]);
      n[r][c] = v;
      if (symmetric && (v === "#" || g[r][c] === "#")) {
        const mirror = v === "#" ? "#" : " ";
        n[SIZE - 1 - r][SIZE - 1 - c] = mirror;
      }
      return n;
    });

  const onKey = (e: React.KeyboardEvent) => {
    const { r, c } = cursor;
    if (/^[a-zA-Z]$/.test(e.key)) {
      setCell(r, c, e.key.toUpperCase());
      setCursor({ r, c: Math.min(SIZE - 1, c + 1) });
    } else if (e.key === "." ) setCell(r, c, grid[r][c] === "#" ? " " : "#");
    else if (e.key === "Backspace") setCell(r, c, " ");
    else if (e.key === "ArrowRight") setCursor({ r, c: Math.min(SIZE - 1, c + 1) });
    else if (e.key === "ArrowLeft") setCursor({ r, c: Math.max(0, c - 1) });
    else if (e.key === "ArrowDown") setCursor({ r: Math.min(SIZE - 1, r + 1), c });
    else if (e.key === "ArrowUp") setCursor({ r: Math.max(0, r - 1), c });
    else return;
    e.preventDefault();
  };

  const filled = grid.flat().every((ch) => ch !== " ");
  const clueRow = (id: string, answer: string) => (
    <li key={id} className="ce-clue">
      <b>{id}</b>
      <code>{answer.replace(/\./g, "_")}</code>
      <input
        placeholder="Write a clue…"
        value={clues[id] ?? ""}
        onChange={(e) => setClues((c) => ({ ...c, [id]: e.target.value }))}
      />
    </li>
  );

  return (
    <div>
      <div className="coming-soon">
        <span>🚧</span>
        <div>
          <b>Coming in a future release:</b> build your own 5×5 mini and publish it to your Bluesky repo.
          This preview lets you try the editor, but publishing is turned off.
        </div>
      </div>
      <div className="section-head">
        <h1>Create a mini</h1>
      </div>
      <div className="two-col create">
        <section className="card">
          <input className="title-input" placeholder="Untitled mini" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="row wrap">
            <label className="toggle"><input type="checkbox" checked={blockMode} onChange={(e) => setBlockMode(e.target.checked)} /> Click toggles black squares</label>
            <label className="toggle"><input type="checkbox" checked={symmetric} onChange={(e) => setSymmetric(e.target.checked)} /> Rotational symmetry</label>
          </div>
          <div className="grid-wrap" tabIndex={0} onKeyDown={onKey}>
            <div className="grid editor" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gridTemplateRows: `repeat(${SIZE}, 1fr)` }}>
              {grid.flatMap((row, r) =>
                row.map((ch, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={`cell ${ch === "#" ? "cell-block" : ""} ${cursor.r === r && cursor.c === c ? "cell-cursor" : ""}`}
                    onClick={() => {
                      setCursor({ r, c });
                      if (blockMode) setCell(r, c, ch === "#" ? " " : "#");
                    }}
                  >
                    {ch !== "#" && puzzle.numbers[r][c] && <span className="num">{puzzle.numbers[r][c]}</span>}
                    {ch !== "#" && <span className="letter">{ch.trim()}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
          <p className="muted small">Click the grid, then type letters. Press <kbd>.</kbd> to toggle a black square and use the arrow keys to move.</p>
        </section>
        <section className="card">
          <h3>Across</h3>
          <ol className="ce-list">{puzzle.across.map((cl) => clueRow(cl.id, cl.answer))}</ol>
          <h3>Down</h3>
          <ol className="ce-list">{puzzle.down.map((cl) => clueRow(cl.id, cl.answer))}</ol>
          <div className="row publish-row">
            <button className="btn btn-ghost" disabled>Test solve</button>
            <button className="btn btn-primary" disabled title="Coming soon">
              🦋 Publish to Bluesky {filled ? "" : "(fill the grid first)"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
