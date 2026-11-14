const $ = id => document.getElementById(id);
const puzzle = await fetch('/api/puzzle').then(r => r.json());
const key = `mini:${puzzle.id}:${puzzle.revision}`;
let state = {cells: Array(25).fill(''), startedAt: null, result: null, abandoned: false};
try {const saved = JSON.parse(localStorage.getItem(key));
  if (saved && Array.isArray(saved.cells) && saved.cells.length === 25 && saved.cells.every(c => /^[A-Z]?$/.test(c)) &&
      (saved.startedAt === null || Number.isFinite(saved.startedAt))) state = {...state, ...saved};
} catch {}
function save() {try {localStorage.setItem(key, JSON.stringify(state));}
  catch {$('status').textContent = 'Browser storage is unavailable. Keep this tab open to retain your solve.';}}
const numbers = [1,2,3,4,5,6,0,0,0,0,7,0,0,0,0,8,0,0,0,0,9,0,0,0,0];
const inputs = state.cells.map((value, i) => {
  const cell = document.createElement('div'); cell.className = 'cell';
  if (numbers[i]) {const n = document.createElement('span'); n.textContent = numbers[i]; cell.append(n);}
  const input = document.createElement('input'); input.value = value; input.maxLength = 1;
  input.setAttribute('aria-label', `Row ${Math.floor(i/5)+1}, column ${i%5+1}`);
  input.autocomplete = 'off'; input.spellcheck = false;
  input.addEventListener('input', () => {input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
    state.cells[i] = input.value; save(); update(); if (input.value) inputs[Math.min(i+1,24)].focus();});
  input.addEventListener('keydown', e => {let target;
    if(e.key === 'ArrowRight') target=i+1; if(e.key === 'ArrowLeft') target=i-1;
    if(e.key === 'ArrowDown') target=i+5; if(e.key === 'ArrowUp') target=i-5;
    if(e.key === 'Backspace' && !input.value) target=i-1;
    if(target !== undefined) {e.preventDefault(); inputs[Math.max(0,Math.min(24,target))].focus();}});
  cell.append(input); $('grid').append(cell); return input;
});
for (const direction of ['across','down']) for (const clue of puzzle[direction]) {
  const li = document.createElement('li'); li.value=clue.number; li.textContent=clue.text; $(direction).append(li);
}
const format = ms => `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
function update() {
  const ended = !!state.result || state.abandoned;
  inputs.forEach(input => input.disabled = !state.startedAt || ended);
  $('start').disabled = !!state.startedAt; $('abandon').disabled = !state.startedAt || ended;
  $('check').disabled = !state.startedAt || ended || state.cells.some(c => !c);
  $('timer').textContent = format(state.result?.durationMs ?? (state.startedAt ? (state.abandonedAt ?? Date.now())-state.startedAt : 0));
}
async function showResult() {
  const response = await fetch('/api/check', {method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({cells: state.cells, elapsed: Math.max(0,(Date.now()-state.startedAt)/1000), previous:state.result})});
  if (!response.ok) throw Error('Check failed. Your entries are saved; try again.');
  const outcome = await response.json();
  if(outcome.status !== 'solved') {$('status').textContent = outcome.status === 'incomplete' ? 'Fill every square before checking.' : 'The full board has errors. Keep trying.'; return;}
  state.result = outcome.result; save(); renderRanking(outcome.leaderboard); update();
  $('status').textContent = 'Solved! Your first completion is saved in this browser.';
}
function renderRanking(board) {
  $('results').hidden=false; $('ranking').replaceChildren();
  $('result-note').textContent=state.abandoned ? 'You abandoned this attempt. No time was submitted.' : `Your first completion: ${format(state.result.durationMs)}. Sample leaderboard below.`;
  for(const row of board.unassisted) {const li=document.createElement('li'); li.value=row.rank;
    li.textContent=`${row.author === 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa' ? 'You' : 'Sample friend'} · ${format(row.durationMs)}`;
    $('ranking').append(li);}
}
$('start').onclick=()=>{state.startedAt=Date.now();save();update();inputs[0].focus();$('status').textContent='Fill the board, then check. Arrow keys move between squares.';};
$('check').onclick=()=>showResult().catch(e=>$('status').textContent=e.message);
$('abandon').onclick=()=>{state.abandoned=true;state.abandonedAt=Date.now();save();update();$('status').textContent='Attempt abandoned. No score recorded.';
  renderRanking({unassisted:[{author:'sample',rank:1,durationMs:92000}]});};
if(state.result) await showResult().catch(e=>$('status').textContent=e.message);
else if(state.abandoned) {renderRanking({unassisted:[{author:'sample',rank:1,durationMs:92000}]});$('status').textContent='Attempt abandoned. No score recorded.';}
update();setInterval(update,1000);
