import { useEffect, useState } from 'react';
import { getAppUrl } from '../../lib/appUrl';
import { bskyComposeUrl, buildShareText } from '../../lib/share';

interface ShareButtonsProps {
  date: string;
  timeSeconds: number;
  rank: number | null;
}

export function ShareButtons({ date, timeSeconds, rank }: ShareButtonsProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const text = buildShareText({ date, timeSeconds, rank, url: getAppUrl() });

  useEffect(() => {
    if (copyState !== 'copied') return;
    const id = setTimeout(() => setCopyState('idle'), 2000);
    return () => clearTimeout(id);
  }, [copyState]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
    } catch {
      // clipboard can be blocked, and it doesn't exist at all on plain http
      setCopyState('failed');
    }
  };

  return (
    <div className="share-actions">
      <a className="btn btn-primary" href={bskyComposeUrl(text)} target="_blank" rel="noopener noreferrer">
        Share to Bluesky
      </a>
      <button className="btn btn-secondary" onClick={handleCopy}>
        {copyState === 'copied' ? 'Copied!' : 'Copy'}
      </button>
      {copyState === 'failed' && (
        <p className="share-error" role="alert">
          Couldn't copy that. Try Share to Bluesky instead.
        </p>
      )}
    </div>
  );
}
