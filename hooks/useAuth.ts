import { useCallback, useState } from 'react';
import type { AuthStatus, AuthUser } from '../types';

export interface Auth {
  status: AuthStatus;
  user?: AuthUser;
  login: (handle: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Mock for now, #37 replaces the inside of this hook with real OAuth.
// login/logout are async because the real ones will be.
export function useAuth(): Auth {
  const [user, setUser] = useState<AuthUser>();

  const login = useCallback(async (handle: string) => {
    setUser({ did: `did:plc:mock-${handle}`, handle });
  }, []);

  const logout = useCallback(async () => {
    setUser(undefined);
  }, []);

  return { status: user ? 'signed-in' : 'signed-out', user, login, logout };
}
