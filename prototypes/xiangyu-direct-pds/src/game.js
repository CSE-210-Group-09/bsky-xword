// Grid UI + game rules for the MVP agreed on Nov 13:
//  - timer starts on "Start", pauses when the tab is hidden (grid hidden while paused)
//  - no per-letter checking; the board is checked once every square is filled
//  - "Give up" reveals the answers and counts as an assisted result
//  - no hints / reveal-a-square in the baseline
import { buildEntries } from './puzzle.js';
import { formatDuration } from './share.js';

export class Game {
  constructor(puzzle, els, { onFinish } = {}) {
    this.puzzle = puzzle;
    this.els = els;
    this.onFinish = onFinish;
    this.W = puzzle.width;
    this.H = puzzle.height;
    const { numbers, entries } = buildEntries(puzzle);
    this.numbers = numbers;
    this.entries = entries;
    this.reset(false);
    this.buildDom();
    this.bindEvents();
    this.render();
    setInterval(() => this.renderTimer(), 250);
  }

  reset(practice) {
    this.fill = this.puzzle.cells.map((c) => (c === null ? null : ''));
    this.sel = this.puzzle.cells.findIndex((c) => c !== null);
    this.dir = 'across';
    this.state = 'ready'; // ready | playing | paused | solved | gaveup
    this.practice = practice;
    this.elapsed = 0;
    this.runningSince = null;
    this.wrongNotice = false;
    this.revealed = new Set();
    clearTimeout(this.giveUpArmed);
    this.giveUpArmed = null;
  }

  // ---- clock -------------------------------------------------------------
  now() {
    return this.elapsed + (this.runningSince === null ? 0 : performance.now() - this.runningSince);
  }

  start() {
    if (this.state !== 'ready' && this.state !== 'paused') return;
    this.state = 'playing';
    this.runningSince = performance.now();
    this.render();
    this.focusInput();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.elapsed = this.now();
    this.runningSince = null;
    this.state = 'paused';
    this.render();
  }

  // ---- navigation ----------------------------------------------------------
  other(dir) { return dir === 'across' ? 'down' : 'across'; }

  entryFor(idx, dir) {
    return this.entries.find((e) => e.dir === dir && e.cells.includes(idx)) || null;
  }

  currentEntry() {
    return this.entryFor(this.sel, this.dir) || this.entryFor(this.sel, this.other(this.dir));
  }

  get playing() { return this.state === 'playing'; }
  get finished() { return this.state === 'solved' || this.state === 'gaveup'; }

  select(idx, dir = this.dir) {
    if (this.puzzle.cells[idx] === null) return;
    this.sel = idx;
    this.dir = this.entryFor(idx, dir) ? dir : this.other(dir);
    this.render();
  }

  clickCell(idx) {
    if (!this.playing) return;
    let dir = this.dir;
    if (idx === this.sel && this.entryFor(idx, this.other(dir))) dir = this.other(dir);
    this.select(idx, dir);
    this.focusInput();
  }

  nextEntry(step, preferEmpty) {
    const list = this.entries;
    let i = list.indexOf(this.currentEntry());
    for (let k = 0; k < list.length; k++) {
      i = (i + step + list.length) % list.length;
      const entry = list[i];
      const empty = entry.cells.find((c) => this.fill[c] === '');
      if (!preferEmpty || empty !== undefined || k === list.length - 1) {
        this.dir = entry.dir;
        this.sel = empty ?? entry.cells[0];
        return;
      }
    }
  }

  move(dr, dc) {
    const wantDir = dc !== 0 ? 'across' : 'down';
    if (this.dir !== wantDir && this.entryFor(this.sel, wantDir)) {
      this.dir = wantDir;
      return this.render();
    }
    let r = Math.floor(this.sel / this.W);
    let c = this.sel % this.W;
    for (;;) {
      r += dr;
      c += dc;
      if (r < 0 || r >= this.H || c < 0 || c >= this.W) return this.render();
      const i = r * this.W + c;
      if (this.puzzle.cells[i] !== null) return this.select(i, this.dir);
    }
  }

