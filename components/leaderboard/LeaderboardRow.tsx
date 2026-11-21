import type { Friend, RankedFriend } from '../../types';
import { formatTime } from '../../lib/format';

interface LeaderboardRowProps {
  /** A RankedFriend shows rank and time; a plain Friend shows as not yet solved. */
  friend: Friend | RankedFriend;
}

export function LeaderboardRow({ friend }: LeaderboardRowProps) {
  const ranked = 'rank' in friend;

  return (
    <li
      className={`leaderboard-item ${friend.isCurrentUser ? 'is-current-user' : ''}`}
      style={ranked ? undefined : { opacity: 0.7 }}
    >
      {ranked ? (
        <span className={`leaderboard-rank rank-${friend.rank}`}>
          {friend.rank === 1 ? '🥇' : friend.rank === 2 ? '🥈' : friend.rank === 3 ? '🥉' : `#${friend.rank}`}
        </span>
      ) : (
        <span className="leaderboard-rank">-</span>
      )}

      <div className="user-avatar" style={{ backgroundColor: friend.color }}>
        {friend.initials}
      </div>

      <div className="user-details">
        <div className="user-name-line">
          <span className="user-name">{friend.displayName}</span>
          {friend.isCurrentUser && <span className="you-tag">YOU</span>}
        </div>
        <span className="user-handle">@{friend.handle}</span>
      </div>

      {ranked ? (
        <span className="user-time-pill">{formatTime(friend.timeSeconds)}</span>
      ) : (
        <span className="user-time-pill pending">
          {friend.isCurrentUser ? 'Solving...' : 'Not played'}
        </span>
      )}
    </li>
  );
}
