import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authMode, devUsers, loginRequest } from '../authConfig';
import { initAuth, msalInstance } from './msal';

const DEV_KEY = 'ts.devEmail';

interface AuthState {
  ready: boolean;
  isAuthenticated: boolean;
  /** Identifier used for display before /users/me resolves. */
  accountName: string | null;
  mode: 'dev' | 'entra';
  devUsers: typeof devUsers;
  signInDev: (email: string) => void;
  signInEntra: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [devEmail, setDevEmail] = useState<string | null>(() => localStorage.getItem(DEV_KEY));
  const [entraName, setEntraName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await initAuth();
      if (msalInstance) {
        const account = msalInstance.getAllAccounts()[0] ?? null;
        if (account) {
          msalInstance.setActiveAccount(account);
          setEntraName(account.name ?? account.username);
        }
      }
      setReady(true);
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      mode: authMode,
      devUsers,
      accountName: authMode === 'dev' ? devEmail : entraName,
      isAuthenticated: authMode === 'dev' ? Boolean(devEmail) : Boolean(entraName),
      signInDev: (email: string) => {
        localStorage.setItem(DEV_KEY, email);
        setDevEmail(email);
      },
      signInEntra: async () => {
        if (msalInstance) await msalInstance.loginRedirect(loginRequest);
      },
      signOut: () => {
        if (authMode === 'dev') {
          localStorage.removeItem(DEV_KEY);
          setDevEmail(null);
        } else if (msalInstance) {
          void msalInstance.logoutRedirect();
        }
      },
    }),
    [ready, devEmail, entraName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
