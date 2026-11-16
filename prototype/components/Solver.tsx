"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cell, Clue, Dir, Puzzle, formatTime } from "@/lib/crossword";
import { ME } from "@/lib/data";
import { useAppState } from "./AppState";
import Leaderboard, { myRank } from "./Leaderboard";
import ShareModal from "./ShareModal";

type Status = "ready" | "playing" | "paused" | "done";
const key = (p: Cell) => `${p.r},${p.c}`;
const KEYS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export default function Solver({ puzzle }: { puzzle: Puzzle }) {
  const { results, recordResult, publishResult } = useAppState();
  const solvedBefore = results[puzzle.id];
  const { size, grid } = puzzle;
  const empty = () => grid.map((row) => row.split("").map(() => ""));

  const [status, setStatus] = useState<Status>("ready");
  const [entries, setEntries] = useState<string[][]>(empty);
  const [cursor, setCursor] = useState<Cell>(() => puzzle.across[0].cells[0]);
  const [dir, setDir] = useState<Dir>("across");
  const [elapsed, setElapsed] = useState(0);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [assisted, setAssisted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [finalSeconds, setFinalSeconds] = useState<number | null>(null);
  const [replay, setReplay] = useState(false);
  const startedAt = useRef<number>(0);
  const banked = useRef(0);

  const clues = useMemo(() => [...puzzle.across, ...puzzle.down], [puzzle]);
  const clueAt = useCallback(
    (p: Cell, d: Dir) => (d === "across" ? puzzle.across : puzzle.down).find((cl) => cl.cells.some((x) => x.r === p.r && x.c === p.c)),
    [puzzle]
  );
  const active = clueAt(cursor, dir) ?? clueAt(cursor, dir === "across" ? "down" : "across")!;
  const activeCells = new Set(active.cells.map(key));

  // ---- timer -------------------------------------------------------------
  useEffect(() => {
    if (status !== "playing") return;
    startedAt.current = Date.now();
    const id = setInterval(() => setElapsed(banked.current + (Date.now() - startedAt.current) / 1000), 250);
    return () => {
      clearInterval(id);
      banked.current += (Date.now() - startedAt.current) / 1000;
    };
  }, [status]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  // ---- completion --------------------------------------------------------
  useEffect(() => {
    if (status !== "playing") return;
    const filled = grid.every((row, r) => row.split("").every((ch, c) => ch === "#" || entries[r][c]));
    if (!filled) return;
    const correct = grid.every((row, r) => row.split("").every((ch, c) => ch === "#" || entries[r][c] === ch.toUpperCase()));
    if (!correct) {
      flash("Not quite! Something's off. 🤔");
      return;
    }
    const seconds = Math.max(1, Math.round(banked.current + (Date.now() - startedAt.current) / 1000));
    setFinalSeconds(seconds);
    setStatus("done");
    setShowDone(true);
    recordResult({ handle: ME.handle, puzzleId: puzzle.id, seconds, assisted, completedAt: new Date().toISOString() });
  }, [entries, status, grid, assisted, puzzle.id, recordResult]);

  // ---- movement ----------------------------------------------------------
  const move = useCallback(
    (from: Cell, dr: number, dc: number): Cell => {
      let { r, c } = from;
      for (let i = 0; i < size * size; i++) {
        r += dr;
        c += dc;
        if (r < 0 || c < 0 || r >= size || c >= size) return from;
        if (grid[r][c] !== "#") return { r, c };
      }
      return from;
    },
    [grid, size]
  );

  const jumpClue = useCallback(
    (delta: number) => {
      const i = clues.findIndex((cl) => cl.id === active.id);
      const next = clues[(i + delta + clues.length) % clues.length];
      const firstEmpty = next.cells.find((p) => !entries[p.r][p.c]) ?? next.cells[0];
      setDir(next.dir);
      setCursor(firstEmpty);
    },
    [clues, active.id, entries]
  );

  const type = useCallback(
    (letter: string) => {
      if (status !== "playing" || revealed.has(key(cursor))) {
        if (status === "playing") setCursor((p) => (dir === "across" ? move(p, 0, 1) : move(p, 1, 0)));
        return;
      }
      setEntries((e) => {
        const n = e.map((row) => [...row]);
        n[cursor.r][cursor.c] = letter;
        return n;
      });
      setWrong((w) => {
        const n = new Set(w);
        n.delete(key(cursor));
        return n;
      });
      // advance within the word; jump to the next clue at its end
      const idx = active.cells.findIndex((p) => p.r === cursor.r && p.c === cursor.c);
      if (idx < active.cells.length - 1) setCursor(active.cells[idx + 1]);
      else jumpClue(1);
    },
    [status, revealed, cursor, dir, move, active, jumpClue]
  );

  const backspace = useCallback(() => {
    if (status !== "playing") return;
    const here = entries[cursor.r][cursor.c];
    const target = here || revealed.has(key(cursor)) ? cursor : dir === "across" ? move(cursor, 0, -1) : move(cursor, -1, 0);
    if (revealed.has(key(target))) {
      setCursor(target);
      return;
    }
    setEntries((e) => {
      const n = e.map((row) => [...row]);
      n[target.r][target.c] = "";
      return n;
    });
    setCursor(target);
  }, [status, entries, cursor, dir, move, revealed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (status !== "playing" || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      const k = e.key;
      if (/^[a-zA-Z]$/.test(k)) type(k.toUpperCase());
      else if (k === "Backspace") backspace();
      else if (k === "Tab" || k === "Enter") jumpClue(e.shiftKey ? -1 : 1);
      else if (k === " ") setDir((d) => (d === "across" ? "down" : "across"));
      else if (k.startsWith("Arrow")) {
        const horiz = k === "ArrowLeft" || k === "ArrowRight";
        const d: Dir = horiz ? "across" : "down";
        if (d !== dir && clueAt(cursor, d)) setDir(d);
        else setCursor((p) => move(p, k === "ArrowDown" ? 1 : k === "ArrowUp" ? -1 : 0, k === "ArrowRight" ? 1 : k === "ArrowLeft" ? -1 : 0));
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, type, backspace, jumpClue, dir, cursor, move, clueAt]);

  const clickCell = (p: Cell) => {
    if (status !== "playing") return;
    if (p.r === cursor.r && p.c === cursor.c) {
      const other: Dir = dir === "across" ? "down" : "across";
      if (clueAt(p, other)) setDir(other);
    } else {
      setCursor(p);
      if (!clueAt(p, dir)) setDir(dir === "across" ? "down" : "across");
    }
  };

  // ---- helpers (check / reveal) -----------------------------------------
  const check = (cells: Cell[]) => {
    setAssisted(true);
    const bad = cells.filter((p) => entries[p.r][p.c] && entries[p.r][p.c] !== grid[p.r][p.c].toUpperCase());
    setWrong((w) => new Set([...w, ...bad.map(key)]));
    flash(bad.length ? `${bad.length} square${bad.length > 1 ? "s" : ""} to fix` : "Looking good! ✨");
  };
  const reveal = (cells: Cell[]) => {
    setAssisted(true);
    setEntries((e) => {
      const n = e.map((row) => [...row]);
      cells.forEach((p) => (n[p.r][p.c] = grid[p.r][p.c].toUpperCase()));
      return n;
    });
    setRevealed((s) => new Set([...s, ...cells.map(key)]));
    setWrong((w) => new Set([...w].filter((k) => !cells.some((p) => key(p) === k))));
  };
  const allCells = clues.filter((c) => c.dir === "across").flatMap((c) => c.cells);

  const restart = () => {
    setEntries(empty());
    setWrong(new Set());
    setRevealed(new Set());
    setAssisted(false);
    setElapsed(0);
    banked.current = 0;
    setCursor(puzzle.across[0].cells[0]);
    setDir("across");
    setReplay(true);
    setStatus("playing");
  };

  const myResult = results[puzzle.id];
  const recordUri = results[puzzle.id]?.recordUri;
  const rankInfo = myResult ? myRank(puzzle.id, myResult) : null;
  const shownTime = status === "done" && finalSeconds != null ? finalSeconds : elapsed;

  // ---- render ------------------------------------------------------------
  const clueItem = (cl: Clue) => (
    <li
      key={cl.id}
      className={`clue ${cl.id === active.id ? "clue-active" : ""} ${
        cl.cells.some((p) => p.r === cursor.r && p.c === cursor.c) && cl.id !== active.id ? "clue-cross" : ""
      } ${cl.cells.every((p) => entries[p.r][p.c]) ? "clue-filled" : ""}`}
      onClick={() => {
        if (status !== "playing") return;
        setDir(cl.dir);
        setCursor(cl.cells.find((p) => !entries[p.r][p.c]) ?? cl.cells[0]);
      }}
    >
      <b>{cl.num}</b> {cl.text}
    </li>
  );

  return (
    <div className="solver">
      <div className="solver-bar">
        <div className={`timer ${status === "done" ? "timer-done" : ""}`}>
          ⏱ <span>{formatTime(shownTime)}</span>
        </div>
        {status === "playing" && (
          <button className="btn btn-ghost btn-sm" onClick={() => setStatus("paused")}>⏸ Pause</button>
        )}
        <div className="helpers">
          <Menu label="✔ Check" disabled={status !== "playing"} items={[
            ["Square", () => check([cursor])], ["Word", () => check(active.cells)], ["Puzzle", () => check(allCells)],
          ]} />
          <Menu label="👁 Reveal" disabled={status !== "playing"} items={[
            ["Square", () => reveal([cursor])], ["Word", () => reveal(active.cells)], ["Puzzle", () => reveal(allCells)],
          ]} />
        </div>
      </div>
      {assisted && status !== "done" && <p className="assist-note">🛟 Helpers used. This solve will be listed separately from unassisted times.</p>}

      <div className="solver-main">
        <div className="grid-col">
          <div className="clue-banner" onClick={() => status === "playing" && setDir(dir === "across" ? "down" : "across")}>
            <span className="cb-num">{active.num}{active.dir === "across" ? "A" : "D"}</span>
            <span>{active.text}</span>
          </div>
          <div className="grid-wrap">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}>
              {grid.flatMap((row, r) =>
                row.split("").map((ch, c) => {
                  if (ch === "#") return <div key={`${r}-${c}`} className="cell cell-block" />;
                  const k = `${r},${c}`;
                  const cls = [
                    "cell",
                    cursor.r === r && cursor.c === c && status === "playing" ? "cell-cursor" : "",
                    activeCells.has(k) && status === "playing" ? "cell-word" : "",
                    wrong.has(k) ? "cell-wrong" : "",
                    revealed.has(k) ? "cell-revealed" : "",
                    status === "done" ? "cell-done" : "",
                  ].join(" ");
                  return (
                    <div key={k} className={cls} onClick={() => clickCell({ r, c })} style={{ animationDelay: `${(r + c) * 60}ms` }}>
                      {puzzle.numbers[r][c] && <span className="num">{puzzle.numbers[r][c]}</span>}
                      <span className="letter">{entries[r][c]}</span>
                    </div>
                  );
                })
              )}
            </div>
            {(status === "ready" || status === "paused") && (
              <div className="grid-overlay">
                {status === "ready" ? (
                  <>
                    <div className="overlay-emoji">🧩</div>
                    <h2>{solvedBefore ? "Play again?" : "Ready?"}</h2>
                    <p className="muted">
                      {solvedBefore
                        ? `Your first solve (${formatTime(solvedBefore.seconds)}) stays on the leaderboard. Replays don't count.`
                        : "The clock starts when you press play."}
                    </p>
                    <button className="btn btn-primary btn-lg" onClick={() => { setReplay(!!solvedBefore); setStatus("playing"); }}>▶ Start solving</button>
                    {solvedBefore && (
                      <button className="btn btn-ghost" onClick={() => setShowDone(true)}>See results</button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="overlay-emoji">☕</div>
                    <h2>Paused</h2>
                    <button className="btn btn-primary btn-lg" onClick={() => setStatus("playing")}>▶ Resume</button>
                  </>
                )}
              </div>
            )}
            {toast && <div className="toast">{toast}</div>}
          </div>
          {status === "playing" && (
            <div className="keyboard">
              {KEYS.map((row, i) => (
                <div key={row} className="kb-row">
                  {row.split("").map((l) => (
                    <button key={l} onClick={() => type(l)}>{l}</button>
                  ))}
                  {i === 2 && <button className="kb-wide" onClick={backspace} aria-label="Backspace">⌫</button>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="clue-lists">
          <div>
            <h3>Across</h3>
            <ol>{puzzle.across.map(clueItem)}</ol>
          </div>
          <div>
            <h3>Down</h3>
            <ol>{puzzle.down.map(clueItem)}</ol>
          </div>
        </div>
      </div>

      {status === "done" && (
        <div className="done-actions">
          <button className="btn btn-primary" onClick={() => setShowDone(true)}>🏆 See results</button>
          <button className="btn btn-ghost" onClick={restart}>↺ Replay (won&apos;t count)</button>
        </div>
      )}

      {showDone && myResult && (
        <div className="modal-backdrop" onClick={() => setShowDone(false)}>
          <div className="modal done-modal" onClick={(e) => e.stopPropagation()}>
            {status === "done" && <Confetti />}
            <button className="icon-btn modal-x" onClick={() => setShowDone(false)} aria-label="Close">✕</button>
            <div className="done-hero">
              <div className="done-emoji">{myResult.assisted ? "🛟" : rankInfo?.rank === 1 ? "👑" : "🎉"}</div>
              <h2>{status === "done" ? (replay ? "Replay complete!" : "Solved!") : "Your result"}</h2>
              <div className="big-time">{formatTime(replay && finalSeconds != null ? finalSeconds : myResult.seconds)}</div>
              <p className="done-sub">
                {replay && status === "done"
                  ? `Just for fun: your first solve (${formatTime(myResult.seconds)}) is what friends see.`
                  : myResult.assisted
                  ? "Solved with a little help. Listed with the assisted solves."
                  : rankInfo
                  ? rankInfo.rank === 1
                    ? `Fastest of ${rankInfo.of} among people you follow!`
                    : `#${rankInfo.rank} of ${rankInfo.of} among people you follow`
                  : ""}
              </p>
            </div>
            <div className="publish">
              {recordUri ? (
                <p className="small">
                  ✅ Published to your Bluesky repo
                  <code>{recordUri}</code>
                </p>
              ) : (
                <>
                  <p className="small">Publish this result so people who follow you can see it. It will be public.</p>
                  <button className="btn btn-secondary" onClick={() => publishResult(puzzle.id)}>🦋 Publish result</button>
                </>
              )}
            </div>
            <h3 className="lb-title">Friends leaderboard</h3>
            <Leaderboard puzzleId={puzzle.id} mine={myResult} compact />
            <div className="done-foot">
              <button className="btn btn-primary" onClick={() => setSharing(true)}>Share to Bluesky</button>
              <button className="btn btn-ghost" onClick={() => setShowDone(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {sharing && <ShareModal puzzle={puzzle} seconds={myResult?.seconds} onClose={() => setSharing(false)} />}
    </div>
  );
}

function Menu({ label, items, disabled }: { label: string; items: [string, () => void][]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="menu" onMouseLeave={() => setOpen(false)}>
      <button className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => setOpen((o) => !o)}>{label} ▾</button>
      {open && (
        <div className="menu-pop">
          {items.map(([l, fn]) => (
            <button key={l} onClick={() => { fn(); setOpen(false); }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Confetti() {
  const colors = ["#6366f1", "#f97316", "#facc15", "#22c55e", "#ec4899", "#0ea5e9"];
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 60 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 12) * 0.06}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
            transform: `rotate(${i * 29}deg)`,
          }}
        />
      ))}
    </div>
  );
}
