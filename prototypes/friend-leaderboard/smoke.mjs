import { fetchFollows } from './friends.mjs';
const actor = process.argv[2] ?? 'bsky.app';
try {
  const {dids, pages} = await fetchFollows(actor);
  console.log(JSON.stringify({actor, pages, followedAccounts: dids.length, checkedAt: new Date().toISOString()}, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
