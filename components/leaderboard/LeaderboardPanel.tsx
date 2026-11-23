import type { Friend, RankedFriend } from '../../types';
import { formatTime } from '../../lib/format';
import { LeaderboardRow } from './LeaderboardRow';

interface LeaderboardPanelProps {
  ranked: RankedFriend[];
  unranked: Friend[];
  userFirstScore: number | null;
  currentUserRank: number | null;
}

export function LeaderboardPanel({ ranked, unranked, userFirstScore, currentUserRank }: LeaderboardPanelProps) {
  return (
    <div className="leaderboard-view">
      <div className="leaderboard-meta">
        <span>Bluesky Friends &bull; Today's Mini</span>
        <span>{ranked.length} solved</span>
      </div>

      {userFirstScore !== null && (
        <div className="leaderboard-notice">
          <span>🏆</span>
          <span>
            You placed <strong>#{currentUserRank}</strong> with your first completion of{' '}
            <strong>{formatTime(userFirstScore)}</strong>!
          </span>
        </div>
      )}

      {/* Ranked Solvers */}
      <ul className="leaderboard-list">
        {ranked.map((friend) => (
          <LeaderboardRow key={friend.did} friend={friend} />
        ))}
      </ul>

      {/* Friends yet to solve */}
      {unranked.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <div className="leaderboard-meta" style={{ marginBottom: '6px' }}>
            <span>In Progress / Not Yet Solved</span>
          </div>
          <ul className="leaderboard-list">
            {unranked.map((friend) => (
              <LeaderboardRow key={friend.did} friend={friend} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
