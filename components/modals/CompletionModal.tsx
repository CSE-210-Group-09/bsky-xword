import type { RankedFriend } from '../../types';
import { formatTime } from '../../lib/format';
import { ShareButtons } from './ShareButtons';

interface CompletionModalProps {
  puzzleDate: string;
  secondsElapsed: number;
  currentUserRank: number | null;
  ranked: RankedFriend[];
  onViewLeaderboard: () => void;
  onClose: () => void;
}

export function CompletionModal({
  puzzleDate,
  secondsElapsed,
  currentUserRank,
  ranked,
  onViewLeaderboard,
  onClose,
}: CompletionModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-icon">🎉</div>
        <h2 className="modal-title">Puzzle Complete!</h2>
        <p className="modal-subtitle">
          You finished today's mini crossword!
        </p>

        <div className="stats-card">
          <div className="stat-item">
            <span className="stat-label">Your Time</span>
            <span className="stat-value">{formatTime(secondsElapsed)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Friend Rank</span>
            <span className="stat-value" style={{ color: '#0085ff' }}>
              #{currentUserRank}
            </span>
          </div>
        </div>

        {/* Modal Mini Leaderboard */}
        <div className="modal-leaderboard-card">
          <div className="modal-lb-title">
            <span>Friend Leaderboard (Today)</span>
            <span>Ranked by Time</span>
          </div>

          <div className="modal-lb-list">
            {ranked.map((item) => (
              <div
                key={item.did}
                className={`modal-lb-row ${item.isCurrentUser ? 'highlight-user' : ''}`}
              >
                <div className="modal-lb-left">
                  <span className="modal-lb-rank">
                    {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                  </span>
                  <span>{item.displayName}</span>
                  {item.isCurrentUser && <span className="you-tag">YOU</span>}
                </div>
                <strong>{formatTime(item.timeSeconds)}</strong>
              </div>
            ))}
          </div>
        </div>

        <ShareButtons date={puzzleDate} timeSeconds={secondsElapsed} rank={currentUserRank} />

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onViewLeaderboard}>
            View Friends Leaderboard Tab
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Inspect Grid
          </button>   
        </div>
      </div>
    </div>
  );
}
