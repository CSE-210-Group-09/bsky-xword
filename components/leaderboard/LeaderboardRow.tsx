import type { RankedFriend } from '../../types';
import { formatTime } from '../../lib/format';

// Colors for people without a profile picture. Picked from the did so they don't change between renders.
const AVATAR_COLORS = ['#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

function avatarColor(did: string): string {
  let sum = 0;
  for (const ch of did) sum += ch.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(friend: RankedFriend): string {
  const words = (friend.displayName ?? '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (words.length === 0) return friend.handle.charAt(0).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();
}

interface LeaderboardRowProps {
  friend: RankedFriend;
}

export function LeaderboardRow({ friend }: LeaderboardRowProps) {
  return (
    <li className={`leaderboard-item ${friend.isCurrentUser ? 'is-current-user' : ''}`}>
      <span className={`leaderboard-rank rank-${friend.rank}`}>
        {friend.rank === 1 ? '🥇' : friend.rank === 2 ? '🥈' : friend.rank === 3 ? '🥉' : `#${friend.rank}`}
      </span>

      {friend.avatar ? (
        <img className="user-avatar" src={friend.avatar} alt="" />
      ) : (
        <div
          className="user-avatar"
          style={{ backgroundColor: friend.isCurrentUser ? '#0085ff' : avatarColor(friend.did) }}
        >
          {initials(friend)}
        </div>
      )}

      <div className="user-details">
        <div className="user-name-line">
          <span className="user-name">{friend.displayName || friend.handle}</span>
          {friend.isCurrentUser && <span className="you-tag">YOU</span>}
        </div>
        <span className="user-handle">@{friend.handle}</span>
      </div>

      <span className="user-time-pill">{formatTime(friend.timeSeconds)}</span>
    </li>
  );
}
