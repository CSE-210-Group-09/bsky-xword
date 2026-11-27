import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShareButtons } from '../components/modals/ShareButtons';
import { getAppUrl } from '../lib/appUrl';
import { EASY_PUZZLE } from '../lib/puzzles/puzzleData';
import App from './App';

const shareText = () => {
  const href = screen.getByRole('link', { name: 'Share to Bluesky' }).getAttribute('href')!;
  return new URL(href).searchParams.get('text')!;
};

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

const clickCopy = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
  });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('ShareButtons', () => {
  it('opens the Bluesky composer in a new tab with the result', () => {
    render(<ShareButtons date="2026-11-18" timeSeconds={83} rank={2} />);

    const link = screen.getByRole('link', { name: 'Share to Bluesky' });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(shareText()).toContain('⏱️ 1:23 · #2 among friends');
  });

  it('copies the same text and shows Copied! for a bit', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    render(<ShareButtons date="2026-11-18" timeSeconds={83} rank={2} />);

    await clickCopy();
    expect(writeText).toHaveBeenCalledWith(shareText());
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeTruthy();

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('shows an error if the clipboard write fails', async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error('blocked')));
    render(<ShareButtons date="2026-11-18" timeSeconds={83} rank={2} />);

    await clickCopy();
    expect(screen.getByRole('alert').textContent).toContain("Couldn't copy");
  });

  it('shows an error if there is no clipboard at all', async () => {
    render(<ShareButtons date="2026-11-18" timeSeconds={83} rank={2} />);

    await clickCopy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

describe('getAppUrl', () => {
  it('uses the configured url', () => {
    expect(getAppUrl('https://example.com')).toBe('https://example.com/');
    expect(getAppUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('falls back to the current site', () => {
    expect(getAppUrl('')).toBe(`${window.location.origin}/`);
  });
});

describe('sharing in the app', () => {
  it('only shows the buttons after the puzzle is done, with no answers in the text', () => {
    render(<App />);
    expect(screen.queryByRole('link', { name: 'Share to Bluesky' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Quick Fill/ }));

    const text = shareText();
    expect(text).toContain(`bsky-xword mini ${EASY_PUZZLE.date}`);
    for (const clue of [...EASY_PUZZLE.clues.across, ...EASY_PUZZLE.clues.down]) {
      expect(text).not.toContain(clue.answer);
    }
  });
});
