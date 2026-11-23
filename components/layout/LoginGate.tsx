import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AuthStatus } from '../../types';

interface LoginGateProps {
  status: AuthStatus;
  onLogin: (handle: string) => Promise<void>;
}

export function LoginGate({ status, onLogin }: LoginGateProps) {
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // people usually paste their handle with the @
    const cleaned = handle.trim().replace(/^@/, '');
    if (!cleaned) {
      setError('Enter your Bluesky handle first.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onLogin(cleaned);
    } catch {
      setError("Couldn't log you in. Check your handle and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay login-gate" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <div className="modal-content login-card">
        <h2 id="login-title" className="modal-title">Log in to play</h2>

        {status === 'loading' ? (
          <p className="login-notice">Checking if you're logged in...</p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-handle">Bluesky handle</label>
            <input
              id="login-handle"
              type="text"
              placeholder="you.bsky.social"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Log in with Bluesky'}
            </button>
            <p className="login-notice">Your results are published publicly to your Bluesky account.</p>
          </form>
        )}
      </div>
    </div>
  );
}