  // ---- editing -------------------------------------------------------------
  type(letter) {
    if (!this.playing) return;
    this.fill[this.sel] = letter;
    const entry = this.currentEntry();
    const pos = entry.cells.indexOf(this.sel);
    const laterEmpty = entry.cells.slice(pos + 1).find((i) => this.fill[i] === '');
    const anyEmpty = entry.cells.find((i) => this.fill[i] === '');
    if (laterEmpty !== undefined) this.sel = laterEmpty;
    else if (anyEmpty !== undefined) this.sel = anyEmpty;
    else if (this.fill.some((f) => f === '')) this.nextEntry(1, true);
    else if (pos + 1 < entry.cells.length) this.sel = entry.cells[pos + 1];
    this.afterEdit();
  }

  backspace() {
    if (!this.playing) return;
    if (this.fill[this.sel] !== '') {
      this.fill[this.sel] = '';
    } else {
      const entry = this.currentEntry();
      const pos = entry.cells.indexOf(this.sel);
      if (pos > 0) {
        this.sel = entry.cells[pos - 1];
        this.fill[this.sel] = '';
      }
    }
    this.afterEdit();
  }

  afterEdit() {
    this.wrongNotice = false;
    const filled = this.fill.every((f) => f === null || f !== '');
    if (filled) {
      const correct = this.fill.every((f, i) => f === this.puzzle.cells[i]);
      if (correct) return this.finish(false);
      this.wrongNotice = true;
    }
    this.render();
  }

  giveUp() {
    if (this.state !== 'playing' && this.state !== 'paused') return;
    if (!this.giveUpArmed) {
      // Two-step confirm in the page instead of a blocking confirm() dialog.
      this.giveUpArmed = setTimeout(() => { this.giveUpArmed = null; this.render(); }, 4000);
      return this.render();
    }
    clearTimeout(this.giveUpArmed);
    this.giveUpArmed = null;
    this.finish(true);
  }

  finish(assisted) {
    this.elapsed = this.now();
    this.runningSince = null;
    if (assisted) {
      this.revealed = new Set(this.fill.flatMap((f, i) => (f !== null && f !== this.puzzle.cells[i] ? [i] : [])));
      this.fill = this.puzzle.cells.slice();
    }
    this.state = assisted ? 'gaveup' : 'solved';
    this.render();
    this.onFinish?.({
      durationMs: Math.round(this.elapsed),
      assisted,
      completedAt: new Date().toISOString(),
      practice: this.practice,
    });
  }

  /** Show an already-recorded first completion (e.g. after a reload). */
  showRecorded(result) {
    this.reset(false);
    this.fill = this.puzzle.cells.slice();
    this.elapsed = result.durationMs;
    this.state = result.assisted ? 'gaveup' : 'solved';
    this.render();
  }

  practiceReplay() {
    this.reset(true);
    this.render();
  }

  // ---- DOM -----------------------------------------------------------------
  focusInput() {
    this.els.kbd.focus({ preventScroll: true });
  }

  buildDom() {
    const { board } = this.els;
    board.style.setProperty('--cols', this.W);
    board.replaceChildren();
    this.cellEls = this.puzzle.cells.map((cell, i) => {
      const div = document.createElement('div');
      div.className = cell === null ? 'cell block' : 'cell';
      div.setAttribute('role', 'gridcell');
      if (cell !== null) {
        if (this.numbers[i]) {
          const num = document.createElement('span');
          num.className = 'num';
          num.textContent = this.numbers[i];
          div.append(num);
        }
        const letter = document.createElement('span');
        letter.className = 'letter';
        div.append(letter);
        div.addEventListener('pointerdown', (e) => { e.preventDefault(); this.clickCell(i); });
      }
      board.append(div);
      return div;
    });

    for (const dir of ['across', 'down']) {
      const ol = dir === 'across' ? this.els.cluesAcross : this.els.cluesDown;
      ol.replaceChildren();
      for (const entry of this.entries.filter((e) => e.dir === dir)) {
        const li = document.createElement('li');
        const b = document.createElement('b');
        b.textContent = entry.number;
        li.append(b, ' ', entry.clue);
        li.addEventListener('click', () => {
          if (!this.playing) return;
          this.dir = dir;
          this.sel = entry.cells.find((c) => this.fill[c] === '') ?? entry.cells[0];
          this.render();
          this.focusInput();
        });
        ol.append(li);
        entry.li = li;
      }
    }
  }

