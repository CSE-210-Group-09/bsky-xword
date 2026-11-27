import { formatTime } from '../../lib/format';
import type { AuthUser } from '../../types';

interface HeaderProps {
  secondsElapsed: number;
  user?: AuthUser;
  onLogout: () => void;
}

export function Header({ secondsElapsed, user, onLogout }: HeaderProps) {
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
      </div>

      {user && (
        <div className="user-box">
          {user.avatar && <img className="user-avatar" src={user.avatar} alt="" />}
          <span className="user-handle">@{user.handle}</span>
          <button className="btn btn-secondary" onClick={onLogout}>
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
