import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function logIn(handle = 'tester.bsky.social') {
  fireEvent.change(screen.getByLabelText('Bluesky handle'), { target: { value: handle } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Log in with Bluesky' }));
  });
}

const page = (container: HTMLElement) => container.querySelector('.app-container')!;
const filledCells = (container: HTMLElement) =>
  [...container.querySelectorAll('.cell-letter')].filter((cell) => cell.textContent !== '');

describe('solver timer', () => {
  it('displays elapsed time with zero-padded seconds across a minute boundary', async () => {
    vi.useFakeTimers();
    render(<App />);
    await logIn();

    expect(screen.getByText('0:00')).toBeTruthy();
    act(() => vi.advanceTimersByTime(65_000));
    expect(screen.getByText('1:05')).toBeTruthy();
  });

  it('does not run while the login gate is up', () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText('0:00')).toBeTruthy();
  });
});

describe('login gate', () => {
  it('blurs the page and shows the popup when signed out', () => {
    const { container } = render(<App />);

    expect(page(container).classList.contains('app-locked')).toBe(true);
    expect(page(container).hasAttribute('inert')).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Log in to play' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log in with Bluesky' })).toBeTruthy();
    expect(screen.getByText(/published publicly to your Bluesky account/)).toBeTruthy();
  });

  it('does not send keys to the grid while signed out', () => {
    const { container } = render(<App />);

    fireEvent.keyDown(window, { key: 'a' });
    expect(filledCells(container)).toHaveLength(0);
  });

  it('shows the handle and unlocks the page after login', async () => {
    const { container } = render(<App />);
    await logIn('tester.bsky.social');

    expect(screen.getByText('@tester.bsky.social')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(page(container).classList.contains('app-locked')).toBe(false);
    expect(page(container).hasAttribute('inert')).toBe(false);

    fireEvent.keyDown(window, { key: 'a' });
    expect(filledCells(container)).toHaveLength(1);
  });

  it('goes back to the gate and clears the grid on logout', async () => {
    const { container } = render(<App />);
    await logIn();
    fireEvent.keyDown(window, { key: 'a' });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    });

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByText('@tester.bsky.social')).toBeNull();
    expect(filledCells(container)).toHaveLength(0);
  });
});