  bindEvents() {
    const { kbd, overlayBtn, giveUp, pause, replay } = this.els;
    document.addEventListener('keydown', (e) => this.onKey(e));
    // Mobile virtual keyboards, IMEs and paste skip usable keydown events; read the hidden
    // input instead and type every letter in order.
    kbd.addEventListener('input', () => {
      const letters = kbd.value.replace(/[^a-z]/gi, '');
      kbd.value = '';
      for (const ch of letters) this.type(ch.toUpperCase());
    });
    overlayBtn.addEventListener('click', () => this.start());
    pause.addEventListener('click', () => this.pause());
    giveUp.addEventListener('click', () => this.giveUp());
    replay.addEventListener('click', () => this.practiceReplay());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
  }

  onKey(e) {
    if (!this.playing || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    const inGrid = t === this.els.kbd || t === document.body || this.els.board.contains(t);
    if (!inGrid) return;
    const k = e.key;
    if (/^[a-zA-Z]$/.test(k)) { e.preventDefault(); this.type(k.toUpperCase()); }
    else if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); this.backspace(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); this.move(0, -1); }
    else if (k === 'ArrowRight') { e.preventDefault(); this.move(0, 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); this.move(-1, 0); }
    else if (k === 'ArrowDown') { e.preventDefault(); this.move(1, 0); }
    else if (k === 'Tab' || k === 'Enter') { e.preventDefault(); this.nextEntry(e.shiftKey ? -1 : 1, false); this.render(); }
    else if (k === ' ') {
      e.preventDefault();
      if (this.entryFor(this.sel, this.other(this.dir))) this.dir = this.other(this.dir);
      this.render();
    }
  }

  render() {
    const entry = this.currentEntry();
    const inWord = new Set(entry ? entry.cells : []);
    const hidden = this.state === 'ready' || this.state === 'paused';
    const active = this.playing;
    this.cellEls.forEach((div, i) => {
      if (this.puzzle.cells[i] === null) return;
      div.querySelector('.letter').textContent = hidden ? '' : this.fill[i];
      div.classList.toggle('selected', active && i === this.sel);
      div.classList.toggle('in-word', active && inWord.has(i));
      div.classList.toggle('solved', this.state === 'solved');
      div.classList.toggle('revealed', this.state === 'gaveup' && this.revealed.has(i));
    });
    for (const e of this.entries) e.li.classList.toggle('active', active && e === entry);

    const { clueBar, overlay, overlayText, overlayBtn, status, giveUp, pause, replay, board } = this.els;
    board.classList.toggle('hidden-grid', hidden);
    clueBar.textContent = active && entry
      ? `${entry.number}${entry.dir === 'across' ? 'A' : 'D'} · ${entry.clue}`
      : this.finished ? (this.practice ? 'Practice round finished' : 'Puzzle finished') : ' ';

    overlay.hidden = !hidden;
    if (this.state === 'ready') {
      overlayText.textContent = this.practice
        ? 'Practice replay: your recorded result will not change.'
        : 'The timer starts when you press Start.';
      overlayBtn.textContent = 'Start';
    } else if (this.state === 'paused') {
      overlayText.textContent = 'Paused. The grid is hidden while the clock is stopped.';
      overlayBtn.textContent = 'Resume';
    }

    const t = formatDuration(this.elapsed);
    status.textContent =
      this.giveUpArmed ? 'Click "Give up" again to reveal the answers.'
      : this.wrongNotice ? 'Not quite: at least one square is wrong.'
      : this.state === 'solved' ? (this.practice ? `Practice solve in ${t}.` : `Solved in ${t}!`)
      : this.state === 'gaveup' ? (this.practice ? 'Practice round: answers revealed.' : 'Answers revealed. This counts as a gave-up result.')
      : '';
    status.classList.toggle('warn', this.wrongNotice || Boolean(this.giveUpArmed));

    giveUp.disabled = !(this.state === 'playing' || this.state === 'paused');
    giveUp.textContent = this.giveUpArmed ? 'Really give up?' : 'Give up';
    pause.disabled = !active;
    replay.hidden = !this.finished;
    this.renderTimer();
  }

  renderTimer() {
    this.els.timer.textContent = formatDuration(this.now());
  }
}
