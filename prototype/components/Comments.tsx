"use client";

import { useState } from "react";
import { formatTime } from "@/lib/crossword";
import { COMMENTS, RESULTS, getUser } from "@/lib/data";
import { useAppState } from "./AppState";
import Avatar from "./Avatar";

export default function Comments({ puzzleId, unlocked }: { puzzleId: string; unlocked: boolean }) {
  const { comments: mine, addComment, results } = useAppState();
  const [draft, setDraft] = useState("");
  const [hearts, setHearts] = useState<string[]>([]);
  const list = [...COMMENTS.filter((c) => c.puzzleId === puzzleId), ...mine.filter((c) => c.puzzleId === puzzleId)];

  const solveTime = (handle: string) =>
    (RESULTS.find((r) => r.handle === handle && r.puzzleId === puzzleId) ?? results[puzzleId])?.seconds;

  return (
    <section className="card comments">
      <h2>💬 Comments <span className="muted">({list.length})</span></h2>
      {!unlocked ? (
        <div className="locked">
          <span className="lock-emoji">🔒</span>
          <p>Finish the puzzle to read and join the conversation, so nobody gets spoiled.</p>
        </div>
      ) : (
        <>
          <form
            className="comment-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) addComment(puzzleId, draft.trim());
              setDraft("");
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Say something nice about this puzzle…" />
            <button className="btn btn-primary" disabled={!draft.trim()}>Post</button>
          </form>
          <ul className="comment-list">
            {list.length === 0 && <li className="muted">No comments yet. Be the first!</li>}
            {list.map((c) => {
              const u = getUser(c.handle)!;
              const t = solveTime(c.handle);
              const hearted = hearts.includes(c.id);
              return (
                <li key={c.id} className="comment">
                  <Avatar handle={c.handle} size={34} />
                  <div>
                    <div className="comment-head">
                      <strong>{u.displayName}</strong>
                      <span className="muted small">@{u.handle} · {c.postedAt}</span>
                      {t != null && <span className="chip chip-done">⏱ {formatTime(t)}</span>}
                    </div>
                    <p>{c.text}</p>
                    <button
                      className="tiny-btn"
                      onClick={() => setHearts((h) => (hearted ? h.filter((x) => x !== c.id) : [...h, c.id]))}
                    >
                      {hearted ? "💜" : "🤍"} {c.likes + (hearted ? 1 : 0)}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
