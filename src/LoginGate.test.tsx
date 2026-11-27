import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Auth } from '../hooks/useAuth';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/layout/Header';
import { LoginGate } from '../components/layout/LoginGate';
import App from './App';

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));

afterEach(cleanup);

async function submit(handle: string) {
  fireEvent.change(screen.getByLabelText('Bluesky handle'), { target: { value: handle } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Log in with Bluesky' }));
  });
}

describe('LoginGate', () => {
  it('strips the @ and spaces from the handle', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginGate status="signed-out" onLogin={onLogin} />);

    await submit('  @tester.bsky.social ');
    expect(onLogin).toHaveBeenCalledWith('tester.bsky.social');
  });

  it('needs a handle before it tries to log in', async () => {
    const onLogin = vi.fn();
    render(<LoginGate status="signed-out" onLogin={onLogin} />);

    await submit('   ');
    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Enter your Bluesky handle');
  });

  it('shows an error and lets you retry if login fails', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('nope'));
    render(<LoginGate status="signed-out" onLogin={onLogin} />);

    await submit('wrong.bsky.social');
    expect(screen.getByRole('alert').textContent).toContain("Couldn't log you in");
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Log in with Bluesky' }).disabled).toBe(false);
  });

  it('hides the form while auth is loading', () => {
    render(<LoginGate status="loading" onLogin={vi.fn()} />);

    expect(screen.queryByLabelText('Bluesky handle')).toBeNull();
    expect(screen.getByText(/Checking if you're logged in/)).toBeTruthy();
  });
});

describe('Header', () => {
  it('shows the avatar when the user has one', () => {
    const { container } = render(
      <Header
        secondsElapsed={0}
        user={{ did: 'did:plc:test', handle: 'tester.bsky.social', avatar: 'https://example.com/a.jpg' }}
        onLogout={vi.fn()}
      />
    );

    expect(container.querySelector('img.user-avatar')?.getAttribute('src')).toBe('https://example.com/a.jpg');
  });

  it('calls onLogout', () => {
    const onLogout = vi.fn();
    render(<Header secondsElapsed={0} user={{ did: 'did:plc:test', handle: 'tester.bsky.social' }} onLogout={onLogout} />);

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});

// #37 only swaps what's inside useAuth, so App has to work with any hook that has this shape
describe('App with a different useAuth', () => {
  const useAuthMock = vi.mocked(useAuth);
  const fakeAuth = (auth: Partial<Auth>): Auth => ({
    status: 'signed-out',
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    ...auth,
  });

  it('keeps the page locked while loading', () => {
    useAuthMock.mockReturnValue(fakeAuth({ status: 'loading' }));
    const { container } = render(<App />);

    expect(container.querySelector('.app-container')?.classList.contains('app-locked')).toBe(true);
    expect(screen.getByText(/Checking if you're logged in/)).toBeTruthy();
  });

  it('shows whoever the hook says is signed in', () => {
    useAuthMock.mockReturnValue(
      fakeAuth({ status: 'signed-in', user: { did: 'did:plc:real', handle: 'real.bsky.social' } })
    );
    render(<App />);

    expect(screen.getByText('@real.bsky.social')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
