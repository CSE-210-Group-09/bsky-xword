import test from 'node:test';
import assert from 'node:assert/strict';
import {complete, leaderboard, server} from './server.mjs';
import {puzzle} from './puzzle.mjs';
test('only a full correct board creates a completion; first completion survives retry', () => {
  assert.equal(complete({cells: ['S']}).status, 'incomplete');
  assert.equal(complete({cells: Array(25).fill('X')}).status, 'incorrect');
  const first = complete({cells:puzzle.cells, elapsed:95.123}).result;
  assert.equal(first.durationMs,95123);
  assert.deepEqual(complete({cells:puzzle.cells,elapsed:1,previous:first}).result,first);
  const board = leaderboard(first);
  assert.equal(board.unassisted.length,2);
  assert.equal(board.unassisted[1].durationMs,95123);
});
test('HTTP serves puzzle metadata without answers and rejects malformed completion', async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const origin=`http://127.0.0.1:${server.address().port}`;
    const puzzleResponse=await fetch(origin+'/api/puzzle');
    const metadata=await puzzleResponse.json();
    assert.equal(metadata.cells,undefined);
    assert.equal(metadata.across.length,5);
    assert.equal((await fetch(origin+'/')).status,200);
    assert.equal((await fetch(origin+'/api/check',{method:'POST',body:'bad'})).status,400);
    const response=await fetch(origin+'/api/check',{method:'POST',body:JSON.stringify({cells:puzzle.cells,elapsed:40})});
    assert.equal((await response.json()).status,'solved');
  } finally {await new Promise(resolve=>server.close(resolve));}
});
