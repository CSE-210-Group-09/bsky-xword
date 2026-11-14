import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {puzzle} from './puzzle.mjs';
import {puzzleRevision, captureFirstCompletion} from '../result-contract/result.mjs';
import {friendLeaderboard} from '../friend-leaderboard/friends.mjs';
const revision = puzzleRevision(puzzle);
const viewerDid = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa';
const friendDid = 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb';
export function complete(body) {
  if (!Array.isArray(body.cells) || body.cells.length !== 25 || body.cells.some(c => !/^[A-Z]$/.test(c)))
    return {status: 'incomplete'};
  if (body.cells.some((c, i) => c !== puzzle.cells[i])) return {status: 'incorrect'};
  return {status: 'solved', result: captureFirstCompletion(body.previous ?? null,
    {type: 'complete', elapsed: body.elapsed, didCheat: false},
    {puzzleId: puzzle.id, puzzleRevision: revision, isAuthor: false, loadedCompleted: false,
      completedAt: new Date().toISOString()})};
}
export function leaderboard(result) {
  const row = (author, durationMs) => ({author, durationMs, puzzleId: puzzle.id,
    puzzleRevision: revision, assisted: false, completedAt: '2026-11-13T12:00:00.000Z',
    uri: `at://${author}/org.example.bskyxword.result/demo`});
  return friendLeaderboard({viewerDid, followedDids: [friendDid], puzzleId: puzzle.id,
    puzzleRevision: revision, results: [row(friendDid, 92000),
      row('did:plc:cccccccccccccccccccccccc', 1000),
      ...(result ? [{...row(viewerDid, result.durationMs), ...result}] : [])]});
}
const files = {'/': ['index.html', 'text/html'], '/app.mjs': ['app.mjs', 'text/javascript'],
  '/style.css': ['style.css', 'text/css']};
export const server = http.createServer(async (req, res) => {
  try {
    const json = value => {res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value));};
    if (req.url === '/api/puzzle' && req.method === 'GET')
      return json({id: puzzle.id, title: puzzle.title, revision, across: puzzle.across, down: puzzle.down});
    if (req.url === '/api/check' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {body += chunk; if (body.length > 10000) throw Error('Request too large');}
      const outcome = complete(JSON.parse(body));
      return json({...outcome, leaderboard: outcome.result ? leaderboard(outcome.result) : null});
    }
    const file = files[req.url];
    if (!file || req.method !== 'GET') {res.writeHead(404); return res.end('Not found');}
    res.setHeader('Content-Type', file[1]); res.end(await readFile(new URL(file[0], import.meta.url)));
  } catch {res.writeHead(400); res.end('Invalid request');}
});
if (process.argv[1] === new URL(import.meta.url).pathname) {
  server.listen(Number(process.env.PORT || 3100), '127.0.0.1', () => console.log('Mini prototype: http://127.0.0.1:' + server.address().port));
}
