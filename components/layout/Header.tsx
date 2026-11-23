import { formatTime } from '../../lib/format';

interface HeaderProps {
  secondsElapsed: number;
  recentPenalty?: number | null;
}

export function Header({ secondsElapsed, recentPenalty }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-icon">🧩</span>
        <div className="title-group">
          <h1>Bluesky Xword Prototype</h1>
          <p>5x5 Mini &bull; Branch: <code>aarons_prototype</code></p>
        </div>
      </div>

      <div className="timer-box">
        <span>⏱️</span>
        <span>{formatTime(secondsElapsed)}</span>
        {recentPenalty != null && (
          <span className="penalty-badge" data-testid="penalty-badge">
            +{recentPenalty}s
          </span>
        )}
      </div>
    </header>
  );
}
