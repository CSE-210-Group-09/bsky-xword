import type { RankedFriend } from '../../types';
import { LeaderboardRow } from './LeaderboardRow';

export type LeaderboardStatus = 'loading' | 'ready' | 'error';

interface LeaderboardPanelProps {
  /** Friend times stay hidden until the player finishes (ADR 0009). */
  solved: boolean;
  status: LeaderboardStatus;
  /** Solvers only, fastest first. Same shape as the API entries. */
  entries: RankedFriend[];
  onRetry?: () => void;
}

export function LeaderboardPanel({ solved, status, entries, onRetry }: LeaderboardPanelProps) {
  if (!solved) {
    return <p className="leaderboard-message">Solve the puzzle to see how your friends did</p>;
  }

  if (status === 'loading') {
    return <p className="leaderboard-message">Loading leaderboard...</p>;
  }

  if (status === 'error') {
    return (
      <div className="leaderboard-message">
        <p>Couldn't load the leaderboard.</p>
        {onRetry && (
          <button className="btn btn-secondary" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  const nobodyElse = entries.every((e) => e.isCurrentUser);

  return (
    <div className="leaderboard-view">
      <div className="leaderboard-meta">
        <span>Bluesky Friends &bull; Today's Mini</span>
        <span>{entries.length} solved</span>
      </div>

      <ul className="leaderboard-list">
        {entries.map((friend) => (
          <LeaderboardRow key={friend.did} friend={friend} />
        ))}
      </ul>

      {nobodyElse && (
        <p className="leaderboard-message">None of the people you follow have solved today's puzzle yet</p>
      )}
    </div>
  );
}
