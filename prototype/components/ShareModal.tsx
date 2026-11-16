"use client";

import { useState } from "react";
import { Puzzle, formatTime, shapeEmoji } from "@/lib/crossword";
import { ME } from "@/lib/data";
import Avatar from "./Avatar";

export default function ShareModal({ puzzle, seconds, onClose }: { puzzle: Puzzle; seconds?: number; onClose: () => void }) {
  const url = `https://skymini.app/puzzle/${puzzle.id}`;
  const initial =
    seconds != null
      ? `I solved "${puzzle.title}" in ${formatTime(seconds)} ⚡\n\n${shapeEmoji(puzzle)}\n\nCan you beat me? ${url}`
      : `Try this mini crossword: "${puzzle.title}" 🧩\n${url}`;
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Share to Bluesky">
        <div className="modal-head">
          <h2>Share to Bluesky</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="muted small">Spoiler-free: no answer letters. Nothing posts until you choose to.</p>
        <div className="compose">
          <Avatar handle={ME.handle} size={40} />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} maxLength={300} />
        </div>
        <div className="compose-foot">
          <span className={`small ${text.length > 280 ? "warn" : "muted"}`}>{300 - text.length} left</span>
          <div className="row">
            <button
              className="btn btn-ghost"
              onClick={() => {
                navigator.clipboard?.writeText(text).then(() => setCopied(true), () => {});
              }}
            >
              {copied ? "Copied!" : "Copy text"}
            </button>
            <a
              className="btn btn-primary"
              href={`https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
            >
              🦋 Open in Bluesky
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
