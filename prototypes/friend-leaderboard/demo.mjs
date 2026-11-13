import { friendLeaderboard } from './friends.mjs';
import { request } from './fixture.mjs';
console.log(JSON.stringify(friendLeaderboard(request), null, 2));
