import { describe, expect, it } from 'vitest';
import { bskyComposeUrl, buildShareText } from '../lib/share';

const base = { date: '2026-11-18', timeSeconds: 83, url: 'https://example.com/' };

describe('buildShareText', () => {
  it('matches the format in ADR 0010', () => {
    expect(buildShareText({ ...base, rank: 2 })).toBe(
      'bsky-xword mini 2026-11-18\n⏱️ 1:23 · #2 among friends\nhttps://example.com/'
    );
  });

  it('leaves out the rank when there is none yet', () => {
    const expected = 'bsky-xword mini 2026-11-18\n⏱️ 1:23\nhttps://example.com/';

    expect(buildShareText(base)).toBe(expected);
    expect(buildShareText({ ...base, rank: null })).toBe(expected);
  });

  it('pads seconds', () => {
    expect(buildShareText({ ...base, timeSeconds: 5, rank: 1 })).toContain('⏱️ 0:05 ·');
    expect(buildShareText({ ...base, timeSeconds: 600, rank: 1 })).toContain('⏱️ 10:00 ·');
  });
});

describe('bskyComposeUrl', () => {
  it('encodes the whole text, including new lines and the emoji', () => {
    const text = buildShareText({ ...base, rank: 2 });
    const url = new URL(bskyComposeUrl(text));

    expect(url.origin + url.pathname).toBe('https://bsky.app/intent/compose');
    expect(url.search).not.toContain('\n');
    expect(url.searchParams.get('text')).toBe(text);
  });
});
