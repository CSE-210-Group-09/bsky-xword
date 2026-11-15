// Spoiler-free sharing: the text never contains answer letters, only the grid shape
// and the time. Opening the compose intent never posts on its own; the player decides.

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function shapeGrid(puzzle, assisted) {
  const fill = assisted ? '⬜' : '🟨';
  const rows = [];
  for (let r = 0; r < puzzle.height; r++) {
    let row = '';
    for (let c = 0; c < puzzle.width; c++) row += puzzle.cells[r * puzzle.width + c] === null ? '⬛' : fill;
    rows.push(row);
  }
  return rows.join('\n');
}

export function shareText({ puzzle, result, url }) {
  const time = formatDuration(result.durationMs);
  const line = result.assisted ? `🏳️ Gave up at ${time}` : `✅ Solved in ${time}`;
  return [`bsky-xword · ${puzzle.title}`, line, shapeGrid(puzzle, result.assisted), url].filter(Boolean).join('\n');
}

export function composeUrl(text) {
  return 'https://bsky.app/intent/compose?text=' + encodeURIComponent(text);
}
